// Batch add (PLAN.md, "Batch add"), one question per screen. Scan a barcode,
// type an ISBN (a USB scanner types it too) or type a title; then, step by
// step: is this the book, is it a collection (when a record lists contents),
// is it the same work as one we have, when was it written, its original
// language, category and tags, the translation, the cover, the spine, the
// binding, where it goes, and this copy. Adding asks what only a person
// knows; the lookups and the laptop fill catalog facts ("Needs details").
// Steps with nothing to ask are skipped. The camera stays open for the whole
// stack (paused during the steps), and the next scan is ready as soon as a
// book is saved. The questions' own drawing is in ui/add-questions.js.

import { escapeHtml } from '../core/html.js';
import { isbn13, isBookBarcode, recordsFromForm, anotherCopy, volumesFromLines, nextVolumeLabel, withSetFacts } from '../core/entry.js';
import { editionsWithIsbn, suggestWorks, sameWikidataWorks } from '../core/matching.js';
import { emptyFound, suggestOriginalDates } from '../core/lookup.js';
import { mergeFound, withLibraryContents } from '../core/book-data.js';
import { isBible } from '../core/bible.js';
import { keyBetween } from '../core/shelf-order.js';
import { parseDating, formatYearRange, workingDating } from '../core/dating.js';
import { estimateSize } from '../core/sizes.js';
import { lookUpOpenLibrary, lookUpWork, searchWork, searchOpenLibrary, downloadOpenLibraryCover } from '../edges/lookup-openlibrary.js';
import { lookUpGoogleBooks } from '../edges/lookup-googlebooks.js';
import { lookUpHathiTrust } from '../edges/lookup-hathitrust.js';
import { lookUpWorks } from '../edges/lookup-wikidata.js';
import { parseContentsLines } from '../core/contents.js';
import { normalizeForSearch } from '../core/search.js';
import { toggleHelp } from './field-help.js';
import { attr, fieldHtml, choiceHtml, isEnglish, languageStepHtml, subjectsStepHtml, translationStepHtml, copyStepHtml, readQuestions, contributorsWithTranslator } from './add-questions.js';
import { setFormHtml, readSetForm, setBannerHtml, volumeStepHtml, pasteStepHtml } from './add-set.js';
import { findKnownVolume, contentsLinesOf } from '../core/known-sets.js';
import { loadKnownSets } from './known-sets.js';

const MIN_COVER_HEIGHT = 400; // a smaller online cover counts as not found (PLAN.md)
const NO_WORK = { workTitle: '', firstPublished: null, author: null };

const STEP_NAMES = {
  book: 'The book', volume: 'Volume', contents: 'Contents', work: 'Same work?', date: 'Original date', language: 'Original language', subjects: 'Category and tags',
  translation: 'Translation', cover: 'Cover', spine: 'Spine', binding: 'Binding', where: 'Place', copy: 'This copy',
};

/** Draw the batch add screen. Returns a cleanup that closes the camera. */

export function render(container, state, actions) {
  const prompts = new Set(state.settings.batchAddPrompts || ['title', 'subtitle', 'authors', 'datings', 'binding', 'publisher', 'year']);
  let scanner = null;
  let book = null; // the book being added: what was found and every answer so far
  let shelfKey = null; // the last shelf order given on the shelf being filled
  // The set being added ("Adding a set", ui/add-set.js), until "Finish the set".
  // main.js keeps it while the app is open, so a look at the Library mid-set loses nothing.
  let setInfo = state.batchSet;
  const keepSet = set => { setInfo = set; actions.setBatchSet(set); };
  const added = [];
  // The known sets' lists (ui/known-sets.js), read while the camera starts; a book scanned before they arrive is added without them.
  let knownSets = [];
  loadKnownSets().then(sets => { knownSets = sets; });

  // With a USB scanner (Settings › This device) the scanner types the ISBN into the box, and presses Enter.
  const usb = state.device.scanner === 'usb';
  const bindingOptionsHtml = state.settings.bindings.map(binding => `<option value="${attr(binding)}">`).join('');
  container.innerHTML = `
    <div id="scan">
      <p class="saved-banner" data-saved role="status" hidden></p>
      <div class="page-head"><h1 class="page-title">Add books</h1>
        <p class="page-meta">Scan the barcode on the back, or type an ISBN or a title.</p></div>
      <div class="camera" hidden><div class="camera-view"><video aria-label="Camera"></video><p class="camera-read" aria-live="polite"></p></div>
        <p class="preview" data-camera-status></p>
        <button class="btn" type="button" data-action="light" aria-pressed="false" hidden>Light</button></div>
      <div class="scan-actions"${usb ? ' hidden' : ''}><button class="btn btn-primary btn-big" type="button" data-action="camera">Scan a barcode</button></div>
      <form class="find" autocomplete="off"><input id="find" type="search" placeholder="ISBN or title" enterkeyhint="search">
        <button class="btn" type="submit">Look up</button></form>
      <p class="preview" data-shelf></p>
      <div data-set></div>
      <p class="preview" data-other-ways><a class="link" href="#/new">Enter a book by hand instead</a>
        · <button type="button" class="link" data-action="start-set">Add a set of volumes</button></p>
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
    container.querySelector('[data-set]').innerHTML = setInfo ? setBannerHtml(setInfo) : '';
    container.querySelector('[data-other-ways]').hidden = !!setInfo;
  }

  // The shelves to offer: the one being filled first, then the last few used.
  function recentPlaces() {
    const current = (state.batchLocation || []).filter(Boolean).join(' › ');
    const recent = [...new Set(state.library.entries.flatMap(entry => entry.copies.map(copy => copy.location.join(' › '))).filter(Boolean))].slice(-4);
    return [current, ...recent.filter(place => place !== current)].filter(Boolean);
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
    // An ISBN a whole known set shares (Great Books) names no one edition: the volumes held are shown in "Which volume?" instead.
    const sharedBySet = knownSets.some(set => set.isbns.includes(isbn));
    const duplicates = sharedBySet ? [] : editionsWithIsbn(isbn, state.library.entries);
    if (duplicates.length) return askAboutDuplicate(duplicates[0]);
    // The work search is asked once, alongside: for date suggestions, and for authors the edition record lacks.
    const workSearch = searchWork(isbn);
    const work = lookUpWork(isbn, fetch, workSearch).catch(() => NO_WORK);
    const lookups = state.settings.lookups || { openLibrary: true, hathiTrust: true, googleBooks: true };
    const key = state.device.googleBooksKey || '';
    const problems = [];
    const ask = (lookUp, name) => lookUp().catch(error => { problems.push(error.message); return null; }).then(found => ({ found, name }));
    // HathiTrust, Open Library and, with a key, Google Books are asked at the same moment, so asking all is no slower.
    // Open Library comes first here: HathiTrust's record may describe an older printing with the same ISBN,
    // so it fills only what Open Library lacks, except the works inside, which it lists best (core/book-data.js).
    const asking = [];
    if (lookups.openLibrary !== false) asking.push(ask(() => lookUpOpenLibrary(isbn, fetch, workSearch), 'Open Library'));
    if (lookups.hathiTrust !== false) asking.push(ask(() => lookUpHathiTrust(isbn), 'HathiTrust'));
    if (lookups.googleBooks !== false && key) asking.push(ask(() => lookUpGoogleBooks(isbn, key), 'Google Books'));
    showMessage(`Looking up ISBN ${isbn}…`);
    const answers = await Promise.all(asking);
    let found = withLibraryContents(mergeFound(answers.map(answer => answer.found)), answers.map(answer => answer.found));
    // Without a key Google Books mostly refuses, so it is asked only when Open Library lacks something.
    if (!key && (!found || !found.authors.length || !found.publisher) && lookups.googleBooks !== false) {
      showMessage(found ? 'Some details are missing; asking Google Books too…' : `Not on Open Library; trying Google Books…`);
      answers.push(await ask(() => lookUpGoogleBooks(isbn, ''), 'Google Books'));
      found = withLibraryContents(mergeFound(answers.map(answer => answer.found)), answers.map(answer => answer.found));
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
    const looked = { ...emptyFound(''), ...found };
    // A volume of the set being added takes the set's shared facts, and the
    // previous volume's language, category and tags are offered again.
    const full = setInfo ? withSetFacts(looked, setInfo, setInfo.nextVolume) : looked;
    const last = (setInfo && setInfo.last) || { language: '', category: '', tags: [] };
    const translators = full.contributors.filter(person => person.role === 'translator').map(person => person.name);
    book = {
      found: full,
      problem, work: null, workId: null, dating: '', datingNote: '', dateUnknown: false,
      // What only a person knows, asked by the steps in ui/add-questions.js.
      language: full.originalLanguage || last.language, originalTitle: full.originalTitle || '', category: last.category, tags: [...last.tags],
      translator: translators.join('; '), translationYear: '', hasTranslator: translators.length > 0,
      copy: { acquired: '', price: '', value: '', markings: false, notes: '' },
      photos: {}, cover: { state: 'none' }, otherCover, binding: full.binding, location: (state.batchLocation || []).filter(Boolean),
      // Contents a record lists are offered, never for a Bible (cited by chapter and verse).
      contentsOffered: full.contents.length > 1 && !isBible({ edition: {}, works: full.contents }),
      contents: null, // the accepted contents, one work per line
      severalChosen: false, // "Yes, and it holds several works", when no source listed them
      wikidata: new Map(), wikidataAsked: '', wikidataProblem: { key: '', message: '' }, // what Wikidata says about the works, by title
      fixing: !found.source, // not found online: the details are asked for at once
    };
    // A volume of a known set takes its works from the list. One found by its own ISBN is used at once;
    // an ISBN the whole set shares (Great Books) asks which volume first. While adding a set, the volume step decides.
    const known = findKnownVolume(knownSets, { isbn: full.isbn, set: full.set, volume: full.volume });
    book.knownSet = known ? known.set : null;
    book.knownVolume = null;
    if (known && known.volume && !setInfo) useKnownVolume(known.set, known.volume);
    // What the lookup says for a shared ISBN describes some other volume, or another printing: set aside, and the list's set facts used.
    else if (known && !setInfo) {
      const { title, subtitle, authors, contents, pages, subjects, contributors, year, publisher, place, editionStatement, series, seriesNumber, identifiers } = emptyFound('');
      Object.assign(book.found, { title, subtitle, authors, contents, pages, subjects, contributors, year, publisher, place, editionStatement, series, seriesNumber, identifiers, cover: null });
      book.otherCover = null;
    }
    book.works = suggestWorks(book.found.title, book.found.authors, state.library);
    const current = book;
    Promise.resolve(workLookup).then(work => { if (book === current) { book.work = work; if (['date', 'language'].includes(book.step)) drawStep(); } });
    checkCover(current);
    if (!book.knownSet && full.title && full.authors[0]) askWikidata(current, [full.title], full.authors[0]);
    goTo(steps()[0]);
  }

  // A volume of a known set: its title, authors and works come from the list
  // (core/known-sets.js); a checked list's dates come with them.
  function useKnownVolume(set, volume) {
    const found = book.found;
    book.knownSet = set;
    book.knownVolume = volume;
    Object.assign(found, {
      set: set.set, volume: volume.label, title: volume.title || found.title,
      authors: [...new Set(volume.works.map(work => work.author).filter(Boolean))],
      contents: volume.works.map(work => ({ title: work.title, author: work.author })),
      publisher: found.publisher || set.publisher, place: found.place || set.place, year: found.year || set.year,
      editionStatement: found.editionStatement || set.editionStatement,
      sources: [...new Set([...(found.sources || []), `the list of ${set.set}`])],
    });
    book.contentsOffered = true;
    book.contents = null;
    book.contentsText = set.checked ? contentsLinesOf(volume) : volume.works.map(work => [work.author, work.title].filter(Boolean).join(' — ')).join('\n');
    const languages = [...new Set(volume.works.map(work => work.originalLanguage).filter(Boolean))];
    if (languages.length === 1) book.language = languages[0];
    const translators = [...new Set(volume.works.map(work => work.translator).filter(Boolean))];
    if (translators.length === 1) Object.assign(book, { translator: translators[0], hasTranslator: true });
    book.works = suggestWorks(found.title, found.authors, state.library);
  }

  // A volume chosen or typed: from a known set's list when it has one, otherwise as typed.
  function chooseVolume(label) {
    book.found.volume = label;
    const known = label ? findKnownVolume(book.knownSet ? [book.knownSet] : knownSets, { set: book.found.set || (book.knownSet || {}).set, volume: label }) : null;
    if (known && known.volume) useKnownVolume(known.set, known.volume);
    else book.knownVolume = null;
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
    // A work already in the library keeps its own language, category and tags.
    const ownWork = single && !linked;
    const language = linked ? linked.originalLanguage : book.language;
    // A volume of a known set that shares one ISBN is asked which volume first, so "Is this the book?" shows the right one.
    const askVolumeFirst = book.knownSet && !book.knownVolume && !setInfo && !book.volumeSkipped;
    return [
      askVolumeFirst ? 'volume' : null,
      'book',
      setInfo ? 'volume' : null,
      book.contentsOffered || book.severalChosen ? 'contents' : null,
      single && book.works.length ? 'work' : null,
      single && !(linked && linked.datings.length) && prompts.has('datings') ? 'date' : null,
      // A collection is asked its language, category and tags once, for all its new works.
      ownWork || !single ? 'language' : null,
      ownWork || !single ? 'subjects' : null,
      book.hasTranslator || (language && !isEnglish(language)) ? 'translation' : null,
      'cover', 'spine',
      prompts.has('binding') ? 'binding' : null,
      'where', 'copy',
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
    const draw = {
      book: bookStep, volume: () => (book.knownSet ? knownVolumeStep() : volumeStepHtml(book, setInfo)), contents: contentsStep, work: workStep, date: dateStep,
      language: () => languageStepHtml(book), subjects: () => subjectsStepHtml(book, subjectChoices()),
      translation: () => translationStepHtml(book), cover: coverStep, spine: spineStep, binding: bindingStep, where: whereStep, copy: () => copyStepHtml(book),
    }[book.step];
    stepArea.innerHTML = progressHtml() + draw();
    stepArea.oninput = event => { if (event.target.name === 'dating') showDatingPreview(); };
    stepArea.onchange = event => { if (event.target.dataset.photo) takePhoto(event.target.dataset.photo, event.target.files[0]); };
    stepArea.onclick = event => {
      if (event.target.dataset.help) { toggleHelp(stepArea, event.target); return; }
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
      <div class="choices">${choiceHtml('yes', 'Yes, this is it')}${book.contentsOffered ? '' : choiceHtml('several', 'Yes, and it holds several works', 'Collected works or an anthology: list them next')}${choiceHtml('fix', 'Fix details', missing.length ? `Add the ${missing.join(', ')}` : 'Correct the title, author or year')}
        ${choiceHtml('back', 'Wrong book', 'Back to scanning')}</div>`;
  }

  // Which volume of a known set: its volumes as the list names them.
  function knownVolumeStep() {
    const set = book.knownSet;
    const next = setInfo && setInfo.nextVolume ? ` Next after the last one added: ${setInfo.nextVolume}.` : '';
    const held = new Set(state.library.entries.filter(entry => entry.edition.set && normalizeForSearch(entry.edition.set) === normalizeForSearch(set.set)).map(entry => normalizeForSearch(entry.edition.volume || '')));
    const choicesHtml = set.volumes.map(volume => choiceHtml('volume', volume.title ? `${volume.label} · ${volume.title}` : volume.label,
      held.has(normalizeForSearch(volume.label)) ? 'Already in the library: this adds another copy' : '', volume.label)).join('');
    return `<h2 class="step-title">${escapeHtml(`Which volume of ${set.set} is this?`)}</h2>
      <p class="step-hint">${escapeHtml(`The number on the spine.${next} Its works are then taken from the list.`)}</p>
      <div class="choices">${choicesHtml}${choiceHtml('volume-other', 'Not in the list', 'Type its details instead')}</div>${backHtml()}`;
  }

  // Ask Wikidata about some works of this book, once for each list of titles; draw the step again when it answers.
  function askWikidata(current, titles, author) {
    const lookups = state.settings.lookups || {};
    const key = `${author}|${titles.join('|')}`;
    if (lookups.wikidata === false || !titles.length || current.wikidataAsked === key) return;
    current.wikidataAsked = key;
    lookUpWorks(titles, author).then(found => {
      for (const [title, work] of found) current.wikidata.set(title, work);
      // "Possibly the same as…": a work already held under the same Wikidata item is offered in "Same work?".
      const held = current.contents === null && sameWikidataWorks(found, state.library.worksById).get(current.found.title);
      if (held && !current.works.includes(held)) { current.works.push(held); current.sameItem = held.id; }
      if (book === current && ['contents', 'date'].includes(book.step)) drawStep();
    }).catch(error => {
      current.wikidataProblem = { key, message: error.message };
      if (book === current && book.step === 'contents') drawStep();
    });
  }

  // The works listed in the contents box, and their most common author (the book's when none is given).
  function listedWorks(text) {
    const pieces = parseContentsLines(text);
    const counts = new Map();
    for (const piece of pieces) if (piece.author) counts.set(piece.author, (counts.get(piece.author) || 0) + 1);
    const author = [...counts].sort((a, b) => b[1] - a[1]).map(([name]) => name)[0] || book.found.authors[0] || '';
    return { pieces, author };
  }

  // Wikidata's dates for listed works still without one, offered with one tap (PLAN.md, "Original dates").
  function wikidataDatesHtml(text) {
    const offered = parseContentsLines(text).filter(piece => !piece.date && (book.wikidata.get(piece.title) || {}).date);
    // A problem is shown only when it came from asking about these works, not about the book's own title.
    const problem = book.wikidataProblem.key === book.wikidataAsked ? book.wikidataProblem.message : '';
    if (!offered.length) return problem ? `<p class="step-hint">${escapeHtml(problem)}</p>` : '';
    const list = offered.map(piece => `${piece.title} ${book.wikidata.get(piece.title).date}`).join('; ');
    return `<div class="field"><p class="step-hint">${escapeHtml(`Wikidata gives when ${offered.length} of these were written or first published: ${list}.`)}</p>`
      + `<button type="button" class="chip" data-action="wikidata-dates">Use these dates</button></div>`;
  }

  // The dates of a list nobody has checked yet: offered with one tap, like Wikidata's (PLAN.md, "Original dates").
  const listDateOf = title => ((book.knownVolume.works.find(work => work.title === title) || {}).date || '');
  function listDatesHtml(text) {
    const offered = parseContentsLines(text).filter(piece => !piece.date && listDateOf(piece.title));
    if (!offered.length) return '';
    const sample = offered.slice(0, 3).map(piece => `${piece.title} ${listDateOf(piece.title)}`).join('; ') + (offered.length > 3 ? '; …' : '');
    return `<div class="field"><p class="step-hint">${escapeHtml(`The list, not yet checked by a person, gives when ${offered.length} of these were written: ${sample}.`)}</p>`
      + '<button type="button" class="chip" data-action="list-dates">Use these dates</button></div>';
  }

  // "Possibly the same as…" in a collection: works Wikidata names with the same item as works already held.
  function sameWorksHtml(pieces) {
    const same = sameWikidataWorks(book.wikidata, state.library.worksById);
    const matches = pieces.filter(piece => same.has(piece.title)).map(piece => ({ title: piece.title, work: same.get(piece.title) }));
    if (!matches.length) return '';
    const holder = work => (state.library.entries.find(entry => entry.works.includes(work)) || { edition: { title: '' } }).edition.title;
    const names = matches.map(match => `${match.title}${holder(match.work) ? ` (in ${holder(match.work)})` : ''}`).join('; ');
    if (book.sameWorks) return `<p class="step-hint">${escapeHtml(`Joined to the works you already have: ${names}.`)}</p>`;
    book.sameMatches = matches;
    return `<div class="field"><p class="step-hint">${escapeHtml(`Possibly the same as works you already have (Wikidata names them as one): ${names}.`)}</p>`
      + '<button type="button" class="chip" data-action="join-same">Yes, the same works</button></div>';
  }

  // 2. A collection of works? When a record lists contents, or the person said so.
  function contentsStep() {
    const lines = book.contents ?? book.contentsText ?? book.found.contents.map(entry => (entry.author ? `${entry.author} — ${entry.title}` : entry.title)).join('\n');
    const listed = listedWorks(lines);
    const set = book.knownVolume && book.knownSet;
    // A known set's list gives the dates itself (filled in when checked, offered when not), so Wikidata is not asked.
    if (!set) askWikidata(book, listed.pieces.map(piece => piece.title), listed.author);
    const datesHtml = (set ? listDatesHtml(lines) : wikidataDatesHtml(lines)) + (set ? '' : sameWorksHtml(listed.pieces));
    if (set) {
      return `<h2 class="step-title">The works in this volume</h2>
        <p class="step-hint">${escapeHtml(`From the ${set.checked ? 'checked ' : ''}list of ${set.set}, volume ${book.knownVolume.label}. Correct any line your copy differs in; a line left as it is keeps the list's original title, language and translator.`)}</p>
        <form class="form"><label class="field">Contents<textarea name="contents" rows="8">${escapeHtml(lines)}</textarea></label>${datesHtml}
          <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">Next</button></div></form>`;
    }
    const hint = book.contentsOffered
      ? 'The record online lists these contents. If the book holds several works (an anthology), correct the list: one work per line, with its author first if you like ("Plato — Phaedo"). Each line becomes a work with its own date.'
      : 'No record online lists them. Type or paste the works, one per line, with the author first if you like and a date last if you know it ("Plato — Phaedo — c. 360 BC"). A table of contents can be pasted and tidied here.';
    // With no contents known, a photo of the contents page is kept with the book, to be typed
    // in later beside it, on the laptop's "Contents to enter" page (PLAN.md, "Contents no source knows").
    const photo = book.photos.contents;
    const photoHtml = book.contentsOffered ? ''
      : photo ? `<p class="step-hint"><img class="step-cover" src="${attr(photo.preview)}" alt="The contents page"> ${escapeHtml('The photo of the contents page is kept with the book. Type the works now, or later on the laptop ("Contents to enter"), and leave the box empty to save the book for now.')}</p>`
      : '<label class="choice-button"><span>Photograph the contents page</span><small>Kept with the book, so the works can be typed in later on the laptop</small><input type="file" accept="image/*" capture="environment" data-photo="contents" hidden></label>';
    return `<h2 class="step-title">${escapeHtml(book.contentsOffered ? 'Is this a collection of works?' : 'Which works does it hold?')}</h2>
      <p class="step-hint">${escapeHtml(hint)}</p>
      <form class="form"><label class="field">Contents<textarea name="contents" rows="8">${escapeHtml(lines)}</textarea></label>${datesHtml}
        <div class="choices">${photoHtml}${choiceHtml('single', 'No, it is one work', 'These are chapters or parts of one work')}</div>
        <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">Yes, these works</button></div></form>`;
  }

  // 3. Same work as one we already have?
  function workStep() {
    const optionsHtml = book.works.map(work => {
      const dating = workingDating(work);
      const detail = dating ? `${dating.text}${work.originalTitle ? ' · ' + work.originalTitle : ''}` : 'already in the library';
      return choiceHtml('work', `Yes, the same work as ${work.title}`, work.id === book.sameItem ? `Wikidata names both as one work · ${detail}` : detail, work.id);
    }).join('');
    return `<h2 class="step-title">Is this the same work as one you have?</h2>
      <p class="step-hint">If this is another edition or translation of a work you already have, they share its original date and are shown together.</p>
      <div class="choices">${optionsHtml}${choiceHtml('work', 'No, a different work', '', '')}</div>${backHtml()}`;
  }

  // Wikidata's date for this one work, offered first when it knows one.
  function wikidataSuggestion() {
    const work = book.wikidata.get(book.found.title);
    return work && work.date ? [{ text: work.date, label: 'written or first published (Wikidata)' }] : [];
  }

  // 3. When was it written?
  function dateStep() {
    const year = book.found.year ? `the ${book.found.year} printing` : 'this printing';
    const suggestions = [...wikidataSuggestion(), ...(book.work ? suggestOriginalDates(book.work, book.found.year) : [])];
    const suggestionsHtml = suggestions.map(hint => choiceHtml('date', hint.text, hint.label, hint.text)).join('');
    const waitingHtml = book.work ? '' : '<p class="step-hint">Looking for the first publication…</p>';
    return `<h2 class="step-title">When was this work written?</h2>
      <p class="step-hint${book.dateNudge ? ' is-missing' : ''}">${escapeHtml(book.dateNudge ? `Tap a suggestion, type a date, or tap "Don't know yet".` : `When the work itself was first written or published, not ${year}. Tap a suggestion or type a date.`)}</p>
      <div class="choices">${suggestionsHtml}</div>${waitingHtml}
      <form class="form"><label class="field">Or type a date<input name="dating" value="${attr(book.dating)}" placeholder="c. 397, 1530–59, early 2nd c." autocomplete="off"></label>
        <p class="preview" data-preview></p>
        <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button type="button" class="btn" data-action="unknown">Don't know yet</button>
          <button class="btn btn-primary btn-big" type="submit">Next</button></div></form>`;
  }

  // The categories in use, by name, and the tags in use, most used first.
  function subjectChoices() {
    const categories = new Set();
    const tagCounts = new Map();
    for (const work of state.library.worksById.values()) {
      if (work.category) categories.add(work.category);
      for (const tag of work.tags) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
    const tags = [...tagCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag]) => tag);
    return { categories: [...categories].sort((a, b) => a.localeCompare(b)), tags };
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
    const isFilling = (state.batchLocation || []).filter(Boolean).length > 0;
    const placesHtml = recentPlaces()
      .map((place, i) => choiceHtml('place', place, i === 0 && isFilling ? 'The shelf you are filling: goes after the last book added' : '', place)).join('');
    const partsHtml = ['Place', 'Room', 'Case', 'Shelf'].map((label, i) => fieldHtml(label, 'where', book.location[i] || '')).join('');
    return `<h2 class="step-title">Where does it go?</h2><p class="step-hint">Tap a shelf you have used, or type a new place below.</p>
      <div class="choices">${placesHtml}${choiceHtml('place', 'No place yet', 'It can be shelved later', '')}</div>
      <form class="form"><p class="step-hint">Or type a new place:</p><div class="field-row">${partsHtml}</div>
        <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">Next</button></div></form>`;
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
    if (book.step === 'volume' && (value('volume') || '').trim()) found.volume = value('volume').trim();
    if (book.step === 'contents' && value('contents') !== undefined) book.contentsText = value('contents');
    if (book.step === 'date') book.dating = (value('dating') || '').trim();
    if (book.step === 'binding' && value('binding')) book.binding = value('binding').trim();
    if (book.step === 'where') {
      const typed = [...stepArea.querySelectorAll('[name="where"]')].map(input => input.value.trim()).filter(Boolean);
      if (typed.length) book.location = typed;
    }
    readQuestions(book, stepArea);
  }

  function answer(action, value) {
    readFields();
    if (action === 'back') return back();
    if (action === 'fix') { book.fixing = true; return drawStep(); }
    if (action === 'yes' || action === 'next') { book.fixing = false; if (action === 'yes') book.severalChosen = false; return next(); }
    if (action === 'several') { book.fixing = false; book.severalChosen = true; return next(); }
    if (action === 'done') {
      if (book.step === 'book' && !book.found.title) return drawStep();
      if (book.step === 'date' && book.dating && !parseDating(book.dating).ok) return drawStep();
      // An empty date is a choice, not an oversight: ask for "Don't know yet".
      if (book.step === 'date' && !book.dating) { book.dateNudge = true; return drawStep(); }
      if (book.step === 'contents') book.contents = book.contentsText.trim() || null;
      book.fixing = false;
      return next();
    }
    if (action === 'volume') { chooseVolume(value); return next(); }
    if (action === 'volume-other') {
      // Without the list: the person types the volume's details, as for a book not found online.
      Object.assign(book, { volumeSkipped: true, knownVolume: null, fixing: !setInfo });
      return next();
    }
    if (action === 'single') { book.contents = null; return next(); }
    if (action === 'wikidata-dates' || action === 'list-dates') {
      // Each listed work without a date gets the offered one, as if typed; they can still be changed before going on.
      const dateOf = action === 'list-dates' ? listDateOf : title => (book.wikidata.get(title) || {}).date || '';
      book.contentsText = (book.contentsText ?? '').split('\n').map(line => {
        const [piece] = parseContentsLines(line);
        const date = piece && !piece.date && dateOf(piece.title);
        return date ? `${line.trimEnd()} — ${date}` : line;
      }).join('\n');
      return drawStep();
    }
    if (action === 'join-same') {
      book.sameWorks = Object.fromEntries((book.sameMatches || []).map(match => [normalizeForSearch(match.title), match.work.id]));
      return drawStep();
    }
    if (action === 'work') { book.workId = value || null; return next(); }
    if (action === 'date') {
      const hint = [...wikidataSuggestion(), ...suggestOriginalDates(book.work, book.found.year)].find(item => item.text === value);
      book.dating = value;
      book.datingNote = hint ? `suggested: ${hint.label}` : '';
      return next();
    }
    if (action === 'unknown') { book.dating = ''; book.dateUnknown = true; return next(); }
    if (action === 'original-title') { book.originalTitle = book.work.workTitle; return drawStep(); }
    // English needs no original title, so tapping it goes straight on.
    if (action === 'language') { book.language = value; return isEnglish(value) ? next() : drawStep(); }
    if (action === 'category') { book.category = book.category === value ? '' : value; return drawStep(); }
    if (action === 'tag') { book.tags = book.tags.includes(value) ? book.tags.filter(tag => tag !== value) : [...book.tags, value]; return drawStep(); }
    if (action === 'binding') { book.binding = value; return next(); }
    if (action === 'place') {
      book.location = value ? value.split(' › ') : [];
      return next();
    }
  }

  async function takePhoto(kind, file) {
    if (!file) return;
    // A contents page needs no lining up: it is kept as taken, large enough to read.
    if (kind === 'contents') {
      const box = stepArea.querySelector('[name="contents"]');
      if (box) book.contentsText = box.value;
      const { readPicture, imageFiles } = await import('../edges/photo.js');
      const files = await imageFiles(await readPicture(file), { master: true, kind });
      book.photos.contents = { ...files, preview: URL.createObjectURL(files.thumb) };
      drawStep();
      return;
    }
    const { editPhoto } = await import('./photo-editor.js');
    const size = estimateSize({ ...book.found, images: [], height: null, thickness: null, series: null, set: null }, { binding: book.binding });
    const files = await editPhoto(file, kind, { heightHint: `~${Math.round(size.height.mm / 10)} cm · ${size.height.source}` });
    if (files) book.photos[kind] = { ...files, preview: URL.createObjectURL(files.thumb) };
    drawStep();
  }

  // ---------- saving ----------

  function context() {
    // The works of our other volumes of the same known set, so a work spanning volumes (Gibbon) stays one work.
    const set = book && book.knownVolume && normalizeForSearch(book.knownSet.set);
    const setWorks = set ? state.library.entries.filter(entry => entry.edition.set && normalizeForSearch(entry.edition.set) === set).flatMap(entry => entry.works) : [];
    return { newId: actions.newId, now: actions.now(), today: actions.today(), authors: [...state.library.authorsById.values()], works: state.library.worksById, setWorks };
  }

  const number = text => String(text || '').replace(/[^\d.]/g, '');

  // A new work Wikidata knows gets its ID, its other titles and (if none was given) its original title,
  // and a date taken from Wikidata says so in its note (DATA_FORMAT.md, "Datings").
  function withWikidata(record) {
    const known = record.type === 'work' && !state.library.worksById.has(record.id) && book.wikidata.get(record.title);
    if (!known) return record;
    const datings = record.datings.map(dating => (dating.text === known.date && !dating.note ? { ...dating, note: 'from Wikidata' } : dating));
    return { ...record, wikidata: known.wikidata, otherTitles: known.otherTitles, originalTitle: record.originalTitle || known.originalTitle || null, datings };
  }

  async function saveBook() {
    const { found, copy } = book;
    const form = {
      title: found.title, subtitle: found.subtitle, authors: found.authors, contributors: contributorsWithTranslator(found.contributors, book.translator),
      publisher: found.publisher, place: found.place, year: found.year, editionStatement: found.editionStatement, translationFirstPublished: number(book.translationYear),
      series: found.series || '', seriesNumber: found.seriesNumber || '', set: found.set || '', volume: found.volume || '',
      isbn: found.isbn, pages: found.pages, languages: found.languages, medium: 'physical', logosId: '', contents: book.contents, workId: book.contents === null ? book.workId : null,
      knownWorks: book.knownVolume && book.contents !== null ? { set: book.knownSet.set, works: book.knownVolume.works } : null,
      sameWorks: book.contents !== null ? book.sameWorks || null : null,
      work: {
        title: '', originalTitle: isEnglish(book.language) || book.contents !== null ? '' : book.originalTitle, originalLanguage: book.language, category: book.category, tags: book.tags,
        datings: [{ text: book.dating, note: book.datingNote, working: true }],
      },
      copy: { binding: book.binding, location: book.location, acquired: copy.acquired, price: number(copy.price), value: number(copy.value), status: 'owned', markings: copy.markings, notes: copy.notes },
    };
    const result = recordsFromForm(form, null, context());
    if (result.problems.length) { actions.showNote(result.problems.join(' ')); return; }
    result.records = result.records.map(withWikidata);
    // The shelf the book went to becomes the shelf being filled.
    if (book.location.length) actions.setBatchLocation(book.location);
    const shelfOrder = nextShelfOrder(book.location);
    const records = result.records.map(record => (record.type === 'edition' ? withImages(record) : record.type === 'copy' ? { ...record, shelfOrder } : record));
    if (!(await actions.saveRecords(records, { soon: true }))) return;
    for (const [id, files] of book.imageFiles) actions.saveImageFiles(id, files);
    // In a set, the next volume is suggested, and this one's answers are offered again.
    if (setInfo) keepSet({ ...setInfo, nextVolume: nextVolumeLabel(found.volume), last: { language: book.language, category: book.category, tags: book.tags } });
    finishBook(found.title);
  }

  // ---------- adding a set (ui/add-set.js) ----------

  const NEW_SET = { title: '', publisher: '', year: '', editionStatement: '', editors: [], binding: '', nextVolume: '', last: null, isMissingTitle: false };

  // The set's shared facts, given once; then its volumes are scanned, typed or pasted.
  function showSetForm(set = NEW_SET) {
    scanArea.hidden = true;
    stepArea.hidden = false;
    stepArea.oninput = null;
    stepArea.onchange = null;
    stepArea.innerHTML = setFormHtml(set);
    stepArea.onclick = event => {
      if (event.target.dataset.help) { toggleHelp(stepArea, event.target); return; }
      if (event.target.closest('[data-action="back"]')) finishBook();
    };
    stepArea.onsubmit = event => {
      event.preventDefault();
      const typed = readSetForm(stepArea, set);
      if (!typed.title) { showSetForm({ ...typed, isMissingTitle: true }); return; }
      keepSet({ ...typed, isMissingTitle: false });
      finishBook();
    };
    stepArea.querySelector('input').focus();
  }

  function showPasteVolumes() {
    scanArea.hidden = true;
    stepArea.hidden = false;
    stepArea.oninput = null;
    stepArea.onchange = null;
    stepArea.innerHTML = pasteStepHtml(setInfo, recentPlaces(), '');
    const volumes = () => volumesFromLines(stepArea.querySelector('[name="volumes"]').value, setInfo.title);
    stepArea.onclick = event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'back') finishBook();
      if (button.dataset.action === 'paste-place') savePastedVolumes(volumes(), button.dataset.value ? button.dataset.value.split(' › ') : []);
    };
    stepArea.onsubmit = event => {
      event.preventDefault();
      savePastedVolumes(volumes(), [...stepArea.querySelectorAll('[name="where"]')].map(input => input.value.trim()).filter(Boolean));
    };
  }

  // Each pasted line becomes its own edition with the set's facts, standing
  // in line order on one shelf. Photos and contents come later.
  async function savePastedVolumes(volumes, location) {
    if (!volumes.length) { actions.showNote('Paste at least one volume, one per line.'); return; }
    const records = [];
    for (const { volume, title } of volumes) {
      const form = {
        title, subtitle: '', authors: [], contributors: setInfo.editors.map(name => ({ name, role: 'editor' })),
        publisher: setInfo.publisher, place: '', year: setInfo.year, editionStatement: setInfo.editionStatement, translationFirstPublished: '',
        series: '', seriesNumber: '', set: setInfo.title, volume, isbn: '', pages: '', languages: [], medium: 'physical', logosId: '', contents: null, workId: null,
        work: { title: '', originalTitle: '', originalLanguage: '', category: '', tags: [], datings: [] },
        copy: { binding: setInfo.binding, location, acquired: '', price: '', value: '', status: 'owned', markings: false, notes: '' },
      };
      const result = recordsFromForm(form, null, context());
      if (result.problems.length) { actions.showNote(result.problems.join(' ')); return; }
      const shelfOrder = nextShelfOrder(location);
      records.push(...result.records.map(record => (record.type === 'copy' ? { ...record, shelfOrder } : record)));
    }
    if (!(await actions.saveRecords(records, { soon: true }))) return;
    if (location.length) actions.setBatchLocation(location);
    keepSet({ ...setInfo, nextVolume: nextVolumeLabel(volumes[volumes.length - 1].volume) });
    finishBook(`${volumes.length} ${volumes.length === 1 ? 'volume' : 'volumes'} of ${setInfo.title}`, location);
  }

  // The new edition's images (our photos, the checked online cover, or a waiting Google Books
  // cover), and what the records online gave that the steps do not ask: sizes, catalogue numbers, subjects.
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
    if (book.photos.contents) add('contents', 'photo', book.photos.contents, true);
    // Sizes from a record are stored as "catalog"; a height typed on the spine photo is "measured" and wins.
    const { height, thickness } = book.found;
    const measured = book.photos.spine && book.photos.spine.height;
    const { lccn, oclc, lcc, ddc, openLibrary, hathiTrust } = book.found.identifiers;
    return {
      ...edition, images,
      identifiers: { lccn: lccn || null, oclc: oclc || null, lcc: lcc || null, ddc: ddc || null, openLibrary: openLibrary || null, hathiTrust: hathiTrust || null }, subjects: book.found.subjects,
      ...(height ? { height, heightSource: 'catalog' } : {}),
      ...(thickness ? { thickness, thicknessSource: 'catalog' } : {}),
      ...(measured ? { height: measured, heightSource: 'measured' } : {}),
    };
  }

  // location: where what was saved went, shown in the banner.
  function finishBook(title, location = book ? book.location : []) {
    const banner = container.querySelector('[data-saved]');
    const place = location && location.length ? ` on ${location.join(' › ')}` : '';
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
  scanArea.onclick = event => {
    const button = event.target.closest('[data-action]');
    const action = button ? button.dataset.action : '';
    if (action === 'start-set') showSetForm();
    else if (action === 'paste-volumes') showPasteVolumes();
    else if (action === 'finish-set') { keepSet(null); showShelf(); }
  };
  container.querySelector('[data-action="camera"]').onclick = async event => {
    const box = container.querySelector('.camera');
    const status = box.querySelector('[data-camera-status]');
    const light = box.querySelector('[data-action="light"]');
    if (scanner) { scanner.stop(); scanner = null; box.hidden = true; light.hidden = true; light.setAttribute('aria-pressed', 'false'); event.target.textContent = 'Scan a barcode'; return; }
    box.hidden = false;
    event.target.textContent = 'Stop the camera';
    status.textContent = 'Starting the camera…';
    try {
      const { startScanner } = await import('../edges/camera.js');
      scanner = await startScanner(box.querySelector('video'), isbn => { showRead(box, isbn); setTimeout(() => lookUpIsbn(isbn), 500); }, { sound: state.device.scanSound !== false });
      status.textContent = 'Hold the barcode inside the frame.';
      // The Light button, only where the camera has a light (edges/camera.js).
      light.hidden = !scanner.hasLight;
      light.onclick = async () => {
        const on = light.getAttribute('aria-pressed') !== 'true';
        try {
          await scanner.setLight(on);
          light.setAttribute('aria-pressed', String(on));
        } catch {
          light.hidden = true;
          status.textContent = 'This camera has no light. Hold the book near a lamp.';
        }
      };
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
