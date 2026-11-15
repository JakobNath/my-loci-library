// The add screen's questions about what only a person knows (PLAN.md, "Batch
// add"): the work's original language and title, its category and tags, the
// translation and editors (and who translated each work of a collection), and
// this copy. Catalog facts (pages, sizes, call numbers) are
// left to the lookups and the laptop. Also the small pieces every add step is
// drawn with. ui/add.js decides the order of the steps and saves the book.

import { escapeHtml } from '../core/html.js';
import { normalizeForSearch } from '../core/search.js';
import { parseContentsLines, typedNames } from '../core/contents.js';
import { helpHtml } from './field-help.js';
import { workLanguageQuestion, originalTitleQuestion, searchTitle } from '../core/date-search.js';
import { searchLinkHtml } from './date-help.js';

/** The original languages offered as one-tap buttons; any other is typed. */
export const LANGUAGES = ['English', 'Latin', 'Greek', 'German', 'Hebrew', 'French'];

export const attr = value => escapeHtml(value ?? '');

/**
 * A labelled box. help: the field's name in FIELD_HELP (ui/field-help.js),
 * for an "i" beside the label; hint: a short line under the box.
 */
export function fieldHtml(label, name, value, { missing = false, list = '', type = 'text', help = false, hint = '' } = {}) {
  const helpParts = help ? helpHtml(name) : { button: '', text: '' };
  const labelHtml = help ? `<span class="field-label">${escapeHtml(label)}${helpParts.button}</span>` : escapeHtml(label);
  return `<label class="field${missing ? ' is-missing' : ''}">${labelHtml}<input name="${name}" type="${type}" value="${attr(value)}"${list ? ` list="${list}"` : ''} autocomplete="off"${type === 'number' ? ' inputmode="decimal"' : ''}>`
    + (hint ? `<span class="preview">${escapeHtml(hint)}</span>` : '') + `${helpParts.text}</label>`;
}

/** A big answer button: a main line and an optional smaller line under it. */
export function choiceHtml(action, main, detail = '', value = '') {
  return `<button type="button" class="choice-button" data-action="${action}" data-value="${attr(value)}"><span>${escapeHtml(main)}</span>`
    + (detail ? `<small>${escapeHtml(detail)}</small>` : '') + '</button>';
}

/** A large chip, lit when chosen; its label is its value unless given. */
export function chipHtml(action, value, isOn, label = value) {
  return `<button type="button" class="chip chip-big${isOn ? ' is-on' : ''}" data-action="${action}" data-value="${attr(value)}" aria-pressed="${isOn}">${escapeHtml(label)}</button>`;
}

/** The step's Back and Next buttons, inside its form. */
export function navHtml(nextLabel = 'Next') {
  return `<div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">${escapeHtml(nextLabel)}</button></div>`;
}

/** Whether a language is English, however it was typed. */
export const isEnglish = language => /^english$/i.test(String(language || '').trim());

// The work's original language and, for any other than English, its original title, each with a
// "Search the web" link. A collection is asked once, for most of its works; each work's card
// (ui/add-works.js) comes next and can say otherwise.
export function languageStepHtml(book) {
  const chipsHtml = LANGUAGES.map(language => chipHtml('language', language, book.language === language)).join('');
  const other = LANGUAGES.includes(book.language) ? '' : book.language;
  const foreign = book.language && !isEnglish(book.language);
  const workTitle = book.work && book.work.workTitle;
  const suggestionHtml = foreign && workTitle && workTitle !== book.originalTitle && normalizeForSearch(workTitle) !== normalizeForSearch(book.found.title)
    ? `<p class="step-hint">${escapeHtml(`Open Library's title for the work: ${workTitle}`)} <button type="button" class="chip" data-action="original-title">Use it</button></p>` : '';
  const many = book.contents !== null;
  const hint = many ? 'The language most of the works in this book were first written in. Each work comes next on its own card, where any can be changed.'
    : "The work's own language, not this book's: Latin for a translation of Augustine. Tap one, or type another below.";
  const searchHtml = question => `<p class="search-line">${searchLinkHtml(question)}</p>`;
  const titled = searchTitle(book.found);
  return `<h2 class="step-title">${escapeHtml(many ? 'What language were most of these works first written in?' : 'What language was this work first written in?')}</h2>
    <p class="step-hint">${escapeHtml(hint)}</p>
    <div class="chips step-chips">${chipsHtml}</div>
    <form class="form">${fieldHtml('Another language', 'originalLanguage', other, { help: true })}
      ${many ? '' : searchHtml(workLanguageQuestion(titled, book.found.authors))}
      ${foreign && !many ? fieldHtml('Original title', 'originalTitle', book.originalTitle, { help: true }) + suggestionHtml + searchHtml(originalTitleQuestion(titled, book.found.authors)) : ''}
      ${navHtml()}</form>`;
}

const MOST_USED_TAGS = 20; // tags offered as chips; every other is suggested as it is typed

/**
 * One category and any number of tags, from those already used or typed new.
 * @param {{ categories: string[], tags: string[] }} choices categories by name; tags most used first
 * @param {string[]} fromRecord categories the record's subjects suggest ("Drama")
 */
export function subjectsStepHtml(book, choices, fromRecord = []) {
  // A suggested category the library already has is its own chip already.
  const inUse = new Set(choices.categories.map(normalizeForSearch));
  const suggested = fromRecord.filter(category => !inUse.has(normalizeForSearch(category)));
  const categories = [...new Set([...suggested, ...choices.categories, ...(book.category ? [book.category] : [])])];
  const tags = [...new Set([...choices.tags.slice(0, MOST_USED_TAGS), ...book.tags])];
  const categoriesHtml = categories.map(category => chipHtml('category', category, category === book.category)).join('');
  const tagsHtml = tags.map(tag => chipHtml('tag', tag, book.tags.includes(tag))).join('');
  const tagListHtml = `<datalist id="tagList">${choices.tags.map(tag => `<option value="${attr(tag)}">`).join('')}</datalist>`;
  return `<h2 class="step-title">Category and tags</h2>
    <p class="step-hint">${escapeHtml(book.contents !== null ? 'For every work in this book: one broad group, and the topics they are about. Each work can be given its own later, under "Edit the works". Both can wait.' : 'One broad group for the work, and the topics it is about. Every edition of the work shares them. Both can wait.')}</p>
    <form class="form">
      ${categoriesHtml ? `<div class="field">Category<div class="chips">${categoriesHtml}</div>${suggested.length ? `<span class="preview">${escapeHtml(`From the record: ${suggested.join(', ')}`)}</span>` : ''}</div>` : ''}
      ${fieldHtml(categoriesHtml ? 'Or a new category' : 'Category', 'category', '', { help: true })}
      ${tagsHtml ? `<div class="field">Tags${choices.tags.length > MOST_USED_TAGS ? ', the most used' : ''}<div class="chips">${tagsHtml}</div></div>` : ''}
      ${fieldHtml(tagsHtml ? 'Other tags (separate with ,)' : 'Tags (separate with ,)', 'tags', '', { help: true, list: 'tagList' })}${tagListHtml}
      ${navHtml()}</form>`;
}

// Who translated and edited it, and the language of this book. A book that is not a translation (an anthology in its
// own language) is asked only for its editors. languageChoices: the one-tap answers for "This book is in" (core/book-data.js).
export function translationStepHtml(book, isTranslated, languageChoices = []) {
  const editorsHtml = fieldHtml('Edited by', 'editors', book.editors, { hint: 'Several: separate the names with ;. An assistant editor goes in Edit book with the role "other (not cited)".' });
  if (!isTranslated) {
    return `<h2 class="step-title">Editors</h2>
      <p class="step-hint">Who edited this book, if anyone: the editor of a collection, or of this edition. Optional.</p>
      <form class="form">${editorsHtml}${navHtml()}</form>`;
  }
  return `<h2 class="step-title">Translation and editors</h2>
    <p class="step-hint">Who translated and edited it. All optional.</p>
    <form class="form">${fieldHtml('Translator', 'translator', book.translator, { hint: 'Several translators: separate the names with ;' })}
      <p class="preview" data-translators>${escapeHtml(translatorsReadAs(book.translator))}</p>
      <div class="chips step-chips">${chipHtml('various-translators', '', Boolean(book.variousTranslators), 'Various translators')}</div>
      ${book.variousTranslators ? `<p class="preview">${escapeHtml('Many people translated the works, and no one is named for the whole book. A work\'s own translator can be given on the contents later, under "Edit the works".')}</p>` : ''}
      ${editorsHtml}
      ${fieldHtml('This book is in', 'bookLanguages', book.bookLanguages, { hint: 'The language of the pages in your hand. Tap one, or type: two for a facing-page edition, "Greek, English".' })}
      ${languageChoices.length ? `<div class="chips step-chips">${languageChoices.map(choice => chipHtml('book-languages', choice.text, choice.text === book.bookLanguages, choice.label)).join('')}</div>` : ''}
      ${navHtml()}</form>`;
}

// A collection with several translators: which one translated each work.
// Each row starts at the translator its contents line names, or the list's.
export function workTranslatorsStepHtml(book) {
  const names = typedNames(book.translator);
  const chosen = new Map((book.workTranslators || []).map(row => [normalizeForSearch(row.title), row.translator]));
  const rowsHtml = parseContentsLines(book.contents).map(line => {
    const title = normalizeForSearch(line.title);
    const translator = chosen.has(title) ? chosen.get(title) : line.translator || '';
    const options = [...new Set(['', ...names, translator])];
    const optionsHtml = options.map(name => `<option value="${attr(name)}"${name === translator ? ' selected' : ''}>${escapeHtml(name || 'Not known, or all of them')}</option>`).join('');
    const label = line.author ? `${line.title} · ${line.author}` : line.title;
    return `<label class="field">${escapeHtml(label)}<select name="workTranslator" data-title="${attr(line.title)}">${optionsHtml}</select></label>`;
  }).join('');
  return `<h2 class="step-title">Who translated each work?</h2>
    <p class="step-hint">${escapeHtml('Shown on the book page beside each work, for citing one work from the book. Optional; it can be changed later under "Edit the works".')}</p>
    <form class="form">${rowsHtml}${navHtml()}</form>`;
}

// Our copy: when we got it, what it cost and is worth, markings, and notes.
export function copyStepHtml(book) {
  const { copy } = book;
  return `<h2 class="step-title">This copy</h2><p class="step-hint">All optional. Next shows everything about the book before it is saved.</p>
    <form class="form">
      <div class="field-row">${fieldHtml('Acquired', 'acquired', copy.acquired, { hint: '"2019", "before 2015", or blank' })}${fieldHtml('Price paid', 'price', copy.price, { type: 'number' })}</div>
      ${fieldHtml('Estimated value', 'value', copy.value, { type: 'number' })}
      <label class="check"><input type="checkbox" name="markings"${copy.markings ? ' checked' : ''}> Writing or markings when acquired</label>
      <label class="field">Notes: why we own it, a gift and from whom, its condition<textarea name="notes" rows="3">${escapeHtml(copy.notes)}</textarea></label>
      ${navHtml()}</form>`;
}

/**
 * Read what was typed on one of these steps into the book being added.
 * Typed names win over a tapped chip; typed tags join the chosen ones.
 * @param {HTMLElement} stepArea the step on screen
 */
export function readQuestions(book, stepArea) {
  const value = name => ((stepArea.querySelector(`[name="${name}"]`) || {}).value || '').trim();
  if (book.step === 'language') {
    if (value('originalLanguage')) book.language = value('originalLanguage');
    if (stepArea.querySelector('[name="originalTitle"]')) book.originalTitle = value('originalTitle');
  }
  if (book.step === 'subjects') {
    if (value('category')) book.category = value('category');
    const typed = value('tags').split(',').map(tag => tag.trim()).filter(Boolean);
    book.tags = [...new Set([...book.tags, ...typed])];
  }
  if (book.step === 'translation') {
    // The step for a book that is not a translation has only the editors' box.
    const has = name => Boolean(stepArea.querySelector(`[name="${name}"]`));
    if (has('translator')) book.translator = value('translator');
    // A name typed takes back "Various translators".
    if (book.translator) book.variousTranslators = false;
    if (has('bookLanguages')) book.bookLanguages = value('bookLanguages');
    book.editors = value('editors');
  }
  if (book.step === 'translators') {
    book.workTranslators = [...stepArea.querySelectorAll('[name="workTranslator"]')].map(select => ({ title: select.dataset.title, translator: select.value }));
  }
  if (book.step === 'copy') {
    for (const name of ['acquired', 'price', 'value']) book.copy[name] = value(name);
    book.copy.markings = stepArea.querySelector('[name="markings"]').checked;
    book.copy.notes = stepArea.querySelector('[name="notes"]').value;
  }
}

/** What the translator box will save, said back under it: "Read as 4 translators: …". */
export function translatorsReadAs(text) {
  const names = typedNames(text);
  return names.length > 1 ? `Read as ${names.length} translators: ${names.join(' · ')}` : '';
}

