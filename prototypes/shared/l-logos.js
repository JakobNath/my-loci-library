// Round 3 logo ideas: ten "L" marks in three moods (modern, cute, classic).
// Each is drawn on a 48 by 48 grid. `currentColor` is the main color,
// `var(--logo-pop)` the single touch of color, and `var(--logo-bg)` the
// background, used where a shape is cut out of another.

const pop = 'var(--logo-pop, #a65a3f)';
const bg = 'var(--logo-bg, #fff)';
const serifL = 'M16 12H25V13.2L22.6 13.8V34H29.5L32 29.5H33.2L32.4 36H16V34.8L18.4 34.2V13.8L16 13.2Z';

// The serif capital L, moved so its middle sits at (x, y) and scaled by s.
const L = (x, y, s, fill = 'currentColor') =>
  `<path d="${serifL}" fill="${fill}" transform="translate(${x} ${y}) scale(${s}) translate(-24.6 -24)"/>`;

// A laurel branch: small leaves along a curve, mirrored for the other side.
function laurel(side) {
  const out = [];
  const p0 = [13, 9], p1 = [5, 30], p2 = [22, 43];
  for (let i = 1; i <= 8; i++) {
    const t = i / 9;
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const a = Math.atan2(dy, dx) * 180 / Math.PI;
    for (const off of [-38, 38]) {
      out.push(`<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="2.7" ry="1.15" transform="rotate(${(a + off).toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)}) translate(2.2 0)" fill="${pop}"/>`);
    }
  }
  const g = `<path d="M13 9Q5 30 22 43" fill="none" stroke="currentColor" stroke-width="1.2"/>${out.join('')}`;
  return side === 'left' ? g : `<g transform="translate(48 0) scale(-1 1)">${g}</g>`;
}

// A ring of small beads, for the seal.
const beads = Array.from({ length: 30 }, (_, i) => {
  const a = (i / 30) * Math.PI * 2;
  return `<circle cx="${(24 + 18.2 * Math.cos(a)).toFixed(2)}" cy="${(24 + 18.2 * Math.sin(a)).toFixed(2)}" r="0.95" fill="currentColor"/>`;
}).join('');

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

  // Round 4: more classic marks.
  {
    id: 'cartouche', mood: 'Classic', round: 4, name: 'Oval cartouche',
    idea: 'The capital L inside a tall double oval, like the frame of an old portrait or seal.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <ellipse cx="24" cy="24" rx="17" ry="21.5" fill="none" stroke="currentColor" stroke-width="2"/>
      <ellipse cx="24" cy="24" rx="13.8" ry="18.2" fill="none" stroke="${pop}" stroke-width="1"/>
      ${L(24, 24, 0.82)}
    </svg>`,
  },
  {
    id: 'laurel', mood: 'Classic', round: 4, name: 'Laurel',
    idea: 'The capital L between two laurel branches, the old sign of learning, with the leaves in the accent color.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      ${laurel('left')}${laurel('right')}
      ${L(24, 23, 0.72)}
    </svg>`,
  },
  {
    id: 'seal', mood: 'Classic', round: 4, name: 'Beaded seal',
    idea: 'A round seal with a ring of beads, like a wax or embossing seal on a bookplate.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-width="1.6"/>
      ${beads}
      <circle cx="24" cy="24" r="15.4" fill="none" stroke="${pop}" stroke-width="1"/>
      ${L(24, 24, 0.66)}
    </svg>`,
  },
  {
    id: 'arch', mood: 'Classic', round: 4, name: 'Library arch',
    idea: 'The L standing in a round-topped doorway with a keystone: the "memory palace" of the method of loci.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M9.5 43V22a14.5 14.5 0 0 1 29 0v21" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M13 43V22.4a11 11 0 0 1 22 0V43" fill="none" stroke="${pop}" stroke-width="1"/>
      <path d="M21.4 5.6h5.2l-1 4.6h-3.2z" fill="currentColor"/>
      <path d="M5 43.5h38" stroke="currentColor" stroke-width="2"/>
      ${L(24, 30.5, 0.6)}
    </svg>`,
  },
  {
    id: 'drop-cap', mood: 'Classic', round: 4, name: 'Illuminated initial',
    idea: 'A solid square with the L knocked out and a small vine, like the decorated first letter of a chapter.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="5" y="5" width="38" height="38" rx="2" fill="currentColor"/>
      <rect x="8.5" y="8.5" width="31" height="31" rx="1" fill="none" stroke="${pop}" stroke-width="1"/>
      ${L(22.5, 25, 0.84, bg)}
      <path d="M36 12c-3.6.6-5.6 3.4-4.8 6.4.6 2.2 3.4 2.1 3.6-.1" fill="none" stroke="${pop}" stroke-width="1.2" stroke-linecap="round"/>
      <ellipse cx="30.4" cy="13.6" rx="2" ry="1" transform="rotate(-35 30.4 13.6)" fill="${pop}"/>
      <ellipse cx="35.4" cy="21.6" rx="1.8" ry=".9" transform="rotate(30 35.4 21.6)" fill="${pop}"/>
    </svg>`,
  },
  {
    id: 'lozenge', mood: 'Classic', round: 4, name: 'Lozenge',
    idea: 'The L in a double diamond, a shape often stamped on old book spines and bindings.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 2.5 45.5 24 24 45.5 2.5 24z" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M24 7.5 40.5 24 24 40.5 7.5 24z" fill="none" stroke="${pop}" stroke-width="1"/>
      ${L(24, 24, 0.6)}
    </svg>`,
  },
  {
    id: 'frontispiece', mood: 'Classic', round: 4, name: 'Title page',
    idea: 'A ruled double frame with small diamond corners, like the border of an old title page.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="6" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <rect x="9.5" y="9.5" width="29" height="29" fill="none" stroke="currentColor" stroke-width=".8"/>
      ${[[6, 6], [42, 6], [6, 42], [42, 42]].map(([x, y]) => `<path d="M${x} ${y - 3.2}l3.2 3.2-3.2 3.2-3.2-3.2z" fill="${pop}"/>`).join('')}
      ${L(24, 24, 0.78)}
    </svg>`,
  },
  {
    id: 'shield', mood: 'Classic', round: 4, name: 'Shield',
    idea: 'A simple crest: the L on a double-lined shield, like an old college or library emblem.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 5h32v17c0 11-7 18-16 22C15 40 8 33 8 22z" fill="none" stroke="currentColor" stroke-width="2"/>
      <path d="M11.5 8.5h25V22c0 9-5.5 15-12.5 18.5C17 37 11.5 31 11.5 22z" fill="none" stroke="${pop}" stroke-width="1"/>
      ${L(24, 22.5, 0.66)}
    </svg>`,
  },
  {
    id: 'open-book', mood: 'Classic', round: 4, name: 'Ex libris book',
    idea: 'An open book with the L on the left page and lines of text on the right, the classic "from the library of" picture.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M3.5 12.5c7-3 14-3 20.5 1.2 6.5-4.2 13.5-4.2 20.5-1.2v25c-7-3-14-3-20.5 1.2-6.5-4.2-13.5-4.2-20.5-1.2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      <path d="M24 13.7v25" stroke="currentColor" stroke-width="1.4"/>
      ${L(13.8, 25.6, 0.52)}
      <path d="M28.5 19.5h11M28.5 23.5h11M28.5 27.5h11M28.5 31.5h7.5" stroke="${pop}" stroke-width="1.3" stroke-linecap="round"/>
    </svg>`,
  },
];
