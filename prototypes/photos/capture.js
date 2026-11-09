// Capture and display page: a live test of automatic book finding on real and
// composite photos, a working in-app camera prototype, and layout mockups.
// Throwaway prototype code.

import { findBook, straighten, drawInto } from '../shared/autocrop.js';
import { mark } from '../shared/logo.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const img = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const B = 'img/';

const books = [
  { key: 'lw4', title: "Luther's Works 4", author: 'Martin Luther', a: 0.653 },
  { key: 'graff', a: 0.663, title: 'A History of the Dissolution of Ancient Liturgical Forms', author: 'Paul Graff' },
  { key: 'towers', a: 0.64, title: 'The Two Towers', author: 'J. R. R. Tolkien' },
  { key: 'ubs', a: 0.693, title: 'Greek New Testament (UBS 6)', author: 'A Reader\'s Edition' },
  { key: 'prince', a: 0.627, title: 'The Prince', author: 'Niccolò Machiavelli' },
  { key: 'hebrew', a: 0.753, title: 'Basics of Biblical Hebrew Grammar', author: 'Pratico and Van Pelt' },
  { key: 'ctq', a: 0.673, title: 'Concordia Theological Quarterly 90:3–4', author: 'Concordia Theological Seminary' },
];

// ---------- 2. test bench ----------

function rotQuad(cx, cy, w, h, deg, persp = 0.96) {
  const t = deg * Math.PI / 180, c = Math.cos(t), s = Math.sin(t);
  const top = w * persp;
  return [[-top / 2, -h / 2], [top / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}

async function scene(bg, picture, quad) {
  const c = document.createElement('canvas'); c.width = 600; c.height = 800;
  const x = c.getContext('2d');
  if (bg === 'duvet') {
    const d = await img(B + 'bg-duvet.jpg');
    const s = Math.max(600 / d.width, 800 / d.height);
    x.drawImage(d, (600 - d.width * s) / 2, (800 - d.height * s) / 2, d.width * s, d.height * s);
  } else {
    x.fillStyle = '#2a2c2e'; x.fillRect(0, 0, 600, 800);
    const id = x.getImageData(0, 0, 600, 800);
    for (let i = 0; i < id.data.length; i += 4) { const n = (Math.random() - 0.5) * 14; id.data[i] += n; id.data[i + 1] += n; id.data[i + 2] += n; }
    x.putImageData(id, 0, 0);
  }
  x.save(); x.shadowColor = 'rgba(0,0,0,0.35)'; x.shadowBlur = 22; x.shadowOffsetX = 7; x.shadowOffsetY = 10;
  x.fillStyle = '#777'; x.beginPath(); quad.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0], p[1])); x.closePath(); x.fill(); x.restore();
  drawInto(x, picture, quad);
  return c;
}

const verdict = (r, expectWhole) => r.wholeImage ? (expectWhole ? ['v-good', 'Already cropped: used as it is'] : ['v-fail', 'Missed the book: asks you to place corners']) :
  expectWhole ? ['v-fail', 'Cropped a photo that was already cropped'] :
  r.confidence >= 0.72 ? ['v-good', 'Found: saves without asking'] : r.confidence >= 0.45 ? ['v-check', 'Found: shows corners to check'] : ['v-fail', 'Unsure: asks you to place corners'];

async function runBench() {
  const [graff, ubs, towers, prince, princeSp, ubsSp, hebrew, ctqRaw] = await Promise.all(
    ['graff-cover', 'ubs-cover', 'towers-cover', 'prince-cover', 'prince-spine', 'ubs-spine', 'hebrew-cover', 'ctq-spine-raw'].map(n => img(B + n + '.jpg')));
  const cover = (im, deg, w = 330) => rotQuad(300, 405, w, w / (im.width / im.height), deg);
  const spine = (im, deg, h = 640) => rotQuad(300, 400, h * (im.width / im.height), h, deg, 1);
  const cases = [
    { name: 'Concordia Theological Quarterly spine', note: 'Your real photo, uncropped, on the duvet', kind: 'spine', source: ctqRaw },
    { name: 'Graff, cover', note: 'Grey cloth on the duvet, tilted', kind: 'cover', bg: 'duvet', pic: graff, quad: cover(graff, -4) },
    { name: 'Graff, cover, dark mat', note: 'The same grey cover on the dark side of a mat', kind: 'cover', bg: 'mat', pic: graff, quad: cover(graff, -4) },
    { name: 'UBS Greek NT, cover', note: 'Dark maroon on the duvet', kind: 'cover', bg: 'duvet', pic: ubs, quad: cover(ubs, 3) },
    { name: 'The Prince, cover', note: 'Painting with a white band', kind: 'cover', bg: 'duvet', pic: prince, quad: cover(prince, -2) },
    { name: 'The Two Towers, cover', note: 'Cream jacket on a white duvet: light on light', kind: 'cover', bg: 'duvet', pic: towers, quad: cover(towers, 2) },
    { name: 'The Prince, spine', note: 'White spine on the white duvet, like your screenshot', kind: 'spine', bg: 'duvet', pic: princeSp, quad: spine(princeSp, 2) },
    { name: 'The Prince, spine, dark mat', note: 'The same spine on the dark side of a mat', kind: 'spine', bg: 'mat', pic: princeSp, quad: spine(princeSp, 2) },
    { name: 'UBS Greek NT, spine, dark mat', note: 'Dark on dark: the hard case the other way round', kind: 'spine', bg: 'mat', pic: ubsSp, quad: spine(ubsSp, -3) },
    { name: 'UBS Greek NT, spine, duvet', note: 'The same spine on a light surface', kind: 'spine', bg: 'duvet', pic: ubsSp, quad: spine(ubsSp, -3) },
    { name: 'Basics of Biblical Hebrew, cover', note: 'Already cropped by the phone', kind: 'cover', source: hebrew, expectWhole: true },
  ];
  const cards = [];
  let good = 0, total = 0;
  for (const cs of cases) {
    const source = cs.source || await scene(cs.bg, cs.pic, cs.quad);
    const r = findBook(source, cs.kind);
    const sw = source.naturalWidth || source.width, sh = source.naturalHeight || source.height;
    // Accuracy against the known corners of the test photos.
    let err = '';
    if (cs.quad && !r.wholeImage) {
      const e = r.quad.reduce((s, p, i) => s + Math.hypot(p[0] - cs.quad[i][0], p[1] - cs.quad[i][1]), 0) / 4;
      const size = Math.min(...[0, 1].map(k => Math.hypot(cs.quad[k][0] - cs.quad[k + 1][0], cs.quad[k][1] - cs.quad[k + 1][1])));
      err = ` · corners off by ${Math.round(e)} px (${Math.round(e / size * 100)}% of the book's width)`;
    }
    const [cls, label] = verdict(r, cs.expectWhole);
    if (cls === 'v-good') good++; total++;
    const thumb = document.createElement('canvas'); thumb.className = 'in';
    const tw = 300, th = 400; thumb.width = tw; thumb.height = th;
    const tx = thumb.getContext('2d'), s = Math.min(tw / sw, th / sh);
    tx.fillStyle = '#222'; tx.fillRect(0, 0, tw, th);
    const ox = (tw - sw * s) / 2, oy = (th - sh * s) / 2;
    tx.drawImage(source, ox, oy, sw * s, sh * s);
    tx.strokeStyle = cls === 'v-good' ? '#2bd463' : cls === 'v-check' ? '#e3b24f' : '#ff6b5e'; tx.lineWidth = 4;
    tx.beginPath(); r.quad.forEach((p, i) => tx[i ? 'lineTo' : 'moveTo'](ox + p[0] * s, oy + p[1] * s)); tx.closePath(); tx.stroke();
    const out = straighten(source, r.quad, cs.kind === 'spine' ? 450 : 300);
    out.className = 'outimg';
    cards.push({ cs, r, cls, label, err, thumb, out });
  }
  $('bench').innerHTML = '';
  for (const c of cards) {
    const el = document.createElement('div'); el.className = 'case';
    el.innerHTML = `<h4>${esc(c.cs.name)}</h4><p class="small muted" style="margin:0">${esc(c.cs.note)}</p><div class="pair"></div>
      <span class="verdict ${c.cls}">${esc(c.label)}</span>
      <p class="stats">Found in ${Math.round(c.r.ms)} ms · confidence ${Math.round(c.r.confidence * 100)}%${c.r.lowContrast ? ' · low contrast' : ''}${c.err}</p>`;
    el.querySelector('.pair').append(c.thumb, c.out);
    $('bench').append(el);
  }
  $('bench-note').textContent = `${good} of ${total} would save without asking on this computer. Times are for this computer; a phone is usually two to four times slower, still well under half a second.`;
}

// ---------- 3. live camera ----------

let kind = 'cover', stream = null, loop = null, history = [], frozen = false, hint = 0, lastMs = 0;
const overlay = $('overlay'), video = $('video'), msg = $('msg');

function videoToOverlay(p) {
  // The video fills the viewer with object-fit: cover; map video pixels to overlay pixels.
  const vw = video.videoWidth, vh = video.videoHeight, ow = overlay.width, oh = overlay.height;
  const s = Math.max(ow / vw, oh / vh), ox = (ow - vw * s) / 2, oy = (oh - vh * s) / 2;
  return [ox + p[0] * s, oy + p[1] * s];
}

function drawOverlay(quad, color, progress) {
  const x = overlay.getContext('2d');
  x.clearRect(0, 0, overlay.width, overlay.height);
  if (!quad) return;
  const pts = quad.map(videoToOverlay);
  x.lineWidth = 4 * devicePixelRatio; x.strokeStyle = color; x.fillStyle = color.replace('rgb', 'rgba').replace(')', ',0.15)');
  x.beginPath(); pts.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0], p[1])); x.closePath(); x.fill(); x.stroke();
  if (progress > 0) {
    const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cy = pts.reduce((s, p) => s + p[1], 0) / 4, rr = 22 * devicePixelRatio;
    x.lineWidth = 5 * devicePixelRatio; x.strokeStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = '#fff'; x.beginPath(); x.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2); x.stroke();
  }
}

async function startCamera() {
  if (stream) return stopCamera();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
  } catch (e) { msg.textContent = 'Camera not available: ' + e.message; return; }
  video.srcObject = stream; video.hidden = false; await video.play();
  $('idle').hidden = true; $('snapBtn').hidden = false; $('camBtn').textContent = 'Stop camera';
  overlay.width = overlay.clientWidth * devicePixelRatio; overlay.height = overlay.clientHeight * devicePixelRatio;
  frozen = false; history = [];
  loop = setInterval(tick, 140);
}

function stopCamera() {
  clearInterval(loop); loop = null;
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null; video.hidden = true; $('idle').hidden = false; $('snapBtn').hidden = true; $('camBtn').textContent = 'Start camera';
  drawOverlay(null); msg.textContent = '';
}

function tick() {
  if (frozen || video.readyState < 2) return;
  // Track: reuse the threshold that worked last time; search fully when lost.
  const r = findBook(video, kind, { work: 200, hint: hint || undefined });
  hint = !r.wholeImage && r.confidence >= 0.6 ? r.T : 0;
  lastMs = Math.round(r.ms);
  const ok = !r.wholeImage && r.confidence >= 0.6;
  history.push(ok ? r.quad : null); if (history.length > 6) history.shift();
  const size = Math.max(video.videoWidth, video.videoHeight);
  const steady = history.length === 6 && history.every(q => q) &&
    history.every(q => q.every((p, i) => Math.hypot(p[0] - history[5][i][0], p[1] - history[5][i][1]) < size * 0.02));
  const held = history.filter(q => q).length;
  if (!ok) { msg.textContent = r.lowContrast ? 'Hard to see the edges: try a plainer surface' : `Looking for the ${kind}…`; drawOverlay(r.wholeImage ? null : r.quad, 'rgb(227,178,79)', 0); return; }
  msg.textContent = (steady ? 'Got it' : 'Hold still…') + `  ·  ${lastMs} ms`;
  drawOverlay(r.quad, 'rgb(43,212,99)', steady ? 1 : held / 6);
  if (steady) capture(r.quad);
}

function frameCanvas() {
  const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
  c.getContext('2d').drawImage(video, 0, 0); return c;
}

function capture(quad) {
  frozen = true;
  const f = $('flash'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 60);
  if (navigator.vibrate) navigator.vibrate(40);
  const frame = frameCanvas();
  stopCamera();
  openEditor(frame, quad || defaultQuad(frame), 'Captured automatically');
}

function defaultQuad(c) {
  const w = c.width, h = c.height;
  const bw = kind === 'spine' ? w * 0.18 : w * 0.6, bh = kind === 'spine' ? h * 0.85 : Math.min(h * 0.8, bw * 1.5);
  return [[(w - bw) / 2, (h - bh) / 2], [(w + bw) / 2, (h - bh) / 2], [(w + bw) / 2, (h + bh) / 2], [(w - bw) / 2, (h + bh) / 2]];
}

function openEditor(frame, quad, how) {
  const ed = $('editor');
  ed.innerHTML = `<p class="small" style="margin-top:0"><b>${esc(how)}.</b> Drag a corner to adjust; a magnifier shows while you drag.</p>
    <div class="edit" id="edit"></div>
    <div class="result-wrap" id="result"></div>
    <div class="livebar"><button class="btn" id="again">Retake</button><button class="btn btn-primary" id="keep">Use photo</button></div>
    <p class="small muted" id="keepmsg"></p>`;
  const box = $('edit');
  const disp = document.createElement('canvas');
  const maxH = 420, s = Math.min(1, maxH / frame.height, (ed.clientWidth || 360) / frame.width);
  disp.width = frame.width; disp.height = frame.height; disp.style.width = frame.width * s + 'px';
  disp.getContext('2d').drawImage(frame, 0, 0);
  box.append(disp);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${frame.width} ${frame.height}`);
  const r = Math.max(frame.width, frame.height) / 45;
  svg.innerHTML = `<polygon class="poly" stroke-width="${r / 4}"/>` + quad.map((_, i) => `<circle class="hdl" data-i="${i}" r="${r}" stroke-width="${r / 3}"/>`).join('');
  box.append(svg);
  const loupe = document.createElement('div'); loupe.className = 'loupe';
  const lc = document.createElement('canvas'); lc.width = 220; lc.height = 220; lc.style.width = '100%'; lc.style.height = '100%';
  loupe.append(lc); box.append(loupe);
  const pts = quad.map(p => [p[0], p[1]]);
  const paint = () => {
    svg.querySelector('polygon').setAttribute('points', pts.map(p => p.join(',')).join(' '));
    svg.querySelectorAll('.hdl').forEach((h, i) => { h.setAttribute('cx', pts[i][0]); h.setAttribute('cy', pts[i][1]); });
  };
  const result = () => {
    const out = straighten(frame, pts, kind === 'spine' ? 900 : 600);
    const kb = Math.round(out.toDataURL('image/jpeg', 0.82).length * 0.75 / 1024);
    out.style.height = (kind === 'spine' ? 260 : 220) + 'px';
    $('result').innerHTML = ''; $('result').append(out);
    const p = document.createElement('p'); p.className = 'small muted'; p.textContent = `${out.width} × ${out.height} px, about ${kb} KB`;
    $('result').append(p);
  };
  paint(); result();
  let drag = null;
  const toSvg = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [Math.max(0, Math.min(frame.width, q.x)), Math.max(0, Math.min(frame.height, q.y))]; };
  const showLoupe = (e, p) => {
    const rect = box.getBoundingClientRect();
    loupe.style.display = 'block';
    loupe.style.left = (e.clientX - rect.left - 55) + 'px'; loupe.style.top = (e.clientY - rect.top - 140) + 'px';
    const z = 3 * (frame.width / disp.clientWidth) / 3, half = 110 / 3 * z;
    const x = lc.getContext('2d'); x.clearRect(0, 0, 220, 220);
    x.drawImage(frame, p[0] - half, p[1] - half, half * 2, half * 2, 0, 0, 220, 220);
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(110, 90); x.lineTo(110, 130); x.moveTo(90, 110); x.lineTo(130, 110); x.stroke();
  };
  svg.addEventListener('pointerdown', e => { const h = e.target.closest('.hdl'); if (!h) return; drag = +h.dataset.i; svg.setPointerCapture(e.pointerId); e.preventDefault(); showLoupe(e, pts[drag]); });
  svg.addEventListener('pointermove', e => { if (drag === null) return; pts[drag] = toSvg(e); paint(); showLoupe(e, pts[drag]); });
  const end = () => { if (drag === null) return; drag = null; loupe.style.display = 'none'; result(); };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  $('again').onclick = () => { $('editor').innerHTML = '<p class="muted small">The captured photo and its straightened result appear here.</p>'; startCamera(); };
  $('keep').onclick = () => { $('keepmsg').textContent = 'In the app this would be saved to the book now, and the camera would move on to the next step. (Prototype: nothing is stored.)'; };
}

$('camBtn').addEventListener('click', startCamera);
$('snapBtn').addEventListener('click', () => { const r = findBook(video, kind); capture(!r.wholeImage && r.confidence >= 0.3 ? r.quad : null); });
$('pick').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  const bmp = await createImageBitmap(f);
  const s = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const r = findBook(c, kind);
  stopCamera();
  openEditor(c, r.quad, r.wholeImage ? 'Looks already cropped; using the whole photo' : r.confidence >= 0.72 ? 'Found the book' : 'Not sure about the edges; please check the corners');
  e.target.value = '';
});
document.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => {
  kind = b.dataset.kind; document.querySelectorAll('[data-kind]').forEach(x => x.classList.toggle('on', x === b)); history = [];
}));

// ---------- 4. flow mockups ----------

const bar = (t = 'Add books') => `<div class="bar"><span class="logo">${mark}</span><span class="grow">${esc(t)}</span><span style="font:600 12px var(--font-body);opacity:.85">Done</span></div>`;
const phone = inner => `<div class="phone">${inner}</div>`;
const mock = (inner, title, text) => `<div class="mock">${inner}<div class="cap"><b>${title}</b>${text}</div></div>`;
const film = keys => `<div class="film" style="position:absolute;left:10px;right:10px;bottom:84px">${keys.map(k => `<img src="${B}${k}-cover-thumb.jpg" alt="">`).join('')}</div>`;
const camFoot = (left = 'Skip') => `<div class="cam-foot"><span>${left}</span><span class="shutter"></span><span>Photos</span></div>`;
const outlined = (src, w, extra = '') => `<div style="position:relative;${extra}"><img src="${src}" style="width:${w}px;display:block;transform:rotate(-3deg);outline:3px solid #2bd463;outline-offset:2px;border-radius:2px" alt=""></div>`;

function renderFlow() {
  const stack = ['graff', 'ubs', 'prince'];
  $('flow').innerHTML =
    mock(phone(`${bar()}<div class="cam"><div class="hint">Scan the barcode</div><div class="step">Book 4 · the camera stays open</div>
      <div class="guide" style="width:220px;height:110px"><div style="width:150px;height:56px;background:repeating-linear-gradient(90deg,#f1efe8 0 2px,transparent 2px 5px,#f1efe8 5px 6px,transparent 6px 9px);opacity:.8"></div></div>
      ${film(stack)}${camFoot('Type ISBN')}</div>`),
      'a. Barcode', 'The stack so far runs along the bottom. As soon as the barcode reads, the lookup starts in the background and the camera moves on.') +
    mock(phone(`${bar()}<div class="cam"><div class="hint">Front cover</div><div class="step">Hold still…</div>
      ${outlined(B + 'hebrew-cover.jpg', 170)}
      <svg width="46" height="46" style="position:absolute;top:50%;left:50%;margin:-23px" viewBox="0 0 46 46"><circle cx="23" cy="23" r="19" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="5"/><circle cx="23" cy="23" r="19" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="80 200" transform="rotate(-90 23 23)"/></svg>
      ${film(stack)}${camFoot()}</div>`),
      'b. Cover, found live', 'A green outline follows the book. Held still for about a second, it takes the photo by itself (a soft click and, on Android, a tap of vibration). The shutter works any time.') +
    mock(phone(`${bar()}<div class="cam"><div class="hint">Spine</div><div class="step">Turn the book · keep the phone upright</div>
      ${outlined(B + 'hebrew-spine.jpg', 44)}
      ${film(stack)}${camFoot()}</div>`),
      'c. Spine', 'The same, with the book turned. Thin spines need the phone a little closer; the outline shows when it has found the edges.') +
    mock(phone(`${bar()}<div class="cam" style="background:#5d5a55"><div class="hint">Check the corners</div><div class="step">The edges were hard to see</div>
      <div style="position:relative"><img src="${B}towers-cover.jpg" style="width:180px;display:block;transform:rotate(2deg)" alt="">
        <span class="handle" style="left:3px;top:4px"></span><span class="handle" style="left:183px;top:-2px"></span><span class="handle" style="left:178px;top:283px"></span><span class="handle" style="left:-3px;top:278px"></span>
        <span class="loupe-mock" style="left:-30px;top:-110px;background-image:url(${B}towers-cover.jpg);background-position:0 0"></span></div>
      <div class="cam-foot"><span class="btn">Retake</span><span class="btn btn-primary">Looks right</span></div></div>`),
      'd. Only when unsure', 'Light on light, glare or a busy background: the corners appear for a quick check, with a magnifier above your finger while dragging. One tap if it already looks right.') +
    mock(phone(`${bar()}<div class="cam" style="background:#e9e6e0;color:#23201b"><div class="hint" style="color:#23201b">Hard to see the edges</div>
      <div class="step" style="color:#23201b;opacity:.8">Try the dark side of the mat</div>
      <img src="${B}prince-spine.jpg" style="height:330px;display:block;opacity:.95" alt="">
      <div class="cam-foot" style="color:#23201b"><span>Skip</span><span class="shutter" style="border-color:#23201b"></span><span>Corners</span></div></div>`),
      'e. Low contrast', 'When the book and the surface are too alike (a white spine on a white bedspread), the app says so plainly and suggests the other side of the mat, or offers to place the corners by hand.') +
    mock(phone(`${bar()}<div class="screen">
      <h4>Book 4 saved</h4>
      <div style="display:flex;gap:4px;align-items:flex-end;justify-content:center;padding:6px 0"><img src="${B}hebrew-spine.jpg" style="height:220px;border-radius:2px 0 0 2px;box-shadow:var(--shadow-cover)" alt=""><img src="${B}hebrew-cover.jpg" style="height:220px;border-radius:0 6px 6px 0;box-shadow:var(--shadow-cover)" alt=""></div>
      <p class="small" style="text-align:center;margin:6px 0"><b>Basics of Biblical Hebrew Grammar</b><br><span class="muted">Pratico and Van Pelt · 3rd edition · Zondervan</span></p>
      <p class="small muted" style="text-align:center;margin:0 0 8px">Original date and binding still to fill in · <span style="color:var(--accent-ink)">Fill in now</span></p>
      <div class="film" style="justify-content:center">${[...stack, 'hebrew'].map(k => `<img src="${B}${k}-cover-thumb.jpg" alt="">`).join('')}</div>
      <p class="small" style="text-align:center;color:var(--accent-ink);margin-top:10px">Listening for the next barcode…</p>
    </div>`),
      'f. Next book', 'A moment to see both photos, then the camera is ready for the next barcode. Missing details can be filled in now or later, for the whole stack at once.') +
    mock(phone(`${bar('Import photos')}<div class="screen">
      <h4>8 photos for 4 books</h4>
      <p class="small muted" style="margin-top:0">Paired in the order taken: cover, then spine. Cropped automatically.</p>
      ${[['graff', 'Graff'], ['towers', 'The Two Towers'], ['ubs', 'Greek New Testament'], ['prince', 'The Prince']].map(([k, t], i) => `
        <div class="lrow"><img src="${B}${k}-cover-thumb.jpg" style="height:52px;border-radius:2px" alt=""><img src="${B}${k}-spine-thumb.jpg" style="height:52px;border-radius:1px" alt="">
        <span class="lm"><span class="lt">${t}</span><br><span class="ls">${i === 1 ? '<span style="color:var(--pop-ink)">Check corners</span>' : 'Cropped'}</span></span></div>`).join('')}
      <div style="text-align:center;margin-top:10px"><span class="btn btn-primary">Add to the 4 books</span></div>
    </div>`),
      'g. Import from Photos', 'For photos taken with the phone\'s own camera, as you do now: select several at once, and the app crops each and pairs them with the books in order. Anything it is unsure about is flagged.');
}

// ---------- 5. display options ----------

function renderDisplay() {
  const cv = k => `${B}${k}-cover.jpg`, sp = k => `${B}${k}-spine.jpg`;
  const caption = b => `<div class="tt2">${esc(b.title)}</div><div class="ta2">${esc(b.author)}</div>`;
  const shown = books.slice(0, 6);
  const scr = (title, inner) => phone(`<div class="bar"><span class="logo">${mark}</span><span class="grow">My Loci Library</span></div><div class="screen"><h4>${title}</h4>${inner}</div>`);
  $('display').innerHTML =
    mock(scr('Library', `<div class="opt-grid">${shown.map(b => `<div><img class="fill" src="${cv(b.key)}" alt="">${caption(b)}</div>`).join('')}</div>`),
      'A. Same box, cropped to fill', 'Tidy rows, but every cover is trimmed to 2 : 3. The Hebrew grammar loses the edges of its title. <b style="display:inline;font:inherit;color:var(--warn-ink)">Avoid.</b>') +
    mock(scr('Library', `<div class="opt-grid">${shown.map(b => `<div><div class="contain"><img src="${cv(b.key)}" alt=""></div>${caption(b)}</div>`).join('')}</div>`),
      'B. Same box, whole cover on a mat', 'Nothing is cut off and rows stay even, but every book sits in a grey frame. Neat, a little boxy.') +
    mock(scr('Library', `<div class="stand">${shown.map(b => `<div><div class="base"><img src="${cv(b.key)}" alt=""></div>${caption(b)}</div>`).join('')}</div>`),
      'C. Standing books (recommended)', 'Same width, each cover at its own height, lined up along the bottom like books on a shelf. Honest, calm and modern; wide covers like the Hebrew grammar simply stand a little shorter.') +
    `<div class="mock" style="width:520px;max-width:100%"><div class="card"><h3 style="margin-top:0">Library</h3><div class="just">${[...books, ...books.slice(0, 3)].map(b => `<img src="${cv(b.key)}" alt="" title="${esc(b.title)}" style="flex:${b.a} 1 ${Math.round(b.a * 120)}px;aspect-ratio:${b.a};min-width:0">`).join('')}</div></div>
      <div class="cap"><b>D. Justified rows (laptop)</b>Every row the same height, each cover its natural width, rows filled edge to edge, as in photo apps. Dense and handsome on a wide screen; on a phone, C reads better.</div></div>` +
    `<div class="mock" style="width:520px;max-width:100%"><div class="card"><h3 style="margin-top:0">Spines</h3><div class="truewall">${books.map(b => `<img src="${sp(b.key)}" alt="" title="${esc(b.title)}">`).join('')}</div></div>
      <div class="cap"><b>E. Spines at true thickness</b>Seven real spines at the same height. Thick books look thick, thin ones thin: The Prince and the quarterly are slivers, as on the shelf. Each keeps a wider invisible tap area so it is easy to open.</div></div>` +
    `<div class="mock" style="width:520px;max-width:100%"><div class="card"><h3 style="margin-top:0">Book cards</h3><div style="display:flex;flex-wrap:wrap;gap:18px;align-items:flex-end">${books.slice(1, 5).map(b => `<div class="bookcard"><img class="sp" src="${sp(b.key)}" alt=""><img class="cv" src="${cv(b.key)}" alt=""></div>`).join('')}</div></div>
      <div class="cap"><b>F. Spine and cover together</b>The spine joined to the left of the cover, as the book's own "card". Rich on the book page and in a "recently added" row; too busy for the whole Library grid.</div></div>`;
}

renderFlow();
renderDisplay();
runBench().catch(e => { $('bench').innerHTML = `<p class="muted">The test could not run here: ${esc(e.message)}</p>`; });
