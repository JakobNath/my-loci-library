// A copy's binding chosen from the three lists in the shared settings (data
// format 4): one binding, one material, and any extras, each a row of chips.
// Used by adding a book, adding a set and the entry form. Nothing is typed:
// a new choice is added to its list in Settings › Rename and merge. Loaded only with
// those screens.

import { escapeHtml } from '../core/html.js';
import { helpHtml } from './field-help.js';

const ROWS = [
  { part: 'binding', label: 'Binding', list: 'bindings', many: false },
  { part: 'material', label: 'Material', list: 'materials', many: false },
  { part: 'extras', label: 'Extras', list: 'extras', many: true },
];

/**
 * The three rows of chips, the chosen ones lit. A value no longer on its list
 * (older text that could not be read, or a choice since removed from the list)
 * is shown too, so it is never lost without a person seeing it.
 * @param {{ binding: string|null, material: string|null, extras: string[] }} parts
 * @param {{ bindings: string[], materials: string[], extras: string[] }} settings
 */
export function bindingChoicesHtml(parts, settings) {
  return ROWS.map(({ part, label, list, many }) => {
    const chosen = many ? parts[part] || [] : [parts[part]].filter(Boolean);
    const values = [...settings[list], ...chosen.filter(value => !settings[list].includes(value))];
    const chips = values.map(value => {
      const isOn = chosen.includes(value);
      return `<button type="button" class="chip chip-big${isOn ? ' is-on' : ''}" data-action="binding-part" data-part="${part}" data-value="${escapeHtml(value)}" aria-pressed="${isOn}">${escapeHtml(value)}</button>`;
    }).join('');
    const help = helpHtml(part);
    return `<div class="field binding-row" data-binding-row="${part}"><label class="field-label">${escapeHtml(label)}${help.button}${help.text}</label>`
      + `<div class="chips" role="group" aria-label="${escapeHtml(label)}">${chips}</div></div>`;
  }).join('');
}

/**
 * A tapped chip: in the binding and material rows it is the one choice, or
 * none when tapped again; in the extras row each chip is on or off.
 * @param {HTMLElement} chip
 */
export function toggleBindingChip(chip) {
  const isOn = chip.getAttribute('aria-pressed') !== 'true';
  if (chip.dataset.part !== 'extras') {
    for (const other of chip.parentElement.querySelectorAll('[data-part]')) {
      other.setAttribute('aria-pressed', 'false');
      other.classList.remove('is-on');
    }
  }
  chip.setAttribute('aria-pressed', String(isOn));
  chip.classList.toggle('is-on', isOn);
}

/**
 * What the rows inside an area say now.
 * @param {HTMLElement} area
 * @returns {{ binding: string|null, material: string|null, extras: string[] }}
 */
export function readBindingChoices(area) {
  const on = part => [...area.querySelectorAll(`[data-part="${part}"][aria-pressed="true"]`)].map(chip => chip.dataset.value);
  return { binding: on('binding')[0] || null, material: on('material')[0] || null, extras: on('extras') };
}
