// The Library screen: physical books by default, Logos one tap away, in a
// cover grid or a list, sorted by any field. Also shows search results
// while the search box has text.

import { escapeHtml } from '../core/html.js';
import { SORTS, viewEntries, searchEntries } from '../core/library.js';
import { matchesSearch } from '../core/search.js';
import { coverHtml, dateLineHtml, badgesHtml } from './pieces.js';
import { iconHtml } from './icons.js';
import { showLongList } from './long-list.js';

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

/**
 * Draw the Library screen.
 * @returns {() => void} cleanup for the long list
 */
export function render(container, state, actions) {
  const { device, library, settings } = state;
  const medium = device.medium || 'physical';
  const entries = viewEntries(library.entries, { medium, sort: device.sort });
  const physicalCount = library.entries.filter(entry => entry.owned && !entry.isDigital).length;
  const chipsHtml = MEDIUMS.map(([value, label]) => `<button class="chip${value === medium ? ' is-on' : ''}" data-action="medium" data-value="${value}">${escapeHtml(label)}</button>`).join('');
  const sortHtml = Object.entries(SORTS).map(([key, sort]) => `<option value="${key}"${key === device.sort ? ' selected' : ''}>${escapeHtml(sort.label)}</option>`).join('');
  const viewHtml = ['grid', 'list'].map(view => `<button data-action="view" data-value="${view}" class="${device.view === view ? 'is-on' : ''}" aria-label="${view === 'grid' ? 'Covers' : 'List'}">${iconHtml(view)}</button>`).join('');
  const countHtml = escapeHtml(`${physicalCount} books on the shelves${library.entries.length ? '' : ' · nothing added yet'}`);
  container.innerHTML = `
    <div class="page-head">
      <h1 class="page-title">Library</h1>
      <p class="page-meta">${countHtml}</p>
    </div>
    <div class="toolbar">
      <div class="chips">${chipsHtml}</div>
      <div class="controls">
        <label class="visually-hidden" for="sort">Sort by</label>
        <select id="sort" data-action="sort">${sortHtml}</select>
        <div class="seg" role="group" aria-label="View">${viewHtml}<a href="#/shelves" aria-label="Shelves">${iconHtml('shelf')}</a></div>
      </div>
    </div>
    <div id="books"></div>`;
  container.onclick = event => {
    const button = event.target.closest('[data-action]');
    if (button && button.dataset.action !== 'sort') actions.setDevice({ [button.dataset.action]: button.dataset.value });
  };
  container.onchange = event => {
    if (event.target.dataset.action === 'sort') actions.setDevice({ sort: event.target.value });
  };
  const books = container.querySelector('#books');
  if (!entries.length) {
    books.innerHTML = '<p class="empty">No books here yet. Add one with the + tab.</p>';
    return () => {};
  }
  const grid = device.view === 'grid';
  return showLongList(books, entries.length, {
    itemHtml: i => (grid ? tileHtml(entries[i], settings.dateStyle) : rowHtml(entries[i], settings.dateStyle)),
    minWidth: grid ? TILE_WIDTH[device.coverSize] || TILE_WIDTH.medium : 0,
    className: grid ? 'grid' : 'list',
  });
}

/** Search results, drawn in place of the screen while the search box has text. */
export function renderSearch(container, state) {
  const results = searchEntries(state.library, state.query);
  const wishes = state.library.wishlist.filter(wish => matchesSearch(wish.searchText, state.query)).map(wish => wish.item);
  const total = results.length + wishes.length;
  const countHtml = escapeHtml(`${total ? `${total} found` : 'Nothing found'}${results.length >= 50 ? ' · showing the first 50' : ''}`);
  const resultsHtml = results.map(entry => rowHtml(entry, state.settings.dateStyle)).join('');
  const wishesHtml = wishes.map(item => `<a class="row" href="#/wishlist"><span></span><span class="row-main"><span class="row-title">${escapeHtml(item.title)}</span>`
    + `<span class="row-author">${escapeHtml(item.authors.join(', '))} <span class="badge badge-wish">Wishlist</span></span></span><span></span></a>`).join('');
  container.innerHTML = `<div class="page-head"><h1 class="page-title">Search</h1><p class="page-meta">${countHtml}</p></div>
    <div class="list">${resultsHtml}${wishesHtml}</div>`;
}
