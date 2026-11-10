// Batch add (PLAN.md, "Batch add"), one question per screen. Scan a barcode,
// type an ISBN (a USB scanner types it too) or type a title; then, step by
// step: is this the book, is it a collection (when a record lists contents),
// is it the same work as one we have, when was it written, the cover, the
// spine, the binding, where it goes, anything else.
// Steps with nothing to ask are skipped. The camera stays open for the whole
// stack (paused during the steps), and the next scan is ready as soon as a
// book is saved.

import { escapeHtml } from '../core/html.js';
import { isbn13, isBookBarcode, recordsFromForm, anotherCopy } from '../core/entry.js';
import { editionsWithIsbn, suggestWorks } from '../core/matching.js';
import { emptyFound, suggestOriginalDates } from '../core/lookup.js';
import { mergeFound } from '../core/book-data.js';
import { isBible } from '../core/bible.js';
import { normalizeForSearch } from '../core/search.js';
import { keyBetween } from '../core/shelf-order.js';
import { parseDating, formatYearRange, workingDating } from '../core/dating.js';
import { estimateSize } from '../core/sizes.js';
import { lookUpOpenLibrary, lookUpWork, searchWork, searchOpenLibrary, downloadOpenLibraryCover } from '../edges/lookup-openlibrary.js';
import { lookUpGoogleBooks } from '../edges/lookup-googlebooks.js';

const MIN_COVER_HEIGHT = 400; // a smaller online cover counts as not found (PLAN.md)
const NO_WORK = { workTitle: '', firstPublished: null, author: null };
const attr = value => escapeHtml(value ?? '');

function fieldHtml(label, name, value, { missing = false, list = '', type = 'text' } = {}) {
  return `<label class="field${missing ? ' is-missing' : ''}">${escapeHtml(label)}<input name="${name}" type="${type}" value="${attr(value)}"${list ? ` list="${list}"` : ''} autocomplete="off"${type === 'number' ? ' inputmode="decimal"' : ''}></label>`;
}

// A big answer button: a main line and an optional smaller line under it.
function choiceHtml(action, main, detail = '', value = '') {
  return `<button type="button" class="choice-button" data-action="${action}" data-value="${attr(value)}"><span>${escapeHtml(main)}</span>`
    + (detail ? `<small>${escapeHtml(detail)}</small>` : '') + '</button>';
}

/** Draw the batch add screen. Returns a cleanup that closes the camera. */
const STEP_NAMES = { book: 'The book', contents: 'Contents', work: 'Same work?', date: 'Original date', cover: 'Cover', spine: 'Spine', binding: 'Binding', where: 'Place', extras: 'Anything else' };

export function render(container, state, actions) {
  const prompts = new Set(state.settings.batchAddPrompts || ['title', 'subtitle', 'authors', 'datings', 'binding', 'publisher', 'year']);
  let scanner = null;
  let book = null; // the book being added: what was found and every answer so far
  let shelfKey = null; // the last shelf order given on the shelf being filled
  const added = [];

  // With a USB scanner (Settings › This device) the scanner types the ISBN into the box, and presses Enter.
  const usb = state.device.scanner === 'usb';
  const bindingOptionsHtml = state.settings.bindings.map(binding => `<option value="${attr(binding)}">`).join('');
  container.innerHTML = `
    <div id="scan">
      <p class="saved-banner" data-saved role="status" hidden></p>
      <div class="page-head"><h1 class="page-title">Add books</h1>
        <p class="page-meta">Scan the barcode on the back, or type an ISBN or a title.</p></div>
      <div class="camera" hidden><div class="camera-view"><video aria-label="Camera"></video><p class="camera-read" aria-live="polite"></p></div>
        <p class="preview" data-camera-status></p></div>
      <div class="scan-actions"${usb ? ' hidden' : ''}><button class="btn btn-primary btn-big" type="button" data-action="camera">Scan a barcode</button></div>
      <form class="find" autocomplete="off"><input id="find" type="search" placeholder="ISBN or title" enterkeyhint="search">
        <button class="btn" type="submit">Look up</button></form>
      <p class="preview" data-shelf></p>
      <p class="preview"><a class="link" href="#/new">Enter a book by hand instead</a></p>
      <div id="added"></div>
    </div>
    <div id="step" hidden></div>
    <datalist id="bindings">${bindingOptionsHtml}</datalist>`;
  const scanArea = container.querySelector('#scan');
  const stepArea = container.querySelector('#step');
  const find = container.querySelector('#find');
  showShelf();
  if (usb) find.focus();

  // ---------- the shelf being filled ----------

  function showShelf() {
    const where = (state.batchLocation || []).filter(Boolean);
    container.querySelector('[data-shelf]').textContent = where.length ? `Filling: ${where.join(' › ')}. Each book goes after the last one added.` : '';
  }

  function nextShelfOrder(location) {
    if (!location.length) return null;
    if (shelfKey === null || shelfKey.where !== location.join(' › ')) {
      const keys = state.library.entries.flatMap(entry => entry.copies)
        .filter(copy => copy.location.join(' › ') === location.join(' › ') && copy.shelfOrder).map(copy => copy.shelfOrder).sort();
      shelfKey = { where: location.join(' › '), key: keys.length ? keys[keys.length - 1] : null };
    }
    shelfKey.key = keyBetween(shelfKey.key, null);
    return shelfKey.key;
  }

  // ---------- finding the book ----------

  function showMessage(text) {
    scanArea.hidden = true;
    stepArea.hidden = false;
    stepArea.innerHTML = `<p class="empty">${escapeHtml(text)}</p>`;
  }

  async function findBook(text) {
    const isbn = isbn13(text);
    if (isbn && isBookBarcode(isbn)) return lookUpIsbn(isbn);
    if (!text.trim()) return;
    showMessage('Searching Open Library…');
    try {
      const candidates = await searchOpenLibrary(text);
      const listHtml = candidates.map((candidate, i) => choiceHtml('pick', candidate.title, [candidate.authors.slice(0, 2).join(', '), [candidate.publisher, candidate.year].filter(Boolean).join(', ')].filter(Boolean).join(' · '), String(i))).join('');
      stepArea.innerHTML = `<h2 class="step-title">Which book?</h2><p class="step-hint">Matches on Open Library for "${escapeHtml(text)}".</p>
        <div class="choices">${listHtml}${choiceHtml('pick', 'None of these', 'Enter it by hand', 'none')}</div>${backHtml()}`;
      stepArea.onclick = event => {
        const button = event.target.closest('[data-action]');
        if (!button) return;
        if (button.dataset.action === 'back') return finishBook();
        const candidate = candidates[Number(button.dataset.value)];
        if (!candidate) startBook({ title: text.trim() }, NO_WORK);
        else if (candidate.isbn) lookUpIsbn(candidate.isbn);
        else startBook({ title: candidate.title, authors: candidate.authors }, NO_WORK);
      };
    } catch (error) {
      showMessage(`${error.message} The book can still be entered by hand.`);
      setTimeout(() => startBook({ title: text.trim() }, NO_WORK), 1500);
    }
  }

  async function lookUpIsbn(isbn) {
    if (scanner) scanner.pause();
    find.value = '';
    const duplicates = editionsWithIsbn(isbn, state.library.entries);
    if (duplicates.length) return askAboutDuplicate(duplicates[0]);
    // The work search is asked once, alongside: for date suggestions, and for authors the edition record lacks.
    const workSearch = searchWork(isbn);
    const work = lookUpWork(isbn, fetch, workSearch).catch(() => NO_WORK);
    const lookups = state.settings.lookups || { openLibrary: true, googleBooks: true };
    const key = state.device.googleBooksKey || '';
    const problems = [];
    const ask = (lookUp, name) => lookUp().catch(error => { problems.push(error.message); return null; }).then(found => ({ found, name }));
    // Open Library and, with a key, Google Books are asked at the same moment, so asking both is no slower.
    const asking = [];
    if (lookups.openLibrary !== false) asking.push(ask(() => lookUpOpenLibrary(isbn, fetch, workSearch), 'Open Library'));
    if (lookups.googleBooks !== false && key) asking.push(ask(() => lookUpGoogleBooks(isbn, key), 'Google Books'));
    showMessage(`Looking up ISBN ${isbn} on ${asking.length > 1 ? 'Open Library and Google Books' : asking.length ? 'Open Library' : 'Google Books'}…`);
    const answers = await Promise.all(asking);
    let found = mergeFound(answers.map(answer => answer.found));
    // Without a key Google Books mostly refuses, so it is asked only when Open Library lacks something.
    if (!key && (!found || !found.authors.length || !found.publisher) && lookups.googleBooks !== false) {
      showMessage(found ? 'Some details are missing; asking Google Books too…' : `Not on Open Library; trying Google Books…`);
      answers.push(await ask(() => lookUpGoogleBooks(isbn, ''), 'Google Books'));
      found = mergeFound(answers.map(answer => answer.found));
    }
    const sources = answers.filter(answer => answer.found).map(answer => answer.name);
    const google = answers.find(answer => answer.name === 'Google Books' && answer.found);
    startBook(found ? { ...found, sources } : { isbn }, work, found ? '' : problems[0] || '', google ? google.found.cover : null);
  }

  function askAboutDuplicate(entry) {
    const where = entry.copies.map(copy => copy.location.join(' › ')).filter(Boolean)[0] || 'no place yet';
    scanArea.hidden = true;
    stepArea.hidden = false;
    stepArea.innerHTML = `<h2 class="step-title">You already have this edition</h2>
      <p class="step-hint">${escapeHtml(entry.edition.title)} · ${escapeHtml(where)}</p>
      <div class="choices">${choiceHtml('copy', 'Add another copy', 'A second copy of the same edition')}${choiceHtml('back', 'Not this time', 'Back to scanning')}</div>`;
    stepArea.onclick = async event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'back') return finishBook();
      const location = (state.batchLocation || []).filter(Boolean);
      const copy = anotherCopy(entry.id, { binding: entry.binding, location, shelfOrder: nextShelfOrder(location) }, context());
      if (await actions.saveRecords([copy], { soon: true })) finishBook(`Another copy of ${entry.edition.title}`);
    };
  }

  // ---------- the steps ----------

  // otherCover: a Google Books cover, used when Open Library's turns out to be missing.
  function startBook(found, workLookup, problem = '', otherCover = null) {
    const full = { ...emptyFound(''), ...found };
    book = {
      found: full,
      problem, work: null, workId: null, dating: '', datingNote: '', dateUnknown: false, originalTitle: full.originalTitle,
      photos: {}, cover: { state: 'none' }, otherCover, binding: full.binding, location: (state.batchLocation || []).filter(Boolean),
      extras: { series: full.series, seriesNumber: full.seriesNumber },
      // Contents a record lists are offered, never for a Bible (cited by chapter and verse).
      contentsOffered: full.contents.length > 1 && !isBible({ edition: {}, works: full.contents }),
      contents: null, // the accepted contents, one work per line
      fixing: !found.source, // not found online: the details are asked for at once
    };
    book.works = suggestWorks(book.found.title, book.found.authors, state.library);
    const current = book;
    Promise.resolve(workLookup).then(work => { if (book === current) { book.work = work; if (book.step === 'date') drawStep(); } });
    checkCover(current);
    goTo('book');
  }

  // A found cover is downloaded and checked now, so the cover step can say
  // whether there is one; it is saved with the book.
  function checkCover(current) {
    const cover = current.found.cover;
    if (!cover) return;
    if (cover.waiting) { current.cover = { state: 'waiting', url: cover.url, source: cover.source }; return; }
    current.cover = { state: 'checking' };
    (async () => {
      const blob = await downloadOpenLibraryCover(cover.url);
      if (!blob) return { state: 'none' };
      const { readPicture, imageFiles } = await import('../edges/photo.js');
      const picture = await readPicture(blob);
      if (picture.height < MIN_COVER_HEIGHT) return { state: 'none', tooSmall: true };
      return { state: 'found', source: cover.source, files: await imageFiles(picture) };
    })().catch(() => ({ state: 'none' })).then(result => {
      if (book !== current) return;
      const other = current.otherCover;
      if (result.state === 'none' && other) result = { state: 'waiting', url: other.url, source: other.source };
      if (result.files) result.preview = URL.createObjectURL(result.files.thumb);
      current.cover = result;
      if (book.step === 'cover') drawStep();
    });
  }

  // The steps this book needs, in order; steps with nothing to ask are left out.
  function steps() {
    const linked = book.works.find(work => work.id === book.workId);
    // A collection's works each have their own date, asked for later ("needs original date").
    const single = book.contents === null;
    return [
      'book',
      book.contentsOffered ? 'contents' : null,
      single && book.works.length ? 'work' : null,
      single && !(linked && linked.datings.length) && prompts.has('datings') ? 'date' : null,
      'cover', 'spine',
      prompts.has('binding') ? 'binding' : null,
      'where', 'extras',
    ].filter(Boolean);
  }

  function goTo(step) {
    book.step = step;
    scanArea.hidden = true;
    stepArea.hidden = false;
    drawStep();
    stepArea.scrollIntoView({ block: 'start' });
  }

  function next() {
    const list = steps();
    const at = list.indexOf(book.step);
    if (at === list.length - 1) saveBook();
    else goTo(list[at + 1]);
  }

  function back() {
    const list = steps();
    const at = list.indexOf(book.step);
    if (at <= 0) finishBook();
    else goTo(list[at - 1]);
  }

  function progressHtml() {
    const list = steps();
    const at = list.indexOf(book.step) + 1;
    const where = escapeHtml(`Step ${at} of ${list.length}: ${STEP_NAMES[book.step]}${book.found.title ? ` · ${book.found.title}` : ''}`);
    return `<p class="step-count">${where}</p><div class="progress"><span style="width:${Math.round(at / list.length * 100)}%"></span></div>`;
  }

  function backHtml(label = 'Back') {
    return `<div class="step-nav"><button type="button" class="btn" data-action="back">${escapeHtml(label)}</button></div>`;
  }

  function drawStep() {
    const draw = { book: bookStep, contents: contentsStep, work: workStep, date: dateStep, cover: coverStep, spine: spineStep, binding: bindingStep, where: whereStep, extras: extrasStep }[book.step];
    stepArea.innerHTML = progressHtml() + draw();
    stepArea.oninput = event => { if (event.target.name === 'dating') showDatingPreview(); };
    stepArea.onchange = event => { if (event.target.dataset.photo) takePhoto(event.target.dataset.photo, event.target.files[0]); };
    stepArea.onclick = event => {
      const button = event.target.closest('[data-action]');
      if (button) answer(button.dataset.action, button.dataset.value);
    };
    stepArea.onsubmit = event => { event.preventDefault(); answer('done'); };
    showDatingPreview();
    const first = stepArea.querySelector('input[autofocus]');
    if (first) first.focus();
  }

  // 1. Is this the book?
  function bookStep() {
    const found = book.found;
    if (book.fixing) {
      return `<h2 class="step-title">${escapeHtml(found.source ? 'Fix the details' : 'Not found online')}</h2>
        <p class="step-hint">${escapeHtml(found.source ? 'Correct anything that is wrong.' : `${book.problem || 'Neither Open Library nor Google Books knows this book.'} Type what is on the title page.`)}</p>
        <form class="form">${fieldHtml('Title', 'title', found.title, { missing: !found.title })}${fieldHtml('Subtitle', 'subtitle', found.subtitle)}
          ${fieldHtml('Authors (separate with ;)', 'authors', found.authors.join('; '), { missing: !found.authors.length })}
          <div class="field-row">${fieldHtml('Publisher', 'publisher', found.publisher, { missing: !found.publisher })}${fieldHtml('Year of this printing', 'year', found.year, { missing: !found.year, type: 'number' })}</div>
          ${fieldHtml('Pages, as printed', 'pages', found.pages)}
          <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">Next</button></div></form>`;
    }
    const missing = [prompts.has('authors') && !found.authors.length && 'author', prompts.has('publisher') && !found.publisher && 'publisher', prompts.has('year') && !found.year && 'year'].filter(Boolean);
    const coverHtml = found.cover && !found.cover.waiting ? `<img class="step-cover" src="${attr(found.cover.url)}" alt="" onerror="this.remove()">` : '';
    const detailsHtml = escapeHtml([found.authors.join(', '), found.editionStatement, [found.publisher, found.year].filter(Boolean).join(', '), found.pages && `${found.pages} pages`].filter(Boolean).join(' · '));
    const peopleHtml = escapeHtml(found.contributors.map(person => `${person.role} ${person.name}`).join(' · '));
    const foundOnHtml = escapeHtml(`Found on ${(found.sources || ['Open Library']).join(' and ')}.`);
    return `<h2 class="step-title">Is this the book?</h2><p class="step-hint">${foundOnHtml}</p>
      <div class="found">${coverHtml}<div><p class="found-title">${escapeHtml(found.title)}</p><p class="found-sub">${escapeHtml(found.subtitle)}</p>
        <p class="found-meta">${detailsHtml}</p><p class="found-meta">${peopleHtml}</p></div></div>
      ${missing.length ? `<p class="step-hint is-missing">${escapeHtml(`Missing online: ${missing.join(', ')}. Tap "Fix details" to add.`)}</p>` : ''}
      <div class="choices">${choiceHtml('yes', 'Yes, this is it')}${choiceHtml('fix', 'Fix details', missing.length ? `Add the ${missing.join(', ')}` : 'Correct the title, author or year')}
        ${choiceHtml('back', 'Wrong book', 'Back to scanning')}</div>`;
  }

  // 2. A collection of works? Only when a record lists contents.
  function contentsStep() {
    const lines = book.contents ?? book.contentsText ?? book.found.contents.map(entry => (entry.author ? `${entry.author} — ${entry.title}` : entry.title)).join('\n');
    return `<h2 class="step-title">Is this a collection of works?</h2>
      <p class="step-hint">The record online lists these contents. If the book holds several works (an anthology), correct the list: one work per line, with its author first if you like ("Plato — Phaedo"). Each line becomes a work with its own date.</p>
      <form class="form"><label class="field">Contents<textarea name="contents" rows="8">${escapeHtml(lines)}</textarea></label>
        <div class="choices">${choiceHtml('single', 'No, it is one work', 'These are chapters or parts of one work')}</div>
        <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">Yes, these works</button></div></form>`;
  }

  // 3. Same work as one we already have?
  function workStep() {
    const optionsHtml = book.works.map(work => {
      const dating = workingDating(work);
      return choiceHtml('work', `Yes, the same work as ${work.title}`, dating ? `${dating.text}${work.originalTitle ? ' · ' + work.originalTitle : ''}` : 'already in the library', work.id);
    }).join('');
    return `<h2 class="step-title">Is this the same work as one you have?</h2>
      <p class="step-hint">If this is another edition or translation of a work you already have, they share its original date and are shown together.</p>
      <div class="choices">${optionsHtml}${choiceHtml('work', 'No, a different work', '', '')}</div>${backHtml()}`;
  }

  // 3. When was it written?
  function dateStep() {
    const year = book.found.year ? `the ${book.found.year} printing` : 'this printing';
    const suggestions = book.work ? suggestOriginalDates(book.work, book.found.year) : [];
    const suggestionsHtml = suggestions.map(hint => choiceHtml('date', hint.text, hint.label, hint.text)).join('');
    const waitingHtml = book.work ? '' : '<p class="step-hint">Looking for the first publication…</p>';
    const titleHtml = book.work && book.work.workTitle && normalizeForSearch(book.work.workTitle) !== normalizeForSearch(book.found.title)
      ? `<p class="step-hint">${escapeHtml(`Original title on Open Library: ${book.work.workTitle}`)} <button type="button" class="chip" data-action="original-title">Use it</button></p>` : '';
    return `<h2 class="step-title">When was this work written?</h2>
      <p class="step-hint${book.dateNudge ? ' is-missing' : ''}">${escapeHtml(book.dateNudge ? `Tap a suggestion, type a date, or tap "Don't know yet".` : `When the work itself was first written or published, not ${year}. Tap a suggestion or type a date.`)}</p>
      <div class="choices">${suggestionsHtml}</div>${waitingHtml}
      <form class="form"><label class="field">Or type a date<input name="dating" value="${attr(book.dating)}" placeholder="c. 397, 1530–59, early 2nd c." autocomplete="off"></label>
        <p class="preview" data-preview></p>${titleHtml}
        <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button type="button" class="btn" data-action="unknown">Don't know yet</button>
          <button class="btn btn-primary btn-big" type="submit">Next</button></div></form>`;
  }

  function showDatingPreview() {
    const input = stepArea.querySelector('[name="dating"]');
    if (!input) return;
    const read = parseDating(input.value);
    stepArea.querySelector('[data-preview]').textContent = !input.value.trim() ? '' : read.ok
      ? `Read as ${formatYearRange(read.dating.earliest, read.dating.latest)} (${read.dating.certainty})` : read.problem;
  }

  // 4. The cover.
  function coverStep() {
    const cover = book.cover;
    const photoButtonHtml = label => `<label class="choice-button"><span>${escapeHtml(label)}</span><small>The editor opens to line it up</small><input type="file" accept="image/*" capture="environment" data-photo="cover" hidden></label>`;
    if (book.photos.cover) {
      return `<h2 class="step-title">Your cover photo</h2><div class="found"><img class="step-cover" src="${attr(book.photos.cover.preview)}" alt=""></div>
        <div class="choices">${choiceHtml('next', 'Use this photo')}${photoButtonHtml('Take it again')}</div>${backHtml()}`;
    }
    if (cover.state === 'checking') return `<h2 class="step-title">Cover</h2><p class="step-hint">Looking for the cover online…</p><div class="choices">${photoButtonHtml('Take a photo instead')}</div>${backHtml()}`;
    if (cover.state === 'found') {
      return `<h2 class="step-title">Use this cover?</h2><p class="step-hint">Found on Open Library. Check it matches the book in your hand.</p><div class="found"><img class="step-cover is-large" src="${attr(cover.preview)}" alt=""></div>
        <div class="choices">${choiceHtml('next', 'Yes, use it')}${photoButtonHtml('No, take my own photo')}</div>${backHtml()}`;
    }
    if (cover.state === 'waiting') {
      return `<h2 class="step-title">Cover</h2><p class="step-hint">Google Books has a cover, which the laptop will fetch later.</p>
        <div class="choices">${choiceHtml('next', 'That is fine')}${photoButtonHtml('Take my own photo now')}</div>${backHtml()}`;
    }
    return `<h2 class="step-title">No cover found online</h2>
      <p class="step-hint">${escapeHtml(cover.tooSmall ? 'The one online is too small to look sharp.' : 'Take a photo of the front, so the book has its own cover.')}</p>
      <div class="choices">${photoButtonHtml('Take a photo of the cover')}${choiceHtml('next', 'Skip', 'A plain drawn cover is shown instead')}</div>${backHtml()}`;
  }

  // 5. The spine.
  function spineStep() {
    const doneHtml = book.photos.spine ? `<div class="found"><img class="step-spine" src="${attr(book.photos.spine.preview)}" alt=""></div>` : '';
    return `<h2 class="step-title">${escapeHtml(book.photos.spine ? 'Your spine photo' : 'Add a spine photo?')}</h2>
      <p class="step-hint">Optional. A spine photo shows on the book page and in the shelf view, so the book is easy to spot on the shelf.</p>${doneHtml}
      <div class="choices"><label class="choice-button"><span>${escapeHtml(book.photos.spine ? 'Take it again' : 'Take a photo of the spine')}</span>
        <small>The editor opens to line it up</small><input type="file" accept="image/*" capture="environment" data-photo="spine" hidden></label>
        ${choiceHtml('next', book.photos.spine ? 'Use this photo' : 'Skip')}</div>${backHtml()}`;
  }

  // 6. The binding.
  function bindingStep() {
    const listHtml = state.settings.bindings.map(binding => `<button type="button" class="chip chip-big${book.binding === binding ? ' is-on' : ''}" data-action="binding" data-value="${attr(binding)}">${escapeHtml(binding)}</button>`).join('');
    const named = book.found.binding ? ` The record online says ${book.found.binding}.` : '';
    return `<h2 class="step-title">What binding is this copy?</h2><p class="step-hint">${escapeHtml(`Tap one, or type another below.${named}`)}</p><div class="chips">${listHtml}</div>
      <form class="form">${fieldHtml('Something else', 'binding', state.settings.bindings.includes(book.binding) ? '' : book.binding, { list: 'bindings' })}
        <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">Next</button></div></form>`;
  }

  // 7. Where it goes.
  function whereStep() {
    const current = (state.batchLocation || []).filter(Boolean);
    const recent = [...new Set(state.library.entries.flatMap(entry => entry.copies.map(copy => copy.location.join(' › '))).filter(Boolean))].slice(-4);
    const placesHtml = [current.join(' › '), ...recent.filter(place => place !== current.join(' › '))].filter(Boolean)
      .map((place, i) => choiceHtml('place', place, i === 0 && current.length ? 'The shelf you are filling: goes after the last book added' : '', place)).join('');
    const partsHtml = ['Place', 'Room', 'Case', 'Shelf'].map((label, i) => fieldHtml(label, 'where', book.location[i] || '')).join('');
    return `<h2 class="step-title">Where does it go?</h2><p class="step-hint">Tap a shelf you have used, or type a new place below.</p>
      <div class="choices">${placesHtml}${choiceHtml('place', 'No place yet', 'It can be shelved later', '')}</div>
      <form class="form"><p class="step-hint">Or type a new place:</p><div class="field-row">${partsHtml}</div>
        <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">Next</button></div></form>`;
  }

  // 8. Anything else.
  function extrasStep() {
    const extras = book.extras;
    const translated = book.found.contributors.some(person => person.role === 'translator');
    return `<h2 class="step-title">Anything else?</h2><p class="step-hint">All optional. "Save the book" saves it and gets ready for the next one.</p>
      <form class="form">
        <label class="field">Notes: why we own it, a gift, its condition<textarea name="notes" rows="3">${escapeHtml(extras.notes || '')}</textarea></label>
        <div class="field-row">${fieldHtml('Estimated value', 'value', extras.value, { type: 'number' })}${fieldHtml('Price paid', 'price', extras.price, { type: 'number' })}</div>
        <div class="field-row">${fieldHtml('Series', 'series', extras.series)}${fieldHtml('Number', 'seriesNumber', extras.seriesNumber)}</div>
        <div class="field-row">${fieldHtml('Set', 'set', extras.set)}${fieldHtml('Volume', 'volume', extras.volume)}</div>
        ${translated ? fieldHtml('Translation first published (year)', 'translationFirstPublished', extras.translationFirstPublished, { type: 'number' }) : ''}
        <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">Save the book</button></div></form>`;
  }

  // ---------- answers ----------

  function readFields() {
    const value = name => (stepArea.querySelector(`[name="${name}"]`) || {}).value;
    const found = book.found;
    if (book.step === 'book' && book.fixing) {
      for (const name of ['title', 'subtitle', 'publisher', 'year', 'pages']) found[name] = (value(name) || '').trim();
      found.authors = (value('authors') || '').split(';').map(name => name.trim()).filter(Boolean);
      book.works = suggestWorks(found.title, found.authors, state.library);
    }
    if (book.step === 'contents' && value('contents') !== undefined) book.contentsText = value('contents');
    if (book.step === 'date') book.dating = (value('dating') || '').trim();
    if (book.step === 'binding' && value('binding')) book.binding = value('binding').trim();
    if (book.step === 'where') {
      const typed = [...stepArea.querySelectorAll('[name="where"]')].map(input => input.value.trim()).filter(Boolean);
      if (typed.length) book.location = typed;
    }
    if (book.step === 'extras') {
      for (const name of ['notes', 'value', 'price', 'series', 'seriesNumber', 'set', 'volume', 'translationFirstPublished']) book.extras[name] = value(name) ?? book.extras[name];
    }
  }

  function answer(action, value) {
    readFields();
    if (action === 'back') return back();
    if (action === 'fix') { book.fixing = true; return drawStep(); }
    if (action === 'yes' || action === 'next') { book.fixing = false; return next(); }
    if (action === 'done') {
      if (book.step === 'book' && !book.found.title) return drawStep();
      if (book.step === 'date' && book.dating && !parseDating(book.dating).ok) return drawStep();
      // An empty date is a choice, not an oversight: ask for "Don't know yet".
      if (book.step === 'date' && !book.dating) { book.dateNudge = true; return drawStep(); }
      if (book.step === 'contents') book.contents = book.contentsText.trim() || null;
      book.fixing = false;
      return next();
    }
    if (action === 'single') { book.contents = null; return next(); }
    if (action === 'work') { book.workId = value || null; return next(); }
    if (action === 'date') {
      const hint = suggestOriginalDates(book.work, book.found.year).find(item => item.text === value);
      book.dating = value;
      book.datingNote = hint ? `suggested: ${hint.label}` : '';
      return next();
    }
    if (action === 'unknown') { book.dating = ''; book.dateUnknown = true; return next(); }
    if (action === 'original-title') { book.originalTitle = book.work.workTitle; stepArea.querySelector('[data-action="original-title"]').textContent = 'Used'; return; }
    if (action === 'binding') { book.binding = value; return next(); }
    if (action === 'place') {
      book.location = value ? value.split(' › ') : [];
      return next();
    }
  }

  async function takePhoto(kind, file) {
    if (!file) return;
    const { editPhoto } = await import('./photo-editor.js');
    const size = estimateSize({ ...book.found, images: [], height: null, thickness: null, series: null, set: null }, { binding: book.binding });
    const files = await editPhoto(file, kind, { heightHint: `~${Math.round(size.height.mm / 10)} cm · ${size.height.source}` });
    if (files) book.photos[kind] = { ...files, preview: URL.createObjectURL(files.thumb) };
    drawStep();
  }

  // ---------- saving ----------

  function context() {
    return { newId: actions.newId, now: actions.now(), today: actions.today(), authors: [...state.library.authorsById.values()], works: state.library.worksById };
  }

  const number = text => String(text || '').replace(/[^\d.]/g, '');

  async function saveBook() {
    const { found, extras } = book;
    const form = {
      title: found.title, subtitle: found.subtitle, authors: found.authors, contributors: found.contributors,
      publisher: found.publisher, place: found.place, year: found.year, editionStatement: found.editionStatement, translationFirstPublished: number(extras.translationFirstPublished),
      series: extras.series || '', seriesNumber: extras.seriesNumber || '', set: extras.set || '', volume: extras.volume || '',
      isbn: found.isbn, pages: found.pages, languages: found.languages, medium: 'physical', logosId: '', contents: book.contents, workId: book.contents === null ? book.workId : null,
      work: { title: '', originalTitle: book.originalTitle, originalLanguage: found.originalLanguage, category: '', tags: [], datings: [{ text: book.dating, note: book.datingNote, working: true }] },
      copy: { binding: book.binding, location: book.location, acquired: '', price: number(extras.price), value: number(extras.value), status: 'owned', markings: false, notes: extras.notes || '' },
    };
    const result = recordsFromForm(form, null, context());
    if (result.problems.length) { actions.showNote(result.problems.join(' ')); return; }
    // The shelf the book went to becomes the shelf being filled.
    if (book.location.length) actions.setBatchLocation(book.location);
    const shelfOrder = nextShelfOrder(book.location);
    const records = result.records.map(record => (record.type === 'edition' ? withImages(record) : record.type === 'copy' ? { ...record, shelfOrder } : record));
    if (!(await actions.saveRecords(records, { soon: true }))) return;
    for (const [id, files] of book.imageFiles) actions.saveImageFiles(id, files);
    finishBook(found.title);
  }

  // The new edition's images: our photos, the checked online cover, or a waiting Google Books cover.
  function withImages(edition) {
    const images = [];
    book.imageFiles = [];
    const add = (kind, source, files, master) => {
      const id = actions.newId();
      images.push({ id, kind, source, color: kind === 'cover' ? files.color : null, ratio: files.ratio, master, waiting: null });
      book.imageFiles.push([id, files]);
    };
    if (book.photos.cover) add('cover', 'photo', book.photos.cover, true);
    else if (book.cover.state === 'found') add('cover', book.cover.source, book.cover.files, false);
    else if (book.cover.state === 'waiting') images.push({ id: actions.newId(), kind: 'cover', source: book.cover.source, color: null, ratio: null, master: false, waiting: book.cover.url });
    if (book.photos.spine) add('spine', 'photo', book.photos.spine, true);
    // Sizes from a record are stored as "catalog"; a height typed on the spine photo is "measured" and wins.
    const { height, thickness } = book.found;
    const measured = book.photos.spine && book.photos.spine.height;
    return {
      ...edition, images,
      ...(height ? { height, heightSource: 'catalog' } : {}),
      ...(thickness ? { thickness, thicknessSource: 'catalog' } : {}),
      ...(measured ? { height: measured, heightSource: 'measured' } : {}),
    };
  }

  function finishBook(title) {
    const banner = container.querySelector('[data-saved]');
    const place = book && book.location && book.location.length ? ` on ${book.location.join(' › ')}` : '';
    banner.textContent = title ? `✓ Saved: ${title}${place}. Ready for the next book.` : '';
    banner.hidden = !title;
    book = null;
    stepArea.hidden = true;
    stepArea.innerHTML = '';
    scanArea.hidden = false;
    showShelf();
    if (title) {
      added.unshift(title);
      const addedHtml = added.slice(0, 8).map(name => `<p class="piece-title">${escapeHtml(name)}</p>`).join('');
      container.querySelector('#added').innerHTML = `<section class="block"><h2 class="block-title">Added this time</h2>${addedHtml}</section>`;
    }
    if (scanner) scanner.resume();
    else find.focus();
  }

  // ---------- scanning ----------

  container.querySelector('.find').onsubmit = event => {
    event.preventDefault();
    findBook(find.value);
  };
  container.querySelector('[data-action="camera"]').onclick = async event => {
    const box = container.querySelector('.camera');
    const status = box.querySelector('[data-camera-status]');
    if (scanner) { scanner.stop(); scanner = null; box.hidden = true; event.target.textContent = 'Scan a barcode'; return; }
    box.hidden = false;
    event.target.textContent = 'Stop the camera';
    status.textContent = 'Starting the camera…';
    try {
      const { startScanner } = await import('../edges/camera.js');
      scanner = await startScanner(box.querySelector('video'), isbn => { showRead(box, isbn); setTimeout(() => lookUpIsbn(isbn), 500); }, { sound: state.device.scanSound !== false });
      status.textContent = 'Hold the barcode inside the frame.';
    } catch (error) {
      status.textContent = error.message;
      event.target.textContent = 'Scan a barcode';
    }
  };
  return () => { if (scanner) scanner.stop(); };
}

// A green flash and check mark over the camera when a barcode is read.
function showRead(box, isbn) {
  box.querySelector('.camera-read').textContent = `✓ Read ${isbn}`;
  box.classList.add('is-read');
  setTimeout(() => box.classList.remove('is-read'), 1200);
}
