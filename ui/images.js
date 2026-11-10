// Filling in cover pictures after a screen is drawn: each <img data-image>
// gets its picture from this device's storage, through main.js. Drawing
// never waits for pictures; they appear as they load.

/**
 * @param {HTMLElement} root
 * @param {(key: string) => Promise<string|null>} imageUrl from main.js actions
 */
export function fillImages(root, imageUrl) {
  for (const img of root.querySelectorAll('img[data-image]:not([src])')) {
    imageUrl(img.dataset.image).then(url => {
      if (url) img.src = url;
      else img.remove(); // not on this device yet: the cover's color stays
    });
  }
}
