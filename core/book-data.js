// The fuller book records of Open Library (the edition record) and Google
// Books (the volume record), and how the three sources are merged
// (PLAN.md, "Book data"). The Library of Congress is read in core/marc.js.
// Only answers are read here; the edges and the laptop tool fetch them.
// Also what a book's series tells about it: facing-page languages and
// Loeb's style of title.

import { isbn13 } from './entry.js';
import { emptyFound, combineFound, contributorsFrom, cleanPages, titleCase, tidy, yearOf, listsIsbn, otherIsbnsListed, googleIsbns, samePerson, describesVolumes, isEditionNotPublisher } from './lookup.js';
import { normalizeForSearch } from './search.js';

// MARC language codes (also used by Open Library) for the languages a library
// like ours meets. A code not listed is shown as it is.
export const LANGUAGE_NAMES = {
  ang: 'Old English', ara: 'Arabic', arc: 'Aramaic', arm: 'Armenian', chi: 'Chinese', chu: 'Church Slavic',
  cop: 'Coptic', cze: 'Czech', dan: 'Danish', dut: 'Dutch', eng: 'English', enm: 'Middle English',
  eth: 'Ethiopic', fin: 'Finnish', fre: 'French', frm: 'Middle French', fro: 'Old French', geo: 'Georgian',
  // Greek for both ancient and modern, as the add screen's chips and Wikidata's reading have it.
  ger: 'German', gmh: 'Middle High German', grc: 'Greek', gre: 'Greek', heb: 'Hebrew',
  hun: 'Hungarian', ice: 'Icelandic', ita: 'Italian', jpn: 'Japanese', kor: 'Korean', lat: 'Latin',
  nor: 'Norwegian', per: 'Persian', pol: 'Polish', por: 'Portuguese', rus: 'Russian', san: 'Sanskrit',
  spa: 'Spanish', swe: 'Swedish', syr: 'Syriac',
};

// Open Library's physical formats, in the names of our lists (core/settings.js); the
// add screen reads the word into binding, material and extras (core/bindings.js).
const BINDINGS = [
  [/mass[\s-]*market/i, 'Mass-market paperback'], [/paper|soft/i, 'Paperback'], [/bonded/i, 'Bonded leather'],
  [/leather/i, 'Leather'], [/library/i, 'Library binding'], [/hard|cased/i, 'Hardcover'], [/cloth/i, 'Cloth'],
];

/** Our binding for a record's physical format ("Mass Market Paperback"), or '' when it names none we know. */
export function bindingFromFormat(text) {
  const match = BINDINGS.find(([pattern]) => pattern.test(String(text || '')));
  return match ? match[1] : '';
}

/**
 * Height and thickness in millimeters from dimensions written height first:
 * "8.4 x 5.4 x 1.8 inches", "22 x  x  centimeters". Sizes that cannot be a
 * single book's (a thickness not less than the width or half the height) are
 * not used at all: records sometimes give the three in another order
 * (Hackett's Plato: 24 × 9.5 × 16.1 cm), or measure a boxed set (the
 * Ante-Nicene Fathers: 14.1 × 10 × 8.5 inches).
 * @returns {{ height: number|null, thickness: number|null }}
 */
export function sizesFromDimensions(height, width, thickness, unit) {
  const scale = /in/i.test(unit) ? 25.4 : /mm/i.test(unit) ? 1 : 10;
  const mm = text => (Number(text) > 0 ? Math.round(Number(text) * scale) : null);
  const sizes = { height: mm(height), thickness: mm(thickness) };
  const tooThick = sizes.thickness && ((sizes.height && sizes.thickness >= sizes.height / 2) || (mm(width) && sizes.thickness >= mm(width)));
  return tooThick ? { height: null, thickness: null } : sizes;
}

// Front and back matter, and the volumes or parts of one book ("V. 1. Part I",
// "Part 1: Working with Biblical Hebrew Prose", "Books 1-12"), are not works.
const NOT_A_WORK = /^(preface|foreword|prologue|introduction|acknowledg|contents|index|bibliograph|notes|abbreviations|appendix|glossary|list of|further reading|chronology)|^(v|vols?|volumes?|pts?|parts?|bks?|books?|bd|band|teil)\.?\s*[\divxlc]+\b/i;

/** Whether a title in a contents list can be a work of an anthology. */
export const isWorkTitle = title => !NOT_A_WORK.test(tidy(title));

// The top level of Open Library's table of contents, as works an anthology may hold.
function contentsFromToc(toc) {
  const entries = (toc || []).filter(entry => entry && tidy(entry.title));
  const top = Math.min(...entries.map(entry => entry.level || 0));
  return entries.filter(entry => (entry.level || 0) === top && isWorkTitle(entry.title))
    .map(entry => {
      const title = tidy(entry.title).replace(/ : /g, ': ');
      return { title: titleCase(title === title.toUpperCase() ? title.toLowerCase() : title), author: tidy(entry.authors && entry.authors[0] && entry.authors[0].name) };
    });
}

// "Chemnitz's works -- v. 7, 8" and "Loeb classical library ; 36" give the series and its number.
// Open Library sometimes splits them: ["Everyman's library ;", "259"].
function seriesParts(list) {
  const text = /^[\d\s,.–-]+$/.test(list[1] || '') ? `${list[0]} ${list[1]}` : list[0];
  const [name, number = ''] = tidy(text).split(/\s+--\s+|\s*;\s*/);
  return { series: titleCase(name.replace(/[.,]$/, '')), seriesNumber: number.replace(/^(?:v|vol|no)\.?\s*/i, '').replace(/\.$/, '') };
}

// "John Bayley (Introduction)" names a role; "Chadwick, Henry, 1920-" does not.
function contributorsFromContributions(list) {
  const roles = { translator: 'translator', editor: 'editor', introduction: 'introduction', illustrator: 'illustrator' };
  return (list || []).map(text => String(text).match(/^(.+?)\s*\((\w+)\)$/)).filter(match => match && roles[match[2].toLowerCase()])
    .map(([, name, role]) => ({ name: tidy(name), role: roles[role.toLowerCase()] }));
}

const first = list => tidy((list || []).find(item => tidy(item)) || '');

// A bookseller's format codes in an edition statement: "Pap/Cdr" is a paperback with a CD-ROM.
const FORMAT_CODES = /\b[A-Za-z]{3}(?:\/[A-Za-z]{3})+\b/g;
const ordinal = number => `${number}${/1[123]$/.test(number) ? 'th' : ['th', 'st', 'nd', 'rd'][Number(number.slice(-1))] || 'th'}`;

/**
 * An edition statement as a person would write it. Records copied from
 * booksellers say "New Ed edition" (New ed.) and "2 Pap/Cdr edition" (the
 * second edition, a paperback with a CD-ROM): the format codes are dropped
 * and the number written as "2nd ed.".
 * @param {string} text
 * @returns {string}
 */
export function editionFromSeller(text) {
  const plain = tidy(String(text || '').replace(/[[\]]/g, '').replace(FORMAT_CODES, '')).replace(/\.\.$/, '.');
  const numbered = plain.match(/^(\d+)(?:st|nd|rd|th)?\.?\s+edition$/i);
  if (numbered) return `${ordinal(numbered[1])} ed.`;
  return /^edition$/i.test(plain) ? '' : plain.replace(/\bEd\.? edition$/i, 'ed.');
}

/**
 * Read Open Library's full edition record (/isbn/<isbn>.json, after its redirect).
 * @param {object} edition the parsed record
 * @param {string} isbn 13 digits
 * @returns {import('./lookup.js').Found|null} null when the record does not list the ISBN
 */
export function fromOpenLibraryEdition(edition, isbn) {
  const listed = [...((edition && edition.isbn_13) || []), ...((edition && edition.isbn_10) || [])];
  if (!edition || !edition.title || !listed.map(isbn13).includes(isbn)) return null;
  const found = emptyFound('openlibrary');
  found.title = titleCase(tidy(edition.title));
  found.subtitle = titleCase(tidy(edition.subtitle));
  found.contributors = contributorsFrom(edition.by_statement);
  if (!found.contributors.length) found.contributors = contributorsFromContributions(edition.contributions);
  // Every publisher and place, joined as the edition's fields keep several ("Harvard University Press; W. Heinemann").
  found.publisher = (edition.publishers || []).map(tidy).filter(name => name && !isEditionNotPublisher(name)).join('; ');
  found.place = (edition.publish_places || []).map(place => tidy(place).replace(/[\s:;,]+$/, '')).filter(Boolean).join('; ');
  found.year = yearOf(edition.publish_date);
  found.pages = cleanPages(edition.pagination) || (edition.number_of_pages && !describesVolumes(edition.pagination) ? String(edition.number_of_pages) : '');
  found.isbn = isbn;
  // A record of a whole set ("11v.", Plutarch's Lives) lists every volume's ISBN; none is printed in this volume.
  found.otherIsbns = describesVolumes(edition.pagination) ? [] : otherIsbnsListed(listed, isbn);
  found.editionStatement = editionFromSeller(edition.edition_name);
  Object.assign(found, edition.series && edition.series.length ? seriesParts(edition.series) : {});
  found.binding = bindingFromFormat(edition.physical_format);
  const dimensions = String(edition.physical_dimensions || '').match(/^\s*([\d.]*)\s*x\s*([\d.]*)\s*x\s*([\d.]*)\s*(\w+)/i);
  if (dimensions) Object.assign(found, sizesFromDimensions(...dimensions.slice(1)));
  found.originalTitle = tidy(edition.translation_of);
  const fromLanguage = ((edition.translated_from || [])[0] || {}).key;
  found.originalLanguage = fromLanguage ? LANGUAGE_NAMES[fromLanguage.split('/').pop()] || '' : '';
  found.contents = contentsFromToc(edition.table_of_contents);
  if (found.contents.length < 2) found.contents = [];
  found.subjects = (edition.subjects || []).map(tidy).filter(Boolean);
  found.identifiers = {
    lccn: first(edition.lccn), oclc: first(edition.oclc_numbers),
    lcc: first(edition.lc_classifications), ddc: first(edition.dewey_decimal_class).replace(/\//g, ''),
    openLibrary: tidy(edition.key).split('/').pop(), hathiTrust: '', // "/books/OL23154103M"
  };
  return found;
}

/**
 * Read Open Library's answer to /api/books?bibkeys=ISBN:<isbn>&format=json&jscmd=details:
 * the full edition record, with its authors' names, in one request. Used
 * when adding a book, because asking for the book and its edition record
 * separately took twice as long (HOW_IT_WORKS.md, "Fuller entries when adding").
 * @param {object} answer the whole answer
 * @param {string} isbn 13 digits
 * @param {string} coverUrl where Open Library keeps this ISBN's cover (given by the edge)
 * @returns {import('./lookup.js').Found|null} null when Open Library does not know the book
 */
export function fromOpenLibraryDetails(answer, isbn, coverUrl) {
  const edition = answer && answer[`ISBN:${isbn}`] && answer[`ISBN:${isbn}`].details;
  const found = fromOpenLibraryEdition(edition, isbn);
  if (!found) return null;
  found.authors = (edition.authors || []).map(author => tidy(author.name)).filter(Boolean);
  found.cover = coverUrl ? { url: coverUrl, source: 'openlibrary', waiting: false } : null;
  return found;
}

/**
 * Read a Google Books volume record (/books/v1/volumes/<id>): height and
 * thickness, the page count, publisher, and the largest cover. Its covers
 * cannot be read by a web page, so the cover waits for the laptop
 * (HOW_IT_WORKS.md, "4.2").
 * @param {object} volume the parsed record
 * @param {string} isbn 13 digits
 * @returns {import('./lookup.js').Found|null} null when the record does not list the ISBN
 */
export function fromGoogleBooksVolume(volume, isbn) {
  const info = volume && volume.volumeInfo;
  if (!info || !info.title || !listsIsbn(info, isbn)) return null;
  const found = emptyFound('googlebooks');
  found.title = titleCase(tidy(info.title));
  found.subtitle = titleCase(tidy(info.subtitle));
  found.authors = (info.authors || []).map(tidy);
  found.publisher = tidy(info.publisher);
  found.year = yearOf(info.publishedDate);
  found.pages = info.pageCount ? String(info.pageCount) : '';
  found.isbn = isbn;
  found.otherIsbns = otherIsbnsListed(googleIsbns(info), isbn);
  const size = info.dimensions || {};
  const number = text => String(text || '').replace(/\s*cm$/, '');
  Object.assign(found, sizesFromDimensions(number(size.height), number(size.width), number(size.thickness), 'cm'));
  const links = info.imageLinks || {};
  const picture = links.extraLarge || links.large || links.medium || links.small || links.thumbnail;
  if (picture) found.cover = { url: picture.replace(/^http:/, 'https:').replace('&edge=curl', ''), source: 'googlebooks', waiting: true };
  return found;
}

// A bookseller's subtitle naming the series and number: "Loeb Classical #012 (Works)".
const SELLER_SERIES = /^(.+?)\s*#\s*0*(\d+)\s*(?:\([^)]*\))?$/;
// Booksellers' short names for series, written out.
const SERIES_NAMES = { 'loeb classical': 'Loeb Classical Library' };

/**
 * The series and number a bookseller wrote as the subtitle.
 * @param {string} subtitle
 * @returns {{ series: string, seriesNumber: string }|null} null for a real subtitle
 */
export function seriesFromSubtitle(subtitle) {
  const match = tidy(subtitle).match(SELLER_SERIES);
  if (!match) return null;
  const name = tidy(match[1]);
  return { series: SERIES_NAMES[name.toLowerCase()] || name, seriesNumber: match[2] };
}

// The first ISBNs (then Standard Book Numbers) were printed in 1966 and 1967,
// so a book with one was printed later: an earlier year is an older printing's.
const FIRST_ISBN_YEAR = 1966;

/** Whether a source gave a year too early for the book with an ISBN in hand (Euripides IV: 1920 for a 1980 copy). */
export function isYearTooEarly(found) {
  return Boolean(found.isbn && found.year && Number(found.year) < FIRST_ISBN_YEAR);
}

// A title filed under its first real word: "Apostolic Fathers, The," is "The Apostolic Fathers".
const INVERTED_ARTICLE = /^(.+?),\s*(the|an|a)\s*[,.;:]?$/i;

/**
 * A title as printed, from a record's: an article filed at the end comes
 * first again, and a title that only names the book's author ("Calvin", with
 * the subtitle "Institutes of the Christian Religion", as the Library of
 * Christian Classics prints it) gives way to its subtitle, the work's title.
 * @param {{ title: string, subtitle: string, authors: string[] }} found
 * @returns {{ title: string, subtitle: string }}
 */
export function printedTitle({ title, subtitle, authors }) {
  const inverted = tidy(title).match(INVERTED_ARTICLE);
  const named = inverted ? `${titleCase(inverted[2].toLowerCase())} ${inverted[1]}` : tidy(title);
  const isAuthorOnly = tidy(subtitle) && authors.some(author => samePerson(named, author) && nameWordCount(named) <= nameWordCount(author));
  return isAuthorOnly ? { title: titleCase(tidy(subtitle)), subtitle: '' } : { title: named, subtitle };
}

const nameWordCount = name => normalizeForSearch(name).split(' ').filter(Boolean).length;

// A series number listing three or more numbers is the whole set's ("142, 144, 461, 476"
// for Loeb's Greek Lyric), not this book's; two may be one book's ("20-21", "v. 7, 8").
const isSetNumbers = number => String(number || '').split(/[,;]/).filter(part => tidy(part)).length >= 3;

// A facing-page series by its own name: "Loeb classical library. Greek authors"
// and "The Loeb classical library" are the Loeb Classical Library, which
// numbers its Greek and Latin volumes in one sequence.
function seriesByName(series) {
  const stem = seriesStem(series);
  return (stem && FACING_PAGE_SERIES.find(known => seriesStem(known) === stem)) || series;
}

// One source's answer with what records get wrong set right before merging:
// a series written as the subtitle, an older printing's year, a title as
// filed rather than printed, a set's series numbers, and a known series' name.
function corrected(found) {
  const fixed = { ...found, ...printedTitle(found) };
  const series = seriesFromSubtitle(fixed.subtitle);
  if (series) {
    fixed.subtitle = '';
    if (!fixed.series) fixed.series = series.series;
    if (!fixed.seriesNumber) fixed.seriesNumber = series.seriesNumber;
  }
  if (isYearTooEarly(found)) fixed.year = '';
  if (isSetNumbers(fixed.seriesNumber)) fixed.seriesNumber = '';
  if (fixed.series) fixed.series = seriesByName(fixed.series);
  return fixed;
}

// A page count alone ("311"), as opposed to pages as printed ("xxviii, 311").
const isBareCount = pages => /^\d+$/.test(pages);

/**
 * One book's fields from every source that answered, best first: the
 * Library of Congress, then HathiTrust, then Open Library, then Google Books. Each field
 * comes from the first source that has it, which gives the order of
 * PLAN.md for bibliographic facts, and for height, thickness and covers
 * "whichever has them". Pages as printed beat a bare page count from any
 * source. A series written as the subtitle is read as the series, and a year
 * too early for a book with an ISBN is not used. Original dates are never produced.
 * @param {(import('./lookup.js').Found|null)[]} answers in order of preference
 * @returns {import('./lookup.js').Found|null}
 */
export function mergeFound(answers) {
  const present = answers.filter(Boolean).map(corrected);
  if (!present.length) return null;
  const merged = present.reduce(combineFound);
  const printed = present.map(found => found.pages).find(pages => pages && !isBareCount(pages));
  const result = printed ? { ...merged, pages: printed } : { ...merged }; // a copy: answers are never changed
  // Every source's other ISBNs together, each once, since each record lists its own few.
  result.otherIsbns = otherIsbnsListed(present.flatMap(found => found.otherIsbns || []), result.isbn);
  // Only a set's record knew the book: it is called by the set and its volume.
  if (!result.title && result.set) result.title = `${result.set}, vol. ${result.volume}`;
  return result;
}

/**
 * The merged answer, with the works inside taken from a library record
 * (the Library of Congress or HathiTrust) when one lists several: their
 * contents notes name works, where Open Library's table of contents often
 * names chapters. Used on the phone, where Open Library comes first because
 * a library record found by ISBN may describe an older printing.
 * @param {import('./lookup.js').Found|null} merged
 * @param {(import('./lookup.js').Found|null)[]} answers every source's own answer
 * @returns {import('./lookup.js').Found|null} a new object; nothing given is changed
 */
export function withLibraryContents(merged, answers) {
  const library = answers.find(found => found && ['libraryofcongress', 'hathitrust'].includes(found.source) && found.contents.length > 1);
  return merged && library ? { ...merged, contents: library.contents } : merged;
}

/**
 * The book's authors with the others a library record names: when the
 * Library of Congress or HathiTrust names every author found and more, the
 * others are added after them (Open Library names only Marx for The
 * Marx-Engels Reader; HathiTrust names Marx and Engels). Used on the phone
 * after tidyPeople, which would otherwise move the added author aside as an
 * edition's extra; someone it put among the contributors is not added.
 * @param {import('./lookup.js').Found|null} found as merged and tidied
 * @param {(import('./lookup.js').Found|null)[]} answers every source's own answer
 * @returns {import('./lookup.js').Found|null} a new object; nothing given is changed
 */
export function withLibraryAuthors(found, answers) {
  if (!found || !found.authors.length) return found;
  const has = (names, name) => names.some(other => samePerson(other, name));
  const library = answers.find(answer => answer && ['libraryofcongress', 'hathitrust'].includes(answer.source)
    && answer.authors.length > found.authors.length && found.authors.every(name => has(answer.authors, name)));
  if (!library) return found;
  const others = library.authors.filter(name => !has(found.authors, name) && !has(found.contributors.map(person => person.name), name));
  return others.length ? { ...found, authors: [...found.authors, ...others] } : found;
}

// Booksellers' subject headings ("Fiction / Classics") start with a broad
// group, which is what a category is; an old heading names one in two words.
const BOOKSELLER_GROUPS = { 'plays / drama': 'Drama' };

/**
 * The categories a record's subjects suggest, offered while adding. Only
 * booksellers' headings give one; a library heading ("Christian saints --
 * Biography") is a topic, not a broad group.
 * @param {string[]} subjects
 * @returns {string[]}
 */
export function categoriesFromSubjects(subjects) {
  const groups = subjects.filter(subject => subject.includes(' / '))
    .map(subject => BOOKSELLER_GROUPS[subject.toLowerCase()] || subject.split(' / ')[0]);
  return [...new Set(groups.map(group => titleCase(tidy(group).toLowerCase())))];
}

// Series that print the original text and an English translation on facing pages.
export const FACING_PAGE_SERIES = [
  'Loeb Classical Library', 'I Tatti Renaissance Library', 'Dumbarton Oaks Medieval Library',
  'Murty Classical Library of India', 'Clay Sanskrit Library',
];

// "The Loeb classical library [Latin authors]" is the Loeb Classical Library.
const seriesStem = name => normalizeForSearch(name).replace(/^the /, '').replace(/ library.*$/, '');

/** Whether a series prints the original and English on facing pages. */
export function isFacingPageSeries(series) {
  const stem = seriesStem(series);
  return Boolean(stem) && FACING_PAGE_SERIES.some(known => stem.startsWith(seriesStem(known)));
}

const isEnglishName = language => /^english$/i.test(tidy(language));

/**
 * What "This book is in" starts with while adding: the original and English
 * for a facing-page series, else the languages a record gave, else English.
 * @param {{ found: string[], series: string, original: string }} book
 * @returns {string} as typed in the box: "Ancient Greek, English"
 */
export function startingBookLanguages({ found, series, original }) {
  if (tidy(original) && !isEnglishName(original) && isFacingPageSeries(series)) return `${tidy(original)}, English`;
  return found.join(', ') || 'English';
}

/**
 * The one-tap answers to "This book is in" for a work first written in
 * another language: English, the original with English on facing pages, or
 * the original only.
 * @param {string} original the work's original language
 * @returns {{ text: string, label: string }[]} none for a work written in English
 */
export function bookLanguageChoices(original) {
  const name = tidy(original);
  if (!name || isEnglishName(name)) return [];
  return [
    { text: 'English', label: 'English' },
    { text: `${name}, English`, label: `${name}, English (facing pages)` },
    { text: name, label: `${name} only` },
  ];
}

// Roman numerals up to 39, enough for any author's volumes in Loeb (Cicero has 29).
const ROMAN = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
function roman(number) {
  let left = number;
  let text = '';
  for (const [value, letters] of ROMAN) {
    while (left >= value) { text += letters; left -= value; }
  }
  return text;
}

/**
 * A Loeb volume's title in Loeb's own style: the author, the author's volume
 * in Roman numerals, and the works, "Euripides IV: Ion. Hippolytus. Medea.
 * Alcestis". Only offered, since some Loebs are titled by one work.
 * @param {import('./lookup.js').Found} found
 * @returns {string} '' when the book is not such a volume, or already has the title
 */
export function loebStyleTitle(found) {
  const volume = String(found.volume || '').trim();
  const number = /^\d+$/.test(volume) ? Number(volume) : 0;
  const label = number >= 1 && number < 40 ? roman(number) : /^[IVX]+$/.test(volume) ? volume : '';
  if (!seriesStem(found.series).startsWith('loeb classical') || !label || !found.authors.length || !found.contents.length) return '';
  const title = `${found.authors[0]} ${label}: ${found.contents.map(work => work.title).join('. ')}`;
  return title === found.title ? '' : title;
}

// Google's reasons for refusing a key (the "reason" in its error answer), in plain words.
const KEY_PROBLEMS = {
  API_KEY_INVALID: 'Google does not know this key. Check that it was copied whole: it starts with "AIza".',
  SERVICE_DISABLED: 'The Books API is not switched on for this key\'s project. Do step 1 again and click "Enable".',
  API_KEY_SERVICE_BLOCKED: 'The key is limited to other services. In step 3, tick "Books API" under the key\'s API restrictions.',
  API_KEY_HTTP_REFERRER_BLOCKED: 'The key only works on certain websites. In step 3, set "Application restrictions" to "None".',
  API_KEY_ANDROID_APP_BLOCKED: 'The key only works in certain Android apps. In step 3, set "Application restrictions" to "None".',
  API_KEY_IOS_APP_BLOCKED: 'The key only works in certain iPhone apps. In step 3, set "Application restrictions" to "None".',
  RATE_LIMIT_EXCEEDED: 'The key works, but has reached today\'s limit of lookups. It will work again tomorrow.',
};

/**
 * Whether a Google Books key works, from the answer to one lookup made with
 * it (Settings › Advanced, "Test the key"), and why not in plain words.
 * @param {number} status the answer's HTTP status
 * @param {object|null} answer the answer, parsed
 * @returns {{ works: boolean, message: string }}
 */
export function googleKeyVerdict(status, answer) {
  if (status === 200) return { works: true, message: 'The key works: Google Books answered a test lookup.' };
  const error = (answer && answer.error) || {};
  const reasons = [...(error.details || []), ...(error.errors || [])].map(item => item.reason);
  const known = reasons.find(reason => KEY_PROBLEMS[reason]);
  if (known) return { works: false, message: KEY_PROBLEMS[known] };
  if (status === 429) return { works: false, message: KEY_PROBLEMS.RATE_LIMIT_EXCEEDED };
  return { works: false, message: `Google Books refused the key (${status}${error.message ? `: ${error.message}` : ''}).` };
}
