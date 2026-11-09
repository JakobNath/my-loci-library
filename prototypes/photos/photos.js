// Mockups for the photo ideas page. Throwaway prototype code.
// Luther's Works volume 4 uses real photos (img/); every other book is drawn
// from the sample data: a cover tile and a spine in the colors of its binding.

import { books } from '../shared/sample-books.js';
import { mark } from '../shared/logo.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = id => document.getElementById(id);

// ---------- data ----------

const lwCover = { bg: '#7a2f36', fg: '#e3c27f', accent: '#c9a35c' };
const lw = (vol, sub, extra = {}) => ({
  id: 'lw-' + vol, kind: 'owned', format: 'physical', lw: true, vol,
  title: "Luther's Works", subtitle: `Volume ${vol}: ${sub}`, authors: ['Martin Luther'],
  pages: 400, cover: lwCover, location: ['Office', 'Case 3', 'Shelf 2'], ...extra,
});
const lw4 = lw(4, 'Lectures on Genesis, Chapters 21–25', {
  photo: { cover: 'img/lw4-cover.jpg', coverThumb: 'img/lw4-cover-thumb.jpg', spine: 'img/lw4-spine.jpg', spineThumb: 'img/lw4-spine-thumb.jpg', spineRatio: 147 / 900 },
  plain: true,
});
const lwOwned = [lw(2, 'Lectures on Genesis, Chapters 6–14'), lw(3, 'Lectures on Genesis, Chapters 15–20'), lw4,
  lw(12, 'Selected Psalms I'), lw(21, 'The Sermon on the Mount'), lw(26, 'Lectures on Galatians'), lw(31, 'Career of the Reformer I'), lw(35, 'Word and Sacrament I')];
const lwWish = [1, 5, 36];

// Books whose covers say little (plain cloth or leather): Best face shows their spine.
const plainIds = new Set(['triglotta', 'pieper-1', 'chemnitz-trent-1', 'chemnitz-loci-1', 'chemnitz-enchiridion', 'republic-easton', 'nkjv']);
const locations = {
  'chemnitz-trent-1': ['Office', 'Case 1', 'Shelf 2'], 'chemnitz-loci-1': ['Office', 'Case 1', 'Shelf 2'], 'chemnitz-enchiridion': ['Office', 'Case 1', 'Shelf 2'],
  'triglotta': ['Office', 'Case 1', 'Shelf 2'], 'pieper-1': ['Office', 'Case 1', 'Shelf 2'],
  'na28': ['Office', 'Case 2', 'Shelf 1'], 'loeb-36': ['Office', 'Case 2', 'Shelf 1'], 'apostolic-fathers': ['Office', 'Case 2', 'Shelf 1'],
  'pseudo-dionysius': ['Office', 'Case 2', 'Shelf 1'], 'confessions-chadwick': ['Office', 'Case 2', 'Shelf 1'], 'anf-1': ['Office', 'Case 2', 'Shelf 1'],
};
const library = [
  ...books.filter(b => b.kind === 'owned' && b.format === 'physical' && b.status !== 'gone')
    .map(b => ({ ...b, plain: plainIds.has(b.id), location: locations[b.id] || (b.copies && b.copies[0].location || []).slice(1) })),
  lw4, ...lwOwned.filter(b => b !== lw4),
].sort((a, b) => a.title.replace(/^The /, '').localeCompare(b.title.replace(/^The /, '')) || (a.vol || 0) - (b.vol || 0));
const byId = id => library.find(b => b.id === id) || books.find(b => b.id === id);

// ---------- drawing ----------

const author = b => (b.authors ? b.authors.join(', ') : (b.authorLine || '').replace(/^ed\. (and trans\. )?/, ''));
const ratioOf = b => b.photo && b.photo.spineRatio ? b.photo.spineRatio : Math.min(0.24, Math.max(0.07, ((b.pages || 380) * 0.06 + 7) / 235));
const styleVars = c => `--c-bg:${c.bg};--c-fg:${c.fg};--c-ac:${c.accent}`;

// Photos of the sample books live under prototypes/photos/real/.
const src = p => (p.startsWith('photos/') ? '../' + p : p);

function cover(b, thumb) {
  if (b.photo) return `<img class="cover${b.real ? ' cover-real' : ''}" src="${src(thumb ? b.photo.coverThumb : b.photo.cover)}" alt="">`;
  const c = b.cover || { bg: '#555', fg: '#fff', accent: '#ccc' };
  return `<div class="cover drawn" style="${styleVars(c)}"><span class="t">${esc(b.shortTitle || b.title)}</span><span class="r"></span><span class="a">${esc(author(b))}</span></div>`;
}

function spine(b, h, thumb) {
  const w = Math.round(h * ratioOf(b));
  if (b.photo && b.photo.spine) return `<img class="spine-photo" src="${src(thumb || h <= 160 ? b.photo.spineThumb : b.photo.spine)}" style="height:${h}px;width:${w}px" alt="">`;
  const c = b.cover || { bg: '#555', fg: '#fff', accent: '#ccc' };
  if (b.lw) {
    const fs = Math.max(5, Math.round(w * 0.17));
    return `<div class="spine lw" style="height:${h}px;width:${w}px;--fs:${fs}px"><span class="lab">LUTHER'S WORKS</span><span class="lab">VOL. ${b.vol}</span></div>`;
  }
  const fs = Math.max(6, Math.min(15, Math.round(w * 0.42)));
  const pub = (b.publisher || '').replace('Concordia Publishing House', 'CPH').replace('The Folio Society', 'FOLIO').replace('Harvard University Press', 'LOEB')
    .replace('Deutsche Bibelgesellschaft', 'DBG').replace('Oxford University Press', 'OXFORD').replace('The Easton Press', 'EASTON').split(' ')[0].slice(0, 6);
  return `<div class="spine" style="height:${h}px;width:${w}px;${styleVars(c)};--fs:${fs}px;--fa:${Math.max(5, fs - 3)}px">
    <span class="st">${esc(b.shortTitle || b.title)}${b.volume ? ' ' + esc(b.volume) : ''}</span><span class="sa">${esc(author(b).split(',')[0])}</span><span class="sp">${esc(pub)}</span></div>`;
}

// The mat color for a spine photo: the average color of the image.
const matCache = {};
async function averageColor(src) {
  if (matCache[src]) return matCache[src];
  const img = new Image(); img.src = src; await img.decode();
  const c = document.createElement('canvas'); c.width = 8; c.height = 40;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, 8, 40);
  const d = x.getImageData(0, 0, 8, 40).data; let r = 0, g = 0, bl = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; bl += d[i + 2]; }
  const n = d.length / 4;
  return (matCache[src] = `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(bl / n)})`);
}
const matOf = b => (b.photo ? matCache[b.photo.spine] || '#6d2a30' : (b.cover || {}).bg || '#555');

function face(b, mode) {
  if (mode === 'best' && b.plain) {
    return `<div class="mat" style="--mat:${matOf(b)}">${spine(b, 190)}</div>`;
  }
  return cover(b);
}

const bar = (title = 'My Loci Library') => `<div class="bar"><span class="logo">${mark}</span><span class="grow">${esc(title)}</span></div>`;
const tabs = (on = 'Library') => `<div class="tabs">${['Library', 'Wishlist', 'Add books'].map(t => `<span class="${t === on ? 'on' : ''}">${t}</span>`).join('')}</div>`;
const phone = (inner, cls = '') => `<div class="phone ${cls}">${inner}</div>`;
const mock = (inner, title, text, pros) => `<div class="mock">${inner}<div class="cap"><b>${title}</b>${text}</div>${pros ? `<ul class="pros">${pros.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}</div>`;
const camIcon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';

// ---------- 1. capture ----------

function renderCapture() {
  const coverStep = phone(`${bar('Add books')}<div class="cam">
      <div class="hint">Front cover</div><div class="step">Step 2 of 3 · fill the frame</div>
      <div class="guide" style="width:190px;height:285px"><img src="${lw4.photo.cover}" style="width:182px;height:277px;object-fit:cover;opacity:.95" alt=""></div>
      <div class="cam-foot"><span>Skip</span><span class="shutter"></span><span>Photos</span></div></div>`);
  const spineStep = phone(`${bar('Add books')}<div class="cam">
      <div class="hint">Spine</div><div class="step">Step 3 of 3 · turn the book, keep the phone upright</div>
      <div class="guide" style="width:66px;height:380px"><img src="${lw4.photo.spine}" style="width:58px;height:356px" alt=""></div>
      <div class="cam-foot"><span>Skip</span><span class="shutter"></span><span>Photos</span></div></div>`);
  const straighten = phone(`${bar('Add books')}<div class="cam" style="background:#5d4a38">
      <div class="hint">Straighten the spine</div><div class="step">Drag the corners onto the spine's corners</div>
      <div style="position:relative;transform:rotate(-5deg)"><img src="${lw4.photo.spine}" style="width:62px;height:380px;display:block" alt="">
        <span class="handle" style="left:2px;top:3px"></span><span class="handle" style="left:60px;top:2px"></span>
        <span class="handle" style="left:61px;top:378px"></span><span class="handle" style="left:1px;top:377px"></span></div>
      <div class="cam-foot"><span class="btn">Rotate</span><span class="btn btn-primary">Use photo</span></div></div>`);
  const review = phone(`${bar('Add books')}<div class="screen">
      <h4>Saved</h4>
      <div style="display:flex;gap:14px;align-items:flex-end;justify-content:center;padding:10px 0 4px">${spine(lw4, 230)}<div style="width:150px">${cover(lw4)}</div></div>
      <p class="small" style="text-align:center"><b>Luther's Works</b>, vol. 4<br><span class="muted">Office › Case 3 › Shelf 2</span></p>
      <p class="small muted" style="text-align:center">Cover 3 KB + 48 KB · spine 4 KB + 37 KB</p>
      <div style="display:flex;gap:8px;justify-content:center"><span class="btn">Retake spine</span><span class="btn btn-primary">Next book</span></div>
    </div>${tabs('Add books')}`);
  const shelfBooks = library.filter(b => (b.location || []).join() === 'Office,Case 1,Shelf 2');
  const pass = phone(`${bar('Shelf pass')}<div class="screen">
      <h4>Office › Case 1 › Shelf 2</h4>
      <p class="small muted" style="margin-top:0">Photograph spines without taking books down. Tap a book, then take its spine where it stands.</p>
      <div class="meter"><i style="width:40%"></i></div>
      ${shelfBooks.map((b, i) => `<div class="lrow"><span class="thumb-cover">${cover(b, true)}</span><span class="lm"><span class="lt">${esc(b.title)}</span><br><span class="ls">${esc(author(b))}</span></span>
        ${i < 2 ? '<span class="check">✓ spine</span>' : `<span class="todo">${camIcon} spine</span>`}</div>`).join('')}
    </div>${tabs()}`);
  $('capture').innerHTML =
    mock(coverStep, 'a. Cover', 'A cover-shaped guide. The lookup may already have found a cover; a photo of our own copy replaces it when taken.') +
    mock(spineStep, 'b. Spine', 'A tall, narrow guide. Hold the book spine-out at arm\'s length and the spine fills the frame.', ['Phone stays upright: no awkward sideways shot', 'Same shutter, same flow as the cover']) +
    mock(straighten, 'c. Straighten', 'The planned four-corner straightening, applied to the spine. A photo taken sideways is turned upright automatically.') +
    mock(review, 'd. Both saved', 'Both pictures side by side before moving on, with a quick retake.') +
    mock(pass, 'e. Shelf pass', 'For the first 1,000 books already on shelves: walk a shelf and photograph spines in place. The list shows which books on this shelf still need one.', ['Fast: no pulling books out', 'Doubles as a check that the shelf location is right']);
}

// ---------- 2. library views ----------

let viewMode = 'best';
function renderViews() {
  const list = library;
  let body = '';
  if (viewMode === 'covers' || viewMode === 'best') {
    // Luther's Works 4 (the real photos) first, then a mix of plain and designed covers.
    // Real photos first: Luther's Works 4 and the books photographed on 9 Nov 2026.
    const firstIds = ['lw-4', ...library.filter(b => b.real).map(b => b.id)];
    const ordered = [...firstIds.map(byId), ...list.filter(b => !firstIds.includes(b.id))];
    body = `<div class="grid2">${ordered.slice(0, 14).map(b => `<div class="tile">${face(b, viewMode)}<div class="tt">${esc(b.title)}${b.vol ? ' ' + b.vol : ''}</div><div class="ta">${esc(author(b))}</div></div>`).join('')}</div>`;
  } else if (viewMode === 'spines') {
    body = `<div class="wall">${list.map(b => spine(b, 150)).join('')}</div>`;
  } else {
    const groups = {};
    for (const b of list) { const k = (b.location || []).join(' › ') || 'No location yet'; (groups[k] = groups[k] || []).push(b); }
    body = Object.entries(groups).sort((a, b) => b[1].length - a[1].length).map(([k, bs]) => `<div class="shelf"><div class="shelf-name">${esc(k)} · ${bs.length}</div><div class="shelf-row">${bs.map(b => spine(b, 120)).join('')}</div></div>`).join('');
  }
  $('views').innerHTML = `${bar()}<div class="screen"><h4>Library</h4>
    <div class="seg">${[['covers', 'Covers'], ['best', 'Best face'], ['spines', 'Spines'], ['shelves', 'Shelves']].map(([k, l]) => `<button data-view="${k}" class="${k === viewMode ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${body}</div>${tabs()}`;
}

// ---------- 3. book page ----------

let turn = 30;
function renderDetail() {
  const flat = phone(`${bar()}<div class="screen">
      <p class="small" style="margin:0 0 8px;color:var(--accent-ink)">‹ Library</p>
      <div style="display:flex;gap:10px;align-items:flex-end;justify-content:center">${spine(lw4, 250)}<div style="width:164px">${cover(lw4)}</div></div>
      <h4 style="margin-top:14px">Luther's Works</h4>
      <p class="small" style="margin:0">Volume 4: Lectures on Genesis, Chapters 21–25</p>
      <p class="small" style="margin:6px 0"><b>Martin Luther</b> · ed. Jaroslav Pelikan</p>
      <span class="chip">1535–45</span>
      <p class="small muted">Tap either picture to see it full screen.</p>
    </div>${tabs()}`);
  const h = 250, w = Math.round(h * 392 / 600), t = Math.round(h * lw4.photo.spineRatio);
  const book = phone(`${bar()}<div class="screen">
      <p class="small" style="margin:0;color:var(--accent-ink)">‹ Library</p>
      <div class="stage" id="stage"><div class="book3d" id="book3d" style="--w:${w}px;--h:${h}px;--t:${t}px;width:${w}px;height:${h}px;transform:rotateY(${turn}deg)">
        <div class="f-back"></div><div class="f-top"></div><div class="f-pages"></div>
        <div class="f-spine"><img src="${lw4.photo.spine}" alt=""></div>
        <div class="f-front"><img src="${lw4.photo.cover}" alt=""></div></div></div>
      <div class="turns"><button class="btn" data-turn="88">Spine</button><button class="btn" data-turn="30">Both</button><button class="btn" data-turn="0">Cover</button></div>
      <p class="small muted" style="text-align:center">Drag the book to turn it.</p>
    </div>${tabs()}`);
  const shelf = library.filter(b => b.lw).sort((a, b) => a.vol - b.vol);
  const here = phone(`${bar()}<div class="screen">
      <p class="small" style="margin:0 0 8px;color:var(--accent-ink)">‹ Library</p>
      <div style="display:flex;gap:12px;align-items:flex-start"><div style="width:100px;flex:none">${cover(lw4)}</div>
        <div><h4 style="margin:0">Luther's Works 4</h4><p class="small" style="margin:2px 0">Lectures on Genesis 21–25</p><span class="chip">1535–45</span></div></div>
      <h4 style="font-size:15px;margin-top:16px">Where it lives</h4>
      <p class="small" style="margin:0 0 8px">Office › Case 3 › <b>Shelf 2</b>, fourth from the left</p>
      <div class="shelf-row" style="padding:6px 4px 3px">${shelf.map(b => b === lw4 ? `<span class="is-here" style="display:inline-flex">${spine(b, 150)}</span>` : `<span class="dim" style="display:inline-flex">${spine(b, 150)}</span>`).join('')}</div>
      <p class="small muted">Its neighbors on the shelf, from the shelf order.</p>
    </div>${tabs()}`);
  $('detail').innerHTML =
    mock(flat, 'a. Cover and spine side by side', 'The spine stands to the left of the cover, as on the shelf. Simple, fast, and shows both at a glance.', ['Lightest option', 'Works the same with a drawn spine']) +
    mock(book, 'b. A 3D book you can turn', 'The two photos wrapped onto a book shape, with the thickness taken from the spine photo. Turn it by dragging or with the buttons.', ['A few lines of CSS, no library', 'Delightful, but a nice extra rather than essential']) +
    mock(here, 'c. Where it lives', 'The spine among its neighbors on the shelf, highlighted. Faster to find on a full shelf than a written location alone.', ['Needs books in shelf order (from a shelf pass)']);
  bindBook();
}

function bindBook() {
  const stage = $('stage'), el = $('book3d');
  let startX = null, startTurn = 0;
  stage.addEventListener('pointerdown', e => { startX = e.clientX; startTurn = turn; el.classList.add('dragging'); stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', e => { if (startX === null) return; turn = Math.max(-200, Math.min(200, startTurn + (e.clientX - startX) * 0.8)); el.style.transform = `rotateY(${turn}deg)`; });
  const end = () => { startX = null; el.classList.remove('dragging'); };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
}

// ---------- 4. lists ----------

function renderLists() {
  const some = library.filter(b => b.lw || ['loeb-36', 'triglotta', 'na28', 'confessions-chadwick', 'pieper-1', 'apostolic-fathers'].includes(b.id)).slice(0, 8);
  const rowSpine = b => `<div class="lrow">${spine(b, 58, true)}<span class="lm"><span class="lt">${esc(b.title)}${b.vol ? ' ' + b.vol : ''}</span><br><span class="ls">${esc(author(b))} · ${esc((b.location || []).join(' › '))}</span></span></div>`;
  const rowCover = b => `<div class="lrow"><span class="thumb-cover">${cover(b, true)}</span><span class="lm"><span class="lt">${esc(b.title)}${b.vol ? ' ' + b.vol : ''}</span><br><span class="ls">${esc(author(b))} · ${esc((b.location || []).join(' › '))}</span></span></div>`;
  const search = phone(`${bar()}<div class="screen">
      <div style="border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:7px 12px;font-size:13px;margin-bottom:10px">luther genesis</div>
      <p class="small muted" style="margin:0 0 4px">In a bookstore: is this one already ours?</p>
      ${library.filter(b => b.lw && b.vol <= 5).map(rowSpine).join('')}
      <div class="lrow"><span class="ghost wish" style="width:12px;height:58px"></span><span class="lm"><span class="lt">Luther's Works 1</span><br><span class="ls">On the wishlist · Lectures on Genesis 1–5</span></span></div>
      <div class="lrow"><span class="ghost wish" style="width:12px;height:58px"></span><span class="lm"><span class="lt">Luther's Works 5</span><br><span class="ls">On the wishlist · Lectures on Genesis 26–30</span></span></div>
    </div>${tabs()}`);
  $('lists').innerHTML =
    mock(phone(`${bar()}<div class="screen"><h4>Library</h4>${some.map(rowSpine).join('')}</div>${tabs()}`), 'a. List with spine thumbnails', 'Tall and thin, like the books themselves. More rows fit, and the row reads like the shelf.') +
    mock(phone(`${bar()}<div class="screen"><h4>Library</h4>${some.map(rowCover).join('')}</div>${tabs()}`), 'b. List with cover thumbnails', 'For comparison: the plan as written. Plain covers all look alike at this size.') +
    mock(search, 'c. Search in a bookstore', 'Spines in the results match the shelf in front of you, and wishlist volumes show as dashed outlines.');
}

// ---------- 5. set view ----------

const wish = new Set(lwWish);
function renderSet() {
  const owned = new Map(lwOwned.map(b => [b.vol, b]));
  let html = '';
  for (let v = 1; v <= 55; v++) {
    const b = owned.get(v);
    html += b ? `<span class="vol">${spine(b, 120)}<span class="n">${v}</span></span>`
      : `<button class="vol" data-vol="${v}" title="${wish.has(v) ? 'On the wishlist' : 'Missing: tap to add to the wishlist'}"><span class="ghost${wish.has(v) ? ' wish' : ''}"></span><span class="n">${v}</span></button>`;
  }
  $('set').innerHTML = `<h3 style="margin-top:0">Luther's Works · American Edition</h3>
    <p class="small" style="margin:0">${owned.size} of 55 owned · ${wish.size} on the wishlist · ${55 - owned.size - wish.size} missing</p>
    <div class="legend"><span><i style="background:#7a2f36"></i>Owned (photo or drawn)</span><span><i style="border:1.5px dashed var(--pop);background:var(--pop-soft)"></i>On the wishlist</span><span><i style="border:1px solid var(--line)"></i>Missing</span></div>
    <div class="set">${html}</div>
    <p class="small muted">Volume 4 is the real photo. Built from the set title and volume number every edition already has; nothing extra to enter.</p>`;
}

// ---------- 6. fallbacks ----------

function renderFallbacks() {
  const logos = books.find(b => b.id === 'wbc-romans');
  const ghostSpine = { ...logos, pages: 600 };
  const plain = books.find(b => b.id === 'imitation-custom');
  const logosCard = `<div class="card"><h3 style="margin-top:0">Logos books</h3>
      <div style="display:flex;gap:10px;align-items:flex-end">${spine(ghostSpine, 170)}<div style="width:112px">${cover(logos)}</div></div>
      <p class="small">The cover comes from the Logos importer. The spine is drawn in the cover's own color, so digital books fit the Spines and Shelves views too. Stored size: nothing extra.</p></div>`;
  const needs = `<div class="card"><h3 style="margin-top:0">Not photographed yet</h3>
      <div style="display:flex;gap:12px;align-items:flex-end"><div class="rel" style="width:112px">${cover(plain)}<span class="badge-cam">${camIcon}</span></div>${spine(plain, 170)}</div>
      <p class="small">A drawn, citation-style tile with a small camera badge until a photo is taken. Tapping the badge opens the camera on that book.</p></div>`;
  const progress = `<div class="card"><h3 style="margin-top:0">Photo progress</h3>
      <p class="small" style="margin:0">Covers <b>18 of 21</b></p><div class="meter"><i style="width:86%"></i></div>
      <p class="small" style="margin:0">Spines <b>6 of 21</b></p><div class="meter"><i style="width:29%"></i></div>
      <p class="small">A "Needs photo" filter lists the rest, by shelf, so a few minutes with a shelf pass makes visible progress. Shown in the Library's filters and on the value page, not as a nag.</p></div>`;
  const wishCard = `<div class="card"><h3 style="margin-top:0">Wishlist: snap it in the store</h3>
      <div style="display:flex;gap:10px;align-items:flex-end">${spine(lw(1, 'Lectures on Genesis 1–5'), 170)}<div><p class="small" style="margin:0">Luther's Works 1</p><p class="small muted" style="margin:0">Seen at the downtown used bookstore, $18</p></div></div>
      <p class="small">A spine photo taken on the store shelf goes on the wishlist item, so we both know exactly which copy it was. When we buy it, the photo moves to the new copy.</p></div>`;
  $('fallbacks').innerHTML = [logosCard, needs, progress, wishCard].map(c => `<div class="mock">${c}</div>`).join('');
}

// ---------- events ----------

document.addEventListener('click', e => {
  const v = e.target.closest('[data-view]');
  if (v) { viewMode = v.dataset.view; renderViews(); return; }
  const t = e.target.closest('[data-turn]');
  if (t) { turn = +t.dataset.turn; $('book3d').style.transform = `rotateY(${turn}deg)`; return; }
  const vol = e.target.closest('[data-vol]');
  if (vol) { const n = +vol.dataset.vol; wish.has(n) ? wish.delete(n) : wish.add(n); renderSet(); }
});

renderCapture();
renderViews();
renderDetail();
renderLists();
renderSet();
renderFallbacks();
// Once the spine photo's average color is known, redraw the view that uses it.
averageColor(lw4.photo.spine).then(renderViews).catch(() => {});
