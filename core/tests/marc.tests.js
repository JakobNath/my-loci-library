// Reading library records (MARC 21): names entered under a forename, titles
// in languages other than English, volumes written out in full, and one ISBN
// catalogued under two titles. Each record is a few hand-written fields, in
// the shape the Library of Congress sends them.

import { fromLibraryOfCongress } from '../marc.js';
import { equal, same } from './check.js';

const ISBN = '9780000000002';

const field = (tag, ind1, ind2, subfields) => `<datafield tag="${tag}" ind1="${ind1}" ind2="${ind2}">${
  subfields.map(([code, text]) => `<subfield code="${code}">${text}</subfield>`).join('')}</datafield>`;

// A record listing the ISBN, with its fixed-length data (008) in a language, and more fields.
const record = (language, fields, isbnNote = '') => `<record><controlfield tag="008">${'0'.repeat(35)}${language} d</controlfield>${
  field('020', ' ', ' ', [['a', `${ISBN}${isbnNote}`]])}${fields.join('')}</record>`;

const answer = records => `<zs:searchRetrieveResponse>${records.join('')}</zs:searchRetrieveResponse>`;

const title = text => field('245', '1', '0', [['a', text]]);

const authorOf = subfields => fromLibraryOfCongress(answer([record('eng', [field('100', '0', ' ', subfields), title('A book.')])]), ISBN).authors[0];

export const tests = [
  {
    name: 'a person entered under a forename keeps a byname, but not a title (Thomas Aquinas, not Thomas)',
    fn() {
      equal(authorOf([['a', 'Thomas,'], ['c', 'Aquinas, Saint,'], ['d', '1225?-1274.']]), 'Thomas Aquinas');
      equal(authorOf([['a', 'Augustine,'], ['c', 'Saint, Bishop of Hippo.']]), 'Augustine', 'Saint and Bishop are titles');
      equal(authorOf([['a', 'John,'], ['c', 'of the Cross, Saint,'], ['d', '1542-1591.']]), 'John of the Cross');
      equal(authorOf([['a', 'Gregory'], ['b', 'I,'], ['c', 'Pope,'], ['d', 'approximately 540-604.']]), 'Gregory I', 'the numbering stays');
      equal(authorOf([['a', 'Bede,'], ['c', 'the Venerable, Saint,']]), 'Bede');
      const lewis = fromLibraryOfCongress(answer([record('eng', [field('100', '1', ' ', [['a', 'Lewis, C. S.'], ['q', '(Clive Staples),']]), title('Mere Christianity.')])]), ISBN);
      equal(lewis.authors[0], 'C. S. Lewis', 'a surname first is turned round as before');
    },
  },
  {
    name: 'a German title keeps the cataloguer\'s capitals; an English one is put in title case',
    fn() {
      const fields = [title('Der Brief an die Römer /'), field('505', '0', ' ', [['a', 'Die Gerechtigkeit Gottes -- Der Glaube und das Gesetz.']])];
      const german = fromLibraryOfCongress(answer([record('ger', fields)]), ISBN);
      equal(german.title, 'Der Brief an die Römer');
      same(german.contents.map(entry => entry.title), ['Die Gerechtigkeit Gottes', 'Der Glaube und das Gesetz']);
      equal(fromLibraryOfCongress(answer([record('eng', [title('The cost of discipleship /')])]), ISBN).title, 'The Cost of Discipleship');
      equal(fromLibraryOfCongress(answer([record('   ', [title('The cost of discipleship /')])]), ISBN).title, 'The Cost of Discipleship', 'no language given: English');
    },
  },
  {
    name: 'an ISBN noted "volume 2" is read as volume 2 of its set, and its contents as that volume\'s',
    fn() {
      const set = record('eng', [title('The Old Testament pseudepigrapha /'), field('300', ' ', ' ', [['a', '2 volumes ;']]),
        field('505', '0', ' ', [['a', 'Volume 1. Apocalyptic literature and testaments -- Volume 2. Expansions of the Old Testament.']])], ' (volume 2)');
      const found = fromLibraryOfCongress(answer([set]), ISBN);
      same([found.set, found.volume, found.subtitle], ['The Old Testament Pseudepigrapha', '2', 'Expansions of the Old Testament']);
    },
  },
  {
    name: 'of two titles catalogued for one ISBN, the one most records give is read, whichever comes first',
    fn() {
      // Loeb's Plato I, as HathiTrust's libraries catalogue it.
      const plato = record('eng', [title('Plato /')]);
      const dialogues = record('eng', [title('Euthyphro, Apology, Crito, Phaedo, Phaedrus /')]);
      equal(fromLibraryOfCongress(answer([plato, dialogues, dialogues]), ISBN).title, 'Euthyphro, Apology, Crito, Phaedo, Phaedrus');
      equal(fromLibraryOfCongress(answer([plato, dialogues]), ISBN).title, 'Plato', 'one each: the first');
      equal(fromLibraryOfCongress(answer([plato, dialogues, record('eng', [title('Republic /')])]), ISBN), null, 'three titles: different books');
    },
  },
];
