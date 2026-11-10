// Making cover and spine images: reading a photo or a downloaded cover,
// straightening it by four corners, and saving it as JPEG in the sizes of
// PLAN.md ("Covers and images"). The only file that uses a canvas for
// photos. Loaded only when a photo or cover is handled. The laptop covers
// page uses the same code, so there is one image pipeline.

// Sizes and quality, all in one place, to tune later. Sharpness and beauty
// come before file size (PLAN.md).
// A spine is narrow, so its files stay small even when tall enough for its
// lettering to be read on a phone; a cover's detail image is sized for a
// phone screen at full sharpness (interface review, 2026-11-10).
export const IMAGE_SETTINGS = {
  thumbHeight: { cover: 200, spine: 600 }, // grid thumbnail and shelf spine, kept on every device
  detailHeight: { cover: 1000, spine: 1600 }, // book page, loaded when opened
  masterLongSide: 1600, // our own photos only, never sent to phones
  workingLongSide: 3000, // a camera photo is read at most this large before straightening
  quality: { thumb: 0.8, detail: 0.85, master: 0.9 },
  sharpen: 0.35, // a light sharpening after shrinking, which brings back crisp lettering
};

/**
 * Read a picture (a File from the camera or photo library, or a downloaded Blob).
 * @returns {Promise<HTMLCanvasElement>} the picture, at most workingLongSide pixels on its long side
 */
export async function readPicture(blob) {
  // createImageBitmap turns the picture upright from its camera orientation.
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new Error('This file could not be read as a picture. Try a JPEG or PNG photo.');
  }
  const scale = Math.min(1, IMAGE_SETTINGS.workingLongSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

// The 3 × 3 perspective mapping that takes the output rectangle (width × height)
// onto the four corners in the source, found by solving eight equations.
function perspective(width, height, corners) {
  const from = [[0, 0], [width, 0], [width, height], [0, height]];
  const rows = [];
  const values = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i];
    const [u, v] = corners[i];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); values.push(u);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y]); values.push(v);
  }
  // Gaussian elimination with the largest pivot in each column.
  for (let column = 0; column < 8; column++) {
    let best = column;
    for (let row = column + 1; row < 8; row++) if (Math.abs(rows[row][column]) > Math.abs(rows[best][column])) best = row;
    [rows[column], rows[best]] = [rows[best], rows[column]];
    [values[column], values[best]] = [values[best], values[column]];
    for (let row = 0; row < 8; row++) {
      if (row === column) continue;
      const factor = rows[row][column] / rows[column][column];
      for (let k = column; k < 8; k++) rows[row][k] -= factor * rows[column][k];
      values[row] -= factor * values[column];
    }
  }
  return values.map((value, i) => value / rows[i][i]);
}

/**
 * Straighten the part of a picture inside four corners into an upright rectangle.
 * @param {HTMLCanvasElement} source
 * @param {number[][]} corners top-left, top-right, bottom-right, bottom-left, in source pixels
 * @returns {HTMLCanvasElement}
 */
export function straighten(source, corners) {
  const side = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const naturalWidth = (side(corners[0], corners[1]) + side(corners[3], corners[2])) / 2;
  const naturalHeight = (side(corners[0], corners[3]) + side(corners[1], corners[2])) / 2;
  const scale = Math.min(1, IMAGE_SETTINGS.masterLongSide / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const [a, b, c, d, e, f, g, h] = perspective(width, height, corners);
  const input = source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, source.width, source.height);
  const output = new ImageData(width, height);
  const { data: from, width: sw, height: sh } = input;
  const to = output.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const w = g * x + h * y + 1;
      const u = Math.min(sw - 1.001, Math.max(0, (a * x + b * y + c) / w));
      const v = Math.min(sh - 1.001, Math.max(0, (d * x + e * y + f) / w));
      // Blend the four nearest source pixels, so edges stay smooth.
      const u0 = u | 0;
      const v0 = v | 0;
      const fu = u - u0;
      const fv = v - v0;
      const i = (v0 * sw + u0) * 4;
      const j = i + sw * 4;
      const o = (y * width + x) * 4;
      for (let k = 0; k < 3; k++) {
        to[o + k] = (from[i + k] * (1 - fu) + from[i + 4 + k] * fu) * (1 - fv) + (from[j + k] * (1 - fu) + from[j + 4 + k] * fu) * fv;
      }
      to[o + 3] = 255;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(output, 0, 0);
  return canvas;
}

// Shrink in steps of at most half, which keeps fine detail (lettering) sharp.
function resize(source, height) {
  let current = source;
  const target = Math.min(height, source.height);
  while (current.height / 2 >= target) current = drawAt(current, current.height / 2);
  return current.height === target ? current : drawAt(current, target);
}

function drawAt(source, height) {
  const canvas = document.createElement('canvas');
  canvas.height = Math.round(height);
  canvas.width = Math.max(1, Math.round(source.width * height / source.height));
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Sharpen a picture slightly, in place: each pixel is pushed away from the
 * average of its four neighbours (a small "unsharp mask"). Shrinking softens
 * fine lettering, and this restores it. About 20 ms for a 1,000 px cover.
 */
function sharpen(canvas, amount) {
  const context = canvas.getContext('2d');
  const { width, height } = canvas;
  if (width < 3 || height < 3 || !amount) return canvas;
  const image = context.getImageData(0, 0, width, height);
  const source = new Uint8ClampedArray(image.data);
  const out = image.data;
  const row = width * 4;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * row + x * 4;
      for (let c = 0; c < 3; c++) {
        const around = source[i - 4 + c] + source[i + 4 + c] + source[i - row + c] + source[i + row + c];
        out[i + c] = source[i + c] + amount * (4 * source[i + c] - around);
      }
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

// The shrunk copy, sharpened; never the source itself, which may be needed again.
function shrunk(source, height, amount) {
  const result = resize(source, height);
  return result === source ? result : sharpen(result, amount);
}

const jpeg = (canvas, quality) => new Promise((resolve, reject) => {
  canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('The picture could not be saved as JPEG.'))), 'image/jpeg', quality);
});

/**
 * The image files for one cover or spine. A detail image is never enlarged
 * beyond its source (Open Library covers are often only 500 px tall).
 * @param {HTMLCanvasElement} picture upright and cropped
 * @param {{ master?: boolean, kind?: 'cover'|'spine' }} [options] master: also keep the large copy (our own photos)
 * @returns {Promise<{ thumb: Blob, detail: Blob, master: Blob|null, color: string, ratio: number }>}
 *   ratio: width ÷ height, which gives a spine's thickness from its height
 */
export async function imageFiles(picture, { master = false, kind = 'cover' } = {}) {
  const settings = IMAGE_SETTINGS;
  const longSide = Math.max(picture.width, picture.height);
  const masterCanvas = master && longSide > settings.masterLongSide ? drawAt(picture, picture.height * settings.masterLongSide / longSide) : picture;
  return {
    thumb: await jpeg(shrunk(picture, settings.thumbHeight[kind], settings.sharpen), settings.quality.thumb),
    detail: await jpeg(shrunk(picture, settings.detailHeight[kind], settings.sharpen), settings.quality.detail),
    master: master ? await jpeg(masterCanvas, settings.quality.master) : null,
    color: mainColor(picture),
    ratio: Math.round(picture.width / picture.height * 10000) / 10000,
  };
}

/**
 * A picture's main color: the largest group of similar colors in a 24 × 36
 * copy, leaving out the outer edge. About 0.1 ms; done once, when a cover is saved.
 * @returns {string} "#rrggbb"
 */
export function mainColor(picture) {
  const small = document.createElement('canvas');
  small.width = 24;
  small.height = 36;
  const context = small.getContext('2d', { willReadFrequently: true });
  context.drawImage(picture, 0, 0, 24, 36);
  const data = context.getImageData(2, 2, 20, 32).data;
  const groups = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const key = (data[i] >> 5) * 64 + (data[i + 1] >> 5) * 8 + (data[i + 2] >> 5);
    const group = groups.get(key) || [0, 0, 0, 0];
    group[0] += data[i]; group[1] += data[i + 1]; group[2] += data[i + 2]; group[3]++;
    groups.set(key, group);
  }
  const [r, g, b, n] = [...groups.values()].sort((x, y) => y[3] - x[3])[0];
  return '#' + [r / n, g / n, b / n].map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
}
