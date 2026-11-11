// Small pieces of markup used by several screens: covers, the date line,
// badges. Every piece escapes its own data and ends in "Html".

import { escapeHtml } from '../core/html.js';
import { formatYearRange, workingDating } from '../core/dating.js';

/** The shape of a cover slot, width over height (--cover-ratio in styles/tokens.css). */
export const COVER_RATIO = 2 / 3;

// A stable choice of tile color for a book, so it looks the same every time.
function clothOf(id) {
  let sum = 0;
  for (const letter of id) sum = (sum * 31 + letter.charCodeAt(0)) % 997;
  return 'c' + ((sum % 6) + 1);
}

/**
 * A cover: the saved picture when there is one, otherwise a drawn tile with
 * the title and author.
 * @param {object} entry a library entry (core/library.js)
 * @param {'s'|'m'|'l'} [size] l uses the detail image (book page)
 */
export function coverHtml(entry, size = 'm') {
  const gone = entry.owned || entry.isWish ? '' : ' is-gone';
  const image = entry.edition.images.find(item => item.kind === 'cover' && !item.waiting);
  if (image) {
    // The picture is filled in by ui/images.js; its main color shows until it loads.
    const file = size === 'l' ? 'detail' : 'thumb';
    const color = escapeHtml(image.color || 'var(--surface-2)');
    const imgHtml = `<img data-image="${escapeHtml(image.id)}/${file}" alt="">`;
    const ratio = Number(image.ratio) || 0;
    if (!ratio) {
      return `<div class="cover has-image${size === 's' ? ' cover-s' : ''}${gone}" style="background:${color}">${imgHtml}</div>`;
    }
    // The picture keeps its own shape inside a book-shaped slot, standing at
    // its foot, so rows still line up; a squarer cover had shown a band of its
    // color above it (Liddell and Scott, 2026-11-11). On the book page the slot
    // takes the picture's shape, so a spine beside it is exactly as tall.
    const slotStyle = size === 'l' ? ` style="aspect-ratio:${escapeHtml(String(ratio))}"` : '';
    return `<div class="cover cover-slot${size === 's' ? ' cover-s' : ''}${gone}"${slotStyle}>`
      + `<div class="cover-picture${ratio > COVER_RATIO ? ' is-wide' : ''}" style="aspect-ratio:${escapeHtml(String(ratio))};background:${color}">${imgHtml}</div></div>`;
  }
  return `<div class="cover ${clothOf(entry.id)}${size === 's' ? ' cover-s' : ''}${gone}" aria-hidden="true">`
    + `<p class="cover-title">${escapeHtml(entry.edition.title)}</p><span class="cover-rule"></span>`
    + `<p class="cover-author">${escapeHtml(entry.authorLine)}</p></div>`;
}

/** The original date line of an entry: one work's working dating, or an anthology's span. */
export function dateLineHtml(entry, style = 'AD') {
  if (entry.range) {
    if (entry.range.earliest === null) return '';
    return escapeHtml(`${formatYearRange(entry.range.earliest, entry.range.latest, style)} (${entry.range.count} works)`);
  }
  const dating = entry.works[0] && workingDating(entry.works[0]);
  if (!dating) return '';
  return escapeHtml(dating.earliest !== null && dating.earliest < 0 ? formatYearRange(dating.earliest, dating.latest, style) : dating.text);
}

/** Badges: digital, no longer in library. */
export function badgesHtml(entry) {
  let html = '';
  if (entry.isDigital) html += '<span class="badge badge-digital">Digital</span> ';
  if (!entry.owned) html += '<span class="badge badge-gone">No longer in library</span>';
  return html;
}

