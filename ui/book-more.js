// The lower part of the book page, drawn a moment after the page opens so the
// app's start-up code stays within its size budget: the set the book is a
// volume of, other editions of the same works and the collections holding
// them, and, for a book old enough to be in
// the public domain, a link to read HathiTrust's free scan; and the Pictures
// section, to take or remove the cover and spine photos (ui/book-photos.js).

import { escapeHtml } from '../core/html.js';
import { originalTextHolders } from '../core/library.js';
import { normalizeForSearch } from '../core/search.js';
import { badgesHtml } from './pieces.js';
import { recordPage } from '../edges/lookup-hathitrust.js';
import { picturesHtml, wirePictures } from './book-photos.js';

// A book published this many years ago or more is in the public domain in the
// United States, where HathiTrust shows it in full (published in 1930 or
// earlier, as of 2026).
const PUBLIC_DOMAIN_YEARS = 96;

// Whether another book is a volume of the same set as this one: linked to the same set record, or with the same set title.
const sameSet = (entry, other) => Boolean(entry.edition.set) && other.id !== entry.id
  && (entry.edition.setRecord ? other.edition.setRecord === entry.edition.setRecord : normalizeForSearch(other.edition.set || '') === normalizeForSearch(entry.edition.set));

// Volume labels as a short list: "1–8" when they run on as numbers, else "IV, V".
function volumesText(labels) {
  const sorted = [...labels].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const numbers = sorted.map(Number);
  const runsOn = numbers.every((n, i) => Number.isInteger(n) && (i === 0 || n === numbers[i - 1] + 1));
  return runsOn && sorted.length > 2 ? `${sorted[0]}–${sorted[sorted.length - 1]}` : sorted.join(', ');
}

/**
 * The set this book is a volume of: a link to the set's page, or, when the set
 * has no record of its own yet, "Add the set's details". A work printed across
 * several volumes is described ("continues in volumes 20–21"), not given a
 * name of its own (docs/decisions/screens.md, "Words for sets").
 * @param {object} entry
 * @param {{ entries: object[] }} library
 */
export function setHtml(entry, library) {
  const { edition, set } = entry;
  if (!edition.set) return '';
  const name = set ? `${set.title}${set.shortTitle ? ` (${set.shortTitle})` : ''}` : edition.set;
  const lineHtml = set ? `<a href="#/set/${escapeHtml(set.id)}">${escapeHtml(`Volume ${edition.volume || '?'} of ${name}`)}</a>`
    : `<p>${escapeHtml(`Volume ${edition.volume || '?'} of ${name}`)}</p><a class="link" href="#/set/new/${escapeHtml(edition.id)}">Add the set's details: its short form, editors, and what the whole set cost</a>`;
  const volumes = library.entries.filter(other => sameSet(entry, other));
  const continuesHtml = entry.works.map(work => {
    const labels = volumes.filter(other => other.works.includes(work) && other.edition.volume).map(other => other.edition.volume);
    return labels.length ? `<p class="muted">${escapeHtml(`${work.title} continues in ${labels.length === 1 ? 'volume' : 'volumes'} ${volumesText(labels)}`)}</p>` : '';
  }).join('');
  return `<section class="block related"><h2 class="block-title">The set</h2>${lineHtml}${continuesHtml}</section>`;
}

/**
 * Other editions of the same works, and anthologies that contain a work here.
 * Other volumes of this book's own set are described in the set's section instead.
 * @param {object} entry the book (core/library.js)
 * @param {{ entries: object[] }} library
 */
export function relatedHtml(entry, library) {
  const workIds = new Set(entry.edition.contents.map(piece => piece.work));
  const others = library.entries.filter(other => other.id !== entry.id && !sameSet(entry, other) && other.edition.contents.some(piece => workIds.has(piece.work)));
  if (!others.length) return '';
  // Beside other editions of one work: which of them print it in its original language ("Greek text: Plato I").
  const work = entry.works.length === 1 && entry.works[0];
  const held = work ? originalTextHolders(work, library).map(holder => holder.edition.title) : [];
  const originalHtml = held.length ? `<p class="muted">${escapeHtml(`${work.originalLanguage} text: ${held.join('; ')}`)}</p>` : '';
  const linksHtml = others.map(other => `<a href="#/book/${escapeHtml(other.id)}">${escapeHtml(other.edition.title)}`
    + `${other.edition.subtitle ? ': ' + escapeHtml(other.edition.subtitle) : ''} <span class="muted">${escapeHtml([other.edition.publisher, other.edition.year].filter(Boolean).join(', '))}</span> ${badgesHtml(other)}</a>`).join('');
  return `<section class="block related"><h2 class="block-title">Other editions and collections</h2>${originalHtml}${linksHtml}</section>`;
}

/**
 * "Read it free online": HathiTrust's record of this edition, for a book with
 * a stored HathiTrust record number that is old enough to be shown in full.
 * HathiTrust's page says which scans can be read.
 * @param {object} edition
 * @param {number} thisYear
 */
export function freeScanHtml(edition, thisYear) {
  const record = edition.identifiers && edition.identifiers.hathiTrust;
  if (!record || !edition.year || edition.year > thisYear - PUBLIC_DOMAIN_YEARS) return '';
  return `<section class="block related"><h2 class="block-title">Read it free online</h2>`
    + `<a href="${escapeHtml(recordPage(record))}" target="_blank" rel="noopener">The scanned book at HathiTrust <span class="muted">(published ${escapeHtml(edition.year)}, now in the public domain)</span></a></section>`;
}

/** Fill the book page's place for these sections. */
export function fillMore(slot, entry, library, actions) {
  slot.innerHTML = setHtml(entry, library) + freeScanHtml(entry.edition, new Date().getFullYear()) + relatedHtml(entry, library) + picturesHtml(entry);
  wirePictures(slot, entry, actions);
  // The Pictures section's styles are with the later screens' (styles/screens.css).
  actions.loadScreenStyles();
}
