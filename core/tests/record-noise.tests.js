// What lookup records get wrong in real anthologies, set right before a person
// sees them (docs/decisions/book-data.md, "Record noise in anthologies"). Each
// book's answers were recorded on 14 November 2026 and are read as adding reads
// them: Open Library first, then HathiTrust, merged, then tidyPeople.

import { fromHathiTrust } from '../marc.js';
import { fromOpenLibraryDetails, mergeFound, printedTitle, editionFromSeller } from '../book-data.js';
import { contributorsFrom, cleanPages, emptyFound, authorsFromWorkSearch } from '../lookup.js';
import { tidyPeople, possibleEditors } from '../people.js';
import { parseContentsLines } from '../contents.js';
import * as richardson from './answers/9780684829517.js';
import * as meyer from './answers/9780061626005.js';
import { equal, same } from './check.js';
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
function lookedUp(book) {
  const openLibrary = fromOpenLibraryDetails(json(book.openLibraryDetails), book.isbn, '');
  if (openLibrary && !openLibrary.authors.length) openLibrary.authors = authorsFromWorkSearch(json(book.openLibraryWorkSearch));
  const found = mergeFound([openLibrary, book.hathiTrust && fromHathiTrust(book.hathiTrust, book.isbn)]);
  return tidyPeople({ ...emptyFound(''), ...found }, { search: json(book.openLibraryWorkSearch) });
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
    name: 'a series number listing the whole set\'s volumes is left empty: Loeb Greek Lyric\'s "142, 144, 461, 476"',
    fn() {
      const found = lookedUp(greekLyric);
      same([found.series, found.seriesNumber, found.pages], ['The Loeb classical library', '', '512'], 'pages: Open Library\'s count, not "5 v."');
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
];
