// Drawn spine prototype: styles for the spine drawn when a book has no spine
// photo, each shown on a shelf among real spine photos. Three of the styles
// draw each kind of binding differently (dust jacket, bare hardcover,
// paperback, leather and so on). Prototype code; the chosen style is
// rewritten for the app in phase 5.

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
const differs = (a, b) => Math.abs(lum(a) - lum(b)) > 0.28;
const surname = b => { const a = (b.authors && b.authors[0]) || ''; return a.split(' ').pop(); };

// Book-cloth colors for the "cloth palette" choice: quiet, like real bindings.
const CLOTH = ['#6b2a2a', '#2e4a3d', '#26364f', '#5b5a35', '#4a5560', '#6a4a32', '#4a3346', '#2f5552', '#9a7434', '#cfc6b4', '#7a3b2e', '#33402f'];
const HOUSE = { bg: '#2e4a3d', fg: '#f3ede1', accent: '#dcb76f' };
const GILT = '#e0c27a';

function colors(b) {
  if (state.color === 'house') return HOUSE;
  if (state.color === 'palette') {
    const bg = CLOTH[Math.floor(rand(b.id, 7) * CLOTH.length)];
    const fg = lum(bg) > 0.55 ? '#2a251e' : '#f1ebdf';
    return { bg, fg, accent: lum(bg) > 0.55 ? '#7a5a22' : GILT };
  }
  const c = b.cover || HOUSE;
  // Text must stand out from its background: fall back to black or ivory.
  const fg = differs(c.fg, c.bg) ? c.fg : (lum(c.bg) > 0.5 ? '#1f1b16' : '#f6f1e6');
  return { bg: c.bg, fg, accent: differs(c.accent, c.bg) ? c.accent : fg };
}
// Gilt on light cloth is unreadable, so light cloth gets dark lettering.
const giltOn = bg => (lum(bg) > 0.55 ? '#3a2e1a' : GILT);

// ---------- kinds of binding ----------
// In the app the kind would come from the copy's binding, picked from the
// list we build ("Hardcover with dust jacket", "Paperback", "Leather"...).
// The sample data does not say which hardcovers have jackets, so they are
// assigned here by hand.

const KINDS = {
  jacket: 'Hardcover, dust jacket', hardcover: 'Hardcover', paperback: 'Paperback', massmarket: 'Mass-market paperback',
  leather: 'Leather', flex: 'Flexible leather (Bibles)', folio: 'Fine cloth (Folio Society)', library: 'Library binding', journal: 'Journal issue',
};
const KIND_OF = {
  'chemnitz-trent-1': 'jacket', 'chemnitz-loci-1': 'jacket', 'chemnitz-enchiridion': 'jacket', 'apostolic-fathers': 'jacket', 'anf-1': 'jacket',
  'loeb-36': 'jacket', 'real-twotowers': 'jacket', 'real-dangers': 'jacket', 'real-wbc20': 'jacket',
  na28: 'hardcover', 'treasury-daily-prayer': 'hardcover', triglotta: 'hardcover', 'pieper-1': 'hardcover', 'real-hebrew': 'hardcover', 'real-graff': 'hardcover', 'real-bente': 'hardcover',
  'tolstoy-stories-1': 'folio', 'tolstoy-stories-2': 'folio', 'tolstoy-stories-3': 'folio', 'dickens-copperfield': 'folio',
  'republic-easton': 'leather', 'imitation-custom': 'leather', nkjv: 'flex', 'real-ubs': 'flex',
  'confessions-pine-coffin': 'massmarket', 'real-ctq': 'journal', 'proto-journal': 'journal', 'proto-library': 'library',
};
const kindOf = b => KIND_OF[b.id] || (/paperback/i.test((b.copies && b.copies[0] && b.copies[0].binding) || '') || b.id.startsWith('real-') ? 'paperback' : 'hardcover');

const extraBooks = [{
  // A made-up library-bound book, since none of the samples is one.
  id: 'proto-library', kind: 'owned', format: 'physical', title: 'Christian Dogmatics', subtitle: 'Volume 2', authors: ['Francis Pieper'],
  pages: 556, copies: [{ binding: 'Library binding' }], cover: { bg: '#3d2b2b', fg: '#efe6d6', accent: '#efe6d6' },
}, {
  // A journal issue printed as pages 89–132: 44 pages, not 132.
  id: 'proto-journal', kind: 'owned', format: 'physical', title: 'Lutheran Quarterly 38:2',
  pages: 44, copies: [{ binding: 'Journal issue' }], cover: { bg: '#e9e2d0', fg: '#2a251e', accent: '#8a2b2b' },
}];

// ---------- lettering ----------
// Titles are sized to fit their spine: as large as the spine's width allows,
// then smaller until the whole title fits, in two columns when the spine is
// wide enough. Only as a last resort is a title shortened. No ornament is
// ever drawn across the text area.

const FONTS = { serif: 'var(--font-display)', sans: 'var(--font-body)' };

// Measures text exactly with a hidden canvas (cached), so a title is never
// guessed to fit when it does not.
const ruler = document.createElement('canvas').getContext('2d');
const measured = new Map();
function textLength(text, font, fs, weight) {
  const key = font + weight + fs + text;
  if (!measured.has(key)) {
    const family = getComputedStyle(document.documentElement).getPropertyValue(font === 'serif' ? '--font-display' : '--font-body');
    ruler.font = `${weight} ${fs}px ${family}`;
    measured.set(key, ruler.measureText(text).width);
  }
  return measured.get(key);
}
// The best place to break a title into two columns: the space nearest the middle.
function splitInTwo(text) {
  let best = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === ' ' && (best < 0 || Math.abs(i - text.length / 2) < Math.abs(best - text.length / 2))) best = i;
  return best < 0 ? null : [text.slice(0, best), text.slice(best + 1)];
}

function layout(text, w, length, font, maxFs, minFs, weight) {
  const room = w - 4;
  const top = Math.max(7, Math.min(maxFs, room));
  const floor = Math.min(minFs, top);
  const halves = splitInTwo(text);
  for (let fs = top; fs >= floor; fs -= 0.5) {
    if (textLength(text, font, fs, weight) <= length) return { fs, lines: [text] };
    if (halves && room >= 2 * fs * 1.15 && Math.max(...halves.map(t => textLength(t, font, fs, weight))) <= length) return { fs, lines: halves };
  }
  // Last resort: shorten the title until it fits on one line.
  let cut = text;
  while (cut.length > 1 && textLength(cut + '…', font, floor, weight) > length) cut = cut.slice(0, -1);
  return { fs: floor, lines: [cut.trimEnd() + '…'], shortened: true };
}

function vblock(text, w, h, { top, bottom, font = 'serif', color, weight = 500, maxFs = 15, minFs = 10 }) {
  const length = h * (100 - top - bottom) / 100 - 4;
  const t = layout(text, w, length, font, maxFs, minFs, weight);
  return {
    fits: !t.shortened,
    html: `<span class="vbox" style="top:${top}%;bottom:${bottom}%"><span class="vt" style="font-family:${FONTS[font]};font-size:${t.fs}px;font-weight:${weight};color:${color}">${t.lines.map(esc).join('<br>')}</span></span>`,
  };
}

// Title over author. If the title would have to be shortened, the author is
// left off and the title gets the whole space.
function words(b, w, h, { top = 7, bottom = 7, color, authorColor, font = 'serif', weight = 500, maxFs = 15 }) {
  const name = surname(b);
  if (name) {
    const title = vblock(b.title, w, h, { top, bottom: bottom + 21, font, color, weight, maxFs });
    const author = vblock(name, w, h, { top: 100 - bottom - 18, bottom, font, color: authorColor || color, weight: 400, maxFs: Math.min(12, maxFs - 2), minFs: 9 });
    // A shortened name reads worse than none, so it is left off.
    if (title.fits) return title.html + (author.fits ? author.html : '');
  }
  return vblock(b.title, w, h, { top, bottom, font, color, weight, maxFs }).html;
}

const box = css => `<span style="position:absolute;${css}"></span>`;
const callCode = b => (surname(b) || b.title).slice(0, 3).toUpperCase();
const callLabel = (b, w, bg, ink, line) => `<span style="position:absolute;left:2px;right:2px;bottom:4%;height:12%;background:${bg};${line ? 'border:1px solid ' + line + ';' : ''}border-radius:2px;display:flex;align-items:center;justify-content:center;font-family:var(--font-body);font-size:${Math.max(8, Math.min(11, (w - 6) / 2.4))}px;font-weight:700;color:${ink}">${esc(callCode(b))}</span>`;

// ---------- the styles ----------

function lineFamily(tinted) {
  return (b, w, h, c, kind) => {
    const ink = tinted ? `color-mix(in srgb, ${c.bg} 30%, var(--ink))` : 'var(--ink)';
    const soft = tinted ? `color-mix(in srgb, ${c.bg} 30%, var(--ink-2))` : 'var(--ink-2)';
    const stroke = tinted ? `color-mix(in srgb, ${c.bg} 50%, var(--muted))` : 'var(--muted)';
    const fill = tinted ? `color-mix(in srgb, ${c.bg} 14%, var(--surface))` : 'var(--surface)';
    const panel = tinted ? `color-mix(in srgb, ${c.bg} 26%, var(--surface))` : 'var(--surface-2)';
    const out = { bg: fill, border: `1px solid ${stroke}`, radius: '2px' };
    const text = (top, bottom, extra = {}) => words(b, w, h, { top, bottom, color: ink, authorColor: soft, ...extra });
    switch (kind) {
      case 'jacket':
        return { ...out, html: box(`left:0;right:0;top:7%;height:1px;background:${stroke}`) + box(`left:0;right:0;bottom:7%;height:1px;background:${stroke}`)
          + box(`left:50%;bottom:2.5%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:var(--pop)`) + text(10, 10) };
      case 'hardcover': {
        const band = `repeating-linear-gradient(90deg, var(--pop) 0 2px, transparent 2px 4px)`;
        return { ...out, html: box(`left:0;right:0;top:0;height:3px;background:${band}`) + box(`left:0;right:0;bottom:0;height:3px;background:${band}`) + text(5, 5) };
      }
      case 'paperback': return { ...out, radius: '1px', html: text(4, 4, { font: 'sans', weight: 600, maxFs: 14 }) };
      case 'massmarket': return { ...out, radius: '5px', html: text(5, 5, { font: 'sans', weight: 600, maxFs: 13 }) };
      case 'leather':
        return { ...out, radius: '5px 5px 2px 2px', html: [9, 15, 85, 91].map(y => box(`left:0;right:0;top:${y}%;height:3px;border-top:1px solid ${stroke};border-bottom:1px solid ${stroke}`)).join('')
          + vblock(b.title, w, h, { top: 18, bottom: 18, color: ink }).html };
      case 'flex':
        return { ...out, radius: '8px', html: box(`left:4px;right:4px;top:4%;height:1px;background:var(--pop)`) + box(`left:4px;right:4px;bottom:4%;height:1px;background:var(--pop)`) + text(7, 7) };
      case 'folio':
        let title = vblock(b.title, w, h, { top: 3, bottom: 40, color: ink }), panelH = 62;
        const name = surname(b) && title.fits ? vblock(surname(b), w, h, { top: 66, bottom: 13, color: soft, maxFs: 12, minFs: 9 }) : null;
        if (!title.fits) { title = vblock(b.title, w, h, { top: 3, bottom: 15, color: ink }); panelH = 87; }
        return { ...out, html: box(`left:0;right:0;top:0;height:${panelH}%;background:${panel}`) + title.html
          + (name && name.fits ? name.html : '')
          + box(`left:50%;bottom:5%;width:6px;height:6px;margin-left:-3px;transform:rotate(45deg);background:var(--pop)`) };
      case 'library':
        return { ...out, html: callLabel(b, w, panel, ink, stroke) + vblock(b.title, w, h, { top: 4, bottom: 19, color: ink }).html };
      case 'journal':
        return { ...out, border: `1px solid ${stroke}`, radius: '1px', html: vblock(b.title, w, h, { top: 4, bottom: 4, font: 'sans', color: ink, weight: 600, maxFs: 12, minFs: 9 }).html };
      default: return { ...out, html: text(6, 6) };
    }
  };
}

function craftedFamily(b, w, h, c, kind) {
  const cloth = `repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px), ${c.bg}`;
  const round = base => `linear-gradient(90deg, ${shade(base, 0.72)}, ${shade(base, 1.15)} 35%, ${base} 65%, ${shade(base, 0.65)})`;
  switch (kind) {
    case 'jacket':
      return { bg: `linear-gradient(90deg, rgba(255,255,255,.10), transparent 30% 70%, rgba(0,0,0,.12)), ${c.bg}`,
        html: box(`left:0;right:0;top:0;height:8%;background:${c.accent}`) + words(b, w, h, { top: 11, bottom: 5, color: c.fg, weight: 600 }) };
    case 'hardcover': {
      const gilt = giltOn(c.bg), rule = `left:3px;right:3px;height:1px;background:${gilt};opacity:.85`;
      return { bg: cloth, html: box(`${rule};top:4%`) + box(`${rule};top:calc(4% + 3px)`) + box(`${rule};bottom:4%`) + box(`${rule};bottom:calc(4% + 3px)`)
        + words(b, w, h, { top: 9, bottom: 9, color: gilt }) };
    }
    case 'paperback': case 'massmarket':
      return { bg: c.bg, radius: kind === 'massmarket' ? '5px' : '1px', html: words(b, w, h, { top: 4, bottom: 4, color: c.fg, font: 'sans', weight: 600, maxFs: 14 }) };
    case 'leather': {
      const base = shade(c.bg, lum(c.bg) > 0.5 ? 0.5 : 0.78);
      const band = y => box(`left:0;right:0;top:${y}%;height:4px;background:linear-gradient(${shade(base, 1.4)}, ${shade(base, 0.55)})`);
      return { bg: round(base), radius: '5px 5px 2px 2px', html: band(8) + band(14) + band(84) + band(90) + vblock(b.title, w, h, { top: 18, bottom: 18, color: GILT }).html };
    }
    case 'flex': {
      const base = lum(c.bg) > 0.4 ? '#2b2420' : c.bg;
      return { bg: round(base), radius: '8px', html: box(`left:4px;right:4px;top:4%;height:1px;background:${GILT}`) + box(`left:4px;right:4px;bottom:4%;height:1px;background:${GILT}`)
        + words(b, w, h, { top: 7, bottom: 7, color: GILT }) };
    }
    case 'folio': {
      const pattern = `repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 2px, transparent 2px 7px), repeating-linear-gradient(-45deg, rgba(0,0,0,.08) 0 2px, transparent 2px 7px), ${c.bg}`;
      const label = shade(c.bg, 0.6);
      let title = vblock(b.title, w, h, { top: 3, bottom: 40, color: giltOn(label) }), panelH = 62;
      const name = surname(b) && title.fits ? vblock(surname(b), w, h, { top: 66, bottom: 6, color: giltOn(c.bg), maxFs: 12, minFs: 9 }) : null;
      if (!title.fits) { title = vblock(b.title, w, h, { top: 3, bottom: 15, color: giltOn(label) }); panelH = 87; }
      return { bg: pattern, html: box(`left:0;right:0;top:0;height:${panelH}%;background:${label}`) + title.html
        + (name && name.fits ? name.html : '') };
    }
    case 'library': {
      const base = shade(c.bg, 0.85);
      return { bg: base, html: callLabel(b, w, '#f4efe4', '#2a251e') + vblock(b.title, w, h, { top: 4, bottom: 19, color: giltOn(base) }).html };
    }
    case 'journal':
      return { bg: '#ece6d8', radius: '1px', html: vblock(b.title, w, h, { top: 4, bottom: 4, font: 'sans', color: '#2a251e', weight: 700, maxFs: 12, minFs: 9 }).html };
    default: return { bg: cloth, html: words(b, w, h, { color: c.fg }) };
  }
}

function outlineOnly(b, w, h) {
  return { bg: 'var(--surface)', border: '1px dashed var(--muted)', html: words(b, w, h, { top: 5, bottom: 5, color: 'var(--ink)', authorColor: 'var(--ink-2)' }) };
}

const STYLES = [
  { key: 'line', name: 'Line, by binding', draw: lineFamily(false),
    about: 'Grown from "Outline only": a fine solid line in the app\'s own ink, ivory inside, and one small cue per binding. Jackets get two design bands and a honey dot; bare hardcovers show honey headbands; paperbacks set the title in sans serif; leather has raised bands; Bibles have rounded corners and honey rules; Folio cloth has a title panel and a small diamond; library bindings carry a call label. Follows light and dark mode.' },
  { key: 'tint', name: 'Tinted line, by binding', draw: lineFamily(true),
    about: 'The same drawing, washed with a little of each book\'s own color, and its lines and type taken from that color. Still quiet and modern, with a hint of the real shelf.' },
  { key: 'crafted', name: 'Crafted, by binding', draw: craftedFamily,
    about: 'Each binding drawn as it really looks: glossy jackets with a design band, gilt-ruled cloth, flat paperbacks, rounded leather with bands, patterned Folio cloth with a darker title panel, buckram with a call label.' },
  { key: 'outline', name: 'Outline only', draw: outlineOnly,
    about: 'A dashed outline and the title, the same for every binding. A quiet placeholder that lets the real spines stand out.' },
];

// ---------- the books on the shelves ----------

const physical = [...books.filter(b => b.kind !== 'wish' && b.format !== 'logos'), ...extraBooks];
const withPhoto = physical.filter(b => b.photo && b.photo.spine);
const noPhoto = physical.filter(b => !(b.photo && b.photo.spine));

function shelfBooks(count) {
  const photos = { none: 0, some: 3, many: withPhoto.length }[state.mix];
  const chosenPhotos = withPhoto.slice().sort((a, b) => rand(a.id, 3) - rand(b.id, 3)).slice(0, photos);
  // Make sure every kind of binding appears on the comparison shelf.
  const byKind = Object.keys(KINDS).map(k => noPhoto.find(b => kindOf(b) === k)).filter(Boolean);
  const rest = noPhoto.filter(b => !byKind.includes(b)).sort((a, b) => rand(a.id, 5) - rand(b.id, 5));
  const drawn = [...byKind, ...rest].slice(0, Math.max(0, count - chosenPhotos.length));
  const extra = state.mix === 'none' ? withPhoto.slice(0, Math.max(0, count - drawn.length)) : [];
  return [...chosenPhotos.map(b => ({ b, photo: true })), ...drawn.map(b => ({ b })), ...extra.map(b => ({ b }))]
    .sort((x, y) => rand(x.b.id, 11) - rand(y.b.id, 11));
}

// ---------- sizes, following the plan's "Book sizes" rules ----------

// Heights from Library of Congress records for sample ISBNs (checked 9 Nov 2026).
const CATALOG_CM = { '9780199537822': 20, '9780809128389': 23, '9780674990401': 17, '9780758615404': 24 };
const TYPICAL_MM = { jacket: 235, hardcover: 235, paperback: 215, massmarket: 178, leather: 235, flex: 220, folio: 230, library: 240, journal: 230 };
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

function spineHtml(style, item, shelfH) {
  const { b, photo } = item, { w, h, note } = size(b, shelfH, photo);
  const kind = kindOf(b);
  const label = esc(b.title + (b.authors ? ' · ' + b.authors.join(', ') : '') + ' · ' + (photo ? 'photo' : 'drawn, ' + KINDS[kind].toLowerCase()) + ' · ' + note);
  if (photo) return `<span class="spine photo" title="${label}" style="width:${w}px;height:${h}px"><img src="../${esc(b.photo.spineThumb || b.photo.spine)}" alt="${label}" loading="lazy"></span>`;
  const d = style.draw(b, w, h, colors(b), kind);
  return `<span class="spine" title="${label}" style="width:${w}px;height:${h}px;background:${d.bg};${d.border ? 'border:' + d.border + ';' : ''}${d.radius ? 'border-radius:' + d.radius + ';' : ''}">${d.html}</span>`;
}

const shelfH = () => (innerWidth >= 800 ? 230 : 200);

// ---------- rendering ----------

function optionHtml(s, i, items, H) {
  return `
    <article class="option">
      <div class="option-head">
        <h2>${i + 1}. ${esc(s.name)}</h2>
        <button class="btn like" type="button" data-like="${s.key}" aria-pressed="${!!likes[s.key]}">${likes[s.key] ? 'Liked' : 'Like'}</button>
        <button class="btn" type="button" data-closer="${s.key}">Look closer</button>
        <p>${esc(s.about)}</p>
      </div>
      <div class="shelf">${items.map(it => spineHtml(s, it, H)).join('')}</div>
    </article>`;
}

function renderGallery() {
  // Every kind of binding, drawn in each style, side by side.
  const samples = Object.keys(KINDS).map(k => noPhoto.find(b => kindOf(b) === k)).filter(Boolean);
  const H = 190;
  $('gallery').innerHTML = `<div class="gallery-scroll"><table class="gallery">
    <tr><th></th>${samples.map(b => `<th>${esc(KINDS[kindOf(b)])}</th>`).join('')}</tr>
    ${STYLES.map(s => `<tr><th>${esc(s.name)}</th>${samples.map(b => `<td>${spineHtml(s, { b }, H)}</td>`).join('')}</tr>`).join('')}
  </table></div>`;
}

function renderCompare() {
  const items = shelfBooks(20), H = shelfH();
  $('compare').innerHTML = STYLES.map((s, i) => optionHtml(s, i, items, H)).join('');
}

function renderCloser() {
  const s = STYLES.find(x => x.key === state.closer);
  $('closer').hidden = !s; $('compare').hidden = !!s; $('galleryWrap').hidden = !!s;
  if (!s) return;
  $('closerTitle').textContent = s.name;
  $('closerText').textContent = s.about + ' The bookcase holds every physical sample book; the photo setting above decides how many show their real spine.';
  const items = shelfBooks(physical.length), H = shelfH();
  const per = Math.ceil(items.length / 3);
  const names = ['Office › Case 1 › Shelf 1', 'Office › Case 1 › Shelf 2', 'Office › Case 1 › Shelf 3'];
  $('bookcase').innerHTML = `<div class="case">${[0, 1, 2].map(k => `<p class="case-label">${names[k]}</p>
    <div class="shelf">${items.slice(k * per, (k + 1) * per).map(it => spineHtml(s, it, H)).join('')}</div>`).join('')}</div>`;
  const picks = Object.keys(KINDS).map(k => noPhoto.find(b => kindOf(b) === k)).filter(Boolean);
  const big = Math.round(H * 1.6);
  $('large').innerHTML = picks.map(b => `<div class="large-item">${spineHtml(s, { b }, big)}<span>${esc(KINDS[kindOf(b)])}</span></div>`).join('')
    + (withPhoto[0] ? `<div class="large-item">${spineHtml(s, { b: withPhoto[0], photo: true }, big)}<span>Photo</span></div>` : '');
}

function renderSummary() {
  const liked = STYLES.filter(s => likes[s.key]).map(s => s.name);
  $('summary').textContent = liked.length ? 'Liked: ' + liked.join(', ') + '.' : 'None yet. Tap "Like" on any style.';
  const notes = { cover: 'Color from the cover: in the app this would be taken from the book\'s cover image automatically. Here the sample books use their cover colors. "Line, by binding" and "Outline only" use the app\'s own ink whatever this setting says.', palette: 'Cloth palette: each drawn spine gets one of twelve quiet book-cloth colors, chosen by the book (always the same for a book).', house: 'One house color: every drawn spine in forest green and honey.' };
  $('colorNote').textContent = notes[state.color];
}

function render() {
  for (const id of ['color', 'heights', 'mix']) {
    for (const btn of $(id).querySelectorAll('button')) btn.setAttribute('aria-pressed', String(btn.dataset.v === state[id]));
  }
  renderGallery(); renderCompare(); renderCloser(); renderSummary();
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
