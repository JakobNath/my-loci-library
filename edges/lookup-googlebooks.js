// Google Books: finding a book by ISBN, and checking a key. The only file
// that talks to Google Books. Without a key Google refuses most requests
// (checked 9 November 2026: a daily limit of zero), so each device may hold
// a free key in its settings (HOW_IT_WORKS.md).

import { fromGoogleBooks, googleBooksItem } from '../core/lookup.js';
import { fromGoogleBooksVolume, mergeFound } from '../core/book-data.js';

const API = 'https://www.googleapis.com/books/v1';
const TIMEOUT = 8000; // milliseconds

const withKey = (url, key) => (key ? `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}` : url);

async function getJson(url, key, fetchFn) {
  const response = await fetchFn(withKey(url, key), { signal: AbortSignal.timeout(TIMEOUT) });
  if (response.status === 429 || response.status === 403) {
    throw new Error(key ? 'Google Books refused this request; the key may have reached its daily limit.' : 'Google Books refused this request. A free key in Settings makes it reliable.');
  }
  if (!response.ok) throw new Error(`Google Books answered ${response.status}.`);
  return response.json();
}

/**
 * Look up one ISBN. With a key, the volume's own record is asked for too:
 * it holds the height, thickness and the larger covers (PLAN.md, "Book data").
 * @param {string} isbn 13 digits
 * @param {string} [key] this device's Google Books key, if one was set
 * @param {typeof fetch} [fetchFn] for the self-tests
 * @returns {Promise<object|null>} the book's fields, or null if unknown
 */
export async function lookUpGoogleBooks(isbn, key = '', fetchFn = fetch) {
  const answer = await getJson(`${API}/volumes?q=isbn:${isbn}`, key, fetchFn);
  const found = fromGoogleBooks(answer, isbn);
  const item = googleBooksItem(answer, isbn);
  if (!key || !item) return found;
  // The volume record only adds to the search answer: when it fails, the search answer stands.
  const volume = await getJson(`${API}/volumes/${encodeURIComponent(item.id)}`, key, fetchFn).catch(() => null);
  return mergeFound([fromGoogleBooksVolume(volume, isbn), found]);
}
