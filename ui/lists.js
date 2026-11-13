// Settings › Lists (PLAN.md, "Settings"): the categories, tags, series,
// bindings, materials, extras and places in use, each with how many books use
// it. Tapping one renames it everywhere; choosing a name already in use merges
// the two. Bindings, materials and extras are also the choices offered when a
// copy's binding is chosen (data format 4), so they can be added here, and
// removed while no copy uses them.

import { escapeHtml } from '../core/html.js';
import { listValues, renameValue } from '../core/lists.js';
import { FIELD_HELP } from './field-help.js';

// [kind, label, what each one counts]: categories and tags belong to works, series to editions, the rest to copies.
const KINDS = [['category', 'Categories', 'work'], ['tag', 'Tags', 'work'], ['series', 'Series', 'book'], ['binding', 'Bindings', 'copy'],
  ['material', 'Materials', 'copy'], ['extra', 'Extras', 'copy'], ['place', 'Places', 'copy']];
// The kinds whose choices are kept in the shared settings, by their key there, with the explanation shown above them.
const CHOICES = { binding: 'bindings', material: 'materials', extra: 'extras' };
const HELP = { binding: FIELD_HELP.binding, material: FIELD_HELP.material, extra: FIELD_HELP.extras };
const counted = (count, noun) => `${count} ${count === 1 ? noun : noun === 'copy' ? 'copies' : `${noun}s`}`;
const shown = value => (Array.isArray(value) ? value.join(' › ') : value);
const lastPart = value => (Array.isArray(value) ? value[value.length - 1] : value);

// The choices in the shared settings are listed even when no copy uses them yet.
function valuesOf(state, kind) {
  const values = listValues(state.records.values(), kind);
  if (!CHOICES[kind]) return values;
  const unused = state.settings[CHOICES[kind]].filter(name => !values.some(item => item.value === name)).map(value => ({ value, count: 0 }));
  return [...values, ...unused].sort((a, b) => a.value.localeCompare(b.value));
}

/** Draw the Lists section into `box`, and keep it working. */
export function renderLists(box, state, actions) {
  let kind = 'category';
  let editing = null; // the index of the value being renamed

  function draw() {
    const values = valuesOf(state, kind);
    const noun = KINDS.find(([value]) => value === kind)[2];
    const choices = CHOICES[kind] ? state.settings[CHOICES[kind]] : null;
    const kindsHtml = KINDS.map(([value, label]) => `<button class="chip${value === kind ? ' is-on' : ''}" data-list-kind="${value}">${escapeHtml(label)}</button>`).join('');
    const optionsHtml = values.map(item => `<option value="${escapeHtml(lastPart(item.value))}">`).join('');
    // A choice no copy uses can be removed; one in use is renamed or merged instead, so no copy is left with a choice the lists do not know.
    const removeHtml = item => (choices && !item.count && choices.includes(item.value) ? ` <button class="link" type="button" data-list-remove="${escapeHtml(item.value)}">Remove</button>` : '');
    const rowsHtml = values.map((item, i) => (i === editing
      ? `<li><form class="rename" data-rename-form="${i}"><label class="field">Rename “${escapeHtml(shown(item.value))}” to`
        + `<input name="to" value="${escapeHtml(lastPart(item.value))}" list="listNames" autocomplete="off"></label>`
        + '<div class="actions"><button class="btn btn-primary" type="submit">Rename</button><button class="btn" type="button" data-list-cancel>Cancel</button></div>'
        + '<p class="page-meta">Choosing a name already in the list merges the two.</p></form></li>'
      : `<li><button class="list-value" data-list-edit="${i}">${escapeHtml(shown(item.value))}</button><span class="page-meta">${escapeHtml(counted(item.count, noun))}${removeHtml(item)}</span></li>`)).join('');
    const addHtml = choices ? `<form class="rename" data-add-form><label class="field">Add a choice<input name="add" autocomplete="off"></label>
      <div class="actions"><button class="btn" type="submit">Add</button></div></form>` : '';
    const helpHtml = HELP[kind] ? `<p class="page-meta">${escapeHtml(`${HELP[kind]} These are the choices offered when adding or editing a book.`)}</p>` : '';
    box.innerHTML = `<div class="chips">${kindsHtml}</div>${helpHtml}
      <ul class="list-values">${rowsHtml || '<li class="page-meta">None in use yet.</li>'}</ul>${addHtml}
      <datalist id="listNames">${optionsHtml}</datalist>`;
    const input = box.querySelector('[name="to"]');
    if (input) { input.focus(); input.select(); }
  }

  box.onclick = async event => {
    const remove = event.target.closest('[data-list-remove]');
    if (remove) {
      const key = CHOICES[kind];
      await actions.saveSettings({ [key]: state.settings[key].filter(name => name !== remove.dataset.listRemove) }, { redraw: false });
      draw();
      return;
    }
    const target = event.target.closest('[data-list-kind], [data-list-edit], [data-list-cancel]');
    if (!target) return;
    if (target.dataset.listKind) { kind = target.dataset.listKind; editing = null; }
    else if (target.dataset.listEdit) editing = Number(target.dataset.listEdit);
    else editing = null;
    draw();
  };

  box.onsubmit = async event => {
    event.preventDefault();
    if (event.target.dataset.addForm !== undefined) {
      const name = event.target.add.value.trim();
      const key = CHOICES[kind];
      if (name && !state.settings[key].includes(name)) await actions.saveSettings({ [key]: [...state.settings[key], name] }, { redraw: false });
      draw();
      return;
    }
    const item = valuesOf(state, kind)[Number(event.target.dataset.renameForm)];
    const name = event.target.to.value.trim();
    if (!name || name === lastPart(item.value)) { editing = null; draw(); return; }
    const to = Array.isArray(item.value) ? [...item.value.slice(0, -1), name] : name;
    const changed = renameValue(state.records.values(), kind, item.value, to, actions.now());
    if (CHOICES[kind]) {
      const key = CHOICES[kind];
      await actions.saveSettings({ [key]: [...new Set(state.settings[key].map(choice => (choice === item.value ? name : choice)))] }, { redraw: false });
    }
    if (!changed.length || await actions.saveRecords(changed)) {
      actions.showNote(`Renamed “${shown(item.value)}” to “${shown(to)}” on ${changed.length} ${changed.length === 1 ? 'record' : 'records'}.`);
      editing = null;
      draw();
    }
  };

  draw();
}
