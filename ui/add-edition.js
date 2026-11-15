// The add screen's "Title page and copyright page" step: the facts printed in
// the book, checked while it is in hand (docs/decisions/screens.md, "Adding
// fills the record while the book is in hand"). Each box starts with what the
// lookups found; an empty one is marked. ui/add.js puts it after "Is this the
// book?" and saves what is read here.

import { escapeHtml } from '../core/html.js';
import { isbn13, otherIsbnsFromText, firstPrintedFromText, publisherRows, publishersFromRows } from '../core/entry.js';
import { typedNames } from '../core/contents.js';
import { firstEditionQuestion } from '../core/date-search.js';
import { attr, fieldHtml, navHtml } from './add-questions.js';
import { searchLinkHtml } from './date-help.js';

/**
 * The step's screen.
 * @param {object} book the book being added (ui/add.js); found holds the looked-up facts
 */
export function editionStepHtml(book) {
  const found = book.found;
  const rows = book.publisherRows || publisherRows(found.publisher, found.place);
  const rowsHtml = rows.map((row, i) => `<div class="field-row">${fieldHtml(i ? 'Another publisher' : 'Publisher', 'publisher', row.publisher, { missing: !i && !row.publisher })}`
    + `${fieldHtml('Place', 'place', row.place, { missing: !i && !row.place })}</div>`).join('');
  // A year a record gave but that is older than ISBNs was set aside (core/book-data.js): say so here, where it is typed.
  const earlyHtml = found.yearSetAside && !found.year
    ? `<p class="step-hint is-missing">${escapeHtml(`The record's year, ${found.yearSetAside}, is older than ISBNs, so it is an earlier printing's: type the year printed in this copy.`)}</p>` : '';
  // Another binding's or country's ISBN a record lists: offered, never added without a tap (core/lookup.js).
  const typed = new Set(otherIsbnsFromText(book.otherIsbnsText, null).isbns);
  const offeredHtml = (found.otherIsbns || []).filter(isbn => isbn !== found.isbn && !typed.has(isbn)).map(isbn =>
    `<p class="step-hint">${escapeHtml(`The record also lists ${isbn}. Add it only if it is printed in this book.`)} <button type="button" class="chip" data-action="add-isbn" data-value="${attr(isbn)}">Add</button></p>`).join('');
  const problemsHtml = (book.editionProblems || []).map(problem => `<p class="step-hint is-missing">${escapeHtml(problem)}</p>`).join('');
  return `<h2 class="step-title">Title page and copyright page</h2>
    <p class="step-hint">Check these against the title page and the page behind it. A box outlined in color is still empty: fill it in, or Next offers "Don't know or not printed".</p>
    <form class="form">${problemsHtml}${rowsHtml}
      <p><button type="button" class="link" data-action="add-publisher">Add another publisher</button></p>
      <div class="field-row">${fieldHtml('Year of this edition or printing', 'year', found.year, { missing: !found.year, type: 'number' })}`
    + `${fieldHtml('First edition\'s year', 'firstPrinted', found.firstPrinted, { missing: !found.firstPrinted, type: 'number', help: true, hint: 'The year this book first came out, in any edition.' })}</div>
      ${earlyHtml}<p><button type="button" class="chip" data-action="same-printing">First edition: same as this printing</button></p>
      <p class="search-line">${searchLinkHtml(firstEditionQuestion(found, { translators: typedNames(book.translator), editors: typedNames(book.editors) }), 'first-edition')}</p>
      ${fieldHtml('Edition statement', 'editionStatement', found.editionStatement, { help: true })}
      ${fieldHtml('ISBN', 'isbn', found.isbn, { missing: !found.isbn })}
      ${fieldHtml('Other ISBNs printed (separate with ;)', 'otherIsbns', book.otherIsbnsText, { help: true })}${offeredHtml}
      <div class="field-row">${fieldHtml('Series', 'series', found.series, { help: true })}${fieldHtml('Number in series', 'seriesNumber', found.seriesNumber)}</div>
      <div class="field-row">${fieldHtml('Set', 'set', found.set, { help: true })}${fieldHtml('Volume', 'volume', found.volume)}</div>
      ${fieldHtml('Pages, as printed', 'pages', found.pages, { missing: !found.pages, help: true })}
      ${navHtml()}</form>`;
}

/**
 * Read the step's boxes into the book being added. The publisher rows are
 * joined into the edition's publisher and place.
 * @param {HTMLElement} stepArea the step on screen
 */
export function readEditionStep(book, stepArea) {
  const value = name => ((stepArea.querySelector(`[name="${name}"]`) || {}).value || '').trim();
  const found = book.found;
  const publishers = [...stepArea.querySelectorAll('[name="publisher"]')].map(input => input.value);
  const places = [...stepArea.querySelectorAll('[name="place"]')].map(input => input.value);
  book.publisherRows = publishers.map((publisher, i) => ({ publisher: publisher.trim(), place: (places[i] || '').trim() }));
  Object.assign(found, publishersFromRows(book.publisherRows));
  for (const name of ['year', 'firstPrinted', 'editionStatement', 'isbn', 'series', 'seriesNumber', 'set', 'volume', 'pages']) found[name] = value(name);
  book.otherIsbnsText = value('otherIsbns');
}

/**
 * What must be put right before the step can be left: an ISBN or a year that
 * cannot be read. The same checks run again when the book is saved.
 * @returns {string[]}
 */
export function editionStepProblems(book) {
  const found = book.found;
  const problems = [];
  const isbn = found.isbn ? isbn13(found.isbn) : null;
  if (found.isbn && !isbn) problems.push(`"${found.isbn}" is not an ISBN (10 or 13 digits).`);
  problems.push(...otherIsbnsFromText(book.otherIsbnsText, isbn).problems);
  const firstPrinted = firstPrintedFromText(found.firstPrinted);
  if (firstPrinted.problem) problems.push(firstPrinted.problem);
  return problems;
}
