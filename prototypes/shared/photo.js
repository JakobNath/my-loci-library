// One entry point for finding a book in a photo: covers and spines.
//   find(source, 'cover' | 'spine', opts) -> { quad, auto, reason, relErr, errPx, ms, ... }
// `auto` says whether the result may be saved without asking. The bar is a
// share of the book's width: 2% for covers, 3% of the (much narrower) spine
// width for spines, so a spine 50 pixels wide must be right to 1.5 pixels.
// Prototype code.

import { findBook } from './autocrop.js';
import { findSpine, spineVerdict } from './spine.js';
import { pixels, refineQuad } from './refine.js';

export const BARS = { cover: 0.02, spine: 0.03 };

export function find(source, kind, opts = {}) {
  const t0 = performance.now();
  if (kind === 'spine') {
    const r = findSpine(source, opts);
    const v = spineVerdict(r);
    return { ...r, kind, auto: v.auto, reason: v.reason, ms: performance.now() - t0 };
  }
  const r = findBook(source, 'cover');
  if (r.wholeImage) return { ...r, kind, found: true, auto: r.confidence >= 0.6, reason: 'Already cropped', relErr: 0, errPx: 0, ms: performance.now() - t0 };
  if (opts.refine === false) return { ...r, kind, found: true, auto: false, reason: 'Live preview', ms: performance.now() - t0 };
  const sw = source.videoWidth || source.naturalWidth || source.width;
  const xs = r.quad.map(p => p[0]), ys = r.quad.map(p => p[1]), margin = sw / 40;
  const F = pixels(source, opts.maxSide || 1600, [Math.min(...xs) - margin, Math.min(...ys) - margin, Math.max(...xs) + margin, Math.max(...ys) + margin]);
  const k = F.scale;
  const search = Math.max(4, (sw / 256) * k * 2.5);
  const R = refineQuad(F, r.quad.map(p => [p[0] * k, p[1] * k]), search);
  const quad = R.quad.map(p => [p[0] / k, p[1] / k]);
  const relErr = R.errPx / R.widthPx;
  let auto = true, reason = 'Edges clear';
  if (r.confidence < 0.6) { auto = false; reason = 'Book outline unsure'; }
  else if (R.support < 0.6) { auto = false; reason = 'An edge is unclear'; }
  else if (relErr > BARS.cover) { auto = false; reason = `Edges uncertain by ${(relErr * 100).toFixed(1)}% of the width`; }
  return { ...r, kind, found: true, quad, roughQuad: r.quad, errPx: R.errPx / k, widthPx: R.widthPx / k, relErr, support: R.support, edgeSupport: R.edges.map(e => e.support), auto, reason, ms: performance.now() - t0 };
}
