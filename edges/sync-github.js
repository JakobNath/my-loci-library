// Sync with the private data repository on GitHub (PLAN.md, "Sync"). The
// only file that talks to GitHub: swapping GitHub for another service later
// means rewriting this file alone. It uses GitHub's plain HTTP API, so it
// runs the same in a browser and in Node (the self-tests use a fake GitHub).
//
// How it works:
// - Every file in a GitHub repository has a fingerprint (its "blob SHA",
//   the SHA-1 of "blob <length>\0<content>"). The device keeps the
//   fingerprint of each record file it holds, so a sync asks GitHub for the
//   list of files once and downloads only those whose fingerprint changed.
// - The first download takes catalog.json (all records in one file, built on
//   the laptop), works out each record's fingerprint, and then downloads only
//   the files that differ from it.
// - Local changes go up as one commit: GitHub's "Git Data" API lets one tree
//   hold many files, so a batch of 30 books is one commit, not 30.

import { recordToFileText, FORMAT_VERSION, FIELDS, migrate } from '../core/records.js';
import { mergeRecords } from '../core/merge.js';

const API = 'https://api.github.com';
const FOLDERS = { work: 'works', edition: 'editions', copy: 'copies', author: 'authors', wishlist: 'wishlist', set: 'sets' };
const TYPE_OF_FOLDER = Object.fromEntries(Object.entries(FOLDERS).map(([type, folder]) => [folder, type]));
const PARALLEL = 6; // downloads at once: fast, and gentle on GitHub's limits

/** The file path of a record in the data repository. */
export const recordPath = record => `${FOLDERS[record.type]}/${record.id}.json`;

/** GitHub's fingerprint of a file's text: SHA-1 of "blob <bytes>\0<content>", in hex. */
export async function blobSha(text) {
  const bytes = new TextEncoder().encode(text);
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const whole = new Uint8Array(header.length + bytes.length);
  whole.set(header);
  whole.set(bytes, header.length);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', whole));
  return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

const fromBase64 = text => new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\n/g, '')), c => c.charCodeAt(0)));

// A file mended by hand (on the laptop, or on GitHub's website) can be broken.
// One broken record must not stop the whole catalog syncing, and must never be
// saved on the device, where it would stop the Library from being drawn. So a
// record file is checked in two steps, and one that fails either is skipped
// and named (HOW_IT_WORKS.md, "If a file in the catalog cannot be read").
// Only the shape is checked, not DATA_FORMAT.md's rules (core/validate.js):
// a record that is merely incomplete, such as a work without a date, still
// comes down.

/** The record stored at `path`, or null when the text is not JSON or not the record its path names. */
function storedRecordOrNull(path, text) {
  const [folder, name] = path.split('/');
  let stored;
  try {
    stored = JSON.parse(text);
  } catch {
    return null;
  }
  const isRecord = Boolean(stored) && stored.type === TYPE_OF_FOLDER[folder] && `${stored.id}.json` === name && Number.isInteger(stored.format);
  return isRecord ? stored : null;
}

/** A stored record read in this app's data format, or null when it cannot be: every list must be a list. */
function readableOrNull(stored) {
  let record;
  try {
    record = migrate(stored);
  } catch {
    return null;
  }
  const lists = Object.entries(FIELDS[record.type]).filter(([, empty]) => Array.isArray(empty)).map(([name]) => name);
  return lists.every(name => Array.isArray(record[name])) ? record : null;
}

/** Plain words for what GitHub or the network said (PLAN.md: never fail silently). */
function plainError(status, response, what) {
  if (status === 0) return new Error('No connection, so nothing was sent or received. Your changes are kept on this device and sent next time.');
  if (status === 401) return new Error('Your sync key has expired or was cancelled. Make a new one (Settings › Advanced › Sync, steps 2 and 3) and paste it in.');
  if (status === 403 && response && response.headers.get('x-ratelimit-remaining') === '0') {
    const reset = new Date(Number(response.headers.get('x-ratelimit-reset')) * 1000);
    return new Error(`GitHub asks the app to wait until ${reset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} before syncing again. Your changes are kept.`);
  }
  if (status === 403 || status === 404) return new Error('GitHub did not let this key read or write the data repository. Check the repository name, and that the key has "Contents: read and write" for it.');
  return new Error(`GitHub answered ${status} while ${what}. Try "Sync now" again in a moment; your changes are kept.`);
}

/**
 * Connect to a data repository.
 * @param {{ repo: string, key: string, branch?: string, fetchFn?: typeof fetch }} options
 *   repo: "owner/name"; key: this device's fine-grained key
 */
export function connectToGitHub({ repo, key, branch = 'main', fetchFn = fetch }) {
  async function call(method, path, body, what, accept = 'application/vnd.github+json') {
    let response;
    try {
      response = await fetchFn(`${API}/repos/${repo}${path}`, {
        method,
        headers: { Authorization: `Bearer ${key}`, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw plainError(0, null, what);
    }
    if (!response.ok) {
      const error = plainError(response.status, response, what);
      error.status = response.status;
      throw error;
    }
    return accept.includes('raw') ? response.text() : response.json();
  }

  /** The current commit and every file's fingerprint. */
  async function listFiles() {
    const ref = await call('GET', `/git/ref/heads/${branch}`, null, 'reading the latest version');
    const tree = await call('GET', `/git/trees/${ref.object.sha}?recursive=1`, null, 'listing the files');
    const files = new Map();
    for (const item of tree.tree) if (item.type === 'blob') files.set(item.path, item.sha);
    return { commit: ref.object.sha, files };
  }

  // A file that is not a record (see storedRecordOrNull) goes on `unreadable`.
  async function downloadRecords(paths, onProgress, unreadable) {
    const records = [];
    let done = 0;
    const queue = [...paths];
    async function worker() {
      while (queue.length) {
        const [path, sha] = queue.shift();
        const blob = await call('GET', `/git/blobs/${sha}`, null, `downloading ${path}`);
        const record = storedRecordOrNull(path, fromBase64(blob.content));
        if (record) records.push({ path, sha, record }); else unreadable.push(path);
        onProgress(++done, paths.length);
      }
    }
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker));
    return records;
  }

  // A JSON file other than a record (catalog.json, settings.json), or null
  // when it does not parse, with its path put on `unreadable`.
  async function downloadJson(path, commit, what, unreadable) {
    const text = await call('GET', `/contents/${path}?ref=${commit}`, null, what, 'application/vnd.github.raw+json');
    try {
      return JSON.parse(text);
    } catch {
      unreadable.push(path);
      return null;
    }
  }

  // Records newer than this app's data format are never written over or merged (PLAN.md, "IDs and format versions").
  // Checked before readableOrNull, which would misread them.
  function checkVersions(records) {
    if (records.some(record => record.format > FORMAT_VERSION)) {
      throw new Error('The catalog has records in a newer data format than this app understands. Reload the app to get the new version; nothing was changed.');
    }
  }

  return {
    /** Check the key and repository; resolves when both work. */
    async check() {
      await call('GET', '', null, 'checking the repository');
    },

    /**
     * Bring this device up to date with GitHub.
     * @param {{ known: Map<string, string>, local: Map<string, object>, outbox: Set<string>, onProgress?: (done: number, total: number) => void }} device
     *   known: path → fingerprint of each file this device holds; local: its records by ID;
     *   outbox: IDs changed here and not yet sent
     * @returns {Promise<{ records: object[], known: Map<string, string>, commit: string, settings: object|null, backupStatus: object|null, unreadable: string[] }>}
     *   settings, backupStatus: settings.json and backup-status.json, when they changed
     *   records: new or changed records to save (already merged with local changes)
     *   unreadable: paths of files that could not be read and were skipped; their
     *   fingerprints are not kept, so each sync tries them again until they are mended
     */
    async pull({ known, local, outbox, onProgress = () => {} }) {
      const { commit, files } = await listFiles();
      let fingerprints = new Map(known);
      const fromCatalog = [];
      const unreadable = [];
      // A first download starts from catalog.json (whose lists are named like
      // the folders); a record whose file still matches needs no download.
      // A catalog.json that cannot be read is skipped: every file is then downloaded.
      const catalog = !known.size && files.has('catalog.json')
        ? await downloadJson('catalog.json', commit, 'downloading the catalog', unreadable) : null;
      if (catalog) {
        const all = Object.values(FOLDERS).flatMap(folder => catalog[folder] || []);
        checkVersions(all);
        for (const stored of all) {
          const path = recordPath(stored);
          const sha = await blobSha(recordToFileText(stored));
          // Compared as stored, then read in this app's data format.
          if (files.get(path) !== sha) continue;
          const record = readableOrNull(stored);
          if (record) { fingerprints.set(path, sha); fromCatalog.push(record); } else unreadable.push(path);
        }
      }
      const changed = [...files].filter(([path, sha]) => TYPE_OF_FOLDER[path.split('/')[0]] && path.endsWith('.json') && fingerprints.get(path) !== sha);
      const downloaded = await downloadRecords(changed, onProgress, unreadable);
      checkVersions(downloaded.map(item => item.record));
      const records = [];
      for (const { path, sha, record: stored } of downloaded) {
        const record = readableOrNull(stored);
        if (!record) { unreadable.push(path); continue; }
        fingerprints.set(path, sha);
        const mine = local.get(record.id);
        records.push(mine && outbox.has(record.id) ? mergeRecords(mine, record) : record);
      }
      // A first download also keeps every catalog record that needed no download.
      records.push(...fromCatalog);
      // settings.json, and backup-status.json written by the laptop's loci-backup
      // (when the last backup and archive were made), each only when it changed.
      const isNew = path => files.has(path) && fingerprints.get(path) !== files.get(path);
      const settings = isNew('settings.json') ? await downloadJson('settings.json', commit, 'downloading the settings', unreadable) : null;
      if (settings) fingerprints.set('settings.json', files.get('settings.json'));
      const backupStatus = isNew('backup-status.json') ? await downloadJson('backup-status.json', commit, 'downloading the backup status', unreadable) : null;
      if (backupStatus) fingerprints.set('backup-status.json', files.get('backup-status.json'));
      fingerprints = new Map([...fingerprints].filter(([path]) => files.has(path)));
      // A broken record in catalog.json is also downloaded, and found broken again: named once.
      return { records, known: fingerprints, commit, settings, backupStatus, unreadable: [...new Set(unreadable)].sort() };
    },

    /**
     * Send records (and image files) as one commit on top of `base`, the
     * commit this device last pulled. If another device has committed since,
     * GitHub refuses (the error has `conflict` set): the caller then pulls,
     * which merges the other device's changes, and sends again. Basing the
     * commit on `base`, never simply on the newest commit, is what keeps one
     * device from silently overwriting another's changes.
     * @param {{ records: object[], files?: { path: string, text: string }[], images?: { path: string, base64: string }[], message?: string, base: string }} change
     *   files: other text files, such as settings.json
     * @returns {Promise<{ commit: string, known: [string, string][] }>} the new commit and the sent files' fingerprints
     */
    async push({ records, files = [], images = [], message = 'Update the catalog', base }) {
      const head = await call('GET', `/git/commits/${base}`, null, 'reading the version this device has');
      const entries = [];
      const known = [];
      for (const record of records) {
        const text = recordToFileText(record);
        entries.push({ path: recordPath(record), mode: '100644', type: 'blob', content: text });
        known.push([recordPath(record), await blobSha(text)]);
      }
      for (const file of files) {
        entries.push({ path: file.path, mode: '100644', type: 'blob', content: file.text });
        known.push([file.path, await blobSha(file.text)]);
      }
      for (const image of images) {
        const blob = await call('POST', '/git/blobs', { content: image.base64, encoding: 'base64' }, `uploading ${image.path}`);
        entries.push({ path: image.path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      const tree = await call('POST', '/git/trees', { base_tree: head.tree.sha, tree: entries }, 'preparing the commit');
      const commit = await call('POST', '/git/commits', { message, tree: tree.sha, parents: [base] }, 'making the commit');
      try {
        await call('PATCH', `/git/refs/heads/${branch}`, { sha: commit.sha }, 'saving the commit');
      } catch (error) {
        // 422: another device committed in between. Not lost: pull, merge, send again.
        if (error.status === 422) { error.conflict = true; error.message = 'Another device saved first; the app merges and sends again.'; }
        throw error;
      }
      return { commit: commit.sha, known };
    },

    /** Download one image file (thumbnail or detail) as a Blob. */
    async image(path) {
      const answer = await call('GET', `/contents/${path}`, null, `downloading ${path}`);
      const bytes = Uint8Array.from(atob(answer.content.replace(/\n/g, '')), c => c.charCodeAt(0));
      return new Blob([bytes], { type: 'image/jpeg' });
    },
  };
}
