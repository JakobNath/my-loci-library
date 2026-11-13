// The photo editor (PLAN.md, "Taking photos"): the outline starts already
// placed; a cover has four corner handles, a spine has a dot at each end and
// a handle on each side. A handle stays exactly where it is let go. While dragging,
// magnifiers show the point being placed, away from the finger. Holding the
// photo away from the outline, or the Preview button, shows the straightened
// result. The photo can be turned in 90° steps. Nothing is detected or moved
// automatically. Loaded only when a photo is taken.

import { readPicture, straighten, imageFiles } from '../edges/photo.js';
import { escapeHtml } from '../core/html.js';
import { startingOutline, startingSpine, spineOutline, spineHandle, moveSpine, spineHandlePoint, loupePlace } from '../core/outline.js';

const HANDLE = 14; // touch target radius in screen pixels
// Magnifier zooms. A cover has one at 2x: two looked alike there and one
// looked worse (Jakob, 2026-11-11). A spine keeps a wide 1.5x and a close 3x,
// which helped on its narrow edges (Jakob found 3x alone too close, 2026-11-10).
const LOUPES = { cover: [2], spine: [1.5, 3] };
const LOUPE_SIZE = 130; // pixels across

const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

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
  const loupesHtml = LOUPES[kind].map(() => `<canvas class="editor-loupe" width="${LOUPE_SIZE}" height="${LOUPE_SIZE}"></canvas>`).join('');
  const overlay = document.createElement('div');
  overlay.className = 'editor';
  overlay.innerHTML = `<div class="editor-bar"><button type="button" class="btn" data-action="cancel">Cancel</button>
      <span class="editor-title">${escapeHtml(kind === 'spine' ? 'Line up the spine' : 'Line up the cover')}</span>
      <button type="button" class="btn btn-primary" data-action="use">Use photo</button></div>
    <div class="editor-stage"><canvas class="editor-canvas"></canvas><div class="editor-loupes" hidden>${loupesHtml}</div></div>
    <div class="editor-tools"><button type="button" class="btn" data-action="turn">Turn 90°</button>
      <button type="button" class="btn" data-action="preview" aria-pressed="false">Preview</button>
      ${heightFieldHtml}
      <p class="editor-hint">${kind === 'spine' ? 'Drag the dots to the top and bottom of the spine, and the sides to its edges. ' : ''}Hold the photo away from the outline to see the result.</p></div>`;
  document.body.append(overlay);
  const canvas = overlay.querySelector('.editor-canvas');
  const loupes = overlay.querySelector('.editor-loupes');
  const previewButton = overlay.querySelector('[data-action="preview"]');
  const context = canvas.getContext('2d');
  let scale = 1;
  let outline = [];
  let spine = null; // a spine's dots and widths (core/outline.js); its outline is made from them
  // A copy of the photo at screen size: straightening it takes a few
  // milliseconds, so the preview can be redrawn at once.
  let screenCopy = null;
  let isPreviewOn = false; // the Preview button
  let isHolding = false; // a finger held on the photo away from the outline

  function setPicture(next) {
    picture = next;
    const stage = overlay.querySelector('.editor-stage');
    scale = Math.min(stage.clientWidth / picture.width, stage.clientHeight / picture.height);
    canvas.width = Math.round(picture.width * scale);
    canvas.height = Math.round(picture.height * scale);
    screenCopy = document.createElement('canvas');
    screenCopy.width = canvas.width;
    screenCopy.height = canvas.height;
    screenCopy.getContext('2d').drawImage(picture, 0, 0, canvas.width, canvas.height);
    spine = kind === 'spine' ? startingSpine(picture.width, picture.height) : null;
    outline = spine ? spineOutline(spine) : startingOutline(picture.width, picture.height);
    draw();
  }

  // Where the handles are drawn: a cover's corners; a spine's two end dots and the middle of each side.
  function handlePoints() {
    if (kind === 'cover') return outline;
    const [tl, tr, br, bl] = outline;
    return [spine.top, spine.foot, [(tl[0] + bl[0]) / 2, (tl[1] + bl[1]) / 2], [(tr[0] + br[0]) / 2, (tr[1] + br[1]) / 2]];
  }

  function drawPreview() {
    const result = straighten(screenCopy, outline.map(([x, y]) => [x * scale, y * scale]));
    const fit = Math.min(canvas.width / result.width, canvas.height / result.height);
    const width = result.width * fit;
    const height = result.height * fit;
    context.fillStyle = token('--scan-bg');
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(result, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  }

  function draw() {
    if (isPreviewOn || isHolding) { drawPreview(); return; }
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
    for (const [x, y] of handlePoints()) {
      context.beginPath();
      context.arc(x * scale, y * scale, 9, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
    if (kind === 'spine') {
      // The line between the end dots, which the spine is straightened along; the dots filled, to stand out from the side handles.
      context.setLineDash([6, 6]);
      context.beginPath();
      context.moveTo(spine.top[0] * scale, spine.top[1] * scale);
      context.lineTo(spine.foot[0] * scale, spine.foot[1] * scale);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = token('--pop');
      for (const [x, y] of [spine.top, spine.foot]) {
        context.beginPath();
        context.arc(x * scale, y * scale, 9, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  // The magnifiers, centered on the point being placed, with the outline
  // drawn in. Their place was chosen when the drag started (core/outline.js).
  function showLoupes(point, place) {
    loupes.classList.toggle('is-right', place.isRight);
    loupes.classList.toggle('is-bottom', place.isBottom);
    loupes.hidden = false;
    loupes.querySelectorAll('canvas').forEach((loupe, i) => {
      const zoom = LOUPES[kind][i] * scale;
      const view = loupe.getContext('2d');
      const left = point[0] - LOUPE_SIZE / zoom / 2;
      const top = point[1] - LOUPE_SIZE / zoom / 2;
      view.fillStyle = token('--scan-bg');
      view.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);
      view.drawImage(picture, left, top, LOUPE_SIZE / zoom, LOUPE_SIZE / zoom, 0, 0, LOUPE_SIZE, LOUPE_SIZE);
      view.strokeStyle = token('--pop');
      view.lineWidth = 1.5;
      view.beginPath();
      outline.forEach(([x, y], k) => (k ? view.lineTo((x - left) * zoom, (y - top) * zoom) : view.moveTo((x - left) * zoom, (y - top) * zoom)));
      view.closePath();
      view.stroke();
      view.beginPath();
      view.arc(LOUPE_SIZE / 2, LOUPE_SIZE / 2, 3, 0, Math.PI * 2);
      view.stroke();
    });
  }

  const pointOf = event => {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) / scale, (event.clientY - rect.top) / scale];
  };
  // The point a grip places, which the magnifiers center on.
  const placedPoint = grip => (spine ? spineHandlePoint(spine, grip) : outline[grip.corners[0]]);

  // What a press takes hold of: a cover's nearest corner, or a spine's
  // nearest dot or side (core/outline.js), if close enough; otherwise nothing.
  function gripAt(point) {
    if (spine) {
      const grip = spineHandle(spine, point);
      return grip.distance * scale <= HANDLE * 2 ? grip : null;
    }
    const nearest = outline.map((corner, i) => ({ i, distance: Math.hypot(corner[0] - point[0], corner[1] - point[1]) * scale }))
      .sort((p, q) => p.distance - q.distance)[0];
    return nearest.distance <= HANDLE * 2 ? { corners: [nearest.i] } : null;
  }

  let dragging = null;
  canvas.addEventListener('pointerdown', event => {
    if (isPreviewOn) return;
    const point = pointOf(event);
    canvas.setPointerCapture(event.pointerId);
    const grip = gripAt(point);
    if (!grip) {
      isHolding = true;
      draw();
      return;
    }
    dragging = { grip, at: point, place: loupePlace(placedPoint(grip), picture.width, picture.height) };
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    const point = pointOf(event);
    const dx = point[0] - dragging.at[0];
    const dy = point[1] - dragging.at[1];
    if (spine) {
      spine = moveSpine(spine, dragging.grip, dx, dy);
      outline = spineOutline(spine);
    } else {
      outline = outline.map((corner, i) => (dragging.grip.corners.includes(i) ? [corner[0] + dx, corner[1] + dy] : corner));
    }
    dragging.at = point;
    showLoupes(placedPoint(dragging.grip), dragging.place);
    draw();
  });
  const endPress = () => {
    if (!dragging && !isHolding) return;
    dragging = null;
    isHolding = false;
    loupes.hidden = true;
    draw();
  };
  canvas.addEventListener('pointerup', endPress);
  canvas.addEventListener('pointercancel', endPress);

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
      if (action === 'preview') {
        isPreviewOn = !isPreviewOn;
        previewButton.textContent = isPreviewOn ? 'Back to the outline' : 'Preview';
        previewButton.setAttribute('aria-pressed', String(isPreviewOn));
        draw();
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
