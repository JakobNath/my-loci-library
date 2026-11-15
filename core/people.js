// Who wrote a book, as far as the lookups can tell. Records found by ISBN
// often list a translator, an editor, a foreword writer or even the publisher
// among the authors, and name ancient authors in their own script. A person
// then sees "by A. D. Melville" or "by Emily Wilson and Ὅμηρος", and a wrong
// original date follows from it. These rules put the people the records do
// make clear in their right place; what the records get wrong without a trace
// is left for "Fix details" (docs/decisions/book-data.md, "People in lookups").
// Then adding asks a person: who translated and edited it, and the language
// of the book itself (the last two functions).

import { normalizeForSearch } from './search.js';
import { latin, nameInLatin, samePerson, tidy } from './lookup.js';
import { typedNames } from './contents.js';

// A publisher's name without the words every publisher has: "Vandenhoeck & Ruprecht." is "vandenhoeck ruprecht".
const COMPANY_WORDS = new Set(['and', 'verlag', 'verlage', 'press', 'publishing', 'publishers', 'house', 'inc', 'ltd', 'co', 'gmbh', 'books']);
const companyKey = name => normalizeForSearch(name).split(' ').filter(word => word && !COMPANY_WORDS.has(word)).join(' ');

// A name's words, for comparing a misspelt "Henery Bettenson" with "Henry Scowcroft Bettenson".
const nameWords = name => normalizeForSearch(name).split(' ').filter(Boolean);

// Whether two words differ by one letter added, dropped or changed ("henery" and "henry").
function oneLetterApart(a, b) {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.length - short.length > 1) return false;
  let at = 0;
  while (at < short.length && short[at] === long[at]) at++;
  const rest = short.length === long.length ? at + 1 : at;
  return short.slice(rest) === long.slice(at + 1);
}

// The same person written two ways: as samePerson, or with the same surname and a
// first name one letter apart or given as an initial, since a statement of
// responsibility is typed by hand and may be misspelt ("Henery Bettenson").
function sameLoosely(a, b) {
  if (samePerson(a, b)) return true;
  const [x, y] = [nameWords(a), nameWords(b)];
  if (x.length < 2 || y.length < 2 || x[x.length - 1] !== y[y.length - 1]) return false;
  return x[0][0] === y[0][0] && (x[0].length === 1 || y[0].length === 1 || oneLetterApart(x[0], y[0]));
}

// A church, council or society named as the author: the body whose texts a book collects
// ("Evangelisch-Lutherische Kirche (Germany)" on the Book of Concord), not a person who wrote it.
const BODY_WORDS = /\b(?:church|kirche|council|synod|society|association|committee|commission|conference|congregation|university|institute|academy|ministry|gesellschaft|verein)\b/i;
const isBody = name => BODY_WORDS.test(name);

/**
 * The people of a looked-up book, set right where the records make it clear:
 * - someone the record names as translator, editor or the like is not also an
 *   author, even when one of the two spellings is wrong; the author list's
 *   spelling is kept, since a statement of responsibility is typed by hand;
 * - a church or other body named as the author of a book with editors is
 *   dropped: the editors stand for the book, and its works have their own authors;
 * - an "author" that is the publisher is dropped;
 * - an author named in another script gets the Latin form (Ὅμηρος is Homer);
 * - an edition's author whom Open Library's work record does not list
 *   (Emily Wilson on Homer's Iliad) becomes a translator when the work is
 *   old (its author died more than a century before this printing, or was
 *   named in another script), and otherwise another contributor (a foreword).
 * @param {import('./lookup.js').Found} found the merged answer
 * @param {{ search?: object|null, work?: { author: { name: string, born: number|null, died: number|null }|null }|null, known?: string[] }} context
 *   search: Open Library's work search answer; work: from workFromOpenLibrary; known: author names in the library
 * @returns {import('./lookup.js').Found} a new object
 */
export function tidyPeople(found, { search = null, work = null, known = [] } = {}) {
  if (!found) return found;
  const doc = (search && search.docs && search.docs[0]) || {};
  const others = doc.author_alternative_name || [];
  const inOtherScript = found.authors.some(name => !latin(name)) || (doc.author_name || []).some(name => !latin(name));
  const latinAuthors = found.authors.map(name => nameInLatin(tidy(name), others, known));
  // A contributor misspelt in the statement of responsibility takes the author list's spelling.
  const contributors = found.contributors.map(person => {
    const author = person.role === 'author' ? null : latinAuthors.find(name => !samePerson(person.name, name) && sameLoosely(person.name, name));
    return author ? { ...person, name: author } : person;
  });
  const named = contributors.filter(person => person.role !== 'author');
  const hasEditor = named.some(person => person.role === 'editor');
  let authors = latinAuthors
    .filter(name => !named.some(person => samePerson(person.name, name)))
    .filter(name => !(hasEditor && isBody(name)))
    .filter(name => !found.publisher || companyKey(name) !== companyKey(found.publisher));
  // The same person given twice (once in each script) is kept once.
  authors = authors.filter((name, i) => authors.findIndex(other => samePerson(other, name)) === i);
  const workAuthors = (doc.author_name || []).map(name => nameInLatin(tidy(name), others, known));
  const listed = name => workAuthors.some(author => samePerson(author, name));
  // Only when the work record shares at least one author with the edition is the rest moved aside.
  if (workAuthors.length && authors.some(listed) && !authors.every(listed)) {
    const author = work && work.author;
    const year = Number(found.year) || null;
    const old = inOtherScript || Boolean(author && year && ((author.died !== null && year - author.died > 100) || (author.born !== null && year - author.born > 200)));
    const hasTranslator = contributors.some(person => person.role === 'translator');
    for (const name of authors.filter(name => !listed(name))) contributors.push({ name, role: old && !hasTranslator ? 'translator' : 'other' });
    authors = authors.filter(listed);
  }
  return { ...found, authors, contributors };
}

/**
 * The record authors of a collection who may be its editors instead: those no
 * line of its contents names as an author. Records often name the editor of
 * an anthology as its author with nothing to show it (Michael W. Holmes for
 * the Apostolic Fathers), so adding asks; an author whose works the contents
 * name (Euripides) is not asked about.
 * @param {string[]} authors the book's authors as found
 * @param {{ author: string }[]} lines the contents, as parseContentsLines reads them
 * @returns {string[]}
 */
export function possibleEditors(authors, lines) {
  const writers = lines.flatMap(line => typedNames(line.author));
  return authors.filter(name => !writers.some(writer => samePerson(writer, name)));
}

/**
 * A book's contributors once adding has asked about them: the translators and
 * editors typed (or kept as found) take the place of those the lookups gave;
 * everyone else (a foreword, an assistant editor kept as "other") stays.
 * @param {{ name: string, role: string }[]} contributors as found
 * @param {string} translatorText the translator box, names separated by ";"
 * @param {string} editorText the "Edited by" box, the same way
 * @returns {{ name: string, role: string }[]}
 */
export function contributorsFromSteps(contributors, translatorText, editorText) {
  const others = contributors.filter(person => person.role !== 'translator' && person.role !== 'editor');
  const named = (text, role) => typedNames(text).map(name => ({ name, role }));
  return [...named(editorText, 'editor'), ...named(translatorText, 'translator'), ...others];
}

/**
 * The languages of a new book (an edition's own, not its works'): those typed,
 * else those a lookup gave, else, for a book that is not a translation, the
 * language its work was first written in. A translation with nothing typed or
 * found is left empty, since the original language would be wrong for it.
 * @param {{ typed: string, found: string[], original: string, isTranslated: boolean }} answers
 * @returns {string[]}
 */
export function editionLanguages({ typed, found, original, isTranslated }) {
  const named = String(typed || '').split(',').map(name => tidy(name)).filter(Boolean);
  if (named.length) return named;
  if (found.length) return found;
  return !isTranslated && tidy(original) ? [tidy(original)] : [];
}
