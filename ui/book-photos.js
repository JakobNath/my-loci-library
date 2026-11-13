// The book page's Pictures section: take, choose or remove the cover and the
// spine photo of a book already in the library. Drawn with the page's lower
// part (ui/book-more.js); the photo editor loads only when a photo is taken.

import { escapeHtml } from '../core/html.js';
import { imageEntry, withNewImage } from '../core/records.js';
import { estimateSize } from '../core/sizes.js';
import { photoInputHtml } from './photo-buttons.js';

const KIND_NAMES = { cover: 'Cover', spine: 'Spine' };

/**
 * The Pictures section of one book. A Logos book has no spine to photograph.
 * @param {object} entry the book (core/library.js)
 */
export function picturesHtml(entry) {
  const kinds = entry.isDigital ? ['cover'] : ['cover', 'spine'];
  const rowsHtml = kinds.map(kind => {
    const image = entry.edition.images.find(other => other.kind === kind);
    const state = !image ? 'none yet' : image.source === 'photo' ? 'our photo' : image.waiting ? 'waiting for the laptop' : 'from online';
    const removeHtml = image ? `<button type="button" class="btn" data-action="remove-photo" data-value="${kind}">Remove</button>` : '';
    return `<div class="picture-row"><span>${KIND_NAMES[kind]} <span class="muted">(${escapeHtml(state)})</span></span>`
      + `<span class="picture-buttons"><label class="btn">${image && image.source === 'photo' ? 'Retake' : 'Take'}${photoInputHtml(kind, true)}</label>`
      + `<label class="btn">Choose${photoInputHtml(kind, false)}</label>${removeHtml}</span></div>`;
  }).join('');
  return `<section class="block pictures"><h2 class="block-title">Pictures</h2>${rowsHtml}</section>`;
}

/**
 * Wire the section's buttons. Saving through actions.saveEdition draws the page again.
 * @param {HTMLElement} slot the element holding the section
 * @param {object} entry
 * @param {object} actions from main.js
 */
export function wirePictures(slot, entry, actions) {
  const edition = entry.edition;
  slot.addEventListener('change', async event => {
    const kind = event.target.dataset.photo;
    const file = event.target.files && event.target.files[0];
    if (!kind || !file) return;
    const { editPhoto } = await import('./photo-editor.js');
    const copy = entry.copies[0];
    const size = estimateSize(edition, { binding: copy ? copy.binding : null });
    const files = await editPhoto(file, kind, { heightHint: `~${Math.round(size.height.mm / 10)} cm · ${size.height.source}` });
    if (!files) return;
    const id = actions.newId();
    await actions.saveImageFiles(id, files);
    const changes = { images: withNewImage(edition.images, imageEntry(id, kind, 'photo', files, true)) };
    // A height typed in the spine editor was measured, and wins over any other (DATA_FORMAT.md, "Edition").
    if (kind === 'spine' && files.height) Object.assign(changes, { height: files.height, heightSource: 'measured' });
    await actions.saveEdition(edition.id, changes);
  });
  slot.addEventListener('click', async event => {
    const button = event.target.closest('[data-action="remove-photo"]');
    if (!button) return;
    const kind = button.dataset.value;
    if (!confirm(`Remove the ${kind} picture from this book? It can be taken again at any time.`)) return;
    await actions.saveEdition(edition.id, { images: edition.images.filter(image => image.kind !== kind) });
  });
}
