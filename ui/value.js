// The value view (PLAN.md, "Value view"): the total estimated value of the
// owned physical books, totals by place, room, bookcase or shelf (Room unless another is chosen), how many have no value yet, the
// Logos total kept apart, and a CSV for an insurance agent. Loaded only when
// opened. The app never guesses prices.

import { escapeHtml } from '../core/html.js';
import { valueSummary, VALUE_LEVELS } from '../core/value.js';
import { iconHtml } from './icons.js';
import { saveFile } from './save-file.js';

// The level chosen, kept while the app is open.
let depth = 2;

export function render(container, state) {
  const { currency } = state.settings;
  const money = amount => `${currency}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const summary = valueSummary(state.library.entries, depth);
  const levelsHtml = VALUE_LEVELS.map(level => `<button type="button" class="chip${level.depth === depth ? ' is-on' : ''}" data-depth="${level.depth}" aria-pressed="${level.depth === depth}">${escapeHtml(level.label)}</button>`).join('');
  const rowsHtml = summary.byPlace.map(row => `<dt>${escapeHtml(row.place)}</dt><dd>${escapeHtml(`${money(row.total)} · ${row.count} ${row.count === 1 ? 'book' : 'books'}${row.missing ? `, ${row.missing} with no value` : ''}`)}</dd>`).join('');
  const missingHtml = escapeHtml(summary.missing ? `${summary.missing} of ${summary.count} books have no value yet, so the real total is higher. Add values in each book's Edit form.` : 'Every book has a value.');
  const logosHtml = summary.logosCount ? `<section class="block"><h2 class="block-title">Logos</h2><p class="value-total">${escapeHtml(money(summary.logosTotal))}</p>
      <p class="page-meta">${escapeHtml(`${summary.logosCount} digital books. Kept out of the total above: digital licenses are not usually insured as personal property.`)}</p></section>` : '';
  container.innerHTML = `<a class="back" href="#/settings">${iconHtml('back')} Settings</a>
    <div class="page-head"><h1 class="page-title">Value</h1></div>
    <section class="block"><h2 class="block-title">Books on the shelves</h2><p class="value-total">${escapeHtml(money(summary.total))}</p>
      <p class="page-meta">${missingHtml}</p>
      <p class="page-meta value-levels" id="value-levels">Totals by</p><div class="chips" role="group" aria-labelledby="value-levels">${levelsHtml}</div>
      <dl class="facts">${rowsHtml}</dl>
      <div class="actions"><button class="btn btn-primary" type="button" data-action="csv">Download for an insurance agent (CSV)</button></div></section>
    ${logosHtml}`;
  container.onclick = async event => {
    const level = event.target.closest('[data-depth]');
    if (level) { depth = Number(level.dataset.depth); render(container, state); return; }
    if (!event.target.closest('[data-action="csv"]')) return;
    const { valueCsv } = await import('../core/exports.js');
    saveFile(`my-loci-library-value-${new Date().toISOString().slice(0, 10)}.csv`, valueCsv(state.library.entries, { currency, depth }), 'text/csv');
  };
}
