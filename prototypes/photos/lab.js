// Photo lab: real-photo results with enhancement sliders, success rates
// against human-confirmed edges, the spine camera flow, and notes.
// Throwaway prototype code.

import { find, BARS } from '../shared/photo.js';
import { enhance, DEFAULTS } from '../shared/enhance.js';
import { findBook } from '../shared/autocrop.js';
import { findSpine } from '../shared/spine.js';
import { openEditor } from './editor.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage may be blocked */ } } };
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
function toCanvas(img, max = 4000) {
  const s = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const c = document.createElement('canvas'); c.width = Math.round((img.naturalWidth || img.width) * s); c.height = Math.round((img.naturalHeight || img.height) * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c;
}
const outH = kind => (kind === 'spine' ? 900 : 600);

// ---------- settings (sliders) ----------

const LABELS = { whiteBalance: 'White balance', exposure: 'Exposure', evenLight: 'Even lighting', levels: 'Levels', contrast: 'Contrast', glare: 'Glare', sharpen: 'Sharpen' };
let settings = { ...DEFAULTS, ...store.get('loci-lab-settings', {}) };
function renderSliders() {
  $('sliders').innerHTML = Object.keys(LABELS).map(k => `<label>${LABELS[k]} <span class="val" id="v-${k}">${settings[k].toFixed(2)}</span>
    <input type="range" min="0" max="1" step="0.05" value="${settings[k]}" data-set="${k}"></label>`).join('') +
    `<div class="acts"><button class="btn" id="resetSet">Defaults</button><button class="btn" id="copySet">Copy settings</button></div>`;
  let timer = null;
  $('sliders').addEventListener('input', e => {
    const k = e.target.dataset.set; if (!k) return;
    settings[k] = +e.target.value; $('v-' + k).textContent = settings[k].toFixed(2); store.set('loci-lab-settings', settings);
    clearTimeout(timer); timer = setTimeout(() => items.forEach(redrawOutput), 120);
  });
  $('resetSet').onclick = () => { settings = { ...DEFAULTS }; store.set('loci-lab-settings', settings); renderSliders(); items.forEach(redrawOutput); };
  $('copySet').onclick = async e => { const t = JSON.stringify(settings); try { await navigator.clipboard.writeText(t); e.target.textContent = 'Copied'; } catch { prompt('Settings:', t); } };
}

// ---------- the photo set ----------

let items = [];
let truth = {};

async function loadSet() {
  let list = [];
  try { list = await (await fetch('real/photos.json', { cache: 'no-store' })).json(); } catch { list = []; }
  try { truth = await (await fetch('real/truth.json', { cache: 'no-store' })).json(); } catch { truth = {}; }
  truth = { ...truth, ...store.get('loci-lab-truth', {}) };
  const real = list.filter(p => !p.sample).length;
  $('set-status').innerHTML = real
    ? `${real} real photos from <code>inputs/photos/</code>: ${list.filter(p => !p.cropped && p.kind === 'cover').length} uncropped covers and ${list.filter(p => !p.cropped && p.kind === 'spine').length} uncropped spines (on the wood table in daylight, one on the duvet), plus ${list.filter(p => p.cropped).length} photos already cropped in the phone's editor. No duplicate files; 18 of them are the photos you sent in chat earlier. Reduced to 1,600 pixels on the long side for this page.`
    : `<strong>Waiting for your test set.</strong> Your 30+ photos in <code>inputs/photos/</code> are not there yet, so this page shows only the one uncropped photo it has (the Concordia Theological Quarterly spine). Nothing on this page is measured on composites any more. When the photos arrive they are added here, and the rates below fill in after the review.`;
  items = [];
  $('results').innerHTML = '';
  // Uncropped photos first; each result appears as soon as it is ready.
  const ordered = [...list.filter(p => !p.cropped), ...list.filter(p => p.cropped)];
  for (const p of ordered) {
    const img = await loadImg(p.file);
    const photo = toCanvas(img);
    const it = { ...p, photo, original: store.get('loci-lab-original', {})[p.file] || false, view: 'after' };
    items.push(it);
    process(it); renderCard(it);
    await new Promise(r => setTimeout(r, 0)); // let the page draw between photos
  }
  renderRates(); renderReview();
}

function process(it) {
  const t0 = performance.now();
  it.r = find(it.photo, it.kind);
  it.findMs = performance.now() - t0;
  it.quad = it.userQuad || it.r.quad;
}

function drawSrc(it) {
  const c = it.el.querySelector('canvas.src'), x = c.getContext('2d');
  c.width = 300; c.height = 400;
  const s = Math.min(300 / it.photo.width, 400 / it.photo.height), ox = (300 - it.photo.width * s) / 2, oy = (400 - it.photo.height * s) / 2;
  x.fillStyle = '#222'; x.fillRect(0, 0, 300, 400); x.drawImage(it.photo, ox, oy, it.photo.width * s, it.photo.height * s);
  const line = (q, col, wdt) => { if (!q) return; x.strokeStyle = col; x.lineWidth = wdt; x.beginPath(); q.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](ox + p[0] * s, oy + p[1] * s)); x.closePath(); x.stroke(); };
  if (truth[it.file]) line(truth[it.file].quad, '#4da3ff', 4);
  line(it.quad, it.r.auto && !it.userQuad ? '#2bd463' : '#e3b24f', 2.5);
}

function redrawOutput(it) {
  const t0 = performance.now();
  const e = enhance(it.photo, it.quad, outH(it.kind), settings);
  it.enhanceMs = performance.now() - t0;
  it.before = e.before; it.after = e.after; it.info = e.info;
  const box = it.el.querySelector('.outbox'); box.innerHTML = '';
  const show = it.original || it.view === 'before' ? it.before : it.after;
  box.append(show);
  it.el.querySelector('.timing').textContent = `Find ${Math.round(it.findMs)} ms · enhance ${Math.round(it.enhanceMs)} ms on this device · reference: ${it.info.reference}`;
}

function errVsTruth(it) {
  const t = truth[it.file]; if (!t) return null;
  const q = it.quad, tq = t.quad;
  const w = Math.min((Math.hypot(tq[1][0] - tq[0][0], tq[1][1] - tq[0][1]) + Math.hypot(tq[2][0] - tq[3][0], tq[2][1] - tq[3][1])) / 2,
    (Math.hypot(tq[3][0] - tq[0][0], tq[3][1] - tq[0][1]) + Math.hypot(tq[2][0] - tq[1][0], tq[2][1] - tq[1][1])) / 2);
  const worst = Math.max(...q.map((p, i) => Math.hypot(p[0] - tq[i][0], p[1] - tq[i][1])));
  return { px: worst, rel: worst / w };
}

function renderCard(it) {
  const el = document.createElement('div'); el.className = 'res'; it.el = el;
  const r = it.r;
  const ev = errVsTruth(it);
  el.innerHTML = `<h4>${esc(it.title || it.file.split('/').pop())}</h4>
    <p class="small muted" style="margin:0">${esc(it.kind)}${it.note ? ' · ' + esc(it.note) : ''}${it.sample ? ' · the one real photo available so far' : ''}</p>
    <div class="row2"><canvas class="src"></canvas><div class="outbox"></div></div>
    <span class="verdict ${r.auto ? 'v-good' : 'v-check'}">${r.auto ? 'Saved without asking' : 'Asks: ' + esc(r.reason)}</span>
    <p class="stats">Estimated error ${r.relErr != null ? (r.relErr * 100).toFixed(1) + '% of the width' : '—'} (bar ${BARS[it.kind] * 100}%)${ev ? ` · actual ${(ev.rel * 100).toFixed(1)}% (${ev.px.toFixed(1)} px)` : ' · actual: not reviewed yet'}</p>
    <p class="stats timing"></p>
    <div class="ctrl"><button class="btn" data-a="toggle">Before / after</button><label><input type="checkbox" data-a="original" ${it.original ? 'checked' : ''}> Use original</label><button class="btn" data-a="recrop">Re-crop</button></div>
    <div class="editbox"></div>`;
  $('results').append(el);
  drawSrc(it); redrawOutput(it);
  el.addEventListener('click', e => {
    const a = e.target.dataset.a;
    if (a === 'toggle') { it.view = it.view === 'after' ? 'before' : 'after'; e.target.textContent = it.view === 'after' ? 'Before / after' : 'Showing before'; redrawOutput(it); }
    if (a === 'recrop') {
      const box = el.querySelector('.editbox');
      if (box.childElementCount) { box.innerHTML = ''; return; }
      openEditor(box, it.photo, it.kind, it.quad, q => { it.quad = q; it.userQuad = q; drawSrc(it); redrawOutput(it); });
    }
  });
  el.addEventListener('change', e => {
    if (e.target.dataset.a === 'original') {
      it.original = e.target.checked;
      const o = store.get('loci-lab-original', {}); o[it.file] = it.original; store.set('loci-lab-original', o);
      redrawOutput(it);
    }
  });
}

// ---------- success rates ----------

function renderRates() {
  const rows = ['cover', 'spine'].map(kind => {
    const all = items.filter(i => i.kind === kind && !i.sample && !i.cropped), rev = all.filter(i => truth[i.file]);
    const s = { n: all.length, rev: rev.length, autoRight: 0, autoWrong: 0, askedRight: 0, askedWrong: 0 };
    for (const i of rev) {
      const ok = errVsTruth({ ...i, quad: i.r.quad }).rel <= BARS[kind];
      if (i.r.auto) ok ? s.autoRight++ : s.autoWrong++; else ok ? s.askedRight++ : s.askedWrong++;
    }
    return { kind, ...s };
  });
  const cropped = items.filter(i => i.cropped), keptWhole = cropped.filter(i => i.r.wholeImage && i.r.auto).length;
  const pct = (a, b) => (b ? Math.round(a / b * 100) + '%' : '—');
  $('rates').innerHTML = `
  <h3>Measured against your review</h3>
  <table class="tbl-num">
    <tr><th>Uncropped photos</th><th>Photos</th><th>Reviewed</th><th>Saved by itself, right</th><th>Saved by itself, wrong</th><th>Asked (would have been right)</th><th>Asked (needed fixing)</th><th>Success rate</th></tr>
    ${rows.map(r => `<tr><td>${r.kind === 'cover' ? 'Covers' : 'Spines'}</td><td>${r.n}</td><td>${r.rev}</td><td>${r.autoRight}</td><td>${r.autoWrong}</td><td>${r.askedRight}</td><td>${r.askedWrong}</td><td><b>${pct(r.autoRight, r.rev)}</b></td></tr>`).join('')}
  </table>
  <p class="small muted">Success rate: the share of reviewed photos that were saved without asking <em>and</em> were right. "Saved by itself, wrong" must stay at zero; if it does not, the bar is tightened. ${rows.some(r => r.rev) ? '' : '<span class="pending">Fills in after the review below.</span>'}</p>
  <p class="small">Already-cropped photos (from the phone's editor): <b>${keptWhole} of ${cropped.length}</b> recognised and kept whole without asking.</p>
  <h3>Provisional, checked by eye (9 Nov 2026)</h3>
  <p class="small">Before your review, every automatic result was checked by eye on magnified corners (good to about 2 to 3 pixels, not 1). These are the numbers after the two fixes described below.</p>
  <table class="tbl-num">
    <tr><th>Uncropped photos</th><th>Photos</th><th>Saved by itself, right</th><th>Saved by itself, wrong</th><th>Asked</th><th>Success rate</th></tr>
    <tr><td>Covers</td><td>14</td><td>12</td><td>0</td><td>2 (a book far from the camera; one right at the edge-clarity limit, which saves in some browsers)</td><td><b>86%</b></td></tr>
    <tr><td>Spines</td><td>15</td><td>1</td><td>0</td><td>14 (13 because a hand may hide an end)</td><td><b>7%</b></td></tr>
  </table>
  <p class="small"><b>What the real photos taught, and what changed:</b></p>
  <ul class="pros" style="max-width:46em">
    <li><b>Hands hide spine ends.</b> In 11 of the 15 spine photos a hand holds one end. Before the fix, three spines were saved without asking but cut short where the hand began: the edges were measured precisely, they just stopped at the hand. Now the app checks that the surface just beyond each end matches the surface beside the spine; if something else is there, it asks. In the camera flow the advice is: lay the book on its back cover, or hold it by the middle, never by the ends.</li>
    <li><b>Already-cropped photos.</b> Two photos cropped in the phone's editor were cropped a second time. Now a photo that does not have a camera's exact shape (3 : 4, 9 : 16 and so on) is used as it is. Photos from the app's own camera are always treated as uncropped.</li>
    <li><b>White balance on wood.</b> On the wood table, the old rule took the brown wood for a grey mat and would have turned books blue. Measured on these photos, a dark grey surface cannot be told from brown wood by color or texture, so only a light surface (the duvet, the light side of a mat) is now used as white. Everything else gets a cautious estimate from the book itself. None of the test photos were taken on a mat, so the mat path is still untested on real photos.</li>
    <li><b>Lighting correction was too strong</b> on wood (the book's own shadow looked like dim light). It is now gentler by default and samples the surface further from the book.</li>
  </ul>`;
}

// ---------- review: confirm or correct the true edges ----------

let reviewAt = 0;
function renderReview() {
  const todo = items.filter(i => !truth[i.file]);
  const box = $('review');
  if (!items.length) { box.innerHTML = '<p class="muted">Nothing to review yet.</p>'; return; }
  const done = items.length - todo.length;
  box.innerHTML = `<h3 style="margin-top:0">Review: mark the true edges</h3>
    <p class="small">${done} of ${items.length} reviewed. For each photo: if the outline is exactly on the book's edges, tap <b>Right as found</b>; if not, drag it onto the true edges (use the magnifier) and tap <b>Save my correction</b>. Your answers stay in this browser until you download them.</p>
    <div id="revEdit"></div>
    <div class="actions"><button class="btn btn-primary" id="revRight">Right as found</button><button class="btn" id="revSave">Save my correction</button><button class="btn" id="revSkip">Skip</button>
    <button class="btn" id="revDl">Download truth.json</button><button class="btn" id="revReset">Start review over</button></div>
    <p class="small muted">Then put <code>truth.json</code> in <code>inputs/photos/</code>, and the measured rates are published here.</p>`;
  const it = todo[reviewAt % Math.max(1, todo.length)];
  let editor = null;
  if (it) { $('revEdit').innerHTML = `<p class="small"><b>${esc(it.title || it.file.split('/').pop())}</b> (${it.kind})</p><div></div>`; editor = openEditor($('revEdit').lastElementChild, it.photo, it.kind, it.r.quad); }
  else $('revEdit').innerHTML = '<p class="small">All photos reviewed.</p>';
  const saveTruth = q => {
    truth[it.file] = { kind: it.kind, quad: q.map(p => p.map(v => +v.toFixed(1))), size: [it.photo.width, it.photo.height] };
    const local = store.get('loci-lab-truth', {}); local[it.file] = truth[it.file]; store.set('loci-lab-truth', local);
    drawSrc(it); renderRates(); renderReview();
  };
  $('revRight').onclick = () => it && saveTruth(it.r.quad);
  $('revSave').onclick = () => it && editor && saveTruth(editor.quad);
  $('revSkip').onclick = () => { reviewAt++; renderReview(); };
  $('revDl').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(truth, null, 2) + '\n'], { type: 'application/json' }));
    a.download = 'truth.json'; a.click();
  };
  $('revReset').onclick = () => { store.set('loci-lab-truth', {}); loadSet(); };
}

// ---------- camera: the spine flow ----------

let kind = 'spine', stream = null, loop = null, history = [], busy = false, hint = 0, gumCalls = 0, gumMs = [];
const video = $('video'), overlay = $('overlay'), msg = $('msg');

function guideViewer() {
  // The tall frame, in viewer pixels: 26% wide, 86% tall, centred.
  const vw = overlay.clientWidth, vh = overlay.clientHeight;
  return kind === 'spine' ? [vw * 0.37, vh * 0.07, vw * 0.63, vh * 0.93] : [vw * 0.12, vh * 0.1, vw * 0.88, vh * 0.9];
}
function viewerToVideo([x, y]) {
  const vw = video.videoWidth, vh = video.videoHeight, ow = overlay.clientWidth, oh = overlay.clientHeight;
  const s = Math.max(ow / vw, oh / vh), ox = (ow - vw * s) / 2, oy = (oh - vh * s) / 2;
  return [(x - ox) / s, (y - oy) / s];
}
function videoToOverlay([x, y]) {
  const vw = video.videoWidth, vh = video.videoHeight, ow = overlay.width, oh = overlay.height;
  const s = Math.max(ow / vw, oh / vh), ox = (ow - vw * s) / 2, oy = (oh - vh * s) / 2;
  return [ox + x * s, oy + y * s];
}
function placeGuide() {
  const g = guideViewer(), f = $('guideFrame');
  f.hidden = !stream; Object.assign(f.style, { left: g[0] + 'px', top: g[1] + 'px', width: (g[2] - g[0]) + 'px', height: (g[3] - g[1]) + 'px' });
}
const guideVideo = () => { const g = guideViewer(); return [...viewerToVideo([g[0], g[1]]), ...viewerToVideo([g[2], g[3]])]; };

function drawLive(q, col, progress) {
  const x = overlay.getContext('2d'); x.clearRect(0, 0, overlay.width, overlay.height);
  if (!q) return;
  const pts = q.map(videoToOverlay);
  x.lineWidth = 3 * devicePixelRatio; x.strokeStyle = col;
  x.beginPath(); pts.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0], p[1])); x.closePath(); x.stroke();
  if (progress > 0) {
    const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cy = pts.reduce((s, p) => s + p[1], 0) / 4, rr = 20 * devicePixelRatio;
    x.lineWidth = 5 * devicePixelRatio; x.strokeStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.stroke();
    x.strokeStyle = '#fff'; x.beginPath(); x.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2); x.stroke();
  }
}

async function startCamera() {
  if (stream) return stopCamera();
  const t0 = performance.now();
  try {
    // Ask for the most the camera can give; the browser picks the nearest it supports.
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 4096 }, height: { ideal: 4096 } }, audio: false });
  } catch (e) { msg.textContent = 'Camera not available: ' + e.message; return; }
  gumCalls++; gumMs.push(Math.round(performance.now() - t0));
  video.srcObject = stream; video.hidden = false; await video.play();
  $('idle').hidden = true; $('snapBtn').hidden = false; $('camBtn').textContent = 'Stop camera';
  overlay.width = overlay.clientWidth * devicePixelRatio; overlay.height = overlay.clientHeight * devicePixelRatio;
  placeGuide(); history = []; hint = 0;
  const st = stream.getVideoTracks()[0].getSettings();
  $('camstats').textContent = `Camera: ${st.width} × ${st.height} · camera opened ${gumCalls} time(s) this visit (${gumMs.join(', ')} ms)`;
  loop = setInterval(tick, 150);
}
function stopCamera() {
  clearInterval(loop); loop = null;
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null; video.hidden = true; $('idle').hidden = false; $('snapBtn').hidden = true; $('camBtn').textContent = 'Start camera';
  drawLive(null); msg.textContent = ''; placeGuide();
}

function tick() {
  if (busy || video.readyState < 2) return;
  let q = null, ok = false, ms = 0;
  if (kind === 'spine') {
    const r = findSpine(video, { work: 360, refine: false, guide: guideVideo() });
    ms = r.ms; ok = r.found && r.ambiguity < 0.85; q = r.found ? r.quad : null;
  } else {
    const r = findBook(video, 'cover', { work: 200, hint: hint || undefined });
    ms = r.ms; ok = !r.wholeImage && r.confidence >= 0.6; hint = ok ? r.T : 0; q = r.wholeImage ? null : r.quad;
  }
  history.push(ok ? q : null); if (history.length > 6) history.shift();
  const size = Math.max(video.videoWidth, video.videoHeight);
  const steady = history.length === 6 && history.every(h => h) && history.every(h => h.every((p, i) => Math.hypot(p[0] - history[5][i][0], p[1] - history[5][i][1]) < size * 0.012));
  msg.textContent = (ok ? (steady ? 'Got it' : 'Hold still…') : kind === 'spine' ? 'Fill the frame with the spine, top to bottom. Hold the book by its middle, not its ends' : 'Looking for the cover…') + `  ·  ${Math.round(ms)} ms`;
  drawLive(q, ok ? 'rgb(43,212,99)' : 'rgb(227,178,79)', steady ? 1 : history.filter(Boolean).length / 6);
  if (steady) capture();
}

function frameCanvas() {
  const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
  c.getContext('2d').drawImage(video, 0, 0); return c;
}

function capture(fromPhoto) {
  busy = true;
  const frame = fromPhoto || frameCanvas();
  if (!fromPhoto) { const f = $('flash'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 60); if (navigator.vibrate) navigator.vibrate(40); }
  const guide = !fromPhoto && kind === 'spine' ? guideVideo() : undefined;
  const t0 = performance.now();
  const r = find(frame, kind, { guide, fromCamera: !fromPhoto });
  const e = enhance(frame, r.quad || [[0, 0], [frame.width, 0], [frame.width, frame.height], [0, frame.height]], outH(kind), settings);
  const total = Math.round(performance.now() - t0);
  const box = $('camResult');
  const resume = () => { history = []; busy = false; };
  if (r.auto) {
    // Saved by itself: a small result with one-tap re-crop; the camera carries on.
    const row = document.createElement('div'); row.className = 'saved';
    row.innerHTML = `<div class="th"></div><div class="grow"><b>Saved</b> · ${frame.width} × ${frame.height} photo · ${total} ms in all<br><span class="muted">estimated edge error ${(r.relErr * 100).toFixed(1)}% of the width</span></div><button class="btn">Re-crop</button>`;
    row.querySelector('.th').append(e.after);
    row.querySelector('button').onclick = () => openCamEditor(frame, r.quad, row);
    if (box.querySelector('.muted.small')) box.innerHTML = '';
    box.prepend(row);
    setTimeout(resume, 1500);
  } else {
    openCamEditor(frame, r.quad || [[frame.width * 0.4, frame.height * 0.1], [frame.width * 0.6, frame.height * 0.1], [frame.width * 0.6, frame.height * 0.9], [frame.width * 0.4, frame.height * 0.9]], null, r.reason, total);
  }
}

function openCamEditor(frame, quad, row, reason, total) {
  const box = $('camResult');
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="small" style="margin:10px 0 4px"><b>${reason ? 'Please check: ' + esc(reason) : 'Re-crop'}.</b> ${kind === 'spine' ? 'Drag the green edge lines or end bars (they snap to the nearest edge); turn with the round handle above the top.' : 'Drag the corners.'}${total ? ` (${total} ms)` : ''}</p>
    <div></div><div class="result-wrap"></div><div class="actions"><button class="btn btn-primary">Use photo</button></div>`;
  box.prepend(wrap);
  const res = wrap.querySelector('.result-wrap');
  const show = q => { const e = enhance(frame, q, outH(kind), settings); e.after.style.maxHeight = '220px'; res.innerHTML = ''; res.append(e.after); };
  const ed = openEditor(wrap.children[1], frame, kind, quad, show);
  show(quad);
  wrap.querySelector('.btn-primary').onclick = () => { wrap.remove(); if (row) { const e = enhance(frame, ed.quad, outH(kind), settings); row.querySelector('.th').innerHTML = ''; row.querySelector('.th').append(e.after); } history = []; busy = false; };
}

$('camBtn').addEventListener('click', startCamera);
$('snapBtn').addEventListener('click', () => capture());
$('pick').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  const bmp = await createImageBitmap(f);
  const c = document.createElement('canvas'); const s = Math.min(1, 4000 / Math.max(bmp.width, bmp.height));
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  capture(c); e.target.value = '';
});
document.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => {
  kind = b.dataset.kind; document.querySelectorAll('[data-kind]').forEach(x => x.classList.toggle('on', x === b)); history = []; placeGuide();
}));

// ---------- masters, permission, line counts ----------

function renderMasters() {
  const book = { shown: SHOWN.cover + SHOWN.spine, master: MASTERS.cover + MASTERS.spine };
  const mb = (kbPerBook, books) => Math.round(kbPerBook * books / 1024);
  $('masters').innerHTML = `
  <p>The idea: for every photo also keep a <strong>master</strong>: straightened, not enhanced, 1,200 pixels on its long side, with a thin margin (3%) around the book so a later re-crop has room. It lives in the data repository but is never copied to phones. If enhancement improves in ten years, every photo can be redone from its master.</p>
  <table class="tbl-num">
    <tr><th>Per book, measured on your earlier photos</th><th>Cover</th><th>Spine</th><th>Both</th></tr>
    <tr><td>Shown in the app (enhanced, 600 / 900 px, plus thumbnail)</td><td>${SHOWN.cover} KB</td><td>${SHOWN.spine} KB</td><td>${book.shown} KB</td></tr>
    <tr><td>Master (1,200 px, JPEG quality 85, unenhanced)</td><td>${MASTERS.cover} KB</td><td>${MASTERS.spine} KB</td><td>${book.master} KB</td></tr>
    <tr><td>Kept on each phone (thumbnails only)</td><td>${THUMBS.cover} KB</td><td>${THUMBS.spine} KB</td><td>${THUMBS.cover + THUMBS.spine} KB</td></tr>
  </table>
  <table class="tbl-num">
    <tr><th>Books with covers and spines</th><th>Data repository, without masters</th><th>With masters</th><th>Each phone</th></tr>
    <tr><td>1,000</td><td>${mb(book.shown, 1000)} MB</td><td>${mb(book.shown + book.master, 1000)} MB</td><td>${mb(THUMBS.cover + THUMBS.spine, 1000)} MB</td></tr>
    <tr><td>1,500</td><td>${mb(book.shown, 1500)} MB</td><td>${mb(book.shown + book.master, 1500)} MB</td><td>${mb(THUMBS.cover + THUMBS.spine, 1500)} MB</td></tr>
  </table>
  <p><strong>Recommendation: yes.</strong> Masters about triple the photo storage, but phones are unaffected, and for 1,500 physical books plus about 200 MB of Logos covers the data repository stays near ${mb(book.shown + book.master, 1500) + 200} MB, under the 1 GB that GitHub handles comfortably. Masters are written once and never changed, so they add almost nothing to the history afterwards. They make today's enhancement choices reversible, which matters for a catalog meant to last 40 years. If the repository ever approached 1 GB, the masters alone could move to the backup drive without touching the app.</p>
  <p class="small muted">Measured on the 7 covers and 7 spines you sent earlier, encoded in the browser exactly as the app would; to be re-measured on the 30+ test photos. Sharpening makes the shown photos about half again as large as unsharpened ones; a JPEG quality of 80 instead of 82 would win most of that back. This is a proposal, not yet in the plan.</p>`;
}

function renderPermission() {
  $('permission').innerHTML = `
  <p><strong>What is known.</strong> Reports from developers and WebKit's own bug tracker agree on three behaviors for web apps added to an iPhone's home screen. Most are bug reports rather than official documentation, and some are several years old, so they need checking on your iPhone:</p>
  <ul class="pros" style="max-width:46em">
    <li><strong>Once per launch.</strong> The home-screen app cannot keep the camera permission between launches: expect one prompt each time the app is opened and the camera started (<a href="https://github.com/Luukalindgren/seeni/issues/69">issue report</a>, <a href="https://bugs.webkit.org/show_bug.cgi?id=215884">WebKit bug 215884</a>).</li>
    <li><strong>On every change of the page address.</strong> In home-screen apps, changing the part of the address after "#" stopped the camera and asked again (<a href="https://bugs.webkit.org/show_bug.cgi?id=215884">WebKit bug 215884</a>). Our app uses such addresses for its screens.</li>
    <li><strong>When the camera is reopened after a while.</strong> One report: asking for the camera again after about 90 seconds prompts again (same bug report). There was also an iOS 18 problem where the camera stopped by itself in home-screen apps (<a href="https://bugs.webkit.org/show_bug.cgi?id=252465">WebKit bug 252465</a>).</li>
  </ul>
  <p><strong>What the app does about it</strong> (so that a long stack costs one prompt at most): the camera is opened once when batch add starts and kept running for the whole stack, between books and while editing; the page address does not change while the camera is open; and if a prompt is refused, the app says plainly how to allow the camera rather than failing silently.</p>
  <p><strong>Test it on your iPhone.</strong> The <a href="camera-permission.html">camera permission test</a> runs a simulated 30-book stack four ways (one camera kept open, camera reopened per step, address changed per step, and a two-minute pause) and counts the prompts. Add it to the home screen first (Share, then "Add to Home Screen"), open it from there, and paste back its report.</p>`;
}

async function renderLines() {
  const files = [['../shared/autocrop.js', 'Finding a cover (first pass), straightening'], ['../shared/refine.js', 'Edge refinement, error estimate'], ['../shared/spine.js', 'Spine mode'], ['../shared/photo.js', 'One entry point, save rules'], ['../shared/enhance.js', 'Enhancement'], ['editor.js', 'Corner and edge-line editor']];
  let total = 0, kb = 0;
  const rows = [];
  for (const [f, what] of files) {
    const t = await (await fetch(f)).text();
    const n = t.split('\n').length; total += n; kb += t.length / 1024;
    rows.push(`<tr><td><code>${f.replace('../', '')}</code></td><td>${what}</td><td>${n}</td><td>${(t.length / 1024).toFixed(1)} KB</td></tr>`);
  }
  $('lines').innerHTML = `<table class="tbl-num"><tr><th>File</th><th>What it does</th><th>Lines</th><th>Size</th></tr>${rows.join('')}
    <tr><td><b>Total</b></td><td></td><td><b>${total}</b></td><td><b>${kb.toFixed(1)} KB</b></td></tr></table>
    <p class="small">Plain JavaScript, no library, loaded only on the camera screen. Comments are included in the counts. Time per photo is shown on each result above and in the camera; the budget is half a second on a phone.</p>`;
}

// Measured 9 Nov 2026 on the earlier photos (KB per photo).
const MASTERS = { cover: 159, spine: 34 }, SHOWN = { cover: 73, spine: 34 }, THUMBS = { cover: 6, spine: 3 };

renderSliders();
renderMasters();
renderPermission();
renderLines();
loadSet();
