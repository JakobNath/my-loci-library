// Edge refinement at full resolution, and an honest error estimate.
//
// The first detection (autocrop.js or spine.js) works on a small copy of the
// photo, so its corners can be several real pixels off. This module takes
// those rough corners back to the full-resolution photo and, for each of the
// four edges:
//   1. samples many short lines across the edge,
//   2. finds where the color changes most sharply on each (to a fraction of
//      a pixel),
//   3. fits a straight line through those points, ignoring stray ones.
// The corners are where the four fitted lines meet.
//
// The scatter of the points around each line tells how precisely that edge
// is known. From it comes an estimated error, in pixels, for each corner:
// this is what decides whether a photo may be saved without asking.
// Prototype code.

/**
 * Read a source (image, video, canvas) into RGBA pixels, scaled so its long
 * side is at most maxSide. With `region` ([x0, y0, x1, y1] in the source's own
 * pixels) only that part is read: coordinates stay those of the whole scaled
 * image, so callers need not care.
 */
export function pixels(source, maxSide = 3200, region = null) {
  const sw = source.videoWidth || source.naturalWidth || source.width;
  const sh = source.videoHeight || source.naturalHeight || source.height;
  const s = Math.min(1, maxSide / Math.max(sw, sh));
  let [rx0, ry0, rx1, ry1] = region || [0, 0, sw, sh];
  rx0 = Math.max(0, Math.floor(rx0)); ry0 = Math.max(0, Math.floor(ry0)); rx1 = Math.min(sw, Math.ceil(rx1)); ry1 = Math.min(sh, Math.ceil(ry1));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round((rx1 - rx0) * s)); c.height = Math.max(1, Math.round((ry1 - ry0) * s));
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(source, rx0, ry0, rx1 - rx0, ry1 - ry0, 0, 0, c.width, c.height);
  return { data: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height, scale: s, ox: rx0 * s, oy: ry0 * s, canvas: c };
}

function color(px, x, y, out) {
  // Bilinear sample of one pixel position; returns [r, g, b] in out.
  const { data, w, h } = px;
  x -= px.ox || 0; y -= px.oy || 0;
  x = Math.max(0, Math.min(w - 1.001, x)); y = Math.max(0, Math.min(h - 1.001, y));
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
  const i = (y0 * w + x0) * 4, j = i + w * 4;
  for (let k = 0; k < 3; k++) {
    out[k] = (data[i + k] * (1 - fx) + data[i + 4 + k] * fx) * (1 - fy) + (data[j + k] * (1 - fx) + data[j + 4 + k] * fx) * fy;
  }
  return out;
}

const A = [0, 0, 0], B = [0, 0, 0];
/** Strength of the color change across a point, in direction (nx, ny). */
export function edgeStrength(px, x, y, nx, ny, d = 1.5) {
  color(px, x - nx * d, y - ny * d, A); color(px, x + nx * d, y + ny * d, B);
  return Math.sqrt((A[0] - B[0]) ** 2 + (A[1] - B[1]) ** 2 + (A[2] - B[2]) ** 2);
}

function fitLine(pts) {
  // Total least squares: the line through the centroid along the main direction.
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of pts) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  const t = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { mx, my, dx: Math.cos(t), dy: Math.sin(t) };
}
const residual = (L, p) => Math.abs(-(p[0] - L.mx) * L.dy + (p[1] - L.my) * L.dx);

/**
 * Refine one edge from a to b. (cx, cy) is a point inside the book, used to
 * tell inside from outside. `search` is how far (in pixels) to look either
 * side of the rough edge.
 */
export function refineEdge(px, a, b, cx, cy, search, minStrength = 16) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
  let nx = -ty, ny = tx;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
  const count = Math.max(12, Math.min(90, Math.round(len / 8)));
  const pts = [], sigma = search * 0.6;
  for (let k = 0; k < count; k++) {
    const t = 0.06 + 0.88 * k / (count - 1);
    const x0 = a[0] + (b[0] - a[0]) * t, y0 = a[1] + (b[1] - a[1]) * t;
    let best = -1, bs = 0, prof = [];
    for (let s = -search; s <= search; s += 0.5) {
      const e = edgeStrength(px, x0 + nx * s, y0 + ny * s, nx, ny);
      prof.push(e);
      const score = e * Math.exp(-(s * s) / (2 * sigma * sigma));
      if (score > bs) { bs = score; best = prof.length - 1; }
    }
    if (best < 0 || prof[best] < minStrength) continue;
    // Sub-pixel: fit a parabola through the peak and its neighbours.
    let off = 0;
    if (best > 0 && best < prof.length - 1) {
      const l = prof[best - 1], c = prof[best], r = prof[best + 1], den = l - 2 * c + r;
      if (den < 0) off = 0.5 * (l - r) / den;
    }
    const s = -search + (best + off) * 0.5;
    pts.push([x0 + nx * s, y0 + ny * s]);
  }
  if (pts.length < 6) return { ok: false, support: pts.length / count, line: null, rms: Infinity, n: pts.length, len };
  // Fit, drop stray points, fit again.
  let L = fitLine(pts), inl = pts;
  for (let round = 0; round < 2; round++) {
    const rs = inl.map(p => residual(L, p)).sort((u, v) => u - v);
    const cut = Math.max(0.8, 2.5 * rs[rs.length >> 1]);
    const keep = pts.filter(p => residual(L, p) <= cut);
    if (keep.length < 6) break;
    inl = keep; L = fitLine(inl);
  }
  const rms = Math.sqrt(inl.reduce((s, p) => s + residual(L, p) ** 2, 0) / inl.length);
  return { ok: true, line: L, rms, n: inl.length, support: inl.length / count, len, normal: [nx, ny] };
}

export function intersect(L1, L2) {
  const det = L1.dx * L2.dy - L1.dy * L2.dx;
  if (Math.abs(det) < 1e-6) return null;
  const t = ((L2.mx - L1.mx) * L2.dy - (L2.my - L1.my) * L2.dx) / det;
  return [L1.mx + L1.dx * t, L1.my + L1.dy * t];
}

/**
 * Refine a rough quad (TL, TR, BR, BL, in px's own pixels).
 * Returns { quad, errPx (largest estimated corner error), cornerErr, support,
 * widthPx (mean of the two short sides), ok }.
 */
export function refineQuad(px, quad, search) {
  const cx = quad.reduce((s, p) => s + p[0], 0) / 4, cy = quad.reduce((s, p) => s + p[1], 0) / 4;
  // px may be one set of pixels, or a function giving the pixels for edge e (narrow strips).
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0]].map(([i, j], e) => refineEdge(typeof px === 'function' ? px(e) : px, quad[i], quad[j], cx, cy, search));
  const sides = [0, 1, 2, 3].map(i => Math.hypot(quad[(i + 1) % 4][0] - quad[i][0], quad[(i + 1) % 4][1] - quad[i][1]));
  const widthPx = Math.min((sides[0] + sides[2]) / 2, (sides[1] + sides[3]) / 2);
  // Precision of a fitted line at its ends is about rms * 2 / sqrt(n); a
  // weakly supported edge is trusted less.
  const sig = e => (e.ok ? (e.rms * 2) / Math.sqrt(e.n) + 0.25 : search) / Math.min(1, (e.support / 0.8)) ** 2;
  const out = [], cornerErr = [];
  const pairs = [[3, 0], [0, 1], [1, 2], [2, 3]]; // corner i is where edge pairs meet
  for (let i = 0; i < 4; i++) {
    const [e1, e2] = pairs[i].map(k => edges[k]);
    const p = e1.ok && e2.ok ? intersect(e1.line, e2.line) : null;
    const moved = p ? Math.hypot(p[0] - quad[i][0], p[1] - quad[i][1]) : Infinity;
    // A corner that jumped far from the rough one is not trusted.
    if (p && moved <= search * 2) { out.push(p); cornerErr.push(Math.hypot(sig(e1), sig(e2))); }
    else { out.push(quad[i]); cornerErr.push(search); }
  }
  const support = Math.min(...edges.map(e => e.support));
  return { quad: out, errPx: Math.max(...cornerErr), cornerErr, support, widthPx, edges, ok: edges.every(e => e.ok) };
}
