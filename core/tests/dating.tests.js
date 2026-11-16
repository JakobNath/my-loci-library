// The date parser: every row of the table in DATA_FORMAT.md, plus the extra
// forms named in PLAN.md, and the historical century convention.

import { parseDating, centurySpan, formatYear, formatYearRange, formatDating, sortYearOf, workingDating, formatWorkDate, opinionsOf, revisedDating, isRevised } from '../dating.js';
import { workDateQuestion, workLanguageQuestion, originalTitleQuestion, searchableTitle, webSearchUrl, searchTitle, contentsQuestion, firstEditionQuestion, workDetailsQuestion, collectionDateQuestion } from '../date-search.js';
import { equal, same, ok } from './check.js';

function reads(text, earliest, latest, certainty) {
  return {
    name: `"${text}" reads as ${earliest} to ${latest}, ${certainty}`,
    fn() {
      const result = parseDating(text);
      ok(result.ok, result.problem);
      same([result.dating.earliest, result.dating.latest, result.dating.certainty], [earliest, latest, certainty], text);
      equal(result.dating.text, text, 'the typed text is kept');
    },
  };
}

export const tests = [
  // The table in PLAN.md and DATA_FORMAT.md
  reads('1689', 1689, 1689, 'exact'),
  reads('c. 397', 397, 397, 'circa'),
  reads('397–400', 397, 400, 'range'),
  reads('1530–59', 1530, 1559, 'range'),
  reads('4th c. BC', -400, -301, 'century'),
  reads('early 2nd c.', 101, 133, 'century'),
  reads('after 1517', 1517, null, 'open'),
  // Extra forms
  reads('4th–5th c.', 301, 500, 'century'),
  reads('mid-3rd c.', 234, 266, 'century'),
  reads('late 5th c.', 467, 500, 'century'),
  reads('397/398', 397, 398, 'range'),
  reads('c. 1200 BC', -1200, -1200, 'circa'),
  reads('fl. 1150', 1150, 1150, 'circa'),
  reads('before 1517', null, 1517, 'open'),
  reads('1554–', 1554, null, 'open'),
  reads('c. 50–70', 50, 70, 'circa'),
  reads('1565-73', 1565, 1573, 'range'),
  reads('1849 to 1850', 1849, 1850, 'range'),
  reads('500–450 BC', -500, -450, 'range'),
  reads('399–95 BC', -399, -395, 'range'),
  reads('44–3 BC', -44, -43, 'range'),
  reads('late 4th–early 5th c.', 367, 433, 'century'),
  reads('5th century', 401, 500, 'century'),
  reads('AD 397', 397, 397, 'exact'),
  reads('c. 1418–27', 1418, 1427, 'circa'),
  {
    name: 'the 2nd century is 101 to 200, and there is no year 0',
    fn() {
      same(centurySpan(2, null, false), { earliest: 101, latest: 200 });
      same(centurySpan(1, null, true), { earliest: -100, latest: -1 });
      same(centurySpan(1, null, false), { earliest: 1, latest: 100 });
    },
  },
  {
    name: 'early, mid and late are thirds of a century',
    fn() {
      same(centurySpan(2, 'early', false), { earliest: 101, latest: 133 });
      same(centurySpan(2, 'mid', false), { earliest: 134, latest: 166 });
      same(centurySpan(2, 'late', false), { earliest: 167, latest: 200 });
    },
  },
  {
    name: 'nonsense and year 0 are refused with a helpful message',
    fn() {
      for (const text of ['', 'sometime', '0', '400–300']) {
        const result = parseDating(text);
        ok(!result.ok, `"${text}" should be refused`);
        ok(result.problem.includes('Forms that work'), 'the message suggests forms');
      }
    },
  },
  {
    name: 'years are written as AD/BC or CE/BCE',
    fn() {
      equal(formatYear(-400), '400 BC');
      equal(formatYear(-400, 'CE'), '400 BCE');
      equal(formatYear(397), '397');
      equal(formatYearRange(-400, -301), '400–301 BC');
      equal(formatYearRange(397, 400), '397–400');
      equal(formatYearRange(1517, null), 'after 1517');
      equal(formatYearRange(-50, 70), '50 BC – AD 70');
      equal(formatYearRange(-50, 70, 'CE'), '50 BCE – 70 CE');
    },
  },
  {
    name: 'a BC dating keeps its "c." when shown (Euripides, c. 413 BC)',
    fn() {
      equal(formatDating(parseDating('c. 413 BC').dating), 'c. 413 BC');
      equal(formatDating(parseDating('c. 413 BC').dating, 'CE'), 'c. 413 BCE');
      equal(formatDating(parseDating('431 BC').dating), '431 BC');
      equal(formatDating(parseDating('c. 397').dating), 'c. 397');
    },
  },
  {
    name: 'a disputed work sorts by its working dating (the Didache)',
    fn() {
      const didache = {
        sortYear: null,
        datings: [
          { text: 'c. 50–70', earliest: 50, latest: 70, certainty: 'circa', working: false },
          { text: 'c. 100–120', earliest: 100, latest: 120, certainty: 'circa', working: true },
        ],
      };
      equal(workingDating(didache).text, 'c. 100–120');
      equal(sortYearOf(didache), 100);
    },
  },
  {
    name: 'a sort year chosen by a person overrides the dating (Loci Theologici)',
    fn() {
      const loci = { sortYear: 1554, datings: [{ text: '1591', earliest: 1591, latest: 1591, certainty: 'exact', working: true }] };
      equal(sortYearOf(loci), 1554);
    },
  },
  {
    name: 'a work with no dating has no sort year',
    fn() {
      equal(sortYearOf({ sortYear: null, datings: [] }), null);
    },
  },
  {
    name: 'a span from BC into AD reads with an era on each side: "43 BC – 17", "27 BC – AD 9"',
    fn() {
      same(parseDating('43 BC – 17').dating, { text: '43 BC – 17', earliest: -43, latest: 17, certainty: 'range' });
      same([parseDating('27 BC – AD 9').dating.earliest, parseDating('27 BC – AD 9').dating.latest], [-27, 9]);
      same([parseDating('c. 4 BC - 65').dating.earliest, parseDating('c. 4 BC - 65').dating.certainty], [-4, 'circa']);
    },
  },
  // "Search the web" beside a date box (PLAN.md, "Original dates")
  {
    name: 'a work with an author is asked about by title and author, with the working-date rule, for one date',
    fn() { equal(workDateQuestion('Pride and Prejudice', ['Jane Austen']), `What is the original date of Pride and Prejudice by Jane Austen? Give one date: the year it was first published if that was in the author's lifetime, otherwise when it was written. For a letter give its date, for a speech or sermon when it was delivered, for a play its first performance. If the author later revised it, also give the year of the final edition.`); },
  },
  {
    name: 'a work with no author is asked about as "the" work',
    fn() {
      equal(workDateQuestion('Didache', []), `What is the original date of the Didache? Give one date: the year it was first published if that was in the author's lifetime, otherwise when it was written. For a letter give its date, for a speech or sermon when it was delivered, for a play its first performance. If the author later revised it, also give the year of the final edition.`);
      equal(workDateQuestion('The Epic of Gilgamesh', []), `What is the original date of The Epic of Gilgamesh? Give one date: the year it was first published if that was in the author's lifetime, otherwise when it was written. For a letter give its date, for a speech or sermon when it was delivered, for a play its first performance. If the author later revised it, also give the year of the final edition.`);
    },
  },
  {
    name: 'a contents search names the series and translator, so Plutarch\'s Loeb volume is not taken for Dryden\'s',
    fn() {
      const plutarch = { title: 'Plutarch\'s Lives', set: 'Plutarch\'s Lives', volume: '2', series: 'Loeb Classical Library', publisher: 'Harvard University Press; W. Heinemann', year: '1985' };
      equal(contentsQuestion(plutarch, { translators: ['Bernadotte Perrin'] }), 'Table of contents of Plutarch\'s Lives, volume 2 (Loeb Classical Library, translated by Bernadotte Perrin)');
      equal(contentsQuestion({ title: 'The Marx-Engels Reader', publisher: 'Norton', year: '1978' }, { editors: ['Robert C. Tucker'] }),
        'Table of contents of The Marx-Engels Reader (Norton, 1978, edited by Robert C. Tucker)', 'without a series: the publisher and year');
      equal(contentsQuestion({ title: 'Hellenistic Philosophy' }), 'Table of contents of Hellenistic Philosophy');
    },
  },
  {
    name: 'the first edition\'s year is asked about by title and editor, or title and author',
    fn() {
      equal(firstEditionQuestion({ title: 'The Marx-Engels Reader', authors: ['Karl Marx', 'Friedrich Engels'] }, { editors: ['Robert C. Tucker'] }),
        'What year was the first edition of The Marx-Engels Reader, edited by Robert C. Tucker, published?');
      equal(firstEditionQuestion({ title: 'Fear and Trembling', authors: ['Søren Kierkegaard'] }, { translators: ['Alastair Hannay'] }),
        'What year was the first edition of Fear and Trembling by Søren Kierkegaard, translated by Alastair Hannay, published?');
    },
  },
  {
    name: 'a work is also asked about its original language and its original title',
    fn() {
      equal(workLanguageQuestion('The Poverty of Philosophy', ['Karl Marx']), 'What language was The Poverty of Philosophy by Karl Marx first written in?');
      equal(originalTitleQuestion('On the Jewish Question', ['Karl Marx']), 'What is the original title of On the Jewish Question by Karl Marx?');
      equal(workLanguageQuestion('Didache', []), 'What language was the Didache first written in?');
    },
  },
  {
    name: 'an extract in a reader is searched for by the work it comes from',
    fn() {
      // The Marx-Engels Reader titles its extracts "Alienation and Social Classes (from The Holy Family)".
      equal(searchableTitle('Alienation and Social Classes (from the Holy Family)'), 'The Holy Family');
      equal(searchableTitle('Discovering Hegel (Marx to His Father)'), 'Discovering Hegel (Marx to His Father)', 'other brackets stay');
      ok(workDateQuestion('On Morality (from Anti-Dühring)', ['Friedrich Engels']).startsWith('What is the original date of Anti-Dühring by Friedrich Engels? Give one date'));
    },
  },
  {
    name: 'several authors are joined with "and"',
    fn() { ok(workDateQuestion('Good Omens', ['Terry Pratchett', 'Neil Gaiman']).startsWith('What is the original date of Good Omens by Terry Pratchett and Neil Gaiman?')); },
  },
  {
    name: 'a volume of a set is searched for by its own title, with the set and number',
    fn() {
      equal(searchTitle({ title: 'Selected Psalms I', set: "Luther's Works", volume: '12' }), "Selected Psalms I (Luther's Works, volume 12)");
      // Open Library's record for a later printing of the same volume.
      equal(searchTitle({ title: "Luther's Works", subtitle: 'Volume 12 - (Selected Psalms I)' }), "Selected Psalms I (Luther's Works, volume 12)");
      equal(searchTitle({ title: "Luther's Works", set: "Luther's Works", volume: '12' }), "Luther's Works, volume 12");
      equal(searchTitle({ title: 'Pride and Prejudice', subtitle: 'A Novel' }), 'Pride and Prejudice');
    },
  },
  {
    name: 'a kind of work narrows the date question to its own rule',
    fn() {
      equal(workDateQuestion('Oedipus the King', ['Sophocles'], 'play'),
        'When was the play Oedipus the King by Sophocles first performed? Give one date: its first performance, or when it was written if that is not known.');
      equal(workDateQuestion('Letter to Annenkov', ['Karl Marx'], 'letter'), 'What is the date of the letter Letter to Annenkov by Karl Marx? Give one date: the date on the letter.');
      equal(workDateQuestion('Speech at the Graveside of Karl Marx', ['Friedrich Engels'], 'speech'),
        'When was Speech at the Graveside of Karl Marx by Friedrich Engels delivered? Give one date: when it was delivered.');
      equal(workDateQuestion('Didache', [], 'ancient'), 'When was the Didache written? Give one date or range of years: when it was written, as scholars date it.');
      ok(workDateQuestion('The Raven', ['Edgar Allan Poe'], 'poem').startsWith('When was the poem The Raven by Edgar Allan Poe first published? Give one date'));
      ok(workDateQuestion('Pride and Prejudice', ['Jane Austen'], 'book').endsWith('also give the year of the final edition.'));
      equal(workDateQuestion('Pride and Prejudice', ['Jane Austen'], ''), workDateQuestion('Pride and Prejudice', ['Jane Austen']), 'no kind: the whole rule');
    },
  },
  {
    name: 'a card in a collection asks one question for its author, language, original title and date, without assuming the author',
    fn() {
      const reader = { title: 'The Marx-Engels Reader', authors: ['Karl Marx', 'Friedrich Engels'] };
      equal(workDetailsQuestion('The Condition of the Working Class in England', reader),
        `'The Condition of the Working Class in England', printed in The Marx-Engels Reader (works by Karl Marx and Friedrich Engels): who wrote it, in what language, under what original title, and what is its original date? Give one date: the year it was first published if that was in the author's lifetime, otherwise when it was written. For a letter give its date, for a speech or sermon when it was delivered, for a play its first performance. If the author later revised it, also give the year of the final edition.`);
      ok(workDetailsQuestion('Themistocles', { title: 'Lives II', set: "Plutarch's Lives", volume: '2', authors: ['Plutarch'] })
        .startsWith("'Themistocles', printed in Lives II (Plutarch's Lives, volume 2), by Plutarch: who wrote it"), 'no brackets after brackets');
      ok(workDetailsQuestion('Antigone', { title: 'Greek Tragedies', authors: [] }, 'play').endsWith('Give one date: its first performance, or when it was written if that is not known.'));
    },
  },
  {
    name: 'a whole collection is asked when its works were written',
    fn() {
      equal(collectionDateQuestion({ title: "Plutarch's Lives", authors: ['Plutarch'] }), "When did Plutarch write the works in Plutarch's Lives? Give one date or range of years.");
      equal(collectionDateQuestion({ title: 'The Apostolic Fathers', authors: [] }), 'When were the works in The Apostolic Fathers written? Give one date or range of years.');
    },
  },
  {
    name: 'two dates in one box are named as two, with the first edition asked for',
    fn() {
      const result = parseDating('1806-1812, 1857');
      ok(!result.ok);
      ok(result.problem.startsWith('Two dates: type only the first edition\'s here (Grimm\'s tales: 1812–15)'), result.problem);
      ok(parseDating('1536; 1559').problem.startsWith('Two dates'));
      ok(parseDating('sometime').problem.includes('Forms that work'), 'one unreadable date keeps the usual message');
    },
  },
  {
    name: 'the search address carries the question, encoded',
    fn() { equal(webSearchUrl("When was Fagles' Iliad & Odyssey?"), "https://www.google.com/search?q=When%20was%20Fagles'%20Iliad%20%26%20Odyssey%3F"); },
  },
  {
    name: 'a revised work shows its first date and its final edition, "1812–15; rev. 1857", and is no disputed work',
    fn() {
      const first = { ...parseDating('1812–15').dating, kind: null, note: '', working: true };
      const revised = { ...parseDating('1857').dating, kind: 'revised', note: '', working: false };
      const grimm = { datings: [first, revised], sortYear: null };
      equal(formatWorkDate(grimm), '1812–15; rev. 1857');
      equal(sortYearOf(grimm), 1812, 'it sorts by the first edition');
      same(opinionsOf(grimm), [first], 'one opinion, so not disputed');
      equal(revisedDating(grimm), revised);
      ok(isRevised(revised) && !isRevised(first));
      equal(workingDating({ datings: [revised, { ...first, working: false }] }).text, '1812–15', 'with none marked working, the first that is no revision');
      equal(formatWorkDate({ datings: [first] }), '1812–15');
      equal(formatWorkDate({ datings: [] }), '');
      ok(parseDating('1806-1812, 1857').problem.includes('Revised later?'), 'two dates point to the revision box');
    },
  },
];
