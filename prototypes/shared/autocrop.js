// Finding a book in a photo and straightening it, in plain JavaScript.
// No AI, no libraries: classic image processing on a small copy of the photo.
//
//   1. Shrink the photo to about 256 pixels on its long side.
//   2. Learn the background color from a thin ring around the edge.
//   3. Mark every pixel whose color differs clearly from the background.
//   4. Tidy the marks (fill small gaps, drop specks) and keep the largest
//      solid shape near the middle.
//   5. Wrap that shape in its smallest rotated rectangle and take the four
//      corners of the shape inside it.
//   6. Straighten: map those four corners onto a flat rectangle at full
//      resolution (a perspective correction, the same as dragging handles).
//
// If no clear shape is found but the whole photo already has the shape of a
// cover or spine, the photo is treated as already cropped.
// Prototype code; the app's version is written in phase 6 with tests.

const WORK = 256;

function toCanvas(source, maxSide) {
  const sw = source.videoWidth || source.naturalWidth || source.width;
  const sh = source.videoHeight || source.naturalHeight || source.height;
  const s = Math.min(1, maxSide / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(sw * s)); c.height = Math.max(1, Math.round(sh * s));
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(source, 0, 0, c.width, c.height);
  return { canvas: c, ctx: x, scale: s, sw, sh };
}

const median = arr => { const a = Float32Array.from(arr).sort(); return a[a.length >> 1]; };

function otsu(values, max) {
  const bins = 64, hist = new Float64Array(bins);
  for (const v of values) hist[Math.min(bins - 1, (v / max * bins) | 0)]++;
  let total = values.length, sum = 0;
  for (let i = 0; i < bins; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, at = 0;
  for (let i = 0; i < bins; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) ** 2;
    if (between > best) { best = between; at = i; }
  }
  return (at + 0.5) / bins * max;
}

function morph(mask, w, h, r, grow) {
  // Square dilation (grow) or erosion, done as two one-dimensional passes.
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  const want = grow ? 1 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = grow ? 0 : 1;
    for (let k = -r; k <= r; k++) { const xx = x + k; const m = xx < 0 || xx >= w ? (grow ? 0 : 1) : mask[y * w + xx]; if (m === want) { v = want; break; } }
    tmp[y * w + x] = v;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = grow ? 0 : 1;
    for (let k = -r; k <= r; k++) { const yy = y + k; const m = yy < 0 || yy >= h ? (grow ? 0 : 1) : tmp[yy * w + x]; if (m === want) { v = want; break; } }
    out[y * w + x] = v;
  }
  return out;
}

function hull(points) {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

const area = q => Math.abs(q.reduce((s, p, i) => { const n = q[(i + 1) % q.length]; return s + p[0] * n[1] - n[0] * p[1]; }, 0)) / 2;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function quadFromHull(h) {
  // Smallest rotated rectangle around the hull gives the book's tilt; within
  // that frame the four corners are the extreme points along the diagonals.
  let best = null;
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    const t = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(t), s = Math.sin(t);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const p of h) { const u = p[0] * c + p[1] * s, v = -p[0] * s + p[1] * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const ar = (u1 - u0) * (v1 - v0);
    if (!best || ar < best.ar) best = { ar, c, s };
  }
  const { c, s } = best;
  const rot = h.map(p => ({ p, u: p[0] * c + p[1] * s, v: -p[0] * s + p[1] * c }));
  const pick = f => rot.reduce((m, r) => (f(r) > f(m) ? r : m)).p;
  const corners = [pick(r => -(r.u + r.v)), pick(r => r.u - r.v), pick(r => r.u + r.v), pick(r => r.v - r.u)];
  // Order as top-left, top-right, bottom-right, bottom-left in the image.
  const cx = corners.reduce((s2, p) => s2 + p[0], 0) / 4, cy = corners.reduce((s2, p) => s2 + p[1], 0) / 4;
  corners.sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
  let start = 0;
  corners.forEach((p, i) => { if (p[0] + p[1] < corners[start][0] + corners[start][1]) start = i; });
  return [0, 1, 2, 3].map(i => corners[(start + i) % 4]);
}

/**
 * Find a book in an image, video frame or canvas.
 * kind: 'cover' or 'spine' (used only to judge whether the result is plausible).
 * opts.work: size of the working copy (default 256); opts.hint: a threshold to
 * start from, for live camera frames.
 * Returns { quad, confidence (0 to 1), wholeImage, lowContrast, ms }.
 * quad is four [x, y] points in the source's own pixels: TL, TR, BR, BL.
 */
export function findBook(source, kind = 'cover', opts = {}) {
  const t0 = performance.now();
  const { ctx, canvas, scale, sw, sh } = toCanvas(source, opts.work || WORK);
  const w = canvas.width, h = canvas.height, n = w * h;
  const px = ctx.getImageData(0, 0, w, h).data;
  const L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    L[i] = 0.299 * r + 0.587 * g + 0.114 * b; A[i] = r - g; B[i] = (r + g) / 2 - b;
  }
  // Background color: median of a thin ring around the edge.
  const ring = Math.max(2, Math.round(Math.min(w, h) * 0.04)), ringIdx = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < ring || y < ring || x >= w - ring || y >= h - ring) ringIdx.push(y * w + x);
  const Lb = median(ringIdx.map(i => L[i])), Ab = median(ringIdx.map(i => A[i])), Bb = median(ringIdx.map(i => B[i]));
  // Difference from the background. Lightness counts a little less than
  // color, so soft shadows on a bedspread or table matter less.
  const D = new Float32Array(n); let maxD = 1;
  for (let i = 0; i < n; i++) { const d = Math.sqrt(0.7 * (L[i] - Lb) ** 2 + 1.6 * ((A[i] - Ab) ** 2 + (B[i] - Bb) ** 2)); D[i] = d; if (d > maxD) maxD = d; }
  const ringD = ringIdx.map(i => D[i]).sort((a, b) => a - b), ringNoise = ringD[Math.floor(ringD.length * 0.9)];
  const base = Math.max(otsu(D, maxD), ringNoise * 1.6, 18);
  const r = Math.max(1, Math.round(Math.min(w, h) / 90));
  const aspectOK = a => (kind === 'spine' ? a > 0.02 && a < 0.4 : a > 0.45 && a < 1.05);

  // One attempt at a given threshold: mark, tidy, find shapes, fit corners.
  function shapeAt(T) {
    let mask = new Uint8Array(n);
    for (let i = 0; i < n; i++) mask[i] = D[i] > T ? 1 : 0;
    mask = morph(morph(mask, w, h, r * 2, true), w, h, r * 2, false); // close small gaps (lettering, gold lines)
    mask = morph(morph(mask, w, h, r, false), w, h, r, true);         // drop specks
    const label = new Int32Array(n).fill(-1), comps = [];
    for (let i = 0; i < n; i++) {
      if (!mask[i] || label[i] >= 0) continue;
      const id = comps.length, stack = [i]; label[i] = id;
      let cnt = 0, sx = 0, sy = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
      while (stack.length) {
        const j = stack.pop(), x = j % w, y = (j / w) | 0; cnt++; sx += x; sy += y;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (const k of [j - 1, j + 1, j - w, j + w]) {
          if (k < 0 || k >= n || (k === j - 1 && x === 0) || (k === j + 1 && x === w - 1)) continue;
          if (mask[k] && label[k] < 0) { label[k] = id; stack.push(k); }
        }
      }
      const touch = (x0 === 0) + (y0 === 0) + (x1 === w - 1) + (y1 === h - 1);
      const off = Math.hypot(sx / cnt / w - 0.5, sy / cnt / h - 0.5);
      comps.push({ id, cnt, touch, off, x0, x1, y0, y1, score: cnt * (touch >= 3 ? 0.02 : touch === 2 ? 0.3 : touch === 1 ? 0.8 : 1) * (1 - off) });
    }
    if (!comps.length) return null;
    const best = comps.reduce((a, b) => (b.score > a.score ? b : a));
    if (best.cnt < n * 0.01) return null;
    const pts = [];
    for (let y = best.y0; y <= best.y1; y++) {
      let a = -1, b = -1;
      for (let x = best.x0; x <= best.x1; x++) if (label[y * w + x] === best.id) { if (a < 0) a = x; b = x; }
      if (a >= 0) pts.push([a, y], [b + 1, y], [a, y + 1], [b + 1, y + 1]);
    }
    const q = quadFromHull(hull(pts));
    const solidity = Math.min(1, best.cnt / Math.max(1, area(q)));
    const aspect = ((dist(q[0], q[1]) + dist(q[3], q[2])) / 2) / Math.max(1, (dist(q[0], q[3]) + dist(q[1], q[2])) / 2);
    const frac = area(q) / n;
    let inside = 0; for (let i = 0; i < n; i++) if (label[i] === best.id) inside += D[i];
    const support = edgeSupport(q);
    const quality = solidity ** 2 * [1, 0.8, 0.35, 0, 0][best.touch] * (aspectOK(aspect) ? 1 : 0.5) * (frac > 0.015 && frac < 0.92 ? 1 : 0.3) * (1 - best.off) * Math.min(1, support / 0.7);
    return { q, quality, solidity, support, touch: best.touch, aspectOK: aspectOK(aspect), insideMean: inside / best.cnt, cnt: best.cnt, T };
  }

  // Edge support: along each edge of the fitted shape, compare the color just
  // inside with just outside. A real book edge is a clear change along almost
  // all of its length; the soft edge of a shadow is not. Returns 0 to 1, the
  // share of edge samples with a clear change (the weakest edge counts double).
  function edgeSupport(q) {
    const cx = q.reduce((s, p) => s + p[0], 0) / 4, cy = q.reduce((s, p) => s + p[1], 0) / 4;
    const at = (x, y) => { const xi = Math.max(0, Math.min(w - 1, Math.round(x))), yi = Math.max(0, Math.min(h - 1, Math.round(y))); return yi * w + xi; };
    const off = Math.max(2, Math.round(Math.min(w, h) / 70)), shares = [];
    for (let e = 0; e < 4; e++) {
      const a = q[e], b = q[(e + 1) % 4], len = dist(a, b) || 1;
      let nx = (b[1] - a[1]) / len, ny = -(b[0] - a[0]) / len;
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
      let good = 0, total = 0;
      for (let t = 0.08; t <= 0.92; t += 0.04) {
        const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        const i = at(x - nx * off, y - ny * off), o = at(x + nx * off, y + ny * off);
        const dc = Math.sqrt((L[i] - L[o]) ** 2 + (A[i] - A[o]) ** 2 + (B[i] - B[o]) ** 2);
        total++; if (dc > 22) good++;
      }
      shares.push(good / total);
    }
    const weakest = Math.min(...shares);
    return (shares.reduce((s, v) => s + v, 0) + weakest) / 5;
  }

  // Try a few thresholds, from loose to strict, and keep the cleanest shape.
  // A loose threshold may join soft shadows to the book; a stricter one drops them.
  let best = null;
  const tried = [];
  // The ladder: the two estimates from the photo itself, plus fixed steps
  // across the whole range, so uneven backgrounds cannot push it out of reach.
  // With a hint (the threshold that worked on the previous camera frame), try
  // only that and its neighbours: fast enough to run several times a second.
  const steps = opts.hint ? [opts.hint * 0.8, opts.hint, opts.hint * 1.25]
    : [base, otsu(D, maxD), ...[0.18, 0.26, 0.35, 0.45, 0.56, 0.68].map(f => f * maxD)];
  const ladder = [...new Set(steps.map(t => Math.round(t)))].filter(t => t >= 12 && t < maxD * 0.85).sort((a, b) => a - b);
  for (const T of ladder) {
    const s = shapeAt(T);
    tried.push(s ? { T: Math.round(T), quality: +s.quality.toFixed(2), support: +s.support.toFixed(2), touch: s.touch, solidity: +s.solidity.toFixed(2), aspectOK: s.aspectOK, cnt: s.cnt } : { T: Math.round(T), none: true });
    if (s && (!best || s.quality > best.quality)) best = s;
    if (best && best.quality >= 0.95) break; // clean enough: no need to go stricter
  }
  findBook.lastTried = tried;
  const ms = () => performance.now() - t0;
  const whole = conf => ({ quad: [[0, 0], [sw, 0], [sw, sh], [0, sh]], confidence: conf, wholeImage: true, lowContrast: false, ms: ms() });
  if (!best || best.quality < 0.3) {
    // Nothing clear stands out. If the photo itself has the right shape and no
    // central shape was found, it is most likely already cropped.
    if (aspectOK(sw / sh) && (!best || best.touch >= 2 || best.cnt < n * 0.04)) return whole(0.6);
    if (!best) return whole(0.2);
  }
  const lowContrast = best.support < 0.6;
  let conf = Math.min(1, best.solidity / 0.9) * [1, 0.85, 0.5, 0.2, 0.2][best.touch] * (best.aspectOK ? 1 : 0.55) * Math.min(1, best.support / 0.75);
  if (lowContrast) conf *= 0.9;
  if (best.quality < 0.3) conf = Math.min(conf, 0.4);
  return { quad: best.q.map(p => [p[0] / scale, p[1] / scale]), confidence: conf, wholeImage: false, lowContrast, T: best.T, ms: ms() };
}

// Solve for the perspective transform that maps four points onto four others.
export function homography(from, to) {
  const M = [], v = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i], [u, w] = to[i];
    M.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); v.push(u);
    M.push([0, 0, 0, x, y, 1, -w * x, -w * y]); v.push(w);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]]; [v[c], v[p]] = [v[p], v[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k < 8; k++) M[r][k] -= f * M[c][k];
      v[r] -= f * v[c];
    }
  }
  return v.map((val, i) => val / M[i][i]);
}

const apply = (H, x, y) => { const d = H[6] * x + H[7] * y + 1; return [(H[0] * x + H[1] * y + H[2]) / d, (H[3] * x + H[4] * y + H[5]) / d]; };

/**
 * Straighten the area inside quad into a flat image `height` pixels tall.
 * Width follows the shape of the quad. Returns a canvas.
 */
export function straighten(source, quad, height) {
  // Read only the book's area, at about 1.5 times the output's size.
  const xs = quad.map(p => p[0]), ys = quad.map(p => p[1]);
  const bx0 = Math.max(0, Math.floor(Math.min(...xs)) - 2), by0 = Math.max(0, Math.floor(Math.min(...ys)) - 2);
  const sw0 = source.videoWidth || source.naturalWidth || source.width, sh0 = source.videoHeight || source.naturalHeight || source.height;
  const bx1 = Math.min(sw0, Math.ceil(Math.max(...xs)) + 2), by1 = Math.min(sh0, Math.ceil(Math.max(...ys)) + 2);
  const quadH = (dist(quad[0], quad[3]) + dist(quad[1], quad[2])) / 2;
  const scale = Math.min(1, (height * 1.5) / Math.max(1, quadH));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round((bx1 - bx0) * scale)); canvas.height = Math.max(1, Math.round((by1 - by0) * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, bx0, by0, bx1 - bx0, by1 - by0, 0, 0, canvas.width, canvas.height);
  const q = quad.map(p => [(p[0] - bx0) * scale, (p[1] - by0) * scale]);
  const aspect = ((dist(q[0], q[1]) + dist(q[3], q[2])) / 2) / ((dist(q[0], q[3]) + dist(q[1], q[2])) / 2);
  const H = height, W = Math.max(1, Math.round(H * aspect));
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const octx = out.getContext('2d'), dst = octx.createImageData(W, H);
  const src = ctx.getImageData(0, 0, canvas.width, canvas.height), sd = src.data, sw = src.width, shh = src.height, dd = dst.data;
  const T = homography([[0, 0], [W, 0], [W, H], [0, H]], q);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [u, v] = apply(T, x + 0.5, y + 0.5);
    const x0 = Math.max(0, Math.min(sw - 2, Math.floor(u - 0.5))), y0 = Math.max(0, Math.min(shh - 2, Math.floor(v - 0.5)));
    const fx = Math.min(1, Math.max(0, u - 0.5 - x0)), fy = Math.min(1, Math.max(0, v - 0.5 - y0));
    const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4, o = (y * W + x) * 4;
    for (let k = 0; k < 3; k++) dd[o + k] = (sd[i00 + k] * (1 - fx) + sd[i10 + k] * fx) * (1 - fy) + (sd[i01 + k] * (1 - fx) + sd[i11 + k] * fx) * fy;
    dd[o + 3] = 255;
  }
  octx.putImageData(dst, 0, 0);
  return out;
}

/** Draw an image into a four-cornered area of a canvas (used to make test photos). */
export function drawInto(ctx, img, quad) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const c = document.createElement('canvas'); c.width = iw; c.height = ih;
  const sctx = c.getContext('2d'); sctx.drawImage(img, 0, 0);
  const sd = sctx.getImageData(0, 0, iw, ih).data;
  const T = homography(quad, [[0, 0], [iw, 0], [iw, ih], [0, ih]]);
  const xs = quad.map(p => p[0]), ys = quad.map(p => p[1]);
  const bx0 = Math.max(0, Math.floor(Math.min(...xs))), bx1 = Math.min(ctx.canvas.width, Math.ceil(Math.max(...xs)));
  const by0 = Math.max(0, Math.floor(Math.min(...ys))), by1 = Math.min(ctx.canvas.height, Math.ceil(Math.max(...ys)));
  const out = ctx.getImageData(bx0, by0, bx1 - bx0, by1 - by0), od = out.data;
  for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) {
    const [u, v] = apply(T, x + 0.5, y + 0.5);
    if (u < 0 || v < 0 || u >= iw || v >= ih) continue;
    const s = ((v | 0) * iw + (u | 0)) * 4, o = ((y - by0) * (bx1 - bx0) + (x - bx0)) * 4;
    od[o] = sd[s]; od[o + 1] = sd[s + 1]; od[o + 2] = sd[s + 2]; od[o + 3] = 255;
  }
  ctx.putImageData(out, bx0, by0);
}
