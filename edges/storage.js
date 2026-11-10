// The device's own copy of the catalog, in IndexedDB: records, small images
// and the outbox of changes not yet sent to GitHub. The only file that
// touches IndexedDB.
//
// For a fast start the catalog is kept as one snapshot (all records as one
// JSON text, read in one go) plus the records changed since, kept one by one.
// Reading one text and parsing it is several times faster than reading
// thousands of separate records (measured: 210 ms against 770 ms for 32,000
// records in a slowed browser). The changes are folded into the snapshot
// from time to time (compact). The copy here is a cache of GitHub (PLAN.md, "Storage
// that can't lose data"), except for the outbox, which is why it is kept
// until the sync module says each change has arrived.

import { migrate } from '../core/records.js';

const DATABASE = 'my-loci-library';
const VERSION = 1;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(plainError(request.error));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(plainError(transaction.error));
    transaction.onabort = () => reject(plainError(transaction.error));
  });
}

/** Turns the browser's storage errors into messages a person can act on. */
export function plainError(error) {
  if (error && error.name === 'QuotaExceededError') {
    return new Error('This device is out of storage space, so the change was not saved. Free some space (old photos or apps), then try again. Nothing already saved was lost.');
  }
  return new Error(`The catalog on this device could not be read or written (${error ? error.name : 'unknown error'}). Reload the app; if it keeps happening, the catalog can be downloaded again from GitHub.`);
}

/**
 * Open the device's catalog.
 * @param {string} [name] a different database name, for the self-tests
 * @returns {Promise<object>} the storage functions below, bound to the database
 */
export async function openStorage(name = DATABASE) {
  if (!('indexedDB' in globalThis)) {
    throw new Error('This browser cannot store the catalog (no IndexedDB). Open the app in Safari, Chrome, Edge or Firefox.');
  }
  const opening = indexedDB.open(name, VERSION);
  opening.onupgradeneeded = () => {
    const db = opening.result;
    db.createObjectStore('records', { keyPath: 'id' });
    db.createObjectStore('images');
    db.createObjectStore('outbox', { keyPath: 'id' });
    db.createObjectStore('meta');
  };
  const db = await requestResult(opening);
  return {
    /** Every record on this device: the snapshot, with later changes on top. */
    async allRecords() {
      const transaction = db.transaction(['meta', 'records']);
      const [snapshot, changed] = await Promise.all([
        requestResult(transaction.objectStore('meta').get('snapshot')),
        requestResult(transaction.objectStore('records').getAll()),
      ]);
      // Records saved by an older version of the app are read in this app's data format.
      if (!changed.length) return snapshot ? JSON.parse(snapshot).map(migrate) : [];
      const byId = new Map(snapshot ? JSON.parse(snapshot).map(record => [record.id, record]) : []);
      for (const record of changed) byId.set(record.id, record);
      return [...byId.values()].map(migrate);
    },
    /** How many records changed since the snapshot; compact when this grows. */
    async changedCount() {
      return requestResult(db.transaction('records').objectStore('records').count());
    },
    /** Fold the changed records into a new snapshot. */
    async compact() {
      const records = await this.allRecords();
      const transaction = db.transaction(['meta', 'records'], 'readwrite');
      transaction.objectStore('meta').put(JSON.stringify(records), 'snapshot');
      transaction.objectStore('records').clear();
      return transactionDone(transaction);
    },
    /**
     * Save records. With `toOutbox`, each is also queued for the next sync;
     * both happen together or not at all.
     */
    async saveRecords(records, { toOutbox = false } = {}) {
      const transaction = db.transaction(['records', 'outbox'], 'readwrite');
      for (const record of records) {
        transaction.objectStore('records').put(record);
        if (toOutbox) transaction.objectStore('outbox').put({ id: record.id, type: record.type });
      }
      return transactionDone(transaction);
    },
    /** Replace the whole catalog, for a first download or the development loader. */
    async replaceRecords(records) {
      const transaction = db.transaction(['records', 'outbox', 'meta'], 'readwrite');
      transaction.objectStore('records').clear();
      transaction.objectStore('outbox').clear();
      transaction.objectStore('meta').put(JSON.stringify(records), 'snapshot');
      return transactionDone(transaction);
    },
    /** IDs of records changed here and not yet sent. */
    async outbox() {
      return requestResult(db.transaction('outbox').objectStore('outbox').getAll());
    },
    /** Mark records as sent. */
    async clearOutbox(ids) {
      const transaction = db.transaction('outbox', 'readwrite');
      for (const id of ids) transaction.objectStore('outbox').delete(id);
      return transactionDone(transaction);
    },
    async image(id) {
      return requestResult(db.transaction('images').objectStore('images').get(id));
    },
    async saveImage(id, blob) {
      const transaction = db.transaction('images', 'readwrite');
      transaction.objectStore('images').put(blob, id);
      return transactionDone(transaction);
    },
    async meta(key) {
      return requestResult(db.transaction('meta').objectStore('meta').get(key));
    },
    async saveMeta(key, value) {
      const transaction = db.transaction('meta', 'readwrite');
      transaction.objectStore('meta').put(value, key);
      return transactionDone(transaction);
    },
    close() {
      db.close();
    },
  };
}

/** Delete a database entirely; used by the self-tests to clean up. */
export async function deleteStorage(name) {
  await requestResult(indexedDB.deleteDatabase(name));
}

/**
 * Ask the browser to keep the catalog even when space runs low. Home-screen
 * apps on iPhone are exempt from Safari's clearing anyway, so a "no" is fine.
 * Feature check: navigator.storage.persist is missing in some older browsers.
 * @returns {Promise<boolean>} whether storage is persistent
 */
export async function askForPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) return false;
  return (await navigator.storage.persisted()) || navigator.storage.persist();
}
