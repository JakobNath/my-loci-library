// What adding a book still lacks (core/add-check.js): the must fields a step
// leaves empty, and the rows of "Check before saving". The books are real ones
// from the testing day (14 November 2026).

import { mustMissing, checkRows, cardAnswered } from '../add-check.js';
import { equal, same, ok } from './check.js';

// The book being added, as the add screen keeps it, with nothing answered yet.
const adding = (found, more = {}) => ({
  found: { title: '', subtitle: '', authors: [], publisher: '', place: '', year: '', firstPrinted: '', editionStatement: '', isbn: '', series: '', seriesNumber: '', set: '', volume: '', pages: '', height: null, ...found },
  otherIsbnsText: '', editors: '', translator: '', cards: null, language: '', originalTitle: '', dating: '', dateUnknown: false,
  category: '', tags: [], binding: null, material: null, extras: [], location: [], copy: { acquired: '', price: '', value: '', markings: false, notes: '' },
  photos: {}, cover: { state: 'none' }, heightCm: '', unknown: new Set(), contentsOffered: false, severalChosen: false, ...more,
});

// Kierkegaard, Fear and Trembling (Penguin Classics, 1985): Open Library gives no place and no first printing.
const fear = () => adding({ title: 'Fear and Trembling', subtitle: 'Dialectical Lyric', authors: ['Søren Kierkegaard'], publisher: 'Penguin', year: '1985', isbn: '9780140444490', pages: '158' });

// The Marx-Engels Reader, 2d ed. (Norton, 1978), with three of its works.
const reader = () => adding({ title: 'The Marx-Engels Reader', authors: ['Karl Marx'], publisher: 'Norton', place: 'New York', year: '1978', firstPrinted: '1972', isbn: '9780393090406', pages: 'xlii, 788' }, {
  editors: 'Robert C. Tucker', severalChosen: true,
  cards: [
    { title: 'On the Jewish Question', author: 'Karl Marx', language: 'German', originalTitle: 'Zur Judenfrage', date: '1843', dateUnknown: false },
    { title: 'Manifesto of the Communist Party', author: 'Karl Marx and Friedrich Engels', language: 'German', originalTitle: '', date: '', dateUnknown: false },
    { title: 'The Civil War in France', author: 'Karl Marx', language: '', originalTitle: '', date: '', dateUnknown: true },
  ],
});

export const tests = [
  {
    name: 'the copyright page step asks for an empty place and first printing, until they are answered or "Don\'t know"',
    fn() {
      const book = fear();
      same(mustMissing(book, 'edition').map(field => field.name), ['place', 'firstPrinted']);
      book.unknown.add('place');
      book.unknown.add('firstPrinted');
      same(mustMissing(book, 'edition'), [], '"Don\'t know" answers them');
    },
  },
  {
    name: 'a single work needs its date, or "Don\'t know"; a translation needs its translator',
    fn() {
      const book = fear();
      equal(mustMissing(book, 'date').length, 1);
      book.dateUnknown = true;
      equal(mustMissing(book, 'date').length, 0);
      equal(mustMissing(book, 'translation', { translated: true, bookLanguages: 'English' })[0].label, 'Translator');
      equal(mustMissing(book, 'translation', { translated: false }).length, 0, 'not asked of a book in its own language');
    },
  },
  {
    name: 'a collection\'s authors are asked on each work\'s card, not on "Is this the book?"',
    fn() {
      const book = reader();
      book.found.authors = [];
      equal(mustMissing(book, 'book', { single: false }).length, 0);
      equal(mustMissing(fear(), 'book').length, 0, 'a book with its author');
      equal(mustMissing({ ...fear(), found: { ...fear().found, authors: [] } }, 'book')[0].name, 'authors');
    },
  },
  {
    name: 'a work\'s card is answered once it has a language and a date that reads, or "Don\'t know"',
    fn() {
      const [jewish, manifesto, civilWar] = reader().cards;
      same([cardAnswered(jewish), cardAnswered(manifesto), cardAnswered(civilWar)], [true, false, false]);
      ok(cardAnswered({ ...civilWar, language: 'English' }), 'written in English, date not known');
      ok(!cardAnswered({ ...jewish, date: 'soon' }), 'a date that cannot be read');
      same(mustMissing(reader(), 'works').map(field => field.label), ['Manifesto of the Communist Party', 'The Civil War in France']);
      const rest = reader();
      rest.cards[2].unknown = true; // "Don't know the rest"
      equal(mustMissing(rest, 'works').length, 1, 'only the Manifesto is still asked');
      equal(checkRows(rest, { single: false })[1].rows[2].state, 'unknown');
    },
  },
  {
    name: '"Check before saving" lists every field in three groups, marking what is missing, not known, or not needed',
    fn() {
      const book = fear();
      book.unknown.add('place');
      const groups = checkRows(book, { steps: ['book', 'edition', 'date', 'language', 'cover', 'spine', 'binding', 'where', 'copy'] });
      same(groups.map(group => group.title), ['The book', 'The work', 'This copy']);
      const state = label => groups.flatMap(group => group.rows).find(item => item.label === label);
      same(['Place', 'First edition\'s year', 'Series', 'Cover', 'Height'].map(label => state(label).state), ['unknown', 'missing', 'none', 'missing', 'missing']);
      equal(state('Publisher').step, 'edition', 'a tap goes back to the copyright page step');
      equal(state('Translators').state, 'none', 'not a translation');
    },
  },
  {
    name: 'a collection\'s check lists each work with its author, language and date, and its authors from the works',
    fn() {
      const groups = checkRows(reader(), { single: false, translated: true, bookLanguages: 'English', steps: ['works'] });
      const works = groups[1].rows;
      same(works.slice(0, 3).map(item => item.state), ['filled', 'missing', 'missing']);
      equal(works[0].value, 'Karl Marx · German · 1843 · Zur Judenfrage');
      equal(groups[0].rows.find(item => item.label === 'Authors').value, 'Karl Marx; Friedrich Engels');
      equal(groups[0].rows.find(item => item.label === 'Translators').state, 'missing', 'a translation with no translator named');
    },
  },
  {
    name: 'a card made with the book\'s several authors to choose from is answered once an author is chosen, or "Anonymous"',
    fn() {
      const card = { title: 'The German Ideology', author: '', authorAsked: true, language: 'German', date: '1846', dateUnknown: false };
      ok(!cardAnswered(card), 'no author chosen yet');
      ok(cardAnswered({ ...card, author: 'Karl Marx and Friedrich Engels' }));
      ok(cardAnswered({ ...card, authorAsked: false }), '"Anonymous" leaves the author empty');
    },
  },
  {
    name: 'a card\'s authors typed with ";" are two names, each listed once on the check',
    fn() {
      const book = reader();
      book.cards[1].author = 'Karl Marx; Friedrich Engels';
      const groups = checkRows(book, { single: false, steps: ['works'] });
      equal(groups[0].rows.find(item => item.label === 'Authors').value, 'Karl Marx; Friedrich Engels');
    },
  },
];
