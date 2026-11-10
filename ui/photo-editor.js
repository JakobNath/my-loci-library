// The photo editor (PLAN.md, "Taking photos"): the outline starts already
// placed; a cover has four corner handles, a spine has two edge lines and two
// end bars. A handle stays exactly where it is let go. While dragging, two
// magnifiers (a wide one and a close one) show the point being placed, away
// from the finger. The photo can be turned in 90° steps; the four corners do
// any straightening (a separate slider was dropped in the interface review).
// Nothing is detected or moved automatically.
// Loaded only when a photo is taken.

import { readPicture, straighten, imageFiles } from '../edges/photo.js';
import { escapeHtml } from '../core/html.js';

const HANDLE = 14; // touch target radius in screen pixels
// The two magnifiers: a wide one to see the corner in its setting, and a
// close one for the last few pixels (Jakob found 3x alone too close, 2026-11-10).
const LOUPES = [{ zoom: 1.5 }, { zoom: 3 }];
const LOUPE_SIZE = 130; // pixels across

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
  const loupesHtml = LOUPES.map(() => `<canvas class="editor-loupe" width="${LOUPE_SIZE}" height="${LOUPE_SIZE}"></canvas>`).join('');
  const overlay = document.createElement('div');
  overlay.className = 'editor';
  overlay.innerHTML = `<div class="editor-bar"><button type="button" class="btn" data-action="cancel">Cancel</button>
      <span class="editor-title">${escapeHtml(kind === 'spine' ? 'Line up the spine' : 'Line up the cover')}</span>
      <button type="button" class="btn btn-primary" data-action="use">Use photo</button></div>
    <div class="editor-stage"><canvas class="editor-canvas"></canvas><div class="editor-loupes" hidden>${loupesHtml}</div></div>
    <div class="editor-tools"><button type="button" class="btn" data-action="turn">Turn 90°</button>
      ${heightFieldHtml}</div>`;
  document.body.append(overlay);
  const canvas = overlay.querySelector('.editor-canvas');
  const loupes = overlay.querySelector('.editor-loupes');
  const context = canvas.getContext('2d');
  let scale = 1;
  let outline = [];

  function setPicture(next) {
    picture = next;
    const stage = overlay.querySelector('.editor-stage');
    scale = Math.min(stage.clientWidth / picture.width, stage.clientHeight / picture.height);
    canvas.width = Math.round(picture.width * scale);
    canvas.height = Math.round(picture.height * scale);
    outline = startingOutline(picture.width, picture.height, kind);
    draw();
  }

  function handles() {
    const points = outline;
    if (kind === 'cover') return points.map((point, i) => ({ at: point, corners: [i] }));
    return EDGES.map(([i, j]) => ({ at: [(points[i][0] + points[j][0]) / 2, (points[i][1] + points[j][1]) / 2], corners: [i, j] }));
  }

  function draw() {
    const points = outline.map(([x, y]) => [x * scale, y * scale]);
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

  // The magnifiers, centered on the point being placed (a corner, or the
  // middle of a spine's edge), with the outline drawn in, on the side of
  // the screen away from the finger.
  function showLoupes(point, fingerX) {
    loupes.classList.toggle('is-right', fingerX < canvas.width / 2 / scale);
    loupes.hidden = false;
    const points = outline;
    loupes.querySelectorAll('canvas').forEach((loupe, i) => {
      const zoom = LOUPES[i].zoom * scale;
      const view = loupe.getContext('2d');
      const left = point[0] - LOUPE_SIZE / zoom / 2;
      const top = point[1] - LOUPE_SIZE / zoom / 2;
      view.fillStyle = token('--scan-bg');
      view.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
      view.drawImage(picture, left, top, LOUPE_SIZE / zoom, LOUPE_SIZE / zoom, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
      view.strokeStyle = token('--pop');
      view.lineWidth = 1.5;
      view.beginPath();
      points.forEach(([x, y], k) => (k ? view.lineTo((x - left) * zoom, (y - top) * zoom) : view.moveTo((x - left) * zoom, (y - top) * zoom)));
      view.closePath();
      view.stroke();
      view.beginPath();
      view.arc(LOUPE_SIZE / 2, LOUPE_SIZE / 2, 3, 0, Math.PI * 2);
      view.stroke();
    });
  }

  let dragging = null;
  canvas.addEventListener('pointerdown', event => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    const nearest = handles().map(handle => ({ handle, distance: Math.hypot(handle.at[0] - x, handle.at[1] - y) * scale })).sort((p, q) => p.distance - q.distance)[0];
    if (!nearest || nearest.distance > HANDLE * 2) return;
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
    const at = dragging.corners.map(i => outline[i]);
    showLoupes([at.reduce((sum, p) => sum + p[0], 0) / at.length, at.reduce((sum, p) => sum + p[1], 0) / at.length], x);
    draw();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = null;
    loupes.hidden = true;
    draw();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  return new Promise(resolve => {
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
        const files = await imageFiles(straighten(picture, outline), { master: true, kind });
        const measured = Number(overlay.querySelector('[data-action="height"]')?.value || 0);
        overlay.remove();
        resolve({ ...files, height: measured > 0 ? Math.round(measured * 10) : null });
      }
    });
    requestAnimationFrame(() => setPicture(picture));
  });
}
