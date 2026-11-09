// The Adjust panel for the playground prototype. Each choice sets one
// attribute on <html> (for example data-accent="sage"); tokens.css does the
// rest. The current look is kept in the address, so a link can be shared,
// and in this browser's storage, so it survives a reload.

import { lLogos } from '../shared/l-logos.js';

export const knobs = [
  { key: 'accent', label: 'Main color', kind: 'swatch', options: [
    ['forest', 'Forest', '#2e4a3d'], ['sage', 'Sage', '#56705d'], ['navy', 'Navy', '#2c3e57'],
    ['oxblood', 'Oxblood', '#7a2630'], ['plum', 'Plum', '#5b3a5a'], ['ink', 'Ink', '#23201b']] },
  { key: 'pop', label: 'Little pop', kind: 'swatch', options: [
    ['clay', 'Clay', '#a65a3f'], ['rose', 'Rose', '#b35f6c'], ['honey', 'Honey', '#b0843a'],
    ['brass', 'Brass', '#8c7246'], ['none', 'None', '#8a8378']] },
  { key: 'paper', label: 'Paper', kind: 'swatch', options: [
    ['ivory', 'Ivory', '#f6f2ea'], ['white', 'White', '#fafaf8'], ['linen', 'Linen', '#efe6d8'],
    ['blush', 'Blush', '#f8f0eb'], ['stone', 'Stone', '#efefec']] },
  { key: 'type', label: 'Title type', kind: 'text', options: [
    ['book', 'Book serif'], ['sturdy', 'Sturdy serif'], ['elegant', 'Elegant serif'], ['modern', 'Modern sans'], ['rounded', 'Rounded']] },
  { key: 'shelf', label: 'Shelves', kind: 'text', options: [
    ['slim', 'Slim'], ['wood', 'Wood'], ['line', 'Hairline'], ['none', 'None']] },
  { key: 'covers', label: 'Cover size', kind: 'text', options: [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']] },
  { key: 'depth', label: 'Cover shadow', kind: 'text', options: [['flat', 'Flat'], ['soft', 'Soft'], ['deep', 'Deep']] },
  { key: 'corners', label: 'Corners', kind: 'text', options: [['sharp', 'Sharp'], ['soft', 'Soft'], ['round', 'Round']] },
  { key: 'density', label: 'Spacing', kind: 'text', options: [['airy', 'Airy'], ['cozy', 'Cozy']] },
  { key: 'header', label: 'Top bar', kind: 'text', options: [['plain', 'Plain'], ['tinted', 'Colored']] },
  { key: 'nav', label: 'Laptop menu', kind: 'text', options: [['side', 'Side'], ['top', 'Top']] },
  { key: 'logo', label: 'Logo', kind: 'logo', options: lLogos.map(l => [l.id, `${l.mood}: ${l.name}`]) },
];

export const looks = [
  { name: 'Bookshop', note: 'Option 7 as it was', set: { accent: 'forest', pop: 'clay', paper: 'ivory', type: 'book', shelf: 'slim', covers: 'medium', depth: 'soft', corners: 'soft', density: 'airy', header: 'plain', nav: 'side', logo: 'two-books' } },
  { name: 'Garden library', note: 'Sage, rose, linen', set: { accent: 'sage', pop: 'rose', paper: 'linen', type: 'sturdy', shelf: 'slim', covers: 'medium', depth: 'soft', corners: 'round', density: 'airy', header: 'tinted', nav: 'side', logo: 'sprout' } },
  { name: 'Sunday morning', note: 'Soft and cute', set: { accent: 'forest', pop: 'rose', paper: 'blush', type: 'rounded', shelf: 'slim', covers: 'medium', depth: 'soft', corners: 'round', density: 'cozy', header: 'plain', nav: 'side', logo: 'heart' } },
  { name: 'Reading room', note: 'Navy and brass', set: { accent: 'navy', pop: 'brass', paper: 'ivory', type: 'elegant', shelf: 'line', covers: 'large', depth: 'deep', corners: 'soft', density: 'airy', header: 'plain', nav: 'top', logo: 'roundel' } },
  { name: 'Modern sleek', note: 'Ink on white', set: { accent: 'ink', pop: 'clay', paper: 'white', type: 'modern', shelf: 'none', covers: 'large', depth: 'soft', corners: 'sharp', density: 'airy', header: 'plain', nav: 'top', logo: 'cut-out' } },
  { name: 'Old library', note: 'Oxblood and wood', set: { accent: 'oxblood', pop: 'brass', paper: 'linen', type: 'book', shelf: 'wood', covers: 'medium', depth: 'deep', corners: 'soft', density: 'airy', header: 'tinted', nav: 'side', logo: 'bookplate' } },
];

const STORE = 'loci-playground-look';
const root = document.documentElement;
let current = {};

function readStart() {
  const params = new URLSearchParams(location.search);
  const fromUrl = {};
  for (const k of knobs) if (params.has(k.key)) fromUrl[k.key] = params.get(k.key);
  if (params.has('look')) {
    const l = looks.find(x => x.name.toLowerCase().replace(/\s+/g, '-') === params.get('look'));
    if (l) return { ...l.set, ...fromUrl };
  }
  if (Object.keys(fromUrl).length) return { ...looks[0].set, ...fromUrl };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved) return { ...looks[0].set, ...saved };
  } catch { /* storage may be blocked */ }
  return { ...looks[0].set };
}

function apply(look) {
  current = { ...look };
  for (const k of knobs) {
    const valid = k.options.some(o => o[0] === current[k.key]);
    if (!valid) current[k.key] = looks[0].set[k.key];
    if (k.key !== 'logo') root.dataset[k.key] = current[k.key];
  }
  const logo = lLogos.find(l => l.id === current.logo) || lLogos[0];
  const brand = document.querySelector('.brand-mark');
  if (brand) brand.innerHTML = logo.mark;
  const params = new URLSearchParams();
  for (const k of knobs) params.set(k.key, current[k.key]);
  history.replaceState(null, '', location.pathname + '?' + params.toString() + location.hash);
  try { localStorage.setItem(STORE, JSON.stringify(current)); } catch { /* storage may be blocked */ }
  syncPanel();
}

function syncPanel() {
  for (const el of document.querySelectorAll('[data-knob]')) {
    el.classList.toggle('is-on', current[el.dataset.knob] === el.dataset.value);
    el.setAttribute('aria-pressed', current[el.dataset.knob] === el.dataset.value);
  }
  for (const el of document.querySelectorAll('[data-look]')) {
    const l = looks[+el.dataset.look];
    el.classList.toggle('is-on', knobs.every(k => l.set[k.key] === current[k.key]));
  }
}

function panelHtml() {
  const group = k => {
    const opts = k.options.map(([v, label, color]) => {
      if (k.kind === 'swatch') return `<button class="adjust-swatch" data-knob="${k.key}" data-value="${v}" title="${label}" aria-label="${label}" style="background:${color}"><span>${label}</span></button>`;
      if (k.kind === 'logo') { const l = lLogos.find(x => x.id === v); return `<button class="adjust-logo" data-knob="logo" data-value="${v}" title="${label}" aria-label="${label}">${l.mark}</button>`; }
      return `<button class="adjust-opt" data-knob="${k.key}" data-value="${v}">${label}</button>`;
    }).join('');
    return `<div class="adjust-group"><span class="adjust-label">${k.label}</span><div class="adjust-row${k.kind === 'swatch' ? ' adjust-row-swatches' : ''}">${opts}</div></div>`;
  };
  return `
    <div class="adjust-head"><strong>Adjust the look</strong><button class="adjust-close" data-adjust="close" aria-label="Close">×</button></div>
    <div class="adjust-group"><span class="adjust-label">Starting looks</span><div class="adjust-row">
      ${looks.map((l, i) => `<button class="adjust-opt adjust-look" data-look="${i}">${l.name}<small>${l.note}</small></button>`).join('')}
    </div></div>
    ${knobs.map(group).join('')}
    <div class="adjust-actions">
      <button class="adjust-opt" data-adjust="copy">Copy link to this look</button>
      <button class="adjust-opt" data-adjust="reset">Start over</button>
    </div>
    <p class="adjust-note">Fonts depend on the device: the serif and rounded choices look a little different on iPhone and on Windows. The finished app can carry one font of its own so it looks the same everywhere.</p>`;
}

export function startPanel() {
  const btn = document.createElement('button');
  btn.className = 'adjust-btn';
  btn.innerHTML = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>Adjust';
  btn.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('aside');
  panel.className = 'adjust';
  panel.setAttribute('aria-label', 'Adjust the look');
  panel.innerHTML = panelHtml();
  document.body.append(btn, panel);

  const open = on => {
    panel.classList.toggle('is-open', on);
    document.body.classList.toggle('adjust-open', on);
    btn.hidden = on;
    btn.setAttribute('aria-expanded', String(on));
  };
  btn.addEventListener('click', () => open(true));
  panel.addEventListener('click', async e => {
    const knob = e.target.closest('[data-knob]');
    if (knob) return apply({ ...current, [knob.dataset.knob]: knob.dataset.value });
    const look = e.target.closest('[data-look]');
    if (look) return apply({ ...looks[+look.dataset.look].set });
    const act = e.target.closest('[data-adjust]');
    if (!act) return;
    if (act.dataset.adjust === 'close') open(false);
    if (act.dataset.adjust === 'reset') apply({ ...looks[0].set });
    if (act.dataset.adjust === 'copy') {
      const url = location.origin + location.pathname + location.search;
      try { await navigator.clipboard.writeText(url); act.textContent = 'Link copied'; }
      catch { window.prompt('Copy this link:', url); }
      setTimeout(() => { act.textContent = 'Copy link to this look'; }, 2000);
    }
  });
  const openAtStart = new URLSearchParams(location.search).has('adjust');
  apply(readStart());
  if (openAtStart) open(true);
}
