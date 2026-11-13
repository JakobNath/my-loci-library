// The app's starting point. This file holds the app's top-level state (the
// one global the code style allows), turns the address after "#" into a
// screen, and hands each screen the actions it may take. Screens never touch
// storage directly; edges never draw.

import { openStorage, askForPersistentStorage } from './edges/storage.js';
import { readDeviceSettings, saveDeviceSettings } from './edges/device.js';
import { buildLibrary, withSearchText } from './core/library.js';
import { makeId } from './core/ids.js';
import { withField } from './core/records.js';
import { escapeHtml } from './core/html.js';
import { SHARED_DEFAULTS, withDefaults, isAnotherCatalog, readSetupLink } from './core/settings.js';
import { iconHtml, LOGO_HTML } from './ui/icons.js';
import * as libraryScreen from './ui/library.js';
import * as bookScreen from './ui/book.js';


const state = {
  records: new Map(), // every record on this device, by ID
  library: buildLibrary([]),
  device: readDeviceSettings(),
  settings: SHARED_DEFAULTS,
  route: { name: 'library', id: '' },
  query: '',
  storageNote: '',
  backupStatus: null, // backup-status.json from the laptop's loci-backup, once synced
  offlineReady: false,
  batchLocation: [], // the shelf being filled in batch add, kept while the app is open
  batchSet: null, // the set being added in batch add ("Adding a set"), kept the same way
  syncStatus: '', // what the last sync did, in words
  unsent: 0, // changes made here and not yet sent to GitHub
};
const imageUrls = new Map(); // image file key → address of the picture held in memory
let storage = null;
let stopScreen = () => {};

const screen = document.getElementById('screen');
const search = document.getElementById('search');
const note = document.getElementById('note');

// ---------- routes ----------

// Screens other than the Library and a book's page (Add, the entry form, the
// shelf view, Wishlist, Settings, Value, a set's page) load the first time they are opened,
// with their stylesheet, so opening the app stays fast (PLAN.md, "Small and
// fast"; the exception to the code style is recorded in HOW_IT_WORKS.md).
let screenStyles = null;
function loadScreenStyles() {
  screenStyles = screenStyles || new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/screens.css';
    link.onload = link.onerror = resolve; // a missing stylesheet never stops the screen
    document.head.append(link);
  });
  return screenStyles;
}

function screenLoadedWhenOpened(load) {
  return (container, current, given) => {
    let stop = () => {};
    let left = false;
    container.innerHTML = '<p class="empty">Opening…</p>';
    Promise.all([load(), loadScreenStyles()]).then(([screenModule]) => {
      if (!left) stop = screenModule.render(container, current, given) || stop;
    }).catch(error => {
      container.innerHTML = '';
      showNote(`This screen could not be loaded (${error.message}). Check the connection once; after that it works offline.`);
    });
    return () => { left = true; stop(); };
  };
}
const renderAddScreen = screenLoadedWhenOpened(() => import('./ui/add.js'));
const renderEditScreen = screenLoadedWhenOpened(() => import('./ui/edit.js'));
const renderShelfScreen = screenLoadedWhenOpened(() => import('./ui/shelf.js'));
const renderWishlistScreen = screenLoadedWhenOpened(() => import('./ui/wishlist.js'));
const renderSettingsScreen = screenLoadedWhenOpened(() => import('./ui/settings.js'));
const renderValueScreen = screenLoadedWhenOpened(() => import('./ui/value.js'));
const renderSetScreen = screenLoadedWhenOpened(() => import('./ui/set.js'));

const ROUTES = {
  '': libraryScreen.render,
  book: bookScreen.render,
  shelves: renderShelfScreen,
  shelf: renderShelfScreen,
  wishlist: renderWishlistScreen,
  settings: renderSettingsScreen,
  value: renderValueScreen,
  set: renderSetScreen,
  add: renderAddScreen,
  new: renderEditScreen,
  edit: renderEditScreen,
};


function readRoute() {
  const [name = '', ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: name in ROUTES ? name : '', id: rest.join('/') };
}

const TABS = [['', 'library', 'Library'], ['wishlist', 'wishlist', 'Wishlist'], ['add', 'add', 'Add'], ['settings', 'settings', 'Settings']];

function tabsHtml(current) {
  const section = current === 'book' || current === 'shelves' || current === 'shelf' ? '' : current === 'edit' || current === 'new' ? 'add' : current === 'value' ? 'settings' : current;
  return TABS.map(([name, icon, label]) => `<a class="tab${name === 'add' ? ' tab-add' : ''}${name === section ? ' is-on' : ''}" href="#/${name}"${name === section ? ' aria-current="page"' : ''}>${iconHtml(icon)}<span>${escapeHtml(label)}</span></a>`).join('');
}

// ---------- drawing ----------

function applyTheme() {
  if (state.device.theme === 'device') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = state.device.theme;
}

/** Draw the current screen (or search results while the search box has text). */
function render() {
  stopScreen();
  stopScreen = () => {};
  applyTheme();
  document.getElementById('tabs').innerHTML = tabsHtml(state.route.name);
  screen.onclick = null;
  screen.onchange = null;
  screen.oninput = null;
  screen.onsubmit = null;
  if (state.query.trim()) {
    libraryScreen.renderSearch(screen, state, actions);
    return;
  }
  const stop = ROUTES[state.route.name](screen, state, actions);
  if (typeof stop === 'function') stopScreen = stop;
}

function showNote(text, buttonLabel, onButton) {
  const buttonHtml = buttonLabel ? `<button type="button">${escapeHtml(buttonLabel)}</button>` : '';
  note.innerHTML = `<span>${escapeHtml(text)}</span>${buttonHtml}`;
  note.hidden = false;
  if (onButton) note.querySelector('button').onclick = onButton;
  else setTimeout(() => { note.hidden = true; }, 4000);
}

// ---------- actions the screens may take ----------

const now = () => new Date().toISOString().slice(0, 19) + 'Z';

const actions = {
  now,
  today: () => now().slice(0, 10),
  newId: () => makeId(crypto.getRandomValues(new Uint8Array(12))),

  /**
   * Change shared settings (PLAN.md, "Settings", "Shared"); they go to the data
   * repository's settings.json. With redraw false the screen is left as it is.
   */
  async saveSettings(changes, { redraw = true } = {}) {
    state.settings = { ...state.settings, ...changes };
    if (redraw) render();
    if (!storage) return;
    await storage.saveMeta('settings', state.settings);
    await storage.saveMeta('settingsUnsent', true);
    syncSoon();
  },

  setDevice(changes) {
    state.device = { ...state.device, ...changes };
    saveDeviceSettings(state.device);
    render();
  },

  /**
   * Save new or changed records here, and queue them for the next sync.
   * With `soon`, the library is rebuilt just after, so batch add is ready
   * for the next book at once (PLAN.md: within about 200 ms).
   */
  async saveRecords(records, { soon = false } = {}) {
    try {
      await storage.saveRecords(records, { toOutbox: true });
    } catch (error) {
      showNote(error.message);
      return false;
    }
    for (const record of records) state.records.set(record.id, record);
    const rebuild = () => { state.library = withSearchText(buildLibrary([...state.records.values()])); };
    if (soon) setTimeout(rebuild, 0);
    else rebuild();
    syncSoon();
    return true;
  },

  /** Keep the files of one image: thumbnail, detail image and (for our photos) master. */
  async saveImageFiles(id, files) {
    try {
      await storage.saveImage(`${id}/thumb`, files.thumb);
      await storage.saveImage(`${id}/detail`, files.detail);
      if (files.master) await storage.saveImage(`${id}/master`, files.master);
      await storage.saveMeta('imageOutbox', [...((await storage.meta('imageOutbox')) || []), id]);
    } catch (error) {
      showNote(error.message);
    }
  },

  /** Add an image to an edition: a cover goes first, so it is the one shown. */
  async addImage(editionId, image) {
    const edition = state.records.get(editionId);
    if (!edition) return;
    const images = image.kind === 'cover' ? [image, ...edition.images.filter(other => other.kind !== 'cover' || other.source === 'photo')] : [...edition.images, image];
    await actions.saveRecords([withField(edition, 'images', images, now())], { soon: true });
  },

  /** The address of a stored picture ("<image id>/thumb"), or null if this device does not have it. */
  async imageUrl(key) {
    if (!imageUrls.has(key)) {
      let blob = storage ? await storage.image(key) : null;
      // Not on this device yet: fetch it from the data repository once, and keep it.
      const github = !blob && navigator.onLine ? await syncConnection() : null;
      if (github) {
        const [id, size] = key.split('/');
        blob = await github.image(`images/${size}/${id}.jpg`).catch(() => null);
        if (blob) await storage.saveImage(key, blob).catch(() => {});
      }
      imageUrls.set(key, blob ? URL.createObjectURL(blob) : null);
    }
    return imageUrls.get(key);
  },

  /**
   * Connect this device to a data repository, then download it (Settings › Sync).
   * Moving to another repository empties this device's copy first, after
   * asking, so the old catalog's records are never sent to the new one.
   */
  async connectSync(repo, key) {
    const syncRepo = repo.trim();
    const syncKey = key.trim();
    if (syncing) { showNote('A sync is running. Try again in a moment.'); return; }
    if (storage && isAnotherCatalog(state.device.syncRepo, syncRepo)) {
      if (!(await emptyForAnotherCatalog(syncRepo, syncKey))) return;
    }
    state.device = { ...state.device, syncRepo, syncKey };
    saveDeviceSettings(state.device);
    try {
      await (await syncConnection()).check();
    } catch (error) {
      state.syncStatus = error.message;
      render();
      return;
    }
    await syncNow({ quiet: false });
  },
  syncNow: () => syncNow({ quiet: false }),

  setBatchLocation(parts) {
    state.batchLocation = parts;
  },
  setBatchSet(set) {
    state.batchSet = set;
  },

  /** Change some fields of an edition, as from the cite toggle. */
  async saveEdition(id, changes) {
    let record = state.records.get(id);
    for (const [name, value] of Object.entries(changes)) record = withField(record, name, value, now());
    if (await actions.saveRecords([record])) render();
  },

  showNote,
  loadScreenStyles,
  go(hash) {
    location.hash = hash;
  },
};

// ---------- sync with GitHub (PLAN.md, "Sync") ----------

let syncing = false;
let syncTimer = null;

// The sync module loads just after the first screen appears, the first time
// it is needed, so opening the app stays fast (HOW_IT_WORKS.md, "Decisions").
async function syncConnection() {
  const { syncRepo, syncKey } = state.device;
  if (!syncRepo || !syncKey) return null;
  const { connectToGitHub } = await import('./edges/sync-github.js');
  return connectToGitHub({ repo: syncRepo, key: syncKey });
}

// What the sync code in sync-run.js may use of the app.
const lentToSync = () => ({ state, storage, render, showNote, showUnsent });

/**
 * Before moving to another repository: check and ask (sync-run.js), then
 * empty this device's copy. The old catalog stays on GitHub; keys and device
 * settings stay here. Returns whether to go on connecting.
 */
async function emptyForAnotherCatalog(syncRepo, syncKey) {
  const { mayMoveToAnotherCatalog } = await import('./sync-run.js');
  if (!(await mayMoveToAnotherCatalog(lentToSync(), syncRepo, syncKey))) return false;
  // No sync may run while emptying: it would download the old catalog again.
  clearTimeout(syncTimer);
  syncing = true;
  try {
    await storage.clearCatalog();
  } catch (error) {
    showNote(error.message);
    return false;
  } finally {
    syncing = false;
  }
  for (const url of imageUrls.values()) if (url) URL.revokeObjectURL(url);
  imageUrls.clear();
  state.records = new Map();
  state.library = buildLibrary([]);
  state.settings = SHARED_DEFAULTS;
  state.backupStatus = null;
  state.unsent = 0;
  showUnsent();
  return true;
}

// A sync a few seconds after the last save, so a stack of books goes up as one commit.
function syncSoon() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow(), 5000);
  showUnsent();
}

async function showUnsent() {
  if (!storage) return;
  state.unsent = (await storage.outbox()).length;
  const badge = document.getElementById('syncBadge');
  badge.textContent = syncing ? 'Syncing…' : `${state.unsent} unsent`;
  badge.hidden = !syncing && !state.unsent;
}

/**
 * Bring this device and GitHub up to date (sync-run.js), unless a sync is
 * already running or the device is offline.
 */
async function syncNow({ quiet = true } = {}) {
  const github = await syncConnection();
  if (!github || !storage || syncing) return;
  if (!navigator.onLine) { state.syncStatus = 'Offline: changes are kept on this device and sent later.'; return; }
  syncing = true;
  showUnsent();
  try {
    const { runSync } = await import('./sync-run.js');
    await runSync(lentToSync(), github, quiet);
  } catch (error) {
    // runSync explains its own failures; this is the file itself not loading.
    state.syncStatus = `The sync code did not load: ${error.message}`;
  } finally {
    syncing = false;
    showUnsent();
  }
}

addEventListener('online', () => syncNow());

// ---------- starting up ----------

/**
 * A setup link from another device (Settings › Advanced › Sync, "Share setup
 * link") connects this one. The keys are taken out of the address at once,
 * so they stay neither on screen nor in the browser's history.
 * Returns whether the address was a setup link.
 */
function takeSetupLink() {
  const setup = readSetupLink(location.hash);
  if (!setup) return false;
  history.replaceState(null, '', '#/settings/advanced');
  state.route = readRoute();
  if (setup.googleBooksKey) {
    state.device = { ...state.device, googleBooksKey: setup.googleBooksKey };
    saveDeviceSettings(state.device);
  }
  render();
  actions.connectSync(setup.repo, setup.key);
  return true;
}

addEventListener('hashchange', () => {
  if (takeSetupLink()) return;
  state.route = readRoute();
  state.query = '';
  search.value = '';
  render();
  scrollTo(0, 0);
});

// The search box is never redrawn while typing; only the results below it
// are. A search takes a few milliseconds, so it runs on every keystroke.
search.addEventListener('input', () => {
  state.query = search.value;
  render();
});

async function start() {
  document.getElementById('brandMark').innerHTML = LOGO_HTML;
  state.route = readRoute();
  try {
    storage = await openStorage();
    const records = await storage.allRecords();
    for (const record of records) state.records.set(record.id, record);
    state.library = buildLibrary(records, { searchText: false });
    const shared = await storage.meta('settings');
    if (shared) state.settings = withDefaults(shared);
    state.backupStatus = await storage.meta('backupStatus');
  } catch (error) {
    state.storageNote = error.message;
    showNote(error.message);
  }
  render();
  // The search text is built just after the first screen appears; a search
  // typed before then still works, only a little more slowly.
  setTimeout(() => { state.library = withSearchText(state.library); }, 0);
  // Once the screen is up, fold many separate changes into the snapshot,
  // so the next start stays fast (edges/storage.js).
  if (storage) setTimeout(async () => {
    try {
      if ((await storage.changedCount()) > 200) await storage.compact();
    } catch (error) {
      state.storageNote = error.message;
    }
  }, 3000);
  askForPersistentStorage().then(kept => {
    state.storageNote = kept ? 'This device keeps the catalog even when space runs low.' : 'The browser may clear the catalog if space runs low; it is downloaded again from GitHub if so.';
  });
  registerServiceWorker();
  showUnsent();
  if (!takeSetupLink()) syncNow();
  remindAboutArchive();
}

// The yearly reminder to save a full archive (PLAN.md, "Backups"), at most
// once a week until it is done. Its code loads only when there is a status.
async function remindAboutArchive() {
  const shown = storage && await storage.meta('archiveReminderShown');
  if (!state.backupStatus || (shown && Date.parse(actions.today()) - Date.parse(shown) < 7 * 86400000)) return;
  const { archiveReminder } = await import('./core/backup-status.js');
  const text = archiveReminder(state.backupStatus, actions.today());
  if (!text) return;
  showNote(text, 'Got it', () => { note.hidden = true; });
  storage.saveMeta('archiveReminderShown', actions.today());
}

// The service worker keeps the app working offline and fetches new versions
// in the background. Feature check: older browsers simply run online only.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // While developing on this computer, cached files would hide each edit;
  // add ?sw to the address to test offline use locally.
  if (['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw')) return;
  // Tell the person once the app is stored on this device, so they know it
  // will open with no connection.
  navigator.serviceWorker.ready.then(() => {
    state.offlineReady = true;
    if (!state.device.offlineNoticeShown) {
      showNote('Ready to use offline');
      state.device = { ...state.device, offlineNoticeShown: true };
      saveDeviceSettings(state.device);
    }
  });
  navigator.serviceWorker.register('sw.js').then(registration => {
    const offer = worker => showNote('New version', 'Reload', () => worker.postMessage('activate'));
    if (registration.waiting && navigator.serviceWorker.controller) offer(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
      });
    });
  }).catch(error => {
    state.storageNote = `Offline use is not available in this browser (${error.message}).`;
  });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) { reloading = true; location.reload(); }
  });
}

start();
