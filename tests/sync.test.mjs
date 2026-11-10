// Sync tests (BUILD_PLAN.md phase 7), against a fake GitHub kept in memory
// (tests/fake-github.js). Run with `node --test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectToGitHub, blobSha, recordPath } from '../edges/sync-github.js';
import { newRecord, withField, recordToFileText } from '../core/records.js';
import { fakeGitHub } from './fake-github.js';

const T0 = '2026-11-10T10:00:00Z';
const ids = n => `t${String(n).padStart(11, '0')}`.replace(/[ilou]/g, 'x');
const copy = (n, values = {}) => newRecord('copy', ids(n), T0, { edition: ids(900), added: '2026-11-10', ...values });

// A device: what it holds, and one sync (pull, then send its outbox, retrying once after a merge).
function device(github) {
  const state = { known: new Map(), local: new Map(), outbox: new Set(), commit: null };
  const sync = connectToGitHub({ repo: 'test/data', key: 'test-key', fetchFn: github.fetchFn });
  async function pull() {
    const result = await sync.pull(state);
    for (const record of result.records) state.local.set(record.id, record);
    state.known = result.known;
    state.commit = result.commit;
    return result;
  }
  return {
    state,
    pull,
    edit(record) { state.local.set(record.id, record); state.outbox.add(record.id); },
    async send() {
      const records = [...state.outbox].map(id => state.local.get(id));
      try {
        const sent = await sync.push({ records, message: 'Test', base: state.commit });
        for (const [path, sha] of sent.known) state.known.set(path, sha);
        state.commit = sent.commit;
      } catch (error) {
        if (!error.conflict) throw error;
        await pull();
        return this.send();
      }
      state.outbox.clear();
    },
  };
}

test('a file fingerprint matches Git\'s own (blob SHA-1)', async () => {
  // `git hash-object` of "hello\n" is ce013625030ba8dba906f756967f9e9ca394464a.
  assert.equal(await blobSha('hello\n'), 'ce013625030ba8dba906f756967f9e9ca394464a');
});

test('a first download takes catalog.json and downloads only files changed since', async () => {
  const github = fakeGitHub();
  const records = [1, 2, 3, 4].map(n => copy(n));
  const files = Object.fromEntries(records.map(record => [recordPath(record), recordToFileText(record)]));
  const newer = withField(records[2], 'notes', 'Changed after the catalog was built', '2026-11-10T11:00:00Z');
  files[recordPath(newer)] = recordToFileText(newer);
  files['catalog.json'] = JSON.stringify({ format: 1, built: T0, works: [], editions: [], copies: records, authors: [], wishlist: [] });
  github.commitFiles(files);
  const phone = device(github);
  await phone.pull();
  assert.equal(phone.state.local.size, 4);
  assert.equal(phone.state.local.get(newer.id).notes, 'Changed after the catalog was built');
  assert.equal(github.calls.filter(call => call.includes('/git/blobs/')).length, 1, 'only the changed file was downloaded');
});

test('backup-status.json from the laptop comes down with a sync, once', async () => {
  const github = fakeGitHub();
  github.commitFiles({ 'backup-status.json': '{ "format": 1, "lastMirror": "2026-11-10T03:00:00Z" }\n' });
  const phone = device(github);
  assert.equal((await phone.pull()).backupStatus.lastMirror, '2026-11-10T03:00:00Z');
  assert.equal((await phone.pull()).backupStatus, null, 'unchanged: not downloaded again');
});

test('thirty records go up as one commit', async () => {
  const github = fakeGitHub();
  github.commitFiles({ 'README.md': 'Test data\n' });
  const phone = device(github);
  await phone.pull();
  for (let n = 1; n <= 30; n++) phone.edit(copy(n));
  await phone.send();
  assert.equal(github.commitCount(), 2, 'the first commit plus one');
  assert.equal(JSON.parse(github.fileText(recordPath(copy(30)))).id, ids(30));
  await phone.pull();
  assert.equal(github.calls.filter(call => call.includes('/git/blobs/')).length, 0, 'nothing downloaded back: the device already knows those files');
});

test('two devices editing one record offline: each field keeps the newest edit', async () => {
  const github = fakeGitHub();
  const original = copy(7);
  github.commitFiles({ [recordPath(original)]: recordToFileText(original) });
  const phone = device(github);
  const laptop = device(github);
  await phone.pull();
  await laptop.pull();
  phone.edit(withField(phone.state.local.get(original.id), 'notes', 'A gift from Mom', '2026-11-10T12:00:00Z'));
  laptop.edit(withField(laptop.state.local.get(original.id), 'value', 40, '2026-11-10T12:05:00Z'));
  await phone.send();
  await laptop.send(); // GitHub refuses at first (the phone sent first); the laptop pulls, merges and sends again
  const merged = JSON.parse(github.fileText(recordPath(original)));
  assert.equal(merged.notes, 'A gift from Mom');
  assert.equal(merged.value, 40);
  await phone.pull();
  assert.equal(phone.state.local.get(original.id).value, 40, 'the phone receives the laptop\'s change');
});

test('an expired key, no connection, the GitHub rate limit and a newer data format are explained plainly', async () => {
  const github = fakeGitHub();
  github.commitFiles({ 'README.md': 'Test data\n' });
  const expired = connectToGitHub({ repo: 'test/data', key: 'old-key', fetchFn: github.fetchFn });
  await assert.rejects(expired.check(), /expired or was cancelled/);
  const offline = connectToGitHub({ repo: 'test/data', key: 'test-key', fetchFn: async () => { throw new TypeError('Failed to fetch'); } });
  const limited = connectToGitHub({ repo: 'test/data', key: 'test-key', fetchFn: async () => ({
    ok: false, status: 403, headers: { get: name => ({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1800000000' })[name.toLowerCase()] ?? null },
  }) });
  await assert.rejects(limited.check(), /asks the app to wait until/);
  await assert.rejects(offline.check(), /No connection/);
  const future = { ...copy(9), format: 2 };
  github.commitFiles({ [recordPath(future)]: JSON.stringify(future, null, 2) + '\n' });
  const phone = device(github);
  await assert.rejects(phone.pull(), /newer data format/);
  assert.equal(phone.state.local.size, 0, 'nothing was written');
});
