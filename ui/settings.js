// The Settings screen (PLAN.md, "Settings"). Shared settings describe the
// library and go to the data repository's settings.json; settings for this
// device stay in this browser. Defaults are chosen so most people never need
// to open this screen.

import { escapeHtml } from '../core/html.js';
import { FORMAT_VERSION } from '../core/records.js';
import { SORTS } from '../core/library.js';
import { trashedItems, restoreBook, trashRecord } from '../core/trash.js';
import { renderLists } from './lists.js';

export const APP_VERSION = '0.8.5';

const ON_OFF = [[true, 'On'], [false, 'Off']];

// [key, label, choices]: shared ones are saved with saveSettings, device ones with setDevice.
const SHARED_CHOICES = [
  ['dateStyle', 'Dates', [['AD', 'AD / BC'], ['CE', 'CE / BCE']]],
  ['anthologiesInShelfLists', 'Anthologies, sorted by original date', [['once', 'Once, at the earliest date'], ['each', 'Under each work they hold']]],
];
const DEVICE_CHOICES = [
  ['theme', 'Theme', [['device', 'Follow device'], ['light', 'Light'], ['dark', 'Dark']]],
  ['view', 'Library view', [['grid', 'Covers'], ['list', 'List']]],
  ['coverSize', 'Cover size', [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']]],
  ['showLogos', 'Logos books in the main Library view', ON_OFF],
  ['scanner', 'Scanning with', [['camera', 'The camera'], ['usb', 'A USB barcode scanner']]],
  ['scanSound', 'Beep and buzz when a barcode is read', ON_OFF],
];
const PROMPTS = [['title', 'Title'], ['subtitle', 'Subtitle'], ['authors', 'Author'], ['datings', 'Original date'], ['binding', 'Binding'], ['publisher', 'Publisher'], ['year', 'Year']];
const WISHLIST_SORTS = [['added', 'Newest'], ['title', 'Title'], ['author', 'Author']];

function chipsHtml(attribute, key, label, options, current) {
  const buttonsHtml = options.map(([value, text]) => `<button class="chip${current === value ? ' is-on' : ''}" ${attribute}="${key}" data-value="${value}">${escapeHtml(text)}</button>`).join('');
  return `<div class="field">${escapeHtml(label)}<div class="chips">${buttonsHtml}</div></div>`;
}

function selectHtml(name, label, options, current) {
  const optionsHtml = options.map(([value, text]) => `<option value="${value}"${value === current ? ' selected' : ''}>${escapeHtml(text)}</option>`).join('');
  return `<label class="field">${escapeHtml(label)}<select data-sort="${name}">${optionsHtml}</select></label>`;
}

function sharedHtml(settings) {
  const promptsHtml = PROMPTS.map(([value, text]) => `<button class="chip${settings.batchAddPrompts.includes(value) ? ' is-on' : ''}" data-prompt="${value}" aria-pressed="${settings.batchAddPrompts.includes(value) ? 'true' : 'false'}">${escapeHtml(text)}</button>`).join('');
  const lookupsHtml = chipsHtml('data-lookup', 'openLibrary', 'Look up books in Open Library', ON_OFF, settings.lookups.openLibrary)
    + chipsHtml('data-lookup', 'googleBooks', 'Then in Google Books', ON_OFF, settings.lookups.googleBooks);
  const sortsHtml = selectHtml('library', 'Library sorted by', Object.entries(SORTS).map(([key, sort]) => [key, sort.label]), settings.defaultSort.library)
    + selectHtml('wishlist', 'Wishlist sorted by', WISHLIST_SORTS, settings.defaultSort.wishlist);
  return `<p class="page-meta">For everyone using this catalog; saved with it.</p><div class="form">
      ${SHARED_CHOICES.map(([key, label, options]) => chipsHtml('data-shared', key, label, options, settings[key])).join('')}
      <label class="field">Currency symbol<input data-currency value="${escapeHtml(settings.currency)}" maxlength="4" autocomplete="off"></label>
      <div class="field">When adding, ask for these if they are missing<div class="chips">${promptsHtml}</div></div>
      <div class="field-row">${sortsHtml}</div>
      ${lookupsHtml}
    </div>`;
}

function deviceHtml(device) {
  const choices = DEVICE_CHOICES.map(([key, label, options]) => chipsHtml('data-key', key, label, options, device[key] ?? options[0][0])).join('');
  return `<p class="page-meta">For this device only.</p><div class="form">${choices}
      <label class="field">Google Books key (optional). Without one Google Books refuses most lookups; Open Library works either way. A free key comes from Google Cloud's "Books API" page.
        <input data-key-input="googleBooksKey" value="${escapeHtml(device.googleBooksKey || '')}" autocomplete="off" spellcheck="false"></label></div>`;
}

function syncHtml(state) {
  const statusHtml = escapeHtml(!state.device.syncRepo ? 'Not connected: this device keeps its own catalog until it is connected to the data repository.'
    : `${state.syncStatus || 'Connected.'} ${state.unsent ? `${state.unsent} changes waiting to be sent.` : 'Nothing waiting to be sent.'}`);
  return `<p class="page-meta">${statusHtml}</p>
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
      </ol></details>`;
}

// The trash: books and wishlist items moved there, each with Restore.
function trashHtml(records) {
  const items = trashedItems(records);
  if (!items.length) return '<p class="page-meta">The trash is empty.</p>';
  const rowsHtml = items.map(item => `<li><span>${escapeHtml(item.title)}<span class="page-meta"> · ${escapeHtml(item.type === 'wishlist' ? 'wishlist, ' : '')}moved ${escapeHtml(item.trashed)}</span></span>`
    + `<button class="btn" data-restore="${escapeHtml(item.id)}">Restore</button></li>`).join('');
  return `<ul class="trash-list">${rowsHtml}</ul>`;
}

export function render(container, state, actions) {
  const { settings, device } = state;
  const offlineHtml = escapeHtml(`${state.offlineReady ? 'Ready to use offline.' : 'Not yet stored for offline use; it is stored on the first visit with a connection.'} ${state.storageNote || ''}`);
  container.innerHTML = `<div class="page-head"><h1 class="page-title">Settings</h1><p class="page-meta">${offlineHtml}</p></div>
    <section class="block"><h2 class="block-title">The library</h2>${sharedHtml(settings)}</section>
    <section class="block"><h2 class="block-title">Lists</h2><p class="page-meta">Tap a name to rename it on every book that uses it.</p><div data-lists></div></section>
    <section class="block"><h2 class="block-title">This device</h2>${deviceHtml(device)}</section>
    <section class="block"><h2 class="block-title">Sync</h2>${syncHtml(state)}</section>
    <section class="block"><h2 class="block-title">Trash</h2>${trashHtml(state.records)}</section>
    <section class="block"><h2 class="block-title">About</h2><dl class="facts">
      <dt>App version</dt><dd>${escapeHtml(APP_VERSION)}</dd>
      <dt>Data format</dt><dd>${escapeHtml(String(FORMAT_VERSION))}</dd>
      <dt>License</dt><dd>MIT</dd>
      <dt>Self-test</dt><dd><a href="tests/">Run the self-tests</a></dd>
    </dl><p class="page-meta">Created by Jakob Nath.</p></section>`;
  renderLists(container.querySelector('[data-lists]'), state, actions);

  container.onsubmit = event => {
    if (!event.target.matches('[data-sync]')) return;
    event.preventDefault();
    const form = new FormData(event.target);
    actions.connectSync(String(form.get('repo')), String(form.get('key')) || device.syncKey || '');
  };
  container.onchange = event => {
    const { keyInput, sort } = event.target.dataset;
    if (keyInput) actions.setDevice({ [keyInput]: event.target.value.trim() });
    else if (sort) actions.saveSettings({ defaultSort: { ...settings.defaultSort, [sort]: event.target.value } });
    else if ('currency' in event.target.dataset) actions.saveSettings({ currency: event.target.value.trim() || '$' });
  };
  container.onclick = event => {
    const target = event.target.closest('[data-sync-now], [data-restore], [data-key], [data-shared], [data-lookup], [data-prompt]');
    if (!target) return;
    const { restore, key, shared, lookup, prompt } = target.dataset;
    // On and Off are stored as true and false, not as the words.
    const value = { true: true, false: false }[target.dataset.value] ?? target.dataset.value;
    if ('syncNow' in target.dataset) actions.syncNow();
    else if (restore) restoreItem(restore, container, state, actions);
    else if (key === 'showLogos') actions.setDevice({ showLogos: value, medium: value ? 'all' : 'physical' });
    else if (key) actions.setDevice({ [key]: value });
    else if (shared) actions.saveSettings({ [shared]: value });
    else if (lookup) actions.saveSettings({ lookups: { ...settings.lookups, [lookup]: value } });
    else if (prompt) {
      const prompts = settings.batchAddPrompts.includes(prompt) ? settings.batchAddPrompts.filter(item => item !== prompt) : [...settings.batchAddPrompts, prompt];
      actions.saveSettings({ batchAddPrompts: PROMPTS.map(([item]) => item).filter(item => prompts.includes(item)) });
    }
  };
}

async function restoreItem(id, container, state, actions) {
  const record = state.records.get(id);
  const changed = record.type === 'edition' ? restoreBook(state.records, id, actions.now()) : [trashRecord(record, null, actions.now())];
  if (await actions.saveRecords(changed)) {
    actions.showNote(`Restored: ${record.title}`);
    render(container, state, actions);
  }
}
