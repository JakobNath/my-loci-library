// The add screen's "Check before saving" (the last step) and the line a step
// shows when its Next finds a must field empty (docs/decisions/screens.md,
// "Adding fills the record while the book is in hand"). What is missing is
// worked out in core/add-check.js; this file only draws it. ui/add.js puts
// the check after "This copy" and opens a row's step when it is tapped.

import { escapeHtml } from '../core/html.js';
import { attr, navHtml } from './add-questions.js';

const STATE_TEXT = { missing: 'missing', unknown: "don't know", none: 'none' };

/**
 * Every field of the book, in three groups. A row with a step can be tapped
 * to change it there; "Save the book" is always allowed.
 * @param {{ title: string, rows: { label: string, value: string, state: string, step: string }[] }[]} groups from checkRows
 * @param {string} title the book's title
 */
export function checkStepHtml(groups, title) {
  const missing = groups.flatMap(group => group.rows).filter(row => row.state === 'missing').length;
  const rowHtml = row => {
    const value = row.state === 'filled' ? escapeHtml(row.value) : `<span class="check-${row.state}">${escapeHtml(STATE_TEXT[row.state] || '')}</span>`;
    const inner = `<span class="check-label">${escapeHtml(row.label)}</span><span class="check-value">${value}</span>`;
    return row.step ? `<button type="button" class="check-row" data-action="jump" data-value="${attr(row.step)}">${inner}</button>` : `<div class="check-row">${inner}</div>`;
  };
  const groupsHtml = groups.map(group => `<section class="check-group"><h3 class="block-title">${escapeHtml(group.title)}</h3>${group.rows.map(rowHtml).join('')}</section>`).join('');
  const hint = missing ? `${missing} ${missing === 1 ? 'field is' : 'fields are'} still missing, in amber. Tap a line to fill it in, or save the book as it is.`
    : 'Everything asked for is answered. Tap a line to change it.';
  return `<h2 class="step-title">Check before saving</h2>
    <p class="step-hint">${escapeHtml(`${title ? `${title}. ` : ''}${hint}`)}</p>
    <form class="form">${groupsHtml}${navHtml('Save the book')}</form>`;
}

/**
 * The line at the top of a step whose Next found must fields empty, with
 * "Don't know". Empty when nothing is missing.
 * @param {{ name: string, label: string }[]} missing from mustMissing
 * @param {string} step the step's name
 * @param {boolean} fixing whether "Is this the book?" shows its boxes ("Fix details")
 */
export function nudgeHtml(missing, step, fixing) {
  if (!missing.length) return '';
  const names = missing.map(field => field.label).join(', ');
  // On "Is this the book?" without its boxes, the author is added under "Fix details".
  const what = step === 'book' && !fixing ? `Still empty: ${names}. Tap "Fix details" to add it, or "Don't know".`
    : `Still empty: ${names}. Fill it in, or tap "${step === 'edition' ? "Don't know or not printed" : "Don't know"}".`;
  const label = step === 'edition' ? "Don't know or not printed" : "Don't know";
  return `<p class="step-hint is-missing nudge">${escapeHtml(what)} <button type="button" class="chip" data-action="dont-know">${escapeHtml(label)}</button></p>`;
}
