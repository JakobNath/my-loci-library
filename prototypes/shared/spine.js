// Spine mode: finding a spine as two long, nearly parallel edges.
//
// A spine is a tall, thin rectangle. Instead of separating it from the
// background by color (which fails on wood grain, bedspreads and white on
// white), this looks for its two long sides directly:
//   1. Measure how sharply the color changes at every pixel, and in which
//      direction (a working copy about 640 pixels tall).
//   2. Let every sharp, roughly vertical change "vote" for the straight lines
//      it could lie on (a Hough transform, limited to lines within 25° of the
//      spine's axis). Long straight edges collect many votes.
//   3. Pick the pair of strong lines that are parallel, the right distance
//      apart for a spine, and change color in opposite directions (into the
//      spine on one side, out of it on the other).
//   4. Find the ends: where the edge evidence along both lines stops.
//   5. Refine all four edges at full resolution (refine.js) and estimate the
//      error in pixels.
// If the photo was taken through the camera's tall guide, the guide's top and
// bottom are used when an end cannot be seen (a hand holding the book).
// Prototype code.

import { pixels, refineQuad, edgeStrength } from './refine.js';

const DEG = Math.PI / 180;

function gradients(px) {
  // Sobel on each color channel; keep the channel with the strongest change.
  const { data, w, h } = px, n = w * h;
  const gx = new Float32Array(n), gy = new Float32Array(n), mag = new Float32Array(n);
  const ch = [0, 1, 2].map(c => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = data[i * 4 + c]; return a; });
  const best = new Float32Array(n);
  for (const p of ch) {
    for (let y = 1; y < h - 1; y++) {
      let i = y * w + 1;
      for (let x = 1; x < w - 1; x++, i++) {
        const a = p[i - w - 1], b = p[i - w], c = p[i - w + 1], d = p[i - 1], f = p[i + 1], g = p[i + w - 1], hh = p[i + w], k = p[i + w + 1];
        const sx = c + 2 * f + k - a - 2 * d - g, sy = g + 2 * hh + k - a - 2 * b - c;
        const m = sx * sx + sy * sy;
        if (m > best[i]) { best[i] = m; gx[i] = sx; gy[i] = sy; }
      }
    }
  }
  for (let i = 0; i < n; i++) mag[i] = Math.sqrt(best[i]);
  return { gx, gy, mag };
}

/**
 * Find the spine's two long edges. The spine is assumed to run roughly up and
 * down in the image (the camera's guide makes sure of that); a photo taken
 * sideways is turned first by the caller.
 * opts.guide: [x0, y0, x1, y1] in source pixels, the camera's tall frame.
 * opts.work: working height (default 640). opts.refine: false for live frames.
 */
export function findSpine(source, opts = {}) {
  const t0 = performance.now();
  const work = opts.work || 480;
  const steps = {}, lap = name => { const now = performance.now(); steps[name] = Math.round(now - (lap.t || t0)); lap.t = now; };
  const P = pixels(source, work);
  const { w, h } = P, n = w * h, s = P.scale;
  lap('read');
  const G = gradients(P);
  lap('edges');
  // Only the strongest few percent of pixels vote.
  const sample = new Float32Array(Math.min(n, 20000));
  for (let i = 0; i < sample.length; i++) sample[i] = G.mag[Math.floor(i * n / sample.length)];
  sample.sort();
  const thr = Math.max(40, sample[Math.floor(sample.length * 0.92)]);
  const angles = [];
  for (let a = -25; a <= 25; a += 1) angles.push(a * DEG);
  const tans = angles.map(Math.tan), cosA = angles.map(Math.cos);
  const na = angles.length, cy = h / 2;
  const acc = [new Float32Array(na * w), new Float32Array(na * w)]; // polarity: [into darker going right, into lighter]
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, m = G.mag[i];
    if (m < thr) continue;
    const ax = Math.abs(G.gx[i]), ay = Math.abs(G.gy[i]);
    if (ax < ay * 1.2) continue; // edge must run roughly up and down
    const pol = G.gx[i] > 0 ? 1 : 0;
    for (let k = 0; k < na; k++) {
      const xm = Math.round(x - (y - cy) * tans[k]); // where this line crosses the middle row
      if (xm < 0 || xm >= w) continue;
      acc[pol][k * w + xm] += m;
    }
  }
  lap('votes');
  // Peaks: strongest lines for each polarity.
  const peaks = [[], []];
  for (let p = 0; p < 2; p++) {
    const A = acc[p];
    for (let k = 1; k < na - 1; k++) for (let x = 1; x < w - 1; x++) {
      const v = A[k * w + x];
      if (v <= 0) continue;
      let isMax = true;
      for (let dk = -1; dk <= 1 && isMax; dk++) for (let dx = -2; dx <= 2; dx++) {
        if ((dk || dx) && A[(k + dk) * w + x + dx] > v) { isMax = false; break; }
      }
      if (isMax) peaks[p].push({ k, x, v, pol: p });
    }
    peaks[p].sort((a, b) => b.v - a.v);
    peaks[p] = peaks[p].slice(0, 30);
  }
  // Guide (if any) in working pixels.
  const guide = opts.guide ? opts.guide.map(v => v * s) : null;
  const gcx = guide ? (guide[0] + guide[2]) / 2 : w / 2;
  // Pairs: parallel, a plausible spine width apart, opposite polarity.
  const pairs = [];
  for (const a of peaks[0]) for (const b of peaks[1]) {
    if (Math.abs(a.k - b.k) > 2) continue;
    const [L, R] = a.x < b.x ? [a, b] : [b, a];
    const sep = (R.x - L.x) * cosA[(a.k + b.k) >> 1];
    if (sep < h * 0.015 || sep > h * 0.45) continue;
    const mid = (L.x + R.x) / 2;
    const centre = 1 - Math.min(1, Math.abs(mid - gcx) / (w / 2)) * 0.6;
    pairs.push({ L, R, score: Math.sqrt(L.v * R.v) * centre });
  }
  pairs.sort((a, b) => b.score - a.score);
  lap('pairs');
  const ms = () => performance.now() - t0;
  if (!pairs.length) return { found: false, ms: ms() };
  const best = pairs[0];
  const rival = pairs.find(p => Math.abs(p.L.x - best.L.x) > 3 && Math.abs(p.R.x - best.R.x) > 3);
  const ambiguity = rival ? rival.score / best.score : 0;
  // The two lines: x = xm + (y - cy) * tan.
  const line = pk => ({ xm: pk.x, t: tans[pk.k] });
  const Lc = line(best.L), Rc = line(best.R);
  const xAt = (ln, y) => ln.xm + (y - cy) * ln.t;
  // Ends: rows where both lines still have edge evidence.
  const ev = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let c = 0;
    for (const ln of [Lc, Rc]) {
      const x = xAt(ln, y);
      for (let d = -1; d <= 1; d++) { const xi = Math.round(x + d); if (xi > 0 && xi < w && G.mag[y * w + xi] >= thr * 0.6) { c++; break; } }
    }
    ev[y] = c / 2;
  }
  const win = Math.max(3, Math.round(h * 0.015)), sm = new Float32Array(h);
  for (let y = 0; y < h; y++) { let t = 0, c = 0; for (let d = -win; d <= win; d++) { const yy = y + d; if (yy >= 0 && yy < h) { t += ev[yy]; c++; } } sm[y] = t / c; }
  // Longest run above half, allowing short gaps.
  let bestRun = [0, 0], start = -1, gap = 0;
  const maxGap = Math.round(h * 0.06);
  for (let y = 0; y <= h; y++) {
    const on = y < h && sm[y] > 0.5;
    if (on) { if (start < 0) start = y; gap = 0; }
    else if (start >= 0) {
      gap++;
      if (gap > maxGap || y === h) { const end = y - gap; if (end - start > bestRun[1] - bestRun[0]) bestRun = [start, end]; start = -1; gap = 0; }
    }
  }
  let [top, bottom] = bestRun;
  let endsFromGuide = false;
  if (guide) {
    // With the guide, trust its ends when the evidence runs out near them (a hand, a shadow).
    if (top > guide[1] + h * 0.04) { top = guide[1]; endsFromGuide = true; }
    if (bottom < guide[3] - h * 0.04) { bottom = guide[3]; endsFromGuide = true; }
  }
  if (bottom - top < h * 0.25) return { found: false, ms: ms() };
  const rough = [[xAt(Lc, top), top], [xAt(Rc, top), top], [xAt(Rc, bottom), bottom], [xAt(Lc, bottom), bottom]];
  const widthWork = ((rough[1][0] - rough[0][0]) + (rough[2][0] - rough[3][0])) / 2;
  const result = { found: true, ambiguity, endsFromGuide, roughQuad: rough.map(p => [p[0] / s, p[1] / s]), widthPx: widthWork / s };
  lap('ends');
  if (opts.refine === false) return { ...result, quad: result.roughQuad, errPx: 3 / s, relErr: (3 / s) / (widthWork / s), steps, ms: ms() };
  // Refine at full resolution.
  // Read only four narrow strips along the edges, at up to 3,000 pixels.
  const sw = source.videoWidth || source.naturalWidth || source.width, sh = source.videoHeight || source.naturalHeight || source.height;
  const k = Math.min(1, (opts.maxSide || 3000) / Math.max(sw, sh));
  const quadF = result.roughQuad.map(p => [p[0] * k, p[1] * k]);
  const search = Math.max(4, 3 * k / s);
  const strips = [0, 1, 2, 3].map(e => {
    const a = result.roughQuad[e], b = result.roughQuad[(e + 1) % 4], m = (search + 4) / k;
    return pixels(source, opts.maxSide || 3000, [Math.min(a[0], b[0]) - m, Math.min(a[1], b[1]) - m, Math.max(a[0], b[0]) + m, Math.max(a[1], b[1]) + m]);
  });
  const F = e => strips[e];
  lap('readFull');
  const R = refineQuad(F, quadF, search);
  lap('refine');
  const quad = R.quad.map(p => [p[0] / k, p[1] / k]);
  const errPx = R.errPx / k, widthPx = R.widthPx / k;
  return { ...result, quad, errPx, widthPx, relErr: errPx / widthPx, support: R.support, edgeSupport: R.edges.map(e => e.support), cornerErr: R.cornerErr.map(e => e / k), steps, ms: ms() };
}

/** Is a detected spine good enough to save without asking? Stricter than covers. */
export function spineVerdict(r) {
  if (!r.found) return { auto: false, reason: 'No spine found' };
  if (r.ambiguity > 0.8) return { auto: false, reason: 'Two possible spines' };
  if (r.endsFromGuide) return { auto: false, reason: 'An end is hidden' };
  // Edges in order: top, right, bottom, left. The long sides must be clearly
  // seen along most of their length; the short ends have fewer samples.
  const es = r.edgeSupport || [0, 0, 0, 0];
  if (Math.min(es[1], es[3]) < 0.7) return { auto: false, reason: 'A long edge is unclear' };
  if (Math.min(es[0], es[2]) < 0.6) return { auto: false, reason: 'An end is unclear' };
  if (r.relErr > 0.03) return { auto: false, reason: `Edges uncertain by ${Math.round(r.relErr * 100)}% of the width` };
  return { auto: true, reason: 'Edges clear' };
}

export { edgeStrength };
