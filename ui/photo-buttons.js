// The buttons that start a photo: take one now with the camera, or choose one
// already on the phone or computer. Used while adding a book (ui/add.js) and
// on the book page's Pictures section (ui/book-photos.js).

import { escapeHtml } from '../core/html.js';

/**
 * A hidden file box for one kind of photo. With isCamera, the "capture"
 * attribute sends a phone straight to its camera; an iPhone then offers no
 * way to pick a saved photo, so the "choose" box leaves it out.
 * @param {'cover'|'spine'|'contents'} kind
 * @param {boolean} isCamera
 */
export function photoInputHtml(kind, isCamera) {
  return `<input type="file" accept="image/*"${isCamera ? ' capture="environment"' : ''} data-photo="${kind}" hidden>`;
}

/**
 * Two big answer buttons for a photo, as the add steps draw them.
 * @param {'cover'|'spine'|'contents'} kind
 * @param {string} takeLabel "Take a photo of the cover"
 * @param {string} [note] the small line under the first button
 */
export function photoButtonsHtml(kind, takeLabel, note = 'The editor opens to line it up') {
  return `<label class="choice-button"><span>${escapeHtml(takeLabel)}</span><small>${escapeHtml(note)}</small>${photoInputHtml(kind, true)}</label>`
    + `<label class="choice-button"><span>Choose a saved photo</span><small>From the photos on this phone or computer</small>${photoInputHtml(kind, false)}</label>`;
}
