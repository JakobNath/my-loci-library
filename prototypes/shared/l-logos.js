// Round 3 logo ideas: ten "L" marks in three moods (modern, cute, classic).
// Each is drawn on a 48 by 48 grid. `currentColor` is the main color,
// `var(--logo-pop)` the single touch of color, and `var(--logo-bg)` the
// background, used where a shape is cut out of another.

const pop = 'var(--logo-pop, #a65a3f)';
const bg = 'var(--logo-bg, #fff)';
const serifL = 'M16 12H25V13.2L22.6 13.8V34H29.5L32 29.5H33.2L32.4 36H16V34.8L18.4 34.2V13.8L16 13.2Z';

export const lLogos = [
  {
    id: 'two-books', mood: 'Modern', name: 'Two books',
    idea: 'One book standing, one lying flat, with a thin ribbon. Clean and quiet.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="12" y="6" width="9.5" height="30" rx="1.5" fill="currentColor"/>
      <rect x="12" y="38" width="25" height="5.5" rx="1.5" fill="currentColor"/>
      <path d="M15 6h3.4v12.5l-1.7-1.8-1.7 1.8z" fill="${pop}"/>
    </svg>`,
  },
  {
    id: 'line-place', mood: 'Modern', name: 'Line and place',
    idea: 'A single-stroke L with a dot for "the place": loci means places.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M15 7v32h22" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="31" cy="15" r="4.5" fill="${pop}"/>
    </svg>`,
  },
  {
    id: 'cut-out', mood: 'Modern', name: 'Cut-out',
    idea: 'An L cut out of a solid tile. Made for a home-screen icon.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill-rule="evenodd" fill="currentColor" d="M11 4h26a7 7 0 0 1 7 7v26a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7zM17 11v26h16v-5.5H22.5V11z"/>
      <circle cx="32" cy="16" r="3.5" fill="${pop}"/>
    </svg>`,
  },
  {
    id: 'spine', mood: 'Modern', name: 'Spine',
    idea: 'A book seen from the spine, with the L pressed into it like a stamp.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="13" y="4" width="22" height="40" rx="2.5" fill="currentColor"/>
      <rect x="13" y="8.5" width="22" height="2.2" fill="${pop}"/>
      <rect x="13" y="37.3" width="22" height="2.2" fill="${pop}"/>
      <path d="M20 15v17h9" fill="none" stroke="${bg}" stroke-width="3.4" stroke-linecap="square"/>
    </svg>`,
  },
  {
    id: 'sprout', mood: 'Cute', name: 'Sprout',
    idea: 'A soft, rounded L with two little leaves growing from the top. Fits a green bookshop.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M16 19v20h20" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 18c-6 0-9.5-4.5-9-9.5 5 0 9 3.5 9 9.5z" fill="${pop}"/>
      <path d="M16 16c.5-6.5 5-10 10.5-10-.3 6-4.5 10-10.5 10z" fill="${pop}"/>
    </svg>`,
  },
  {
    id: 'heart', mood: 'Cute', name: 'Heart bookmark',
    idea: 'A chunky rounded L with a small heart tucked in the corner.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M11 9a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v22h12a5 5 0 0 1 5 5v3a5 5 0 0 1-5 5H16a5 5 0 0 1-5-5z" fill="currentColor"/>
      <path d="M33 27c-6-3.6-7-7.6-4.6-9.3 1.9-1.3 3.7-.4 4.6 1.2.9-1.6 2.7-2.5 4.6-1.2 2.4 1.7 1.4 5.7-4.6 9.3z" fill="${pop}"/>
    </svg>`,
  },
  {
    id: 'buddy', mood: 'Cute', name: 'Book buddy',
    idea: 'The same rounded L as a happy little book. The most playful of the set.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M10 9a5 5 0 0 1 5-5h5a5 5 0 0 1 5 5v22h12a5 5 0 0 1 5 5v3a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5z" fill="currentColor"/>
      <circle cx="15" cy="16" r="1.8" fill="${bg}"/><circle cx="20.5" cy="16" r="1.8" fill="${bg}"/>
      <path d="M14.8 21q3 3 5.9 0" fill="none" stroke="${bg}" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="13" cy="20.5" r="1.5" fill="${pop}"/><circle cx="22.5" cy="20.5" r="1.5" fill="${pop}"/>
    </svg>`,
  },
  {
    id: 'stack', mood: 'Cute', name: 'Little stack',
    idea: 'Three rounded books stacked into an L, one in color.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="10" y="6" width="10" height="30" rx="3.5" fill="currentColor"/>
      <rect x="10" y="37.5" width="29" height="6.5" rx="3.2" fill="currentColor"/>
      <rect x="22" y="30" width="15" height="6.5" rx="3.2" fill="${pop}"/>
      <path d="M13.5 11h3M13.5 31h3" stroke="${bg}" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'roundel', mood: 'Classic', name: 'Serif in a ring',
    idea: 'A book-face capital L inside a double ring, like a library stamp.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" stroke-width="2.2"/>
      <circle cx="24" cy="24" r="17.6" fill="none" stroke="${pop}" stroke-width="1"/>
      <path d="${serifL}" fill="currentColor"/>
    </svg>`,
  },
  {
    id: 'bookplate', mood: 'Classic', name: 'Bookplate',
    idea: 'The capital L framed like an old ex libris label inside a cover.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M9 4h30v4a3 3 0 0 0 3 3v26a3 3 0 0 0-3 3v4H9v-4a3 3 0 0 0-3-3V11a3 3 0 0 0 3-3z" fill="none" stroke="currentColor" stroke-width="2"/>
      <rect x="11" y="9" width="26" height="30" fill="none" stroke="${pop}" stroke-width="1"/>
      <path d="${serifL}" fill="currentColor"/>
    </svg>`,
  },
];
