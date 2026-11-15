// What adding a book still lacks (docs/decisions/screens.md, "Adding fills the
// record while the book is in hand"): the must fields a step leaves empty, so
// its Next can ask for them or for "Don't know", and every field of the book
// in three groups for "Check before saving". Pure: the add screen
// (ui/add.js) passes in the book being added and what it worked out.
//
// The book being added is the add screen's own object. The parts read here:
//   found: the book's facts as looked up and corrected (title, subtitle,
//     authors, publisher, place, year, firstPrinted, editionStatement, isbn,
//     series, seriesNumber, set, volume, pages, height)
//   otherIsbnsText, editors, translator: as typed
//   cards: a collection's works, { title, author, language, originalTitle, date, dateUnknown }
//   language, originalTitle, dating, dateUnknown: a single work's answers
//   category, tags, binding, material, extras, location, copy, photos, cover, heightCm
//   unknown: the fields answered "Don't know" (a Set of the names used below)
//
// Fields are of three kinds. Must: asked until answered or "Don't know".
// Wanted (height) and pictures (cover, spine): shown as missing, never asked
// again. When the book has one (subtitle, editors, series, set, edition): an
// empty one shows "none". Nice (original title, category, tags, this copy):
// an empty one shows a dash.

import { parseDating } from './dating.js';

const filled = value => (Array.isArray(value) ? value.length > 0 : String(value ?? '').trim() !== '');

/** Whether a card of a collection has its language and its date (or "Don't know"). */
export function cardAnswered(card) {
  const dateGiven = filled(card.date) ? parseDating(card.date).ok : card.dateUnknown;
  return filled(card.language) && Boolean(dateGiven);
}

// The must fields of each step: [name, label, whether it is filled]. A field
// that applies only sometimes is left out when it does not apply.
function mustFields(book, step, { translated = false, bookLanguages = '', single = true } = {}) {
  const found = book.found;
  if (step === 'book') {
    // A collection's authors are asked on each work's card instead.
    return single && !book.contentsOffered && !book.severalChosen ? [['authors', 'Authors', filled(found.authors)]] : [];
  }
  if (step === 'edition') {
    return [
      ['publisher', 'Publisher', filled(found.publisher)], ['place', 'Place', filled(found.place)],
      ['year', 'Year of this printing', filled(found.year)], ['firstPrinted', 'First printed', filled(found.firstPrinted)],
      ['isbn', 'ISBN', filled(found.isbn)], ['pages', 'Pages', filled(found.pages)],
    ];
  }
  if (step === 'date') return [['dating', 'Original date', filled(book.dating) || book.dateUnknown]];
  if (step === 'language') return [['language', 'Original language', filled(book.language)]];
  if (step === 'translation' && translated) {
    return [['translator', 'Translator', filled(book.translator)], ['bookLanguages', 'This book is in', filled(bookLanguages)]];
  }
  if (step === 'binding') return [['binding', 'Binding', filled(book.binding) || filled(book.material) || filled(book.extras)]];
  if (step === 'works') return (book.cards || []).map((card, i) => [`work:${i}`, card.title, cardAnswered(card)]);
  return [];
}

/**
 * The must fields a step leaves empty and not answered "Don't know".
 * @param {object} book the book being added
 * @param {string} step the step's name in ui/add.js
 * @param {{ translated?: boolean, bookLanguages?: string, single?: boolean }} [about]
 *   translated: whether the book is a translation; bookLanguages: "This book is in" as shown;
 *   single: whether the book holds one work
 * @returns {{ name: string, label: string }[]}
 */
export function mustMissing(book, step, about = {}) {
  const unknown = book.unknown || new Set();
  return mustFields(book, step, about).filter(([name, , isFilled]) => !isFilled && !unknown.has(name)).map(([name, label]) => ({ name, label }));
}

const joined = (...parts) => parts.filter(filled).join(', ');

/**
 * Every field of the book for "Check before saving", in three groups. Each
 * row says its value and its state: "filled", "missing" (shown in amber),
 * "unknown" (answered "Don't know") or "none" (empty, and not needed).
 * step: the step that asks it, for a tap to go back to; '' when no step does.
 * @param {object} book the book being added
 * @param {{ translated?: boolean, bookLanguages?: string, single?: boolean, steps?: string[], linkedDating?: string }} [about]
 *   steps: the steps this book has; linkedDating: the date of a work already held that the book was joined to
 * @returns {{ title: string, rows: { label: string, value: string, state: string, step: string }[] }[]}
 */
export function checkRows(book, about = {}) {
  const { translated = false, bookLanguages = '', single = true, steps = [], linkedDating = '' } = about;
  const found = book.found;
  const unknown = book.unknown || new Set();
  const stepOf = (...names) => names.find(name => steps.includes(name)) || '';
  // wanted: amber when empty (a must field, the pictures, the height); none: "none" when empty.
  const row = (label, value, kind, name, step) => {
    const text = Array.isArray(value) ? value.join('; ') : String(value ?? '').trim();
    const state = text ? 'filled' : name && unknown.has(name) ? 'unknown' : kind === 'wanted' ? 'missing' : 'none';
    return { label, value: text, state, step };
  };
  const pictureOf = kind => (book.photos && book.photos[kind] ? 'your photo' : kind === 'cover' && book.cover && book.cover.state === 'found' ? 'found online' : '');
  const theBook = [
    row('Title', found.title, 'wanted', 'title', stepOf('book')),
    row('Subtitle', found.subtitle, 'none', '', stepOf('book')),
    single ? row('Authors', found.authors, 'wanted', 'authors', stepOf('book'))
      // A collection's authors are its works' ("Karl Marx and Friedrich Engels" on a card is two).
      : row('Authors', [...new Set((book.cards || []).flatMap(card => String(card.author || '').split(/\s+and\s+/)).map(name => name.trim()).filter(filled))], 'none', '', stepOf('works')),
    row('Editors', book.editors, 'none', '', stepOf('translation', 'book')),
    row('Translators', book.translator, translated ? 'wanted' : 'none', 'translator', stepOf('translation', 'book')),
    row('Publisher', found.publisher, 'wanted', 'publisher', stepOf('edition')),
    row('Place', found.place, 'wanted', 'place', stepOf('edition')),
    row('Year of this printing', found.year, 'wanted', 'year', stepOf('edition')),
    row('First printed', found.firstPrinted, 'wanted', 'firstPrinted', stepOf('edition')),
    row('Edition', found.editionStatement, 'none', '', stepOf('edition')),
    row('ISBN', found.isbn, 'wanted', 'isbn', stepOf('edition')),
    row('Other ISBNs', book.otherIsbnsText, 'none', '', stepOf('edition')),
    row('Series', joined(found.series, found.seriesNumber), 'none', '', stepOf('edition')),
    row('Set and volume', joined(found.set, found.volume && `volume ${found.volume}`), 'none', '', stepOf('edition')),
    row('Pages', found.pages, 'wanted', 'pages', stepOf('edition')),
    row('This book is in', bookLanguages, translated ? 'wanted' : 'none', 'bookLanguages', stepOf('translation')),
    row('Cover', pictureOf('cover'), 'wanted', '', stepOf('cover')),
    row('Spine', pictureOf('spine'), 'wanted', '', stepOf('spine')),
    row('Height', filled(book.heightCm) ? `${book.heightCm} cm` : found.height ? `${Math.round(found.height / 10)} cm (from a record)` : '', 'wanted', '', stepOf('spine')),
    row('Binding', joined(book.binding, book.material, ...(book.extras || [])), 'wanted', 'binding', stepOf('binding')),
  ];
  const subjects = [row('Category', book.category, 'none', '', stepOf('subjects')), row('Tags', book.tags, 'none', '', stepOf('subjects'))];
  const works = single ? [
    row('Original language', book.language, 'wanted', 'language', stepOf('language')),
    row('Original title', book.originalTitle, 'none', '', stepOf('language')),
    linkedDating ? row('Original date', `${linkedDating} (the work you already have)`, 'wanted', '', '')
      : row('Original date', book.dateUnknown && !filled(book.dating) ? '' : book.dating, 'wanted', 'dating', stepOf('date')),
    ...subjects,
  ] : [
    ...(book.cards || []).map(card => ({
      label: card.title,
      value: [card.author || 'no author', card.language, filled(card.date) ? card.date : card.dateUnknown ? "date: don't know" : '', card.originalTitle].filter(filled).join(' · '),
      state: cardAnswered(card) ? 'filled' : 'missing', step: stepOf('works'),
    })),
    ...subjects,
  ];
  const copy = book.copy || {};
  const thisCopy = [
    row('Place', (book.location || []).join(' › '), 'none', '', stepOf('where')),
    row('Acquired', copy.acquired, 'none', '', stepOf('copy')),
    row('Price paid', copy.price, 'none', '', stepOf('copy')),
    row('Estimated value', copy.value, 'none', '', stepOf('copy')),
    row('Writing or markings', copy.markings ? 'Yes' : '', 'none', '', stepOf('copy')),
    row('Notes', copy.notes, 'none', '', stepOf('copy')),
  ];
  return [{ title: 'The book', rows: theBook }, { title: single ? 'The work' : 'The works', rows: works }, { title: 'This copy', rows: thisCopy }];
}
