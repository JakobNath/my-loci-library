// The Settings screen. For now: this device's look and the About section;
// the full list from PLAN.md arrives in phase 8.

import { escapeHtml } from '../core/html.js';
import { FORMAT_VERSION } from '../core/records.js';

export const APP_VERSION = '0.5.3';

const CHOICES = [
  ['theme', 'Theme', [['device', 'Follow device'], ['light', 'Light'], ['dark', 'Dark']]],
  ['view', 'Library view', [['grid', 'Covers'], ['list', 'List']]],
  ['coverSize', 'Cover size', [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']]],
];

export function render(container, state, actions) {
  const choicesHtml = CHOICES.map(([key, label, options]) => `<div class="field">${escapeHtml(label)}<div class="chips">`
    + options.map(([value, text]) => `<button class="chip${state.device[key] === value ? ' is-on' : ''}" data-key="${key}" data-value="${value}">${escapeHtml(text)}</button>`).join('')
    + '</div></div>').join('');
  const offline = state.offlineReady ? 'Ready to use offline.' : 'Not yet stored for offline use; it is stored on the first visit with a connection.';
  const storageHtml = escapeHtml(`${offline} ${state.storageNote || ''}`);
  container.innerHTML = `<div class="page-head"><h1 class="page-title">Settings</h1></div>
    <section class="block"><h2 class="block-title">This device</h2><div class="form">${choicesHtml}</div><p class="page-meta">${storageHtml}</p></section>
    <section class="block"><h2 class="block-title">About</h2><dl class="facts">
      <dt>App version</dt><dd>${escapeHtml(APP_VERSION)}</dd>
      <dt>Data format</dt><dd>${escapeHtml(String(FORMAT_VERSION))}</dd>
      <dt>License</dt><dd>MIT</dd>
      <dt>Self-test</dt><dd><a href="tests/">Run the self-tests</a></dd>
    </dl><p class="page-meta">Created by Jakob Nath.</p></section>`;
  container.onclick = event => {
    const button = event.target.closest('[data-key]');
    if (button) actions.setDevice({ [button.dataset.key]: button.dataset.value });
  };
}
