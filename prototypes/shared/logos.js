// Three logo and app-icon ideas for My Loci Library.
// Each mark is drawn on a 48 by 48 grid with `currentColor` for the main
// strokes and `var(--logo-pop)` for the single touch of color, so it follows
// whatever page it sits on. Each icon is the same mark on a rounded square.

const pop = 'var(--logo-pop, #d4572a)';

export const logos = [
  {
    name: 'Place in a book',
    idea: 'An open book with a map pin: "loci" are places, and every book has its place.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M5 32c6-3 13-3 19 1 6-4 13-4 19-1v10c-6-3-13-3-19 1-6-4-13-4-19-1z"/>
      <path d="M24 33v10"/>
      <path d="M24 29c-5-6-8-9.5-8-14a8 8 0 0 1 16 0c0 4.5-3 8-8 14z" fill="${pop}" stroke="${pop}"/>
      <circle cx="24" cy="15" r="3" fill="var(--logo-bg, #fff)" stroke="none"/>
    </svg>`,
  },
  {
    name: 'Memory palace',
    idea: 'An arched doorway holding three books, after the method of loci, one spine in color.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M8 43V21a16 16 0 0 1 32 0v22"/>
      <path d="M4 43h40"/>
      <rect x="15" y="22" width="5" height="21" rx="1" fill="currentColor"/>
      <rect x="22" y="18" width="5" height="25" rx="1" fill="${pop}" stroke="${pop}"/>
      <path d="M30 43l3.5-19 4.8 1-3.5 18" fill="currentColor"/>
    </svg>`,
  },
  {
    name: 'Shelf L',
    idea: 'One standing book and one lying flat make an L, with a ribbon marker for the pop.',
    mark: `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round">
      <rect x="11" y="5" width="11" height="30" rx="1.5" fill="currentColor"/>
      <rect x="11" y="35" width="28" height="8" rx="1.5"/>
      <path d="M16 5v13l2.5-2.5L21 18V5" fill="${pop}" stroke="${pop}" stroke-width="1.5"/>
      <path d="M15 39h20" stroke-width="1.5"/>
    </svg>`,
  },
];
