// Batch add (PLAN.md, "Batch add"): one screen for a whole stack or a single
// book. Scan a barcode, type an ISBN (a USB scanner types it too), or type a
// title; the book is looked up, reviewed on a card, and saved before the next
// scan. The camera stays open for the whole stack. When a shelf is chosen,
// books are given shelf order in the order scanned (left to right).

import { escapeHtml } from '../core/html.js';
import { isbn13, isBookBarcode, recordsFromForm, anotherCopy } from '../core/entry.js';
import { editionsWithIsbn, suggestWorks } from '../core/matching.js';
import { combineFound } from '../core/lookup.js';
import { keyBetween } from '../core/shelf-order.js';
import { parseDating, formatYearRange, workingDating } from '../core/dating.js';
import { estimateSize } from '../core/sizes.js';
import { lookUpOpenLibrary, searchOpenLibrary, downloadOpenLibraryCover } from '../edges/lookup-openlibrary.js';
import { lookUpGoogleBooks } from '../edges/lookup-googlebooks.js';

const MIN_COVER_HEIGHT = 400; // a smaller online cover counts as not found (PLAN.md)
const attr = value => escapeHtml(value ?? '');
const PART_LABELS = ['Place', 'Room', 'Case', 'Shelf'];

function fieldHtml(label, name, value, missing, list = '') {
  return `<label class="field${missing ? ' is-missing' : ''}">${escapeHtml(label)}<input name="${name}" value="${attr(value)}"${list ? ` list="${list}"` : ''} autocomplete="off"></label>`;
}

/** Draw the batch add screen. Returns a cleanup that closes the camera. */
export function render(container, state, actions) {
  const prompts = new Set(state.settings.batchAddPrompts || ['title', 'subtitle', 'authors', 'datings', 'binding', 'publisher', 'year']);
  let scanner = null;
  let review = null; // the book on the card: { found, duplicates, works, photos }
  let shelfKey = null; // the last shelf order given on the chosen shelf
  const added = [];

  const locationHtml = PART_LABELS.map((label, i) => `<label class="field">${escapeHtml(label)}<input name="where" value="${attr(state.batchLocation?.[i])}" list="where${i}"></label>`).join('');
  const listsHtml = [0, 1, 2, 3].map(i => `<datalist id="where${i}">${[...new Set(state.library.entries.flatMap(entry => entry.copies.map(copy => copy.location[i]).filter(Boolean)))].sort()
    .map(value => `<option value="${attr(value)}">`).join('')}</datalist>`).join('');
  container.innerHTML = `
    <div class="page-head"><h1 class="page-title">Add books</h1>
      <p class="page-meta">Scan a barcode, type an ISBN or a title, or <a class="link" href="#/new">enter a book by hand</a>.</p></div>
    <section class="block"><h2 class="block-title">Shelving to</h2>
      <div class="field-row">${locationHtml}</div>
      <p class="preview">Optional. Books are placed on this shelf in the order they are added, so scan a shelf from left to right.</p>${listsHtml}</section>
    <form class="find" autocomplete="off"><input id="find" type="search" placeholder="ISBN or title" enterkeyhint="search" inputmode="search">
      <button class="btn btn-primary" type="submit">Look up</button><button class="btn" type="button" data-action="camera">Scan</button></form>
    <div class="camera" hidden><video aria-label="Camera"></video><p class="preview" data-camera-status>Hold the barcode in the middle of the picture.</p></div>
    <div id="card"></div>
    <div id="added"></div>`;
  const card = container.querySelector('#card');
  const find = container.querySelector('#find');
  const status = text => { card.innerHTML = `<p class="empty">${escapeHtml(text)}</p>`; };
  find.focus();

  const location = () => [...container.querySelectorAll('[name="where"]')].map(input => input.value.trim());

  // The next shelf order on the chosen shelf: after the last copy already there.
  function nextShelfOrder() {
    const where = location();
    if (!where.some(Boolean)) return null;
    if (shelfKey === null) {
      const keys = state.library.entries.flatMap(entry => entry.copies).filter(copy => copy.location.join(' › ') === where.filter(Boolean).join(' › ') && copy.shelfOrder).map(copy => copy.shelfOrder).sort();
      shelfKey = keys.length ? keys[keys.length - 1] : null;
    }
    shelfKey = keyBetween(shelfKey, null);
    return shelfKey;
  }

  async function findBook(text) {
    const isbn = isbn13(text);
    if (isbn && isBookBarcode(isbn)) return handleIsbn(isbn);
    if (!text.trim()) return;
    status('Searching Open Library…');
    try {
      const candidates = await searchOpenLibrary(text);
      if (!candidates.length) { startReview({ title: text.trim() }); return; }
      const candidatesHtml = candidates.map((candidate, i) => `<button class="row" type="button" data-pick="${i}"><span></span><span class="row-main"><span class="row-title">${escapeHtml(candidate.title)}</span>`
        + `<span class="row-author">${escapeHtml([candidate.authors.join(', '), candidate.year].filter(Boolean).join(' · '))}</span></span><span></span></button>`).join('');
      card.innerHTML = `<section class="block"><h2 class="block-title">Which book?</h2><div class="list">${candidatesHtml}</div>
        <div class="actions"><button class="btn" type="button" data-pick="none">None of these: enter it by hand</button></div></section>`;
      card.onclick = event => {
        const pick = event.target.closest('[data-pick]');
        if (!pick) return;
        card.onclick = null;
        const candidate = candidates[Number(pick.dataset.pick)];
        if (!candidate) startReview({ title: text.trim() });
        else if (candidate.isbn) handleIsbn(candidate.isbn);
        else startReview({ title: candidate.title, authors: candidate.authors });
      };
    } catch (error) {
      status(`${error.message} The book can still be entered by hand.`);
    }
  }

  async function handleIsbn(isbn) {
    if (scanner) scanner.pause();
    find.value = '';
    const duplicates = editionsWithIsbn(isbn, state.library.entries);
    if (duplicates.length) return showDuplicate(duplicates[0]);
    status('Looking up…');
    const lookups = state.settings.lookups || { openLibrary: true, googleBooks: true };
    let found = null;
    const problems = [];
    if (lookups.openLibrary !== false) {
      try { found = await lookUpOpenLibrary(isbn); } catch (error) { problems.push(error.message); }
    }
    const incomplete = !found || !found.authors.length || !found.publisher;
    if (incomplete && lookups.googleBooks !== false) {
      try { found = combineFound(found, await lookUpGoogleBooks(isbn, state.device.googleBooksKey || '')); } catch (error) { problems.push(error.message); }
    }
    if (problems.length && !found) actions.showNote(problems[0]);
    startReview(found || { isbn });
  }

  function showDuplicate(entry) {
    const where = entry.copies.map(copy => copy.location.join(' › ')).filter(Boolean)[0] || 'no location yet';
    card.innerHTML = `<section class="block"><h2 class="block-title">Already in the library</h2>
      <p>You already have this edition: <strong>${escapeHtml(entry.edition.title)}</strong> (${escapeHtml(where)}). Add another copy?</p>
      <div class="field-row">${fieldHtml('Binding of this copy', 'binding', entry.binding, false, 'bindings')}</div>
      <div class="actions"><button class="btn btn-primary" type="button" data-action="copy">Add another copy</button><button class="btn" type="button" data-action="skip">Not this time</button></div></section>
      ${bindingsHtml(state)}`;
    card.onclick = async event => {
      const action = event.target.dataset.action;
      if (action === 'skip') return finishBook();
      if (action !== 'copy') return;
      const copy = anotherCopy(entry.id, { binding: card.querySelector('[name="binding"]').value, location: location(), shelfOrder: nextShelfOrder() }, context());
      if (await actions.saveRecords([copy], { soon: true })) finishBook(`Another copy of ${entry.edition.title}`);
    };
  }

  function context() {
    return { newId: actions.newId, now: actions.now(), today: actions.today(), authors: [...state.library.authorsById.values()], works: state.library.worksById };
  }

  function startReview(found) {
    review = { found: { title: '', subtitle: '', authors: [], contributors: [], publisher: '', place: '', year: '', pages: '', languages: [], isbn: '', cover: null, ...found }, photos: {} };
    const works = suggestWorks(review.found.title, review.found.authors, state.library);
    review.works = works;
    drawReview();
  }

  function drawReview() {
    const { found, works, photos } = review;
    const linked = works.find(work => work.id === review.workId);
    const needsDate = !linked || !linked.datings.length;
    const coverHtml = photos.cover ? `<img class="review-cover" src="${attr(photos.cover.preview)}" alt="">`
      : found.cover && !found.cover.waiting ? `<img class="review-cover" src="${attr(found.cover.url)}" alt="" onerror="this.hidden=true">` : '<div class="review-cover is-empty">No cover found</div>';
    const worksHtml = works.length ? `<fieldset class="choice"><legend>Same work as one already in the library?</legend>${works.map(work => {
      const dating = workingDating(work);
      return `<label class="check"><input type="radio" name="work" value="${attr(work.id)}"${review.workId === work.id ? ' checked' : ''}> Same work as <em>${escapeHtml(work.title)}</em>${dating ? ` (${escapeHtml(dating.text)})` : ''}</label>`;
    }).join('')}<label class="check"><input type="radio" name="work" value=""${review.workId ? '' : ' checked'}> A different work</label></fieldset>` : '';
    // A field is asked for only when shared settings list it (PLAN.md, "Settings").
    const promptHtml = (name, label, value, missing, list = '') => (prompts.has(name) ? fieldHtml(label, name, value, missing, list) : '');
    const datingHtml = needsDate && prompts.has('datings')
      ? `<label class="field is-missing">Original date (can wait)<input name="dating" value="${attr(review.dating)}" autocomplete="off" placeholder="c. 397, 1530–59, early 2nd c."><span class="preview" data-preview></span></label>` : '';
    const summary = [found.contributors.map(person => `${person.role}: ${person.name}`).join('; '), found.place, found.pages && `${found.pages} pages`, found.isbn && `ISBN ${found.isbn}`].filter(Boolean).join(' · ');
    const size = estimateSize({ ...found, images: [], height: null, thickness: null, series: null, set: null }, { binding: '' });
    card.innerHTML = `<section class="block review"><div class="review-top">${coverHtml}<div class="review-fields">
        ${fieldHtml('Title', 'title', found.title, !found.title)}
        ${promptHtml('subtitle', 'Subtitle', found.subtitle, false)}
        ${promptHtml('authors', 'Authors (separate with ;)', found.authors.join('; '), !found.authors.length, 'authors')}
        ${datingHtml}
        ${promptHtml('binding', 'Binding', review.binding || '', true, 'bindings')}
        <div class="field-row">${promptHtml('publisher', 'Publisher', found.publisher, !found.publisher)}${promptHtml('year', 'Year', found.year, !found.year)}</div>
      </div></div>
      <p class="preview">${escapeHtml(summary || (found.source ? '' : 'Not found online: fill in what you know.'))}</p>
      ${worksHtml}
      <div class="actions">
        <label class="btn">${escapeHtml(photos.cover || (found.cover && !found.cover.waiting) ? 'Wrong cover? Take a photo' : 'Take a cover photo')}<input type="file" accept="image/*" capture="environment" data-photo="cover" hidden></label>
        <label class="btn">${escapeHtml(photos.spine ? 'Spine photo added' : 'Add a spine photo')}<input type="file" accept="image/*" capture="environment" data-photo="spine" hidden></label>
      </div>
      <div class="actions"><button class="btn btn-primary" type="button" data-action="save">Save, next book</button>
        <button class="btn" type="button" data-action="save-edit">Save and edit all fields</button><button class="btn" type="button" data-action="skip">Skip</button></div>
      <p class="preview">${escapeHtml(`Shelf size until measured: ~${Math.round(size.height.mm / 10)} cm tall, ${Math.round(size.thickness.mm)} mm thick.`)}</p>
    </section>${bindingsHtml(state)}`;
    card.oninput = event => {
      if (event.target.name !== 'dating') return;
      const preview = card.querySelector('[data-preview]');
      const read = parseDating(event.target.value);
      preview.textContent = !event.target.value.trim() ? '' : read.ok ? `Read as ${formatYearRange(read.dating.earliest, read.dating.latest)} (${read.dating.certainty})` : read.problem;
    };
    card.onchange = async event => {
      if (event.target.name === 'work') { keepTyped(); review.workId = event.target.value || null; drawReview(); return; }
      const kind = event.target.dataset.photo;
      if (!kind || !event.target.files[0]) return;
      keepTyped();
      const { editPhoto } = await import('./photo-editor.js');
      const hint = kind === 'spine' ? `~${Math.round(size.height.mm / 10)} cm · ${size.height.source}` : '';
      const files = await editPhoto(event.target.files[0], kind, { heightHint: hint });
      if (files) review.photos[kind] = { ...files, preview: URL.createObjectURL(files.thumb) };
      drawReview();
    };
    card.onclick = event => {
      const action = event.target.dataset.action;
      if (action === 'skip') finishBook();
      if (action === 'save' || action === 'save-edit') saveBook(action === 'save-edit');
    };
  }

  // Keep what was typed when the card is drawn again.
  function keepTyped() {
    const value = name => (card.querySelector(`[name="${name}"]`) || { value: undefined }).value;
    const found = review.found;
    for (const name of ['title', 'subtitle', 'publisher', 'year']) if (value(name) !== undefined) found[name] = value(name);
    if (value('authors') !== undefined) found.authors = value('authors').split(';').map(name => name.trim()).filter(Boolean);
    review.binding = value('binding') ?? review.binding;
    review.dating = value('dating') ?? review.dating;
  }

  async function saveBook(thenEdit) {
    keepTyped();
    const { found, photos } = review;
    const form = {
      title: found.title, subtitle: found.subtitle, authors: found.authors, contributors: found.contributors,
      publisher: found.publisher, place: found.place, year: found.year, editionStatement: '', translationFirstPublished: '',
      series: '', seriesNumber: '', set: '', volume: '', isbn: found.isbn, pages: found.pages, languages: found.languages,
      medium: 'physical', logosId: '', contents: null, workId: review.workId || null,
      work: { title: '', originalTitle: '', originalLanguage: '', category: '', tags: [], datings: [{ text: review.dating || '', note: '', working: true }] },
      copy: { binding: review.binding || '', location: location(), shelfOrder: nextShelfOrder(), acquired: '', price: '', value: '', status: 'owned', markings: false, notes: '' },
    };
    const result = recordsFromForm(form, null, context());
    if (result.problems.length) { actions.showNote(result.problems.join(' ')); return; }
    const records = result.records.map(record => (record.type === 'edition' ? withImages(record) : record));
    if (!(await actions.saveRecords(records, { soon: !thenEdit }))) return;
    for (const [kind, files] of Object.entries(photos)) actions.saveImageFiles(review.imageIds[kind], files);
    const edition = records.find(record => record.type === 'edition');
    if (!photos.cover && found.cover && !found.cover.waiting) fetchCoverLater(edition.id, found.cover.url);
    if (thenEdit) { actions.go(`#/edit/${edition.id}`); return; }
    finishBook(found.title);
  }

  // Add the photos (and a waiting Google Books cover) to the new edition.
  function withImages(edition) {
    const images = [];
    review.imageIds = {};
    for (const [kind, files] of Object.entries(review.photos)) {
      const id = actions.newId();
      review.imageIds[kind] = id;
      images.push({ id, kind, source: 'photo', color: kind === 'cover' ? files.color : null, ratio: files.ratio, master: true, waiting: null });
    }
    const cover = review.found.cover;
    if (!review.photos.cover && cover && cover.waiting) images.unshift({ id: actions.newId(), kind: 'cover', source: cover.source, color: null, ratio: null, master: false, waiting: cover.url });
    const spineHeight = review.photos.spine && review.photos.spine.height;
    return { ...edition, images, ...(spineHeight ? { height: spineHeight, heightSource: 'measured' } : {}) };
  }

  // An online cover is downloaded and compressed after saving, so it never
  // holds up the next scan. A cover under 400 px tall counts as not found.
  function fetchCoverLater(editionId, url) {
    setTimeout(async () => {
      try {
        const blob = await downloadOpenLibraryCover(url);
        if (!blob) return;
        const { readPicture, imageFiles } = await import('../edges/photo.js');
        const picture = await readPicture(blob);
        if (picture.height < MIN_COVER_HEIGHT) return;
        const files = await imageFiles(picture);
        const id = actions.newId();
        await actions.saveImageFiles(id, files);
        await actions.addImage(editionId, { id, kind: 'cover', source: 'openlibrary', color: files.color, ratio: files.ratio, master: false, waiting: null });
      } catch (error) {
        actions.showNote(`The cover could not be saved (${error.message}). It can be added later.`);
      }
    }, 0);
  }

  function finishBook(title) {
    if (title) {
      added.unshift(title);
      const addedHtml = added.slice(0, 10).map(name => `<p class="piece-title">${escapeHtml(name)}</p>`).join('');
      container.querySelector('#added').innerHTML = `<section class="block"><h2 class="block-title">Added just now</h2>${addedHtml}</section>`;
    }
    review = null;
    card.innerHTML = '';
    card.onclick = null;
    if (scanner) scanner.resume();
    find.focus();
  }

  container.querySelector('.find').onsubmit = event => {
    event.preventDefault();
    findBook(find.value);
  };
  container.onchange = event => {
    if (event.target.name === 'where') { shelfKey = null; actions.setBatchLocation(location()); }
  };
  container.querySelector('[data-action="camera"]').onclick = async event => {
    const box = container.querySelector('.camera');
    if (scanner) { scanner.stop(); scanner = null; box.hidden = true; event.target.textContent = 'Scan'; return; }
    box.hidden = false;
    event.target.textContent = 'Stop camera';
    try {
      const { startScanner } = await import('../edges/camera.js');
      scanner = await startScanner(box.querySelector('video'), isbn => handleIsbn(isbn));
      box.querySelector('[data-camera-status]').textContent = `Hold the barcode in the middle of the picture (reading with ${scanner.decoderName}).`;
    } catch (error) {
      box.querySelector('[data-camera-status]').textContent = error.message;
      event.target.textContent = 'Scan';
    }
  };
  return () => { if (scanner) scanner.stop(); };
}

function bindingsHtml(state) {
  return `<datalist id="bindings">${state.settings.bindings.map(binding => `<option value="${attr(binding)}">`).join('')}</datalist>`
    + `<datalist id="authors">${[...state.library.authorsById.values()].map(author => `<option value="${attr(author.name)}">`).join('')}</datalist>`;
}
