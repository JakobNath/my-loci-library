// The Settings screen. For now: this device's look and the About section;
// the full list from PLAN.md arrives in phase 8.

import { escapeHtml } from '../core/html.js';
import { FORMAT_VERSION } from '../core/records.js';

export const APP_VERSION = '0.8.0';

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
  const syncStatusHtml = escapeHtml(!state.device.syncRepo ? 'Not connected: this device keeps its own catalog until it is connected to the data repository.'
    : `${state.syncStatus || 'Connected.'} ${state.unsent ? `${state.unsent} changes waiting to be sent.` : 'Nothing waiting to be sent.'}`);
  container.innerHTML = `<div class="page-head"><h1 class="page-title">Settings</h1></div>
    <section class="block"><h2 class="block-title">This device</h2><div class="form">${choicesHtml}</div><p class="page-meta">${storageHtml}</p></section>
    <section class="block"><h2 class="block-title">Sync</h2>
      <p class="page-meta">${syncStatusHtml}</p>
      <form class="form" data-sync>
        <label class="field">Data repository (owner/name)<input name="repo" value="${escapeHtml(state.device.syncRepo || '')}" placeholder="JakobNath/my-loci-library-data" autocomplete="off" spellcheck="false"></label>
        <label class="field">This device's key<input name="key" type="password" placeholder="${escapeHtml(state.device.syncKey ? 'saved on this device' : 'paste the key here')}" autocomplete="off"></label>
        <div class="actions"><button class="btn btn-primary" type="submit">Connect and download</button><button class="btn" type="button" data-sync-now>Sync now</button></div>
      </form>
      <details class="small"><summary>How to make a key</summary><ol>
        <li>On github.com: Settings › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token.</li>
        <li>Name it after this device ("Jakob's phone"), and give it an expiry (a year).</li>
        <li>Repository access: only the data repository. Permissions: Contents, read and write.</li>
        <li>Generate it, copy it, and paste it above. It stays on this device only. When it expires, make a new one the same way.</li>
      </ol></details></section>
    <section class="block"><h2 class="block-title">Google Books key</h2>
      <label class="field">Optional. Without a key Google Books refuses most lookups; Open Library is used either way. A free key comes from Google Cloud's "Books API" page and stays on this device only.
        <input data-key-input="googleBooksKey" value="${escapeHtml(state.device.googleBooksKey || '')}" autocomplete="off" spellcheck="false"></label></section>
    <section class="block"><h2 class="block-title">About</h2><dl class="facts">
      <dt>App version</dt><dd>${escapeHtml(APP_VERSION)}</dd>
      <dt>Data format</dt><dd>${escapeHtml(String(FORMAT_VERSION))}</dd>
      <dt>License</dt><dd>MIT</dd>
      <dt>Self-test</dt><dd><a href="tests/">Run the self-tests</a></dd>
    </dl><p class="page-meta">Created by Jakob Nath.</p></section>`;
  container.onsubmit = event => {
    if (!event.target.matches('[data-sync]')) return;
    event.preventDefault();
    const form = new FormData(event.target);
    actions.connectSync(String(form.get('repo')), String(form.get('key')) || state.device.syncKey || '');
  };
  container.onchange = event => {
    const name = event.target.dataset.keyInput;
    if (name) actions.setDevice({ [name]: event.target.value.trim() });
  };
  container.onclick = event => {
    if (event.target.matches('[data-sync-now]')) { actions.syncNow(); return; }
    const button = event.target.closest('[data-key]');
    if (!button) return;
    // On and Off are stored as true and false, not as the words.
    const value = { true: true, false: false }[button.dataset.value] ?? button.dataset.value;
    actions.setDevice({ [button.dataset.key]: value });
  };
}
