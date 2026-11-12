// HathiTrust: looking up a book by ISBN in its Bibliographic API, which
// answers with university library records (often the Library of Congress's
// own). The only file that talks to HathiTrust. It allows calls from web
// pages and needs no key; it is meant for looking up a few books at a time,
// which is what adding books does (SOURCES.md). The answer is read by
// core/marc.js.

import { fromHathiTrust } from '../core/marc.js';

const API = 'https://catalog.hathitrust.org/api/volumes/full';

/** The page of one HathiTrust record, for a person to open (the book page's free-scan link). */
export const recordPage = record => `https://catalog.hathitrust.org/Record/${encodeURIComponent(record)}`;
const TIMEOUT = 8000; // milliseconds, as for the other lookups, so a slow answer never holds up scanning

/**
 * Look up one ISBN.
 * @param {string} isbn 13 digits
 * @param {typeof fetch} [fetchFn] for the self-tests
 * @returns {Promise<object|null>} the book's fields (core/lookup.js, "Found"), or null if HathiTrust has no record of it
 */
export async function lookUpHathiTrust(isbn, fetchFn = fetch) {
  const response = await fetchFn(`${API}/isbn/${isbn}.json`, { signal: AbortSignal.timeout(TIMEOUT) });
  if (response.status === 429 || response.status === 403) throw new Error('HathiTrust is busy; try again in a minute.');
  if (!response.ok) throw new Error(`HathiTrust answered ${response.status}.`);
  return fromHathiTrust(await response.text(), isbn);
}
