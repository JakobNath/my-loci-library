// The Wishlist tab (PLAN.md, "Wishlist"): books we want, each with one free
// note. Items are added and edited in place; "I bought it" opens the normal
// entry form filled from the item, and the item then leaves the wishlist.

import { escapeHtml } from '../core/html.js';
import { normalizeForSearch } from '../core/search.js';
import { wishFromForm } from '../core/entry.js';
import { trashRecord } from '../core/trash.js';

const SORTS = [['added', 'Newest'], ['title', 'Title'], ['author', 'Author']];
const sortKey = {
  added: item => item.created,
  title: item => normalizeForSearch(item.title.replace(/^(the|a|an) /i, '')),
  author: item => normalizeForSearch(item.authors[0] ? item.authors[0].split(' ').pop() : '~'),
};

function sortedItems(items, sort) {
  const key = sortKey[sort] || sortKey.added;
  const keyed = items.map(item => ({ item, key: key(item) }));
  keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) * (sort === 'added' ? -1 : 1));
  return keyed.map(({ item }) => item);
}

function formHtml(item) {
  const value = text => escapeHtml(text ?? '');
  const translator = item ? (item.contributors.find(person => person.role === 'translator') || {}).name : '';
  return `<form class="form block" data-wish-form="${value(item ? item.id : '')}" novalidate>
      <p class="problems" hidden></p>
      <label class="field">Title<input name="title" value="${value(item && item.title)}" autocomplete="off"></label>
      <label class="field">Subtitle<input name="subtitle" value="${value(item && item.subtitle)}" autocomplete="off"></label>
      <label class="field">Authors (separate with ;)<input name="authors" value="${value(item && item.authors.join('; '))}" autocomplete="off"></label>
      <div class="field-row"><label class="field">Translator<input name="translator" value="${value(translator)}" autocomplete="off"></label>
        <label class="field">Publisher<input name="publisher" value="${value(item && item.publisher)}" autocomplete="off"></label>
        <label class="field">ISBN<input name="isbn" value="${value(item && item.isbn)}" inputmode="numeric" autocomplete="off"></label></div>
      <label class="field">Note: why we want it, prices, where we saw it<textarea name="notes" rows="3">${value(item && item.notes)}</textarea></label>
      <div class="actions"><button class="btn btn-primary" type="submit">Save</button><button class="btn" type="button" data-action="cancel">Cancel</button></div>
    </form>`;
}

function itemHtml(item) {
  const translator = item.contributors.find(person => person.role === 'translator');
  const lineHtml = escapeHtml([item.subtitle, item.authors.join(', '), translator && `trans. ${translator.name}`, item.publisher, item.isbn && `ISBN ${item.isbn}`].filter(Boolean).join(' · '));
  const notesHtml = item.notes ? `<div class="notes"><p>${escapeHtml(item.notes)}</p></div>` : '';
  return `<div class="block wish" id="wish-${escapeHtml(item.id)}"><h2 class="block-title">${escapeHtml(item.title)}</h2>`
    + `<p class="detail-author">${lineHtml}</p>${notesHtml}`
    + `<div class="actions"><a class="btn btn-primary" href="#/new/${escapeHtml(item.id)}">I bought it</a>`
    + `<button class="btn" data-action="edit" data-id="${escapeHtml(item.id)}">Edit</button>`
    + `<button class="btn" data-action="remove" data-id="${escapeHtml(item.id)}">Remove</button></div></div>`;
}

export function render(container, state, actions) {
  let editing = null; // null, 'new', or the ID of the item being edited

  function draw() {
    const sort = state.device.wishSort || state.settings.defaultSort.wishlist;
    const items = sortedItems(state.library.wishlist.map(wish => wish.item), sort);
    const sortHtml = SORTS.map(([value, label]) => `<button class="chip${value === sort ? ' is-on' : ''}" data-action="sort" data-value="${value}">${escapeHtml(label)}</button>`).join('');
    const listHtml = items.map(item => (editing === item.id ? formHtml(item) : itemHtml(item))).join('');
    const countHtml = escapeHtml(`${items.length} wanted`);
    const newFormHtml = editing === 'new' ? formHtml(null) : '';
    const addButtonHtml = editing === 'new' ? '' : '<button class="btn btn-primary" data-action="new">Add to wishlist</button>';
    container.innerHTML = `<div class="page-head"><h1 class="page-title">Wishlist</h1><p class="page-meta">${countHtml}</p></div>
      <div class="toolbar"><div class="chips">${sortHtml}</div>${addButtonHtml}</div>
      ${newFormHtml}
      ${listHtml || (editing ? '' : '<p class="empty">Nothing on the wishlist yet.</p>')}`;
    const form = container.querySelector('[data-wish-form]');
    if (form) form.querySelector('input').focus();
  }

  container.onclick = async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, id, value } = button.dataset;
    if (action === 'sort') { actions.setDevice({ wishSort: value }); return; }
    if (action === 'remove') {
      const record = state.records.get(id);
      if (await actions.saveRecords([trashRecord(record, actions.today(), actions.now())])) actions.showNote(`Removed: ${record.title}. Settings › Trash brings it back.`);
      editing = null;
    } else editing = action === 'new' ? 'new' : action === 'edit' ? id : null;
    draw();
  };

  container.onsubmit = async event => {
    event.preventDefault();
    const form = event.target;
    const existing = form.dataset.wishForm ? state.records.get(form.dataset.wishForm) : null;
    const { record, problems } = wishFromForm(Object.fromEntries(new FormData(form)), existing, { newId: actions.newId, now: actions.now() });
    if (problems.length) {
      const box = form.querySelector('.problems');
      box.textContent = problems.join(' ');
      box.hidden = false;
      return;
    }
    if (await actions.saveRecords([record])) {
      editing = null;
      draw();
    }
  };

  draw();
}
