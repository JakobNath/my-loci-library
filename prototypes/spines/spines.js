// Drawn spine prototype: styles for the spine drawn when a book has no spine
// photo, each shown on a shelf among real spine photos. The newer styles draw
// each kind of binding differently (dust jacket, bare hardcover, paperback,
// leather and so on). Prototype code; the chosen style is rewritten for the
// app in phase 5.

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
const GILT = '#d6b56a';

function colors(b) {
  if (state.color === 'house') return HOUSE;
  if (state.color === 'palette') {
    const bg = CLOTH[Math.floor(rand(b.id, 7) * CLOTH.length)];
    const fg = lum(bg) > 0.55 ? '#2a251e' : '#f1ebdf';
    return { bg, fg, accent: lum(bg) > 0.55 ? '#7a5a22' : GILT };
  }
  const c = b.cover || HOUSE;
  return { bg: c.bg, fg: c.fg, accent: differs(c.accent, c.bg) ? c.accent : c.fg };
}

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

// One made-up library-bound book, since none of the samples is one.
const extraBooks = [{
  id: 'proto-library', kind: 'owned', format: 'physical', title: 'Christian Dogmatics', subtitle: 'Volume 2', authors: ['Francis Pieper'],
  pages: 556, copies: [{ binding: 'Library binding' }], cover: { bg: '#3d2b2b', fg: '#efe6d6', accent: '#efe6d6' },
}, {
  // A journal issue printed as pages 89–132: 44 pages, not 132.
  id: 'proto-journal', kind: 'owned', format: 'physical', title: 'Lutheran Quarterly 38:2',
  pages: 44, copies: [{ binding: 'Journal issue' }], cover: { bg: '#e9e2d0', fg: '#2a251e', accent: '#8a2b2b' },
}];

// ---------- drawing pieces ----------

const fit = (w, max = 15) => Math.max(8, Math.min(max, Math.round(w * 0.5)));
const vtext = (s, css) => `<span class="t" style="${css}">${esc(s)}</span>`;
const box = css => `<span style="position:absolute;${css}"></span>`;
const serif = 'font-family:var(--font-display)';
const sans = 'font-family:var(--font-body)';

// Title and author in the usual places; `top`/`bottom` are percentages.
function words(b, w, { top = 7, bottom = 7, color, authorColor, font = serif, weight = 500, max = 13, authorAt = 'foot' }) {
  const fs = fit(w, max), name = surname(b);
  if (!name) return vtext(b.title, `${font};top:${top}%;bottom:${bottom}%;font-size:${fs}px;font-weight:${weight};color:${color}`);
  const titleBottom = authorAt === 'foot' ? bottom + 22 : bottom;
  return vtext(b.title, `${font};top:${top}%;bottom:${titleBottom}%;font-size:${fs}px;font-weight:${weight};color:${color}`)
    + vtext(name, `${font};bottom:${bottom}%;height:19%;font-size:${Math.max(8, fs - 3)}px;color:${authorColor || color}`);
}

// Short code like a library's spine label: three letters of the author.
const callCode = b => (surname(b) || b.title).slice(0, 3).toUpperCase();

// ---------- binding-aware styles ----------
// Each family draws every kind of binding with its own small cue, so the
// shelf reads like the real one: jackets have bands of design, bare
// hardcovers show headbands, leather has raised bands, and so on.

function lineFamily(tinted) {
  return (b, w, h, c, kind) => {
    const ink = tinted ? `color-mix(in srgb, ${c.bg} 38%, var(--ink))` : 'var(--ink-2)';
    const stroke = tinted ? `color-mix(in srgb, ${c.bg} 45%, var(--muted))` : 'var(--muted)';
    const hair = tinted ? `color-mix(in srgb, ${c.bg} 45%, var(--line))` : 'var(--line)';
    const fill = tinted ? `color-mix(in srgb, ${c.bg} 16%, var(--surface))` : 'var(--surface)';
    let radius = '2px', html = '', top = 7, bottom = 7, font = serif, weight = 500;
    if (kind === 'jacket') {
      html += box(`left:0;right:0;top:9%;height:1px;background:${stroke}`) + box(`left:0;right:0;bottom:9%;height:1px;background:${stroke}`);
      html += box(`left:50%;bottom:3.5%;width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:var(--pop)`);
      top = 12; bottom = 12;
    } else if (kind === 'hardcover') {
      const band = `repeating-linear-gradient(90deg, var(--pop) 0 2px, ${fill} 2px 4px)`;
      html += box(`left:0;right:0;top:0;height:3px;background:${band}`) + box(`left:0;right:0;bottom:0;height:3px;background:${band}`);
      top = 6; bottom = 6;
    } else if (kind === 'paperback' || kind === 'massmarket') {
      radius = kind === 'massmarket' ? '4px' : '1px'; font = sans; weight = 600;
    } else if (kind === 'leather') {
      radius = '4px 4px 2px 2px';
      for (const y of [10, 18, 74, 82]) html += box(`left:0;right:0;top:${y}%;height:3px;border-top:1px solid ${stroke};border-bottom:1px solid ${stroke}`);
      top = 21; bottom = 4;
      return { bg: fill, border: `1px solid ${stroke}`, radius, html: html
        + vtext(b.title, `${serif};top:21%;bottom:28%;font-size:${fit(w, 13)}px;color:${ink}`)
        + (surname(b) ? vtext(surname(b), `${serif};top:85%;bottom:2%;font-size:${Math.max(8, fit(w, 13) - 3)}px;color:${stroke}`) : '') };
    } else if (kind === 'flex') {
      radius = '7px';
      html += box(`inset:3px;border:1px solid var(--pop);border-radius:5px`);
      top = 9; bottom = 9;
    } else if (kind === 'folio') {
      html += box(`left:2px;right:2px;top:8%;bottom:50%;border:1px solid ${stroke}`);
      html += box(`left:50%;bottom:12%;width:6px;height:6px;margin-left:-3px;transform:rotate(45deg);border:1px solid var(--pop)`);
      return { bg: fill, border: `1px solid ${stroke}`, radius, html: html
        + vtext(b.title, `${serif};top:10%;bottom:52%;font-size:${fit(w - 9, 11)}px;color:${ink}`)
        + (surname(b) ? vtext(surname(b), `${serif};top:54%;bottom:22%;font-size:${Math.max(8, fit(w, 12) - 3)}px;color:${stroke}`) : '') };
    } else if (kind === 'library') {
      html += `<span style="position:absolute;left:2px;right:2px;bottom:4%;height:12%;background:var(--surface-2);border:1px solid ${hair};border-radius:2px;display:flex;align-items:center;justify-content:center;${sans};font-size:${Math.max(7, Math.min(10, w / 3.2))}px;font-weight:600;color:${ink}">${esc(callCode(b))}</span>`;
      top = 6; bottom = 20;
      return { bg: fill, border: `1px solid ${stroke}`, radius, html: html + vtext(b.title + (surname(b) ? '  ·  ' + surname(b) : ''), `${serif};top:6%;bottom:19%;font-size:${fit(w, 13)}px;color:${ink}`) };
    } else if (kind === 'journal') {
      font = sans;
      return { bg: fill, border: `1px solid ${hair}`, radius: '1px', html: vtext(b.title, `${sans};top:5%;bottom:5%;font-size:${Math.max(7, fit(w, 10))}px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:${ink}`) };
    }
    return { bg: fill, border: `1px solid ${stroke}`, radius, html: html + words(b, w, { top, bottom, color: ink, authorColor: stroke, font, weight }) };
  };
}

function craftedFamily(b, w, h, c, kind) {
  const fs = fit(w, 13);
  const cloth = `repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px), ${c.bg}`;
  const round = base => `linear-gradient(90deg, ${shade(base, 0.72)}, ${shade(base, 1.15)} 35%, ${base} 65%, ${shade(base, 0.65)})`;
  if (kind === 'jacket') {
    return { bg: `linear-gradient(90deg, rgba(255,255,255,.10), transparent 30% 70%, rgba(0,0,0,.12)), ${c.bg}`,
      html: box(`left:0;right:0;top:0;height:11%;background:${c.accent};opacity:.9`) + words(b, w, { top: 14, bottom: 8, color: c.fg, max: 14, weight: 600 }) };
  }
  if (kind === 'hardcover') {
    const rule = `left:3px;right:3px;height:1px;background:${GILT};opacity:.85`;
    return { bg: cloth, html: box(`${rule};top:6%`) + box(`${rule};top:calc(6% + 3px)`) + box(`${rule};bottom:6%`) + box(`${rule};bottom:calc(6% + 3px)`)
      + words(b, w, { top: 11, bottom: 11, color: GILT }) };
  }
  if (kind === 'paperback' || kind === 'massmarket') {
    return { bg: c.bg, radius: kind === 'massmarket' ? '4px' : '1px', html: words(b, w, { top: 5, bottom: 6, color: c.fg, font: sans, weight: 700, max: 14 }) };
  }
  if (kind === 'leather') {
    const base = shade(c.bg, lum(c.bg) > 0.5 ? 0.5 : 0.78);
    const band = y => box(`left:0;right:0;top:${y}%;height:4px;background:linear-gradient(${shade(base, 1.4)}, ${shade(base, 0.55)})`);
    return { bg: round(base), radius: '4px 4px 2px 2px', html: band(9) + band(18) + band(72) + band(82)
      + vtext(b.title, `${serif};top:21%;bottom:30%;font-size:${fs}px;color:${GILT}`)
      + (surname(b) ? vtext(surname(b), `${serif};top:86%;bottom:2%;font-size:${Math.max(8, fs - 3)}px;color:${GILT}`) : '') };
  }
  if (kind === 'flex') {
    const base = lum(c.bg) > 0.4 ? '#2b2420' : c.bg;
    return { bg: round(base), radius: '8px', html: box(`inset:3px;border:1px solid ${GILT};border-radius:6px;opacity:.8`) + words(b, w, { top: 10, bottom: 10, color: GILT }) };
  }
  if (kind === 'folio') {
    const pattern = `repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 2px, transparent 2px 7px), repeating-linear-gradient(-45deg, rgba(0,0,0,.08) 0 2px, transparent 2px 7px), ${c.bg}`;
    return { bg: pattern, html: box(`left:3px;right:3px;top:8%;bottom:48%;background:${shade(c.bg, 0.7)};border:1px solid ${GILT}`)
      + vtext(b.title, `${serif};top:10%;bottom:50%;font-size:${fit(w - 9, 11)}px;color:${GILT}`)
      + (surname(b) ? vtext(surname(b), `${serif};top:56%;bottom:20%;font-size:${Math.max(8, fs - 3)}px;color:${GILT}`) : '') };
  }
  if (kind === 'library') {
    const base = shade(c.bg, 0.85);
    return { bg: base, html: `<span style="position:absolute;left:2px;right:2px;bottom:4%;height:12%;background:#f4efe4;border-radius:2px;display:flex;align-items:center;justify-content:center;${sans};font-size:${Math.max(7, Math.min(10, w / 3.2))}px;font-weight:700;color:#2a251e">${esc(callCode(b))}</span>`
      + vtext(b.title + (surname(b) ? '  ·  ' + surname(b) : ''), `${serif};top:6%;bottom:19%;font-size:${fs}px;color:${GILT}`) };
  }
  if (kind === 'journal') {
    return { bg: '#ece6d8', radius: '1px', html: vtext(b.title, `${sans};top:5%;bottom:5%;font-size:${Math.max(7, fit(w, 10))}px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#3a342b`) };
  }
  return { bg: cloth, html: words(b, w, { color: c.fg }) };
}

function houseFamily(b, w, h, c, kind) {
  // The app's own colors, one shade per kind of binding.
  const forest = '#2e4a3d', deep = '#223a2f', brown = '#4a3426', ivory = '#efe8da', honey = '#dcb76f', ink = '#2a251e';
  const fs = fit(w, 13);
  const rule = color => box(`left:3px;right:3px;top:7%;height:1px;background:${color}`) + box(`left:3px;right:3px;bottom:7%;height:1px;background:${color}`);
  switch (kind) {
    case 'jacket': return { bg: forest, html: box(`left:0;right:0;top:0;height:9%;background:${honey}`) + words(b, w, { top: 12, bottom: 7, color: '#f3ede1', authorColor: honey }) };
    case 'hardcover': return { bg: deep, html: rule(honey) + words(b, w, { top: 10, bottom: 10, color: honey }) };
    case 'paperback': case 'massmarket':
      return { bg: ivory, border: '1px solid #d9d0bf', radius: kind === 'massmarket' ? '4px' : '1px', html: words(b, w, { top: 5, bottom: 6, color: forest, font: sans, weight: 700 }) };
    case 'leather': {
      const band = y => box(`left:0;right:0;top:${y}%;height:3px;background:linear-gradient(${shade(brown, 1.4)}, ${shade(brown, 0.6)})`);
      return { bg: brown, radius: '4px 4px 2px 2px', html: band(10) + band(18) + band(74) + band(82)
        + vtext(b.title, `${serif};top:21%;bottom:28%;font-size:${fs}px;color:${honey}`) };
    }
    case 'flex': return { bg: '#1f1d1a', radius: '8px', html: box(`inset:3px;border:1px solid ${honey};border-radius:6px`) + words(b, w, { top: 10, bottom: 10, color: honey }) };
    case 'folio': return { bg: forest, html: box(`left:3px;right:3px;top:8%;bottom:50%;background:${ivory}`)
      + vtext(b.title, `${serif};top:10%;bottom:52%;font-size:${fit(w - 9, 11)}px;color:${ink}`)
      + box(`left:50%;bottom:12%;width:6px;height:6px;margin-left:-3px;transform:rotate(45deg);background:${honey}`) };
    case 'library': return { bg: deep, html: `<span style="position:absolute;left:2px;right:2px;bottom:4%;height:12%;background:${ivory};border-radius:2px;display:flex;align-items:center;justify-content:center;${sans};font-size:${Math.max(7, Math.min(10, w / 3.2))}px;font-weight:700;color:${ink}">${esc(callCode(b))}</span>`
      + vtext(b.title, `${serif};top:6%;bottom:19%;font-size:${fs}px;color:${honey}`) };
    case 'journal': return { bg: ivory, border: '1px solid #d9d0bf', radius: '1px', html: vtext(b.title, `${sans};top:5%;bottom:5%;font-size:${Math.max(7, fit(w, 10))}px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${forest}`) };
    default: return { bg: forest, html: words(b, w, { color: honey }) };
  }
}

// ---------- earlier single-look styles, kept for comparison ----------

function clothAndGilt(b, w, h, c) {
  const fs = fit(w, 14), rule = `left:3px;right:3px;height:1px;background:${c.accent};opacity:.8`;
  return {
    bg: `repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px), ${c.bg}`,
    html: box(`${rule};top:7%`) + box(`${rule};top:calc(7% + 3px)`) + box(`${rule};bottom:7%`) + box(`${rule};bottom:calc(7% + 3px)`)
      + words(b, w, { top: 13, bottom: 12, color: c.accent, max: 14 }),
  };
}
function leatherAndBands(b, w, h, c) { return craftedFamily(b, w, h, c, 'leather'); }
function houseStyle(b, w) {
  const m = Math.max(8, Math.min(13, w - 8));
  return { bg: HOUSE.bg, html: words(b, w, { top: 7, bottom: 16, color: HOUSE.accent, authorColor: HOUSE.fg })
    + `<span style="position:absolute;left:50%;bottom:${Math.round(m * 0.6)}px;transform:translateX(-50%);width:${m}px;height:${m}px;border-radius:2px;background:${HOUSE.accent};color:${HOUSE.bg};font:700 ${Math.round(m * 0.72)}px/${m}px var(--font-display);text-align:center">L</span>` };
}
function outlineOnly(b, w) {
  return { bg: 'var(--surface)', border: '1px dashed var(--muted)', html: words(b, w, { top: 6, bottom: 6, color: 'var(--ink-2)', authorColor: 'var(--muted)' }) };
}

const STYLES = [
  { key: 'line', group: 'new', name: 'Line, by binding', draw: lineFamily(false),
    about: 'Grown from "Outline only": a fine solid line in the app\'s own ink, ivory inside, and one small cue per binding. Jackets get two design bands and a honey dot; bare hardcovers show honey headbands; paperbacks set the title in sans serif; leather has raised bands; Bibles have rounded corners and a honey border; Folio cloth has a title panel and a small diamond; library bindings carry a call label. Follows light and dark mode.' },
  { key: 'tint', group: 'new', name: 'Tinted line, by binding', draw: lineFamily(true),
    about: 'The same drawing, washed with a little of each book\'s own color, and its lines and type taken from that color. Still quiet and modern, with a hint of the real shelf.' },
  { key: 'crafted', group: 'new', name: 'Crafted, by binding', draw: craftedFamily,
    about: 'Grown from "Cloth and gilt" and "Leather and bands": each binding drawn as it really looks. Glossy jackets with a design band, gilt-ruled cloth, flat paperbacks, rounded leather with bands, patterned Folio cloth, buckram with a call label.' },
  { key: 'house2', group: 'new', name: 'House colors, by binding', draw: houseFamily,
    about: 'Grown from "House style": only forest, deep green, leather brown, ivory and honey, one combination per binding. Every drawn spine clearly belongs to the app; ignores the color setting.' },
  { key: 'cloth', group: 'old', name: 'Cloth and gilt', draw: clothAndGilt, about: 'Earlier style: every book as gilt-ruled cloth.' },
  { key: 'leather', group: 'old', name: 'Leather and bands', draw: leatherAndBands, about: 'Earlier style: every book as banded leather.' },
  { key: 'house', group: 'old', name: 'House style', draw: houseStyle, about: 'Earlier style: every book in forest green with honey type and the L mark.' },
  { key: 'outline', group: 'old', name: 'Outline only', draw: outlineOnly, about: 'Earlier style, the favorite so far: a dashed outline and the title.' },
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
  const w = Math.max(photo ? 6 : 12, Math.round(thick.mm * (state.heights === 'even' ? h / hgt.mm : scale)));
  return { w, h, note: `${Math.round(hgt.mm / 10)} cm tall (${hgt.source}), ${Math.round(thick.mm)} mm thick (${thick.source})` };
}

function spineHtml(style, item, shelfH) {
  const { b, photo } = item, { w, h, note } = size(b, shelfH, photo);
  const kind = kindOf(b);
  const label = esc(b.title + (b.authors ? ' · ' + b.authors.join(', ') : '') + ' · ' + (photo ? 'photo' : 'drawn, ' + KINDS[kind].toLowerCase()) + ' · ' + note);
  if (photo) return `<span class="spine photo" title="${label}" style="width:${w}px;height:${h}px"><img src="../${esc(b.photo.spineThumb || b.photo.spine)}" alt="${label}" loading="lazy"></span>`;
  const d = style.draw(b, w, h, colors(b), kind);
  return `<span class="spine${d.border ? ' drawn-line' : ''}" title="${label}" style="width:${w}px;height:${h}px;background:${d.bg};${d.border ? 'border:' + d.border + ';' : ''}${d.radius ? 'border-radius:' + d.radius + ';' : ''}">${d.html}</span>`;
}

const shelfH = () => (innerWidth >= 800 ? 220 : 180);

// ---------- rendering ----------

function optionHtml(s, i, items, H) {
  return `
    <article class="option${s.group === 'old' ? ' old' : ''}">
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
  // Every kind of binding, drawn in each new style, side by side.
  const samples = Object.keys(KINDS).map(k => noPhoto.find(b => kindOf(b) === k)).filter(Boolean);
  const H = 170;
  $('gallery').innerHTML = `<div class="gallery-scroll"><table class="gallery">
    <tr><th></th>${samples.map(b => `<th>${esc(KINDS[kindOf(b)])}</th>`).join('')}</tr>
    ${STYLES.filter(s => s.group === 'new').map(s => `<tr><th>${esc(s.name)}</th>${samples.map(b => `<td>${spineHtml(s, { b }, H)}</td>`).join('')}</tr>`).join('')}
  </table></div>`;
}

function renderCompare() {
  const items = shelfBooks(20), H = shelfH();
  const fresh = STYLES.filter(s => s.group === 'new'), old = STYLES.filter(s => s.group === 'old');
  $('compare').innerHTML = fresh.map((s, i) => optionHtml(s, i, items, H)).join('')
    + `<h2 class="group-title">Earlier styles, for comparison</h2>`
    + old.map((s, i) => optionHtml(s, fresh.length + i, items, H)).join('');
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
  const notes = { cover: 'Color from the cover: in the app this would be taken from the book\'s cover image automatically. Here the sample books use their cover colors. "Line, by binding" uses the app\'s own ink whatever this setting says.', palette: 'Cloth palette: each drawn spine gets one of twelve quiet book-cloth colors, chosen by the book (always the same for a book).', house: 'One house color: every drawn spine in forest green and honey.' };
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
