// The lower part of the book page, drawn a moment after the page opens so the
// app's start-up code stays within its size budget: other editions of the same
// works and the collections holding them, and, for a book old enough to be in
// the public domain, a link to read HathiTrust's free scan.

import { escapeHtml } from '../core/html.js';
import { originalTextHolders } from '../core/library.js';
import { badgesHtml } from './pieces.js';
import { recordPage } from '../edges/lookup-hathitrust.js';

// A book published this many years ago or more is in the public domain in the
// United States, where HathiTrust shows it in full (published in 1930 or
// earlier, as of 2026).
const PUBLIC_DOMAIN_YEARS = 96;

/**
 * Other editions of the same works, and anthologies that contain a work here.
 * @param {object} entry the book (core/library.js)
 * @param {{ entries: object[] }} library
 */
export function relatedHtml(entry, library) {
  const workIds = new Set(entry.edition.contents.map(piece => piece.work));
  const others = library.entries.filter(other => other.id !== entry.id && other.edition.contents.some(piece => workIds.has(piece.work)));
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
export function fillMore(slot, entry, library) {
  slot.innerHTML = freeScanHtml(entry.edition, new Date().getFullYear()) + relatedHtml(entry, library);
}
