// Batch add (PLAN.md, "Batch add"), one question per screen. Scan a barcode,
// type an ISBN (a USB scanner types it too) or type a title; then, step by
// step: is this the book, its title page and copyright page (publisher, year,
// first printing, ISBNs, series, set, pages), is it a collection (when a record lists contents),
// is it the same work as one we have, when was it written, its original
// language (for a collection, then a card per work: ui/add-works.js),
// category and tags, the translation, the cover, the spine and height, the
// binding, where it goes, this copy, and "Check before saving"
// (ui/add-check.js). Every field wanted is filled from a source and shown,
// or asked: a must field left empty keeps its step open until it is filled
// or answered "Don't know" (core/add-check.js). Steps with nothing to ask are
// skipped. The camera stays open for the whole stack (paused during the
// steps), and the next scan is ready as soon as a book is saved. The
// questions' own drawing is in ui/add-questions.js and ui/add-edition.js.

import { escapeHtml } from '../core/html.js';
import { isbn13, isBookBarcode, recordsFromForm, anotherCopy, volumesFromLines, nextVolumeLabel, withSetFacts } from '../core/entry.js';
import { editionsWithIsbn, suggestWorks, sameWikidataWorks } from '../core/matching.js';
import { emptyFound, suggestOriginalDates } from '../core/lookup.js';
import { mergeFound, withLibraryContents, withLibraryAuthors, isYearTooEarly, categoriesFromSubjects, startingBookLanguages, bookLanguageChoices, loebStyleTitle } from '../core/book-data.js';
import { tidyPeople, contributorsFromSteps, editionLanguages, possibleEditors } from '../core/people.js';
import { isBible } from '../core/bible.js';
import { keyBetween } from '../core/shelf-order.js';
import { parseDating, formatYearRange, workingDating, revisionProblem } from '../core/dating.js';
import { estimateSize } from '../core/sizes.js';
import { imageEntry } from '../core/records.js';
import { lookUpOpenLibrary, lookUpWork, searchWork, searchOpenLibrary, downloadOpenLibraryCover } from '../edges/lookup-openlibrary.js';
import { lookUpGoogleBooks } from '../edges/lookup-googlebooks.js';
import { lookUpHathiTrust } from '../edges/lookup-hathitrust.js';
import { lookUpWorks } from '../edges/lookup-wikidata.js';
import { photoButtonsHtml } from './photo-buttons.js';
import { wireTidyPaste } from './paste-contents.js';
import { parseContentsLines, typedNames } from '../core/contents.js';
import { normalizeForSearch } from '../core/search.js';
import { toggleHelp } from './field-help.js';
import { workDateQuestion, workDetailsQuestion, contentsQuestion, searchTitle, searchableTitle } from '../core/date-search.js';
import { dateRuleHtml, searchLinkHtml, refreshSearchLink, kindChipsHtml, datingKindOf, revisedHtml, useVersionChip } from './date-help.js';
import { mustMissing, checkRows, cardAnswered } from '../core/add-check.js';
import { cardsFromLines, contentsFromCards, workDetailsFromCards, fillUndatedCards, worksStepHtml, readCards, cardAction, redrawCard, showCount, showCardPreview } from './add-works.js';
import { checkStepHtml, nudgeHtml } from './add-check.js';
import { attr, fieldHtml, choiceHtml, isEnglish, languageStepHtml, subjectsStepHtml, translationStepHtml, workTranslatorsStepHtml, copyStepHtml, readQuestions, translatorsReadAs } from './add-questions.js';
import { editionStepHtml, readEditionStep, editionStepProblems } from './add-edition.js';
import { setFormHtml, readSetForm, setBannerHtml, finishSetHtml, volumeStepHtml, pasteStepHtml } from './add-set.js';
import { findKnownVolume, contentsLinesOf, volumeFromText } from '../core/known-sets.js';
import { loadKnownSets } from './known-sets.js';
import { readBindingText } from '../core/bindings.js';
import { setFromForm, editionsOfSet, linkEditionsToSet } from '../core/sets.js';
import { bindingChoicesHtml, toggleBindingChip, readBindingChoices } from './binding-choices.js';

const MIN_COVER_HEIGHT = 400; // a smaller online cover counts as not found (PLAN.md)
const NO_WORK = { workTitle: '', firstPublished: null, author: null };

const STEP_NAMES = {
  book: 'The book', volume: 'Volume', edition: 'Title page and copyright page', contents: 'Contents', work: 'Same work?', date: 'Original date', language: 'Original language', works: 'Each work', subjects: 'Category and tags',
  translation: 'Translation and editors', translators: 'Each translator', cover: 'Cover', spine: 'Spine', binding: 'Binding', where: 'Place', copy: 'This copy', check: 'Check before saving',
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
    <div id="step" hidden></div>`;
  const scanArea = container.querySelector('#scan');
  const stepArea = container.querySelector('#step');
  wireTidyPaste(stepArea);
  const find = container.querySelector('#find');
  showShelf();
  if (usb) find.focus();
  // Fetch what the other phone added or trashed, so the duplicate check below sees it.
  actions.catchUp();

  // Whenever a question or a form takes the place of the scan area, the camera
  // stops reading, so a book lying in view cannot start a new lookup under it.
  function hideScanArea() {
    scanArea.hidden = true;
    if (scanner) scanner.pause();
  }
  // The barcode last dealt with is not read again for a few seconds, so "Not
  // this time" with the book still in view does not look it up again at once.
  const SAME_BOOK_REST = 6000; // ms; long enough to move the book away
  let rested = { isbn: '', until: 0 };
  let lastIsbn = '';
  let hasLeft = false; // the screen was left; a camera still starting must be stopped when it arrives

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
    hideScanArea();
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
    lastIsbn = isbn;
    find.value = '';
    // An ISBN a whole known set shares (Great Books) names no one edition: the volumes held are shown in "Which volume?" instead.
    const sharedBySet = knownSets.some(set => set.isbns.includes(isbn));
    let duplicates = sharedBySet ? [] : editionsWithIsbn(isbn, state.library.entries);
    // The other phone may have trashed it since this one last synced: catch up before saying it is held.
    if (duplicates.length && navigator.onLine) {
      showMessage('Checking for changes from your other devices…');
      await actions.catchUp();
      duplicates = editionsWithIsbn(isbn, state.library.entries);
    }
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
    // Translators, editors and publishers the records list as authors are put in their place (core/people.js).
    const known = [...state.library.authorsById.values()].map(author => author.name);
    found = tidyPeople(found, { search: await workSearch, work: await work, known });
    // A library record naming more of the book's authors (Marx and Engels for the Reader) adds them.
    found = withLibraryAuthors(found, answers.map(answer => answer.found));
    const sources = answers.filter(answer => answer.found).map(answer => answer.name);
    // A year too early for a book with an ISBN was left out (core/book-data.js); with no other year, "Is this the book?" says why.
    const early = answers.map(answer => answer.found).find(answer => answer && isYearTooEarly(answer));
    const yearSetAside = found && !found.year && early ? early.year : '';
    startBook(found ? { ...found, sources, yearSetAside } : { isbn }, work, found ? '' : problems[0] || '');
  }

  function askAboutDuplicate(entry) {
    const where = entry.copies.map(copy => copy.location.join(' › ')).filter(Boolean)[0] || 'no place yet';
    // The volume and the day it was added, so the book meant is plain ("Selected Psalms I (Luther's Works, volume 12)").
    const added = entry.copies.map(copy => copy.added).filter(Boolean).sort()[0];
    const held = [searchTitle(entry.edition), where, added ? `added ${added}` : ''].filter(Boolean).join(' · ');
    hideScanArea();
    stepArea.hidden = false;
    stepArea.innerHTML = `<h2 class="step-title">You already have this edition</h2>
      <p class="step-hint">${escapeHtml(held)}</p>
      <div class="choices">${choiceHtml('copy', 'Add another copy', 'A second copy of the same edition')}${choiceHtml('back', 'Not this time', 'Back to scanning')}</div>`;
    stepArea.onclick = async event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'back') return finishBook();
      const location = (state.batchLocation || []).filter(Boolean);
      // The new copy starts with the binding of the copy already held.
      const held = entry.copies.find(copy => copy.binding || copy.material || copy.extras.length) || { binding: null, material: null, extras: [] };
      const copy = anotherCopy(entry.id, { binding: held.binding, material: held.material, extras: held.extras, location, shelfOrder: nextShelfOrder(location) }, context());
      if (await actions.saveRecords([copy], { soon: true })) finishBook(`Another copy of ${entry.edition.title}`);
    };
  }

  // ---------- the steps ----------

  function startBook(found, workLookup, problem = '') {
    const looked = { ...emptyFound(''), ...found };
    // A volume of the set being added takes the set's shared facts, and the
    // previous volume's language, category and tags are offered again.
    const full = setInfo ? withSetFacts(looked, setInfo, setInfo.nextVolume) : looked;
    const last = (setInfo && setInfo.last) || { language: '', category: '', tags: [] };
    const translators = full.contributors.filter(person => person.role === 'translator').map(person => person.name);
    // The record's one word ("Leather Bound") read into the three parts; a set's own choices win.
    const parts = readBindingText(full.binding);
    if (full.material) parts.material = full.material;
    if (full.extras && full.extras.length) parts.extras = full.extras;
    book = {
      found: full,
      problem, work: null, workId: null, dating: '', datingNote: '', dateUnknown: false,
      datingKind: '', // the kind of work chosen beside the date box, if any (ui/date-help.js)
      revised: '', version: '', // a revised work's final edition, and which text this book prints (format 7)
      variousTranslators: false, // "Various translators" chosen on the translation step
      allDate: '', // "All written about the same time?" above a collection's cards
      // What only a person knows, asked by the steps in ui/add-questions.js.
      language: full.originalLanguage || last.language, originalTitle: full.originalTitle || '', category: last.category, tags: [...last.tags],
      translator: translators.join('; '), hasTranslator: translators.length > 0,
      editors: full.contributors.filter(person => person.role === 'editor').map(person => person.name).join('; '),
      authorsAsEditors: [], // record authors the person ticked as the collection's editors (contents step)
      // The language of the pages in hand, asked of a translation; null until answered (shownBookLanguages).
      bookLanguages: null,
      workTranslators: null, // who translated each work of a collection, when it has several translators
      copy: { acquired: '', price: '', value: '', markings: false, notes: '' },
      photos: {}, cover: { state: 'none' }, ...parts, location: (state.batchLocation || []).filter(Boolean),
      // Contents a record lists are offered, never for a Bible (cited by chapter and verse).
      contentsOffered: full.contents.length > 1 && !isBible({ edition: {}, works: full.contents }),
      contents: null, // the accepted contents, one work per line
      severalChosen: false, // "Yes, and it holds several works", when no source listed them
      wikidata: new Map(), wikidataAsked: '', wikidataAnswered: '', wikidataProblem: { key: '', message: '' }, // what Wikidata says about the works, by title
      fixing: !found.source, // not found online: the details are asked for at once
      publisherRows: null, // the publisher and place boxes, once the copyright page step has been seen
      otherIsbnsText: '', editionProblems: [], // other ISBNs as typed; what to correct before leaving that step
      cards: null, // a collection's works, one card each (ui/add-works.js), once the contents step is left
      heightCm: '', // the height as typed on the spine step
      // Must fields (core/add-check.js): those answered "Don't know", the step whose Next found one empty,
      // and whether a step was opened from "Check before saving", so its Next goes back there.
      unknown: new Set(), nudged: '', returnTo: false,
    };
    // Leaving the screen now would lose the answers and photos, so main.js asks first.
    actions.setDraft(`"${full.title || 'The book being added'}" is not saved yet.`);
    // A volume of a known set takes its works from the list. One found by its own ISBN is used at once;
    // an ISBN the whole set shares (Great Books) asks which volume first. While adding a set, the volume step decides.
    // A later printing the list has no ISBN for is found by the set's name and the volume number in its title or subtitle.
    const known = findKnownVolume(knownSets, { isbn: full.isbn, set: full.set, volume: full.volume, title: full.title, subtitle: full.subtitle });
    book.knownSet = known ? known.set : null;
    book.knownVolume = null;
    if (known && known.volume && !setInfo) useKnownVolume(known.set, known.volume);
    // What the lookup says for a shared ISBN describes some other volume, or another printing: set aside, and the list's set facts used.
    else if (known && known.sharedIsbn && !setInfo) {
      const { title, subtitle, authors, contents, pages, subjects, contributors, year, publisher, place, editionStatement, series, seriesNumber, identifiers } = emptyFound('');
      Object.assign(book.found, { title, subtitle, authors, contents, pages, subjects, contributors, year, publisher, place, editionStatement, series, seriesNumber, identifiers, cover: null });
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
      // A subtitle that only named the volume ("Volume 12 - (Selected Psalms I)") is now said by the set and volume.
      subtitle: volumeFromText(found.subtitle) ? '' : found.subtitle,
      authors: [...new Set(volume.works.map(work => work.author).filter(Boolean))],
      contents: volume.works.map(work => ({ title: work.title, author: work.author })),
      publisher: found.publisher || set.publisher, place: found.place || set.place, year: found.year || set.year,
      editionStatement: found.editionStatement || set.editionStatement,
      sources: [...new Set([...(found.sources || []), `the list of ${set.set}`])],
    });
    book.contentsOffered = true;
    book.contents = null;
    // Each work's translator, when the list names one, is on its line, to be corrected like the rest.
    book.contentsText = set.checked ? contentsLinesOf(volume)
      : volume.works.map(work => [work.author, work.title, work.translator ? `trans. ${work.translator}` : ''].filter(Boolean).join(' — ')).join('\n');
    // Works first written in different languages (Lucretius and Epictetus) each start at the list's own, on their cards.
    const languages = [...new Set(volume.works.map(work => work.originalLanguage).filter(Boolean))];
    if (languages.length === 1) book.language = languages[0];
    book.cards = null;
    const translators = [...new Set(volume.works.map(work => work.translator).filter(Boolean))];
    if (translators.length) Object.assign(book, { translator: translators.join('; '), hasTranslator: true });
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
  // whether there is one; it is saved with the book. Google Books' covers cannot be
  // read by a web page, and none is kept for later: with no usable Open Library
  // cover, the cover step asks for a photo (docs/decisions/photos-and-scanning.md).
  function checkCover(current) {
    const cover = current.found.cover;
    if (!cover || cover.waiting) return;
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
      if (result.files) result.preview = URL.createObjectURL(result.files.thumb);
      current.cover = result;
      if (book.step === 'cover') drawStep();
    });
  }

  // The work's original language: a linked work's own, else the one given while adding.
  function originalLanguage() {
    const linked = book.works.find(work => work.id === book.workId);
    return linked ? linked.originalLanguage : book.language;
  }

  // A translation: a translator is named, or the work (for a collection, any of its works) was first written in another language.
  function isTranslated() {
    if (book.hasTranslator || book.variousTranslators) return true;
    if (book.contents !== null && book.cards) return book.cards.some(card => card.language && !isEnglish(card.language));
    const language = originalLanguage();
    return Boolean(language && !isEnglish(language));
  }

  // What the must-field rules need to know beyond the book itself (core/add-check.js).
  function about() {
    return { translated: isTranslated(), bookLanguages: isTranslated() ? shownBookLanguages() : '', single: book.contents === null, steps: steps() };
  }

  // The authors a card may start with or offer: the line's, else the book's (one is filled in, several are
  // offered as chips); a known set's line keeps its own, even none (the Didache).
  const bookAuthors = () => (book.knownVolume ? [] : book.found.authors);
  // A known set's own details for a work of the volume (its original language and title).
  const listedWork = title => (book.knownVolume ? book.knownVolume.works.find(work => normalizeForSearch(work.title) === normalizeForSearch(title)) || null : null);

  // The language answered once for a collection, given to every card whose own was not chosen.
  function fillCardLanguages() {
    for (const card of book.cards || []) if (!card.languageChosen) card.language = book.language || '';
  }

  // A Loeb title taken on "Is this the book?" follows the works as corrected ("Alecestic" made "Alcestis").
  function followLoebTitle(titles) {
    if (!book.loebTitle || !titles.length) return;
    book.found.title = loebStyleTitle({ ...book.found, title: '', contents: titles.map(title => ({ title })) }) || book.found.title;
  }

  // "This book is in", until the person answers: the original and English for a facing-page
  // series (a Loeb), else the record's languages, else English (core/book-data.js).
  function shownBookLanguages() {
    return book.bookLanguages ?? startingBookLanguages({ found: book.found.languages || [], series: book.found.series, original: originalLanguage() });
  }

  // The steps this book needs, in order; steps with nothing to ask are left out.
  function steps() {
    const linked = book.works.find(work => work.id === book.workId);
    // A collection's works each have their own date, asked for later ("needs original date").
    const single = book.contents === null;
    // A work already in the library keeps its own language, category and tags.
    const ownWork = single && !linked;
    // A volume of a known set that shares one ISBN is asked which volume first, so "Is this the book?" shows the right one.
    const askVolumeFirst = book.knownSet && !book.knownVolume && !setInfo && !book.volumeSkipped;
    return [
      askVolumeFirst ? 'volume' : null,
      'book',
      setInfo ? 'volume' : null,
      // Every book: what its title page and copyright page print, checked while it is in hand.
      'edition',
      book.contentsOffered || book.severalChosen ? 'contents' : null,
      single && book.works.length ? 'work' : null,
      single && !(linked && linked.datings.length) && prompts.has('datings') ? 'date' : null,
      // A collection is asked its language once, then each work on its own card; category and tags once for all.
      ownWork || !single ? 'language' : null,
      !single ? 'works' : null,
      ownWork || !single ? 'subjects' : null,
      // Translators and editors: for a translation, any collection, or a book a record names editors for.
      isTranslated() || !single || book.editors ? 'translation' : null,
      !single && typedNames(book.translator).length > 1 && parseContentsLines(book.contents).length > 1 ? 'translators' : null,
      'cover', 'spine',
      prompts.has('binding') ? 'binding' : null,
      'where', 'copy',
      // Every field with its value or "missing", before the book is saved.
      'check',
    ].filter(Boolean);
  }

  function goTo(step) {
    book.step = step;
    book.nudged = '';
    hideScanArea();
    stepArea.hidden = false;
    drawStep();
    stepArea.scrollIntoView({ block: 'start' });
  }

  // On to the next step. A must field left empty keeps the step open, marked, until it is
  // filled or answered "Don't know" (core/add-check.js). A step opened from the check goes back there.
  function next() {
    if (book.step === 'language' && book.contents !== null) fillCardLanguages();
    if (book.step !== 'check' && mustMissing(book, book.step, about()).length) {
      book.nudged = book.step;
      drawStep();
      stepArea.scrollIntoView({ block: 'start' });
      return;
    }
    if (book.returnTo && book.step !== 'check') { book.returnTo = false; goTo('check'); return; }
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
    const name = book.step === 'translation' && !isTranslated() ? 'Editors' : STEP_NAMES[book.step];
    const where = escapeHtml(`Step ${at} of ${list.length}: ${name}${book.found.title ? ` · ${book.found.title}` : ''}`);
    return `<p class="step-count">${where}</p><div class="progress"><span style="width:${Math.round(at / list.length * 100)}%"></span></div>`;
  }

  function backHtml(label = 'Back') {
    return `<div class="step-nav"><button type="button" class="btn" data-action="back">${escapeHtml(label)}</button></div>`;
  }

  function drawStep() {
    const draw = {
      book: bookStep, volume: () => (book.knownSet ? knownVolumeStep() : volumeStepHtml(book, setInfo)), edition: () => editionStepHtml(book), contents: contentsStep, work: workStep, date: dateStep,
      language: () => languageStepHtml(book), subjects: () => subjectsStepHtml(book, subjectChoices(), categoriesFromSubjects(book.found.subjects || [])),
      translation: () => translationStepHtml({ ...book, bookLanguages: shownBookLanguages() }, isTranslated(), bookLanguageChoices(originalLanguage())), translators: () => workTranslatorsStepHtml(book), cover: coverStep, spine: spineStep, binding: bindingStep, where: whereStep, copy: () => copyStepHtml(book),
      works: () => { askAboutCards(); return worksStepHtml(book, worksAbout()); }, check: () => checkStepHtml(checkRows(book, { ...about(), linkedDating: linkedDating() }), book.found.title),
    }[book.step];
    // A must field left empty on Next: named at the top, with "Don't know" (the cards mark their own).
    const missing = book.nudged === book.step && book.step !== 'works' ? mustMissing(book, book.step, about()) : [];
    stepArea.innerHTML = progressHtml() + nudgeHtml(missing, book.step, book.fixing) + draw();
    stepArea.oninput = event => {
      if (event.target.name === 'dating') showDatingPreview();
      if (event.target.name === 'translator') stepArea.querySelector('[data-translators]').textContent = translatorsReadAs(event.target.value);
      // Typing on a card: its date read back, and its tick and the count kept up to date.
      const card = event.target.closest('[data-card]');
      if (card) {
        if (event.target.name === 'cardDate') showCardPreview(event.target);
        readCards(book, stepArea);
        showCount(stepArea, book, Number(card.dataset.card));
        if (['cardTitle', 'cardAuthor'].includes(event.target.name)) wikidataAgainShown();
      }
    };
    stepArea.onchange = event => { if (event.target.dataset.photo) takePhoto(event.target.dataset.photo, event.target.files[0]); };
    stepArea.onclick = event => {
      if (event.target.dataset.help) { toggleHelp(stepArea, event.target); return; }
      // A card's search asks about its title and author as typed now; the link then opens as usual.
      const search = event.target.closest('[data-search-web^="card-"]');
      if (search) { refreshCardSearch(search); return; }
      const button = event.target.closest('[data-action]');
      if (button && button.dataset.action === 'binding-part') toggleBindingChip(button);
      else if (button && button.dataset.action === 'version-chip') useVersionChip(button);
      else if (button && button.dataset.action.startsWith('card-')) {
        readFields();
        const index = Number(button.closest('[data-card]').dataset.card);
        if (cardAction(book, button.dataset.action, button.dataset.value, index)) drawStep();
        else redrawCard(stepArea, book, index, worksAbout());
      } else if (button) answer(button.dataset.action, button.dataset.value);
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
      // A book no record lists the works of can say here that it holds several, so the contents step follows.
      const severalHtml = book.contentsOffered ? ''
        : `<label class="toggle"><input type="checkbox" name="several"${book.severalChosen ? ' checked' : ''}> This book holds several works (an anthology)</label>`;
      return `<h2 class="step-title">${escapeHtml(found.source ? 'Fix the details' : 'Not found online')}</h2>
        <p class="step-hint">${escapeHtml(found.source ? 'Correct anything that is wrong.' : `${book.problem || 'Neither Open Library nor Google Books knows this book.'} Type what is on the title page.`)}</p>
        <form class="form">${fieldHtml('Title', 'title', found.title, { missing: !found.title })}${fieldHtml('Subtitle', 'subtitle', found.subtitle)}
          ${fieldHtml('Authors (separate with ;)', 'authors', found.authors.join('; '), { missing: !found.authors.length })}
          ${fieldHtml('Editors (separate with ;)', 'editors', book.editors)}
          ${fieldHtml('Translators (separate with ;)', 'translator', book.translator)}
          ${severalHtml}
          <p class="step-hint">Publisher, year, ISBNs, series, set and pages come next, with the copyright page.</p>
          <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">Next</button></div></form>`;
    }
    // A year set aside as too early is always pointed out, since the record did give one. The author is
    // added under "Fix details"; the publisher and year on the next step, the copyright page.
    const noAuthor = prompts.has('authors') && !found.authors.length;
    const later = [prompts.has('publisher') && !found.publisher && 'publisher', (prompts.has('year') || found.yearSetAside) && !found.year && 'year'].filter(Boolean);
    const missing = [noAuthor && 'author', ...later].filter(Boolean);
    const missingText = [noAuthor ? 'Tap "Fix details" to add the author.' : '', later.length ? `The next step asks for the ${later.join(' and ')}.` : ''].filter(Boolean).join(' ');
    const earlyHtml = found.yearSetAside && !found.year ? escapeHtml(` The record's year, ${found.yearSetAside}, is older than ISBNs, so it is an earlier printing's.`) : '';
    // Loeb's own style of title, offered for a tap, since some Loebs are titled by one work.
    const loeb = loebStyleTitle(found);
    const loebHtml = loeb ? `<p class="step-hint">${escapeHtml(`Loeb's own style: ${loeb}`)} <button type="button" class="chip" data-action="loeb-title">Use this title</button></p>` : '';
    const coverHtml = found.cover && !found.cover.waiting ? `<img class="step-cover" src="${attr(found.cover.url)}" alt="" onerror="this.remove()">` : '';
    const detailsHtml = escapeHtml([found.authors.join(', '), found.editionStatement, [found.publisher, found.year].filter(Boolean).join(', '), found.pages && `${found.pages} pages`].filter(Boolean).join(' · '));
    const peopleHtml = escapeHtml(found.contributors.map(person => `${person.role} ${person.name}`).join(' · '));
    const foundOnHtml = escapeHtml(found.sources && found.sources.length ? `Found on ${found.sources.join(' and ')}.`
      : found.source ? 'Found on Open Library.' : 'Typed in by hand.');
    return `<h2 class="step-title">Is this the book?</h2><p class="step-hint">${foundOnHtml}</p>
      <div class="found">${coverHtml}<div><p class="found-title">${escapeHtml(found.title)}</p><p class="found-sub">${escapeHtml(found.subtitle)}</p>
        <p class="found-meta">${detailsHtml}</p><p class="found-meta">${peopleHtml}</p></div></div>
      ${loebHtml}${missing.length ? `<p class="step-hint is-missing">${escapeHtml(`Missing online: ${missing.join(', ')}. ${missingText}`)}${earlyHtml}</p>` : ''}
      <div class="choices">${choiceHtml('yes', 'Yes, this is it')}${book.contentsOffered ? '' : choiceHtml('several', 'Yes, and it holds several works', 'Collected works or an anthology: list them next')}${choiceHtml('fix', 'Fix details', noAuthor ? 'Add the author' : 'Correct the title, authors, editors or translators')}
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

  // Ask Wikidata about some works of this book (by any of their authors), once for each list of titles. The date
  // step is drawn again when it answers; on the cards a line offers to show the answer, so nothing typed is lost.
  function askWikidata(current, titles, author) {
    const lookups = state.settings.lookups || {};
    const key = wikidataKey(titles, author);
    // The same question is asked again only after it failed ("Try again").
    const failed = current.wikidataProblem.key === key;
    if (lookups.wikidata === false || !titles.length || (current.wikidataAsked === key && !failed)) return;
    current.wikidataAsked = key;
    current.wikidataProblem = { key: '', message: '' };
    const answered = text => {
      if (book !== current) return;
      if (book.step === 'date') drawStep();
      const note = book.step === 'works' && stepArea.querySelector('[data-wikidata-arrived]');
      if (note) { note.hidden = false; if (text) note.textContent = text; }
    };
    lookUpWorks(titles, author).then(found => {
      current.wikidataAnswered = key;
      for (const [title, work] of found) current.wikidata.set(title, work);
      // "Possibly the same as…": a work already held under the same Wikidata item is offered in "Same work?".
      const held = current.contents === null && sameWikidataWorks(found, state.library.worksById).get(current.found.title);
      if (held && !current.works.includes(held)) { current.works.push(held); current.sameItem = held.id; }
      answered('');
    }).catch(error => {
      current.wikidataProblem = { key, message: error.message };
      answered(error.message);
    });
  }
  const wikidataKey = (titles, author) => `${[].concat(author).join(', ')}|${titles.join('|')}`;

  // Wikidata is asked about the works by the title a search would use ("The Holy Family" for an extract
  // "(from The Holy Family)"), and by every author named, or the book's for a work naming none.
  function wikidataQuestion(pieces) {
    const names = pieces.flatMap(piece => (piece.author ? typedNames(piece.author) : book.found.authors)).map(name => name.trim()).filter(Boolean);
    return { titles: [...new Set(pieces.map(piece => searchableTitle(piece.title)))], authors: [...new Set(names)] };
  }
  const wikidataOf = title => book.wikidata.get(searchableTitle(title)) || null;

  // The dates of a list nobody has checked yet: offered on each card with one tap, like Wikidata's (PLAN.md, "Original dates").
  const listDateOf = title => (book.knownVolume ? (book.knownVolume.works.find(work => work.title === title) || {}).date || '' : '');

  // What the cards are drawn with (ui/add-works.js).
  function worksAbout() {
    const cards = book.cards || [];
    const missing = new Set(book.nudged === 'works' ? cards.map((card, i) => (cardAnswered(card) || card.unknown ? -1 : i)).filter(i => i >= 0) : []);
    return {
      wikidataOf, listDateOf, bookAuthors: bookAuthors(), missing, nudged: book.nudged === 'works', wikidataHtml: wikidataLineHtml(cards), sameHtml: book.knownVolume ? '' : sameWorksHtml(cards),
      found: { ...book.found, authors: bookAuthors() }, lifetime: authorLifetime(),
    };
  }

  // The one author's lifetime, when Open Library knows it, offered for every work of a collection
  // ("Plutarch's lifetime, 46–119"). Not for a book of several authors, whose works have different ones.
  function authorLifetime() {
    if (!book.work || bookAuthors().length !== 1) return null;
    const life = dateSuggestions().find(suggestion => suggestion.lifetimeOf);
    return life ? { name: life.lifetimeOf, text: life.text } : null;
  }

  // What Wikidata said about the cards' works, or that it is still being asked; and, once titles or
  // authors were corrected on the cards, a button to ask again with them.
  function wikidataLineHtml(cards) {
    if ((state.settings.lookups || {}).wikidata === false || book.knownVolume) return '';
    // Shown as soon as a title or author is changed on a card (wikidataAgainShown).
    const again = ` <button type="button" class="chip" data-action="wikidata-again"${wikidataChanged(cards) ? '' : ' hidden'}>Ask Wikidata again, with the titles and authors as corrected</button>`;
    const arrived = '<p class="step-hint" data-wikidata-arrived hidden>Wikidata has answered. <button type="button" class="chip" data-action="works-refresh">Show its suggestions</button></p>';
    const problem = book.wikidataProblem.key === book.wikidataAsked ? book.wikidataProblem.message : '';
    // After a failure the question can always be asked again, whether or not anything was corrected.
    if (problem) return `<p class="step-hint">${escapeHtml(problem)} <button type="button" class="chip" data-action="wikidata-again">Try again</button></p>`;
    if (book.wikidataAnswered !== book.wikidataAsked) return `<p class="step-hint">Asking Wikidata about these works…${again}</p>${arrived}`;
    const known = cards.filter(card => wikidataOf(card.title));
    const datable = cards.filter(card => !card.date && !card.dateUnknown && (wikidataOf(card.title) || {}).date && !wikidataOf(card.title).posthumous);
    const text = known.length ? `Wikidata knows ${known.length} of these works; its dates and original titles are shown on their cards.`
      : 'Wikidata knows none of these works. Use "Search the web" on each card.';
    const useHtml = datable.length ? ` <button type="button" class="chip" data-action="wikidata-dates">${escapeHtml(`Use Wikidata's dates (${datable.length})`)}</button>` : '';
    return `<p class="step-hint">${escapeHtml(text)}${useHtml}${again}</p>${arrived}`;
  }

  // The cards step asks by itself when it opens with titles or authors corrected since Wikidata was
  // asked (on the contents step, or before going back); while it is open, "Ask Wikidata again" does.
  function askAboutCards() {
    if (book.knownVolume || !book.cards || !book.cards.length || !wikidataChanged(book.cards)) return;
    const question = wikidataQuestion(book.cards);
    askWikidata(book, question.titles, question.authors);
  }

  // Whether the cards' titles or authors differ from what Wikidata was last asked.
  function wikidataChanged(cards) {
    const question = wikidataQuestion(cards);
    return wikidataKey(question.titles, question.authors) !== book.wikidataAsked;
  }
  function wikidataAgainShown() {
    const button = stepArea.querySelector('[data-action="wikidata-again"]');
    if (button) button.hidden = !wikidataChanged(book.cards);
  }

  // A card's search link, pointed at its title as typed now and the kind of work chosen.
  function refreshCardSearch(link) {
    readCards(book, stepArea);
    const card = book.cards[Number(link.closest('[data-card]').dataset.card)];
    if (!card) return;
    refreshSearchLink(link, workDetailsQuestion(card.title, { ...book.found, authors: bookAuthors() }, card.kind));
  }

  // The date of a work already held that a single book was joined to ("Same work?"), for the check.
  function linkedDating() {
    const linked = book.contents === null && book.works.find(work => work.id === book.workId);
    const dating = linked && workingDating(linked);
    return dating ? dating.text : '';
  }

  // "Possibly the same as…" in a collection: works Wikidata names with the same item as works already held.
  function sameWorksHtml(cards) {
    const same = sameWikidataWorks(book.wikidata, state.library.worksById);
    const matches = cards.filter(card => same.has(searchableTitle(card.title))).map(card => ({ title: card.title, work: same.get(searchableTitle(card.title)) }));
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
    // Back from the cards, the list shows them as corrected there.
    const lines = book.cards ? contentsFromCards(book.cards)
      : book.contents ?? book.contentsText ?? book.found.contents.map(entry => (entry.author ? `${entry.author} — ${entry.title}` : entry.title)).join('\n');
    const set = book.knownVolume && book.knownSet;
    // Wikidata is asked now, so its answer is there by the cards. A known set's list gives the dates itself
    // (filled in when checked, offered when not), so Wikidata is not asked.
    if (!set) { const question = wikidataQuestion(parseContentsLines(lines)); askWikidata(book, question.titles, question.authors); }
    const people = { translators: typedNames(book.translator), editors: typedNames(book.editors) };
    const searchHtml = `<p class="search-line">${searchLinkHtml(contentsQuestion(book.found, people), 'contents')}</p>`;
    if (set) {
      return `<h2 class="step-title">The works in this volume</h2>
        <p class="step-hint">${escapeHtml(`From the ${set.checked ? 'checked ' : ''}list of ${set.set}, volume ${book.knownVolume.label}. Correct any line your copy differs in; a line left as it is keeps the list's original title, language and translator. A translator can be added at the end of a line: "— trans. Edward Sittler". Each work's language and date come next, one card each.`)}</p>
        <form class="form"><label class="field">Contents<textarea name="contents" rows="8" data-tidy-paste>${escapeHtml(lines)}</textarea></label>${searchHtml}
          <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">Next</button></div></form>`;
    }
    const hint = book.contentsOffered
      ? 'The record online lists these contents. If the book holds several works (an anthology), correct the list: one work per line, with its author first if you like ("Plato — Phaedo"). Take out part headings. Each work\'s author, language and date come next, one card each.'
      : 'No record online lists them. Type or paste the works, one per line, with the author first if you like and the work\'s own translator ("Plato — Phaedo — trans. Benjamin Jowett"). Each work\'s author, language and date come next, one card each.';
    // The phone itself can read the printed page: copy its text and paste it, a page at a time (docs/decisions/screens.md).
    const copyHint = book.contentsOffered ? '' : `<p class="step-hint">${escapeHtml('To copy the printed contents: on an iPhone, point the camera at the page (or open a photo of it), tap the text button, then "Copy All". On Android, use Google Lens, then "Copy text". Paste here once per page; page numbers and dotted lines are taken out.')}</p>`;
    // With no contents known, photos of the contents pages are kept with the book, to be typed in
    // later beside them (the Library's filter "Needs details"; PLAN.md, "Contents no source knows").
    const pages = book.photos.contents || [];
    const pagesHtml = pages.length ? `<p class="step-hint">${pages.map(page => `<img class="step-cover" src="${attr(page.preview)}" alt="A contents page">`).join(' ')} ${escapeHtml(`${pages.length === 1 ? 'This photo is' : `These ${pages.length} photos are`} kept with the book. Type the works now, or later in Edit book (the Library's filter "Needs details" lists it), and leave the box empty to save the book for now.`)}</p>` : '';
    const photoHtml = book.contentsOffered ? ''
      : pagesHtml + photoButtonsHtml('contents', pages.length ? 'Photograph the next page' : 'Photograph the contents page', 'Kept with the book, so the works can be typed in later');
    return `<h2 class="step-title">${escapeHtml(book.contentsOffered ? 'Is this a collection of works?' : 'Which works does it hold?')}</h2>
      <p class="step-hint">${escapeHtml(hint)}</p>${copyHint}
      <form class="form"><label class="field">Contents<textarea name="contents" rows="8" data-tidy-paste>${escapeHtml(lines)}</textarea></label>${searchHtml}${editedByHtml(lines)}
        <div class="choices">${photoHtml}${choiceHtml('single', 'No, it is one work', 'These are chapters or parts of one work')}</div>
        <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button class="btn btn-primary btn-big" type="submit">Yes, these works</button></div></form>`;
  }

  // Records often name a collection's editor as its author, with nothing to show it (Holmes's
  // Apostolic Fathers, Richardson's Early Christian Fathers), so the person says which it is
  // before the cards give every work the book's author (docs/decisions/book-data.md).
  function editedByHtml(lines) {
    const names = [...possibleEditors(book.found.authors, parseContentsLines(lines)), ...book.authorsAsEditors];
    if (!names.length) return '';
    const ticksHtml = names.map(name => `<label class="check"><input type="checkbox" name="authorEdited" value="${attr(name)}"${book.authorsAsEditors.includes(name) ? ' checked' : ''}> ${escapeHtml(`${name} edited this collection; the works are by others`)}</label>`).join('');
    return `<p class="step-hint">${escapeHtml(`The record names ${names.join(' and ')} as the author. In a collection that is often the editor.`)}</p>${ticksHtml}`;
  }

  // The ticked record authors move to "Edited by"; an unticked one goes back among the authors.
  function moveAuthorsToEditors(ticked) {
    const names = [...new Set([...book.found.authors, ...book.authorsAsEditors])];
    const typed = typedNames(book.editors).filter(name => !names.includes(name));
    book.authorsAsEditors = names.filter(name => ticked.includes(name));
    book.found.authors = names.filter(name => !ticked.includes(name));
    book.editors = [...book.authorsAsEditors, ...typed].join('; ');
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

  // Open Library's suggestions, checked against the book's own authors and whether it is translated.
  function dateSuggestions() {
    return suggestOriginalDates(book.work, book.found.year, { authors: book.found.authors, translated: typedNames(book.translator).length > 0 });
  }

  // Wikidata's date for this one work, offered first when it knows one; not when it was first printed
  // after the author died, since the working date is then when it was written (core/wikidata.js).
  function wikidataSuggestion() {
    const work = book.wikidata.get(book.found.title);
    return work && work.date && !work.posthumous ? [{ text: work.date, label: 'written or first published (Wikidata)' }] : [];
  }

  // 3. When was it written?
  function dateStep() {
    const year = book.found.year ? `the ${book.found.year} printing` : 'this printing';
    const suggestions = [...wikidataSuggestion(), ...(book.work ? dateSuggestions() : [])];
    const suggestionsHtml = suggestions.map(hint => choiceHtml('date', hint.text, hint.label, hint.text)).join('');
    const waitingHtml = book.work ? '' : '<p class="step-hint">Looking for the first publication…</p>';
    // Wikidata refused or did not answer: say so, rather than leave its suggestion quietly missing.
    const problem = book.wikidataProblem.key && book.wikidataProblem.key === book.wikidataAsked ? book.wikidataProblem.message : '';
    const known = book.wikidata.get(book.found.title);
    const posthumousHtml = known && known.date && known.posthumous
      ? `<p class="step-hint">${escapeHtml(`Wikidata: first printed ${known.date}, after the author died. The working date is when it was written.`)}</p>` : '';
    const problemHtml = (problem ? `<p class="step-hint">${escapeHtml(problem)} <button type="button" class="chip" data-action="wikidata-retry">Try again</button></p>` : '') + posthumousHtml;
    return `<h2 class="step-title">When was this work written?</h2>
      <p class="step-hint">${escapeHtml(`When the work itself was first written or published, not ${year}. Tap a suggestion or type a date.`)}</p>
      ${dateRuleHtml()}
      <div class="choices">${suggestionsHtml}</div>${waitingHtml}${problemHtml}
      <form class="form"><label class="field">Or type a date<input name="dating" value="${attr(book.dating)}" placeholder="c. 397, 1530–59, early 2nd c." autocomplete="off"></label>
        <p class="preview" data-preview></p>
        ${kindChipsHtml(book.datingKind)}
        ${revisedHtml({ first: book.dating, revised: book.revised, version: book.version })}
        <p class="search-line">${searchLinkHtml(workDateQuestion(searchTitle(book.found), book.found.authors, book.datingKind))}</p>
        <div class="step-nav"><button type="button" class="btn" data-action="back">Back</button><button type="button" class="btn" data-action="unknown">Don't know</button>
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
    const photoButtonHtml = label => photoButtonsHtml('cover', label);
    if (book.photos.cover) {
      return `<h2 class="step-title">Your cover photo</h2><div class="found"><img class="step-cover" src="${attr(book.photos.cover.preview)}" alt=""></div>
        <div class="choices">${choiceHtml('next', 'Use this photo')}${photoButtonHtml('Take it again')}</div>${backHtml()}`;
    }
    if (cover.state === 'checking') return `<h2 class="step-title">Cover</h2><p class="step-hint">Looking for the cover online…</p><div class="choices">${photoButtonHtml('Take a photo instead')}</div>${backHtml()}`;
    if (cover.state === 'found') {
      return `<h2 class="step-title">Use this cover?</h2><p class="step-hint">Found on Open Library. Check it matches the book in your hand.</p><div class="found"><img class="step-cover is-large" src="${attr(cover.preview)}" alt=""></div>
        <div class="choices">${choiceHtml('next', 'Yes, use it')}${photoButtonHtml('No, take my own photo')}</div>${backHtml()}`;
    }
    return `<h2 class="step-title">No cover found online</h2>
      <p class="step-hint">${escapeHtml(cover.tooSmall ? 'The one online is too small to look sharp.' : 'Take a photo of the front, so the book has its own cover.')}</p>
      <div class="choices">${photoButtonHtml('Take a photo of the cover')}${choiceHtml('next', 'Skip', 'A plain drawn cover is shown instead')}</div>${backHtml()}`;
  }

  // 5. The spine, and the height: wanted, not required (a record's height is only a library's measure).
  function spineStep() {
    const doneHtml = book.photos.spine ? `<div class="found"><img class="step-spine" src="${attr(book.photos.spine.preview)}" alt=""></div>` : '';
    const measured = book.photos.spine && book.photos.spine.height ? String(book.photos.spine.height / 10) : '';
    const recordHint = book.found.height ? `A library record gives ${Math.round(book.found.height / 10)} cm.` : '';
    return `<h2 class="step-title">${escapeHtml(book.photos.spine ? 'Your spine photo' : 'Add a spine photo?')}</h2>
      <p class="step-hint">A spine photo shows on the book page and in the shelf view, so the book is easy to spot on the shelf.</p>${doneHtml}
      <div class="form">${fieldHtml('Height in cm (measure later is fine)', 'heightCm', book.heightCm || measured, { type: 'number', hint: recordHint })}</div>
      <div class="choices">${photoButtonsHtml('spine', book.photos.spine ? 'Take it again' : 'Take a photo of the spine')}
        ${choiceHtml('next', book.photos.spine ? 'Use this photo' : 'Skip the photo')}</div>${backHtml()}`;
  }

  // 6. The binding: one binding, a material if it matters, and any extras.
  function bindingStep() {
    const named = book.found.binding ? ` The record online says ${book.found.binding}.` : '';
    return `<h2 class="step-title">What binding is this copy?</h2><p class="step-hint">${escapeHtml(`Tap what fits; any row can stay empty.${named}`)}</p>
      <form class="form">${bindingChoicesHtml(book, state.settings)}
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
      for (const name of ['title', 'subtitle']) found[name] = (value(name) || '').trim();
      const several = stepArea.querySelector('[name="several"]');
      if (several) book.severalChosen = several.checked;
      found.authors = (value('authors') || '').split(';').map(name => name.trim()).filter(Boolean);
      book.editors = (value('editors') || '').trim();
      book.translator = (value('translator') || '').trim();
      if (typedNames(book.translator).length) book.hasTranslator = true;
      book.works = suggestWorks(found.title, found.authors, state.library);
    }
    if (book.step === 'edition') {
      readEditionStep(book, stepArea);
      // A set and volume a known list holds ("Luther's Works", 14) take their works from the list, as when chosen.
      const known = found.set && found.volume ? findKnownVolume(knownSets, { set: found.set, volume: found.volume }) : null;
      if (known && known.volume && known.volume !== book.knownVolume) {
        book.severalChosen = false;
        useKnownVolume(known.set, known.volume);
        book.publisherRows = null; // drawn again from the list's publisher and place, if they were empty
      }
    }
    if (book.step === 'volume' && (value('volume') || '').trim()) found.volume = value('volume').trim();
    if (book.step === 'contents' && value('contents') !== undefined) book.contentsText = value('contents');
    const ticks = [...stepArea.querySelectorAll('[name="authorEdited"]')];
    if (book.step === 'contents' && ticks.length) moveAuthorsToEditors(ticks.filter(tick => tick.checked).map(tick => tick.value));
    if (book.step === 'date') {
      book.dating = (value('dating') || '').trim();
      book.revised = (value('revised') || '').trim();
      book.version = (value('version') || '').trim();
    }
    if (book.step === 'spine') book.heightCm = (value('heightCm') || '').trim();
    if (book.step === 'works') {
      book.allDate = (value('allDate') || '').trim();
      readCards(book, stepArea);
      // The lines saved and read by the later steps (each translator) follow the cards as corrected.
      book.contents = contentsFromCards(book.cards);
    }
    if (book.step === 'binding') Object.assign(book, readBindingChoices(stepArea));
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
      // An ISBN or year that cannot be read keeps the copyright page step open, its problem shown.
      if (book.step === 'edition') {
        book.editionProblems = editionStepProblems(book);
        if (book.editionProblems.length) return drawStep();
      }
      if (book.step === 'date' && book.dating && !parseDating(book.dating).ok) return drawStep();
      // A final edition that cannot be read, or has no first date, keeps the step open with its problem shown.
      if (book.step === 'date' && revisionProblem(book.dating, book.revised)) return drawStep();
      if (book.step === 'works' && book.cards.some(card => revisionProblem(card.date, card.revised))) return drawStep();
      if (book.step === 'contents') {
        book.contents = book.contentsText.trim() || null;
        // Each work gets its card, keeping what was already answered on it.
        book.cards = book.contents ? cardsFromLines(book.contents, book.cards, { authors: bookAuthors(), listed: listedWork }) : null;
        if (book.cards && book.language) fillCardLanguages();
        if (book.cards) followLoebTitle(book.cards.map(card => card.title));
      }
      if (book.step === 'works') followLoebTitle(book.cards.map(card => card.title));
      book.fixing = false;
      return next();
    }
    if (action === 'volume') { chooseVolume(value); return next(); }
    if (action === 'volume-other') {
      // Without the list: the person types the volume's details, as for a book not found online.
      Object.assign(book, { volumeSkipped: true, knownVolume: null, fixing: !setInfo });
      return next();
    }
    if (action === 'single') { book.contents = null; book.cards = null; return next(); }
    // "Don't know" for the must fields a step's Next found empty (core/add-check.js).
    if (action === 'dont-know') {
      for (const field of mustMissing(book, book.step, about())) book.unknown.add(field.name);
      return next();
    }
    // The cards: every work still unanswered (and without a date that cannot be read) is "Don't know".
    if (action === 'cards-unknown') {
      for (const card of book.cards) if (!cardAnswered(card) && !card.date) card.unknown = true;
      return next();
    }
    // Each card without a date gets Wikidata's, as if typed; never one printed after the author died.
    if (action === 'wikidata-dates') {
      for (const card of book.cards) {
        const known = wikidataOf(card.title);
        if (!card.date && !card.dateUnknown && known && known.date && !known.posthumous) card.date = known.date;
      }
      return drawStep();
    }
    // "All written about the same time?": the date typed, or the author's lifetime, for every work without one.
    if (action === 'cards-all-date' || action === 'cards-lifetime') {
      const date = action === 'cards-lifetime' ? value : book.allDate;
      if (date && parseDating(date).ok) fillUndatedCards(book.cards, date);
      return drawStep();
    }
    // A kind of work beside the date box: its rule shown, the search narrowed, the kind saved; a second tap takes it back.
    if (action === 'date-kind') { book.datingKind = book.datingKind === value ? '' : value; return drawStep(); }
    if (action === 'wikidata-again') {
      const question = wikidataQuestion(book.cards);
      askWikidata(book, question.titles, question.authors);
      return drawStep();
    }
    if (action === 'wikidata-retry') {
      // The date step's "Try again": the single work, asked as when the book was found.
      if (book.found.title && book.found.authors[0]) askWikidata(book, [book.found.title], book.found.authors[0]);
      return drawStep();
    }
    if (action === 'works-refresh') return drawStep();
    // From "Check before saving": the step that asks a field, whose Next then comes back.
    if (action === 'jump') { book.returnTo = true; return goTo(value); }
    if (action === 'join-same') {
      book.sameWorks = Object.fromEntries((book.sameMatches || []).map(match => [normalizeForSearch(match.title), match.work.id]));
      return drawStep();
    }
    if (action === 'work') { book.workId = value || null; return next(); }
    if (action === 'date') {
      // book.work is still empty while Open Library has not answered.
      const hint = [...wikidataSuggestion(), ...(book.work ? dateSuggestions() : [])].find(item => item.text === value);
      book.dating = value;
      book.datingNote = hint ? `suggested: ${hint.label}` : '';
      return next();
    }
    if (action === 'unknown') { Object.assign(book, { dating: '', dateUnknown: true, revised: '', version: '' }); book.unknown.add('dating'); return next(); }
    if (action === 'add-publisher') { book.publisherRows = [...book.publisherRows, { publisher: '', place: '' }]; return drawStep(); }
    if (action === 'same-printing') { book.found.firstPrinted = book.found.year; return drawStep(); }
    if (action === 'add-isbn') { book.otherIsbnsText = [book.otherIsbnsText, value].filter(Boolean).join('; '); return drawStep(); }
    if (action === 'original-title') { book.originalTitle = book.work.workTitle; return drawStep(); }
    if (action === 'loeb-title') { Object.assign(book.found, { title: loebStyleTitle(book.found), subtitle: '' }); book.loebTitle = true; return drawStep(); }
    if (action === 'book-languages') { book.bookLanguages = value; return drawStep(); }
    // "Various translators": no one is named for the whole book; it answers the translator, whose box is emptied.
    if (action === 'various-translators') {
      book.variousTranslators = !book.variousTranslators;
      if (book.variousTranslators) book.translator = '';
      return drawStep();
    }
    // English needs no original title, so tapping it goes straight on.
    if (action === 'language') { book.language = value; return isEnglish(value) ? next() : drawStep(); }
    if (action === 'category') { book.category = book.category === value ? '' : value; return drawStep(); }
    if (action === 'tag') { book.tags = book.tags.includes(value) ? book.tags.filter(tag => tag !== value) : [...book.tags, value]; return drawStep(); }
    if (action === 'place') {
      book.location = value ? value.split(' › ') : [];
      return next();
    }
  }

  async function takePhoto(kind, file) {
    if (!file) return;
    try {
      await readPhoto(kind, file);
    } catch (error) {
      actions.showNote(`That picture could not be used (${error.message}). Try taking it again, or choose another.`);
    }
  }

  async function readPhoto(kind, file) {
    // A contents page needs no lining up: it is kept as taken, large enough to read.
    if (kind === 'contents') {
      const box = stepArea.querySelector('[name="contents"]');
      if (box) book.contentsText = box.value;
      const { readPicture, imageFiles } = await import('../edges/photo.js');
      const files = await imageFiles(await readPicture(file), { master: true, kind });
      // A contents list often runs over several pages: each photo is kept.
      book.photos.contents = [...(book.photos.contents || []), { ...files, preview: URL.createObjectURL(files.thumb) }];
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

  // The set's own record for a volume, when the set has one (the set being added, or one with the same title).
  function setRecordFor(title) {
    if (setInfo && setInfo.setRecord) return setInfo.setRecord;
    const wanted = normalizeForSearch(title || '');
    const set = wanted && [...state.library.setsById.values()].find(record => normalizeForSearch(record.title) === wanted);
    return set ? set.id : null;
  }

  // A new work Wikidata knows gets its ID, its other titles and (if none was given) its original title,
  // and a date taken from Wikidata says so in its note (DATA_FORMAT.md, "Datings").
  function withWikidata(record) {
    const known = record.type === 'work' && !state.library.worksById.has(record.id) && wikidataOf(record.title);
    if (!known) return record;
    const datings = record.datings.map(dating => (dating.text === known.date && !dating.note ? { ...dating, note: 'from Wikidata' } : dating));
    return { ...record, wikidata: known.wikidata, otherTitles: known.otherTitles, originalTitle: record.originalTitle || known.originalTitle || null, datings };
  }

  async function saveBook() {
    const { found, copy } = book;
    // A collection is saved from its cards: each a contents line, with its own language and original title.
    const collection = book.contents !== null && book.cards;
    const languages = editionLanguages({
      typed: isTranslated() ? shownBookLanguages() : '', found: found.languages,
      original: originalLanguage(), isTranslated: isTranslated(),
    });
    const form = {
      title: found.title, subtitle: found.subtitle, authors: found.authors, contributors: contributorsFromSteps(found.contributors, book.translator, book.editors),
      variousTranslators: book.variousTranslators,
      publisher: found.publisher, place: found.place, year: found.year, firstPrinted: found.firstPrinted || '', editionStatement: found.editionStatement,
      series: found.series || '', seriesNumber: found.seriesNumber || '', set: found.set || '', volume: found.volume || '',
      isbn: found.isbn, otherIsbns: book.otherIsbnsText, pages: found.pages, languages, medium: 'physical', logosId: '',
      contents: collection ? contentsFromCards(book.cards) : book.contents, workId: book.contents === null ? book.workId : null,
      version: book.contents === null ? book.version : undefined,
      knownWorks: book.knownVolume && book.contents !== null ? { set: book.knownSet.set, works: book.knownVolume.works } : null,
      sameWorks: book.contents !== null ? book.sameWorks || null : null,
      workDetails: collection ? workDetailsFromCards(book.cards) : null,
      workTranslators: steps().includes('translators') ? book.workTranslators : null,
      setRecord: setRecordFor(found.set),
      work: {
        title: '', originalTitle: isEnglish(book.language) || book.contents !== null ? '' : book.originalTitle, originalLanguage: book.language, category: book.category, tags: book.tags,
        datings: [{ text: book.dating, note: book.datingNote, kind: datingKindOf(book.datingKind) || null, working: true }],
        revised: book.revised,
      },
      copy: {
        binding: book.binding, material: book.material, extras: book.extras, location: book.location,
        acquired: copy.acquired, price: number(copy.price), value: number(copy.value), status: 'owned', markings: copy.markings, notes: copy.notes,
      },
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

  const NEW_SET = {
    title: '', shortTitle: '', volumes: '', publisher: '', year: '', editionStatement: '', editors: [], binding: null, material: null, extras: [],
    setRecord: null, nextVolume: '', last: null, isMissingTitle: false,
  };

  // The set's shared facts, given once; then its volumes are scanned, typed or pasted.
  function showSetForm(set = NEW_SET) {
    hideScanArea();
    stepArea.hidden = false;
    stepArea.oninput = null;
    stepArea.onchange = null;
    stepArea.innerHTML = setFormHtml(set, state.settings);
    stepArea.onclick = event => {
      if (event.target.dataset.help) { toggleHelp(stepArea, event.target); return; }
      const chip = event.target.closest('[data-action="binding-part"]');
      if (chip) toggleBindingChip(chip);
      if (event.target.closest('[data-action="back"]')) finishBook();
    };
    stepArea.onsubmit = async event => {
      event.preventDefault();
      const typed = { ...readSetForm(stepArea, set), ...readBindingChoices(stepArea) };
      if (!typed.title) { showSetForm({ ...typed, isMissingTitle: true }); return; }
      const setRecord = await saveSetRecord(typed);
      if (!setRecord) return;
      keepSet({ ...typed, title: setRecord.title, setRecord: setRecord.id, isMissingTitle: false });
      finishBook();
    };
    stepArea.querySelector('input').focus();
  }

  // The set's own record: the one already kept under this title, with what
  // was typed now added, or a new one. Volumes already in the library under
  // the same set title are linked to it as well.
  async function saveSetRecord(typed) {
    const wanted = normalizeForSearch(typed.title);
    const existing = [...state.library.setsById.values()].find(record => normalizeForSearch(record.title) === wanted) || null;
    const amount = value => (value === null ? '' : String(value));
    const form = existing ? {
      title: existing.title, shortTitle: typed.shortTitle || existing.shortTitle, editors: (typed.editors.length ? typed.editors : existing.editors).join('; '),
      volumes: typed.volumes || amount(existing.volumes), price: amount(existing.price), value: amount(existing.value), valueAsSet: existing.valueAsSet, notes: existing.notes,
    } : { title: typed.title, shortTitle: typed.shortTitle, editors: typed.editors.join('; '), volumes: typed.volumes };
    const { record, problems } = setFromForm(form, existing, { newId: actions.newId, now: actions.now(), today: actions.today() });
    if (problems.length) { actions.showNote(problems.join(' ')); return null; }
    const linked = linkEditionsToSet(editionsOfSet(state.library.editionsById.values(), record), record, actions.now());
    const changed = [...(record !== existing ? [record] : []), ...linked];
    if (changed.length && !(await actions.saveRecords(changed))) return null;
    return record;
  }

  // "Finish the set": what the whole set cost and is worth, then back to scanning.
  function showFinishSet() {
    const record = setInfo.setRecord && state.records.get(setInfo.setRecord);
    if (!record) { keepSet(null); showShelf(); return; }
    hideScanArea();
    stepArea.hidden = false;
    stepArea.oninput = null;
    stepArea.onchange = null;
    stepArea.innerHTML = finishSetHtml(record);
    stepArea.onclick = event => {
      if (event.target.dataset.help) { toggleHelp(stepArea, event.target); return; }
      if (event.target.closest('[data-action="back"]')) finishBook();
    };
    stepArea.onsubmit = async event => {
      event.preventDefault();
      const value = name => stepArea.querySelector(`[name="${name}"]`);
      const form = {
        title: record.title, shortTitle: record.shortTitle, editors: record.editors.join('; '), volumes: record.volumes === null ? '' : String(record.volumes),
        price: number(value('price').value), value: number(value('value').value), valueAsSet: value('valueAsSet').checked, notes: record.notes,
      };
      const result = setFromForm(form, record, { newId: actions.newId, now: actions.now(), today: actions.today() });
      if (result.problems.length) { actions.showNote(result.problems.join(' ')); return; }
      if (result.record !== record && !(await actions.saveRecords([result.record]))) return;
      keepSet(null);
      finishBook();
    };
  }

  function showPasteVolumes() {
    hideScanArea();
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
        publisher: setInfo.publisher, place: '', year: setInfo.year, editionStatement: setInfo.editionStatement,
        series: '', seriesNumber: '', set: setInfo.title, volume, setRecord: setInfo.setRecord, isbn: '', pages: '', languages: [], medium: 'physical', logosId: '', contents: null, workId: null,
        work: { title: '', originalTitle: '', originalLanguage: '', category: '', tags: [], datings: [] },
        copy: { binding: setInfo.binding, material: setInfo.material, extras: setInfo.extras, location, acquired: '', price: '', value: '', status: 'owned', markings: false, notes: '' },
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

  // The new edition's images (our photos, or the checked online cover), and what the records online gave that the steps do not ask: sizes, catalogue numbers, subjects.
  function withImages(edition) {
    const images = [];
    book.imageFiles = [];
    const add = (kind, source, files, master) => {
      const id = actions.newId();
      images.push(imageEntry(id, kind, source, files, master));
      book.imageFiles.push([id, files]);
    };
    if (book.photos.cover) add('cover', 'photo', book.photos.cover, true);
    else if (book.cover.state === 'found') add('cover', book.cover.source, book.cover.files, false);
    if (book.photos.spine) add('spine', 'photo', book.photos.spine, true);
    for (const page of book.photos.contents || []) add('contents', 'photo', page, true);
    // Sizes from a record are stored as "catalog"; a height typed on the spine photo is "measured" and wins.
    const { height, thickness } = book.found;
    // The spine step's box starts with the photo's height, so what it holds at the end is the person's measure.
    const typedCm = Number(String(book.heightCm || '').replace(',', '.'));
    const measured = typedCm > 0 ? Math.round(typedCm * 10) : book.photos.spine && book.photos.spine.height;
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
    actions.setDraft('');
    rested = { isbn: lastIsbn, until: Date.now() + SAME_BOOK_REST };
    stepArea.hidden = true;
    stepArea.innerHTML = '';
    scanArea.hidden = false;
    showShelf();
    if (title) {
      added.unshift(title);
      const addedHtml = added.slice(0, 8).map(name => `<p class="added-title">${escapeHtml(name)}</p>`).join('');
      container.querySelector('#added').innerHTML = `<section class="block"><h2 class="block-title">Added this time</h2>${addedHtml}</section>`;
      // The title typed to find this book is done with; the next book is scanned, not this one typed again.
      find.value = '';
    }
    if (scanner) scanner.resume();
    // Only a USB scanner types into the box; on a phone, focusing it would open the keyboard.
    if (usb) find.focus();
    else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
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
    else if (action === 'finish-set') showFinishSet();
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
      const onIsbn = isbn => {
        if (scanArea.hidden || (isbn === rested.isbn && Date.now() < rested.until)) return;
        showRead(box, isbn);
        setTimeout(() => { if (!scanArea.hidden) lookUpIsbn(isbn); }, 500);
      };
      const started = await startScanner(box.querySelector('video'), onIsbn, { sound: state.device.scanSound !== false });
      if (hasLeft) { started.stop(); return; }
      scanner = started;
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
  return () => {
    hasLeft = true;
    if (scanner) scanner.stop();
  };
}

// A green flash and check mark over the camera when a barcode is read.
function showRead(box, isbn) {
  box.querySelector('.camera-read').textContent = `✓ Read ${isbn}`;
  box.classList.add('is-read');
  setTimeout(() => box.classList.remove('is-read'), 1200);
}
