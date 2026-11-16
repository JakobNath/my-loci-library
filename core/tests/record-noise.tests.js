// What lookup records get wrong in real anthologies, set right before a person
// sees them (docs/decisions/book-data.md, "Record noise in anthologies"). Each
// book's answers were recorded on 14 November 2026 (the Marx-Engels Reader
// and Plutarch's Lives II on 15 November) and are read as adding reads them:
// Open Library first, then HathiTrust, merged, then tidyPeople.

import { fromHathiTrust } from '../marc.js';
import { fromOpenLibraryDetails, mergeFound, printedTitle, editionFromSeller, withLibraryAuthors } from '../book-data.js';
import * as reader from './answers/9780393090406.js';
import * as plutarch from './answers/9780674990531.js';
import { contributorsFrom, cleanPages, emptyFound, authorsFromWorkSearch, workFromOpenLibrary, suggestOriginalDates } from '../lookup.js';
import { tidyPeople, possibleEditors, authorName } from '../people.js';
import * as kittel from './answers/9780802822437.js';
import * as karamazov from './answers/9780374528379.js';
import * as montaigne from './answers/9781400040216.js';
import * as aeneid from './answers/9780143106296.js';
import { parseContentsLines } from '../contents.js';
import * as richardson from './answers/9780684829517.js';
import * as meyer from './answers/9780061626005.js';
import { equal, same, ok } from './check.js';
import * as holmes from './answers/9780801034688.js';
import * as calvin from './answers/9780664220280.js';
import * as greekLyric from './answers/9780674991576.js';
import * as hellenistic from './answers/9780872203785.js';
import * as bettenson from './answers/9780199568987.js';
import * as lull from './answers/9780800636807.js';
import * as pseudepigrapha from './answers/9780385096300.js';
import * as concord from './answers/9780800627409.js';

const json = text => (text === null ? null : JSON.parse(text));

// As lookUpIsbn in ui/add.js, without Google Books (none of these needed it); as there,
// an edition record naming no author takes the work search's (edges/lookup-openlibrary.js).
// Books recorded with Open Library's author record (from 16 November) give the work too.
function lookedUp(book, known = []) {
  const openLibrary = fromOpenLibraryDetails(json(book.openLibraryDetails), book.isbn, '');
  if (openLibrary && !openLibrary.authors.length) openLibrary.authors = authorsFromWorkSearch(json(book.openLibraryWorkSearch));
  const answers = [openLibrary, book.hathiTrust && fromHathiTrust(book.hathiTrust, book.isbn)];
  const found = mergeFound(answers);
  const work = book.openLibraryAuthor ? workFromOpenLibrary(json(book.openLibraryWorkSearch), json(book.openLibraryAuthor)) : null;
  return withLibraryAuthors(tidyPeople({ ...emptyFound(''), ...found }, { search: json(book.openLibraryWorkSearch), work, known }), answers);
}
const names = found => found.contributors.map(person => `${person.name} (${person.role})`);

export const tests = [
  {
    name: 'a title filed with its article at the end reads as printed: "Apostolic Fathers, The," is "The Apostolic Fathers"',
    fn() {
      const found = lookedUp(holmes);
      same([found.title, found.subtitle], ['The Apostolic Fathers', 'Greek Texts and English Translations']);
      equal(printedTitle({ title: 'Imitation of Christ, The', subtitle: '', authors: [] }).title, 'The Imitation of Christ');
      equal(printedTitle({ title: 'Grief Observed, A.', subtitle: '', authors: [] }).title, 'A Grief Observed');
      equal(printedTitle({ title: 'Faith, Hope and Charity', subtitle: '', authors: [] }).title, 'Faith, Hope and Charity', 'a comma alone changes nothing');
    },
  },
  {
    name: 'a title that only names the author gives way to its subtitle: Calvin\'s Institutes in the Library of Christian Classics',
    fn() {
      const found = lookedUp(calvin);
      same([found.title, found.subtitle, found.authors], ['Institutes of the Christian religion', '', ['Jean Calvin']]);
      same(printedTitle({ title: 'Luther', subtitle: 'Man between God and the Devil', authors: ['Heiko A. Oberman'] }),
        { title: 'Luther', subtitle: 'Man between God and the Devil' }, 'a book about Luther by someone else keeps its title');
      same(printedTitle({ title: 'Calvin', subtitle: '', authors: ['Jean Calvin'] }), { title: 'Calvin', subtitle: '' }, 'without a subtitle, nothing to take');
    },
  },
  {
    name: 'words saying who else helped are not translators: "in collaboration with the editor and a committee of advisers"',
    fn() {
      same(names(lookedUp(calvin)), ['John T. McNeill (editor)', 'Ford Lewis Battles (translator)']);
      same(contributorsFrom('translated by A D Melville'), [{ name: 'A D Melville', role: 'translator' }], 'an initial is not the article "a"');
      same(contributorsFrom('edited by Henri de Lubac'), [{ name: 'Henri de Lubac', role: 'editor' }]);
    },
  },
  {
    name: 'a reviser is not a translator, and a cataloguer\'s square brackets stay off the names (Bonhoeffer\'s Cost of Discipleship)',
    fn() {
      const fuller = [{ name: 'R.H. Fuller', role: 'translator' }];
      same(contributorsFrom('Dietrich Bonhoeffer ; [translated from the German by R.H. Fuller, with some revision by Irmgard Booth]'), fuller);
      same(contributorsFrom('[translated by R.H. Fuller]'), fuller);
      same(contributorsFrom('translated by R.H. Fuller and Irmgard Booth]'), [...fuller, { name: 'Irmgard Booth', role: 'translator' }]);
    },
  },
  {
    name: 'a series number listing the whole set\'s volumes is left empty: Loeb Greek Lyric\'s "142, 144, 461, 476"',
    fn() {
      const found = lookedUp(greekLyric);
      // Pages: a record whose pagination is "5 v." describes the set, so its count is not trusted for this
      // volume either (batch 6, 15 November 2026: Plutarch II's 608 was wrong); the box is left to be typed.
      same([found.series, found.seriesNumber, found.pages], ['Loeb Classical Library', '', '']);
      equal(mergeFound([{ ...emptyFound('openlibrary'), title: 'Institutes', seriesNumber: '20-21' }]).seriesNumber, '20-21', 'one book in two volumes keeps both numbers');
    },
  },
  {
    name: 'Ancient Greek in a record is Greek, as the add screen\'s chips say',
    fn() {
      equal(lookedUp(hellenistic).originalLanguage, 'Greek');
    },
  },
  {
    name: 'an editor misspelt in the statement of responsibility is not also the author: Bettenson\'s Documents',
    fn() {
      const found = lookedUp(bettenson);
      same(found.authors, []);
      same(names(found), ['Henry Scowcroft Bettenson (editor)', 'Chris Maunder (editor)'], 'the author list\'s spelling is kept');
      same(tidyPeople({ ...emptyFound(''), authors: ['John Smith'], contributors: [{ name: 'Jane Smith', role: 'editor' }] }).authors,
        ['John Smith'], 'another first name is another person');
      same(tidyPeople({ ...emptyFound(''), authors: ['Jon Smith'], contributors: [{ name: 'John Smith', role: 'editor' }] }).authors,
        [], 'one letter apart is the same person');
    },
  },
  {
    name: 'a church named as the author of an edited book is dropped: the Book of Concord',
    fn() {
      const found = lookedUp(concord);
      same(found.authors, []);
      same(names(found).slice(0, 2), ['Robert Kolb (editor)', 'Timothy J. Wengert (editor)']);
      same(tidyPeople({ ...emptyFound(''), authors: ['Catholic Church'] }).authors, ['Catholic Church'], 'with no editors, the body is the author');
    },
  },
  {
    name: 'a bookseller\'s edition statement reads as a person writes it: "2 Pap/Cdr edition" is "2nd ed."',
    fn() {
      equal(lookedUp(lull).editionStatement, '2nd ed.');
      equal(editionFromSeller('New Ed edition'), 'New ed.');
      equal(editionFromSeller('Pap/Cdr edition'), '');
      equal(editionFromSeller('3 edition'), '3rd ed.');
      equal(editionFromSeller('11 edition'), '11th ed.');
      equal(editionFromSeller('Reprint edition'), 'Reprint edition', 'other words stay');
      equal(editionFromSeller('[2nd ed.].'), '2nd ed.');
    },
  },
  {
    name: 'a volume of a set: "v." is no page count, and the volume\'s one title is its subtitle, not its contents',
    fn() {
      const found = lookedUp(pseudepigrapha);
      same([found.set, found.volume, found.subtitle, found.pages, found.contents.length],
        ['The Old Testament Pseudepigrapha', '1', 'Apocalyptic Literature and Testaments', '', 0]);
      equal(cleanPages('v.'), '');
      equal(cleanPages('v, 320 p.'), 'v, 320', 'v with more pages is page v');
    },
  },
  {
    name: 'an editor recorded as the author, with nothing to show it, is asked about: Holmes, Richardson and Meyer, not Euripides',
    fn() {
      same([holmes, richardson, meyer].map(book => lookedUp(book).authors), [['Michael W. Holmes'], ['Cyril Richardson'], ['Marvin Meyer']],
        'the records give no trace');
      const typed = parseContentsLines('First Clement\nThe Didache\nIgnatius — To the Ephesians');
      same(possibleEditors(['Michael W. Holmes'], typed), ['Michael W. Holmes']);
      same(possibleEditors(['Euripides'], parseContentsLines('Euripides — Ion\nEuripides — Medea')), [], 'the contents name his works');
      same(possibleEditors(['Karl Marx', 'Friedrich Engels'], parseContentsLines('Marx and Engels — The Communist Manifesto')), []);
    },
  },
  {
    name: 'a library record with no main author names the people whose works it holds: the Reader is by Marx and Engels, edited by Tucker',
    fn() {
      same(fromHathiTrust(reader.hathiTrust, reader.isbn).authors, ['Friedrich Engels', 'Karl Marx']);
      const found = lookedUp(reader);
      same(found.authors, ['Karl Marx', 'Friedrich Engels'], 'Open Library\'s Marx first, then the record\'s Engels');
      same(names(found), ['Robert C. Tucker (editor)']);
    },
  },
  {
    name: 'a Loeb volume keeps both publishers and places, takes its own number from the set\'s list, and no page count from "11v."',
    fn() {
      const found = lookedUp(plutarch);
      same([found.publisher, found.place], ['Harvard University Press; W. Heinemann', 'Cambridge, Mass; London']);
      same([found.series, found.seriesNumber, found.set, found.volume], ['Loeb Classical Library', '47', 'Plutarch\'s Lives', '2']);
      equal(found.pages, '', 'no record gives one Loeb volume\'s pages; 608 is not this volume\'s');
      same(['11v.', '2 v.', 'v. <1-3>', '11 volumes', 'v'].map(cleanPages), ['', '', '', '', '']);
      same(['xlii, 788', 'v, 311'].map(cleanPages), ['xlii, 788', 'v, 311'], 'pages starting at v are still pages');
    },
  },
  {
    name: 'a record of a whole set ("11v.") offers none of its ISBNs as this volume\'s other ISBNs',
    fn() {
      // Open Library's Plutarch's Lives record lists all eleven volumes' ISBNs; none but its own is printed in volume 2.
      same(lookedUp(plutarch).otherIsbns, []);
    },
  },
  {
    name: 'a bookseller\'s edition statement listed as a second publisher is left out, and so are invisible marks',
    fn() {
      const answer = { 'ISBN:9789390093021': { details: { title: 'The Complete Grimms\' Fairy Tales', isbn_13: ['9789390093021'],
        publishers: ['‎Fingerprint! Publishing', 'Reprint edition (Sept. 1 2020)'], publish_date: '2020' } } };
      equal(fromOpenLibraryDetails(answer, '9789390093021', '').publisher, 'Fingerprint! Publishing');
    },
  },
  {
    name: 'a library imprint gives every publisher with the place printed before it',
    fn() {
      const imprint = subfields => `<datafield tag="260" ind1=" " ind2=" ">${subfields.map(([code, text]) => `<subfield code="${code}">${text}</subfield>`).join('')}</datafield>`;
      const record = field => JSON.stringify({ records: { 1: { 'marc-xml': `<record><datafield tag="020" ind1=" " ind2=" "><subfield code="a">9780674990531</subfield></datafield><datafield tag="245" ind1="1" ind2="0"><subfield code="a">Lives</subfield></datafield>${field}</record>` } } });
      const both = fromHathiTrust(record(imprint([['a', 'Cambridge, Mass. :'], ['b', 'Harvard University Press ;'], ['a', 'London :'], ['b', 'W. Heinemann,'], ['c', '1982-']])), '9780674990531');
      same([both.publisher, both.place], ['Harvard University Press; W. Heinemann', 'Cambridge, Mass.; London']);
      const onePublisher = fromHathiTrust(record(imprint([['a', 'New York ;'], ['a', 'London :'], ['b', 'Norton,'], ['c', '1978']])), '9780674990531');
      same([onePublisher.publisher, onePublisher.place], ['Norton', 'New York'], 'two places for one publisher: the first');
    },
  },
  // The lookup problems left from 14 November, recorded on 16 November 2026.
  {
    name: 'roles named without "by" are read: Bromiley translated and edited Kittel\'s dictionary, and is not its author',
    fn() {
      const found = lookedUp(kittel);
      same(found.authors, []);
      same(names(found), ['Gerhard Kittel (editor)', 'Geoffrey W. Bromiley (translator)', 'Geoffrey W. Bromiley (editor)']);
      same(contributorsFrom('translator and editor Geoffrey W. Bromiley. Vol.1, A-G.'),
        [{ name: 'Geoffrey W. Bromiley', role: 'translator' }, { name: 'Geoffrey W. Bromiley', role: 'editor' }], 'the volume label is not a name');
      same(contributorsFrom('Michel de Montaigne'), [], 'a name with no role names no contributor');
    },
  },
  {
    name: 'an author filed surname first is turned round: "Montaigne, Michel de" is Michel de Montaigne',
    fn() {
      same(lookedUp(montaigne).authors, ['Michel de Montaigne']);
      equal(authorName('Vergilius Maro, Publius'), 'Publius Vergilius Maro');
      equal(authorName('Martin Luther King, Jr.'), 'Martin Luther King, Jr.', 'a suffix after the comma');
      equal(authorName('Montaigne, Michel de, 1533-1592'), 'Montaigne, Michel de, 1533-1592', 'a heading with dates');
      equal(authorName('Lutheran Church, Missouri Synod'), 'Lutheran Church, Missouri Synod', 'a body');
    },
  },
  {
    name: 'the work\'s author is named as the book\'s, so Montaigne\'s lifetime is still offered as his',
    fn() {
      const found = lookedUp(montaigne);
      const work = workFromOpenLibrary(json(montaigne.openLibraryWorkSearch), json(montaigne.openLibraryAuthor));
      const named = { ...work, author: { ...work.author, name: authorName(work.author.name, { work }) } };
      const lifetime = suggestOriginalDates(named, 2003, { authors: found.authors }).find(suggestion => suggestion.lifetimeOf);
      same([lifetime.text, lifetime.lifetimeOf], ['1533–1592', 'Michel de Montaigne']);
    },
  },
  {
    name: 'an author the library already holds under another of his names keeps the library\'s name: Dostoevsky, Virgil',
    fn() {
      equal(lookedUp(karamazov).authors[0], 'Fiódor Dostoievski', 'Open Library\'s name when the library has none of his');
      same(lookedUp(karamazov, ['Fyodor Dostoevsky']).authors, ['Fyodor Dostoevsky']);
      same(lookedUp(aeneid, ['Virgil']).authors, ['Virgil']);
      same(lookedUp(montaigne, ['Fyodor Dostoevsky']).authors, ['Michel de Montaigne'], 'someone else\'s name is never taken');
    },
  },
  {
    name: 'a title Open Library misspells is taken from the library record: "Aenid" is The Aeneid',
    fn() {
      equal(lookedUp(aeneid).title, 'The Aeneid');
      equal(lookedUp(montaigne).title, 'The Complete Works', 'a title differing only in capitals keeps Open Library\'s');
    },
  },
  {
    name: 'Open Library\'s author record gives the author\'s Wikidata ID and other names',
    fn() {
      const work = workFromOpenLibrary(json(karamazov.openLibraryWorkSearch), json(karamazov.openLibraryAuthor));
      equal(work.author.wikidata, 'Q991');
      ok(work.author.otherNames.includes('Dostoevsky'), 'his other names');
      equal(workFromOpenLibrary(json(kittel.openLibraryWorkSearch), json(kittel.openLibraryAuthor)).author.wikidata, '', 'none given');
    },
  },
];
