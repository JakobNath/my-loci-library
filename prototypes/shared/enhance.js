// Photo enhancement: make every book photo look as if taken in one place under
// one light, without changing the book's real colors.
//
// Steps, each with a strength from 0 (off) to 1 (full):
//   whiteBalance  Use a light surface around the book (the white side of a
//                 mat, a bedspread) as the white reference, so a lamp's yellow
//                 or a window's blue is removed. On a darker surface (wood, the
//                 dark side of a mat) a cautious estimate from the book itself
//                 is used instead, because dark wood and a dark grey mat under
//                 warm light cannot be told apart.
//   exposure      Bring a light reference to the same brightness every time
//                 (or, with a dark reference, the book's highlights).
//   evenLight     Fit a smooth lighting surface to the background around the
//                 book and divide it out, evening shadows and fall-off.
//   levels        Set black and white points from the book itself.
//   contrast      A gentle S-curve.
//   glare         Soften small bright, colorless highlights (shine on glossy jackets).
//   sharpen       Light sharpening after resizing.
// Prototype code.

import { homography, straighten } from './autocrop.js';
import { pixels } from './refine.js';

export const DEFAULTS = { whiteBalance: 1, exposure: 1, evenLight: 0.5, levels: 0.6, contrast: 0.15, glare: 0.4, sharpen: 0.35 };

const TO_LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) TO_LIN[i] = Math.pow(i / 255, 2.2);
// Linear light back to display values, through a 4,096-step table (fast).
const DISP = new Float32Array(4097);
for (let i = 0; i <= 4096; i++) DISP[i] = 255 * Math.pow(i / 4096, 1 / 2.2);
const toDisp = v => DISP[v <= 0 ? 0 : v >= 1 ? 4096 : (v * 4096) | 0];
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const median = a => { const s = Float32Array.from(a).sort(); return s[s.length >> 1]; };

/** Samples of the surface around the book: positions in the straightened frame, and linear colors. */
function surroundSamples(source, quad, W, H) {
  const P = pixels(source, 640), k = P.scale;
  const q = quad.map(p => [p[0] * k, p[1] * k]);
  const toFlat = homography(q, [[0, 0], [W, 0], [W, H], [0, H]]);
  const flat = (x, y) => { const d = toFlat[6] * x + toFlat[7] * y + 1; return [(toFlat[0] * x + toFlat[1] * y + toFlat[2]) / d, (toFlat[3] * x + toFlat[4] * y + toFlat[5]) / d]; };
  const cx = q.reduce((s, p) => s + p[0], 0) / 4, cy = q.reduce((s, p) => s + p[1], 0) / 4;
  const short = Math.min(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]));
  const out = [];
  for (let e = 0; e < 4; e++) {
    const a = q[e], b = q[(e + 1) % 4], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
    for (let t = 0.1; t <= 0.9; t += 0.1) for (const off of [0.12, 0.22, 0.34]) { // away from the book's own shadow
      const d = Math.max(6, short * off), x = a[0] + (b[0] - a[0]) * t + nx * d, y = a[1] + (b[1] - a[1]) * t + ny * d;
      if (x < 2 || y < 2 || x > P.w - 3 || y > P.h - 3) continue;
      const i = ((y | 0) * P.w + (x | 0)) * 4;
      // Texture: how much the brightness changes over a few pixels. Wood grain
      // and patterned cloth are textured; a mat or a bedspread is smooth.
      const g = (xx, yy) => { const j = ((Math.max(0, Math.min(P.h - 1, yy)) | 0) * P.w + (Math.max(0, Math.min(P.w - 1, xx)) | 0)) * 4; return 0.3 * P.data[j] + 0.59 * P.data[j + 1] + 0.11 * P.data[j + 2]; };
      const tex = (Math.abs(g(x + 3, y) - g(x - 3, y)) + Math.abs(g(x, y + 3) - g(x, y - 3))) / (g(x, y) + 10);
      out.push({ pos: flat(x, y), c: [TO_LIN[P.data[i]], TO_LIN[P.data[i + 1]], TO_LIN[P.data[i + 2]]], tex });
    }
  }
  // Drop outliers (a hand, another book): keep samples near the median brightness.
  if (out.length < 8) return [];
  const L = out.map(s => lum(...s.c)), m = median(L), mad = median(L.map(v => Math.abs(v - m))) || 0.01;
  return out.filter((s, i) => Math.abs(L[i] - m) <= 3 * mad);
}

function fitSurface(samples) {
  // Least squares: log brightness = a + b u + c v + d u² + e v² + f u v.
  const rows = samples.map(s => { const [u, v] = s.pos; return [1, u, v, u * u, v * v, u * v]; });
  const y = samples.map(s => Math.log(Math.max(1e-4, lum(...s.c))));
  const n = 6, M = Array.from({ length: n }, () => new Float64Array(n + 1));
  rows.forEach((r, k) => { for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) M[i][j] += r[i] * r[j]; M[i][n] += r[i] * y[k]; } });
  for (let i = 0; i < n; i++) M[i][i] += 1e-3; // a little damping keeps it smooth
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const coef = M.map((r, i) => r[n] / r[i]);
  return (u, v) => coef[0] + coef[1] * u + coef[2] * v + coef[3] * u * u + coef[4] * v * v + coef[5] * u * v;
}

function boxBlur(src, w, h, r) {
  // Separable box blur using running sums.
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { tmp[y * w + x] = s / (2 * r + 1); s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = s / (2 * r + 1); s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
  return out;
}

/**
 * Straighten and enhance. Returns { before, after (canvases), info, ms }.
 * `before` is the straightened, unenhanced photo (the "original" choice).
 */
export function enhance(source, quad, height, settings = {}) {
  const t0 = performance.now();
  const S = { ...DEFAULTS, ...settings };
  const steps = {}, lap = name => { const now = performance.now(); steps[name] = Math.round(now - (lap.t || t0)); lap.t = now; };
  const before = straighten(source, quad, height);
  lap('straighten');
  const W = before.width, H = before.height, n = W * H;
  const bctx = before.getContext('2d');
  const src = bctx.getImageData(0, 0, W, H).data;
  const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
  for (let i = 0; i < n; i++) { R[i] = TO_LIN[src[i * 4]]; G[i] = TO_LIN[src[i * 4 + 1]]; B[i] = TO_LIN[src[i * 4 + 2]]; }
  const info = {};

  // Reference: the surface around the book.
  lap('decode');
  const samples = surroundSamples(source, quad, W, H);
  lap('surround');
  const ref = samples.length ? [0, 1, 2].map(c => median(samples.map(s => s.c[c]))) : null;
  const refL = ref ? lum(...ref) : 0;
  const refDisp = ref ? ref.map(toDisp) : null;
  const sat = refDisp ? (Math.max(...refDisp) - Math.min(...refDisp)) / Math.max(1, Math.max(...refDisp)) : 1;
  const texture = samples.length ? median(samples.map(s2 => s2.tex)) : 1;
  info.refColor = refDisp ? refDisp.map(v => Math.round(v)) : null;
  info.saturation = +sat.toFixed(2); info.texture = +texture.toFixed(3);
  // Only a light, near-grey surface (a white mat, a bedspread) is trusted as
  // white. A dark surface cannot be told apart from brown wood by color or
  // texture (measured on real photos), so then the color is estimated from
  // the scene instead.
  const neutral = ref && sat < 0.28 && toDisp(refL) > 150;
  info.reference = !ref ? 'none found' : neutral ? 'light surface, used as white' : 'surface not trusted as white: color estimated from the scene';

  // 1. White balance.
  let gains = [1, 1, 1];
  if (neutral) {
    const m = (ref[0] + ref[1] + ref[2]) / 3;
    gains = ref.map(v => Math.max(0.7, Math.min(1.45, m / Math.max(1e-4, v))));
  } else {
    // Shades of grey (p = 6) over the book, held back to half strength.
    const pw = c => Math.pow(c.reduce((s, v) => s + Math.pow(v, 6), 0) / c.length, 1 / 6);
    const m = [R, G, B].map(pw), avg = (m[0] + m[1] + m[2]) / 3;
    gains = m.map(v => Math.max(0.85, Math.min(1.18, avg / Math.max(1e-4, v)))).map(g => 1 + (g - 1) * 0.5);
  }
  gains = gains.map(g => 1 + (g - 1) * S.whiteBalance);
  info.gains = gains.map(g => +g.toFixed(3));

  // The lighting surface around the book (used for exposure and even light).
  const surface = samples.length >= 20 ? fitSurface(samples.map(s => ({ pos: [s.pos[0] / W, s.pos[1] / H], c: s.c }))) : null;
  // 2. Exposure. With a light reference, the surface's brightness at the
  // book's centre (shadows already accounted for by the fitted surface).
  let k = 1;
  const wbL = gains[0] * 0.2126 + gains[1] * 0.7152 + gains[2] * 0.0722;
  if (neutral && toDisp(refL) > 120) {
    const centreL = surface ? Math.exp(surface(0.5, 0.5)) : refL;
    k = Math.pow(236 / 255, 2.2) / Math.max(1e-4, centreL * wbL);
  }
  else {
    const Ls = new Float32Array(n); for (let i = 0; i < n; i++) Ls[i] = lum(R[i] * gains[0], G[i] * gains[1], B[i] * gains[2]);
    Ls.sort(); k = Math.pow(245 / 255, 2.2) / Math.max(1e-4, Ls[Math.floor(n * 0.99)]);
  }
  k = Math.max(0.75, Math.min(1.6, k));
  k = 1 + (k - 1) * S.exposure;
  info.exposure = +k.toFixed(3);

  // 3. Even lighting from the surface around the book.
  let light = null;
  if (S.evenLight > 0 && surface) {
    const f = surface, centre = f(0.5, 0.5);
    light = (x, y) => Math.max(0.74, Math.min(1.35, Math.exp(-(f(x / W, y / H) - centre) * S.evenLight)));
    let lo = Infinity, hi = 0;
    for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]]) { const c = light(u * W, v * H); lo = Math.min(lo, c); hi = Math.max(hi, c); }
    info.lightingCorrected = `${Math.round((hi / lo - 1) * 100)}% across the book`;
  } else info.lightingCorrected = 'not applied';
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    const c = (light ? light(x, y) : 1) * k;
    R[i] *= gains[0] * c; G[i] *= gains[1] * c; B[i] *= gains[2] * c;
  }

  lap('balanceAndLight');
  // Back to display values for the remaining steps.
  const r = new Float32Array(n), g = new Float32Array(n), b = new Float32Array(n), L = new Float32Array(n);
  for (let i = 0; i < n; i++) { r[i] = toDisp(R[i]); g[i] = toDisp(G[i]); b[i] = toDisp(B[i]); L[i] = 0.2126 * r[i] + 0.7152 * g[i] + 0.0722 * b[i]; }

  // 4 and 5. Levels and contrast, on brightness only (colors keep their hue).
  const sortedL = Float32Array.from(L).sort();
  const lo = sortedL[Math.floor(n * 0.004)], hi = sortedL[Math.floor(n * 0.996)];
  const gain = Math.min(1.5, (247 - 8) / Math.max(1, hi - lo));
  // The levels-and-contrast curve depends only on brightness: make a table.
  const CURVE = new Float32Array(1024);
  for (let j = 0; j < 1024; j++) {
    const v = j / 4;
    let o = 8 + (v - lo) * gain; o = v + (o - v) * S.levels;
    const t = Math.max(0, Math.min(1, o / 255)), sc = 0.5 - 0.5 * Math.cos(Math.PI * t);
    CURVE[j] = 255 * (t + (sc - t) * S.contrast);
  }
  const curve = v => CURVE[v <= 0 ? 0 : v >= 255.75 ? 1023 : (v * 4) | 0];
  // 6. Glare: bright, colorless spots well above their surroundings.
  const blurL = S.glare > 0 ? boxBlur(L, W, H, Math.max(6, Math.round(Math.min(W, H) / 25))) : null;
  for (let i = 0; i < n; i++) {
    let target = curve(L[i]);
    if (blurL) {
      const mx = Math.max(r[i], g[i], b[i]), mn = Math.min(r[i], g[i], b[i]), satp = mx > 0 ? (mx - mn) / mx : 0;
      const excess = L[i] - blurL[i] - 25;
      if (excess > 0 && L[i] > 190 && satp < 0.18) target -= Math.min(excess, 60) * 0.7 * S.glare;
    }
    const scale = L[i] > 0.5 ? target / L[i] : 1;
    r[i] *= scale; g[i] *= scale; b[i] *= scale;
  }
  lap('levelsGlare');
  // 7. Sharpen (unsharp mask, radius 1).
  if (S.sharpen > 0) {
    // 3 x 3 neighbourhood average; edges of the image are left as they are.
    const amt = S.sharpen * 1.2;
    for (const ch of [r, g, b]) {
      const src2 = ch.slice();
      for (let y = 1; y < H - 1; y++) {
        let i = y * W + 1;
        for (let x = 1; x < W - 1; x++, i++) {
          const m = (src2[i - W - 1] + src2[i - W] + src2[i - W + 1] + src2[i - 1] + src2[i] + src2[i + 1] + src2[i + W - 1] + src2[i + W] + src2[i + W + 1]) / 9;
          ch[i] = src2[i] + amt * (src2[i] - m);
        }
      }
    }
  }
  const after = document.createElement('canvas'); after.width = W; after.height = H;
  const actx = after.getContext('2d'), out = actx.createImageData(W, H), od = out.data;
  for (let i = 0; i < n; i++) { od[i * 4] = r[i]; od[i * 4 + 1] = g[i]; od[i * 4 + 2] = b[i]; od[i * 4 + 3] = 255; }
  actx.putImageData(out, 0, 0);
  lap('sharpenOut');
  return { before, after, info, steps, ms: performance.now() - t0 };
}
