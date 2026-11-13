// The add screen's questions about what only a person knows (PLAN.md, "Batch
// add"): the work's original language and title, its category and tags, the
// translation, and this copy. Catalog facts (pages, sizes, call numbers) are
// left to the lookups and the laptop. Also the small pieces every add step is
// drawn with. ui/add.js decides the order of the steps and saves the book.

import { escapeHtml } from '../core/html.js';
import { normalizeForSearch } from '../core/search.js';
import { parseContentsLines } from '../core/contents.js';
import { helpHtml } from './field-help.js';
import { translationDateQuestion } from '../core/date-search.js';
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

/** A large chip, lit when chosen. */
export function chipHtml(action, value, isOn) {
  return `<button type="button" class="chip chip-big${isOn ? ' is-on' : ''}" data-action="${action}" data-value="${attr(value)}" aria-pressed="${isOn}">${escapeHtml(value)}</button>`;
}

/** The step's Back and Next buttons, inside its form. */
export function navHtml(nextLabel = 'Next') {
  return `<div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">${escapeHtml(nextLabel)}</button></div>`;
}

/** Whether a language is English, however it was typed. */
export const isEnglish = language => /^english$/i.test(String(language || '').trim());

// The work's original language and, for any other than English, its original title.
// usedLanguages: the languages of the library's works, offered in a mixed collection's rows.
export function languageStepHtml(book, usedLanguages = []) {
  if (book.contents !== null && book.workLanguages) return workLanguagesHtml(book, usedLanguages);
  const chipsHtml = LANGUAGES.map(language => chipHtml('language', language, book.language === language)).join('');
  const other = LANGUAGES.includes(book.language) ? '' : book.language;
  const foreign = book.language && !isEnglish(book.language);
  const workTitle = book.work && book.work.workTitle;
  const suggestionHtml = foreign && workTitle && workTitle !== book.originalTitle && normalizeForSearch(workTitle) !== normalizeForSearch(book.found.title)
    ? `<p class="step-hint">${escapeHtml(`Open Library's title for the work: ${workTitle}`)} <button type="button" class="chip" data-action="original-title">Use it</button></p>` : '';
  // A collection is asked once for all its works; each work's own original title is given later, in "Works in this book".
  const many = book.contents !== null;
  const hint = many ? 'For every work in this book; a work first written in another language can be changed later on the book page, under "Edit the works".'
    : "The work's own language, not this book's: Latin for a translation of Augustine. Tap one, or type another below.";
  const mixedHtml = many ? choiceHtml('mixed-languages', 'Not all the same', 'Choose a language for each work') : '';
  return `<h2 class="step-title">${escapeHtml(many ? 'What language were these works first written in?' : 'What language was this work first written in?')}</h2>
    <p class="step-hint">${escapeHtml(hint)}</p>
    <div class="chips">${chipsHtml}</div>${mixedHtml}
    <form class="form">${fieldHtml('Another language', 'originalLanguage', other, { help: true })}
      ${foreign && !many ? fieldHtml('Original title', 'originalTitle', book.originalTitle, { help: true }) + suggestionHtml : ''}
      ${navHtml()}</form>`;
}

// A collection whose works were first written in different languages (Lucretius in Latin,
// Epictetus in Greek): one row per work, each starting at the language chosen for it, a known
// set's list, or the one answer for the whole book.
function workLanguagesHtml(book, usedLanguages) {
  const chosen = new Map((book.workLanguages || []).map(row => [normalizeForSearch(row.title), row.language]));
  const rowsHtml = parseContentsLines(book.contents).map(line => {
    const language = chosen.get(normalizeForSearch(line.title)) || book.language || '';
    const options = [...new Set(['', ...LANGUAGES, ...usedLanguages, language])];
    const optionsHtml = options.map(name => `<option value="${attr(name)}"${name === language ? ' selected' : ''}>${escapeHtml(name || 'Not known yet')}</option>`).join('');
    const label = line.author ? `${line.title} · ${line.author}` : line.title;
    return `<label class="field">${escapeHtml(label)}<select name="workLanguage" data-title="${attr(line.title)}">${optionsHtml}</select></label>`;
  }).join('');
  return `<h2 class="step-title">What language was each work first written in?</h2>
    <p class="step-hint">${escapeHtml(`A language not listed here, and each work's original title, can be given later on the book page, under "Edit the works".`)}</p>
    <form class="form">${rowsHtml}${choiceHtml('same-language', 'All in one language after all')}${navHtml()}</form>`;
}

const MOST_USED_TAGS = 20; // tags offered as chips; every other is suggested as it is typed

/**
 * One category and any number of tags, from those already used or typed new.
 * @param {{ categories: string[], tags: string[] }} choices categories by name; tags most used first
 */
export function subjectsStepHtml(book, choices) {
  const categories = [...new Set([...choices.categories, ...(book.category ? [book.category] : [])])];
  const tags = [...new Set([...choices.tags.slice(0, MOST_USED_TAGS), ...book.tags])];
  const categoriesHtml = categories.map(category => chipHtml('category', category, category === book.category)).join('');
  const tagsHtml = tags.map(tag => chipHtml('tag', tag, book.tags.includes(tag))).join('');
  const tagListHtml = `<datalist id="tagList">${choices.tags.map(tag => `<option value="${attr(tag)}">`).join('')}</datalist>`;
  return `<h2 class="step-title">Category and tags</h2>
    <p class="step-hint">${escapeHtml(book.contents !== null ? 'For every work in this book: one broad group, and the topics they are about. Each work can be given its own later, under "Edit the works". Both can wait.' : 'One broad group for the work, and the topics it is about. Every edition of the work shares them. Both can wait.')}</p>
    <form class="form">
      ${categoriesHtml ? `<div class="field">Category<div class="chips">${categoriesHtml}</div></div>` : ''}
      ${fieldHtml(categoriesHtml ? 'Or a new category' : 'Category', 'category', '', { help: true })}
      ${tagsHtml ? `<div class="field">Tags${choices.tags.length > MOST_USED_TAGS ? ', the most used' : ''}<div class="chips">${tagsHtml}</div></div>` : ''}
      ${fieldHtml(tagsHtml ? 'Other tags (separate with ,)' : 'Tags (separate with ,)', 'tags', '', { help: true, list: 'tagList' })}${tagListHtml}
      ${navHtml()}</form>`;
}

// Who translated it, and when this translation first appeared.
export function translationStepHtml(book) {
  return `<h2 class="step-title">About the translation</h2>
    <p class="step-hint">Who translated it, and the year this translation first appeared, which may be long before this printing. A revision's year goes in the notes. Both optional.</p>
    <form class="form">${fieldHtml('Translator', 'translator', book.translator)}
      ${fieldHtml('Translation first published (year)', 'translationFirstPublished', book.translationYear, { type: 'number', help: true })}
      <p class="search-line">${searchLinkHtml(translationDateQuestion(book.found.title, String(book.translator || '').split(';')), 'translation')}</p>
      ${navHtml()}</form>`;
}

// Our copy: when we got it, what it cost and is worth, markings, and notes.
export function copyStepHtml(book) {
  const { copy } = book;
  return `<h2 class="step-title">This copy</h2><p class="step-hint">All optional. "Save the book" saves it and gets ready for the next one.</p>
    <form class="form">
      <div class="field-row">${fieldHtml('Acquired', 'acquired', copy.acquired, { hint: '"2019", "before 2015", or blank' })}${fieldHtml('Price paid', 'price', copy.price, { type: 'number' })}</div>
      ${fieldHtml('Estimated value', 'value', copy.value, { type: 'number' })}
      <label class="check"><input type="checkbox" name="markings"${copy.markings ? ' checked' : ''}> Writing or markings when acquired</label>
      <label class="field">Notes: why we own it, a gift and from whom, its condition<textarea name="notes" rows="3">${escapeHtml(copy.notes)}</textarea></label>
      ${navHtml('Save the book')}</form>`;
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
    const rows = [...stepArea.querySelectorAll('[name="workLanguage"]')].map(select => ({ title: select.dataset.title, language: select.value }));
    if (rows.length) {
      book.workLanguages = rows;
      // The translation step asks whenever a work was not first written in English.
      book.language = (rows.find(row => row.language && !isEnglish(row.language)) || rows.find(row => row.language) || { language: '' }).language;
    }
    if (stepArea.querySelector('[name="originalTitle"]')) book.originalTitle = value('originalTitle');
  }
  if (book.step === 'subjects') {
    if (value('category')) book.category = value('category');
    const typed = value('tags').split(',').map(tag => tag.trim()).filter(Boolean);
    book.tags = [...new Set([...book.tags, ...typed])];
  }
  if (book.step === 'translation') {
    book.translator = value('translator');
    book.translationYear = value('translationFirstPublished');
  }
  if (book.step === 'copy') {
    for (const name of ['acquired', 'price', 'value']) book.copy[name] = value(name);
    book.copy.markings = stepArea.querySelector('[name="markings"]').checked;
    book.copy.notes = stepArea.querySelector('[name="notes"]').value;
  }
}

/** The edition's contributors with the translator from the translation step in place of any found. */
export function contributorsWithTranslator(contributors, translator) {
  const others = contributors.filter(person => person.role !== 'translator');
  const typed = translator.split(';').map(name => name.trim()).filter(Boolean).map(name => ({ name, role: 'translator' }));
  return [...others, ...typed];
}
