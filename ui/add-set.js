// "Adding a set" on the add screen (PLAN.md, "Batch add"): the set's shared
// facts are given once, then its volumes are scanned one by one or pasted as
// a list. Each volume stays its own edition, with the set's title and its
// volume label. This file draws the set's screens and reads them; ui/add.js
// runs the flow and saves.

import { escapeHtml } from '../core/html.js';
import { fieldHtml, choiceHtml, navHtml } from './add-questions.js';

/** The set's facts, asked once (the set's binding is suggested from the bindings list). */
export function setFormHtml(set) {
  return `<h2 class="step-title">Adding a set</h2>
    <p class="step-hint">What every volume shares, given once: Luther's Works, or Great Books of the Western World. Each volume is then its own book, with its own photos and shelf.</p>
    <form class="form">${fieldHtml('Set title', 'set', set.title, { help: true, missing: set.isMissingTitle })}
      <div class="field-row">${fieldHtml('Publisher', 'publisher', set.publisher)}${fieldHtml('Year', 'year', set.year, { type: 'number', hint: 'a volume\'s own year wins when it is found' })}</div>
      ${fieldHtml('Edition', 'editionStatement', set.editionStatement, { help: true })}
      ${fieldHtml('General editors (separate with ;)', 'editors', set.editors.join('; '), { hint: 'Adler for Great Books; Pelikan; Lehmann for Luther\'s Works' })}
      ${fieldHtml('Binding', 'binding', set.binding, { list: 'bindings', help: true })}
      ${navHtml('Start adding volumes')}</form>`;
}

/** The set's facts as typed. */
export function readSetForm(stepArea, set) {
  const value = name => stepArea.querySelector(`[name="${name}"]`).value.trim();
  return {
    ...set,
    title: value('set'), publisher: value('publisher'), year: value('year'), editionStatement: value('editionStatement'),
    editors: value('editors').split(';').map(name => name.trim()).filter(Boolean), binding: value('binding'),
  };
}

/** The line on the scan screen while a set is being added. */
export function setBannerHtml(set) {
  const next = set.nextVolume ? ` Next: volume ${set.nextVolume}.` : '';
  return `<section class="block"><h2 class="block-title">${escapeHtml(`Adding the set: ${set.title}`)}</h2>
    <p class="step-hint">${escapeHtml(`Scan or type each volume you have, or paste a list of them.${next}`)}</p>
    <div class="step-nav"><button type="button" class="btn" data-action="paste-volumes">Paste the volumes held</button>
      <button type="button" class="btn" data-action="finish-set">Finish the set</button></div></section>`;
}

// Which volume a scanned book is: the next one suggested, or typed.
export function volumeStepHtml(book, set) {
  const suggested = set.nextVolume ? choiceHtml('volume', `Volume ${set.nextVolume}`, 'The next after the last one added', set.nextVolume) : '';
  return `<h2 class="step-title">Which volume is this?</h2>
    <p class="step-hint">${escapeHtml(`Its number or label in ${set.title}, as printed: 31, or I/1.`)}</p>
    <div class="choices">${suggested}</div>
    <form class="form">${fieldHtml(suggested ? 'Or another volume' : 'Volume', 'volume', suggested ? '' : book.found.volume)}${navHtml()}</form>`;
}

/**
 * Paste the volumes held: one line each, then one shelf for them all.
 * @param {string[]} places shelves to offer, the one being filled first
 */
export function pasteStepHtml(set, places, text) {
  const placesHtml = places.map(place => choiceHtml('paste-place', `Add them to ${place}`, '', place)).join('');
  const partsHtml = ['Place', 'Room', 'Case', 'Shelf'].map(label => fieldHtml(label, 'where', '')).join('');
  return `<h2 class="step-title">${escapeHtml(`The volumes of ${set.title} you have`)}</h2>
    <p class="step-hint">One per line: its number, then its title if it has one ("7 Plato", "8 Aristotle I"). Each becomes its own book with the set's details. Photos and contents can be added later; "Needs details" lists what is missing.</p>
    <form class="form"><label class="field">Volumes<textarea name="volumes" rows="8">${escapeHtml(text)}</textarea></label>
      <div class="choices">${placesHtml}${choiceHtml('paste-place', 'Add them with no place yet', 'They can be shelved later', '')}</div>
      <p class="step-hint">Or type a new place:</p><div class="field-row">${partsHtml}</div>
      ${navHtml('Add them to the place typed')}</form>`;
}
