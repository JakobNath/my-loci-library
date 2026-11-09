// The shelf view: the locations we use, and for one shelf its books as
// spines in shelf order (docs/plan/DESIGN.md, "Drawn spines"). Sizes come
// from core/sizes.js; nothing here reads an image.

import { escapeHtml } from '../core/html.js';
import { estimateSize } from '../core/sizes.js';
import { iconHtml } from './icons.js';

const SHELF_HEIGHT = 200; // pixels for a 26 cm book, roughly; taller books are capped
const PIXELS_PER_MM = (SHELF_HEIGHT * 0.92) / 260;
const MIN_WIDTH = 16; // drawn spines stay wide enough to read

// Lettering is measured, so a title is shortened only when it truly does not fit.
const ruler = document.createElement('canvas').getContext('2d');
function fits(text, size, length) {
  ruler.font = `400 ${size}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-display')}`;
  return ruler.measureText(text).width <= length;
}
function letteringHtml(text, width, length, maxSize, className) {
  for (let size = Math.min(maxSize, width - 4); size >= 8.5; size -= 0.5) {
    if (fits(text, size, length)) return `<span class="spine-text ${className}" style="font-size:${size}px">${escapeHtml(text)}</span>`;
  }
  let cut = text;
  while (cut.length > 1 && !fits(cut + '…', 8.5, length)) cut = cut.slice(0, -1);
  return `<span class="spine-text ${className}" style="font-size:8.5px">${escapeHtml(cut.trimEnd() + '…')}</span>`;
}

function spineHtml(entry, copy, related) {
  const size = estimateSize(entry.edition, { binding: copy.binding, related });
  const height = Math.min(SHELF_HEIGHT, Math.round(size.height.mm * PIXELS_PER_MM));
  const width = Math.max(MIN_WIDTH, Math.round(size.thickness.mm * PIXELS_PER_MM));
  const cover = entry.edition.images.find(image => image.kind === 'cover' && image.color);
  const foot = entry.edition.volume || entry.edition.seriesNumber || (entry.authors[0] && entry.authors[0].name.split(' ').pop()) || '';
  const title = `${entry.edition.title} · ${size.height.mm / 10} cm (${size.height.source}), ${size.thickness.mm} mm (${size.thickness.source})`;
  return `<a class="spine${cover ? ' has-color' : ''}" href="#/book/${escapeHtml(entry.id)}" title="${escapeHtml(title)}" style="width:${width}px;height:${height}px${cover ? `;border-color:${escapeHtml(cover.color)}` : ''}">`
    + `<span class="spine-box" style="top:5%;bottom:${foot ? 26 : 5}%">${letteringHtml(entry.edition.title, width, height * (foot ? 0.69 : 0.9) - 4, 11, '')}</span>`
    + (foot ? `<span class="spine-box" style="bottom:5%;height:18%">${letteringHtml(String(foot), width, height * 0.18 - 4, 9.5, 'spine-foot')}</span>` : '')
    + '</a>';
}

/** The list of shelves, or one shelf when the route names it. */
export function render(container, state) {
  const copies = [];
  for (const entry of state.library.entries) {
    for (const copy of entry.copies) if (copy.status === 'owned' && copy.location.length) copies.push({ entry, copy });
  }
  const path = state.route.id ? decodeURIComponent(state.route.id) : '';
  if (!path) {
    const counts = new Map();
    for (const { copy } of copies) counts.set(copy.location.join(' › '), (counts.get(copy.location.join(' › ')) || 0) + 1);
    const shelvesHtml = [...counts].sort().map(([name, count]) => `<a class="row" href="#/shelf/${encodeURIComponent(name)}"><span>${iconHtml('shelf')}</span>`
      + `<span class="row-main"><span class="row-title">${escapeHtml(name)}</span></span><span class="row-date">${count}</span></a>`).join('');
    container.innerHTML = `<a class="back" href="#/">${iconHtml('back')} Library</a><div class="page-head"><h1 class="page-title">Shelves</h1></div>`
      + `<div class="list">${shelvesHtml || '<p class="empty">No books have a location yet.</p>'}</div>`;
    return;
  }
  const here = copies.filter(({ copy }) => copy.location.join(' › ') === path);
  // Shelf order first; copies without one follow in title order (DATA_FORMAT.md, "Shelf order").
  here.sort((a, b) => (a.copy.shelfOrder && b.copy.shelfOrder ? (a.copy.shelfOrder < b.copy.shelfOrder ? -1 : 1)
    : a.copy.shelfOrder ? -1 : b.copy.shelfOrder ? 1 : a.entry.edition.title.localeCompare(b.entry.edition.title)));
  const editions = state.library.entries.map(entry => entry.edition);
  const spinesHtml = here.map(({ entry, copy }) => spineHtml(entry, copy, editions)).join('');
  container.innerHTML = `<a class="back" href="#/shelves">${iconHtml('back')} Shelves</a>`
    + `<div class="page-head"><h1 class="page-title">${escapeHtml(path)}</h1><p class="page-meta">${escapeHtml(`${here.length} books`)}</p></div>`
    + `<div class="shelf">${spinesHtml}</div>`;
}
