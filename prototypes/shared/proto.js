// Shared behaviour for the five design prototypes. Each option page calls
// start({ ... }) with its name and a few layout choices; everything visual
// comes from that option's tokens.css and option.css.
// Throwaway prototype code: the real app is written from scratch in phase 5.

import { books as sampleBooks, scanSamples } from './sample-books.js';
import { logos } from './logos.js';

const books = sampleBooks.map(b => ({ ...b }));
const byId = id => books.find(b => b.id === id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = new Date().toISOString().slice(0, 10);

let cfg;
const state = {
  view: 'grid', sort: 'title', format: 'physical', needsDate: false, showGone: false,
  q: '', add: null, stack: [], expanded: {},
};

// ---------- dates ----------

const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const century = y => (y > 0 ? Math.ceil(y / 100) : Math.ceil(-y / 100));

function centuryRange(from, to) {
  const a = century(from), b = century(to);
  const ea = from < 0 ? 'BC' : 'AD', eb = to < 0 ? 'BC' : 'AD';
  if (ea !== eb) return `${ord(a)} c. BC – ${ord(b)} c. AD`;
  return a === b ? `${ord(a)} c. ${ea}` : `${ord(a)}–${ord(b)} c. ${ea}`;
}

function anthologyInfo(b) {
  if (!b.contents) return null;
  const dated = b.contents.filter(c => c.from != null);
  const missing = b.contents.length - dated.length;
  if (!dated.length) return { label: null, missing, count: b.contents.length };
  const from = Math.min(...dated.map(c => c.from));
  const to = Math.max(...dated.map(c => c.to ?? c.from));
  return { from, to, label: `${centuryRange(from, to)} (${b.contents.length} works)`, missing, count: b.contents.length };
}

function sortYear(b) {
  if (b.from != null) return b.from;
  const a = anthologyInfo(b);
  return a && a.from != null ? a.from : null;
}

function dateLabel(b) {
  if (b.date) return b.date;
  const a = anthologyInfo(b);
  if (a && a.label) return a.label;
  return null;
}

// A small reader for the date field preview in batch add. The real parser,
// with tests, is part of the core module in phase 3.
export function readDate(text) {
  let t = text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[-‒–—]/g, '–');
  if (!t) return null;
  let bc = /\b(bc|bce|b\.c\.)\s*$/.test(t);
  t = t.replace(/\s*\b(bc|bce|b\.c\.|ad|ce|a\.d\.)\s*$/, '').replace(/^(ad|a\.d\.) /, '');
  const sign = y => (bc ? -y : y);
  let m;
  if ((m = t.match(/^(early|mid|late)[- ]?(\d+)(st|nd|rd|th) c(entury|\.)?$/))) {
    const c = +m[2], start = bc ? -(c * 100) : (c - 1) * 100 + 1;
    const third = Math.floor(100 / 3), i = { early: 0, mid: 1, late: 2 }[m[1]];
    let a = start + i * third, z = i === 2 ? start + 99 : start + (i + 1) * third - 1;
    if (!bc && i === 0) z = start + 32;
    return { from: a, to: z, certainty: 'century' };
  }
  if ((m = t.match(/^(\d+)(st|nd|rd|th)?(?: c\.?)?–(\d+)(st|nd|rd|th) c(entury|\.)?$/))) {
    const a = +m[1], z = +m[3];
    return bc ? { from: -(a * 100), to: -((z - 1) * 100 + 1), certainty: 'century' } : { from: (a - 1) * 100 + 1, to: z * 100, certainty: 'century' };
  }
  if ((m = t.match(/^(\d+)(st|nd|rd|th) c(entury|\.)?$/))) {
    const c = +m[1];
    return bc ? { from: -(c * 100), to: -((c - 1) * 100 + 1), certainty: 'century' } : { from: (c - 1) * 100 + 1, to: c * 100, certainty: 'century' };
  }
  if ((m = t.match(/^after (\d+)$/))) return { from: sign(+m[1]), to: null, certainty: 'open-ended' };
  if ((m = t.match(/^before (\d+)$/))) return { from: null, to: sign(+m[1]), certainty: 'open-ended' };
  if ((m = t.match(/^fl\.? (\d+)$/))) return { from: sign(+m[1]), to: sign(+m[1]), certainty: 'circa' };
  const circa = /^(c\.|ca\.|circa) ?/.test(t);
  t = t.replace(/^(c\.|ca\.|circa) ?/, '');
  if ((m = t.match(/^(\d+)$/))) return { from: sign(+m[1]), to: sign(+m[1]), certainty: circa ? 'circa' : 'exact' };
  if ((m = t.match(/^(\d+)\s*[–/]\s*(\d+)$/))) {
    let a = +m[1], z = +m[2];
    if (m[2].length < m[1].length && !bc) z = +(m[1].slice(0, m[1].length - m[2].length) + m[2]);
    return { from: sign(a), to: sign(z), certainty: circa ? 'circa' : 'range' };
  }
  return null;
}

const yearText = y => (y == null ? '(open)' : y < 0 ? `${-y} BC` : `AD ${y}`);

// ---------- search ----------

const greek = { α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'e', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'u', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'o' };
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[α-ω]/g, c => greek[c] || c).replace(/[^a-z0-9 ]+/g, ' ');

function bookText(b) {
  return norm([b.title, b.subtitle, b.shortTitle, b.originalTitle, ...(b.authors || []), ...(b.authorForms || []), b.authorLine,
    ...(b.contributors || []).map(c => c[1]), b.series, b.seriesNo && b.series + ' ' + b.seriesNo, b.setTitle, b.isbn, b.notes,
    ...(b.tags || []), b.category, b.publisher].join(' '));
}

function search(q) {
  const words = norm(q).split(' ').filter(Boolean);
  if (!words.length) return [];
  const hit = text => words.every(w => (' ' + text.replace(/\s+/g, ' ')).includes(' ' + w));
  const groups = new Map();
  const add = (key, title, entry) => {
    if (!groups.has(key)) groups.set(key, { key, title, entries: [] });
    groups.get(key).entries.push(entry);
  };
  for (const b of books) {
    if (hit(bookText(b))) add(b.work || b.id, b.title, { book: b });
    for (const c of b.contents || []) {
      if (hit(norm([c.title, c.originalTitle, c.author, ...(c.author ? [] : b.authors || [])].join(' ')))) {
        add('piece:' + norm(c.title), c.title, { book: b, piece: c });
      }
    }
  }
  return [...groups.values()];
}

// ---------- small renderers ----------

const authorLine = b => b.authorLine || (b.authors || []).join(', ');
const surname = b => norm((b.authors && b.authors[0]) || (b.authorLine || '').replace(/^ed\.( and trans\.)? /, '')).split(' ').filter(Boolean).pop() || '';
const money = v => (v == null ? '' : '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
const bookValue = b => (b.copies || []).reduce((s, c) => s + (c.value || 0), 0);
const loc = l => (l && l.length ? l.map(esc).join(' <span class="sep">›</span> ') : '');
const seriesLabel = b => (b.series && b.seriesNo ? `${b.series} ${b.seriesNo}` : b.setTitle && b.volume ? `${b.setTitle.replace(/ \(.*\)$/, '')} ${b.volume}` : b.series || '');
const isGone = b => b.status === 'gone';

function coverTile(b, size = 'm') {
  const c = b.cover || { bg: '#555', fg: '#fff', accent: '#ccc' };
  const series = b.seriesNo ? `${b.series.replace('Loeb Classical Library', 'Loeb').replace('Word Biblical Commentary', 'WBC')} ${b.seriesNo}`
    : b.setTitle && b.volume ? `Vol. ${b.volume}` : b.format === 'logos' ? 'Logos' : '';
  const by = b.authors ? b.authors.join(', ') : (b.authorLine || '').replace(/^ed\. (and trans\. )?/, '');
  return `<div class="cover cover-${size}${isGone(b) ? ' is-gone' : ''}${b.generated ? ' is-generated' : ''}" style="--c-bg:${c.bg};--c-fg:${c.fg};--c-ac:${c.accent}" aria-hidden="true">
    ${series ? `<span class="cover-series">${esc(series)}</span>` : ''}
    <span class="cover-title">${esc(b.shortTitle || b.title)}</span>
    <span class="cover-rule"></span>
    <span class="cover-author">${esc(by)}</span>
  </div>`;
}

function badges(b) {
  const out = [];
  if (b.kind === 'wish') out.push('<span class="badge badge-wish">Wishlist</span>');
  if (b.format === 'logos') out.push('<span class="badge badge-digital">Digital</span>');
  if (isGone(b)) out.push('<span class="badge badge-gone">No longer in library</span>');
  return out.join(' ');
}

function tile(b) {
  return `<a class="tile${isGone(b) ? ' is-gone' : ''}" href="#/book/${b.id}">
    ${coverTile(b, 'm')}
    <span class="tile-caption">
      <span class="tile-title">${esc(b.title)}${b.subtitle && b.setTitle ? `<span class="tile-sub">, ${esc(b.subtitle)}</span>` : ''}</span>
      <span class="tile-author">${esc(authorLine(b))}</span>
      ${dateLabel(b) ? `<span class="tile-date">${esc(dateLabel(b))}</span>` : ''}
      ${badges(b) ? `<span class="tile-badges">${badges(b)}</span>` : ''}
    </span>
  </a>`;
}

function row(b, extra = '') {
  const c = (b.copies || [])[0] || {};
  return `<a class="row${isGone(b) ? ' is-gone' : ''}" href="#/book/${b.id}">
    ${coverTile(b, 's')}
    <span class="row-main">
      <span class="row-title">${esc(b.title)}${b.subtitle ? `<span class="row-sub">: ${esc(b.subtitle)}</span>` : ''}</span>
      <span class="row-author">${esc(authorLine(b))}${seriesLabel(b) ? ` · ${esc(seriesLabel(b))}` : ''}</span>
      ${extra}
      ${badges(b) ? `<span class="row-badges">${badges(b)}</span>` : ''}
    </span>
    <span class="row-date">${esc(dateLabel(b) || '—')}</span>
    <span class="row-loc">${c.location && c.location.length ? loc(c.location.slice(1)) : b.format === 'logos' ? 'Logos' : ''}</span>
  </a>`;
}

// ---------- views ----------

function libraryView() {
  let list = books.filter(b => b.kind === 'owned' && b.format === state.format);
  if (!state.showGone) list = list.filter(b => !isGone(b));
  if (state.needsDate) list = list.filter(b => !b.date && !(anthologyInfo(b) || {}).label || (anthologyInfo(b) || {}).missing);
  const sorters = {
    title: (a, b) => norm(a.title).replace(/^the /, '').localeCompare(norm(b.title).replace(/^the /, '')),
    author: (a, b) => surname(a).localeCompare(surname(b)),
    date: (a, b) => (sortYear(a) ?? 99999) - (sortYear(b) ?? 99999),
    added: (a, b) => ((b.copies[0] || {}).added || '').localeCompare((a.copies[0] || {}).added || ''),
    value: (a, b) => bookValue(b) - bookValue(a),
  };
  list.sort(sorters[state.sort]);
  const owned = books.filter(b => b.kind === 'owned' && !isGone(b));
  const phys = owned.filter(b => b.format === 'physical');
  const logosCount = owned.length - phys.length;
  const total = phys.reduce((s, b) => s + bookValue(b), 0);
  const chip = (key, label, on) => `<button class="chip${on ? ' is-on' : ''}" data-act="${key}" aria-pressed="${on}">${label}</button>`;
  return `<section class="page page-library">
    <div class="page-head">
      <h1 class="page-title">Library</h1>
      <p class="page-meta">${phys.length} books · ${logosCount} in Logos · est. ${money(total)}</p>
    </div>
    <div class="toolbar">
      <div class="chips">
        ${chip('fmt-physical', 'Physical', state.format === 'physical')}
        ${chip('fmt-logos', 'Logos', state.format === 'logos')}
        ${chip('needs-date', 'Needs original date', state.needsDate)}
        ${chip('show-gone', 'No longer owned', state.showGone)}
      </div>
      <div class="controls">
        <label class="sort"><span>Sort</span>
          <select data-act="sort">
            ${[['title', 'Title'], ['author', 'Author'], ['date', 'Original date'], ['added', 'Date added'], ['value', 'Value']]
              .map(([k, l]) => `<option value="${k}"${state.sort === k ? ' selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <div class="seg" role="group" aria-label="View">
          <button class="seg-btn${state.view === 'grid' ? ' is-on' : ''}" data-act="view-grid" aria-label="Grid">${icon('grid')}</button>
          <button class="seg-btn${state.view === 'list' ? ' is-on' : ''}" data-act="view-list" aria-label="List">${icon('list')}</button>
        </div>
      </div>
    </div>
    ${list.length ? (state.view === 'grid' ? `<div class="grid">${list.map(tile).join('')}</div>` : `<div class="list">${list.map(b => row(b)).join('')}</div>`)
      : '<p class="empty">Nothing here with these filters.</p>'}
  </section>`;
}

function wishlistView() {
  const list = books.filter(b => b.kind === 'wish');
  return `<section class="page page-wishlist">
    <div class="page-head">
      <h1 class="page-title">Wishlist</h1>
      <p class="page-meta">${list.length} books we're looking for · shared between us</p>
    </div>
    <div class="list list-wish">${list.map(b => row(b, `<span class="row-note">${esc(b.notes)}</span>`)).join('')}</div>
  </section>`;
}

function searchView() {
  const groups = search(state.q);
  const entry = e => {
    const b = e.book;
    if (e.piece) {
      const p = e.piece;
      return `<a class="result result-piece${isGone(b) ? ' is-gone' : ''}" href="#/book/${b.id}">
        ${coverTile(b, 's')}
        <span class="row-main">
          <span class="row-title"><em>${esc(p.title)}</em> <span class="row-sub">in <em>${esc(b.shortTitle || b.title)}</em>${seriesLabel(b) ? ` (${esc(seriesLabel(b))})` : ''}</span></span>
          <span class="row-author">${esc(p.author || authorLine(b))}${p.date ? ' · ' + esc(p.date) : ''}</span>
          ${badges(b) ? `<span class="row-badges">${badges(b)}</span>` : ''}
        </span></a>`;
    }
    return row(b).replace('class="row', 'class="result row');
  };
  return `<section class="page page-search">
    <div class="page-head">
      <h1 class="page-title">Search</h1>
      <p class="page-meta">${groups.length ? `${((n) => n + (n === 1 ? ' result' : ' results'))(groups.reduce((s, g) => s + g.entries.length, 0))} for “${esc(state.q)}”` : `Nothing found for “${esc(state.q)}”`}</p>
    </div>
    <div class="results">
      ${groups.map(g => g.entries.length > 1
        ? `<details class="group" open><summary><span class="group-title"><em>${esc(g.title)}</em></span> <span class="group-count">${g.entries.length} editions</span></summary>${g.entries.map(entry).join('')}</details>`
        : `<div class="group group-single">${entry(g.entries[0])}</div>`).join('')}
    </div>
    <p class="hint">Try “phaedo”, “politeia”, “aurelius”, “didache” or “loeb”.</p>
  </section>`;
}

function datingsBlock(datings, label = 'Datings') {
  return `<ul class="datings" aria-label="${label}">${datings.map(d => `
    <li class="dating${d.working ? ' is-working' : ''}">
      <span class="dating-text">${esc(d.text)}</span>
      <span class="dating-note">${esc(d.note || '')}${d.type ? ` · ${esc(d.type)}` : ''}</span>
      ${d.working ? '<span class="badge badge-working">working date</span>' : ''}
    </li>`).join('')}</ul>`;
}

function detailView(id) {
  const b = byId(id);
  if (!b) return '<section class="page"><p class="empty">Book not found.</p></section>';
  const a = anthologyInfo(b);
  const others = books.filter(o => o !== b && ((b.work && o.work === b.work)));
  const contribs = {};
  for (const [role, name] of b.contributors || []) (contribs[role] = contribs[role] || []).push(name);
  const langs = b.languages || [];
  const langLabel = langs.length === 2 ? 'diglot' : langs.length === 3 ? 'triglot' : '';
  const facts = [
    ['Publisher', [b.publisher, b.place].filter(Boolean).join(', ')],
    ['Edition year', b.year], ['Translation first published', b.translationFirst], ['Edition', b.edition],
    ['Series', b.series && (b.seriesNo ? `${b.series} ${b.seriesNo}` : b.series)],
    ['Set', b.setTitle && `${b.setTitle}${b.volume ? `, vol. ${b.volume}` : ''}`],
    ...Object.entries(contribs).map(([role, names]) => [role[0].toUpperCase() + role.slice(1) + (names.length > 1 ? 's' : ''), names.join(', ')]),
    ['Languages', langs.length && `${langs.join(', ')}${langLabel ? ` (${langLabel})` : ''}`],
    ['Original', [b.originalLanguage, b.originalTitle && `<em>${esc(b.originalTitle)}</em>`].filter(Boolean).join(', '), true],
    ['ISBN', b.kind !== 'wish' && b.format !== 'logos' ? (b.isbn || 'None') : b.isbn], ['Pages', b.pages],
    ['Logos resource', b.logosId],
  ].filter(f => f[1]);
  const showAll = state.expanded[b.id];
  const contents = b.contents || [];
  const shown = showAll ? contents : contents.slice(0, 12);
  const cite = b.format === 'logos' ? `<label class="toggle"><input type="checkbox" data-act="cite" ${b.cite ? 'checked' : ''}><span class="toggle-track"></span><span>Cite (send to Zotero)</span></label>` : '';
  const copies = (b.copies || []).map((c, i) => `
    <div class="copy">
      <div class="copy-head">${b.format === 'logos' ? 'Logos license' : `${b.copies.length > 1 ? `Copy ${i + 1} · ` : ''}${esc(c.binding || '')}`}
        ${c.value != null ? `<span class="copy-value">${money(c.value)}</span>` : '<span class="copy-value is-missing">No value yet</span>'}</div>
      <dl class="facts facts-copy">
        ${c.location && c.location.length ? `<dt>Location</dt><dd class="loc">${loc(c.location)}</dd>` : ''}
        ${c.acquired ? `<dt>Acquired</dt><dd>${esc(c.acquired)}</dd>` : ''}
        ${c.added ? `<dt>Added</dt><dd>${esc(c.added)}</dd>` : ''}
        ${c.price ? `<dt>Paid</dt><dd>${money(c.price)}</dd>` : ''}
        ${b.markings && i === 0 ? '<dt>Markings</dt><dd>Writing or markings when acquired</dd>' : ''}
        ${c.valueHistory && c.valueHistory.length > 1 ? `<dt>Value history</dt><dd>${c.valueHistory.map(([d, v]) => `${money(v)} <span class="muted">${d}</span>`).join(' → ')}</dd>` : ''}
      </dl>
    </div>`).join('');

  return `<section class="page page-detail${isGone(b) ? ' is-gone' : ''}">
    <a class="back" href="${b.kind === 'wish' ? '#/wishlist' : '#/library'}">${icon('back')} ${b.kind === 'wish' ? 'Wishlist' : 'Library'}</a>
    ${isGone(b) ? `<div class="banner banner-gone">${icon('info')} No longer in library${b.statusNote ? ` · ${esc(b.statusNote)}` : ''}. Notes are kept.</div>` : ''}
    <div class="detail">
      <div class="detail-cover">${coverTile(b, 'l')}</div>
      <div class="detail-head">
        ${seriesLabel(b) ? `<p class="detail-series">${esc(seriesLabel(b))}</p>` : ''}
        <h1 class="detail-title">${esc(b.title)}</h1>
        ${b.subtitle ? `<p class="detail-subtitle">${esc(b.subtitle)}</p>` : ''}
        <p class="detail-author">${esc(authorLine(b))}</p>
        <p class="detail-date">${dateLabel(b) ? `<span class="date-chip">${esc(dateLabel(b))}</span>` : '<span class="date-chip is-missing">Needs original date</span>'}
          ${b.certainty ? `<span class="muted">${esc(b.certainty)}</span>` : ''}
          ${a && a.missing ? `<span class="flag">${a.missing} of ${a.count} still need a date</span>` : ''}</p>
        <p class="detail-badges">${badges(b)}</p>
        ${cite}
        ${b.kind === 'wish' ? `<button class="btn btn-primary" data-act="bought" data-id="${b.id}">${icon('check')} I bought it</button>` : ''}
        ${b.notes ? `<div class="notes"><h2 class="h2">Notes</h2><p>${esc(b.notes)}</p></div>` : ''}
      </div>
      <div class="detail-body">
        ${b.datings ? `<div class="block"><h2 class="h2">Datings</h2>${datingsBlock(b.datings)}</div>` : ''}
        ${contents.length ? `<div class="block"><h2 class="h2">Contents <span class="muted">${contents.length} works${a && a.label ? ' · ' + esc(a.label.replace(/ \(.*\)/, '')) : ''}</span></h2>
          <ol class="contents">${shown.map(c => `
            <li class="piece">
              <span class="piece-title"><em>${esc(c.title)}</em>${c.originalTitle ? ` <span class="muted">${esc(c.originalTitle)}</span>` : ''}</span>
              <span class="piece-meta">${c.author ? esc(c.author) : ''}${c.translator && !contribs.translator?.includes(c.translator) ? `${c.author ? ' · ' : ''}trans. ${esc(c.translator)}` : ''}</span>
              <span class="piece-date">${c.date ? esc(c.date) : '<span class="flag">needs date</span>'}</span>
              ${c.datings ? `<details class="piece-datings" open><summary>${c.datings.length} datings</summary>${datingsBlock(c.datings)}</details>` : ''}
            </li>`).join('')}</ol>
          ${contents.length > 12 && !showAll ? `<button class="btn btn-quiet" data-act="expand" data-id="${b.id}">Show all ${contents.length}</button>` : ''}
        </div>` : ''}
        ${b.kind !== 'wish' ? `<div class="block"><h2 class="h2">${b.copies.length > 1 ? 'Copies' : b.format === 'logos' ? 'Holding' : 'Copy'}</h2>${copies}</div>` : ''}
        <div class="block"><h2 class="h2">Edition</h2><dl class="facts">${facts.map(([k, v, raw]) => `<dt>${k}</dt><dd>${raw ? v : esc(v)}</dd>`).join('')}</dl></div>
        ${b.category || b.tags ? `<div class="block"><h2 class="h2">Work</h2><p class="tags">${b.category ? `<span class="tag tag-cat">${esc(b.category)}</span>` : ''}${(b.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</p></div>` : ''}
        ${others.length ? `<div class="block"><h2 class="h2">Other editions</h2><div class="list">${others.map(o => row(o)).join('')}</div></div>` : ''}
      </div>
    </div>
  </section>`;
}

// ---------- batch add ----------

const missingFields = ['title', 'subtitle', 'author', 'original date', 'binding', 'publisher', 'edition year'];

function addView() {
  const s = state.add || (state.add = { step: 'scan' });
  const stack = state.stack.length ? `<div class="stack"><h2 class="h2">This stack <span class="muted">${state.stack.length}</span></h2>
    <div class="list">${state.stack.map(id => row(byId(id))).join('')}</div></div>` : '';
  const steps = ['Scan', 'Check', 'Fill gaps', 'Cover'];
  const stepIndex = { scan: 0, found: 1, match: 1, duplicate: 1, prompts: 2, cover: 3, crop: 3, done: 3 }[s.step];
  const progress = `<ol class="steps">${steps.map((t, i) => `<li class="${i < stepIndex ? 'is-done' : i === stepIndex ? 'is-now' : ''}">${t}</li>`).join('')}</ol>`;
  let body = '';
  const sample = s.sample;
  const f = sample && sample.found;

  if (s.step === 'scan') {
    body = `<div class="scanner">
        <div class="viewfinder"><div class="vf-frame"><span class="vf-line"></span><span class="vf-bars"></span></div>
          <p class="vf-hint">Point the camera at the barcode on the back</p></div>
        <div class="pretend"><p class="muted">Prototype: pick a pretend scan</p>
          ${scanSamples.map(x => `<button class="btn" data-act="scan" data-key="${x.key}">${icon('scan')} ${esc(x.label)}</button>`).join('')}</div>
        <form class="type-isbn" data-act="lookup"><label for="isbn">Or type an ISBN or title</label>
          <div class="input-row"><input id="isbn" name="isbn" inputmode="search" autocomplete="off" placeholder="978…"><button class="btn btn-primary">Look up</button></div></form>
      </div>`;
  } else if (s.step === 'duplicate') {
    const d = byId(sample.duplicateOf);
    body = `<div class="card card-warn">
      ${icon('info')}<div><h2 class="h2">You already have this edition</h2>
      <p><em>${esc(d.title)}</em> · ${d.copies.map(c => `${esc(c.binding)} (${loc(c.location.slice(1))})`).join('; ')}</p>
      <p>Add another copy?</p>
      <div class="actions"><button class="btn btn-primary" data-act="another-copy">Add another copy</button><button class="btn" data-act="restart">Skip this book</button></div></div></div>`;
  } else if (s.step === 'found') {
    body = `<div class="card card-found">
      <div class="found-cover">${sample.noCover ? '<div class="cover cover-m cover-empty"><span>No cover found</span></div>' : coverTile({ ...f, cover: sample.cover }, 'm')}</div>
      <div><p class="eyebrow">Found in ${esc(sample.source)} · ISBN ${esc(sample.isbn)}</p>
      <h2 class="h2 found-title">${esc(f.title)}${f.subtitle ? `: ${esc(f.subtitle)}` : ''}</h2>
      <p>${esc(f.authors.join(', '))}${f.contributors ? ` · trans. ${esc(f.contributors[0][1])}` : ''}</p>
      <p class="muted">${esc([f.publisher, f.place, f.year, f.pages && f.pages + ' pages'].filter(Boolean).join(' · '))}</p>
      <p class="muted small">Original date is never filled in from lookups.</p>
      <div class="actions"><button class="btn btn-primary" data-act="found-ok">Looks right</button><button class="btn" data-act="restart">Not this book</button></div></div></div>`;
  } else if (s.step === 'match') {
    const w = byId(sample.matchWork);
    body = `<div class="card card-match">
      <div class="found-cover">${coverTile(w, 's')}</div>
      <div><h2 class="h2">Same work as <em>${esc(w.title)}</em>?</h2>
      <p>${esc(authorLine(w))} · ${esc(w.date)} · ${esc(w.originalLanguage)}, <em>${esc(w.originalTitle)}</em></p>
      <p class="muted small">You already have ${books.filter(o => o.work === w.work && o.kind === 'owned').length} editions. Linking shares the original date, category and tags. Nothing is linked unless you say so.</p>
      <div class="actions"><button class="btn btn-primary" data-act="match-yes">Yes, same work</button><button class="btn" data-act="match-no">No, a different work</button></div></div></div>`;
  } else if (s.step === 'prompts') {
    const missing = s.missing;
    const field = (name, inner) => missing.includes(name) && !s.skipped.includes(name) ? `<div class="prompt"><div class="prompt-head"><label>${name[0].toUpperCase() + name.slice(1)}</label><button class="link" data-act="skip" data-field="${name}">Skip</button></div>${inner}</div>` : '';
    const parsed = readDate(s.dateText || '');
    body = `<div class="card card-prompts">
      <h2 class="h2">A few things are missing</h2><p class="muted small">Each one can be skipped and filled in later.</p>
      ${s.workDate ? `<div class="prompt is-filled"><div class="prompt-head"><label>Original date</label></div><p><span class="date-chip">${esc(s.workDate)}</span> <span class="muted">from the linked work</span></p></div>` : ''}
      ${field('subtitle', '<input placeholder="Subtitle as printed">')}
      ${field('original date', `<input data-act="date-input" value="${esc(s.dateText || '')}" placeholder="e.g. c. 318, 4th c., 397–400, after 1517">
        <p class="date-preview" aria-live="polite">${s.dateText ? (parsed ? `Read as <strong>${yearText(parsed.from)} – ${yearText(parsed.to)}</strong> · ${parsed.certainty}` : 'Not sure how to read that yet') : 'Type the date as a scholar would write it'}</p>`)}
      ${field('binding', `<div class="chips">${['Hardcover', 'Paperback', 'Leather', 'Cloth', 'Bonded leather'].map(x => `<button class="chip${s.binding === x ? ' is-on' : ''}" data-act="binding" data-v="${x}">${x}</button>`).join('')}<button class="chip chip-new">+ New</button></div>`)}
      <div class="prompt"><div class="prompt-head"><label>Location</label><span class="muted small">optional</span></div>
        <div class="chips">${['Office › Case 1', 'Office › Case 2', 'Office › Case 3', 'Living room › Glass case'].map(x => `<button class="chip${s.location === x ? ' is-on' : ''}" data-act="location" data-v="${x}">${x}</button>`).join('')}</div></div>
      <div class="actions"><button class="btn btn-primary" data-act="prompts-ok">Continue</button></div></div>`;
  } else if (s.step === 'cover') {
    body = `<div class="card card-cover"><h2 class="h2">No cover found</h2><p class="muted">Take a photo of the cover, or choose one from your photos.</p>
      <div class="actions"><button class="btn btn-primary" data-act="photo">${icon('camera')} Take photo</button><button class="btn" data-act="photo">Choose photo</button><button class="btn btn-quiet" data-act="tile">Use a plain title tile</button></div></div>`;
  } else if (s.step === 'crop') {
    body = `<div class="card card-crop"><h2 class="h2">Straighten the cover</h2><p class="muted small">Drag the four corners onto the corners of the book.</p>
      <div class="crop">${cropSvg(sample, s.rot || 0)}</div>
      <div class="actions"><button class="btn" data-act="rotate">${icon('rotate')} Rotate</button><button class="btn btn-primary" data-act="crop-ok">Use photo</button></div></div>`;
  } else if (s.step === 'done') {
    const b = byId(s.addedId);
    body = `<div class="card card-done">
      <div class="found-cover">${coverTile(b, 'm')}</div>
      <div><p class="eyebrow">${icon('check')} Saved</p><h2 class="h2">${esc(b.title)}</h2><p>${esc(authorLine(b))}</p>
      <p class="muted small">${b.copies.map(c => esc(c.binding || '')).join(', ')}${b.copies[0].location.length ? ' · ' + loc(b.copies[0].location.slice(1)) : ''}</p>
      <div class="actions"><button class="btn btn-primary" data-act="restart">${icon('scan')} Next book</button><button class="btn" data-act="finish">Finish</button></div></div></div>`;
  }
  return `<section class="page page-add">
    <div class="page-head"><h1 class="page-title">Add books</h1><p class="page-meta">Scan a whole stack, or just one book</p></div>
    ${progress}${body}${s.step === 'scan' || s.step === 'done' ? stack : ''}
  </section>`;
}

function cropSvg(sample, rot) {
  const c = sample.cover || { bg: '#6b1730', fg: '#f3e2c0' };
  const f = sample.found || {};
  const pts = state.add.pts || (state.add.pts = [[78, 92], [226, 84], [236, 318], [70, 326]]);
  return `<svg viewBox="0 0 300 400" class="crop-svg" role="img" aria-label="Photo of a book at an angle, with four corner handles">
    <g transform="rotate(${rot} 150 200)">
      <rect width="300" height="400" fill="#8a6a4a"/>
      <rect width="300" height="400" fill="url(#grain)" opacity=".35"/>
      <defs><pattern id="grain" width="300" height="14" patternUnits="userSpaceOnUse"><path d="M0 7 Q75 3 150 7 T300 7" stroke="#5e4630" fill="none" stroke-width="1.2"/></pattern></defs>
      <polygon points="64,70 248,94 232,338 46,316" fill="rgba(0,0,0,.28)" transform="translate(6 8)"/>
      <polygon points="64,70 248,94 232,338 46,316" fill="${c.bg}"/>
      <g transform="matrix(0.99 0.13 -0.07 0.99 0 0)" fill="${c.fg}" font-family="Georgia, serif" text-anchor="middle">
        <text x="160" y="150" font-size="20">${esc(f.title || 'On the Incarnation')}</text>
        <rect x="120" y="164" width="80" height="2" fill="${c.fg}"/>
        <text x="160" y="194" font-size="13">${esc((f.authors || ['Athanasius'])[0])}</text>
      </g>
    </g>
    <polygon class="crop-outline" points="${pts.map(p => p.join(',')).join(' ')}"/>
    ${pts.map((p, i) => `<circle class="crop-handle" data-i="${i}" cx="${p[0]}" cy="${p[1]}" r="11"/>`).join('')}
  </svg>`;
}

function startScan(key) {
  const sample = scanSamples.find(x => x.key === key) || scanSamples[0];
  state.add = { step: sample.duplicateOf ? 'duplicate' : 'found', sample, skipped: [] };
}

function afterFound() {
  const s = state.add;
  if (s.sample.matchWork && !s.matched) { s.step = 'match'; return; }
  const f = s.sample.found || {};
  s.missing = missingFields.filter(k => ({
    title: !f.title, subtitle: !f.subtitle, author: !(f.authors && f.authors.length), 'original date': !s.workDate,
    binding: true, publisher: !f.publisher, 'edition year': !f.year,
  })[k]);
  s.step = 'prompts';
}

function saveAdded() {
  const s = state.add;
  const f = s.sample.found;
  const id = 'added-' + Date.now();
  const where = s.location ? ['Home', ...s.location.split(' › ')] : [];
  const parsed = readDate(s.dateText || '');
  const linked = s.matched ? byId(s.sample.matchWork) : null;
  books.push({
    id, n: 0, kind: 'owned', format: 'physical', work: linked ? linked.work : undefined, ...f,
    date: linked ? linked.date : parsed ? s.dateText : undefined, from: linked ? linked.from : parsed ? parsed.from : undefined,
    to: linked ? linked.to : parsed ? parsed.to : undefined, originalTitle: linked ? linked.originalTitle : undefined,
    originalLanguage: linked ? linked.originalLanguage : undefined, isbn: s.sample.isbn, languages: ['English'],
    category: linked ? linked.category : undefined, tags: linked ? linked.tags : undefined,
    copies: [{ binding: s.binding || '', location: where, added: today }], notes: s.note || '',
    cover: s.sample.cover, generated: s.useTile,
  });
  state.stack.push(id);
  s.addedId = id;
  s.step = 'done';
}

function boughtIt(id) {
  const w = byId(id);
  state.add = {
    step: 'found', skipped: [], note: w.notes, fromWish: id,
    sample: { key: 'wish', isbn: w.isbn || '', source: 'your wishlist', found: { title: w.title, subtitle: w.subtitle || '', authors: w.authors || [], contributors: w.contributors, publisher: w.publisher }, cover: w.cover },
  };
  books.splice(books.indexOf(w), 1);
  location.hash = '#/add';
}

// ---------- icons ----------

function icon(name) {
  const p = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    library: '<path d="M4 19V5M9 19V5M14 19l3-14 4 1-3 14z"/><path d="M3 19h18"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    scan: '<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M8 8v8M11 8v8M14 8v8M17 8v8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    auto: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16a8 8 0 0 0 0-16z" fill="currentColor"/>',
  }[name];
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

// ---------- shell ----------

function themeIcon() {
  const t = document.documentElement.dataset.theme || 'auto';
  return icon(t === 'light' ? 'sun' : t === 'dark' ? 'moon' : 'auto');
}

function shell() {
  const n = cfg.number;
  const ring = cfg.ring || [1, 2, 3, 4, 5];
  const i = ring.indexOf(n);
  const prev = ring[(i + ring.length - 1) % ring.length], next = ring[(i + 1) % ring.length];
  return `
  <div class="protobar">
    <a href="../">All options</a>
    <span class="protobar-name">${esc(cfg.round || 'Round 1')} · Option ${n} · ${esc(cfg.name)}</span>
    <span class="protobar-nav"><a href="../option-${prev}/" aria-label="Previous option">‹</a><a href="../option-${next}/" aria-label="Next option">›</a></span>
  </div>
  <div class="app">
    <header class="topbar">
      <a class="brand" href="#/library"><span class="brand-mark">${logos[cfg.logo || 0].mark}</span><span class="brand-name">My Loci Library</span></a>
      <label class="search">${icon('search')}<input type="search" id="q" placeholder="Search everything" autocomplete="off" aria-label="Search"></label>
      <button class="theme-btn" data-act="theme" aria-label="Theme: follow device, light or dark" title="Theme">${themeIcon()}</button>
    </header>
    <nav class="tabs" aria-label="Main">
      <a class="tab" data-tab="library" href="#/library">${icon('library')}<span>Library</span></a>
      <a class="tab" data-tab="wishlist" href="#/wishlist">${icon('heart')}<span>Wishlist</span></a>
      <a class="tab tab-add" data-tab="add" href="#/add">${icon('plus')}<span>Add books</span></a>
    </nav>
    <main id="view" tabindex="-1"></main>
  </div>`;
}

function render() {
  const hash = location.hash || '#/library';
  const [, route, arg] = hash.split('/');
  let html, tab = route;
  if (state.q.trim() && route !== 'book' && route !== 'add') { html = searchView(); tab = ''; }
  else if (route === 'book') { html = detailView(arg); const b = byId(arg); tab = b && b.kind === 'wish' ? 'wishlist' : 'library'; }
  else if (route === 'wishlist') html = wishlistView();
  else if (route === 'add') html = addView();
  else { html = libraryView(); tab = 'library'; }
  document.getElementById('view').innerHTML = html;
  document.body.dataset.route = state.q.trim() && route !== 'book' && route !== 'add' ? 'search' : route || 'library';
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('is-on', t.dataset.tab === tab);
  if (route === 'add' && state.add && state.add.step === 'crop') bindCrop();
}

function bindCrop() {
  const svg = document.querySelector('.crop-svg');
  if (!svg) return;
  let drag = null;
  const toSvg = e => {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const r = p.matrixTransform(svg.getScreenCTM().inverse());
    return [Math.max(0, Math.min(300, r.x)), Math.max(0, Math.min(400, r.y))];
  };
  svg.addEventListener('pointerdown', e => {
    const h = e.target.closest('.crop-handle');
    if (!h) return;
    drag = +h.dataset.i; h.setPointerCapture(e.pointerId); e.preventDefault();
  });
  svg.addEventListener('pointermove', e => {
    if (drag == null) return;
    const pts = state.add.pts; pts[drag] = toSvg(e).map(Math.round);
    svg.querySelectorAll('.crop-handle')[drag].setAttribute('cx', pts[drag][0]);
    svg.querySelectorAll('.crop-handle')[drag].setAttribute('cy', pts[drag][1]);
    svg.querySelector('.crop-outline').setAttribute('points', pts.map(p => p.join(',')).join(' '));
  });
  const end = () => { drag = null; };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
}

function onClick(e) {
  if (e.target.closest('.tab, .brand') && state.q) {
    state.q = '';
    document.getElementById('q').value = '';
    if (location.hash === e.target.closest('a').getAttribute('href')) render();
  }
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'FORM' || (el.tagName === 'INPUT' && el.type !== 'checkbox')) return;
  const act = el.dataset.act;
  const s = state.add;
  const go = () => render();
  switch (act) {
    case 'fmt-physical': state.format = 'physical'; return go();
    case 'fmt-logos': state.format = state.format === 'logos' ? 'physical' : 'logos'; return go();
    case 'needs-date': state.needsDate = !state.needsDate; return go();
    case 'show-gone': state.showGone = !state.showGone; return go();
    case 'view-grid': state.view = 'grid'; return go();
    case 'view-list': state.view = 'list'; return go();
    case 'expand': state.expanded[el.dataset.id] = true; return go();
    case 'cite': { const b = byId(location.hash.split('/')[2]); if (b) b.cite = el.checked; return; }
    case 'theme': {
      const order = ['auto', 'light', 'dark'];
      const next = order[(order.indexOf(document.documentElement.dataset.theme || 'auto') + 1) % 3];
      if (next === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = next;
      try { localStorage.setItem('loci-proto-theme', next); } catch { /* storage may be blocked */ }
      el.innerHTML = themeIcon();
      return;
    }
    case 'bought': return boughtIt(el.dataset.id);
    case 'scan': startScan(el.dataset.key); return go();
    case 'restart': state.add = { step: 'scan' }; return go();
    case 'found-ok': return afterFound(), go();
    case 'match-yes': s.matched = true; s.workDate = byId(s.sample.matchWork).date; return afterFound(), go();
    case 'match-no': s.matched = 'no'; return afterFound(), go();
    case 'another-copy': {
      const d = byId(s.sample.duplicateOf);
      d.copies.push({ binding: 'Paperback', location: [], added: today });
      state.stack.push(d.id); s.addedId = d.id; s.step = 'done'; return go();
    }
    case 'skip': s.skipped.push(el.dataset.field); return go();
    case 'binding': s.binding = el.dataset.v; return go();
    case 'location': s.location = s.location === el.dataset.v ? '' : el.dataset.v; return go();
    case 'prompts-ok':
      if (s.sample.noCover) { s.step = 'cover'; return go(); }
      return saveAdded(), go();
    case 'photo': s.step = 'crop'; return go();
    case 'tile': s.useTile = true; return saveAdded(), go();
    case 'rotate': s.rot = ((s.rot || 0) + 90) % 360; return go();
    case 'crop-ok': return saveAdded(), go();
    case 'finish': state.add = null; state.sort = 'added'; location.hash = '#/library'; return;
  }
}

export function start(config) {
  cfg = config;
  state.view = config.defaultView || 'grid';
  try {
    const t = localStorage.getItem('loci-proto-theme');
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  } catch { /* storage may be blocked */ }
  document.body.innerHTML = shell();
  document.body.dataset.option = config.number;
  document.addEventListener('click', onClick);
  document.addEventListener('change', e => {
    if (e.target.matches('select[data-act="sort"]')) { state.sort = e.target.value; render(); }
  });
  document.addEventListener('submit', e => {
    if (e.target.matches('[data-act="lookup"]')) {
      e.preventDefault();
      const v = e.target.isbn.value.replace(/[^0-9xX]/g, '');
      startScan((scanSamples.find(x => x.isbn === v) || scanSamples[0]).key);
      render();
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'q') {
      state.q = e.target.value;
      if (location.hash.startsWith('#/book') || location.hash.startsWith('#/add')) location.hash = '#/library';
      else render();
    }
    if (e.target.matches('[data-act="date-input"]')) {
      state.add.dateText = e.target.value;
      const p = readDate(e.target.value);
      e.target.nextElementSibling.innerHTML = e.target.value
        ? (p ? `Read as <strong>${yearText(p.from)} – ${yearText(p.to)}</strong> · ${p.certainty}` : 'Not sure how to read that yet')
        : 'Type the date as a scholar would write it';
    }
  });
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  render();
}
