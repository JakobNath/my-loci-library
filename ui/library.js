// The Library screen: physical books by default, Logos one tap away, in a
// cover grid or a list, sorted by any field, filtered, and with saved views
// one tap away. Also shows search results
// while the search box has text.

import { escapeHtml } from '../core/html.js';
import { SORTS, VIEW_DEFAULTS, viewEntries, searchEntries, searchPieces, filterChoices } from '../core/library.js';
import { STATUSES } from '../core/records.js';
import { matchesSearch } from '../core/search.js';
import { coverHtml, dateLineHtml, badgesHtml } from './pieces.js';
import { iconHtml } from './icons.js';
import { showLongList } from './long-list.js';
import { fillImages } from './images.js';

const MEDIUMS = [['physical', 'Physical'], ['logos', 'Logos'], ['all', 'All']];
const TILE_WIDTH = { small: 110, medium: 150, large: 200 };

function tileHtml(entry, style) {
  return `<a class="tile${entry.owned ? '' : ' is-gone'}" href="#/book/${escapeHtml(entry.id)}">${coverHtml(entry)}`
    + `<span class="tile-caption"><span class="tile-title">${escapeHtml(entry.edition.title)}</span>`
    + `<span class="tile-author">${escapeHtml(entry.authorLine)}</span><span class="tile-date">${dateLineHtml(entry, style)}</span></span></a>`;
}

function rowHtml(entry, style) {
  return `<a class="row${entry.owned ? '' : ' is-gone'}" href="#/book/${escapeHtml(entry.id)}">${coverHtml(entry, 's')}`
    + `<span class="row-main"><span class="row-title">${escapeHtml(entry.edition.title)}</span>`
    + `<span class="row-author">${escapeHtml(entry.authorLine)} ${badgesHtml(entry)}</span></span>`
    + `<span class="row-date">${dateLineHtml(entry, style)}</span></a>`;
}

// The parts of a view kept on this device (edges/device.js); a saved view holds the same.
const VIEW_KEYS = Object.keys(VIEW_DEFAULTS);
const FILTER_KEYS = ['status', 'location', 'category', 'tag', 'needsDate', 'needsDetails'];
const STATUS_CHOICES = [['owned', 'Owned'], ['gone', 'No longer owned'], ['all', 'Any status'],
  ...STATUSES.filter(status => status !== 'owned').map(status => [status, `Only ${status}`])];

const currentView = from => Object.fromEntries(VIEW_KEYS.map(key => [key, from[key] ?? VIEW_DEFAULTS[key]]));
const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sameView = (a, b) => VIEW_KEYS.every(key => sameValue(a[key] ?? VIEW_DEFAULTS[key], b[key] ?? VIEW_DEFAULTS[key]));
const filterCount = view => FILTER_KEYS.filter(key => !sameValue(view[key], VIEW_DEFAULTS[key])).length;

function optionsHtml(choices, chosen) {
  return choices.map(([value, label]) => `<option value="${escapeHtml(value)}"${value === chosen ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

// The filter panel. Its choices are worked out only while it is open, so the
// Library opens as fast as before.
function filtersHtml(entries, view, savedViews) {
  const choices = filterChoices(entries);
  const locationHtml = optionsHtml([['[]', 'Anywhere'], ...choices.locations.map(path => [JSON.stringify(path), path.join(' › ')])], JSON.stringify(view.location));
  const categoryHtml = optionsHtml([['', 'Any category'], ...choices.categories.map(name => [name, name])], view.category);
  const tagHtml = optionsHtml([['', 'Any tag'], ...choices.tags.map(name => [name, name])], view.tag);
  const statusHtml = optionsHtml(STATUS_CHOICES, view.status);
  const saved = savedViews.find(item => sameView(item, view));
  const saveHtml = saved
    ? `<button class="btn" data-action="forgetView" data-value="${escapeHtml(saved.name)}">Remove the saved view “${escapeHtml(saved.name)}”</button>`
    : '<input id="viewName" aria-label="Name for this view" placeholder="Name this view" autocomplete="off"><button class="btn" data-action="saveView">Save view</button>';
  return `<div class="filters" hidden>
      <label class="field"><span>Location</span><select data-filter="location">${locationHtml}</select></label>
      <label class="field"><span>Category</span><select data-filter="category">${categoryHtml}</select></label>
      <label class="field"><span>Tag</span><select data-filter="tag">${tagHtml}</select></label>
      <label class="field"><span>Status</span><select data-filter="status">${statusHtml}</select></label>
      <label class="check"><input type="checkbox" data-filter="needsDate"${view.needsDate ? ' checked' : ''}> Needs an original date</label>
      <label class="check"><input type="checkbox" data-filter="needsDetails"${view.needsDetails ? ' checked' : ''}> Needs details (publisher, year, pages, binding)</label>
      <div class="filter-actions"><button class="btn" data-action="clearFilters">Clear filters</button>${saveHtml}</div>
    </div>`;
}

/**
 * Draw the Library screen.
 * @returns {() => void} cleanup for the long list
 */
export function render(container, state, actions) {
  const { device, library, settings } = state;
  // The shared default sort, and Logos shown or not, until this device chooses otherwise.
  const view = currentView({ sort: settings.defaultSort.library, medium: device.showLogos ? 'all' : 'physical', ...device });
  const savedViews = settings.views || [];
  const entries = viewEntries(library.entries, view, { anthologies: settings.anthologiesInShelfLists });
  const physicalCount = library.entries.filter(entry => entry.owned && !entry.isDigital).length;
  const filters = filterCount(view);
  const mediumsHtml = MEDIUMS.map(([value, label]) => `<button class="${value === view.medium ? 'is-on' : ''}" aria-pressed="${value === view.medium}" data-action="medium" data-value="${value}">${escapeHtml(label)}</button>`).join('');
  const viewsHtml = savedViews.map((item, i) => `<button class="chip${sameView(item, view) ? ' is-on' : ''}" data-action="useView" data-value="${i}">${escapeHtml(item.name)}</button>`).join('');
  const sortHtml = Object.entries(SORTS).map(([key, sort]) => `<option value="${key}"${key === view.sort ? ' selected' : ''}>${escapeHtml(sort.label)}</option>`).join('');
  const viewHtml = ['grid', 'list'].map(kind => `<button data-action="view" data-value="${kind}" class="${device.view === kind ? 'is-on' : ''}" aria-pressed="${device.view === kind}" aria-label="${kind === 'grid' ? 'Covers' : 'List'}">${iconHtml(kind)}</button>`).join('');
  const countHtml = escapeHtml(`${physicalCount} books on the shelves${library.entries.length ? '' : ' · nothing added yet'}${filters ? ` · ${entries.length} shown` : ''}`);
  const filterCountHtml = filters ? `<span class="count-badge" aria-label="${escapeHtml(`${filters} on`)}">${escapeHtml(String(filters))}</span>` : '';
  const savedViewsHtml = viewsHtml ? `<div class="chips saved-views" aria-label="Saved views">${viewsHtml}</div>` : '';
  const panelHtml = device.filtersOpen ? filtersHtml(library.entries, view, savedViews) : '';
  container.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">Library</h1>
      <p class="page-meta">${countHtml}</p>
    </div>
    ${savedViewsHtml}
    <div class="toolbar">
      <div class="segmented" role="group" aria-label="Which books">${mediumsHtml}</div>
      <div class="controls">
        <label class="sort-box">${iconHtml('sort')}<span class="visually-hidden">Sort by</span><select id="sort" data-filter="sort">${sortHtml}</select></label>
        <button class="tool-button${filters || device.filtersOpen ? ' is-on' : ''}" data-action="filtersOpen" aria-expanded="${device.filtersOpen ? 'true' : 'false'}">${iconHtml('filter')}<span>Filter</span>${filterCountHtml}</button>
        <div class="segmented is-icons" role="group" aria-label="View">${viewHtml}<a href="#/shelves" aria-label="Shelves">${iconHtml('shelf')}</a></div>
      </div>
    </div>
    ${panelHtml}
    <div id="books"></div>`;
  container.onclick = event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, value } = button.dataset;
    if (action === 'filtersOpen') actions.setDevice({ filtersOpen: !device.filtersOpen });
    else if (action === 'clearFilters') actions.setDevice(Object.fromEntries(FILTER_KEYS.map(key => [key, VIEW_DEFAULTS[key]])));
    else if (action === 'useView') actions.setDevice(currentView(savedViews[Number(value)]));
    else if (action === 'saveView') {
      const input = container.querySelector('#viewName');
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      actions.saveSettings({ views: [...savedViews.filter(item => item.name !== name), { name, ...view }] });
    } else if (action === 'forgetView') actions.saveSettings({ views: savedViews.filter(item => item.name !== value) });
    else actions.setDevice({ [action]: value });
  };
  container.onchange = event => {
    const key = event.target.dataset.filter;
    if (!key) return;
    const { value, checked } = event.target;
    actions.setDevice({ [key]: event.target.type === 'checkbox' ? checked : key === 'location' ? JSON.parse(value) : value });
  };
  // The panel's styles load with the later screens' stylesheet (start-up size); it shows once they are in.
  // (The screen may have been redrawn by then, so the panel is looked up afresh.)
  if (device.filtersOpen) {
    actions.loadScreenStyles().then(() => {
      const panel = container.querySelector('.filters');
      if (panel) panel.hidden = false;
    });
  }
  const books = container.querySelector('#books');
  if (!entries.length) {
    books.innerHTML = library.entries.length
      ? '<p class="empty">No books match these filters.</p>'
      : '<p class="empty">No books here yet. Add one with the Add tab, or <a class="link" href="#/settings">connect this device to your catalog</a> in Settings › Sync.</p>';
    return () => {};
  }
  const grid = device.view === 'grid';
  return showLongList(books, entries.length, {
    itemHtml: i => (grid ? tileHtml(entries[i], settings.dateStyle) : rowHtml(entries[i], settings.dateStyle)),
    minWidth: grid ? TILE_WIDTH[device.coverSize] || TILE_WIDTH.medium : 0,
    className: grid ? 'grid' : 'list',
    onDraw: rows => fillImages(rows, actions.imageUrl),
  });
}

/** Search results, drawn in place of the screen while the search box has text. */
export function renderSearch(container, state, actions) {
  const results = searchEntries(state.library, state.query);
  const wishes = state.library.wishlist.filter(wish => matchesSearch(wish.searchText, state.query)).map(wish => wish.item);
  const total = results.length + wishes.length;
  const countHtml = escapeHtml(`${total ? `${total} found` : 'Nothing found'}${results.length >= 50 ? ' · showing the first 50' : ''}`);
  const resultsHtml = results.map(entry => rowHtml(entry, state.settings.dateStyle)).join('');
  // A wishlist item has its own cover, drawn like a book's.
  const wishCoverHtml = item => coverHtml({ id: item.id, owned: true, isWish: true, edition: { title: item.title, images: item.images }, authorLine: item.authors.join(', ') }, 's');
  const wishesHtml = wishes.map(item => `<a class="row" href="#/wishlist">${wishCoverHtml(item)}<span class="row-main"><span class="row-title">${escapeHtml(item.title)}</span>`
    + `<span class="row-author">${escapeHtml(item.authors.join(', '))} <span class="badge badge-wish">Wishlist</span></span></span><span></span></a>`).join('');
  // Pieces inside books (poems, hymns, sermons) stay folded under the results, so everyday searches stay plain.
  const inside = searchPieces(state.library, state.query);
  const insideHtml = inside.length ? `<details class="block"><summary>${escapeHtml(`Also inside books: ${inside[0].piece.title} — ${inside[0].entry.edition.title}${inside.length > 1 ? `, and ${inside.length - 1} more` : ''}`)}</summary>`
    + inside.map(hit => `<a class="row" href="#/book/${escapeHtml(hit.entry.id)}"><span class="row-main"><span class="row-title">${escapeHtml(hit.piece.title)}</span><span class="row-author">${escapeHtml(`in ${hit.entry.edition.title}`)}</span></span></a>`).join('') + '</details>' : '';
  container.innerHTML = `<div class="page-head"><h1 class="page-title">Search</h1><p class="page-meta">${countHtml}</p></div>
    <div class="list">${resultsHtml}${wishesHtml}</div>${insideHtml}`;
  fillImages(container, actions.imageUrl);
}
