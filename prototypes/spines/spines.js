// Drawn spine prototype, round 4: the "Outline only" style with color taken
// from each book's front cover, in a few strengths. Shown on shelves among
// real spine photos. Prototype code; the chosen variant is rewritten for the
// app in phase 5.

import { books } from '../shared/sample-books.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- settings, remembered on this device ----------

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: not remembered */ } },
};
const state = { heights: 'varied', mix: 'some', closer: null, ...store.get('loci-spine-settings-4', {}) };
let likes = store.get('loci-spine-likes-4', {});

// ---------- small helpers ----------

function rand(text, salt = 0) {
  let h = 2166136261 ^ salt;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function hex([r, g, b]) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function lum(h) { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
const surname = b => { const a = (b.authors && b.authors[0]) || ''; return a.split(' ').pop(); };

// ---------- the cover color ----------
// In the app, one color per book is taken from its cover image when the
// cover is saved, and kept with the record (a few bytes). Here the
// photographed books get theirs from their real cover photos the same way;
// the other sample books use the colors given in the sample data.

const coverColor = new Map();

// The cover's main color: the largest group of similar colors in a small
// copy of the image, ignoring the outer edge.
async function dominantColor(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas'); c.width = 24; c.height = 36;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, 24, 36);
  const d = x.getImageData(2, 2, 20, 32).data;
  const groups = new Map();
  for (let i = 0; i < d.length; i += 4) {
    const key = (d[i] >> 5) * 64 + (d[i + 1] >> 5) * 8 + (d[i + 2] >> 5);
    const g = groups.get(key) || [0, 0, 0, 0];
    g[0] += d[i]; g[1] += d[i + 1]; g[2] += d[i + 2]; g[3]++;
    groups.set(key, g);
  }
  const [r, g, b, n] = [...groups.values()].sort((p, q) => q[3] - p[3])[0];
  return hex([r / n, g / n, b / n]);
}

async function loadCoverColors() {
  await Promise.all(physical.filter(b => b.photo && b.photo.coverThumb).map(async b => {
    try { coverColor.set(b.id, await dominantColor('../' + b.photo.coverThumb)); } catch { /* keep the sample color */ }
  }));
}
const coverColorOf = b => coverColor.get(b.id) || (b.cover && b.cover.bg) || '#8a8378';

// Drawn spines should sit back so the photographed ones stand out: the cover
// color is softened (little saturation, middle lightness) before it is used.
function quiet(hexColor, maxSat = 0.22) {
  let [r, g, b] = rgb(hexColor).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  s = Math.min(s, maxSat);
  const L = Math.min(0.72, Math.max(0.38, l));
  const C = (1 - Math.abs(2 * L - 1)) * s, X = C * (1 - Math.abs((h % 2) - 1)), m = L - C / 2;
  [r, g, b] = h < 1 ? [C, X, 0] : h < 2 ? [X, C, 0] : h < 3 ? [0, C, X] : h < 4 ? [0, X, C] : h < 5 ? [X, 0, C] : [C, 0, X];
  return hex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}
const colorOf = b => quiet(coverColorOf(b));
// Dark lettering on light colors, ivory on dark ones.
const inkOn = bg => (lum(bg) > 0.55 ? '#1f1b16' : '#f6f1e6');

// ---------- kinds of binding (used only for typical sizes) ----------

const KIND_OF = {
  'confessions-pine-coffin': 'massmarket', 'real-ctq': 'journal', 'proto-journal': 'journal', nkjv: 'flex', 'real-ubs': 'flex',
};
const kindOf = b => KIND_OF[b.id] || (/paperback/i.test((b.copies && b.copies[0] && b.copies[0].binding) || '') || b.id.startsWith('real-') ? 'paperback' : 'hardcover');

const extraBooks = [{
  // A journal issue printed as pages 89–132: 44 pages, not 132.
  id: 'proto-journal', kind: 'owned', format: 'physical', title: 'Lutheran Quarterly 38:2',
  pages: 44, copies: [{ binding: 'Journal issue' }], cover: { bg: '#e9e2d0', fg: '#2a251e', accent: '#8a2b2b' },
}];

// ---------- lettering ----------
// Titles are measured, then set as large as the spine allows: in one line,
// or two on a wide spine, shortened only as a last resort.

const FONTS = { serif: 'var(--font-display)', sans: 'var(--font-body)' };
const ruler = document.createElement('canvas').getContext('2d');
const measured = new Map();
function textLength(text, fs, weight) {
  const key = weight + '/' + fs + '/' + text;
  if (!measured.has(key)) {
    ruler.font = `${weight} ${fs}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-display')}`;
    measured.set(key, ruler.measureText(text).width);
  }
  return measured.get(key);
}
function splitInTwo(text) {
  let best = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (best < 0 || Math.abs(i - text.length / 2) < Math.abs(best - text.length / 2))) best = i;
  return best < 0 ? null : [text.slice(0, best), text.slice(best + 1)];
}
function layout(text, w, length, maxFs, minFs, weight) {
  const room = w - 4, top = Math.max(7, Math.min(maxFs, room)), floor = Math.min(minFs, top), halves = splitInTwo(text);
  for (let fs = top; fs >= floor; fs -= 0.5) {
    if (textLength(text, fs, weight) <= length) return { fs, lines: [text] };
    if (halves && room >= 2 * fs * 1.15 && Math.max(...halves.map(t => textLength(t, fs, weight))) <= length) return { fs, lines: halves };
  }
  let cut = text;
  while (cut.length > 1 && textLength(cut + '…', floor, weight) > length) cut = cut.slice(0, -1);
  return { fs: floor, lines: [cut.trimEnd() + '…'], shortened: true };
}
const WEIGHT = 400; // one weight for all spine lettering
function vblock(text, w, h, { top, bottom, color, maxFs = 11, minFs = 8.5 }) {
  const weight = WEIGHT;
  const t = layout(text, w, h * (100 - top - bottom) / 100 - 4, maxFs, minFs, weight);
  return { fits: !t.shortened, html: `<span class="vbox" style="top:${top}%;bottom:${bottom}%"><span class="vt" style="font-family:${FONTS.serif};font-size:${t.fs}px;font-weight:${weight};color:${color}">${t.lines.map(esc).join('<br>')}</span></span>` };
}
// The foot shows a volume or series number when there is one (as on a
// real set), otherwise the author's surname.
const footOf = b => b.volume || b.seriesNo || surname(b);
function words(b, w, h, { top = 5, bottom = 5, color, authorColor }) {
  if (footOf(b)) {
    const title = vblock(b.title, w, h, { top, bottom: bottom + 21, color });
    const author = vblock(String(footOf(b)), w, h, { top: 100 - bottom - 18, bottom, color: authorColor || color, maxFs: 9.5, minFs: 8 });
    if (title.fits) return title.html + (author.fits ? author.html : '');
  }
  return vblock(b.title, w, h, { top, bottom, color }).html;
}

// ---------- the variants ----------
// All keep the outline style: a dashed edge, the title, nothing else.

const box = css => `<span style="position:absolute;${css}"></span>`;
// The chosen design: the plain outline (A), with the dashed edge in the
// softened cover color (B) only when the book has a cover image.
const hasCoverImage = b => coverColor.has(b.id);
function drawChosen(b, w, h) {
  const edge = hasCoverImage(b) ? `1.5px dashed ${colorOf(b)}` : '1px dashed var(--muted)';
  return { bg: 'var(--surface)', border: edge, html: words(b, w, h, { color: 'var(--ink)', authorColor: 'var(--ink-2)' }) };
}
const VARIANTS = [
  { key: 'chosen', name: 'Outline, with a colored edge when there is a cover image',
    about: 'Ivory inside with the title. A book with a cover image gets its dashed edge in a softened version of the cover\'s color; a book without one keeps the plain gray edge. One weight of type throughout, set small like a printed spine.',
    draw: drawChosen },
];

// ---------- the books on the shelves ----------

const physical = [...books.filter(b => b.kind !== 'wish' && b.format !== 'logos'), ...extraBooks];
const withPhoto = physical.filter(b => b.photo && b.photo.spine);
const noPhoto = physical.filter(b => !(b.photo && b.photo.spine));

function shelfBooks(count) {
  const photos = { none: 0, some: 3, many: withPhoto.length }[state.mix];
  const chosenPhotos = withPhoto.slice().sort((a, b) => rand(a.id, 3) - rand(b.id, 3)).slice(0, photos);
  // Books with real cover photos first, so their extracted colors are on show.
  const drawn = noPhoto.slice().sort((a, b) => (b.real ? 1 : 0) - (a.real ? 1 : 0) || rand(a.id, 5) - rand(b.id, 5)).slice(0, Math.max(0, count - chosenPhotos.length));
  const extra = state.mix === 'none' ? withPhoto.slice(0, Math.max(0, count - drawn.length)) : [];
  return [...chosenPhotos.map(b => ({ b, photo: true })), ...drawn.map(b => ({ b })), ...extra.map(b => ({ b }))]
    .sort((x, y) => rand(x.b.id, 11) - rand(y.b.id, 11));
}

// ---------- sizes, following the plan's "Book sizes" rules ----------

// Heights from Library of Congress records for sample ISBNs (checked 9 Nov 2026).
const CATALOG_CM = { '9780199537822': 20, '9780809128389': 23, '9780674990401': 17, '9780758615404': 24 };
const TYPICAL_MM = { hardcover: 235, paperback: 215, massmarket: 178, flex: 220, journal: 230 };
const BOARDS_MM = { paperback: 0.5, massmarket: 0.5, journal: 0.3, flex: 3 };

function heightMm(b) {
  if (CATALOG_CM[b.isbn]) return { mm: CATALOG_CM[b.isbn] * 10, source: 'catalog' };
  const sibling = b.series && physical.find(x => x !== b && x.series === b.series && CATALOG_CM[x.isbn]);
  if (sibling) return { mm: CATALOG_CM[sibling.isbn] * 10, source: 'same series' };
  const sameSet = b.setTitle && physical.find(x => x !== b && x.setTitle === b.setTitle && CATALOG_CM[x.isbn]);
  if (sameSet) return { mm: CATALOG_CM[sameSet.isbn] * 10, source: 'same set' };
  return { mm: TYPICAL_MM[kindOf(b)] || 225, source: 'guess' };
}
function thicknessMm(b, height, photo) {
  if (photo) return { mm: height * b.photo.spineRatio, source: 'photo' };
  const pages = b.pages || 380; // a middling guess when the page count is unknown
  return { mm: pages * 0.06 + (BOARDS_MM[kindOf(b)] ?? 5.5), source: b.pages ? 'pages' : 'guess' };
}
function size(b, shelfH, photo) {
  const scale = (shelfH * 0.92) / 260; // pixels per millimeter: a 26 cm book nearly fills the shelf
  const hgt = heightMm(b), thick = thicknessMm(b, hgt.mm, photo);
  const h = Math.round(state.heights === 'even' ? shelfH * 0.8 : hgt.mm * scale);
  // Drawn spines are at least 16 px wide, so their lettering stays readable.
  const w = Math.max(photo ? 6 : 16, Math.round(thick.mm * (state.heights === 'even' ? h / hgt.mm : scale)));
  return { w, h, note: `${Math.round(hgt.mm / 10)} cm tall (${hgt.source}), ${Math.round(thick.mm)} mm thick (${thick.source})` };
}

function spineHtml(variant, item, shelfH) {
  const { b, photo } = item, { w, h, note } = size(b, shelfH, photo);
  const source = coverColor.has(b.id) ? 'color from its cover photo' : 'color from the sample data';
  const label = esc(b.title + (b.authors ? ' · ' + b.authors.join(', ') : '') + ' · ' + (photo ? 'photo' : 'drawn, ' + source) + ' · ' + note);
  if (photo) return `<span class="spine photo" title="${label}" style="width:${w}px;height:${h}px"><img src="../${esc(b.photo.spineThumb || b.photo.spine)}" alt="${label}" loading="lazy"></span>`;
  const d = variant.draw(b, w, h);
  return `<span class="spine" title="${label}" style="width:${w}px;height:${h}px;background:${d.bg};${d.border ? 'border:' + d.border + ';' : ''}">${d.html}</span>`;
}

const shelfH = () => (innerWidth >= 800 ? 230 : 200);

// ---------- rendering ----------

function renderCompare() {
  const items = shelfBooks(20), H = shelfH();
  $('compare').innerHTML = VARIANTS.map((v, i) => `
    <article class="option">
      <div class="option-head">
        <h2>${esc(v.name)}</h2>
        <button class="btn" type="button" data-closer="${v.key}">Look closer</button>
        <p>${esc(v.about)}</p>
      </div>
      <div class="shelf">${items.map(it => spineHtml(v, it, H)).join('')}</div>
    </article>`).join('');
}

function renderCloser() {
  const v = VARIANTS.find(x => x.key === state.closer);
  $('closer').hidden = !v; $('compare').hidden = !!v;
  if (!v) return;
  $('closerTitle').textContent = v.name;
  $('closerText').textContent = v.about + ' The bookcase holds every physical sample book; the photo setting above decides how many show their real spine.';
  const items = shelfBooks(physical.length), H = shelfH(), per = Math.ceil(items.length / 3);
  const names = ['Office › Case 1 › Shelf 1', 'Office › Case 1 › Shelf 2', 'Office › Case 1 › Shelf 3'];
  $('bookcase').innerHTML = `<div class="case">${[0, 1, 2].map(k => `<p class="case-label">${names[k]}</p>
    <div class="shelf">${items.slice(k * per, (k + 1) * per).map(it => spineHtml(v, it, H)).join('')}</div>`).join('')}</div>`;
  // Photographed books: the cover, the color taken from it, and the drawn spine.
  $('large').innerHTML = physical.filter(b => coverColor.has(b.id) && !(b.photo && b.photo.spine)).slice(0, 6).map(b => `
    <div class="large-item"><img class="cover-ref" src="../${esc(b.photo.coverThumb)}" alt="">
      <span class="swatch" title="taken from the cover" style="background:${coverColor.get(b.id)}"></span><span class="swatch" title="softened for the spine" style="background:${colorOf(b)}"></span>${spineHtml(v, { b }, Math.round(H * 1.2))}</div>`).join('');
}

function renderSummary() {
  if (!$('summary')) return;
  const liked = VARIANTS.filter(v => likes[v.key]).map(v => v.name);
  $('summary').textContent = liked.length ? 'Liked: ' + liked.join(', ') + '.' : 'None yet. Tap "Like" on any variant.';
}

function render() {
  for (const id of ['heights', 'mix']) {
    for (const btn of $(id).querySelectorAll('button')) btn.setAttribute('aria-pressed', String(btn.dataset.v === state[id]));
  }
  renderCompare(); renderCloser(); renderSummary();
  store.set('loci-spine-settings-4', { heights: state.heights, mix: state.mix });
}

// ---------- events ----------

for (const id of ['heights', 'mix']) {
  $(id).addEventListener('click', e => { const v = e.target.dataset.v; if (v) { state[id] = v; render(); } });
}
document.addEventListener('click', e => {
  const like = e.target.dataset.like, closer = e.target.dataset.closer;
  if (like) { likes = { ...likes, [like]: !likes[like] }; store.set('loci-spine-likes-4', likes); render(); }
  if (closer) { state.closer = closer; render(); scrollTo({ top: $('closer').offsetTop - 60 }); }
});
$('backToAll').addEventListener('click', () => { state.closer = null; render(); });
$('copy') && $('copy').addEventListener('click', async () => {
  const liked = VARIANTS.filter(v => likes[v.key]).map(v => v.name).join(', ') || 'none';
  const report = `Drawn spines, round 4. Liked: ${liked}. Heights: ${state.heights}.`;
  try { await navigator.clipboard.writeText(report); $('copy').textContent = 'Copied'; } catch { prompt('Copy this:', report); }
});
const theme = $('theme');
function applyTheme(t) { document.documentElement.dataset.theme = t; theme.textContent = t === 'dark' ? 'Light' : 'Dark'; }
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
theme.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
let lastH = shelfH();
addEventListener('resize', () => { if (shelfH() !== lastH) { lastH = shelfH(); render(); } });

render();
loadCoverColors().then(render);
