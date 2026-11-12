// "Works in this book" (#/edit/<edition id>/works): one page to give every
// work of a collection its original title and language, its date, category
// and tags (PLAN.md, "Book detail page"). "Same for all" fills a field for
// every work whose own box is left empty, so the five dialogues of Plato I
// take "Greek" and "Philosophy" in one go. The works' order and the list
// itself are changed in the entry form; this page only fills in each work.
// Building the records is core's job (worksFromRows in core/entry.js).

import { escapeHtml } from '../core/html.js';
import { parseDating, formatYearRange } from '../core/dating.js';
import { worksFromRows } from '../core/entry.js';
import { iconHtml } from './icons.js';

const attr = value => escapeHtml(value ?? '');
const fieldHtml = (label, name, value, list = '') => `<label class="field">${escapeHtml(label)}<input name="${name}" value="${attr(value)}"${list ? ` list="${list}"` : ''} autocomplete="off"></label>`;
const splitTags = text => String(text || '').split(',').map(tag => tag.trim()).filter(Boolean);

// The languages and categories already used, offered as the boxes are typed in.
function datalistsHtml(library) {
  const languages = new Set(['English', 'Latin', 'Greek', 'German', 'Hebrew', 'French']);
  const categories = new Set();
  for (const work of library.worksById.values()) {
    if (work.originalLanguage) languages.add(work.originalLanguage);
    if (work.category) categories.add(work.category);
  }
  const list = (id, values) => `<datalist id="${id}">${[...values].sort().map(value => `<option value="${attr(value)}">`).join('')}</datalist>`;
  return list('workLanguages', languages) + list('workCategories', categories);
}

function rowHtml(work, i) {
  const disputed = work.datings.length > 1;
  const dating = work.datings.find(item => item.working) || work.datings[0];
  const dateHtml = disputed
    ? `<p class="preview">${escapeHtml(`${work.datings.length} datings (working: ${dating.text}); changed in the entry form of a book holding only this work.`)}</p><input type="hidden" name="dating" value="">`
    : `<label class="field">Original date<input name="dating" value="${attr(dating ? dating.text : '')}" placeholder="c. 397, 4th c. BC" autocomplete="off"><span class="preview" data-preview></span></label>`;
  return `<fieldset data-row="${attr(work.id)}"><legend>${escapeHtml(`${i + 1}. ${work.title}`)}</legend>
      ${fieldHtml('Title', 'title', work.title)}
      <div class="field-row">${fieldHtml('Original title', 'originalTitle', work.originalTitle)}${fieldHtml('Original language', 'originalLanguage', work.originalLanguage, 'workLanguages')}</div>
      ${dateHtml}
      <div class="field-row">${fieldHtml('Category', 'category', work.category, 'workCategories')}${fieldHtml('Tags (separate with ,)', 'tags', work.tags.join(', '))}</div>
    </fieldset>`;
}

/** Draw the page for one collection. */
export function render(container, state, actions) {
  const editionId = state.route.id.split('/')[0];
  const entry = state.library.entries.find(item => item.id === editionId);
  if (!entry) {
    container.innerHTML = '<p class="empty">This book is not in the catalog (it may be in the trash).</p>';
    return;
  }
  const works = entry.edition.contents.map(piece => entry.works.find(work => work.id === piece.work)).filter(Boolean);
  const rowsHtml = works.map(rowHtml).join('');
  container.innerHTML = `<a class="back" href="#/book/${escapeHtml(entry.id)}">${iconHtml('back')} Back to the book</a>
    <div class="page-head"><h1 class="page-title">Works in this book</h1>
      <p class="page-meta">${escapeHtml(`${entry.edition.title}: ${works.length} works. Fill in what you know; everything can wait. Each work is shared by every book that holds it.`)}</p></div>
    <form class="form" novalidate>
      <div class="problems" hidden></div>
      <fieldset><legend>Same for all</legend>
        <p class="preview">Fills every work below whose own box is left empty.</p>
        <div class="field-row">${fieldHtml('Original language', 'sameLanguage', '', 'workLanguages')}${fieldHtml('Category', 'sameCategory', '', 'workCategories')}</div>
        ${fieldHtml('Tags (separate with ,)', 'sameTags', '')}
      </fieldset>
      ${rowsHtml}
      <div class="actions"><button class="btn btn-primary" type="submit">Save the works</button><a class="btn" href="#/edit/${escapeHtml(entry.id)}">Change the list of works</a></div>
      ${datalistsHtml(state.library)}
    </form>`;

  const form = container.querySelector('form');
  form.querySelectorAll('[name="dating"]').forEach(showPreview);
  container.oninput = event => { if (event.target.name === 'dating') showPreview(event.target); };
  container.onsubmit = async event => {
    event.preventDefault();
    const value = (scope, name) => (scope.querySelector(`[name="${name}"]`) || { value: '' }).value;
    const rows = [...form.querySelectorAll('[data-row]')].map(row => ({
      id: row.dataset.row, title: value(row, 'title'), originalTitle: value(row, 'originalTitle'), originalLanguage: value(row, 'originalLanguage'),
      dating: value(row, 'dating'), category: value(row, 'category'), tags: splitTags(value(row, 'tags')),
    }));
    const same = { originalLanguage: value(form, 'sameLanguage'), category: value(form, 'sameCategory'), tags: splitTags(value(form, 'sameTags')) };
    const result = worksFromRows(rows, same, state.library.worksById, actions.now());
    const problems = form.querySelector('.problems');
    if (result.problems.length) {
      problems.textContent = result.problems.join(' ');
      problems.hidden = false;
      problems.scrollIntoView({ block: 'center' });
      return;
    }
    if (!result.records.length || await actions.saveRecords(result.records)) {
      actions.showNote(result.records.length ? `Saved ${result.records.length} ${result.records.length === 1 ? 'work' : 'works'}` : 'Nothing was changed');
      actions.go(`#/book/${entry.id}`);
    }
  };
}

// How a typed date was read, under its box, as in the entry form.
function showPreview(input) {
  const preview = input.parentElement.querySelector('[data-preview]');
  if (!preview) return;
  if (!input.value.trim()) { preview.textContent = ''; return; }
  const read = parseDating(input.value);
  preview.classList.toggle('is-problem', !read.ok);
  preview.innerHTML = read.ok ? `Read as <strong>${escapeHtml(formatYearRange(read.dating.earliest, read.dating.latest))}</strong>` : escapeHtml(read.problem);
}
