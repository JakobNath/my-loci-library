// Drawn spine prototype: several styles for the spine drawn when a book has
// no spine photo, each shown on a shelf among real spine photos.
// Prototype code; the chosen style is rewritten for the app in phase 5.

import { books } from '../shared/sample-books.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- settings, remembered on this device ----------

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: not remembered */ } },
};
const state = { color: 'cover', heights: 'varied', mix: 'some', closer: null, ...store.get('loci-spine-settings', {}) };
let likes = store.get('loci-spine-likes', {});

// ---------- small helpers ----------

// A stable pseudo-random number in [0, 1) for a text, so every visit draws the same shelf.
function rand(text, salt = 0) {
  let h = 2166136261 ^ salt;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function hex([r, g, b]) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function lum(h) { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
function shade(h, f) { return hex(rgb(h).map(v => v * f)); }
function mixc(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); }
const differs = (a, b) => Math.abs(lum(a) - lum(b)) > 0.28;
const surname = b => { const a = (b.authors && b.authors[0]) || ''; return a.split(' ').pop(); };

// Book-cloth colors for the "cloth palette" choice: quiet, like real bindings.
const CLOTH = ['#6b2a2a', '#2e4a3d', '#26364f', '#5b5a35', '#4a5560', '#6a4a32', '#4a3346', '#2f5552', '#9a7434', '#cfc6b4', '#7a3b2e', '#33402f'];
const HOUSE = { bg: '#2e4a3d', fg: '#f3ede1', accent: '#dcb76f' };
const PAPER = '#f1ebdf', PAPER_INK = '#2a251e';

function colors(b) {
  if (state.color === 'house') return HOUSE;
  if (state.color === 'palette') {
    const bg = CLOTH[Math.floor(rand(b.id, 7) * CLOTH.length)];
    const fg = lum(bg) > 0.55 ? '#2a251e' : '#f1ebdf';
    return { bg, fg, accent: lum(bg) > 0.55 ? '#7a5a22' : '#d9b56c' };
  }
  const c = b.cover || HOUSE;
  return { bg: c.bg, fg: c.fg, accent: differs(c.accent, c.bg) ? c.accent : c.fg };
}

// ---------- the styles ----------
// Each takes the book, its size in pixels and its colors, and returns the
// spine's background and inner HTML. Text runs top to bottom, as on most
// English-language books.

const fit = (w, max = 15) => Math.max(8, Math.min(max, Math.round(w * 0.5)));
const text = (cls, s, css) => `<span class="${cls}" style="${css}">${esc(s)}</span>`;
const mark = (size, bg, fg) => `<span style="position:absolute;left:50%;bottom:${Math.round(size * 0.6)}px;transform:translateX(-50%);width:${size}px;height:${size}px;border-radius:2px;background:${bg};color:${fg};font:700 ${Math.round(size * 0.72)}px/${size}px var(--font-display);text-align:center">L</span>`;
const serif = 'font-family:var(--font-display)';
const sans = 'font-family:var(--font-body)';

const STYLES = [
  {
    key: 'cloth', name: 'Cloth and gilt',
    about: 'Book cloth in the cover\'s color, the title in gilt-like type, two thin rules at head and foot. Closest to an old hardback.',
    draw(b, w, h, c) {
      const fs = fit(w, 14), rule = `position:absolute;left:3px;right:3px;height:1px;background:${c.accent};opacity:.8`;
      return {
        bg: `repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px), ${c.bg}`,
        html: `<span style="${rule};top:7%"></span><span style="${rule};top:calc(7% + 3px)"></span>
          <span style="${rule};bottom:7%"></span><span style="${rule};bottom:calc(7% + 3px)"></span>`
          + text('t', b.title, `${serif};top:13%;bottom:${surname(b) ? 30 : 13}%;font-size:${fs}px;font-weight:500;color:${c.accent};letter-spacing:.02em`)
          + (surname(b) ? text('a', surname(b), `${serif};bottom:12%;height:15%;font-size:${Math.max(8, fs - 3)}px;color:${c.accent};opacity:.9`) : ''),
      };
    },
  },
  {
    key: 'label', name: 'Paper label',
    about: 'Cloth in the cover\'s color with a small ivory paper label carrying the title, like a library or Folio binding.',
    draw(b, w, h, c) {
      const fs = fit(w - 6, 13);
      return {
        bg: c.bg,
        html: `<span style="position:absolute;left:3px;right:3px;top:9%;bottom:40%;background:${PAPER};border-radius:1px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)"></span>`
          + text('t', b.title, `${serif};top:11%;bottom:42%;font-size:${fs}px;color:${PAPER_INK}`)
          + (surname(b) ? text('a', surname(b), `${serif};bottom:9%;height:22%;font-size:${Math.max(8, fs - 2)}px;color:${c.fg}`) : ''),
      };
    },
  },
  {
    key: 'modern', name: 'Modern publisher',
    about: 'A flat color with the title in clean sans serif and a small L at the foot, like a current paperback.',
    draw(b, w, h, c) {
      const fs = fit(w, 14), m = Math.max(8, Math.min(14, w - 8));
      return {
        bg: c.bg,
        html: text('t', b.title, `${sans};top:6%;bottom:${surname(b) ? 38 : 16}%;font-size:${fs}px;font-weight:700;color:${c.fg};letter-spacing:-.01em`)
          + (surname(b) ? text('a', surname(b), `${sans};bottom:16%;height:19%;font-size:${Math.max(8, fs - 3)}px;color:${c.fg};opacity:.85`) : '')
          + mark(m, c.accent, c.bg),
      };
    },
  },
  {
    key: 'ivory', name: 'Quiet ivory',
    about: 'Ivory paper like the app itself, with bands of the cover\'s color at head and foot. Calm, and clearly part of the app.',
    draw(b, w, h, c) {
      const fs = fit(w, 13);
      return {
        bg: `linear-gradient(${c.bg} 0 6%, transparent 6% 94%, ${c.bg} 94%), ${PAPER}`,
        html: text('t', b.title, `${serif};top:10%;bottom:${surname(b) ? 30 : 10}%;font-size:${fs}px;color:${PAPER_INK}`)
          + (surname(b) ? text('a', surname(b), `${serif};bottom:9%;height:18%;font-size:${Math.max(8, fs - 3)}px;color:#6e665a;font-style:italic`) : ''),
      };
    },
  },
  {
    key: 'leather', name: 'Leather and bands',
    about: 'A darker, rounded leather spine with raised bands; the title in gilt between the first two. Classic library feel.',
    draw(b, w, h, c) {
      const base = shade(c.bg, lum(c.bg) > 0.5 ? 0.55 : 0.8), gilt = '#d6b56a', fs = fit(w, 12);
      const band = y => `<span style="position:absolute;left:0;right:0;top:${y}%;height:4px;background:linear-gradient(${shade(base, 1.35)}, ${shade(base, 0.6)})"></span>`;
      const wide = w >= 42;
      const title = wide
        ? `<span style="position:absolute;left:2px;right:2px;top:21%;height:13%;display:flex;align-items:center;justify-content:center;text-align:center;${serif};font-size:${Math.max(8, Math.min(11, w / 5))}px;line-height:1.1;color:${gilt};overflow:hidden">${esc(b.title.length > 30 ? b.title.slice(0, 28) + '…' : b.title)}</span>`
        : text('t', b.title, `${serif};top:21%;bottom:${surname(b) ? 38 : 21}%;font-size:${fs}px;color:${gilt}`);
      return {
        bg: `linear-gradient(90deg, ${shade(base, 0.7)}, ${shade(base, 1.18)} 35%, ${base} 65%, ${shade(base, 0.62)})`,
        html: band(8) + band(18) + band(64) + band(82) + title
          + (surname(b) ? text('a', surname(b), `${serif};top:67%;height:13%;font-size:${Math.max(8, fs - 2)}px;color:${gilt}`) : ''),
      };
    },
  },
  {
    key: 'house', name: 'House style',
    about: 'Every drawn spine in the app\'s own forest green with honey type and the L mark, whatever the color setting. A drawn spine always looks drawn.',
    draw(b, w, h) {
      const c = HOUSE, fs = fit(w, 13), m = Math.max(8, Math.min(13, w - 8));
      return {
        bg: c.bg,
        html: text('t', b.title, `${serif};top:7%;bottom:${surname(b) ? 36 : 16}%;font-size:${fs}px;color:${c.accent}`)
          + (surname(b) ? text('a', surname(b), `${serif};bottom:15%;height:18%;font-size:${Math.max(8, fs - 3)}px;color:${c.fg};opacity:.85`) : '')
          + mark(m, c.accent, c.bg),
      };
    },
  },
  {
    key: 'twotone', name: 'Two-tone',
    about: 'The cover\'s main color above and its accent color below, with the author in the lower block. Bright and playful.',
    draw(b, w, h, c) {
      const fs = fit(w, 13);
      return {
        bg: `linear-gradient(${c.bg} 0 72%, ${c.accent} 72%)`,
        html: text('t', b.title, `${serif};top:6%;bottom:31%;font-size:${fs}px;font-weight:600;color:${c.fg}`)
          + (surname(b) ? text('a', surname(b), `${sans};top:75%;bottom:4%;font-size:${Math.max(8, fs - 3)}px;font-weight:600;color:${c.bg}`) : ''),
      };
    },
  },
  {
    key: 'outline', name: 'Outline only',
    about: 'Just an outline and the title, as a quiet placeholder. Honest about the missing photo, and lets the real spines stand out.',
    draw(b, w, h) {
      const fs = fit(w, 13);
      return {
        bg: 'var(--surface)',
        border: '1px dashed var(--muted)',
        html: text('t', b.title, `${serif};top:6%;bottom:${surname(b) ? 30 : 6}%;font-size:${fs}px;color:var(--ink-2)`)
          + (surname(b) ? text('a', surname(b), `${serif};bottom:6%;height:20%;font-size:${Math.max(8, fs - 3)}px;color:var(--muted)`) : ''),
      };
    },
  },
];

// ---------- the books on the shelves ----------

const physical = books.filter(b => b.kind !== 'wish' && b.format !== 'logos');
const withPhoto = physical.filter(b => b.photo && b.photo.spine);
const noPhoto = physical.filter(b => !(b.photo && b.photo.spine));

function shelfBooks(count) {
  const photos = { none: 0, some: 3, many: withPhoto.length }[state.mix];
  const chosenPhotos = withPhoto.slice().sort((a, b) => rand(a.id, 3) - rand(b.id, 3)).slice(0, photos);
  const drawn = noPhoto.slice().sort((a, b) => rand(a.id, 5) - rand(b.id, 5)).slice(0, Math.max(0, count - chosenPhotos.length));
  // Photographed books are drawn too when photos are turned off.
  const extra = state.mix === 'none' ? withPhoto.slice(0, Math.max(0, count - drawn.length)) : [];
  return [...chosenPhotos.map(b => ({ b, photo: true })), ...drawn.map(b => ({ b })), ...extra.map(b => ({ b }))]
    .sort((x, y) => rand(x.b.id, 11) - rand(y.b.id, 11));
}

// Sizes follow the plan's "Book sizes" rules: the best source first, and a
// believable estimate when nothing better is known.
// Heights from Library of Congress records for sample ISBNs (checked 9 Nov 2026).
const CATALOG_CM = { '9780199537822': 20, '9780809128389': 23, '9780674990401': 17, '9780758615404': 24 };
const binding = b => ((b.copies && b.copies[0] && b.copies[0].binding) || '').toLowerCase();
const isPaperback = b => binding(b).includes('paperback');

function heightMm(b) {
  if (CATALOG_CM[b.isbn]) return { mm: CATALOG_CM[b.isbn] * 10, source: 'catalog' };
  const sibling = b.series && physical.find(x => x !== b && x.series === b.series && CATALOG_CM[x.isbn]);
  if (sibling) return { mm: CATALOG_CM[sibling.isbn] * 10, source: 'same series' };
  const sameSet = b.setTitle && physical.find(x => x !== b && x.setTitle === b.setTitle && CATALOG_CM[x.isbn]);
  if (sameSet) return { mm: CATALOG_CM[sameSet.isbn] * 10, source: 'same set' };
  return { mm: isPaperback(b) ? 215 : binding(b) ? 235 : 225, source: 'guess' };
}

function thicknessMm(b, height, photo) {
  if (photo) return { mm: height * b.photo.spineRatio, source: 'photo' };
  const pages = b.pages || 250;
  return { mm: pages * 0.06 + (isPaperback(b) ? 0.5 : 5.5), source: b.pages ? 'pages' : 'guess' };
}

function size(b, shelfH, photo) {
  const scale = (shelfH * 0.92) / 260; // pixels per millimeter: a 26 cm book nearly fills the shelf
  const hgt = heightMm(b), thick = thicknessMm(b, hgt.mm, photo);
  const h = Math.round(state.heights === 'even' ? shelfH * 0.8 : hgt.mm * scale);
  const w = Math.max(photo ? 6 : 12, Math.round(thick.mm * (state.heights === 'even' ? h / hgt.mm : scale)));
  return { w, h, note: `${Math.round(hgt.mm / 10)} cm tall (${hgt.source}), ${Math.round(thick.mm)} mm thick (${thick.source})` };
}

function spineHtml(style, item, shelfH) {
  const { b, photo } = item, { w, h, note } = size(b, shelfH, photo);
  const label = esc(b.title + (b.authors ? ' · ' + b.authors.join(', ') : '') + (photo ? ' (photo)' : ' (drawn)') + ' · ' + note);
  if (photo) return `<span class="spine photo" title="${label}" style="width:${w}px;height:${h}px"><img src="../${esc(b.photo.spineThumb || b.photo.spine)}" alt="${label}" loading="lazy"></span>`;
  const d = style.draw(b, w, h, colors(b));
  return `<span class="spine" title="${label}" style="width:${w}px;height:${h}px;background:${d.bg};${d.border ? 'border:' + d.border : ''}">${d.html}</span>`;
}

const shelfH = () => (innerWidth >= 800 ? 220 : 180);

// ---------- rendering ----------

function renderCompare() {
  const items = shelfBooks(18), H = shelfH();
  $('compare').innerHTML = STYLES.map((s, i) => `
    <article class="option">
      <div class="option-head">
        <h2>${i + 1}. ${esc(s.name)}</h2>
        <button class="btn like" type="button" data-like="${s.key}" aria-pressed="${!!likes[s.key]}">${likes[s.key] ? 'Liked' : 'Like'}</button>
        <button class="btn" type="button" data-closer="${s.key}">Look closer</button>
        <p>${esc(s.about)}</p>
      </div>
      <div class="shelf">${items.map(it => spineHtml(s, it, H)).join('')}</div>
    </article>`).join('');
}

function renderCloser() {
  const s = STYLES.find(x => x.key === state.closer);
  $('closer').hidden = !s; $('compare').hidden = !!s;
  if (!s) return;
  $('closerTitle').textContent = s.name;
  $('closerText').textContent = s.about + ' The bookcase holds every physical sample book; the photo setting above decides how many show their real spine.';
  const items = shelfBooks(physical.length), H = shelfH();
  const per = Math.ceil(items.length / 3);
  const names = ['Office › Case 1 › Shelf 1', 'Office › Case 1 › Shelf 2', 'Office › Case 1 › Shelf 3'];
  $('bookcase').innerHTML = `<div class="case">${[0, 1, 2].map(k => `<p class="case-label">${names[k]}</p>
    <div class="shelf">${items.slice(k * per, (k + 1) * per).map(it => spineHtml(s, it, H)).join('')}</div>`).join('')}</div>`;
  // A thin, a middle and a thick book, twice the size, beside one photo.
  const byPages = noPhoto.filter(b => b.pages).sort((a, b) => a.pages - b.pages);
  const picks = [byPages[0], byPages[Math.floor(byPages.length / 2)], byPages[byPages.length - 1]].filter(Boolean);
  const big = Math.round(H * 1.9);
  $('large').innerHTML = picks.map(b => `<div class="large-item">${spineHtml(s, { b }, big)}<span>${b.pages} pages</span></div>`).join('')
    + (withPhoto[0] ? `<div class="large-item">${spineHtml(s, { b: withPhoto[0], photo: true }, big)}<span>photo</span></div>` : '');
}

function renderSummary() {
  const liked = STYLES.filter(s => likes[s.key]).map(s => s.name);
  $('summary').textContent = liked.length ? 'Liked: ' + liked.join(', ') + '.' : 'None yet. Tap "Like" on any style.';
  const notes = { cover: 'Color from the cover: in the app this would be taken from the book\'s cover image automatically. Here the sample books use their cover colors.', palette: 'Cloth palette: each drawn spine gets one of twelve quiet book-cloth colors, chosen by the book (always the same for a book).', house: 'One house color: every drawn spine in forest green and honey.' };
  $('colorNote').textContent = notes[state.color];
}

function render() {
  for (const id of ['color', 'heights', 'mix']) {
    for (const btn of $(id).querySelectorAll('button')) btn.setAttribute('aria-pressed', String(btn.dataset.v === state[id]));
  }
  renderCompare(); renderCloser(); renderSummary();
  store.set('loci-spine-settings', { color: state.color, heights: state.heights, mix: state.mix });
}

// ---------- events ----------

for (const id of ['color', 'heights', 'mix']) {
  $(id).addEventListener('click', e => { const v = e.target.dataset.v; if (v) { state[id] = v; render(); } });
}
document.addEventListener('click', e => {
  const like = e.target.dataset.like, closer = e.target.dataset.closer;
  if (like) { likes = { ...likes, [like]: !likes[like] }; store.set('loci-spine-likes', likes); render(); }
  if (closer) { state.closer = closer; render(); scrollTo({ top: $('closer').offsetTop - 60 }); }
});
$('backToAll').addEventListener('click', () => { state.closer = null; render(); });
$('copy').addEventListener('click', async () => {
  const liked = STYLES.filter(s => likes[s.key]).map(s => s.name).join(', ') || 'none';
  const report = `Drawn spines. Liked: ${liked}. Color: ${state.color}. Heights: ${state.heights}.`;
  try { await navigator.clipboard.writeText(report); $('copy').textContent = 'Copied'; } catch { prompt('Copy this:', report); }
});
const theme = $('theme');
function applyTheme(t) { document.documentElement.dataset.theme = t; theme.textContent = t === 'dark' ? 'Light' : 'Dark'; }
applyTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
theme.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
let lastH = shelfH();
addEventListener('resize', () => { if (shelfH() !== lastH) { lastH = shelfH(); render(); } });

render();
