// The known sets' lists (sets/*.txt, DATA_FORMAT.md "sets/"), read once when
// the add or wishlist screen first needs them. They are the app's own files,
// kept by the service worker like its code, so they work offline. Reading a
// list is core's job (core/known-sets.js).

import { parseKnownSet } from '../core/known-sets.js';

// Every list the app carries. A new list is added here and to FILES in sw.js.
export const KNOWN_SET_FILES = ['sets/great-books-1990.txt'];

let loading = null;

/**
 * Every known set, read once and kept. A list that cannot be fetched is left
 * out (adding a book never waits on it); a list with problems is left out too,
 * since a half-read list could give a volume the wrong works.
 * @returns {Promise<ReturnType<parseKnownSet>[]>}
 */
export function loadKnownSets() {
  loading ??= Promise.all(KNOWN_SET_FILES.map(file => fetch(file)
    .then(response => (response.ok ? response.text() : ''))
    .catch(() => '')))
    .then(texts => texts.filter(Boolean).map(parseKnownSet).filter(set => !set.problems.length));
  return loading;
}
