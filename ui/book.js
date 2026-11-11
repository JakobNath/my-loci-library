// The book page: every field of the edition, its works and their datings,
// anthology contents with dates, other editions of the same work, the
// anthologies that contain it, and each copy with its value history.

import { escapeHtml } from '../core/html.js';
import { formatYearRange, workingDating } from '../core/dating.js';
import { countPages } from '../core/pages.js';
import { coverHtml, dateLineHtml, badgesHtml, COVER_RATIO } from './pieces.js';
import { iconHtml } from './icons.js';
import { fillImages } from './images.js';

const money = (currency, amount) => (amount === null || amount === undefined ? '' : `${currency}${amount}`);

function factsHtml(pairs) {
  const filled = pairs.filter(([, value]) => value !== null && value !== undefined && value !== '');
  if (!filled.length) return '';
  return `<dl class="facts">${filled.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl>`;
}

function datingsHtml(work, style) {
  if (!work.datings.length) return '<span class="date-chip is-missing">Needs original date</span>';
  return work.datings.map(dating => {
    const shown = dating.earliest !== null && dating.earliest < 0 ? formatYearRange(dating.earliest, dating.latest, style) : dating.text;
    const note = dating.note ? ` <span class="muted">${escapeHtml(dating.note)}</span>` : '';
    return `<span class="date-chip">${escapeHtml(shown)}</span>${dating.working && work.datings.length > 1 ? ' <span class="muted">working date</span>' : ''}${note}`;
  }).join(' ');
}

function contentsHtml(entry, style) {
  const pieces = entry.edition.contents.map((piece, i) => {
    const work = entry.works.find(w => w.id === piece.work);
    if (!work) return '';
    const dating = workingDating(work);
    const date = dating ? escapeHtml(dating.earliest !== null && dating.earliest < 0 ? formatYearRange(dating.earliest, dating.latest, style) : dating.text) : 'needs date';
    const meta = [piece.extent !== 'complete' ? piece.extent : '', piece.translator ? `trans. ${piece.translator}` : '', piece.pages ? `pp. ${piece.pages}` : ''].filter(Boolean).join(' · ');
    return `<li class="piece"><span class="piece-title">${escapeHtml(work.title)}</span><span class="piece-date${dating ? '' : ' is-missing'}">${date}</span>`
      + `<span class="piece-meta">${escapeHtml(meta)}</span></li>`;
  });
  return `<section class="block"><h2 class="block-title">Contents · ${dateLineHtml(entry, style)}</h2><ol class="contents">${pieces.join('')}</ol></section>`;
}

function copiesHtml(entry, currency) {
  return entry.copies.map(copy => {
    const history = copy.valueHistory.length > 1 ? copy.valueHistory.map(point => `${point.date}: ${money(currency, point.value)}`).join(', ') : '';
    const head = `<div class="copy-head"><span>${escapeHtml(copy.binding || (entry.isDigital ? 'Logos' : 'Copy'))}</span>`
      + `<span class="copy-value">${escapeHtml(copy.value !== null ? money(currency, copy.value) : 'No value yet')}</span></div>`;
    return `<div class="copy">${head}${factsHtml([
      ['Location', copy.location.join(' › ')],
      ['Status', copy.status === 'owned' ? '' : copy.status],
      ['Acquired', copy.acquired],
      ['Added', copy.added],
      ['Price paid', money(currency, copy.price)],
      ['Value history', history],
      ['Markings', copy.markings ? 'Writing or markings when acquired' : ''],
    ])}</div>`;
  }).join('');
}

// Other editions of the same works, and anthologies that contain a work here.
function relatedHtml(entry, library) {
  const workIds = new Set(entry.edition.contents.map(piece => piece.work));
  const others = library.entries.filter(other => other.id !== entry.id && other.edition.contents.some(piece => workIds.has(piece.work)));
  if (!others.length) return '';
  const linksHtml = others.map(other => `<a href="#/book/${escapeHtml(other.id)}">${escapeHtml(other.edition.title)}`
    + `${other.edition.subtitle ? ': ' + escapeHtml(other.edition.subtitle) : ''} <span class="muted">${escapeHtml([other.edition.publisher, other.edition.year].filter(Boolean).join(', '))}</span> ${badgesHtml(other)}</a>`).join('');
  return `<section class="block related"><h2 class="block-title">Other editions and collections</h2>${linksHtml}</section>`;
}

/** Draw the book page for state.route.id. */
export function render(container, state, actions) {
  const entry = state.library.entries.find(item => item.id === state.route.id);
  if (!entry) {
    container.innerHTML = `<a class="back" href="#/">${iconHtml('back')} Library</a><p class="empty">This book is not in the catalog on this device.</p>`;
    return;
  }
  const { edition } = entry;
  const style = state.settings.dateStyle;
  const work = entry.works.length === 1 ? entry.works[0] : null;
  const seriesHtml = escapeHtml([edition.series && `${edition.series} ${edition.seriesNumber || ''}`.trim(), edition.set && `${edition.set}, vol. ${edition.volume || '?'}`].filter(Boolean).join(' · '));
  const notes = entry.copies.map(copy => copy.notes).filter(Boolean);
  const notesHtml = notes.length ? `<div class="notes"><p>${escapeHtml(notes.join('\n\n'))}</p></div>` : '';
  const citeHtml = entry.isDigital ? `<label class="toggle"><input type="checkbox" data-action="cite"${edition.cite ? ' checked' : ''}> Cite: send to Zotero</label>` : '';
  const goneHtml = entry.owned ? '' : '<p class="banner">No longer in library</p>';
  const datesHtml = work ? datingsHtml(work, style) : entry.range ? `<span class="date-chip">${dateLineHtml(entry, style)}</span>` : '';
  const editionHtml = factsHtml([
    ['Original title', work && work.originalTitle],
    ['Contributors', edition.contributors.map(person => `${person.name} (${person.role})`).join('; ')],
    ['Publisher', [edition.publisher, edition.place].filter(Boolean).join(', ')],
    ['Year', edition.year],
    ['Edition', edition.editionStatement],
    ['Translation first published', edition.translationFirstPublished],
    ['ISBN', edition.isbn],
    ['Library of Congress number', edition.identifiers.lccn],
    ['OCLC number', edition.identifiers.oclc],
    ['Call number', edition.identifiers.lcc],
    ['Dewey number', edition.identifiers.ddc],
    ['Languages', edition.languages.join(', ')],
    ['Pages', edition.pages && `${edition.pages}${countPages(edition.pages) && String(countPages(edition.pages)) !== edition.pages ? ` (${countPages(edition.pages)} pages)` : ''}`],
    ['Format', entry.isDigital ? `Logos${edition.logosId ? ` (${edition.logosId})` : ''}` : 'Physical'],
    ['Category', work && work.category],
    ['Tags', work && work.tags.join(', ')],
    ['Subjects', edition.subjects.join('; ')],
  ]);
  // The spine beside the cover, when there is a spine photo (PLAN.md, "Taking photos").
  const spine = edition.images.find(image => image.kind === 'spine');
  const cover = edition.images.find(image => image.kind === 'cover' && !image.waiting);
  // As tall as the cover, its width from the spine's shape: the cover box has the
  // cover picture's shape (2 : 3 without one), so the spine is (spine ratio ÷ cover
  // ratio) times the cover's width; flex shares the room that way.
  const coverRatio = Number(cover && cover.ratio) || COVER_RATIO;
  const spineShare = Math.round((Number(spine && spine.ratio) || 0.1) / coverRatio * 1000) / 1000;
  const spineHtml = spine ? `<div class="spine-photo" style="flex:${spineShare} 1 0"><img data-image="${escapeHtml(spine.id)}/detail" alt="Spine"></div>` : '';
  // On a phone the cover is small; tapping it shows the cover and spine full size (interface review).
  const viewerHtml = cover || spine ? `<dialog class="viewer" aria-label="Pictures"><div class="viewer-pictures">${cover ? `<img data-image="${escapeHtml(cover.id)}/detail" alt="Cover">` : ''}`
    + `${spine ? `<img class="viewer-spine" data-image="${escapeHtml(spine.id)}/detail" alt="Spine">` : ''}</div><p class="page-meta">Tap to close</p></dialog>` : '';
  const coverLabelHtml = cover || spine ? ' role="button" tabindex="0" aria-label="Show the pictures full size" data-action="enlarge"' : '';
  const piecesHtml = entry.works.length > 1 ? contentsHtml(entry, style) : '';
  const copiesTitleHtml = entry.copies.length > 1 ? 'Copies' : 'Copy';
  // Where the book stands, beside the cover, opening its shelf (the reason most people open a book's page).
  const place = (entry.copies.find(copy => copy.status === 'owned' && copy.location.length) || { location: [] }).location.join(' › ');
  const whereHtml = place ? `<a class="detail-where" href="#/shelf/${encodeURIComponent(place)}">${iconHtml('shelf')}<span>${escapeHtml(place)}</span></a>` : '';
  container.innerHTML = `
    <a class="back" href="#/">${iconHtml('back')} Library</a>
    <article class="detail">
      <div class="detail-cover"${coverLabelHtml}>${coverHtml(entry, 'l')}${spineHtml}</div>
      <div class="detail-body">
        ${goneHtml}
        <p class="detail-series">${seriesHtml}</p>
        <h1 class="detail-title">${escapeHtml(edition.title)}</h1>
        <p class="detail-subtitle">${escapeHtml(edition.subtitle || '')}</p>
        <p class="detail-author">${escapeHtml(entry.authorLine)} ${badgesHtml(entry)}</p>
        <div class="dates">${datesHtml}</div>
        ${whereHtml}
        ${citeHtml}
        <div class="actions"><a class="btn" href="#/edit/${escapeHtml(edition.id)}">Edit</a></div>
      </div>
    </article>
    ${notesHtml}
    ${piecesHtml}
    <section class="block"><h2 class="block-title">Edition</h2>${editionHtml}</section>
    <section class="block"><h2 class="block-title">${copiesTitleHtml}</h2>${copiesHtml(entry, state.settings.currency)}</section>
    ${relatedHtml(entry, state.library)}
    ${viewerHtml}`;
  fillImages(container, actions.imageUrl);
  const viewer = container.querySelector('.viewer');
  const enlarge = () => { if (viewer && viewer.showModal) viewer.showModal(); };
  container.onclick = event => {
    if (event.target.closest('[data-action="enlarge"]')) enlarge();
    else if (viewer && viewer.open && event.target.closest('.viewer')) viewer.close();
  };
  container.onkeydown = event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-action="enlarge"]')) { event.preventDefault(); enlarge(); }
  };
  container.onchange = event => {
    if (event.target.dataset.action === 'cite') actions.saveEdition(edition.id, { cite: event.target.checked });
  };
}
