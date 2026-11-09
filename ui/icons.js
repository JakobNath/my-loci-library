// The app's few icons and its logo, as inline SVG drawn with currentColor,
// so they take the color of the text around them.

const PATHS = {
  library: '<path d="M4 5h4v14H4zM10 5h4v14h-4zM16 6l3.5-1 2.5 13.5-3.5 1z"/>',
  wishlist: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  add: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  grid: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  list: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  shelf: '<path d="M5 4v15M8 6v13M11 4v15M15 7l3 12M3 20h18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
};

/** An icon by name, as SVG markup. */
export function iconHtml(name) {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
}

// The ex libris mark (docs/plan/DESIGN.md, "Logo and icon"): the book and
// the L in currentColor, the lines of text in honey.
export const LOGO_HTML = `<svg viewBox="0 0 48 48" aria-hidden="true">
  <path d="M3.5 12.5c7-3 14-3 20.5 1.2 6.5-4.2 13.5-4.2 20.5-1.2v25c-7-3-14-3-20.5 1.2-6.5-4.2-13.5-4.2-20.5-1.2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  <path d="M24 13.7v25" stroke="currentColor" stroke-width="1.4"/>
  <path d="M16 12H25V13.2L22.6 13.8V34H29.5L32 29.5H33.2L32.4 36H16V34.8L18.4 34.2V13.8L16 13.2Z" fill="currentColor" transform="translate(13.8 25.6) scale(0.52) translate(-24.6 -24)"/>
  <path d="M28.5 19.5h11M28.5 23.5h11M28.5 27.5h11M28.5 31.5h7.5" stroke="var(--logo-pop)" stroke-width="1.3" stroke-linecap="round"/>
</svg>`;
