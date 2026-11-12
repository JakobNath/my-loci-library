// The Settings screen (PLAN.md, "Settings"): a short main page (#/settings),
// and the guide, Trash, Rename and merge, Export and Advanced pages (#/settings/<page>).
// Shared settings describe the library and go to the data repository's
// settings.json; settings for this device stay in this browser. Defaults are
// chosen so most people never need to open this screen.

import { escapeHtml } from '../core/html.js';
import { FORMAT_VERSION } from '../core/records.js';
import { SORTS, missingDetails } from '../core/library.js';
import { trashedItems, restoreBook, trashRecord } from '../core/trash.js';
import { renderLists } from './lists.js';
import { iconHtml } from './icons.js';
import { saveFile } from './save-file.js';
import { lastBackupLine, archiveReminder } from '../core/backup-status.js';
import { checkGoogleBooksKey } from '../edges/lookup-googlebooks.js';
import { setupLink, readSetupLink, guessDataRepo } from '../core/settings.js';
import { guideHtml } from './field-help.js';

export const APP_VERSION = '1.7.0';

const ON_OFF = [[true, 'On'], [false, 'Off']];

// GitHub's form for a new key, filled in by its address: a name, no expiry,
// and "Contents: Read and write" (GitHub Docs, "Pre-filling fine-grained personal
// access token details using URL parameters"). Only the repository is left to choose.
// One key serves all our devices and never expires, so setup is done once
// (Jakob, 2026-11-10: only the two of us use the app; docs/decisions/sync.md).
// GitHub refuses a second key with a name already used, so the name carries
// the day it is made ("My Loci Library 2026-11-11").
const keyLink = () => `https://github.com/settings/personal-access-tokens/new?name=My+Loci+Library+${new Date().toISOString().slice(0, 10)}&description=Sync+for+My+Loci+Library&expires_in=none&contents=write`;

// Making a Google Books key, step by step (the same steps are in the tools
// README). Google Cloud's pages move now and then;
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
    + chipsHtml('data-lookup', 'hathiTrust', 'And in HathiTrust (contents of older and scholarly books)', ON_OFF, settings.lookups.hathiTrust)
    + chipsHtml('data-lookup', 'googleBooks', 'Then in Google Books', ON_OFF, settings.lookups.googleBooks)
    + chipsHtml('data-lookup', 'wikidata', 'Original dates and titles from Wikidata, offered to confirm', ON_OFF, settings.lookups.wikidata);
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

// Sync: what this device uses now; a setup link for the other devices, so
// only the first device ever deals with GitHub; and connecting by hand as
// three numbered steps. GitHub's form cannot pick the repository in advance,
// so step 2 names the one typed in step 1 (Jakob found the earlier single
// form confusing, and asked for a far easier setup, 2026-11-10).
function syncHtml(state) {
  const { syncRepo } = state.device;
  const nowHtml = !syncRepo ? `<p class="page-meta">This device is not connected to a catalog yet. The easy way: on a device that is connected, open Settings › Advanced › Sync, tap "Share setup link", and open that link here (in an app added to an iPhone's home screen, copy the link and paste it into step 3 instead). Setting up the very first device takes the three steps below.</p>`
    : `<dl class="facts"><dt>Catalog in use</dt><dd>${escapeHtml(syncRepo)}</dd>
        <dt>Last sync</dt><dd>${escapeHtml(`${state.syncStatus || 'Not yet in this session.'} ${state.unsent ? `${state.unsent} changes waiting to be sent.` : 'Nothing waiting to be sent.'}`)}</dd></dl>
      <div class="actions"><button class="btn" type="button" data-sync-now>Sync now</button></div>
      <h3 class="block-title sync-connect">Set up another phone or computer</h3>
      <p class="page-meta">Send the other device a link, by text or email. Opening it there connects it to this catalog with the same keys. Nothing to type.</p>
      <div class="actions"><button class="btn btn-primary" type="button" data-share-setup>Share setup link</button></div>
      <p class="page-meta" data-share-result></p><input class="share-box" data-share-box readonly hidden aria-label="Setup link">`;
  const repoNameHtml = `<strong data-repo-name>${escapeHtml((syncRepo || guessDataRepo(location.hostname)).split('/').pop() || 'the catalog from step 1')}</strong>`;
  const stepsHtml = `<form class="form" data-sync>
        <fieldset><legend>Step 1 of 3: Which catalog</legend>
          <label class="field">Catalog (owner/name on GitHub)<input name="repo" value="${escapeHtml(syncRepo || guessDataRepo(location.hostname))}" placeholder="JakobNath/my-loci-library-data" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
        </fieldset>
        <fieldset><legend>Step 2 of 3: Make one key, for all your devices</legend>
          <a class="btn" href="${escapeHtml(keyLink())}" target="_blank" rel="noopener">Open GitHub to make a key</a>
          <ol class="small">
            <li>Sign in to GitHub if asked. The name, "No expiration" and "Contents: Read and write" are already filled in.</li>
            <li>Under "Repository access", choose "Only select repositories", then pick ${repoNameHtml}. This is the step that matters.</li>
            <li>Change nothing else. Tap "Generate token" at the bottom, copy the code (it starts with github_pat_), and come back here.</li>
          </ol>
        </fieldset>
        <fieldset><legend>Step 3 of 3: Paste the key and connect</legend>
          <label class="field">The key, or a setup link<input name="key" type="password" placeholder="paste the code here" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
          <p class="page-meta">The key does not expire. Other devices get it from this one with "Share setup link".</p>
          <div class="actions"><button class="btn btn-primary" type="submit">Connect and download</button></div>
        </fieldset>
      </form>`;
  // Once connected, the steps are rarely needed, so they fold away.
  return syncRepo
    ? `${nowHtml}<details class="sync-connect"><summary>Connect to a different catalog, or use a new key</summary><p class="page-meta">If this device holds books from another catalog, the app asks before removing them from this device; they stay in that catalog.</p>${stepsHtml}</details>`
    : `${nowHtml}${stepsHtml}`;
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
  // The catalog's name is shown, so moving from the test catalog to the real one can be seen.
  const syncLine = !device.syncRepo ? 'Not connected yet. Advanced › Sync sets it up.'
    : `Catalog: ${device.syncRepo.split('/').pop()}. ${state.syncStatus || 'Connected.'} ${state.unsent ? `${state.unsent} changes waiting to be sent.` : 'Everything is sent.'}`;
  const syncButtonHtml = device.syncRepo ? '<button class="btn" type="button" data-sync-now>Sync now</button>' : '';
  const backupLine = lastBackupLine(state.backupStatus) || 'No backup from the laptop yet (loci-backup, in the tools).';
  const reminder = archiveReminder(state.backupStatus, new Date().toISOString().slice(0, 10));
  const backupHtml = `<p class="page-meta">${escapeHtml(backupLine)}</p>${reminder ? `<p class="step-hint is-missing">${escapeHtml(reminder)}</p>` : ''}`;
  const trashCount = trashedItems(state.records).length;
  // Books the laptop's nightly check has not completed yet, opened as a Library filter.
  const needingDetails = state.library.entries.filter(entry => entry.owned && missingDetails(entry).length).length;
  const needsDetailsText = needingDetails ? `${needingDetails} ${needingDetails === 1 ? 'book' : 'books'} still missing publisher, year, pages or binding` : 'every book has them';
  const needsDetailsHtml = `<a class="menu-row" href="#/" data-needs-details><span>Needs details</span><span class="page-meta">${escapeHtml(needsDetailsText)}</span></a>`;
  const menuHtml = menuRowHtml('#/settings/guide', 'How the catalog is organized', 'works and editions, series and sets, categories and tags')
    + needsDetailsHtml
    + menuRowHtml('#/settings/trash', 'Trash', trashCount ? `${trashCount} ${trashCount === 1 ? 'item' : 'items'}` : 'empty')
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
  else if (page === 'guide') container.innerHTML = `${backHtml}<div class="page-head"><h1 class="page-title">How the catalog is organized</h1><p class="page-meta">What the parts of a book's record mean, and how to use them.</p></div><div class="guide">${guideHtml()}</div>`;
  else if (page === 'export') container.innerHTML = `${backHtml}<div class="page-head"><h1 class="page-title">Export</h1><p class="page-meta">The whole catalog, every book owned or not, as a file on this device.</p></div>
    <nav class="menu">${exportsMenuHtml()}</nav>
    <p class="page-meta">A catalog that opens in any browser, with covers and no internet, is made on the laptop by loci-backup.</p>`;
  else container.innerHTML = mainHtml(state);

  container.onsubmit = event => {
    if (!event.target.matches('[data-sync]')) return;
    event.preventDefault();
    const form = new FormData(event.target);
    // A pasted setup link connects as if it had been opened. An app on an
    // iPhone's home screen keeps its data apart from Safari, and a link
    // tapped in a message opens in Safari, so pasting is its only way in.
    const pasted = String(form.get('key')).trim();
    const hash = pasted.slice(pasted.indexOf('#'));
    if (pasted.includes('#') && readSetupLink(hash)) { location.hash = hash; return; }
    actions.connectSync(String(form.get('repo')), String(form.get('key')) || device.syncKey || '');
  };
  // Step 2 names the catalog as it is typed in step 1.
  container.oninput = event => {
    if (event.target.name !== 'repo') return;
    const name = event.target.value.trim().split('/').pop();
    container.querySelector('[data-repo-name]').textContent = name || 'the catalog from step 1';
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
    if (event.target.closest('[data-share-setup]')) { shareSetupLink(container, device); return; }
    if (event.target.closest('[data-needs-details]')) {
      event.preventDefault();
      actions.setDevice({ needsDetails: true, medium: 'physical', status: 'owned', filtersOpen: true });
      actions.go('#/');
      return;
    }
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

// "Share setup link": the phone's share sheet where there is one (feature
// check: the Web Share API is missing in some desktop browsers), else the
// clipboard, else the link shown in a box to copy by hand.
async function shareSetupLink(container, device) {
  const result = container.querySelector('[data-share-result]');
  const link = setupLink(location.href.split('#')[0], { repo: device.syncRepo, key: device.syncKey, googleBooksKey: device.googleBooksKey });
  if (navigator.share) {
    try {
      await navigator.share({ title: 'My Loci Library', text: 'Open this on the other device to connect it to our catalog:', url: link });
      result.textContent = 'Sent. Open the link on the other device; it connects by itself.';
      return;
    } catch (error) {
      if (error.name === 'AbortError') return; // the share sheet was closed: nothing to do
    }
  }
  const copied = navigator.clipboard ? await navigator.clipboard.writeText(link).then(() => true, () => false) : false;
  if (copied) {
    result.textContent = 'Link copied. Paste it into a text or email to the other device, and open it there.';
    return;
  }
  const box = container.querySelector('[data-share-box]');
  box.value = link;
  box.hidden = false;
  box.select();
  result.textContent = 'Copy this link, send it to the other device, and open it there.';
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
