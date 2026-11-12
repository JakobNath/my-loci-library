// The camera and the barcode decoder, for scanning ISBNs. The only file that
// uses getUserMedia or a barcode decoder. It is loaded only when the scan
// screen opens. One camera stream is kept for a whole batch of books,
// because iPhones may ask for camera permission again each time a new one
// is opened (HOW_IT_WORKS.md, photo round 3).

import { isBookBarcode } from '../core/entry.js';

const DECODER_FOLDER = new URL('../vendor/zxing-wasm/', import.meta.url);
const EVERY = 150; // milliseconds between attempts to read a frame
const SAME_CODE_PAUSE = 2500; // ignore the same barcode for this long, so one book is not read twice

// The browser's own detector where it reads EAN-13 (Android Chrome);
// otherwise the bundled decoder (iPhone Safari, Firefox).
// Feature check: BarcodeDetector is not "Baseline widely available".
async function chooseDecoder() {
  if ('BarcodeDetector' in globalThis) {
    try {
      if ((await BarcodeDetector.getSupportedFormats()).includes('ean_13')) {
        const detector = new BarcodeDetector({ formats: ['ean_13'] });
        return { name: 'the browser\'s own detector', read: async canvas => ((await detector.detect(canvas))[0] || {}).rawValue || null };
      }
    } catch {
      // The detector exists but cannot be used; the bundled decoder follows.
    }
  }
  await loadBundledDecoder();
  return {
    name: 'the bundled decoder',
    async read(canvas) {
      const image = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
      const found = await globalThis.ZXingWASM.readBarcodes(image, { formats: ['EAN13'], tryHarder: true, maxNumberOfSymbols: 1 });
      return found.length && found[0].isValid ? found[0].text : null;
    },
  };
}

function loadBundledDecoder() {
  if (globalThis.ZXingWASM) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('zxing-reader.js', DECODER_FOLDER).href;
    script.onload = async () => {
      // Always use our own copy of the decoder's .wasm file, never a CDN (vendor/README.md).
      await globalThis.ZXingWASM.prepareZXingModule({
        overrides: { locateFile: path => new URL(path, DECODER_FOLDER).href },
        fireImmediately: true,
      });
      resolve();
    };
    script.onerror = () => reject(new Error('The barcode reader could not be loaded. Check the connection once; after that it works offline.'));
    document.head.append(script);
  });
}

/**
 * Tell the person a barcode was read: a short soft beep (if sound is on) and
 * a buzz where the phone allows it (Android; iPhones do not let web apps vibrate).
 */
function signalRead(audio) {
  if (navigator.vibrate) navigator.vibrate(60);
  if (!audio) return;
  audio.resume();
  const tone = audio.createOscillator();
  const volume = audio.createGain();
  tone.frequency.value = 880; // a soft, high "beep"
  volume.gain.setValueAtTime(0.12, audio.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15);
  tone.connect(volume).connect(audio.destination);
  tone.start();
  tone.stop(audio.currentTime + 0.15);
}

/** Plain words for the browser's camera errors. */
function cameraError(error) {
  if (error.name === 'NotAllowedError') return new Error('The camera is not allowed for this app. Allow it in the browser\'s site settings, or type the ISBN instead.');
  if (error.name === 'NotFoundError') return new Error('No camera was found. Type the ISBN, or use a USB barcode scanner.');
  return new Error(`The camera could not start (${error.name}). Type the ISBN instead.`);
}

/**
 * Start scanning into a <video> element.
 * @param {HTMLVideoElement} video
 * @param {(isbn: string) => void} onIsbn called with each new book ISBN read
 * @param {{ sound?: boolean }} [options] sound: a short beep on each read (a device setting)
 * @returns {Promise<{ decoderName: string, hasLight: boolean, setLight: (on: boolean) => Promise<void>, pause: () => void, resume: () => void, stop: () => void }>}
 */
export async function startScanner(video, onIsbn, { sound = true } = {}) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('This browser cannot use the camera here. Type the ISBN instead.');
  }
  // The beep's sound player is made now, while the person's tap on "Scan" is
  // still fresh: phones only allow sound that starts from a tap.
  const audio = sound && 'AudioContext' in globalThis ? new AudioContext() : null;
  const decoder = await chooseDecoder();
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
    });
  } catch (error) {
    throw cameraError(error);
  }
  const track = stream.getVideoTracks()[0];
  // Continuous focus, where the camera offers it, makes the first read much faster.
  // Feature check: getCapabilities is missing in Firefox.
  if (track.getCapabilities && (track.getCapabilities().focusMode || []).includes('continuous')) {
    track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
  }
  // The camera's light, for dim rooms: Chrome on Android, and Safari on iPhones
  // since iOS 17.4 (WebKit added the "torch" setting in October 2023;
  // docs/decisions/photos-and-scanning.md). Feature check: "torch" is not
  // Baseline, so the Light button shows only where the camera or the browser
  // says it has one; elsewhere nothing changes. A browser that knows "torch"
  // but whose camera has none (a laptop) shows the button, and setLight then fails.
  const capabilities = track.getCapabilities ? track.getCapabilities() : {};
  const supported = navigator.mediaDevices.getSupportedConstraints ? navigator.mediaDevices.getSupportedConstraints() : {};
  const hasLight = Boolean(capabilities.torch || supported.torch);
  video.srcObject = stream;
  video.setAttribute('playsinline', '');
  video.muted = true;
  await video.play();

  // Only the middle band of the picture is read, where the barcode is held.
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  let paused = false;
  let busy = false;
  let last = { code: '', at: 0 };
  const timer = setInterval(async () => {
    if (paused || busy || video.readyState < 2) return;
    busy = true;
    try {
      const width = video.videoWidth;
      const band = Math.round(video.videoHeight * 0.4);
      const scale = Math.min(1, 1280 / width);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(band * scale);
      context.drawImage(video, 0, (video.videoHeight - band) / 2, width, band, 0, 0, canvas.width, canvas.height);
      const code = await decoder.read(canvas);
      const now = Date.now();
      if (code && isBookBarcode(code) && !(code === last.code && now - last.at < SAME_CODE_PAUSE)) {
        last = { code, at: now };
        signalRead(audio);
        onIsbn(code);
      }
    } catch {
      // One unreadable frame is normal; the next attempt follows in a moment.
    }
    busy = false;
  }, EVERY);

  return {
    decoderName: decoder.name,
    hasLight,
    // Rejects when this camera has no light after all (some iPads, a front camera).
    setLight(on) { return track.applyConstraints({ advanced: [{ torch: on }] }); },
    pause() { paused = true; },
    resume() { paused = false; },
    stop() {
      clearInterval(timer);
      if (audio) audio.close();
      stream.getTracks().forEach(part => part.stop());
      video.srcObject = null;
    },
  };
}
