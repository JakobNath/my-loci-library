// The device's own copy of the catalog (edges/storage.js), checked in the
// browser, since it needs a real IndexedDB. Each test uses its own database
// and deletes it afterwards, so the app's catalog on this device is untouched.

import { newRecord } from '../core/records.js';
import { openStorage, deleteStorage } from '../edges/storage.js';
import { equal } from '../core/tests/check.js';

const NOW = '2026-11-10T12:00:00Z';

export const tests = [
  {
    name: 'emptying the catalog removes records, pictures, unsent changes and settings',
    async fn() {
      const storage = await openStorage('loci-storage-clear-test');
      try {
        await storage.replaceRecords([newRecord('author', 'a00000000001', NOW, { name: 'Augustine' })]);
        await storage.saveRecords([newRecord('author', 'a00000000002', NOW, { name: 'Ambrose' })], { toOutbox: true });
        await storage.saveImage('c00000000001/thumb', new Blob(['picture']));
        await storage.saveMeta('settings', { currency: '€' });
        await storage.saveMeta('known', [['authors/a00000000001.json', 'abc']]);
        equal((await storage.allRecords()).length, 2, 'two records before');
        await storage.clearCatalog();
        equal((await storage.allRecords()).length, 0, 'no records');
        equal((await storage.outbox()).length, 0, 'no unsent changes');
        equal(await storage.image('c00000000001/thumb'), undefined, 'no pictures');
        equal(await storage.meta('settings'), undefined, 'no shared settings');
        equal(await storage.meta('known'), undefined, 'no fingerprints, so the next catalog downloads in full');
      } finally {
        storage.close();
        await deleteStorage('loci-storage-clear-test');
      }
    },
  },
];
