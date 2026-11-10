// Settings › Lists (PLAN.md, "Settings"): the categories, tags, series,
// bindings and places in use, each with how many books use it. Tapping one
// renames it everywhere; choosing a name already in use merges the two.

import { escapeHtml } from '../core/html.js';
import { listValues, renameValue } from '../core/lists.js';

// [kind, label, what each one counts]: categories and tags belong to works, series to editions, bindings and places to copies.
const KINDS = [['category', 'Categories', 'work'], ['tag', 'Tags', 'work'], ['series', 'Series', 'book'], ['binding', 'Bindings', 'copy'], ['place', 'Places', 'copy']];
const counted = (count, noun) => `${count} ${count === 1 ? noun : noun === 'copy' ? 'copies' : `${noun}s`}`;
const shown = value => (Array.isArray(value) ? value.join(' › ') : value);
const lastPart = value => (Array.isArray(value) ? value[value.length - 1] : value);

// Binding choices from the shared settings are listed even when no copy uses them yet.
function valuesOf(state, kind) {
  const values = listValues(state.records.values(), kind);
  if (kind !== 'binding') return values;
  const unused = state.settings.bindings.filter(name => !values.some(item => item.value === name)).map(value => ({ value, count: 0 }));
  return [...values, ...unused].sort((a, b) => a.value.localeCompare(b.value));
}

/** Draw the Lists section into `box`, and keep it working. */
export function renderLists(box, state, actions) {
  let kind = 'category';
  let editing = null; // the index of the value being renamed

  function draw() {
    const values = valuesOf(state, kind);
    const noun = KINDS.find(([value]) => value === kind)[2];
    const kindsHtml = KINDS.map(([value, label]) => `<button class="chip${value === kind ? ' is-on' : ''}" data-list-kind="${value}">${escapeHtml(label)}</button>`).join('');
    const optionsHtml = values.map(item => `<option value="${escapeHtml(lastPart(item.value))}">`).join('');
    const rowsHtml = values.map((item, i) => (i === editing
      ? `<li><form class="rename" data-rename-form="${i}"><label class="field">Rename “${escapeHtml(shown(item.value))}” to`
        + `<input name="to" value="${escapeHtml(lastPart(item.value))}" list="listNames" autocomplete="off"></label>`
        + '<div class="actions"><button class="btn btn-primary" type="submit">Rename</button><button class="btn" type="button" data-list-cancel>Cancel</button></div>'
        + '<p class="page-meta">Choosing a name already in the list merges the two.</p></form></li>'
      : `<li><button class="list-value" data-list-edit="${i}">${escapeHtml(shown(item.value))}</button><span class="page-meta">${escapeHtml(counted(item.count, noun))}</span></li>`)).join('');
    box.innerHTML = `<div class="chips">${kindsHtml}</div>
      <ul class="list-values">${rowsHtml || '<li class="page-meta">None in use yet.</li>'}</ul>
      <datalist id="listNames">${optionsHtml}</datalist>`;
    const input = box.querySelector('[name="to"]');
    if (input) { input.focus(); input.select(); }
  }

  box.onclick = event => {
    const target = event.target.closest('[data-list-kind], [data-list-edit], [data-list-cancel]');
    if (!target) return;
    if (target.dataset.listKind) { kind = target.dataset.listKind; editing = null; }
    else if (target.dataset.listEdit) editing = Number(target.dataset.listEdit);
    else editing = null;
    draw();
  };

  box.onsubmit = async event => {
    event.preventDefault();
    const item = valuesOf(state, kind)[Number(event.target.dataset.renameForm)];
    const name = event.target.to.value.trim();
    if (!name || name === lastPart(item.value)) { editing = null; draw(); return; }
    const to = Array.isArray(item.value) ? [...item.value.slice(0, -1), name] : name;
    const changed = renameValue(state.records.values(), kind, item.value, to, actions.now());
    if (kind === 'binding') await actions.saveSettings({ bindings: [...new Set(state.settings.bindings.map(binding => (binding === item.value ? name : binding)))] }, { redraw: false });
    if (!changed.length || await actions.saveRecords(changed)) {
      actions.showNote(`Renamed “${shown(item.value)}” to “${shown(to)}” on ${changed.length} ${changed.length === 1 ? 'record' : 'records'}.`);
      editing = null;
      draw();
    }
  };

  draw();
}
