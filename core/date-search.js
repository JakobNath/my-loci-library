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

// The working-date rule (PLAN.md, "Which date is the working date"), said to
// the search so that its summary answers with one date rather than several.
// Each kind of work a person may choose beside the date box (ui/date-help.js)
// narrows it to that kind's rule.
const PUBLISHED_OR_WRITTEN = 'the year it was first published if that was in the author\'s lifetime, otherwise when it was written';
const REVISED = 'If the author later revised it, also give the year of the final edition.';
const DATE_ASKED = {
  any: `Give one date: ${PUBLISHED_OR_WRITTEN}. For a letter give its date, for a speech or sermon when it was delivered, for a play its first performance. ${REVISED}`,
  book: `Give one date: ${PUBLISHED_OR_WRITTEN}. ${REVISED}`,
  letter: 'Give one date: the date on the letter.',
  speech: 'Give one date: when it was delivered.',
  play: 'Give one date: its first performance, or when it was written if that is not known.',
  poem: `Give one date: ${PUBLISHED_OR_WRITTEN}.`,
  ancient: 'Give one date or range of years: when it was written, as scholars date it.',
};

// How each kind's question begins: "When was the play Oedipus the King by Sophocles first performed?"
const DATE_QUESTION = {
  any: subject => `What is the original date of ${subject}?`,
  book: subject => `When was ${subject} first published?`,
  letter: subject => `What is the date of the letter ${subject}?`,
  speech: subject => `When was ${subject} delivered?`,
  play: subject => `When was the play ${subject} first performed?`,
  poem: subject => `When was the poem ${subject} first published?`,
  ancient: subject => `When was ${subject} written?`,
};

/** What the search is told about the date wanted, for a kind of work or for any work. */
const dateAsked = kind => DATE_ASKED[kind] || DATE_ASKED.any;

/**
 * The question asked about a work's original date. It carries the
 * working-date rule, so the answer is the one date the catalog wants.
 * @param {string} title the work's title, as the catalog gives it
 * @param {string[]} authorNames its authors' names (may be empty)
 * @param {string} [kind] the kind of work a person chose: book, letter, speech, play, poem or ancient
 * @returns {string} "What is the original date of Pride and Prejudice by Jane Austen? Give one date: …"
 */
export function workDateQuestion(title, authorNames, kind = '') {
  // "the play Antigone", not "the play the Antigone": the "the" an anonymous work is given is left out after a noun.
  const named = ['letter', 'play', 'poem'].includes(kind);
  const subject = named ? subjectOf(title, authorNames).replace(/^the /, '') : subjectOf(title, authorNames);
  return `${(DATE_QUESTION[kind] || DATE_QUESTION.any)(subject)} ${dateAsked(kind)}`;
}

/**
 * The one question on a work's card while adding a collection: who wrote it,
 * in what language, under what title and when. It does not assume the author,
 * since a reader's record seldom says who wrote which work, and names the
 * book and its authors so the search finds this work and not another of the
 * same title.
 * @param {string} title the work's title as on the card
 * @param {{ title?: string, subtitle?: string, set?: string, volume?: string, authors?: string[] }} found the book
 * @param {string} [kind] as for workDateQuestion
 * @returns {string} "'The Condition of the Working Class in England', printed in The Marx-Engels Reader (works by Karl Marx and Friedrich Engels): who wrote it, …"
 */
export function workDetailsQuestion(title, found, kind = '') {
  const authors = (found.authors || []).filter(name => plain(name));
  const book = searchTitle(found);
  const names = authors.length > 1 ? `works by ${fewNames(authors)}` : authors.length ? `by ${authors[0]}` : '';
  // "Lives II (Plutarch's Lives, volume 2), by Plutarch": no second bracket straight after the first.
  const by = !names ? '' : book.endsWith(')') ? `, ${names}` : ` (${names})`;
  return `'${plain(title)}', printed in ${book}${by}: who wrote it, in what language, under what original title, and what is its original date? ${dateAsked(kind)}`;
}

/**
 * The question asked about when a whole collection was written, for "All
 * written about the same time?" above a collection's cards.
 * @param {{ title?: string, subtitle?: string, set?: string, volume?: string, authors?: string[] }} found the book
 * @returns {string} "When did Plutarch write the works in Plutarch's Lives? Give one date or range of years."
 */
export function collectionDateQuestion(found) {
  const authors = (found.authors || []).filter(name => plain(name));
  const question = authors.length === 1 ? `When did ${authors[0]} write the works in ${searchTitle(found)}?`
    : `When were the works in ${searchTitle(found)}${authors.length ? ` by ${fewNames(authors)}` : ''} written?`;
  return `${question} Give one date or range of years.`;
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
