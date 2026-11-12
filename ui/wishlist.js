// The Wishlist tab (PLAN.md, "Wishlist"): books we want, each with a cover
// and one free note. A new item starts from a find box (a title, an ISBN, or
// an Amazon link, whose ISBN is read from the address); the details and cover
// come from Open Library, then Google Books. "I bought it" opens the normal
// entry form filled from the item, and the item then leaves the wishlist.
// Above the list, "set gaps": for each known set we hold a volume of, the
// volumes we lack, with one tap to put them on the wishlist (PLAN.md,
// "Library and Wishlist views"), for a used bookstore.

import { escapeHtml } from '../core/html.js';
import { normalizeForSearch } from '../core/search.js';
import { wishFromForm, isbnInText } from '../core/entry.js';
import { combineFound } from '../core/lookup.js';
import { trashRecord } from '../core/trash.js';
import { searchOpenLibrary, lookUpOpenLibrary, downloadOpenLibraryCover, openLibraryCoverUrlById } from '../edges/lookup-openlibrary.js';
import { lookUpGoogleBooks } from '../edges/lookup-googlebooks.js';
import { fillImages } from './images.js';
import { setGaps, wishesForGaps } from '../core/known-sets.js';
import { loadKnownSets } from './known-sets.js';

const SORTS = [['added', 'Newest'], ['title', 'Title'], ['author', 'Author']];
const sortKey = {
  added: item => item.created,
  title: item => normalizeForSearch(item.title.replace(/^(the|a|an) /i, '')),
  author: item => normalizeForSearch(item.authors[0] ? item.authors[0].split(' ').pop() : '~'),
};
const SEARCH_DELAY = 450; // milliseconds after the last key before searching as you type

function sortedItems(items, sort) {
  const key = sortKey[sort] || sortKey.added;
  const keyed = items.map(item => ({ item, key: key(item) }));
  keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) * (sort === 'added' ? -1 : 1));
  return keyed.map(({ item }) => item);
}

// The cover's picture: a saved one by its key, or the preview of one just found.
function coverPictureHtml(item, preview) {
  const cover = item && item.images.find(image => image.kind === 'cover' && !image.waiting);
  if (preview) return `<img class="wish-cover" src="${escapeHtml(preview)}" alt="">`;
  return cover ? `<img class="wish-cover" data-image="${escapeHtml(cover.id)}/thumb" alt="">` : '';
}

function formHtml(item, draft) {
  const values = draft ? draft.values : item ? {
    title: item.title, subtitle: item.subtitle, authors: item.authors.join('; '), publisher: item.publisher, isbn: item.isbn, notes: item.notes,
    translator: (item.contributors.find(person => person.role === 'translator') || {}).name,
  } : {};
  const value = name => escapeHtml(values[name] ?? '');
  const coverHtml = coverPictureHtml(item, draft && draft.cover && draft.cover.preview);
  return `<form class="form block" data-wish-form="${escapeHtml(item ? item.id : '')}" novalidate>
      <p class="problems" hidden></p>
      ${coverHtml ? `<div class="found">${coverHtml}</div>` : ''}
      <label class="field">Title<input name="title" value="${value('title')}" autocomplete="off"></label>
      <label class="field">Subtitle<input name="subtitle" value="${value('subtitle')}" autocomplete="off"></label>
      <label class="field">Authors (separate with ;)<input name="authors" value="${value('authors')}" autocomplete="off"></label>
      <div class="field-row"><label class="field">Translator<input name="translator" value="${value('translator')}" autocomplete="off"></label>
        <label class="field">Publisher<input name="publisher" value="${value('publisher')}" autocomplete="off"></label>
        <label class="field">ISBN<input name="isbn" value="${value('isbn')}" inputmode="numeric" autocomplete="off"></label></div>
      <label class="field">Note: why we want it, prices, where we saw it<textarea name="notes" rows="3">${value('notes')}</textarea></label>
      <div class="actions"><button class="btn btn-primary" type="submit">Save</button><button class="btn" type="button" data-action="cancel">Cancel</button></div>
    </form>`;
}

const FIND_HTML = `<div class="block wish-find">
    <label class="field">Find the book: a title, an ISBN, or a link to it on Amazon
      <input data-find type="search" autocomplete="off" enterkeyhint="search" placeholder="The Birth of Tragedy"></label>
    <p class="step-hint" data-find-status></p>
    <div class="choices" data-results></div>
    <button type="button" class="btn" data-action="by-hand">Type it in myself</button>
  </div>`;

function itemHtml(item) {
  const translator = item.contributors.find(person => person.role === 'translator');
  const lineHtml = escapeHtml([item.subtitle, item.authors.join(', '), translator && `trans. ${translator.name}`, item.publisher, item.isbn && `ISBN ${item.isbn}`].filter(Boolean).join(' · '));
  const notesHtml = item.notes ? `<div class="notes"><p>${escapeHtml(item.notes)}</p></div>` : '';
  return `<div class="block wish" id="wish-${escapeHtml(item.id)}"><div class="wish-head">${coverPictureHtml(item)}<div>`
    + `<h2 class="block-title">${escapeHtml(item.title)}</h2><p class="wish-line">${lineHtml}</p></div></div>${notesHtml}`
    + `<div class="actions"><a class="btn btn-primary" href="#/new/${escapeHtml(item.id)}">I bought it</a>`
    + `<button class="btn" data-action="edit" data-id="${escapeHtml(item.id)}">Edit</button>`
    + `<button class="btn" data-action="remove" data-id="${escapeHtml(item.id)}">Remove</button></div></div>`;
}

export function render(container, state, actions) {
  let editing = null; // null, 'find' (a new item, still finding it), 'new', or the ID of the item being edited
  let draft = null; // a new item's details and cover, once found
  let candidates = [];
  let searchTimer = null;
  let asked = 0; // the newest search; older answers arriving late are ignored
  let knownSets = []; // the known sets' lists, drawn as set gaps once read
  loadKnownSets().then(sets => { knownSets = sets; if (sets.length) draw(); });

  // Each known set we hold at least one volume of, with the volumes missing.
  function gaps() {
    return knownSets.map(set => {
      const held = state.library.entries.filter(entry => entry.edition.set && normalizeForSearch(entry.edition.set) === normalizeForSearch(set.set)).map(entry => entry.edition.volume || '');
      return { set, held, missing: held.length ? setGaps(set, held).missing : [] };
    }).filter(gap => gap.missing.length);
  }

  function gapsHtml() {
    return gaps().map(({ set, missing }) => {
      const shown = missing.slice(0, 12).join(', ') + (missing.length > 12 ? ', …' : '');
      const titles = set.volumes.filter(volume => missing.includes(volume.label)).map(volume => (volume.title ? `${volume.label} ${volume.title}` : volume.label)).join('; ');
      return `<details class="block"><summary>${escapeHtml(`${set.set}: ${set.volumes.length - missing.length} of ${set.volumes.length} held · missing ${shown}`)}</summary>`
        + `<p class="step-hint">${escapeHtml(titles)}</p><button class="btn" data-action="gaps" data-value="${escapeHtml(set.set)}">Put the missing on the wishlist</button></details>`;
    }).join('');
  }

  function draw() {
    const sort = state.device.wishSort || state.settings.defaultSort.wishlist;
    const items = sortedItems(state.library.wishlist.map(wish => wish.item), sort);
    const sortHtml = SORTS.map(([value, label]) => `<button class="chip${value === sort ? ' is-on' : ''}" data-action="sort" data-value="${value}">${escapeHtml(label)}</button>`).join('');
    const listHtml = items.map(item => (editing === item.id ? formHtml(item, null) : itemHtml(item))).join('');
    const countHtml = escapeHtml(`${items.length} wanted`);
    const setGapsHtml = editing ? '' : gapsHtml();
    const newHtml = editing === 'find' ? FIND_HTML : editing === 'new' ? formHtml(null, draft) : '';
    const addButtonHtml = editing === 'find' || editing === 'new' ? '' : '<button class="btn btn-primary" data-action="find">Add to wishlist</button>';
    container.innerHTML = `<div class="page-head"><h1 class="page-title">Wishlist</h1><p class="page-meta">${countHtml}</p></div>
      <div class="toolbar"><div class="chips">${sortHtml}</div>${addButtonHtml}</div>
      ${setGapsHtml}
      ${newHtml}
      ${listHtml || (editing ? '' : '<p class="empty">Nothing on the wishlist yet.</p>')}`;
    fillImages(container, actions.imageUrl);
    const first = container.querySelector('[data-find], [data-wish-form] input');
    if (first) first.focus();
  }

  // ---------- finding a new item ----------

  const findStatus = text => { const status = container.querySelector('[data-find-status]'); if (status) status.textContent = text; };

  function showCandidates() {
    const box = container.querySelector('[data-results]');
    if (!box) return;
    box.innerHTML = candidates.map((candidate, i) => {
      const pictureHtml = candidate.cover ? `<img class="result-cover" src="${escapeHtml(openLibraryCoverUrlById(candidate.cover, 'S'))}" alt="" loading="lazy">` : '<span class="result-cover"></span>';
      const authors = candidate.authors.slice(0, 2).join(', ') + (candidate.authors.length > 2 ? ' and others' : '');
      const detailHtml = escapeHtml([authors, [candidate.publisher, candidate.year].filter(Boolean).join(', ')].filter(Boolean).join(' · '));
      return `<button type="button" class="choice-button result" data-action="pick" data-value="${i}">${pictureHtml}<span><span>${escapeHtml(candidate.title)}</span><small>${detailHtml}</small></span></button>`;
    }).join('');
  }

  async function find(text) {
    const mine = ++asked;
    const isbn = isbnInText(text);
    if (/amazon\.|a\.co\//i.test(text) && !isbn) {
      findStatus('This link has no ISBN in it (Kindle editions and short a.co links do not). Paste the full link to the printed book, or type its title.');
      return;
    }
    if (isbn) return useBook({ isbn });
    if (text.trim().length < 3) { candidates = []; showCandidates(); findStatus(''); return; }
    findStatus('Searching Open Library…');
    try {
      const found = await searchOpenLibrary(text.trim());
      if (mine !== asked) return;
      candidates = found;
      showCandidates();
      findStatus(found.length ? 'Tap the right one.' : 'Nothing found. Try fewer words, or type it in yourself.');
    } catch (error) {
      if (mine === asked) findStatus(`${error.message} You can type it in yourself.`);
    }
  }

  // Details by ISBN (Open Library, then Google Books for what is missing), and the cover.
  async function useBook({ isbn, title = '', authors = [], cover = null }) {
    const mine = ++asked;
    const lookups = state.settings.lookups;
    findStatus(isbn ? `Looking up ISBN ${isbn}…` : 'Getting the cover…');
    let found = null;
    if (isbn && lookups.openLibrary !== false) found = await lookUpOpenLibrary(isbn).catch(() => null);
    if (isbn && (!found || !found.authors.length || !found.publisher) && lookups.googleBooks !== false) {
      found = combineFound(found, await lookUpGoogleBooks(isbn, state.device.googleBooksKey || '').catch(() => null));
    }
    if (mine !== asked) return;
    if (isbn && !found && !title) { findStatus(`No book with ISBN ${isbn} was found. Type its title instead, or type it in yourself.`); return; }
    const book = found || {};
    const translator = (book.contributors || []).find(person => person.role === 'translator');
    const coverUrl = cover ? openLibraryCoverUrlById(cover) : book.cover && book.cover.url;
    let picture = await coverFor(coverUrl, cover ? 'openlibrary' : book.cover && book.cover.source, book.cover && book.cover.waiting && !cover);
    // No cover for this exact edition: the cover Open Library shows for the work is close enough for a wish.
    if (!picture && isbn) {
      const [work] = await searchOpenLibrary(isbn).catch(() => []);
      if (work && work.cover) picture = await coverFor(openLibraryCoverUrlById(work.cover), 'openlibrary', false);
    }
    draft = {
      values: { title: book.title || title, subtitle: book.subtitle || '', authors: (book.authors && book.authors.length ? book.authors : authors).join('; '), translator: translator ? translator.name : '', publisher: book.publisher || '', isbn: isbn || '', notes: '' },
      cover: picture,
    };
    if (mine !== asked) return;
    editing = 'new';
    draw();
  }

  // An Open Library cover is downloaded and made into our own files now; a Google Books
  // cover waits for the laptop, as in batch add (PLAN.md, "Covers and images").
  async function coverFor(url, source, waiting) {
    if (!url) return null;
    if (waiting) return { waiting: url, source };
    try {
      const blob = await downloadOpenLibraryCover(url);
      if (!blob) return null;
      const { readPicture, imageFiles } = await import('../edges/photo.js');
      const files = await imageFiles(await readPicture(blob));
      return { files, source, preview: URL.createObjectURL(files.thumb) };
    } catch {
      return null;
    }
  }

  // ---------- answers ----------

  container.oninput = event => {
    if (!('find' in event.target.dataset)) return;
    clearTimeout(searchTimer);
    const text = event.target.value;
    searchTimer = setTimeout(() => find(text), isbnInText(text) ? 0 : SEARCH_DELAY);
  };

  container.onkeydown = event => {
    if (event.key === 'Enter' && 'find' in event.target.dataset) { clearTimeout(searchTimer); find(event.target.value); }
  };

  container.onclick = async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, id, value } = button.dataset;
    if (action === 'sort') { actions.setDevice({ wishSort: value }); return; }
    if (action === 'pick') {
      const candidate = candidates[Number(value)];
      // Each result is one edition: with its ISBN, its full details and cover are looked up.
      useBook({ isbn: candidate.isbn || undefined, title: candidate.title, authors: candidate.authors, cover: candidate.cover });
      return;
    }
    if (action === 'gaps') {
      // One wishlist item per missing volume; a volume already wished for is not added again.
      const gap = gaps().find(item => item.set.set === value);
      if (!gap) return;
      const wishes = wishesForGaps(gap.set, gap.missing, state.library.wishlist.map(wish => wish.item));
      const records = wishes.map(values => wishFromForm(values, null, { newId: actions.newId, now: actions.now() }).record);
      if (!records.length) { actions.showNote('Every missing volume is already on the wishlist.'); return; }
      if (await actions.saveRecords(records)) actions.showNote(`Put ${records.length} missing volumes of ${gap.set.set} on the wishlist.`);
      draw();
      return;
    }
    if (action === 'remove') {
      const record = state.records.get(id);
      if (await actions.saveRecords([trashRecord(record, actions.today(), actions.now())])) actions.showNote(`Removed: ${record.title}. Settings › Trash brings it back.`);
      editing = null;
    } else if (action === 'by-hand') {
      draft = { values: { title: (container.querySelector('[data-find]').value || '').trim() }, cover: null };
      editing = 'new';
    } else {
      editing = action === 'find' ? 'find' : action === 'edit' ? id : null;
      if (editing !== 'new') { draft = null; candidates = []; asked++; }
    }
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
    const cover = !existing && draft && draft.cover;
    const imageId = cover ? actions.newId() : null;
    const saved = cover ? { ...record, images: [{ id: imageId, kind: 'cover', source: cover.source, color: cover.files ? cover.files.color : null, ratio: cover.files ? cover.files.ratio : null, master: false, waiting: cover.waiting || null }] } : record;
    if (await actions.saveRecords([saved])) {
      if (cover && cover.files) actions.saveImageFiles(imageId, cover.files);
      editing = null;
      draft = null;
      draw();
    }
  };

  draw();
}
