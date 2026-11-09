// The crop editor used by the lab and the camera prototype.
//   Covers: four corner handles.
//   Spines: two edge lines (left and right), two short end bars and a small
//   rotate handle. Lines snap to the strongest nearby edge in the photo.
// A magnifier shows above your finger while dragging.
// Prototype code.

import { pixels, edgeStrength } from '../shared/refine.js';

const SVGNS = 'http://www.w3.org/2000/svg';

// ---------- spine model: centre, angle, two side offsets, two end offsets ----------

export function quadToSpine(q) {
  const cx = q.reduce((s, p) => s + p[0], 0) / 4, cy = q.reduce((s, p) => s + p[1], 0) / 4;
  const ax = (q[3][0] - q[0][0] + q[2][0] - q[1][0]) / 2, ay = (q[3][1] - q[0][1] + q[2][1] - q[1][1]) / 2;
  const len = Math.hypot(ax, ay) || 1, ux = ax / len, uy = ay / len; // along the spine, downwards
  const nx = -uy, ny = ux; // across the spine (pointing to the left of "down", i.e. image right when upright)
  const along = p => (p[0] - cx) * ux + (p[1] - cy) * uy, across = p => (p[0] - cx) * nx + (p[1] - cy) * ny;
  const sideA = (across(q[0]) + across(q[3])) / 2, sideB = (across(q[1]) + across(q[2])) / 2;
  return { cx, cy, angle: Math.atan2(uy, ux), left: Math.min(sideA, sideB), right: Math.max(sideA, sideB),
    top: (along(q[0]) + along(q[1])) / 2, bottom: (along(q[2]) + along(q[3])) / 2, flip: sideA > sideB };
}

export function spineToQuad(m) {
  const ux = Math.cos(m.angle), uy = Math.sin(m.angle), nx = -uy, ny = ux;
  const pt = (a, c) => [m.cx + ux * a + nx * c, m.cy + uy * a + ny * c];
  const [l, r] = m.flip ? [m.right, m.left] : [m.left, m.right];
  return [pt(m.top, l), pt(m.top, r), pt(m.bottom, r), pt(m.bottom, l)];
}

/**
 * Open the editor in `box` for a photo (canvas) with a starting quad.
 * onChange(quad) is called after every adjustment.
 */
export function openEditor(box, photo, kind, quad, onChange) {
  box.innerHTML = '';
  box.classList.add('edit');
  const P = pixels(photo, 4000), ps = P.scale;
  const disp = document.createElement('canvas');
  disp.width = photo.width; disp.height = photo.height;
  disp.getContext('2d').drawImage(photo, 0, 0);
  box.append(disp);
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${photo.width} ${photo.height}`);
  box.append(svg);
  const loupe = document.createElement('div'); loupe.className = 'loupe';
  const lc = document.createElement('canvas'); lc.width = 220; lc.height = 220; loupe.append(lc); box.append(loupe);
  const unit = Math.max(photo.width, photo.height) / 45;

  let q = quad.map(p => [p[0], p[1]]);
  let m = kind === 'spine' ? quadToSpine(q) : null;
  const el = (name, attrs) => { const e = document.createElementNS(SVGNS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.append(e); return e; };
  const poly = el('polygon', { class: 'poly', 'stroke-width': unit / 6 });
  const handles = [];
  if (kind === 'spine') {
    for (const role of ['left', 'right']) handles.push({ role, line: el('line', { class: 'eline', 'stroke-width': unit / 2.5 }), grip: el('circle', { class: 'hdl', r: unit * 0.8, 'stroke-width': unit / 4 }) });
    for (const role of ['top', 'bottom']) handles.push({ role, line: el('line', { class: 'ebar', 'stroke-width': unit / 2.5 }), grip: el('rect', { class: 'hdl', width: unit * 1.8, height: unit * 0.9, rx: unit * 0.3, 'stroke-width': unit / 4 }) });
    handles.push({ role: 'rotate', stem: el('line', { class: 'stem', 'stroke-width': unit / 6 }), grip: el('circle', { class: 'hdl rot', r: unit * 0.7, 'stroke-width': unit / 4 }) });
  } else {
    for (let i = 0; i < 4; i++) handles.push({ role: i, grip: el('circle', { class: 'hdl', r: unit, 'stroke-width': unit / 3 }) });
  }

  const paint = () => {
    if (m) q = spineToQuad(m);
    poly.setAttribute('points', q.map(p => p.join(',')).join(' '));
    if (kind === 'spine') {
      const ux = Math.cos(m.angle), uy = Math.sin(m.angle), nx = -uy, ny = ux;
      const pt = (a, c) => [m.cx + ux * a + nx * c, m.cy + uy * a + ny * c];
      for (const h of handles) {
        let a, b, g;
        if (h.role === 'left' || h.role === 'right') { const c = m[h.role]; a = pt(m.top, c); b = pt(m.bottom, c); g = pt((m.top + m.bottom) / 2, c); }
        else if (h.role === 'top' || h.role === 'bottom') { const t = m[h.role]; a = pt(t, m.left); b = pt(t, m.right); g = pt(t + (h.role === 'top' ? -1 : 1) * unit * 0.9, (m.left + m.right) / 2); }
        else { a = pt(m.top, (m.left + m.right) / 2); g = pt(m.top - unit * 3.2, (m.left + m.right) / 2); b = g; }
        if (h.line) { h.line.setAttribute('x1', a[0]); h.line.setAttribute('y1', a[1]); h.line.setAttribute('x2', b[0]); h.line.setAttribute('y2', b[1]); }
        if (h.stem) { h.stem.setAttribute('x1', a[0]); h.stem.setAttribute('y1', a[1]); h.stem.setAttribute('x2', g[0]); h.stem.setAttribute('y2', g[1]); }
        if (h.grip.tagName === 'rect') {
          h.grip.setAttribute('x', g[0] - unit * 0.9); h.grip.setAttribute('y', g[1] - unit * 0.45);
          h.grip.setAttribute('transform', `rotate(${m.angle * 180 / Math.PI - 90} ${g[0]} ${g[1]})`);
        } else { h.grip.setAttribute('cx', g[0]); h.grip.setAttribute('cy', g[1]); }
        h.at = g;
      }
    } else handles.forEach((h, i) => { h.grip.setAttribute('cx', q[i][0]); h.grip.setAttribute('cy', q[i][1]); h.at = q[i]; });
  };

  // Snap an edge line or end bar to the strongest nearby edge.
  const snap = (role, value) => {
    const ux = Math.cos(m.angle), uy = Math.sin(m.angle), nx = -uy, ny = ux;
    const across = role === 'left' || role === 'right';
    const range = Math.max(4, Math.min(photo.width, photo.height) / 120);
    let best = value, bestS = 0;
    for (let d = -range; d <= range; d += 0.5) {
      const v = value + d; let sum = 0, cnt = 0;
      for (let t = 0.1; t <= 0.9; t += 0.05) {
        const a = across ? m.top + (m.bottom - m.top) * t : v, c = across ? v : m.left + (m.right - m.left) * t;
        const x = m.cx + ux * a + nx * c, y = m.cy + uy * a + ny * c;
        sum += across ? edgeStrength(P, x * ps, y * ps, nx, ny) : edgeStrength(P, x * ps, y * ps, ux, uy); cnt++;
      }
      const s = sum / cnt * Math.exp(-(d * d) / (2 * range * range));
      if (s > bestS) { bestS = s; best = v; }
    }
    return bestS > 20 ? best : value;
  };

  const toSvg = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const r = p.matrixTransform(svg.getScreenCTM().inverse()); return [Math.max(0, Math.min(photo.width, r.x)), Math.max(0, Math.min(photo.height, r.y))]; };
  const showLoupe = (e, at) => {
    const rect = box.getBoundingClientRect();
    loupe.style.display = 'block';
    loupe.style.left = (e.clientX - rect.left - 55) + 'px'; loupe.style.top = (e.clientY - rect.top - 150) + 'px';
    const half = 110 / 3 * (photo.width / disp.clientWidth);
    const x = lc.getContext('2d'); x.clearRect(0, 0, 220, 220);
    x.drawImage(photo, at[0] - half, at[1] - half, half * 2, half * 2, 0, 0, 220, 220);
    // Draw the current outline inside the magnifier too.
    x.save(); x.scale(220 / (half * 2), 220 / (half * 2)); x.translate(-(at[0] - half), -(at[1] - half));
    x.strokeStyle = '#e3b24f'; x.lineWidth = half / 60; x.beginPath(); q.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0], p[1])); x.closePath(); x.stroke(); x.restore();
    x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(110, 96); x.lineTo(110, 124); x.moveTo(96, 110); x.lineTo(124, 110); x.stroke();
  };

  let drag = null;
  svg.addEventListener('pointerdown', e => {
    const h = handles.find(x => x.grip === e.target || x.line === e.target);
    if (!h) return;
    drag = h; svg.setPointerCapture(e.pointerId); e.preventDefault(); showLoupe(e, toSvg(e));
  });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const p = toSvg(e);
    if (kind === 'spine') {
      const ux = Math.cos(m.angle), uy = Math.sin(m.angle), nx = -uy, ny = ux;
      const a = (p[0] - m.cx) * ux + (p[1] - m.cy) * uy, c = (p[0] - m.cx) * nx + (p[1] - m.cy) * ny;
      if (drag.role === 'left') m.left = Math.min(c, m.right - 2);
      else if (drag.role === 'right') m.right = Math.max(c, m.left + 2);
      else if (drag.role === 'top') m.top = Math.min(a, m.bottom - 10);
      else if (drag.role === 'bottom') m.bottom = Math.max(a, m.top + 10);
      else m.angle = Math.atan2(m.cy - p[1], m.cx - p[0]); // rotate: the axis points from the handle through the centre
    } else q[drag.role] = p;
    paint(); showLoupe(e, p);
  });
  const end = () => {
    if (!drag) return;
    if (kind === 'spine' && drag.role !== 'rotate') { m[drag.role] = snap(drag.role, m[drag.role]); paint(); }
    drag = null; loupe.style.display = 'none';
    onChange && onChange(q.map(p => [p[0], p[1]]));
  };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  paint();
  return { get quad() { return q.map(p => [p[0], p[1]]); } };
}
