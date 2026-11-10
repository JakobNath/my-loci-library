// The Settings screen. For now: this device's look and the About section;
// the full list from PLAN.md arrives in phase 8.

import { escapeHtml } from '../core/html.js';
import { FORMAT_VERSION } from '../core/records.js';

export const APP_VERSION = '0.6.2';

const CHOICES = [
  ['theme', 'Theme', [['device', 'Follow device'], ['light', 'Light'], ['dark', 'Dark']]],
  ['view', 'Library view', [['grid', 'Covers'], ['list', 'List']]],
  ['coverSize', 'Cover size', [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']]],
  ['scanSound', 'Beep when a barcode is read', [[true, 'On'], [false, 'Off']]],
];

export function render(container, state, actions) {
  const choicesHtml = CHOICES.map(([key, label, options]) => `<div class="field">${escapeHtml(label)}<div class="chips">`
    + options.map(([value, text]) => `<button class="chip${state.device[key] === value ? ' is-on' : ''}" data-key="${key}" data-value="${value}">${escapeHtml(text)}</button>`).join('')
    + '</div></div>').join('');
  const offline = state.offlineReady ? 'Ready to use offline.' : 'Not yet stored for offline use; it is stored on the first visit with a connection.';
  const storageHtml = escapeHtml(`${offline} ${state.storageNote || ''}`);
  container.innerHTML = `<div class="page-head"><h1 class="page-title">Settings</h1></div>
    <section class="block"><h2 class="block-title">This device</h2><div class="form">${choicesHtml}</div><p class="page-meta">${storageHtml}</p></section>
    <section class="block"><h2 class="block-title">Google Books key</h2>
      <label class="field">Optional. Without a key Google Books refuses most lookups; Open Library is used either way. A free key comes from Google Cloud's "Books API" page and stays on this device only.
        <input data-key-input="googleBooksKey" value="${escapeHtml(state.device.googleBooksKey || '')}" autocomplete="off" spellcheck="false"></label></section>
    <section class="block"><h2 class="block-title">About</h2><dl class="facts">
      <dt>App version</dt><dd>${escapeHtml(APP_VERSION)}</dd>
      <dt>Data format</dt><dd>${escapeHtml(String(FORMAT_VERSION))}</dd>
      <dt>License</dt><dd>MIT</dd>
      <dt>Self-test</dt><dd><a href="tests/">Run the self-tests</a></dd>
    </dl><p class="page-meta">Created by Jakob Nath.</p></section>`;
  container.onchange = event => {
    const name = event.target.dataset.keyInput;
    if (name) actions.setDevice({ [name]: event.target.value.trim() });
  };
  container.onclick = event => {
    const button = event.target.closest('[data-key]');
    if (!button) return;
    // On and Off are stored as true and false, not as the words.
    const value = { true: true, false: false }[button.dataset.value] ?? button.dataset.value;
    actions.setDevice({ [button.dataset.key]: value });
  };
}
