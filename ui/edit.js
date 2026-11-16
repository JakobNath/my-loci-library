// The entry and editing form: the book (edition), its work or its contents,
// and our copy. Typed dates are read as they are typed, with a preview.
// Suggestions come from what the catalog already holds (<datalist>).
// Building the records is core's job (core/entry.js); this file only draws
// the form and reads it back.

import { escapeHtml } from '../core/html.js';
import { parseDating, formatYearRange, opinionsOf, revisedDating, workingDating } from '../core/dating.js';
import { contentsLine } from '../core/contents.js';
import { recordsFromForm, formFromWish } from '../core/entry.js';
import { STATUSES, ROLES, withField } from '../core/records.js';
import { trashBook, trashRecord } from '../core/trash.js';
import { iconHtml } from './icons.js';
import { helpHtml, toggleHelp } from './field-help.js';
import { fillImages } from './images.js';
import { wireTidyPaste } from './paste-contents.js';
import { workDateQuestion, searchTitle } from '../core/date-search.js';
import { dateRuleHtml, searchLinkHtml, refreshSearchLink, kindChipsHtml, kindForDating, toggleKind, chosenDatingKind, revisedHtml, useVersionChip } from './date-help.js';
import { bindingChoicesHtml, toggleBindingChip, readBindingChoices } from './binding-choices.js';

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
  const sets = { authors: new Set(), publishers: new Set(), places: new Set(), series: new Set(), sets: new Set(), languages: new Set(), categories: new Set() };
  const locations = [new Set(), new Set(), new Set(), new Set()];
  for (const author of library.authorsById.values()) sets.authors.add(author.name);
  for (const entry of library.entries) {
    const e = entry.edition;
    [['publishers', e.publisher], ['places', e.place], ['series', e.series], ['sets', e.set]].forEach(([name, value]) => value && sets[name].add(value));
    e.languages.forEach(language => sets.languages.add(language));
    entry.works.forEach(work => work.category && sets.categories.add(work.category));
    for (const copy of entry.copies) {
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
    + `<label class="check"><input type="radio" name="working" value="${i}"${dating.working || (!i && !dating.text) ? ' checked' : ''}> Working date</label>`
    // The dating's kind is kept as it was, unless a kind of work is chosen for the working dating.
    + `<input type="hidden" name="datingKind" value="${attr(dating.kind || '')}"></div>`;
}

function contributorRowHtml(person) {
  // "other" (an assistant editor, a foreword's author) goes to Zotero as a contributor, which Chicago does not print.
  const label = role => (role === 'other' ? 'other (not cited)' : role);
  const options = ROLES.map(role => `<option value="${role}"${role === person.role ? ' selected' : ''}>${label(role)}</option>`).join('');
  return `<div class="field-row"><label class="field">Role<select name="contributorRole">${options}</select></label>`
    + `<label class="field">Name<input name="contributorName" value="${attr(person.name)}"></label></div>`;
}

/**
 * Draw the form for a new book (#/new), one bought from the wishlist
 * (#/new/<wishlist item id>), or an existing one (#/edit/<edition id>, its
 * first copy; #/edit/<edition id>/<copy id>, another copy).
 * "Works in this book" (#/edit/<edition id>/works) is its own page, ui/works.js,
 * reached through this screen so the app's start-up code does not grow.
 */
export function render(container, state, actions) {
  const [routeId, part] = state.route.id.split('/');
  if (state.route.name === 'edit' && part === 'works') {
    import('./works.js').then(module => module.render(container, state, actions))
      .catch(error => actions.showNote(`This page could not be loaded (${error.message}). Check the connection once; after that it works offline.`));
    return;
  }
  const entry = state.route.name === 'edit' ? state.library.entries.find(item => item.id === routeId) : null;
  const wishRecord = state.route.name === 'new' ? state.records.get(state.route.id) : null;
  const wish = wishRecord && wishRecord.type === 'wishlist' ? formFromWish(wishRecord) : null;
  const edition = entry ? entry.edition : wish ? wish.edition : { title: '', subtitle: '', contributors: [], languages: [], otherIsbns: [], medium: 'physical' };
  // #/edit/<edition id> edits the first copy; #/edit/<edition id>/<copy id> another one (its link is on the book page).
  const chosenCopy = entry ? (part ? entry.copies.find(item => item.id === part) : entry.copies[0]) || null : null;
  if (entry && part && !chosenCopy) {
    container.innerHTML = `<a class="back" href="#/book/${escapeHtml(entry.id)}">${iconHtml('back')} Back to the book</a><p class="empty">This copy is not in the catalog on this device.</p>`;
    return;
  }
  const copy = chosenCopy || { binding: null, material: null, extras: [], location: [], acquired: '', price: null, value: null, markings: false, notes: wish ? wish.notes : '', status: 'owned' };
  const copyLegend = entry && entry.copies.length > 1 ? `Our copy (${entry.copies.indexOf(chosenCopy) + 1} of ${entry.copies.length})` : 'Our copy';
  const isAnthology = entry ? entry.works.length > 1 : false;
  const work = entry && entry.works.length === 1 ? entry.works[0] : { title: '', originalTitle: '', originalLanguage: '', datings: [], category: '', tags: [] };
  const authorsText = entry && !isAnthology ? entry.authors.map(author => author.name).join('; ') : wish ? wish.authorsText : '';
  // Each line carries the work's own translator in this book, so saving the form keeps it.
  const translatorIn = w => (edition.contents.find(item => item.work === w.id) || {}).translator || null;
  const contentsText = isAnthology ? entry.works.map(w => contentsLine(w, w.authors.map(id => state.library.authorsById.get(id)?.name || ''), translatorIn(w))).join('\n') : '';
  // A final revised edition has its own box ("Revised later?"), so the dating rows hold only the opinions.
  const datingsHtml = [...opinionsOf(work), { text: '', note: '', working: false }].map(datingRowHtml).join('');
  const workingKind = (workingDating(work) || {}).kind;
  const version = entry && !isAnthology ? (edition.contents.find(item => item.work === work.id) || {}).version || '' : '';
  const revisedBoxHtml = revisedHtml({ first: (workingDating(work) || {}).text || '', revised: (revisedDating(work) || {}).text || '', version });
  const contributorsHtml = [...edition.contributors, { name: '', role: 'translator' }].map(contributorRowHtml).join('');
  const statusHtml = STATUSES.map(status => `<option${status === copy.status ? ' selected' : ''}>${status}</option>`).join('');
  const locationHtml = ['Place', 'Room', 'Case', 'Shelf'].map((label, i) => fieldHtml(label, 'location', copy.location[i], { list: `location${i}` })).join('');
  const backHtml = entry ? `<a class="back" href="#/book/${attr(entry.id)}">${iconHtml('back')} Back to the book</a>`
    : wish ? `<a class="back" href="#/wishlist">${iconHtml('back')} Wishlist</a>` : '';
  const titleHtml = entry ? 'Edit book' : wish ? 'Add the book you bought' : 'Add a book';
  const historyRowsHtml = (copy.valueHistory || []).map(point => `<label class="check"><input type="checkbox" name="dropHistory" value="${attr(point.date)}"> Delete ${escapeHtml(`${point.date}: ${point.value}`)}</label>`).join('');
  const historyHtml = historyRowsHtml ? `<details class="small"><summary>Value history</summary>${historyRowsHtml}</details>` : '';
  // Photos of the contents pages, taken while adding, shown above the box they are typed into.
  const contentsPhotos = (edition.images || []).filter(image => image.kind === 'contents');
  const contentsPhotoHtml = contentsPhotos.map(photo => `<img class="contents-photo" data-image="${attr(photo.id)}/detail" alt="A contents page">`).join('');
  const photoHintHtml = contentsPhotos.length && !isAnthology ? '<p class="page-meta">Photos of the contents pages are kept with this book. Tick "This book holds several works" to type them beside it.</p>' : '';
  // Works a library catalog lists inside a book entered as one work (found by the laptop, DATA_FORMAT.md "foundContents").
  const found = (edition.foundContents || []).map(piece => (piece.author ? `${piece.author} — ${piece.title}` : piece.title));
  const foundHtml = entry && found.length ? `<div class="found-contents"><p>${escapeHtml(`A library catalog lists ${found.length} works inside this book: ${found.slice(0, 4).join('; ')}${found.length > 4 ? '; …' : ''}`)}</p>
    <div class="actions"><button class="btn" type="button" data-action="use-found">Use these works</button><button class="btn" type="button" data-action="decline-found">Not these</button></div></div>` : '';
  const worksLinkHtml = isAnthology ? `<a class="link" href="#/edit/${attr(entry.id)}/works">Give each work its original title, language, date, category and tags</a>` : '';
  // Pieces (the short items of a known set's volume) have no box here; saving keeps them as they are.
  const pieceCount = (edition.contents || []).filter(item => item.piece).length;
  const piecesHtml = pieceCount ? `<p class="page-meta">${pieceCount === 1 ? 'One shorter piece' : `${pieceCount} shorter pieces`} from the set's list ${pieceCount === 1 ? 'is' : 'are'} also in this book and kept as ${pieceCount === 1 ? 'it is' : 'they are'}.</p>` : '';
  // The boxes as first drawn, for the search links' first questions; a click asks about what is typed then.
  const form0 = { title: edition.title, subtitle: edition.subtitle || '', set: edition.set || '', volume: edition.volume || '', authors: authorsText };
  const trashHtml = entry ? '<button class="btn" type="button" data-action="trash">Move to trash</button>' : '';
  // A volume of a set with its own value (core/value.js): say how this copy's value is counted.
  const set = entry && entry.set && entry.set.value !== null ? entry.set : null;
  const valueHint = !set ? '' : set.valueAsSet ? `Not counted: ${set.title} is valued as a whole set` : `Leave empty if bought with ${set.title}`;
  container.innerHTML = `${backHtml}
    <div class="page-head"><h1 class="page-title">${titleHtml}</h1><p class="page-meta">Fill in what you know; everything but the title can wait.</p></div>
    <form class="form" novalidate>
      <div class="problems" hidden></div>
      <fieldset><legend>Book</legend>
        ${fieldHtml('Title', 'title', edition.title, { wide: true })}
        ${fieldHtml('Subtitle', 'subtitle', edition.subtitle, { wide: true })}
        ${foundHtml}
        <label class="check"><input type="checkbox" name="several"${isAnthology ? ' checked' : ''}> This book holds several works (an anthology)</label>${photoHintHtml}
        <div data-single${isAnthology ? ' hidden' : ''}>${fieldHtml('Authors (separate with ;)', 'authors', authorsText, { list: 'authors', wide: true })}</div>
        <label class="field" data-several${isAnthology ? '' : ' hidden'}>Contents: one work per line, as "Author — Title — date" (author and date optional). A table of contents can be pasted here.
          ${contentsPhotoHtml}<textarea name="contents" rows="8" data-tidy-paste>${escapeHtml(contentsText)}</textarea></label>
        ${worksLinkHtml}${piecesHtml}
        ${contributorsHtml}<button type="button" class="link" data-action="contributor">Add another contributor</button>
        <label class="check"><input type="checkbox" name="variousTranslators"${edition.variousTranslators ? ' checked' : ''}> <span class="field-label">Various translators${helpHtml('variousTranslators').button}</span></label>${helpHtml('variousTranslators').text}
      </fieldset>
      <fieldset data-work${isAnthology ? ' hidden' : ''}><legend>The work</legend>
        <div data-single>${dateRuleHtml()}${datingsHtml}${kindChipsHtml(kindForDating(workingKind))}${revisedBoxHtml}<p class="search-line">${searchLinkHtml(workQuestion(form0))}</p><button type="button" class="link" data-action="dating">Add another dating</button>
        <div class="field-row">${fieldHtml('Original title', 'originalTitle', work.originalTitle, { help: true })}</div></div>
        <div class="field-row">${fieldHtml('Original language', 'originalLanguage', work.originalLanguage, { list: 'languages', help: true })}${fieldHtml('Category', 'category', work.category, { list: 'categories', help: true })}</div>
        <div class="field-row">${fieldHtml('Tags (separate with ,)', 'tags', work.tags.join(', '), { help: true })}</div>
      </fieldset>
      <fieldset><legend>Edition</legend>
        <div class="field-row">${fieldHtml('Publisher', 'publisher', edition.publisher, { list: 'publishers' })}${fieldHtml('Place', 'place', edition.place, { list: 'places' })}</div>
        <div class="field-row">${fieldHtml('Year of this edition or printing', 'year', edition.year, { type: 'number' })}${fieldHtml('First edition\'s year', 'firstPrinted', edition.firstPrinted, { type: 'number', help: true })}${fieldHtml('Edition', 'editionStatement', edition.editionStatement, { help: true })}</div>
        <div class="field-row">${fieldHtml('Series', 'series', edition.series, { list: 'series', help: true })}${fieldHtml('Number', 'seriesNumber', edition.seriesNumber)}</div>
        <div class="field-row">${fieldHtml('Set', 'set', edition.set, { list: 'sets', help: true })}${fieldHtml('Volume', 'volume', edition.volume)}</div>
        <div class="field-row">${fieldHtml('ISBN', 'isbn', edition.isbn)}${fieldHtml('Other ISBNs (separate with ;)', 'otherIsbns', edition.otherIsbns.join('; '), { help: true })}</div>
        <div class="field-row">${fieldHtml('Pages, as printed', 'pages', edition.pages, { help: true })}${fieldHtml('Languages (separate with ,)', 'languages', edition.languages.join(', '), { help: true })}</div>
        <div class="field-row"><label class="field">Format<select name="medium"><option value="physical">Physical</option><option value="logos"${edition.medium === 'logos' ? ' selected' : ''}>Logos</option></select></label>${fieldHtml('Logos resource ID', 'logosId', edition.logosId)}</div>
      </fieldset>
      <fieldset><legend>${escapeHtml(copyLegend)}</legend>
        ${bindingChoicesHtml(copy, state.settings)}
        <div class="field-row">${fieldHtml('Acquired', 'acquired', copy.acquired, { hint: '"2019", "before 2015", or blank' })}</div>
        <div class="field-row">${locationHtml}</div>
        <div class="field-row">${fieldHtml('Price paid', 'price', copy.price, { type: 'number' })}${fieldHtml('Estimated value', 'value', copy.value, { type: 'number', hint: valueHint })}
          <label class="field">Status<select name="status">${statusHtml}</select></label></div>
        ${historyHtml}
        <label class="check"><input type="checkbox" name="markings"${copy.markings ? ' checked' : ''}> Writing or markings when acquired</label>
        <label class="field">Notes<textarea name="notes" rows="4">${escapeHtml(copy.notes)}</textarea></label>
      </fieldset>
      <div class="actions"><button class="btn btn-primary" type="submit">Save</button>${trashHtml}</div>
      ${datalistsHtml(state.library, state.settings)}
    </form>`;

  const form = container.querySelector('form');
  wireTidyPaste(form);
  fillImages(container, actions.imageUrl);
  let foundAccepted = false;
  form.querySelectorAll('[name="datingText"]').forEach(showPreview);
  container.oninput = event => {
    // Once something is typed, leaving the form asks first (main.js).
    actions.setDraft('This form has changes that are not saved.');
    if (event.target.name === 'datingText') showPreview(event.target);
  };
  container.onchange = event => {
    if (event.target.name !== 'several') return;
    const several = event.target.checked;
    form.querySelectorAll('[data-single]').forEach(part => { part.hidden = several; });
    form.querySelector('[data-several]').hidden = !several;
    // A new collection is asked its language, category and tags once, for all its works; an existing
    // one changes them under "Edit the works", so the box is not offered there.
    const workPart = form.querySelector('[data-work]');
    workPart.hidden = several && Boolean(entry);
    workPart.querySelector('legend').textContent = several ? 'For all the works' : 'The work';
  };
  container.onclick = event => {
    if (event.target.dataset.help) { toggleHelp(container, event.target); return; }
    const searchKind = event.target.dataset.searchWeb;
    if (searchKind) refreshSearchLink(event.target, workQuestion(typedNames(form)));
    const action = event.target.dataset.action;
    if (action === 'date-kind') toggleKind(event.target);
    if (action === 'binding-part') toggleBindingChip(event.target);
    if (action === 'version-chip') useVersionChip(event.target);
    if (action === 'dating') event.target.insertAdjacentHTML('beforebegin', datingRowHtml({ text: '', note: '' }, form.querySelectorAll('.dating-row').length));
    if (action === 'trash') moveToTrash(entry, state, actions);
    if (action === 'contributor') event.target.insertAdjacentHTML('beforebegin', contributorRowHtml({ name: '', role: 'translator' }));
    // The found works go into the contents box, to be checked and saved; declining forgets them.
    if (action === 'use-found') {
      const several = form.querySelector('[name="several"]');
      several.checked = true;
      several.dispatchEvent(new Event('change', { bubbles: true }));
      // Added below any works already listed, leaving out titles already there.
      const box = form.querySelector('[name="contents"]');
      const have = box.value.trim();
      box.value = [have, ...found.filter(line => !have.includes(line.split(' — ').pop()))].filter(Boolean).join('\n');
      foundAccepted = true;
      event.target.closest('.found-contents').innerHTML = '<p>Check the list in the contents box below, then Save.</p>';
    }
    if (action === 'decline-found') actions.saveEdition(entry.id, { foundContents: [] });
  };
  container.onsubmit = async event => {
    event.preventDefault();
    const existing = entry ? { edition: entry.edition, copy: chosenCopy, works: entry.works } : null;
    // A work this book no longer lists is trashed only when no other book holds it.
    const usedElsewhere = workId => state.library.entries.some(other => other !== entry && other.edition.contents.some(piece => piece.work === workId));
    const result = recordsFromForm(readForm(form), existing, { newId: actions.newId, now: actions.now(), today: actions.today(), authors: [...state.library.authorsById.values()], usedElsewhere });
    const problems = form.querySelector('.problems');
    if (result.problems.length) {
      problems.textContent = result.problems.join(' ');
      problems.hidden = false;
      problems.scrollIntoView({ block: 'center' });
      return;
    }
    // A wishlist item just bought leaves the wishlist (to the trash, so nothing is lost),
    // and its cover becomes the new book's cover: the same picture files, under the same ID.
    // Found works once used are no longer waiting.
    if (foundAccepted) {
      const edited = result.records.find(record => record.type === 'edition') || entry.edition;
      result.records = [...result.records.filter(record => record !== edited), withField(edited, 'foundContents', [], actions.now())];
    }
    if (wishRecord && wish) {
      result.records = result.records.map(record => (record.type === 'edition' ? { ...record, images: wishRecord.images } : record));
      result.records.push(trashRecord(wishRecord, actions.today(), actions.now()));
    }
    if (await actions.saveRecords(result.records)) {
      actions.setDraft('');
      actions.showNote(wish ? 'Added to the library, and taken off the wishlist' : 'Saved');
      actions.leaveForm(`#/book/${result.editionId}`);
    }
  };
}

// Deleting moves the book to the trash (PLAN.md, "Status"); Settings › Trash restores it.
async function moveToTrash(entry, state, actions) {
  if (await actions.saveRecords(trashBook(state.records, entry.id, actions.today(), actions.now()))) {
    actions.setDraft('');
    actions.showNote('Moved to the trash. Settings › Trash brings it back.');
    actions.leaveForm('#/');
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

// The title and authors as typed now, for the search question.
function typedNames(form) {
  const data = new FormData(form);
  const kinds = form.querySelector('[data-single] .date-kinds');
  return {
    title: String(data.get('title') || ''), subtitle: String(data.get('subtitle') || ''), set: String(data.get('set') || ''), volume: String(data.get('volume') || ''),
    authors: String(data.get('authors') || ''), kind: kinds ? kinds.dataset.kind : '',
  };
}

const workQuestion = typed => workDateQuestion(searchTitle(typed), typed.authors.split(';'), typed.kind);

// The form's values in the shape core/entry.js expects.
function readForm(form) {
  const data = new FormData(form);
  const text = name => (data.get(name) || '').toString().trim();
  const list = (name, separator) => text(name).split(separator).map(part => part.trim()).filter(Boolean);
  const roles = data.getAll('contributorRole');
  const working = Number(data.get('working') || 0);
  const kinds = data.getAll('datingKind').map(String);
  const chosenKind = chosenDatingKind(form.querySelector('[data-single] .date-kinds'));
  const kindOfRow = i => (i === working && chosenKind !== undefined ? chosenKind : kinds[i] || null);
  return {
    title: text('title'), subtitle: text('subtitle'), authors: list('authors', ';'),
    contributors: data.getAll('contributorName').map((name, i) => ({ name: name.toString().trim(), role: roles[i] })),
    publisher: text('publisher'), place: text('place'), year: text('year'), firstPrinted: text('firstPrinted'), editionStatement: text('editionStatement'),
    series: text('series'), seriesNumber: text('seriesNumber'),
    set: text('set'), volume: text('volume'), isbn: text('isbn'), otherIsbns: text('otherIsbns'), pages: text('pages'), languages: list('languages', ','),
    medium: text('medium') || 'physical', logosId: text('logosId'),
    contents: data.get('several') ? text('contents') : null,
    variousTranslators: Boolean(data.get('variousTranslators')),
    version: text('version'),
    work: {
      title: '', originalTitle: text('originalTitle'), originalLanguage: text('originalLanguage'), category: text('category'), tags: list('tags', ','),
      datings: data.getAll('datingText').map((value, i) => ({ text: value.toString(), note: (data.getAll('datingNote')[i] || '').toString().trim(), kind: kindOfRow(i), working: i === working })),
      revised: text('revised'),
    },
    copy: {
      ...readBindingChoices(form), location: data.getAll('location').map(part => part.toString().trim()), acquired: text('acquired'),
      price: text('price'), value: text('value'), status: text('status') || 'owned', markings: !!data.get('markings'), notes: (data.get('notes') || '').toString(),
      dropHistory: data.getAll('dropHistory').map(String),
    },
  };
}
