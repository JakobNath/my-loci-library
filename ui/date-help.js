// What sits by an original-date box on every screen that has one: the
// working-date rule as one line of help, and a "Search the web" link that
// opens the browser on a question about the date (PLAN.md, "Original dates").
// The browser does the search; the app sends nothing anywhere.

import { escapeHtml } from '../core/html.js';
import { webSearchUrl } from '../core/date-search.js';

// The working-date rule (PLAN.md, "Which date is the working date"), short enough for one line.
export const WORKING_DATE_RULE = 'Printed in the author\'s lifetime: when first published. Otherwise: when written. A play: its first performance.';

export function dateRuleHtml() {
  return `<p class="preview date-rule">${escapeHtml(WORKING_DATE_RULE)}</p>`;
}

/**
 * The link, in a new tab. Screens whose title or names can be retyped
 * refresh its address on click (refreshSearchLink), so it asks about what is
 * in the boxes at that moment.
 * @param {string} question from core/date-search.js
 * @param {string} kind "work" or "translation", for the screen's click handler
 */
export function searchLinkHtml(question, kind = 'work') {
  return `<a class="link search-web" data-search-web="${kind}" href="${escapeHtml(webSearchUrl(question))}" target="_blank" rel="noopener">Search the web</a>`;
}

/** Point a link at a new question; called just before the browser follows it. */
export function refreshSearchLink(link, question) {
  link.href = webSearchUrl(question);
}
