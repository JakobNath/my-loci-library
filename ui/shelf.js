// The shelf view: the locations we use, and for one shelf its books as
// spines in shelf order (docs/plan/DESIGN.md, "Drawn spines"), with Arrange
// to move a book along the shelf. Sizes come from core/sizes.js; nothing
// here reads an image.

import { escapeHtml } from '../core/html.js';
import { estimateSize } from '../core/sizes.js';
import { keysAfterMove } from '../core/shelf-order.js';
import { withField } from '../core/records.js';
import { iconHtml } from './icons.js';
import { fillImages } from './images.js';

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

// arrange: while arranging, the book's place on the shelf and whether it is the one being moved.
function spineHtml(entry, copy, related, arrange) {
  const size = estimateSize(entry.edition, { binding: copy.binding, related });
  const height = Math.min(SHELF_HEIGHT, Math.round(size.height.mm * PIXELS_PER_MM));
  const width = Math.max(MIN_WIDTH, Math.round(size.thickness.mm * PIXELS_PER_MM));
  const cover = entry.edition.images.find(image => image.kind === 'cover' && image.color);
  const spine = entry.edition.images.find(image => image.kind === 'spine');
  const arrangeHtml = arrange ? ` data-index="${arrange.index}" aria-pressed="${arrange.isPicked}"` : '';
  const picked = arrange && arrange.isPicked ? ' is-picked' : '';
  if (spine) {
    // A spine photo: its own shape gives its width at the book's height.
    const photoWidth = Math.max(6, Math.round(height * (spine.ratio || size.thickness.mm / size.height.mm)));
    return `<a class="spine has-photo${picked}" href="#/book/${escapeHtml(entry.id)}"${arrangeHtml} title="${escapeHtml(entry.edition.title)}" style="width:${photoWidth}px;height:${height}px">`
      + `<img data-image="${escapeHtml(spine.id)}/thumb" alt=""></a>`;
  }
  const foot = entry.edition.volume || entry.edition.seriesNumber || (entry.authors[0] && entry.authors[0].name.split(' ').pop()) || '';
  const title = `${entry.edition.title} · ${size.height.mm / 10} cm (${size.height.source}), ${size.thickness.mm} mm (${size.thickness.source})`;
  return `<a class="spine${cover ? ' has-color' : ''}${picked}" href="#/book/${escapeHtml(entry.id)}"${arrangeHtml} title="${escapeHtml(title)}" style="width:${width}px;height:${height}px${cover ? `;border-color:${escapeHtml(cover.color)}` : ''}">`
    + `<span class="spine-box" style="top:5%;bottom:${foot ? 26 : 5}%">${letteringHtml(entry.edition.title, width, height * (foot ? 0.69 : 0.9) - 4, 11, '')}</span>`
    + (foot ? `<span class="spine-box" style="bottom:5%;height:18%">${letteringHtml(String(foot), width, height * 0.18 - 4, 9.5, 'spine-foot')}</span>` : '')
    + '</a>';
}

/** The list of shelves, or one shelf when the route names it. */
export function render(container, state, actions) {
  const path = state.route.id ? decodeURIComponent(state.route.id) : '';
  if (!path) {
    const copies = state.library.entries.flatMap(entry => entry.copies).filter(copy => copy.status === 'owned' && copy.location.length);
    const counts = new Map();
    for (const copy of copies) counts.set(copy.location.join(' › '), (counts.get(copy.location.join(' › ')) || 0) + 1);
    const shelvesHtml = [...counts].sort().map(([name, count]) => `<a class="row" href="#/shelf/${encodeURIComponent(name)}"><span>${iconHtml('shelf')}</span>`
      + `<span class="row-main"><span class="row-title">${escapeHtml(name)}</span></span><span class="row-date">${count}</span></a>`).join('');
    container.innerHTML = `<a class="back" href="#/">${iconHtml('back')} Library</a><div class="page-head"><h1 class="page-title">Shelves</h1></div>`
      + `<div class="list">${shelvesHtml || '<p class="empty">No books have a location yet.</p>'}</div>`;
    return;
  }
  // Arrange: tap a book, then the gap where it now stands. Only the moved
  // copy's shelf order changes (core/shelf-order.js, keysAfterMove).
  let arranging = false;
  let picked = null; // the index of the book being moved

  function draw() {
    const here = copiesOnShelf(state.library.entries, path);
    const editions = state.library.entries.map(entry => entry.edition);
    const gapHtml = i => (picked === null ? '' : `<button type="button" class="shelf-gap" data-action="gap" data-value="${i}" aria-label="Put it here"></button>`);
    const spinesHtml = here.map(({ entry, copy }, i) => gapHtml(i) + spineHtml(entry, copy, editions, arranging ? { index: i, isPicked: i === picked } : null)).join('') + gapHtml(here.length);
    const hint = !arranging ? '' : picked === null ? 'Tap the book to move.' : `Now tap the gap where ${here[picked].entry.edition.title} stands.`;
    const buttonHtml = arranging ? '<button type="button" class="btn btn-primary" data-action="done">Done</button>'
      : '<button type="button" class="btn" data-action="arrange">Arrange</button>';
    container.innerHTML = `<a class="back" href="#/shelves">${iconHtml('back')} Shelves</a>`
      + `<div class="page-head"><h1 class="page-title">${escapeHtml(path)}</h1><p class="page-meta">${escapeHtml(`${here.length} books`)}</p></div>`
      + `<div class="shelf-tools">${buttonHtml}<p class="page-meta" role="status">${escapeHtml(hint)}</p></div>`
      + `<div class="shelf${arranging ? ' is-arranging' : ''}">${spinesHtml}</div>`;
    fillImages(container, actions.imageUrl);
    container.onclick = async event => {
      const target = event.target.closest('[data-action], [data-index]');
      if (!target) return;
      if (target.dataset.index !== undefined) {
        event.preventDefault();
        picked = Number(target.dataset.index) === picked ? null : Number(target.dataset.index);
      } else if (target.dataset.action === 'arrange') arranging = true;
      else if (target.dataset.action === 'done') { arranging = false; picked = null; }
      else if (target.dataset.action === 'gap') {
        const moved = keysAfterMove(here.map(({ copy }) => copy.shelfOrder || null), picked, Number(target.dataset.value));
        const records = [...moved].map(([i, key]) => withField(here[i].copy, 'shelfOrder', key, actions.now()));
        picked = null;
        if (records.length && !(await actions.saveRecords(records))) return;
      }
      draw();
    };
  }
  draw();
}

// The owned copies on one shelf, in shelf order; copies without one follow
// in title order (DATA_FORMAT.md, "Shelf order").
function copiesOnShelf(entries, path) {
  const here = [];
  for (const entry of entries) {
    for (const copy of entry.copies) if (copy.status === 'owned' && copy.location.join(' › ') === path) here.push({ entry, copy });
  }
  return here.sort((a, b) => (a.copy.shelfOrder && b.copy.shelfOrder ? (a.copy.shelfOrder < b.copy.shelfOrder ? -1 : a.copy.shelfOrder > b.copy.shelfOrder ? 1 : 0)
    : a.copy.shelfOrder ? -1 : b.copy.shelfOrder ? 1 : a.entry.edition.title.localeCompare(b.entry.edition.title)));
}
