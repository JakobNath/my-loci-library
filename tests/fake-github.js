// A small stand-in for GitHub's API, for the sync tests: it keeps files,
// trees and commits in memory and answers the few requests the sync module
// makes. Like GitHub, it refuses to move a branch to a commit that is not
// based on the branch's latest commit (status 422).

import { createHash } from 'node:crypto';

const sha1 = bytes => createHash('sha1').update(bytes).digest('hex');
const blobShaOf = bytes => sha1(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]));

export function fakeGitHub({ key = 'test-key' } = {}) {
  const blobs = new Map(); // sha → bytes
  const trees = new Map(); // sha → Map(path → blob sha)
  const commits = new Map(); // sha → { tree, parent }
  let head = null;
  let counter = 0;
  const calls = [];

  function storeBlob(bytes) {
    const sha = blobShaOf(bytes);
    blobs.set(sha, bytes);
    return sha;
  }
  function storeTree(files) {
    const sha = sha1(Buffer.from(`tree ${++counter}`));
    trees.set(sha, files);
    return sha;
  }
  function storeCommit(tree, parent) {
    const sha = sha1(Buffer.from(`commit ${++counter}`));
    commits.set(sha, { tree, parent });
    return sha;
  }
  const filesAtHead = () => trees.get(commits.get(head).tree);

  /** Put files straight into the repository as one commit (as another device would). */
  function commitFiles(files) {
    const next = new Map(head ? filesAtHead() : []);
    for (const [path, text] of Object.entries(files)) next.set(path, storeBlob(Buffer.from(text)));
    head = storeCommit(storeTree(next), head);
  }

  const answer = (status, body, headers = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => headers[name.toLowerCase()] ?? null },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  });

  async function fetchFn(url, options = {}) {
    const method = options.method || 'GET';
    const path = url.replace(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+/, '');
    calls.push(`${method} ${path}`);
    if (options.headers.Authorization !== `Bearer ${key}`) return answer(401, { message: 'Bad credentials' });
    const body = options.body ? JSON.parse(options.body) : null;
    let match;
    if (method === 'GET' && path === '') return answer(200, { full_name: 'test/data' });
    if (method === 'GET' && path === '/git/ref/heads/main') return answer(200, { object: { sha: head } });
    if (method === 'GET' && (match = path.match(/^\/git\/commits\/(\w+)$/))) return answer(200, { tree: { sha: commits.get(match[1]).tree } });
    if (method === 'GET' && (match = path.match(/^\/git\/trees\/(\w+)\?recursive=1$/))) {
      const files = trees.get(commits.get(match[1]).tree);
      return answer(200, { tree: [...files].map(([file, sha]) => ({ path: file, sha, type: 'blob' })) });
    }
    if (method === 'GET' && (match = path.match(/^\/git\/blobs\/(\w+)$/))) return answer(200, { content: blobs.get(match[1]).toString('base64'), encoding: 'base64' });
    if (method === 'GET' && (match = path.match(/^\/contents\/([^?]+)/))) {
      const bytes = blobs.get(filesAtHead().get(match[1]));
      if (!bytes) return answer(404, { message: 'Not Found' });
      return options.headers.Accept.includes('raw') ? answer(200, bytes.toString('utf8')) : answer(200, { content: bytes.toString('base64') });
    }
    if (method === 'POST' && path === '/git/blobs') return answer(201, { sha: storeBlob(Buffer.from(body.content, 'base64')) });
    if (method === 'POST' && path === '/git/trees') {
      const base = [...commits.values()].find(commit => commit.tree === body.base_tree);
      const next = new Map(base ? trees.get(base.tree) : []);
      for (const entry of body.tree) next.set(entry.path, entry.sha || storeBlob(Buffer.from(entry.content)));
      return answer(201, { sha: storeTree(next) });
    }
    if (method === 'POST' && path === '/git/commits') return answer(201, { sha: storeCommit(body.tree, body.parents[0]) });
    if (method === 'PATCH' && path === '/git/refs/heads/main') {
      if (commits.get(body.sha).parent !== head) return answer(422, { message: 'Update is not a fast forward' });
      head = body.sha;
      return answer(200, { object: { sha: head } });
    }
    return answer(404, { message: `Not handled by the fake: ${method} ${path}` });
  }

  return {
    fetchFn,
    commitFiles,
    calls,
    commitCount: () => { let n = 0; for (let at = head; at; at = commits.get(at).parent) n++; return n; },
    fileText: path => { const sha = filesAtHead().get(path); return sha ? blobs.get(sha).toString('utf8') : null; },
  };
}
