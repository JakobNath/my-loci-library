// Open Library: finding a book by ISBN or by title, and downloading its
// cover. The only file that talks to Open Library. Answers are read by
// core/lookup.js. Open Library is free and needs no key.

import { candidatesFromSearch, searchQueries, workFromOpenLibrary, authorsFromWorkSearch } from '../core/lookup.js';
import { fromOpenLibraryDetails } from '../core/book-data.js';

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

/** Where Open Library keeps a cover by its number (from a title search), in size S (small) or L (large). */
export function openLibraryCoverUrlById(id, size = 'L') {
  return `https://covers.openlibrary.org/b/id/${id}-${size}.jpg?default=false`;
}

/**
 * Search for the work behind an ISBN: its title, earliest edition and
 * authors. Made once when adding a book, and used both for the authors (when
 * the edition record names none) and for original date suggestions.
 * @returns {Promise<object|null>} the answer, or null when it failed (the work only adds suggestions)
 */
export function searchWork(isbn, fetchFn = fetch) {
  const fields = 'title,first_publish_year,author_key,author_name,author_alternative_name';
  return getJson(`${BASE}/search.json?q=isbn:${isbn}&fields=${fields}&limit=1`, fetchFn).catch(() => null);
}

/**
 * Look up one ISBN: Open Library's full edition record, with its authors'
 * names, in one request (`jscmd=details`). Asking for the book and its edition
 * record separately took twice as long; this keeps adding a book as fast as
 * before (HOW_IT_WORKS.md, "Fuller entries when adding").
 * @param {string} isbn 13 digits
 * @param {typeof fetch} [fetchFn] for the self-tests
 * @param {Promise<object|null>} [workSearch] the work search, when it was already asked (searchWork)
 * @returns {Promise<object|null>} the book's fields (core/lookup.js, "Found"), or null if unknown
 */
export async function lookUpOpenLibrary(isbn, fetchFn = fetch, workSearch = null) {
  const answer = await getJson(`${BASE}/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=details`, fetchFn);
  const found = fromOpenLibraryDetails(answer, isbn, openLibraryCoverUrl(isbn));
  if (found && !found.authors.length) found.authors = authorsFromWorkSearch(await (workSearch || searchWork(isbn, fetchFn)));
  return found;
}

/**
 * What Open Library knows about the work behind an ISBN: its title (often
 * in the original language), its earliest edition, and its first author's
 * life dates, for suggesting an original date (core/lookup.js).
 * @param {Promise<object|null>} [workSearch] the work search, when it was already asked (searchWork)
 * @returns {Promise<{ workTitle: string, firstPublished: number|null, author: object|null }>}
 */
export async function lookUpWork(isbn, fetchFn = fetch, workSearch = null) {
  const search = await (workSearch || searchWork(isbn, fetchFn));
  const doc = search && search.docs && search.docs[0];
  const authorKey = doc && doc.author_key && doc.author_key[0];
  const author = authorKey ? await getJson(`${BASE}/authors/${encodeURIComponent(authorKey)}.json`, fetchFn).catch(() => null) : null;
  return workFromOpenLibrary(search, author);
}

/**
 * Search by title (and author), for books without a barcode.
 * @returns {Promise<{ title: string, authors: string[], year: string, isbn: string }[]>}
 */
export async function searchOpenLibrary(text, fetchFn = fetch) {
  // Each work comes with its edition that best matches the search (English titles preferred).
  const fields = 'key,title,subtitle,author_name,author_alternative_name,first_publish_year,isbn,cover_i,editions,editions.title,editions.publisher,editions.publish_date,editions.isbn,editions.cover_i';
  const ask = query => getJson(`${BASE}/search.json?q=${encodeURIComponent(query)}&limit=20&lang=en&fields=${fields}`, fetchFn).catch(() => null);
  const [asTyped, ...withPublisher] = await Promise.all(searchQueries(text).map(ask));
  if (!asTyped && withPublisher.every(answer => !answer)) throw new Error('Open Library did not answer.');
  // A search naming a publisher finds that publisher's edition: those come first.
  return candidatesFromSearch([...withPublisher.reverse(), asTyped], text);
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
