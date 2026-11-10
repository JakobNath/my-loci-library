// The Settings screen (PLAN.md, "Settings"): a short main page (#/settings),
// and the Trash, Rename and merge, and Advanced pages (#/settings/<page>).
// Shared settings describe the library and go to the data repository's
// settings.json; settings for this device stay in this browser. Defaults are
// chosen so most people never need to open this screen.

import { escapeHtml } from '../core/html.js';
import { FORMAT_VERSION } from '../core/records.js';
import { SORTS } from '../core/library.js';
import { trashedItems, restoreBook, trashRecord } from '../core/trash.js';
import { renderLists } from './lists.js';
import { iconHtml } from './icons.js';
import { saveFile } from './save-file.js';
import { lastBackupLine, archiveReminder } from '../core/backup-status.js';
import { checkGoogleBooksKey } from '../edges/lookup-googlebooks.js';

export const APP_VERSION = '1.0.5';

const ON_OFF = [[true, 'On'], [false, 'Off']];

// GitHub's form for a new key, filled in by its address: a name, a year's expiry,
// and "Contents: Read and write" (GitHub Docs, "Pre-filling fine-grained personal
// access token details using URL parameters"). Only the repository is left to choose.
const KEY_LINK = 'https://github.com/settings/personal-access-tokens/new?name=My+Loci+Library&description=Sync+for+one+device&expires_in=366&contents=write';

// Making a Google Books key, step by step (the same steps are in the tools
// README and docs/plan/FOR_JAKOB.md). Google Cloud's pages move now and then;
// the two addresses below go straight to the right ones.
const GOOGLE_KEY_GUIDE_HTML = `<details class="small"><summary>How to make a free key (about two minutes)</summary><ol>
  <li>Open <a class="link" href="https://console.cloud.google.com/apis/library/books.googleapis.com" target="_blank" rel="noopener">the Books API in Google Cloud</a> and sign in with any Google account. If it asks for a project, make one (any name, such as "My Loci Library"). Click "Enable".</li>
  <li>Open <a class="link" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Credentials</a>, click "Create credentials", then "API key".</li>
  <li>In the form that opens (or, if a key appears at once, by clicking its name), choose "Restrict key" under "API restrictions" and tick "Books API", so the key is good for nothing else. Leave "Application restrictions" at "None". Click "Create" or "Save", and copy the key (it starts with AIza).</li>
  <li>Paste the key above and tap "Test the key". The same key can be pasted on every phone, and into the laptop's config.json. It stays on each device and is never sent to the data repository. It costs nothing.</li>
</ol></details>`;

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
        <li>Open <a class="link" href="${escapeHtml(KEY_LINK)}" target="_blank" rel="noopener">GitHub's form for a new key</a> (sign in if asked). The name, a year's expiry and the permission "Contents: Read and write" are already filled in.</li>
        <li>Under "Repository access", choose "Only select repositories", then pick your data repository from the list.</li>
        <li>Click "Generate token" at the bottom, and copy the code it shows (it starts with github_pat_).</li>
        <li>Paste it above and tap "Connect and download". The key stays on this device only. When it expires, make a new one the same way.</li>
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

// The main page holds what anyone using the app may want: how it looks, whether
// it is synced, and the way to the trash. Everything else is one tap further,
// under Rename and merge, or Advanced (interface review, 2026-11-11).
const LOOK_KEYS = ['theme', 'view', 'coverSize'];

function menuRowHtml(href, label, detail) {
  return `<a class="menu-row" href="${href}"><span>${escapeHtml(label)}</span><span class="page-meta">${escapeHtml(detail)}</span></a>`;
}

function mainHtml(state) {
  const { device } = state;
  const lookHtml = DEVICE_CHOICES.filter(([key]) => LOOK_KEYS.includes(key)).map(([key, label, options]) => chipsHtml('data-key', key, label, options, device[key] ?? options[0][0])).join('');
  const syncLine = !device.syncRepo ? 'Not connected yet. Advanced › Sync sets it up.'
    : `${state.syncStatus || 'Connected.'} ${state.unsent ? `${state.unsent} changes waiting to be sent.` : 'Everything is sent.'}`;
  const syncButtonHtml = device.syncRepo ? '<button class="btn" type="button" data-sync-now>Sync now</button>' : '';
  const backupLine = lastBackupLine(state.backupStatus) || 'No backup from the laptop yet (loci-backup, in the tools).';
  const reminder = archiveReminder(state.backupStatus, new Date().toISOString().slice(0, 10));
  const backupHtml = `<p class="page-meta">${escapeHtml(backupLine)}</p>${reminder ? `<p class="step-hint is-missing">${escapeHtml(reminder)}</p>` : ''}`;
  const trashCount = trashedItems(state.records).length;
  const menuHtml = menuRowHtml('#/settings/trash', 'Trash', trashCount ? `${trashCount} ${trashCount === 1 ? 'item' : 'items'}` : 'empty')
    + menuRowHtml('#/value', 'Value', 'what the books are worth, for insurance')
    + menuRowHtml('#/settings/export', 'Export', 'CSV, JSON, CSL-JSON, BibTeX')
    + menuRowHtml('#/settings/lists', 'Rename and merge', 'categories, tags, series, bindings, places')
    + menuRowHtml('#/settings/advanced', 'Advanced', 'shared settings, scanning, sync setup, about');
  const offline = state.offlineReady ? 'Ready to use offline.' : 'Not yet stored for offline use.';
  return `<div class="page-head"><h1 class="page-title">Settings</h1></div>
    <section class="block"><h2 class="block-title">Look</h2><div class="form">${lookHtml}</div></section>
    <section class="block"><h2 class="block-title">Sync and backup</h2><p class="page-meta">${escapeHtml(syncLine)}</p>${backupHtml}${syncButtonHtml}</section>
    <nav class="menu" aria-label="More settings">${menuHtml}</nav>
    <p class="page-meta settings-foot">${escapeHtml(`My Loci Library ${APP_VERSION} · ${offline} ${state.storageNote || ''}`)}<br>Created by Jakob Nath.</p>`;
}

const backHtml = `<a class="back" href="#/settings">${iconHtml('back')} Settings</a>`;

function advancedHtml(state) {
  const { settings, device } = state;
  const deviceChoicesHtml = DEVICE_CHOICES.filter(([key]) => !LOOK_KEYS.includes(key)).map(([key, label, options]) => chipsHtml('data-key', key, label, options, device[key] ?? options[0][0])).join('');
  return `${backHtml}<div class="page-head"><h1 class="page-title">Advanced</h1></div>
    <section class="block"><h2 class="block-title">The library</h2>${sharedHtml(settings)}</section>
    <section class="block"><h2 class="block-title">This device</h2><p class="page-meta">For this device only.</p><div class="form">${deviceChoicesHtml}
      <label class="field">Google Books key (optional). With one, adding a book also fills its height and thickness and finds more covers; without one Google Books refuses most lookups. Open Library works either way.
        <input data-key-input="googleBooksKey" value="${escapeHtml(device.googleBooksKey || '')}" autocomplete="off" spellcheck="false"></label>
      <div class="actions"><button class="btn" type="button" data-test-key>Test the key</button></div><p class="page-meta" data-key-result></p>
      ${GOOGLE_KEY_GUIDE_HTML}</div></section>
    <section class="block"><h2 class="block-title">Sync</h2>${syncHtml(state)}</section>
    <section class="block"><h2 class="block-title">About</h2><dl class="facts">
      <dt>App version</dt><dd>${escapeHtml(APP_VERSION)}</dd>
      <dt>Data format</dt><dd>${escapeHtml(String(FORMAT_VERSION))}</dd>
      <dt>License</dt><dd>MIT</dd>
      <dt>Self-test</dt><dd><a href="tests/">Run the self-tests</a></dd>
    </dl><p class="page-meta">Created by Jakob Nath.</p></section>`;
}

export function render(container, state, actions) {
  const { settings, device } = state;
  const page = state.route.id;
  if (page === 'trash') container.innerHTML = `${backHtml}<div class="page-head"><h1 class="page-title">Trash</h1><p class="page-meta">Books and wishlist items moved here can be brought back at any time.</p></div><section class="block">${trashHtml(state.records)}</section>`;
  else if (page === 'lists') {
    container.innerHTML = `${backHtml}<div class="page-head"><h1 class="page-title">Rename and merge</h1><p class="page-meta">Tap a name to rename it on every book that uses it. Choosing a name already in the list merges the two.</p></div><section class="block"><div data-lists></div></section>`;
    renderLists(container.querySelector('[data-lists]'), state, actions);
  } else if (page === 'advanced') container.innerHTML = advancedHtml(state);
  else if (page === 'export') container.innerHTML = `${backHtml}<div class="page-head"><h1 class="page-title">Export</h1><p class="page-meta">The whole catalog, every book owned or not, as a file on this device.</p></div>
    <nav class="menu">${exportsMenuHtml()}</nav>
    <p class="page-meta">A catalog that opens in any browser, with covers and no internet, is made on the laptop by loci-backup.</p>`;
  else container.innerHTML = mainHtml(state);

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
    const exportButton = event.target.closest('[data-export]');
    if (exportButton) { exportCatalog(exportButton.dataset.export, state); return; }
    if (event.target.closest('[data-test-key]')) { testGoogleKey(container); return; }
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

// "Test the key": one lookup with the key in the box, and the answer in plain words.
async function testGoogleKey(container) {
  const result = container.querySelector('[data-key-result]');
  result.textContent = 'Asking Google Books…';
  const verdict = await checkGoogleBooksKey(container.querySelector('[data-key-input="googleBooksKey"]').value.trim());
  result.textContent = verdict.message;
  result.classList.toggle('is-missing', !verdict.works);
}

async function restoreItem(id, container, state, actions) {
  const record = state.records.get(id);
  const changed = record.type === 'edition' ? restoreBook(state.records, id, actions.now()) : [trashRecord(record, null, actions.now())];
  if (await actions.saveRecords(changed)) {
    actions.showNote(`Restored: ${record.title}`);
    render(container, state, actions);
  }
}

const exportsMenuHtml = () => EXPORTS.map(([kind, label, detail]) => `<button type="button" class="menu-row" data-export="${escapeHtml(kind)}"><span>${escapeHtml(label)}</span><span class="page-meta">${escapeHtml(detail)}</span></button>`).join('');

const EXPORTS = [
  ['csv', 'Spreadsheet (CSV)', 'one row per copy, for Excel, Numbers or Google Sheets'],
  ['json', 'All records (JSON)', 'everything, exactly as stored'],
  ['csl', 'Citations (CSL-JSON)', 'for Zotero and other citation managers'],
  ['bibtex', 'BibTeX', 'for LaTeX, with original dates as origdate'],
];

// The export code is loaded only when an export is chosen.
async function exportCatalog(kind, state) {
  const exports = await import('../core/exports.js');
  const { library } = state;
  const day = new Date().toISOString().slice(0, 10);
  const files = {
    csv: () => [`my-loci-library-${day}.csv`, exports.catalogCsv(library.entries, { dateStyle: state.settings.dateStyle }), 'text/csv'],
    json: () => [`my-loci-library-${day}.json`, exports.catalogJson([...state.records.values()], new Date().toISOString().slice(0, 19) + 'Z'), 'application/json'],
    csl: () => [`my-loci-library-${day}.csl.json`, exports.cslJson(library.entries, library.worksById, library.authorsById), 'application/json'],
    bibtex: () => [`my-loci-library-${day}.bib`, exports.bibtex(library.entries, library.worksById, library.authorsById), 'application/x-bibtex'],
  };
  saveFile(...files[kind]());
}
