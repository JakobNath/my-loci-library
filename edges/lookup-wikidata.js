// Wikidata: when the works in a book were written, their original titles and
// their IDs, in one query per book (core/wikidata.js). The only file that
// talks to Wikidata. Wikimedia asks every caller to name itself; a web page
// cannot set its User-Agent, so the app sends Api-User-Agent, which Wikidata
// allows from web pages. A refusal (too many queries) is a plain message, and
// adding the book carries on without dates (SOURCES.md).

import { worksQuery, worksFromWikidata } from '../core/wikidata.js';

// The query service's address. Its new backend answers at query-next.wikidata.org;
// this one stays until at least February 2027 (SOURCES.md, "Wikidata"), and the
// query is written so that either answers it.
const ENDPOINT = 'https://query.wikidata.org/sparql';
const AGENT = 'MyLociLibrary/1 (https://github.com/JakobNath/my-loci-library)';
// Wikidata's vocabularies, written out because the new query service adds none by itself.
const PREFIXES = `PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>`;
const TIMEOUT = 10000; // milliseconds; the dates are offered when they come, and never hold up adding

/**
 * Ask about the works of one book.
 * @param {string[]} titles the works' English titles
 * @param {string} author the author's name
 * @param {typeof fetch} [fetchFn] for the self-tests
 * @returns {Promise<Map<string, object>>} by title (core/wikidata.js, worksFromWikidata); empty when nothing could be asked
 */
export async function lookUpWorks(titles, author, fetchFn = fetch) {
  const query = worksQuery(titles, author, PREFIXES);
  if (!query) return new Map();
  const response = await fetchFn(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json', 'Api-User-Agent': AGENT },
    body: new URLSearchParams({ query }).toString(),
    signal: AbortSignal.timeout(TIMEOUT),
  }).catch(error => {
    throw new Error(error.name === 'TimeoutError' || error.name === 'AbortError' ? 'Wikidata did not answer in time; the dates can be typed instead.' : 'Wikidata could not be reached; the dates can be typed instead.');
  });
  if (response.status === 429 || response.status === 403) throw new Error('Wikidata is busy; the dates can be typed instead.');
  if (!response.ok) throw new Error(`Wikidata answered ${response.status}.`);
  return worksFromWikidata(await response.json(), titles);
}
