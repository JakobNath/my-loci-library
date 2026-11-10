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
import { iconHtml, LOGO_HTML } from './ui/icons.js';
import * as libraryScreen from './ui/library.js';
import * as bookScreen from './ui/book.js';
import * as shelfScreen from './ui/shelf.js';
import * as wishlistScreen from './ui/wishlist.js';
import * as settingsScreen from './ui/settings.js';

// Shared settings until sync brings settings.json (DATA_FORMAT.md, "settings.json").
const SHARED_DEFAULTS = {
  dateStyle: 'AD',
  currency: '$',
  bindings: ['Hardcover', 'Hardcover with dust jacket', 'Paperback', 'Mass-market paperback', 'Leather', 'Bonded leather', 'Cloth', 'Library binding', 'Journal issue'],
};

const state = {
  records: new Map(), // every record on this device, by ID
  library: buildLibrary([]),
  device: readDeviceSettings(),
  settings: SHARED_DEFAULTS,
  route: { name: 'library', id: '' },
  query: '',
  storageNote: '',
  offlineReady: false,
  batchLocation: [], // the shelf being filled in batch add, kept while the app is open
};
const imageUrls = new Map(); // image file key → address of the picture held in memory
let storage = null;
let stopScreen = () => {};

const screen = document.getElementById('screen');
const search = document.getElementById('search');
const note = document.getElementById('note');

// ---------- routes ----------

// Screens used only when adding or editing books (batch add with the scan
// camera and lookups, and the full entry form) load the first time they are
// opened, so opening the app stays fast (PLAN.md, "Small and fast"; the
// exception to the code style is recorded in HOW_IT_WORKS.md).
function screenLoadedWhenOpened(load) {
  return (container, current, given) => {
    let stop = () => {};
    let left = false;
    container.innerHTML = '<p class="empty">Opening…</p>';
    load().then(screenModule => {
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

const ROUTES = {
  '': libraryScreen.render,
  book: bookScreen.render,
  shelves: shelfScreen.render,
  shelf: shelfScreen.render,
  wishlist: wishlistScreen.render,
  settings: settingsScreen.render,
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
  const section = current === 'book' || current === 'shelves' || current === 'shelf' ? '' : current === 'edit' || current === 'new' ? 'add' : current;
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
    libraryScreen.renderSearch(screen, state);
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
    return true;
  },

  /** Keep the files of one image: thumbnail, detail image and (for our photos) master. */
  async saveImageFiles(id, files) {
    try {
      await storage.saveImage(`${id}/thumb`, files.thumb);
      await storage.saveImage(`${id}/detail`, files.detail);
      if (files.master) await storage.saveImage(`${id}/master`, files.master);
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
      const blob = storage ? await storage.image(key) : null;
      imageUrls.set(key, blob ? URL.createObjectURL(blob) : null);
    }
    return imageUrls.get(key);
  },

  setBatchLocation(parts) {
    state.batchLocation = parts;
  },

  /** Change some fields of an edition, as from the cite toggle. */
  async saveEdition(id, changes) {
    let record = state.records.get(id);
    for (const [name, value] of Object.entries(changes)) record = withField(record, name, value, now());
    if (await actions.saveRecords([record])) render();
  },

  showNote,
  go(hash) {
    location.hash = hash;
  },
};

// ---------- starting up ----------

addEventListener('hashchange', () => {
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
    if (shared) state.settings = { ...SHARED_DEFAULTS, ...shared };
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
