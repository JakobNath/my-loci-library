// Google Books: finding a book by ISBN when Open Library does not know it.
// The only file that talks to Google Books. Without a key Google now
// refuses most requests (checked 9 November 2026: a daily limit of zero),
// so each device may hold a free key in its settings (HOW_IT_WORKS.md).

import { fromGoogleBooks } from '../core/lookup.js';

const TIMEOUT = 8000; // milliseconds

/**
 * Look up one ISBN.
 * @param {string} isbn 13 digits
 * @param {string} [key] this device's Google Books key, if one was set
 * @param {typeof fetch} [fetchFn] for the self-tests
 * @returns {Promise<object|null>} the book's fields, or null if unknown
 */
export async function lookUpGoogleBooks(isbn, key = '', fetchFn = fetch) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${key ? `&key=${encodeURIComponent(key)}` : ''}`;
  const response = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (response.status === 429 || response.status === 403) {
    throw new Error(key ? 'Google Books refused this request; the key may have reached its daily limit.' : 'Google Books refused this request. A free key in Settings makes it reliable.');
  }
  if (!response.ok) throw new Error(`Google Books answered ${response.status}.`);
  return fromGoogleBooks(await response.json(), isbn);
}
