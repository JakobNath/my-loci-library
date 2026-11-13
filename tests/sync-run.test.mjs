// Tests of one sync on a device (sync-run.js), with a storage and a GitHub
// kept in memory. They cover what happens when a person saves again while a
// sync is still sending. Run with `node --test`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSync } from '../sync-run.js';
import { buildLibrary } from '../core/library.js';
import { SHARED_DEFAULTS } from '../core/settings.js';
import { newRecord, withField } from '../core/records.js';

const T0 = '2026-11-13T10:00:00Z';
const T1 = '2026-11-13T10:00:05Z';

// The few storage functions a sync uses (edges/storage.js), in memory.
function memoryStorage() {
  const outbox = new Map();
  const meta = new Map();
  return {
    outboxIds: () => [...outbox.keys()],
    queue: record => outbox.set(record.id, { id: record.id, type: record.type }),
    async outbox() { return [...outbox.values()]; },
    async clearOutbox(ids) { for (const id of ids) outbox.delete(id); },
    async saveRecords() {},
    async meta(key) { return meta.get(key); },
    async saveMeta(key, value) { meta.set(key, value); },
    async image() { return null; },
  };
}

// A GitHub that has nothing new, and runs `duringPush` while a push is on its way.
function quietGitHub(duringPush = () => {}) {
  const pushed = [];
  return {
    pushed,
    async pull({ known }) { return { records: [], known, commit: 'c1', settings: null, backupStatus: null }; },
    async push({ records }) {
      pushed.push(records);
      await duringPush();
      return { known: new Map(), commit: 'c2' };
    },
  };
}

function appWith(records, storage) {
  const state = { records: new Map(records.map(record => [record.id, record])), library: buildLibrary([]), settings: SHARED_DEFAULTS, route: { name: '', id: '' }, syncStatus: '' };
  for (const record of records) storage.queue(record);
  const drawn = [];
  return { state, storage, drawn, render: () => drawn.push(1), showNote() {}, showUnsent() {} };
}

const copyRecord = (id, values = {}) => newRecord('copy', id, T0, { edition: 't00000000900', added: '2026-11-13', ...values });

test('a record changed while the sync is sending stays queued, and one that was sent leaves the queue', async () => {
  const storage = memoryStorage();
  const first = copyRecord('t00000000001');
  const second = copyRecord('t00000000002');
  const app = appWith([first, second], storage);
  const github = quietGitHub(() => {
    // The person changes the first book's notes while it is being sent.
    const edited = withField(first, 'notes', 'A gift', T1);
    app.state.records.set(edited.id, edited);
    storage.queue(edited);
  });
  assert.equal(await runSync(app, github, true), true);
  assert.deepEqual(storage.outboxIds(), [first.id], 'the changed record waits for the next sync');
});

test('a picture added while the sync is sending stays queued', async () => {
  const storage = memoryStorage();
  const app = appWith([copyRecord('t00000000003')], storage);
  await storage.saveMeta('imageOutbox', ['pictureA']);
  const github = quietGitHub(async () => {
    await storage.saveMeta('imageOutbox', [...(await storage.meta('imageOutbox')), 'pictureB']);
  });
  await runSync(app, github, true);
  assert.deepEqual(await storage.meta('imageOutbox'), ['pictureB']);
});

test('a sync that brings nothing new leaves the screen as it is', async () => {
  const storage = memoryStorage();
  const app = appWith([copyRecord('t00000000004')], storage);
  await runSync(app, quietGitHub(), true);
  assert.equal(app.drawn.length, 0, 'nothing was redrawn');
  assert.match(app.state.syncStatus, /^Synced at/);
});

test('when other devices save first three times running, the sync says the changes are still waiting', async () => {
  const storage = memoryStorage();
  const app = appWith([copyRecord('t00000000005')], storage);
  const github = quietGitHub();
  github.push = async () => { throw Object.assign(new Error('conflict'), { conflict: true }); };
  assert.equal(await runSync(app, github, true), false);
  assert.match(app.state.syncStatus, /still waiting/);
  assert.equal(storage.outboxIds().length, 1, 'the change is kept');
});
