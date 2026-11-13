// A set's page (#/set/<set id>; data format 4): its title and short form,
// editors, the volumes held and missing, what the whole set cost and is
// worth, the switch to count one value for the whole set, and notes, with a
// form to change them. #/set/new/<edition id> makes the record for the set a
// book belongs to ("Add the set's details" on the book page) and links every
// volume with that set title. Loaded only when opened.

import { escapeHtml } from '../core/html.js';
import { setFromForm, editionsOfSet, linkEditionsToSet, volumesOfSet } from '../core/sets.js';
import { copyValueOf } from '../core/value.js';
import { iconHtml } from './icons.js';
import { helpHtml, toggleHelp } from './field-help.js';

const attr = value => escapeHtml(value ?? '');

function fieldHtml(label, name, value, { type = 'text', hint = '', help = false } = {}) {
  const helpParts = help ? helpHtml(name) : { button: '', text: '' };
  return `<label class="field"><span class="field-label">${escapeHtml(label)}${helpParts.button}</span>`
    + `<input name="${name}" type="${type}" value="${attr(value)}"${type === 'number' ? ' inputmode="decimal"' : ''} autocomplete="off">`
    + (hint ? `<span class="preview">${escapeHtml(hint)}</span>` : '') + `${helpParts.text}</label>`;
}

function formHtml(set, isNew) {
  const help = helpHtml('valueAsSet');
  const amount = value => (value === null || value === undefined ? '' : value);
  return `<form class="form" data-set-form>
      ${fieldHtml('Set title', 'title', set.title)}
      <div class="field-row">${fieldHtml('Short form', 'shortTitle', set.shortTitle, { help: true, hint: 'LW or AE' })}${fieldHtml('Volumes in the set', 'volumes', amount(set.volumes), { type: 'number', hint: 'all of them, not only ours' })}</div>
      ${fieldHtml('General editors (separate with ;)', 'editors', set.editors.join('; '))}
      <div class="field-row">${fieldHtml('Price paid for the set', 'price', amount(set.price), { type: 'number' })}${fieldHtml('Value of the set', 'value', amount(set.value), { type: 'number' })}</div>
      <label class="check"><input type="checkbox" name="valueAsSet"${set.valueAsSet ? ' checked' : ''}> Count one value for the whole set${help.button}${help.text}</label>
      <label class="field">Notes<textarea name="notes" rows="3">${escapeHtml(set.notes)}</textarea></label>
      <div class="problems" hidden></div>
      <div class="actions"><button class="btn btn-primary" type="submit">${isNew ? 'Save the set' : 'Save'}</button>${isNew ? '' : '<button class="btn" type="button" data-action="cancel">Cancel</button>'}</div></form>`;
}

// What the page says about how the set's value is counted (core/value.js).
function valueLine(set, held, money) {
  if (set.value === null) return 'No value for the whole set: each volume counts its own value.';
  const alone = held.flatMap(entry => entry.copies.filter(copy => copy.status === 'owned' && copyValueOf(copy, set).value !== null));
  if (set.valueAsSet) return `${money(set.value)}, counted once for the whole set. The volumes' own values are kept but not counted.`;
  return `${money(set.value)} for the volumes bought with the set${alone.length ? `, and ${alone.length} ${alone.length === 1 ? 'volume' : 'volumes'} counted on ${alone.length === 1 ? 'its' : 'their'} own` : ''}.`;
}

export function render(container, state, actions) {
  const [first, editionId] = state.route.id.split('/');
  const isNew = first === 'new';
  const edition = isNew ? state.library.editionsById.get(editionId) : null;
  const saved = isNew ? null : state.library.setsById.get(first);
  if (!saved && !edition) {
    container.innerHTML = `<a class="back" href="#/">${iconHtml('back')} Library</a><p class="empty">This set is not in the catalog.</p>`;
    return;
  }
  // A new set starts from the book's set title and its general editors.
  const set = saved || { title: edition.set || '', shortTitle: '', editors: edition.contributors.filter(person => person.role === 'editor').map(person => person.name), volumes: null, price: null, value: null, valueAsSet: false, notes: '' };
  const { currency } = state.settings;
  const money = amount => `${currency}${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  let editing = isNew;

  function draw() {
    const backHtml = isNew ? `<a class="back" href="#/book/${attr(edition.id)}">${iconHtml('back')} Back to the book</a>` : `<a class="back" href="#/">${iconHtml('back')} Library</a>`;
    if (editing) {
      const headHtml = isNew ? '<h1 class="page-title">The set\'s details</h1><p class="page-meta">Every volume with this set title is linked to it.</p>'
        : '<h1 class="page-title">Edit the set</h1><p class="page-meta">Changing the title changes it on every volume.</p>';
      container.innerHTML = `${backHtml}<div class="page-head">${headHtml}</div>${formHtml(set, isNew)}`;
      return;
    }
    const { held, missing } = volumesOfSet(state.library.entries, saved);
    const heldHtml = held.map(entry => `<a href="#/book/${attr(entry.id)}">${escapeHtml(entry.edition.volume ? `${entry.edition.volume}. ` : '')}${escapeHtml(entry.edition.title)}</a>`).join('');
    const missingHtml = missing.length ? `<details class="small"><summary>${escapeHtml(`${missing.length} not held`)}</summary><p>${escapeHtml(missing.join(', '))}</p></details>` : '';
    const historyHtml = saved.valueHistory.length > 1 ? `<details class="small"><summary>Value history</summary><p>${escapeHtml(saved.valueHistory.map(point => `${point.date}: ${money(point.value)}`).join('; '))}</p></details>` : '';
    const facts = [['Short form', saved.shortTitle], ['General editors', saved.editors.join('; ')], ['Volumes', saved.volumes ? `${held.length} of ${saved.volumes} held` : `${held.length} held`],
      ['Price paid', saved.price === null ? '' : money(saved.price)], ['Value', valueLine(saved, held, money)]].filter(([, value]) => value);
    const factsHtml = facts.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('');
    const notesHtml = saved.notes ? `<div class="notes"><p>${escapeHtml(saved.notes)}</p></div>` : '';
    container.innerHTML = `${backHtml}
      <div class="page-head"><h1 class="page-title">${escapeHtml(saved.title)}</h1></div>
      <section class="block"><dl class="facts">${factsHtml}</dl>${historyHtml}
        <div class="actions"><button class="btn" type="button" data-action="edit">Edit the set</button></div></section>
      ${notesHtml}
      <section class="block related"><h2 class="block-title">Volumes held</h2>${heldHtml || '<p class="page-meta">None yet.</p>'}${missingHtml}</section>`;
  }

  container.onclick = event => {
    if (event.target.dataset.help) { toggleHelp(container, event.target); return; }
    const action = event.target.closest('[data-action]');
    if (!action) return;
    editing = action.dataset.action === 'edit';
    draw();
  };

  container.onsubmit = async event => {
    event.preventDefault();
    const form = event.target;
    const values = Object.fromEntries(['title', 'shortTitle', 'editors', 'volumes', 'price', 'value', 'notes'].map(name => [name, form[name].value]));
    const result = setFromForm({ ...values, valueAsSet: form.valueAsSet.checked }, saved, { newId: actions.newId, now: actions.now(), today: actions.today() });
    if (result.problems.length) {
      const problems = form.querySelector('.problems');
      problems.textContent = result.problems.join(' ');
      problems.hidden = false;
      return;
    }
    // The volumes take the set's title, so a renamed set is renamed on each of them.
    const editions = saved ? state.library.entries.filter(entry => entry.edition.setRecord === saved.id).map(entry => entry.edition)
      : editionsOfSet(state.library.editionsById.values(), result.record);
    const changed = [...(result.record !== saved ? [result.record] : []), ...linkEditionsToSet(editions, result.record, actions.now())];
    if (changed.length && !(await actions.saveRecords(changed))) return;
    actions.showNote(isNew ? `Saved, and ${editions.length} ${editions.length === 1 ? 'volume' : 'volumes'} linked to it` : 'Saved');
    if (isNew) actions.go(`#/set/${result.record.id}`);
    else { Object.assign(set, result.record); editing = false; render(container, state, actions); }
  };

  draw();
}
