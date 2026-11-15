// What sits by an original-date box on every screen that has one: the
// working-date rule as one line, with "Which date?" opening the whole rule;
// the optional kind-of-work chips; "Revised later?" for a work's final
// edition and the text a book prints; and a "Search the web" link that opens
// the browser on a question about the date (PLAN.md, "Original dates"). The
// browser does the search; the app sends nothing anywhere.

import { escapeHtml } from '../core/html.js';
import { webSearchUrl } from '../core/date-search.js';
import { revisionProblem } from '../core/dating.js';
import { helpHtml } from './field-help.js';

// The working-date rule in one line, shown above the date box.
export const WORKING_DATE_RULE = 'The first time it appeared: first published, or written if it was not printed in the author\'s lifetime.';

// The whole rule, as PLAN.md "Which date is the working date" gives it, opened by "Which date?".
export const DATE_RULES = [
  { work: 'Printed in the author\'s lifetime', date: 'its first publication', example: 'Pride and Prejudice, 1813' },
  { work: 'Published in parts over several years', date: 'the range of its first edition', example: 'Grimm\'s tales, 1812–15' },
  { work: 'Revised by the author afterwards', date: 'the first edition; the final edition goes in "Revised later?"', example: 'Calvin\'s Institutes, 1536; rev. 1559' },
  { work: 'Written before printing, or first printed after the author died', date: 'when it was written', example: 'Augustine\'s Confessions, c. 397–400' },
  { work: 'A letter', date: 'the date on it', example: '' },
  { work: 'A speech, sermon or lecture', date: 'when it was delivered', example: '' },
  { work: 'A play', date: 'its first performance where known, otherwise when it was written', example: 'Oedipus the King, c. 429 BC' },
  { work: 'A poem', date: 'as any other work: first publication, or when it was written', example: 'The Raven, 1845' },
];

// The kinds of work a person may choose beside a date box; none is chosen to
// start, and nothing needs one. A choice shows its rule, narrows the search
// question (core/date-search.js, by key), and saves the dating's kind. A book
// or a poem saves none, since either first publication or writing may be its
// date (docs/decisions/screens.md, 15 November 2026).
export const WORK_KINDS = [
  { key: 'book', label: 'Book or essay', rule: 'First published, or when written if it was not printed in the author\'s lifetime.', dating: null },
  { key: 'letter', label: 'Letter', rule: 'The date on the letter.', dating: 'composed' },
  { key: 'speech', label: 'Speech or sermon', rule: 'When it was delivered.', dating: 'delivered' },
  { key: 'play', label: 'Play', rule: 'Its first performance where known, otherwise when it was written.', dating: 'first performed' },
  { key: 'poem', label: 'Poem', rule: 'First published, or when written if it was not printed in the author\'s lifetime.', dating: null },
  { key: 'ancient', label: 'Ancient or medieval', rule: 'When it was written, as scholars date it: c. 397–400, early 2nd c.', dating: 'composed' },
];

const kindOf = key => WORK_KINDS.find(kind => kind.key === key) || null;

/**
 * The dating kind a chosen kind of work saves: undefined when none was
 * chosen (the dating keeps the kind it had), else its kind or null.
 * @param {string} key a WORK_KINDS key, or '' for none chosen
 */
export function datingKindOf(key) {
  const kind = kindOf(key);
  return kind ? kind.dating : undefined;
}

/**
 * The kind of work an existing dating's kind stands for, so its chip is lit:
 * only when one kind saves it ("delivered" is a speech; "composed" may be a
 * letter or an ancient work, so no chip is lit).
 */
export function kindForDating(datingKind) {
  const matches = WORK_KINDS.filter(kind => kind.dating && kind.dating === datingKind);
  return matches.length === 1 ? matches[0].key : '';
}

/** The rule line above a date box, with "Which date?" folding out the whole rule. */
export function dateRuleHtml() {
  const rows = DATE_RULES.map(rule => `<li>${escapeHtml(`${rule.work}: ${rule.date}${rule.example ? ` (${rule.example})` : ''}.`)}</li>`).join('');
  return `<div class="date-rule"><p class="preview">${escapeHtml(WORKING_DATE_RULE)}</p>`
    + `<details class="date-rules"><summary>Which date?</summary><ul class="preview">${rows}</ul></details></div>`;
}

/**
 * The kind-of-work chips under a date box, and the chosen kind's rule.
 * @param {string} chosen a WORK_KINDS key, or '' for none
 * @param {string} action the data-action the screen handles ("date-kind", or "card-kind" on a card)
 */
export function kindChipsHtml(chosen, action = 'date-kind') {
  const chips = WORK_KINDS.map(kind => `<button type="button" class="chip${kind.key === chosen ? ' is-on' : ''}" data-action="${action}" data-value="${kind.key}" aria-pressed="${kind.key === chosen}">${escapeHtml(kind.label)}</button>`).join('');
  const rule = kindOf(chosen);
  return `<div class="field date-kinds" data-kind="${escapeHtml(chosen)}" data-start="${escapeHtml(chosen)}"><span class="preview">What kind of work? (optional)</span><div class="chips">${chips}</div>`
    + `<p class="preview" data-kind-rule${rule ? '' : ' hidden'}>${escapeHtml(rule ? rule.rule : '')}</p></div>`;
}

/**
 * A tap on a kind chip, on a screen that is not drawn again for it (Edit book,
 * "Works in this book"): a second tap takes the choice back. The choice is
 * kept on the chips' box (data-kind) for the screen to read when it saves.
 * @param {HTMLElement} button the chip tapped
 * @returns {string} the kind now chosen, or ''
 */
export function toggleKind(button) {
  const box = button.closest('.date-kinds');
  const chosen = box.dataset.kind === button.dataset.value ? '' : button.dataset.value;
  box.dataset.kind = chosen;
  for (const chip of box.querySelectorAll('.chip')) {
    chip.classList.toggle('is-on', chip.dataset.value === chosen);
    chip.setAttribute('aria-pressed', String(chip.dataset.value === chosen));
  }
  const rule = box.querySelector('[data-kind-rule]');
  rule.textContent = chosen ? kindOf(chosen).rule : '';
  rule.hidden = !chosen;
  return chosen;
}

/**
 * The dating kind the chips in a box now give: undefined when the choice is
 * as it was drawn (the dating keeps its kind), else the kind or null.
 * @param {HTMLElement|null} box the chips' box (.date-kinds)
 */
export function chosenDatingKind(box) {
  if (!box || box.dataset.kind === box.dataset.start) return undefined;
  return datingKindOf(box.dataset.kind) || null;
}

/**
 * "Revised later?" under a date box (format 7): the final edition's date of a
 * work its author revised, and which text of it this book prints. Folded away
 * unless filled, so a plain book shows one line. A problem (a date that cannot
 * be read, or a revision with no first date) shows under the box.
 * @param {{ first?: string, revised?: string, version?: string }} values the first date as typed, and the two boxes
 * @param {{ revisedName?: string, versionName?: string, askVersion?: boolean }} [names] the boxes' names on the screen;
 *   askVersion: false where the book holds the work but the screen does not ask its text
 */
export function revisedHtml({ first = '', revised = '', version = '' }, { revisedName = 'revised', versionName = 'version', askVersion = true } = {}) {
  const problem = revised ? revisionProblem(first, revised) : '';
  const revisedHelp = helpHtml('revised');
  const versionHelp = helpHtml('version');
  const versionHtml = askVersion ? `<label class="field"><span class="field-label">This book prints${versionHelp.button}</span>`
    + `<input name="${versionName}" value="${escapeHtml(version)}" placeholder="final edition, 1857" autocomplete="off" data-version-box>${versionHelp.text}</label>`
    + `<div class="chips"><button type="button" class="chip" data-action="version-chip" data-value="first">The first text</button>`
    + `<button type="button" class="chip" data-action="version-chip" data-value="final">The final text</button></div>` : '';
  return `<details class="revised"${revised || version ? ' open' : ''}><summary>Revised later? Final edition's year</summary>`
    + `<label class="field"><span class="field-label">Final edition's year${revisedHelp.button}</span>`
    + `<input name="${revisedName}" value="${escapeHtml(revised)}" placeholder="1857" autocomplete="off" data-revised-box>${revisedHelp.text}`
    + `<span class="preview${problem ? ' is-problem' : ''}" data-revised-problem>${escapeHtml(problem)}</span></label>${versionHtml}</details>`;
}

/**
 * A tap on "The first text" or "The final text": the box beside them says
 * which, with the final edition's year when it is typed ("final edition, 1857").
 * The screen is not drawn again, so nothing typed is lost.
 * @param {HTMLElement} button the chip tapped
 */
export function useVersionChip(button) {
  const box = button.closest('.revised');
  const year = box.querySelector('[data-revised-box]').value.trim();
  box.querySelector('[data-version-box]').value = button.dataset.value === 'final' ? ['final edition', year].filter(Boolean).join(', ') : 'first edition';
}

/**
 * The link, in a new tab. Screens whose title or names can be retyped
 * refresh its address on click (refreshSearchLink), so it asks about what is
 * in the boxes at that moment.
 * @param {string} question from core/date-search.js
 * @param {string} kind "work" or "contents", for the screen's click handler
 * @param {string} label the link's words
 */
export function searchLinkHtml(question, kind = 'work', label = 'Search the web') {
  return `<a class="link search-web" data-search-web="${kind}" href="${escapeHtml(webSearchUrl(question))}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
}

/** Point a link at a new question; called just before the browser follows it. */
export function refreshSearchLink(link, question) {
  link.href = webSearchUrl(question);
}
