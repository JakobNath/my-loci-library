// The photo editor (PLAN.md, "Taking photos"): the outline starts already
// placed; a cover has four corner handles, a spine has two edge lines and two
// end bars. Each handle snaps to a strong edge within a few pixels (never
// further), a magnifier shows under the finger, and the photo can be turned
// in 90° steps and fine-straightened. Nothing is detected automatically.
// Loaded only when a photo is taken.

import { readPicture, straighten, imageFiles, edgeStrengthAt } from '../edges/photo.js';
import { escapeHtml } from '../core/html.js';

const HANDLE = 14; // touch target radius in screen pixels
const SNAP_RANGE = 6; // screen pixels to look either side of a dropped edge

const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// The starting outline: inset for a cover, a tall narrow band for a spine.
function startingOutline(width, height, kind) {
  if (kind === 'spine') {
    const half = width * 0.09;
    return [[width / 2 - half, height * 0.05], [width / 2 + half, height * 0.05], [width / 2 + half, height * 0.95], [width / 2 - half, height * 0.95]];
  }
  return [[width * 0.1, height * 0.08], [width * 0.9, height * 0.08], [width * 0.9, height * 0.92], [width * 0.1, height * 0.92]];
}

// Edges by their two corners: top, right, bottom, left.
const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0]];

/**
 * Open the editor over the page for one photo.
 * @param {Blob} file the photo
 * @param {'cover'|'spine'} kind
 * @param {{ heightHint?: string }} [options] heightHint: the current height and its source, e.g. "~22 cm · guess"
 * @returns {Promise<{ thumb: Blob, detail: Blob, master: Blob, color: string, ratio: number, height: number|null } | null>} null if cancelled
 */
export async function editPhoto(file, kind, { heightHint = '' } = {}) {
  let picture = await readPicture(file);
  const heightFieldHtml = kind === 'spine' ? `<label class="field">Height in cm, if measured (now ${escapeHtml(heightHint || 'a guess')})<input type="number" step="0.1" inputmode="decimal" data-action="height"></label>` : '';
  const overlay = document.createElement('div');
  overlay.className = 'editor';
  overlay.innerHTML = `<div class="editor-bar"><button type="button" class="btn" data-action="cancel">Cancel</button>
      <span class="editor-title">${escapeHtml(kind === 'spine' ? 'Line up the spine' : 'Line up the cover')}</span>
      <button type="button" class="btn btn-primary" data-action="use">Use photo</button></div>
    <div class="editor-stage"><canvas class="editor-canvas"></canvas><canvas class="editor-loupe" width="120" height="120" hidden></canvas></div>
    <div class="editor-tools"><button type="button" class="btn" data-action="turn">Turn 90°</button>
      <label class="field">Straighten<input type="range" min="-15" max="15" step="0.5" value="0" data-action="tilt"></label>
      ${heightFieldHtml}</div>`;
  document.body.append(overlay);
  const canvas = overlay.querySelector('.editor-canvas');
  const loupe = overlay.querySelector('.editor-loupe');
  const context = canvas.getContext('2d');
  let pixels = null;
  let scale = 1;
  let outline = [];
  let tilt = 0;

  function setPicture(next) {
    picture = next;
    pixels = picture.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, picture.width, picture.height);
    const stage = overlay.querySelector('.editor-stage');
    scale = Math.min(stage.clientWidth / picture.width, stage.clientHeight / picture.height);
    canvas.width = Math.round(picture.width * scale);
    canvas.height = Math.round(picture.height * scale);
    outline = startingOutline(picture.width, picture.height, kind);
    tilt = 0;
    overlay.querySelector('[data-action="tilt"]').value = '0';
    draw();
  }

  // The outline as shown: turned by the straighten slider around its middle.
  function shown() {
    const cx = outline.reduce((sum, p) => sum + p[0], 0) / 4;
    const cy = outline.reduce((sum, p) => sum + p[1], 0) / 4;
    const cos = Math.cos(tilt * Math.PI / 180);
    const sin = Math.sin(tilt * Math.PI / 180);
    return outline.map(([x, y]) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]);
  }

  function handles() {
    const points = shown();
    if (kind === 'cover') return points.map((point, i) => ({ at: point, corners: [i] }));
    return EDGES.map(([i, j]) => ({ at: [(points[i][0] + points[j][0]) / 2, (points[i][1] + points[j][1]) / 2], corners: [i, j] }));
  }

  function draw() {
    const points = shown().map(([x, y]) => [x * scale, y * scale]);
    context.drawImage(picture, 0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(0, 0, 0, 0.45)';
    context.beginPath();
    context.rect(0, 0, canvas.width, canvas.height);
    points.forEach(([x, y], i) => (i ? context.lineTo(x, y) : context.moveTo(x, y)));
    context.closePath();
    context.fill('evenodd');
    context.strokeStyle = token('--pop');
    context.lineWidth = 2;
    context.beginPath();
    points.forEach(([x, y], i) => (i ? context.lineTo(x, y) : context.moveTo(x, y)));
    context.closePath();
    context.stroke();
    context.fillStyle = token('--surface');
    for (const handle of handles()) {
      context.beginPath();
      context.arc(handle.at[0] * scale, handle.at[1] * scale, 9, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }

  function showLoupe(x, y) {
    const zoom = 3;
    const size = loupe.width;
    const view = loupe.getContext('2d');
    view.drawImage(picture, x - size / zoom / 2, y - size / zoom / 2, size / zoom, size / zoom, 0, 0, size, size);
    view.strokeStyle = token('--pop');
    view.beginPath();
    view.moveTo(size / 2, 0); view.lineTo(size / 2, size); view.moveTo(0, size / 2); view.lineTo(size, size / 2);
    view.stroke();
    loupe.hidden = false;
  }

  // After a drag, move each dragged edge to the strongest edge in the photo
  // within a few pixels, if there is a clear one; otherwise leave it.
  function snap(corners) {
    const range = SNAP_RANGE / scale;
    for (const [i, j] of EDGES.filter(([i, j]) => corners.includes(i) && corners.includes(j))) {
      const [a, b] = [outline[i], outline[j]];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = -(b[1] - a[1]) / length;
      const ny = (b[0] - a[0]) / length;
      let best = { offset: 0, strength: 0 };
      for (let offset = -range; offset <= range; offset += 0.5) {
        let strength = 0;
        for (let t = 0.15; t <= 0.85; t += 0.1) {
          strength += edgeStrengthAt(pixels, a[0] + (b[0] - a[0]) * t + nx * offset, a[1] + (b[1] - a[1]) * t + ny * offset, nx, ny);
        }
        if (strength > best.strength) best = { offset, strength };
      }
      if (best.strength / 8 > 40) {
        outline[i] = [a[0] + nx * best.offset, a[1] + ny * best.offset];
        outline[j] = [b[0] + nx * best.offset, b[1] + ny * best.offset];
      }
    }
  }

  let dragging = null;
  canvas.addEventListener('pointerdown', event => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    const nearest = handles().map(handle => ({ handle, distance: Math.hypot(handle.at[0] - x, handle.at[1] - y) * scale })).sort((p, q) => p.distance - q.distance)[0];
    if (!nearest || nearest.distance > HANDLE * 2) return;
    // Drag in the untilted outline: undo the slider's turn first.
    if (tilt) { outline = shown(); tilt = 0; overlay.querySelector('[data-action="tilt"]').value = '0'; }
    dragging = { corners: nearest.handle.corners, x, y };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    for (const i of dragging.corners) outline[i] = [outline[i][0] + x - dragging.x, outline[i][1] + y - dragging.y];
    dragging.x = x;
    dragging.y = y;
    showLoupe(x, y);
    draw();
  });
  const endDrag = () => {
    if (!dragging) return;
    snap(dragging.corners.length === 1 ? [dragging.corners[0], (dragging.corners[0] + 1) % 4, (dragging.corners[0] + 3) % 4] : dragging.corners);
    dragging = null;
    loupe.hidden = true;
    draw();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  return new Promise(resolve => {
    overlay.addEventListener('input', event => {
      if (event.target.dataset.action === 'tilt') { tilt = Number(event.target.value); draw(); }
    });
    overlay.addEventListener('click', async event => {
      const action = event.target.dataset.action;
      if (action === 'turn') {
        const turned = document.createElement('canvas');
        turned.width = picture.height;
        turned.height = picture.width;
        const turning = turned.getContext('2d');
        turning.translate(turned.width, 0);
        turning.rotate(Math.PI / 2);
        turning.drawImage(picture, 0, 0);
        setPicture(turned);
      }
      if (action === 'cancel') { overlay.remove(); resolve(null); }
      if (action === 'use') {
        event.target.disabled = true;
        event.target.textContent = 'Saving…';
        const files = await imageFiles(straighten(picture, shown()), { master: true });
        const measured = Number(overlay.querySelector('[data-action="height"]')?.value || 0);
        overlay.remove();
        resolve({ ...files, height: measured > 0 ? Math.round(measured * 10) : null });
      }
    });
    requestAnimationFrame(() => setPicture(picture));
  });
}
