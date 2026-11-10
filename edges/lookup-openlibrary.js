// Open Library: finding a book by ISBN or by title, and downloading its
// cover. The only file that talks to Open Library. Answers are read by
// core/lookup.js. Open Library is free and needs no key.

import { fromOpenLibrary, candidatesFromSearch } from '../core/lookup.js';

const BASE = 'https://openlibrary.org';
const TIMEOUT = 8000; // milliseconds before giving up, so a slow answer never holds up scanning

async function getJson(url, fetchFn) {
  const response = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!response.ok) throw new Error(`Open Library answered ${response.status}.`);
  return response.json();
}

/** Where Open Library keeps the large cover for an ISBN. "default=false" makes it say "not found" instead of sending a blank picture. */
export function openLibraryCoverUrl(isbn) {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
}

/**
 * Look up one ISBN.
 * @param {string} isbn 13 digits
 * @param {typeof fetch} [fetchFn] for the self-tests
 * @returns {Promise<object|null>} the book's fields (core/lookup.js, "Found"), or null if unknown
 */
export async function lookUpOpenLibrary(isbn, fetchFn = fetch) {
  const answer = await getJson(`${BASE}/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`, fetchFn);
  return fromOpenLibrary(answer, isbn, openLibraryCoverUrl(isbn));
}

/**
 * Search by title (and author), for books without a barcode.
 * @returns {Promise<{ title: string, authors: string[], year: string, isbn: string }[]>}
 */
export async function searchOpenLibrary(text, fetchFn = fetch) {
  const fields = 'title,subtitle,author_name,first_publish_year,isbn';
  const answer = await getJson(`${BASE}/search.json?q=${encodeURIComponent(text)}&limit=10&fields=${fields}`, fetchFn);
  return candidatesFromSearch(answer);
}

/**
 * Download a cover picture. Open Library allows web pages to read its
 * pictures, so the app can compress them itself (HOW_IT_WORKS.md, "4.2").
 * @returns {Promise<Blob|null>} null when there is no cover
 */
export async function downloadOpenLibraryCover(url, fetchFn = fetch) {
  const response = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT * 2) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Open Library's cover answered ${response.status}.`);
  return response.blob();
}
