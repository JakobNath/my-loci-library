// The entry and editing form: the book (edition), its work or its contents,
// and our copy. Typed dates are read as they are typed, with a preview.
// Suggestions come from what the catalog already holds (<datalist>).
// Building the records is core's job (core/entry.js); this file only draws
// the form and reads it back.

import { escapeHtml } from '../core/html.js';
import { parseDating, formatYearRange } from '../core/dating.js';
import { contentsLine } from '../core/contents.js';
import { recordsFromForm, formFromWish } from '../core/entry.js';
import { STATUSES, ROLES } from '../core/records.js';
import { trashBook, trashRecord } from '../core/trash.js';
import { iconHtml } from './icons.js';
import { helpHtml, toggleHelp } from './field-help.js';

const attr = value => escapeHtml(value ?? '');

// help: the field's name in FIELD_HELP (ui/field-help.js), for an "i" beside the label.
function fieldHtml(label, name, value, { type = 'text', list = '', wide = false, hint = '', help = false } = {}) {
  const helpParts = help ? helpHtml(name) : { button: '', text: '' };
  const labelHtml = help ? `<span class="field-label">${escapeHtml(label)}${helpParts.button}</span>` : escapeHtml(label);
  return `<label class="field"${wide ? ' style="grid-column:1/-1"' : ''}>${labelHtml}`
    + `<input name="${name}" type="${type}" value="${attr(value)}"${list ? ` list="${list}"` : ''}${type === 'number' ? ' inputmode="numeric"' : ''}>`
    + (hint ? `<span class="preview">${escapeHtml(hint)}</span>` : '') + `${helpParts.text}</label>`;
}

function datalistsHtml(library, settings) {
  const sets = { authors: new Set(), publishers: new Set(), places: new Set(), series: new Set(), sets: new Set(), languages: new Set(), categories: new Set(), bindings: new Set(settings.bindings) };
  const locations = [new Set(), new Set(), new Set(), new Set()];
  for (const author of library.authorsById.values()) sets.authors.add(author.name);
  for (const entry of library.entries) {
    const e = entry.edition;
    [['publishers', e.publisher], ['places', e.place], ['series', e.series], ['sets', e.set]].forEach(([name, value]) => value && sets[name].add(value));
    e.languages.forEach(language => sets.languages.add(language));
    entry.works.forEach(work => work.category && sets.categories.add(work.category));
    for (const copy of entry.copies) {
      if (copy.binding) sets.bindings.add(copy.binding);
      copy.location.forEach((part, i) => locations[i] && locations[i].add(part));
    }
  }
  const list = (id, values) => `<datalist id="${id}">${[...values].sort().map(value => `<option value="${attr(value)}">`).join('')}</datalist>`;
  return Object.entries(sets).map(([id, values]) => list(id, values)).join('') + locations.map((values, i) => list(`location${i}`, values)).join('');
}

function datingRowHtml(dating, i) {
  return `<div class="field-row dating-row"><label class="field">Original date${i ? ` (dating ${i + 1})` : ''}`
    + `<input name="datingText" value="${attr(dating.text)}" placeholder="c. 397, 1530–59, early 2nd c." autocomplete="off"><span class="preview" data-preview></span></label>`
    + `<label class="field">Note<input name="datingNote" value="${attr(dating.note)}" placeholder="majority view"></label>`
    + `<label class="check"><input type="radio" name="working" value="${i}"${dating.working || (!i && !dating.text) ? ' checked' : ''}> Working date</label></div>`;
}

function contributorRowHtml(person) {
  const options = ROLES.map(role => `<option${role === person.role ? ' selected' : ''}>${role}</option>`).join('');
  return `<div class="field-row"><label class="field">Role<select name="contributorRole">${options}</select></label>`
    + `<label class="field">Name<input name="contributorName" value="${attr(person.name)}"></label></div>`;
}

/**
 * Draw the form for a new book (#/new), one bought from the wishlist
 * (#/new/<wishlist item id>), or an existing one (#/edit/<edition id>).
 */
export function render(container, state, actions) {
  const entry = state.route.name === 'edit' ? state.library.entries.find(item => item.id === state.route.id) : null;
  const wishRecord = state.route.name === 'new' ? state.records.get(state.route.id) : null;
  const wish = wishRecord && wishRecord.type === 'wishlist' ? formFromWish(wishRecord) : null;
  const edition = entry ? entry.edition : wish ? wish.edition : { title: '', subtitle: '', contributors: [], languages: [], medium: 'physical' };
  const copy = entry && entry.copies[0] ? entry.copies[0] : { binding: '', location: [], acquired: '', price: null, value: null, markings: false, notes: wish ? wish.notes : '', status: 'owned' };
  const isAnthology = entry ? entry.works.length > 1 : false;
  const work = entry && entry.works.length === 1 ? entry.works[0] : { title: '', originalTitle: '', originalLanguage: '', datings: [], category: '', tags: [] };
  const authorsText = entry && !isAnthology ? entry.authors.map(author => author.name).join('; ') : wish ? wish.authorsText : '';
  const contentsText = isAnthology ? entry.works.map(w => contentsLine(w, w.authors.map(id => state.library.authorsById.get(id)?.name || ''))).join('\n') : '';
  const datingsHtml = [...work.datings, { text: '', note: '', working: false }].map(datingRowHtml).join('');
  const contributorsHtml = [...edition.contributors, { name: '', role: 'translator' }].map(contributorRowHtml).join('');
  const statusHtml = STATUSES.map(status => `<option${status === copy.status ? ' selected' : ''}>${status}</option>`).join('');
  const locationHtml = ['Place', 'Room', 'Case', 'Shelf'].map((label, i) => fieldHtml(label, 'location', copy.location[i], { list: `location${i}` })).join('');
  const backHtml = entry ? `<a class="back" href="#/book/${attr(entry.id)}">${iconHtml('back')} Back to the book</a>`
    : wish ? `<a class="back" href="#/wishlist">${iconHtml('back')} Wishlist</a>` : '';
  const titleHtml = entry ? 'Edit book' : wish ? 'Add the book you bought' : 'Add a book';
  const historyRowsHtml = (copy.valueHistory || []).map(point => `<label class="check"><input type="checkbox" name="dropHistory" value="${attr(point.date)}"> Delete ${escapeHtml(`${point.date}: ${point.value}`)}</label>`).join('');
  const historyHtml = historyRowsHtml ? `<details class="small"><summary>Value history</summary>${historyRowsHtml}</details>` : '';
  const trashHtml = entry ? '<button class="btn" type="button" data-action="trash">Move to trash</button>' : '';
  container.innerHTML = `${backHtml}
    <div class="page-head"><h1 class="page-title">${titleHtml}</h1><p class="page-meta">Fill in what you know; everything but the title can wait.</p></div>
    <form class="form" novalidate>
      <div class="problems" hidden></div>
      <fieldset><legend>Book</legend>
        ${fieldHtml('Title', 'title', edition.title, { wide: true })}
        ${fieldHtml('Subtitle', 'subtitle', edition.subtitle, { wide: true })}
        <label class="check"><input type="checkbox" name="several"${isAnthology ? ' checked' : ''}> This book holds several works (an anthology)</label>
        <div data-single${isAnthology ? ' hidden' : ''}>${fieldHtml('Authors (separate with ;)', 'authors', authorsText, { list: 'authors', wide: true })}</div>
        <label class="field" data-several${isAnthology ? '' : ' hidden'}>Contents: one work per line, as "Author — Title — date" (author and date optional). A table of contents can be pasted here.
          <textarea name="contents" rows="8">${escapeHtml(contentsText)}</textarea></label>
        ${contributorsHtml}<button type="button" class="link" data-action="contributor">Add another contributor</button>
      </fieldset>
      <fieldset data-single${isAnthology ? ' hidden' : ''}><legend>The work</legend>
        ${datingsHtml}<button type="button" class="link" data-action="dating">Add another dating</button>
        <div class="field-row">${fieldHtml('Original title', 'originalTitle', work.originalTitle, { help: true })}${fieldHtml('Original language', 'originalLanguage', work.originalLanguage, { list: 'languages', help: true })}</div>
        <div class="field-row">${fieldHtml('Category', 'category', work.category, { list: 'categories', help: true })}${fieldHtml('Tags (separate with ,)', 'tags', work.tags.join(', '), { help: true })}</div>
      </fieldset>
      <fieldset><legend>Edition</legend>
        <div class="field-row">${fieldHtml('Publisher', 'publisher', edition.publisher, { list: 'publishers' })}${fieldHtml('Place', 'place', edition.place, { list: 'places' })}${fieldHtml('Year', 'year', edition.year, { type: 'number' })}</div>
        <div class="field-row">${fieldHtml('Edition', 'editionStatement', edition.editionStatement, { help: true })}${fieldHtml('Translation first published', 'translationFirstPublished', edition.translationFirstPublished, { type: 'number', help: true })}</div>
        <div class="field-row">${fieldHtml('Series', 'series', edition.series, { list: 'series', help: true })}${fieldHtml('Number', 'seriesNumber', edition.seriesNumber)}</div>
        <div class="field-row">${fieldHtml('Set', 'set', edition.set, { list: 'sets', help: true })}${fieldHtml('Volume', 'volume', edition.volume)}</div>
        <div class="field-row">${fieldHtml('ISBN', 'isbn', edition.isbn)}${fieldHtml('Pages, as printed', 'pages', edition.pages, { help: true })}${fieldHtml('Languages (separate with ,)', 'languages', edition.languages.join(', '), { help: true })}</div>
        <div class="field-row"><label class="field">Format<select name="medium"><option value="physical">Physical</option><option value="logos"${edition.medium === 'logos' ? ' selected' : ''}>Logos</option></select></label>${fieldHtml('Logos resource ID', 'logosId', edition.logosId)}</div>
      </fieldset>
      <fieldset><legend>Our copy</legend>
        <div class="field-row">${fieldHtml('Binding', 'binding', copy.binding, { list: 'bindings', help: true })}${fieldHtml('Acquired', 'acquired', copy.acquired, { hint: '"2019", "before 2015", or blank' })}</div>
        <div class="field-row">${locationHtml}</div>
        <div class="field-row">${fieldHtml('Price paid', 'price', copy.price, { type: 'number' })}${fieldHtml('Estimated value', 'value', copy.value, { type: 'number' })}
          <label class="field">Status<select name="status">${statusHtml}</select></label></div>
        ${historyHtml}
        <label class="check"><input type="checkbox" name="markings"${copy.markings ? ' checked' : ''}> Writing or markings when acquired</label>
        <label class="field">Notes<textarea name="notes" rows="4">${escapeHtml(copy.notes)}</textarea></label>
      </fieldset>
      <div class="actions"><button class="btn btn-primary" type="submit">Save</button>${trashHtml}</div>
      ${datalistsHtml(state.library, state.settings)}
    </form>`;

  const form = container.querySelector('form');
  form.querySelectorAll('[name="datingText"]').forEach(showPreview);
  container.oninput = event => { if (event.target.name === 'datingText') showPreview(event.target); };
  container.onchange = event => {
    if (event.target.name !== 'several') return;
    form.querySelectorAll('[data-single]').forEach(part => { part.hidden = event.target.checked; });
    form.querySelector('[data-several]').hidden = !event.target.checked;
  };
  container.onclick = event => {
    if (event.target.dataset.help) { toggleHelp(container, event.target); return; }
    const action = event.target.dataset.action;
    if (action === 'dating') event.target.insertAdjacentHTML('beforebegin', datingRowHtml({ text: '', note: '' }, form.querySelectorAll('.dating-row').length));
    if (action === 'trash') moveToTrash(entry, state, actions);
    if (action === 'contributor') event.target.insertAdjacentHTML('beforebegin', contributorRowHtml({ name: '', role: 'translator' }));
  };
  container.onsubmit = async event => {
    event.preventDefault();
    const existing = entry ? { edition: entry.edition, copy: entry.copies[0] || null, works: entry.works } : null;
    const result = recordsFromForm(readForm(form), existing, { newId: actions.newId, now: actions.now(), today: actions.today(), authors: [...state.library.authorsById.values()] });
    const problems = form.querySelector('.problems');
    if (result.problems.length) {
      problems.textContent = result.problems.join(' ');
      problems.hidden = false;
      problems.scrollIntoView({ block: 'center' });
      return;
    }
    // A wishlist item just bought leaves the wishlist (to the trash, so nothing is lost),
    // and its cover becomes the new book's cover: the same picture files, under the same ID.
    if (wishRecord && wish) {
      result.records = result.records.map(record => (record.type === 'edition' ? { ...record, images: wishRecord.images } : record));
      result.records.push(trashRecord(wishRecord, actions.today(), actions.now()));
    }
    if (await actions.saveRecords(result.records)) {
      actions.showNote(wish ? 'Added to the library, and taken off the wishlist' : 'Saved');
      actions.go(`#/book/${result.editionId}`);
    }
  };
}

// Deleting moves the book to the trash (PLAN.md, "Status"); Settings › Trash restores it.
async function moveToTrash(entry, state, actions) {
  if (await actions.saveRecords(trashBook(state.records, entry.id, actions.today(), actions.now()))) {
    actions.showNote('Moved to the trash. Settings › Trash brings it back.');
    actions.go('#/');
  }
}

function showPreview(input) {
  const preview = input.parentElement.querySelector('[data-preview]');
  if (!input.value.trim()) { preview.textContent = ''; return; }
  const read = parseDating(input.value);
  preview.classList.toggle('is-problem', !read.ok);
  if (!read.ok) { preview.textContent = read.problem; return; }
  const { earliest, latest, certainty } = read.dating;
  preview.innerHTML = `Read as <strong>${escapeHtml(formatYearRange(earliest, latest))}</strong> (${escapeHtml(certainty)})`;
}

// The form's values in the shape core/entry.js expects.
function readForm(form) {
  const data = new FormData(form);
  const text = name => (data.get(name) || '').toString().trim();
  const list = (name, separator) => text(name).split(separator).map(part => part.trim()).filter(Boolean);
  const roles = data.getAll('contributorRole');
  const working = Number(data.get('working') || 0);
  return {
    title: text('title'), subtitle: text('subtitle'), authors: list('authors', ';'),
    contributors: data.getAll('contributorName').map((name, i) => ({ name: name.toString().trim(), role: roles[i] })),
    publisher: text('publisher'), place: text('place'), year: text('year'), editionStatement: text('editionStatement'),
    translationFirstPublished: text('translationFirstPublished'), series: text('series'), seriesNumber: text('seriesNumber'),
    set: text('set'), volume: text('volume'), isbn: text('isbn'), pages: text('pages'), languages: list('languages', ','),
    medium: text('medium') || 'physical', logosId: text('logosId'),
    contents: data.get('several') ? text('contents') : null,
    work: {
      title: '', originalTitle: text('originalTitle'), originalLanguage: text('originalLanguage'), category: text('category'), tags: list('tags', ','),
      datings: data.getAll('datingText').map((value, i) => ({ text: value.toString(), note: (data.getAll('datingNote')[i] || '').toString().trim(), working: i === working })),
    },
    copy: {
      binding: text('binding'), location: data.getAll('location').map(part => part.toString().trim()), acquired: text('acquired'),
      price: text('price'), value: text('value'), status: text('status') || 'owned', markings: !!data.get('markings'), notes: (data.get('notes') || '').toString(),
      dropHistory: data.getAll('dropHistory').map(String),
    },
  };
}
