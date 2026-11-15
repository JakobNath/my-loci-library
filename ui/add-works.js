// The add screen's "Each work" step, for a book holding several works (an
// anthology, a reader, collected works): one card per work, asked while the
// book is in hand (docs/decisions/screens.md, "Adding fills the record while
// the book is in hand"). Each card has the work's title and author, the
// language it was first written in, its original title and its original
// date, with a "Search the web" link beside each of the last three. A card is
// ticked once its language and date are answered (core/add-check.js).
//
// The cards are made from the contents step's lines and turned back into
// lines for saving, so core/entry.js reads them as it reads any contents.
// ui/add.js puts the step after the language step and saves the book.

import { escapeHtml } from '../core/html.js';
import { normalizeForSearch } from '../core/search.js';
import { parseContentsLines, typedNames } from '../core/contents.js';
import { parseDating, formatYearRange } from '../core/dating.js';
import { workDateQuestion, workLanguageQuestion, originalTitleQuestion } from '../core/date-search.js';
import { cardAnswered } from '../core/add-check.js';
import { dateRuleHtml, searchLinkHtml } from './date-help.js';
import { attr, navHtml, isEnglish, LANGUAGES } from './add-questions.js';

/**
 * The cards for the contents lines. A work already given a card keeps its
 * answers (matched by title), so going back to correct the list loses nothing.
 * @param {string} text the contents, one work per line
 * @param {object[]|null} previous the cards so far
 * @param {{ authors: string[], listed: (title: string) => ({ originalLanguage?: string, originalTitle?: string }|null) }} defaults
 *   authors: the book's, for a line naming none: one is filled in; of two or more (Marx and Engels) none is,
 *   and the card offers each as a chip (authorAsked), since they seldom wrote every work together;
 *   listed: a known set's details for a title
 */
export function cardsFromLines(text, previous, { authors = [], listed = () => null } = {}) {
  const author = authors.length === 1 ? authors[0] : '';
  // By title and author: Sappho's and Alcaeus's "Fragments" are two cards. The names are compared one
  // by one, so "Marx; Engels" corrected to "Marx and Engels" is still the same card.
  const keyOf = (title, name) => `${normalizeForSearch(title)}|${typedNames(name).map(normalizeForSearch).join(';')}`;
  const kept = new Map((previous || []).map(card => [keyOf(card.title, card.author), card]));
  return parseContentsLines(text).map(line => {
    const old = kept.get(keyOf(line.title, line.author || author)) || kept.get(keyOf(line.title, ''));
    if (old) return { ...old, title: line.title, author: line.author || old.author, date: line.date || '', translator: line.translator || '' };
    const list = listed(line.title) || {};
    return {
      title: line.title, author: line.author || author, authorAsked: !line.author && authors.length > 1,
      language: list.originalLanguage || '', languageChosen: Boolean(list.originalLanguage),
      originalTitle: list.originalTitle || null, // null: not given yet, so Wikidata's is shown
      date: line.date || '', dateUnknown: false, translator: line.translator || '',
    };
  });
}

/** The cards as contents lines, as core/contents.js reads them: "Author — Title — date — trans. Name". */
export function contentsFromCards(cards) {
  return cards.map(card => [card.author, card.title, card.date, card.translator ? `trans. ${card.translator}` : '']
    .map(part => String(part || '').trim()).filter(Boolean).join(' — ')).join('\n');
}

/** What each card says beyond its line, for core/entry.js (form.workDetails). */
export function workDetailsFromCards(cards) {
  return cards.map(card => ({ title: card.title, author: card.author || '', originalLanguage: card.language || '', originalTitle: card.originalTitle || '' }));
}

/**
 * The authors a card offers with one tap: for a book of two or more authors,
 * each of them and "Both" (or "All"), and "Anonymous"; and the authors
 * Wikidata gives for the work ("Friedrich Engels (Wikidata)"), never filled
 * in without a tap. None when the card already has the only author offered.
 */
function authorChoices(card, bookAuthors, known) {
  const choices = [];
  if (bookAuthors.length > 1) {
    choices.push(...bookAuthors.map(name => ({ text: name, label: name })));
    choices.push({ text: bookAuthors.join(' and '), label: bookAuthors.length === 2 ? 'Both' : 'All' });
  }
  const fromWikidata = known && known.authors ? known.authors.join(' and ') : '';
  if (fromWikidata && !choices.some(item => item.text === fromWikidata)) choices.push({ text: fromWikidata, label: `${fromWikidata} (Wikidata)` });
  else if (fromWikidata) choices.find(item => item.text === fromWikidata).label += ' (Wikidata)';
  if (bookAuthors.length > 1) choices.push({ text: '', label: 'Anonymous' });
  return choices.length === 1 && choices[0].text === card.author ? [] : choices;
}

/** The original title a card shows: its own, else Wikidata's until the person types one. */
const shownOriginalTitle = (card, known) => card.originalTitle ?? (known && known.originalTitle) ?? '';

const answeredText = cards => `${cards.filter(cardAnswered).length} of ${cards.length} answered`;

/**
 * One card.
 * @param {{ wikidataOf: (title: string) => object|null, listDateOf: (title: string) => string, missing: Set<number> }} about
 *   wikidataOf: what Wikidata said about the work; listDateOf: an unchecked known list's date; missing: cards to outline
 */
export function cardHtml(card, i, about) {
  const known = about.wikidataOf(card.title);
  const authors = typedNames(card.author);
  const done = cardAnswered(card);
  // The language chips: the usual six, Wikidata's if it is another, and the card's own.
  const offered = [...new Set([...LANGUAGES, ...(known && known.originalLanguage ? [known.originalLanguage] : []), ...(card.language ? [card.language] : [])])];
  const chipsHtml = offered.map(language => {
    const label = known && known.originalLanguage === language && language !== card.language ? `${language} (Wikidata)` : language;
    return `<button type="button" class="chip${card.language === language ? ' is-on' : ''}" data-action="card-language" data-value="${attr(language)}" aria-pressed="${card.language === language}">${escapeHtml(label)}</button>`;
  }).join('');
  const foreign = card.language && !isEnglish(card.language);
  const originalHtml = foreign ? `<label class="field">Original title<input name="cardOriginalTitle" value="${attr(shownOriginalTitle(card, known))}" autocomplete="off">`
    + `${card.originalTitle === null && known && known.originalTitle ? '<span class="preview">From Wikidata; correct it if it is wrong.</span>' : ''}</label>`
    + `<p class="search-line">${searchLinkHtml(originalTitleQuestion(card.title, authors), 'card-title')}</p>` : '';
  // A date to tap: Wikidata's, unless it was printed after the author died (then the working date is when it was written).
  const suggestions = [];
  if (known && known.date && !known.posthumous && known.date !== card.date) suggestions.push({ text: known.date, label: `${known.date} (Wikidata)` });
  const listDate = about.listDateOf(card.title);
  if (listDate && listDate !== card.date) suggestions.push({ text: listDate, label: `${listDate} (the list, not yet checked)` });
  const suggestionsHtml = suggestions.map(item => `<button type="button" class="chip" data-action="card-date" data-value="${attr(item.text)}">${escapeHtml(item.label)}</button>`).join('');
  const posthumousHtml = known && known.date && known.posthumous
    ? `<p class="preview">${escapeHtml(`Wikidata: first printed ${known.date}, after the author died. The working date is when it was written.`)}</p>` : '';
  const read = card.date ? parseDating(card.date) : null;
  const previewText = !read ? '' : read.ok ? `Read as ${formatYearRange(read.dating.earliest, read.dating.latest)} (${read.dating.certainty})` : read.problem;
  const authorChipsHtml = authorChoices(card, about.bookAuthors || [], known).map(item => {
    const on = item.text === card.author && !card.authorAsked;
    return `<button type="button" class="chip${on ? ' is-on' : ''}" data-action="card-author" data-value="${attr(item.text)}" aria-pressed="${on}">${escapeHtml(item.label)}</button>`;
  }).join('');
  return `<fieldset class="work-card${about.missing.has(i) && !done ? ' is-missing' : ''}" data-card="${i}">
      <legend>${escapeHtml(`${done ? '✓ ' : ''}${i + 1}. ${card.title}`)}</legend>
      <label class="field">Title<input name="cardTitle" value="${attr(card.title)}" autocomplete="off"></label>
      <label class="field">Author (empty if anonymous)<input name="cardAuthor" value="${attr(card.author)}" autocomplete="off"></label>
      ${authorChipsHtml ? `<div class="chips">${authorChipsHtml}</div>` : ''}
      <div class="field">First written in<div class="chips">${chipsHtml}</div></div>
      <label class="field">Another language<input name="cardLanguage" value="" autocomplete="off"></label>
      <p class="search-line">${searchLinkHtml(workLanguageQuestion(card.title, authors), 'card-language')}</p>
      ${originalHtml}
      <label class="field">Original date<input name="cardDate" value="${attr(card.date)}" placeholder="c. 397, 1843, early 2nd c." autocomplete="off"><span class="preview" data-preview>${escapeHtml(previewText)}</span></label>
      <div class="chips">${suggestionsHtml}<button type="button" class="chip${card.dateUnknown && !card.date ? ' is-on' : ''}" data-action="card-unknown" aria-pressed="${card.dateUnknown && !card.date}">Don't know</button></div>
      ${posthumousHtml}
      <p class="search-line">${searchLinkHtml(workDateQuestion(card.title, authors), 'card-date')}</p>
      <p><button type="button" class="link" data-action="card-remove">Not a work (a heading): remove</button></p>
    </fieldset>`;
}

/**
 * The step's screen.
 * @param {object} book the book being added; book.cards holds the cards
 * @param {object} about as for cardHtml, and wikidataHtml: the line about what Wikidata said, or is still asked;
 *   sameHtml: the "Possibly the same as…" line; nudged: whether Next was tapped with works unanswered
 */
export function worksStepHtml(book, about) {
  const cards = book.cards || [];
  const cardsHtml = cards.map((card, i) => cardHtml(card, i, about)).join('');
  const nudgeHtml = about.nudged && cards.some(card => !cardAnswered(card))
    ? `<p class="step-hint is-missing">${escapeHtml('Answer each outlined work, or tap "Don\'t know".')} <button type="button" class="chip" data-action="cards-unknown">Don't know the rest</button></p>` : '';
  return `<h2 class="step-title">The works in this book</h2>
    <p class="step-hint">Check each work against the book: its title and author, the language it was first written in, and when it was written. A work is ticked once its language and date are answered.</p>
    ${dateRuleHtml()}
    <p class="step-hint" data-works-count>${escapeHtml(answeredText(cards))}</p>
    ${about.wikidataHtml || ''}${about.sameHtml || ''}${nudgeHtml}
    <form class="form">${cardsHtml}${navHtml()}</form>`;
}

/**
 * Read every card's boxes into book.cards. A language typed in "Another
 * language" wins over a chip.
 * @param {HTMLElement} stepArea the step on screen
 */
export function readCards(book, stepArea) {
  for (const box of stepArea.querySelectorAll('[data-card]')) {
    const card = book.cards[Number(box.dataset.card)];
    if (!card) continue;
    const value = name => (box.querySelector(`[name="${name}"]`) || { value: '' }).value.trim();
    card.title = value('cardTitle') || card.title;
    card.author = value('cardAuthor');
    if (value('cardLanguage')) Object.assign(card, { language: value('cardLanguage'), languageChosen: true });
    // An empty box is "not given" (null), so Wikidata's title, which is kept anyway when the work is saved, still shows.
    if (box.querySelector('[name="cardOriginalTitle"]')) card.originalTitle = value('cardOriginalTitle') || null;
    card.date = value('cardDate');
    if (card.date) card.dateUnknown = false;
  }
}

/**
 * A tap on a card: its language, a date suggestion, "Don't know", or removing
 * it. Returns true when the whole step must be drawn again (a card was removed).
 */
export function cardAction(book, action, value, index) {
  const card = book.cards[index];
  if (!card) return false;
  if (action === 'card-language') Object.assign(card, { language: value, languageChosen: true });
  if (action === 'card-author') Object.assign(card, { author: value, authorAsked: false });
  if (action === 'card-date') Object.assign(card, { date: value, dateUnknown: false });
  if (action === 'card-unknown') Object.assign(card, { date: '', dateUnknown: !card.dateUnknown });
  if (action === 'card-remove') { book.cards.splice(index, 1); return true; }
  return false;
}

/** Draw one card again in place, and the count above, so a long list does not jump. */
export function redrawCard(stepArea, book, index, about) {
  const box = stepArea.querySelector(`[data-card="${index}"]`);
  if (box) box.outerHTML = cardHtml(book.cards[index], index, about);
  showCount(stepArea, book);
}

/** The count of answered works, and a card's tick, after typing in it. */
export function showCount(stepArea, book, index = null) {
  const count = stepArea.querySelector('[data-works-count]');
  if (count) count.textContent = answeredText(book.cards || []);
  const card = index === null ? null : book.cards[index];
  const legend = card && stepArea.querySelector(`[data-card="${index}"] legend`);
  if (legend) legend.textContent = `${cardAnswered(card) ? '✓ ' : ''}${index + 1}. ${card.title}`;
}

/** How a card's typed date is read, under its box. */
export function showCardPreview(input) {
  const preview = input.parentElement.querySelector('[data-preview]');
  if (!preview) return;
  const read = input.value.trim() ? parseDating(input.value) : null;
  preview.textContent = !read ? '' : read.ok ? `Read as ${formatYearRange(read.dating.earliest, read.dating.latest)} (${read.dating.certainty})` : read.problem;
}
