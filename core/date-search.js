// The "Search the web" link beside a date, language or original-title box: a
// question worded so that a web search answers it without editing (PLAN.md,
// "Original dates", "Search the web"). Only the address is built here; the
// browser does the search.

// The one place the search address lives. If it ever changes, change it here.
const SEARCH_ADDRESS = 'https://www.google.com/search?q=';

const ARTICLE = /^(the|a|an)\s/i;

// "Plato", "Plato and Aristotle", "Plato, Aristotle and Cicero".
function namesText(names) {
  const list = names.map(name => String(name || '').trim()).filter(Boolean);
  if (list.length < 2) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

const VOLUME_WORDS = /\b(?:volume|vol|v|band|bd)\.?\s*(\d{1,3})\b/i;
const plain = text => String(text || '').trim();

/**
 * The name a search should use for a book, so it finds this volume and not
 * the whole set: "Selected Psalms I (Luther's Works, volume 12)". A record
 * that calls a volume by its set's name and puts the number and the volume's
 * own title in the subtitle ("Luther's Works", "Volume 12 - (Selected Psalms
 * I)") is read the same way.
 * @param {{ title?: string, subtitle?: string, set?: string, volume?: string }} book
 * @returns {string}
 */
export function searchTitle({ title = '', subtitle = '', set = '', volume = '' }) {
  const name = plain(title);
  if (plain(set) && plain(volume)) {
    const isSetName = name.toLowerCase() === plain(set).toLowerCase();
    return name && !isSetName ? `${name} (${plain(set)}, volume ${plain(volume)})` : `${plain(set)}, volume ${plain(volume)}`;
  }
  const number = (plain(subtitle).match(VOLUME_WORDS) || [])[1];
  if (!number) return name;
  // What is left of the subtitle once the volume number and its dashes and brackets are taken out.
  const rest = plain(subtitle).replace(VOLUME_WORDS, ' ').replace(/[()[\]]/g, ' ').replace(/^[\s\-–—:,.]+|[\s\-–—:,.]+$/g, '').replace(/\s+/g, ' ');
  return rest ? `${rest} (${name}, volume ${number})` : `${name}, volume ${number}`;
}

/**
 * The title a search should ask about. A reader's extract names its work after
 * "from": "Alienation and Social Classes (from The Holy Family)" is asked about
 * as "The Holy Family" (The Marx-Engels Reader). Any other title is kept.
 * @param {string} title
 * @returns {string}
 */
export function searchableTitle(title) {
  const name = String(title || '').trim();
  const from = name.match(/\((?:from|aus)\s+([^)]+)\)\s*$/i);
  if (!from) return name;
  const work = from[1].trim();
  return work.charAt(0).toUpperCase() + work.slice(1);
}

// "Pride and Prejudice by Jane Austen"; a work with no author is usually named
// with "the" (the Didache), unless its title has an article already.
function subjectOf(title, authorNames) {
  const name = searchableTitle(title);
  const authors = namesText(authorNames || []);
  return authors ? `${name} by ${authors}` : ARTICLE.test(name) ? name : `the ${name}`;
}

/**
 * The question asked about a work's original date. It asks for both the
 * written and the published date, which the working-date rule needs.
 * @param {string} title the work's title, as the catalog gives it
 * @param {string[]} authorNames its authors' names (may be empty)
 * @returns {string} "When was Pride and Prejudice by Jane Austen written and first published?"
 */
export function workDateQuestion(title, authorNames) {
  return `When was ${subjectOf(title, authorNames)} written and first published?`;
}

/**
 * The question asked about a work's original language.
 * @returns {string} "What language was The Poverty of Philosophy by Karl Marx first written in?"
 */
export function workLanguageQuestion(title, authorNames) {
  return `What language was ${subjectOf(title, authorNames)} first written in?`;
}

/**
 * The question asked about a work's title in its own language.
 * @returns {string} "What is the original title of On the Jewish Question by Karl Marx?"
 */
export function originalTitleQuestion(title, authorNames) {
  return `What is the original title of ${subjectOf(title, authorNames)}?`;
}

// At most two names, then "and others", so a long list of translators does not crowd the search out.
const fewNames = names => namesText(names.slice(0, 2)) + (names.length > 2 ? ' and others' : '');

/**
 * The question asked about a book's table of contents, naming what tells this
 * printing from others of the same title: the series (or else the publisher
 * and year), and the translators (or else the editors). Asking only for
 * "Plutarch's Lives, volume 2" found Dryden's translation.
 * @param {{ title?: string, subtitle?: string, set?: string, volume?: string, series?: string, publisher?: string, year?: string }} found
 * @param {{ translators?: string[], editors?: string[] }} people as typed or found
 * @returns {string} "Table of contents of Plutarch's Lives, volume 2 (Loeb Classical Library, translated by Bernadotte Perrin)"
 */
export function contentsQuestion(found, { translators = [], editors = [] } = {}) {
  const firstPublisher = plain(found.publisher).split(';')[0].trim();
  const where = plain(found.series) || [firstPublisher, plain(found.year)].filter(Boolean).join(', ');
  const who = translators.length ? `translated by ${fewNames(translators)}` : editors.length ? `edited by ${fewNames(editors)}` : '';
  const about = [where, who].filter(Boolean).join(', ');
  return `Table of contents of ${searchTitle(found)}${about ? ` (${about})` : ''}`;
}

/**
 * The question asked about the year a book first came out, in any edition,
 * for the "First edition's year" box when the copyright page gives only this
 * edition's year. It names the editors and translators, since a translation
 * or a reader's first edition is that book's, not the work's.
 * @param {{ title?: string, subtitle?: string, set?: string, volume?: string, authors?: string[] }} found
 * @param {{ translators?: string[], editors?: string[] }} people as typed or found
 * @returns {string} "What year was the first edition of The Marx-Engels Reader, edited by Robert C. Tucker, published?"
 */
export function firstEditionQuestion(found, { translators = [], editors = [] } = {}) {
  const authors = editors.length ? [] : found.authors || [];
  const parts = [
    `${searchTitle(found)}${authors.length ? ` by ${fewNames(authors)}` : ''}`,
    editors.length ? `edited by ${fewNames(editors)}` : '',
    translators.length ? `translated by ${fewNames(translators)}` : '',
  ];
  const named = parts.filter(Boolean);
  // "…, edited by Robert C. Tucker, published?": the names set off by commas, as one would write it.
  return `What year was the first edition of ${named.join(', ')}${named.length > 1 ? ',' : ''} published?`;
}

/**
 * The web address that searches for a question.
 * @param {string} question
 * @returns {string}
 */
export function webSearchUrl(question) {
  return SEARCH_ADDRESS + encodeURIComponent(question);
}
