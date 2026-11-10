// Settings that belong to this device only (PLAN.md, "Settings", "This
// device"): theme, how the library is shown, and later the sync key. Kept in
// localStorage, which holds nothing that cannot be set again by hand.

const KEY = 'my-loci-library-device';

export const DEVICE_DEFAULTS = {
  theme: 'device', // device, light or dark
  view: 'grid', // grid or list
  coverSize: 'medium', // small, medium or large
  showLogos: false, // Logos books in the main Library view
  sort: 'title',
  scanSound: true, // a beep when a barcode is read
};

/** This device's settings, with defaults for anything never set. */
export function readDeviceSettings() {
  try {
    return { ...DEVICE_DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    // Private browsing or blocked storage: the defaults still work, they just are not remembered.
    return { ...DEVICE_DEFAULTS };
  }
}

/** Save this device's settings. Returns false if the browser would not store them. */
export function saveDeviceSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
