# Design

The look of My Loci Library, chosen by Jakob Nath and his wife on 9 November 2026 after four rounds of prototypes. Every value below lives in `styles/tokens.css`; change it there and nowhere else. A clickable prototype of the design, with the sample books, is in `prototypes/design/`.

## Direction

A warm, quiet bookshop: forest green and a touch of honey on ivory paper, with the book covers carrying most of the color. Modern and plain in its structure (system fonts, generous covers, rounded shapes, no decoration that does not do a job), but bookish in its titles and its logo. Her requests from the start were that it look nice, show the photos well, and have "just a little pop" of color; the honey is that pop.

How it was reached: round 1 had five different directions; the card catalog and the warm bookshop were the favorites but felt too digital in color. Round 2 refined those two in quieter colors; the refined bookshop (option 7) was her favorite. Round 3 turned option 7 into a playground with live settings, and the settings below are the ones she chose. Round 4 added more classic logos, and the ex libris book was chosen. The earlier rounds are in the Git history of `my-loci-library` (before the commit "Lock the chosen design").

## Choices

| Setting | Choice |
| --- | --- |
| Main color | Forest green |
| Accent ("pop") | Honey |
| Paper | Ivory |
| Titles | Book serif |
| Shelves under the covers | None |
| Cover size | Large |
| Cover shadow | Soft |
| Corners | Round |
| Spacing | Cozy |
| Top bar | Green (colored) |
| Menu on wide screens | At the side |
| Logo | Ex libris book |

## Colors

Each mode uses two greens: **accent** fills things (top bar, buttons, selected chips) and **accent ink** colors green text and icons. In light mode they are the same; in dark mode the fill is a deep forest green and the text green is lighter, so both stay readable. Every text color meets a contrast ratio of at least 4.5:1 against the background it sits on.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--bg` | `#f6f2ea` ivory | `#111411` green-black | Page background |
| `--surface` | `#fdfbf7` | `#191d19` | Cards, search field, bottom bar |
| `--surface-2` | `#efe9de` | `#222722` | Quiet fills |
| `--line` | `#e4ddd0` | `#2d332d` | Hairlines and borders |
| `--ink` | `#23201b` | `#ece8df` | Main text |
| `--ink-2` | `#4b453c` | `#c9c3b6` | Secondary text |
| `--muted` | `#6e665a` | `#9b9588` | Labels, small print |
| `--accent` | `#2e4a3d` forest | `#2d5240` deep forest | Buttons, selected chips |
| `--accent-ink` | `#2e4a3d` | `#8fbf9f` | Green text and icons |
| `--bar-bg` | `#2e4a3d` | `#1d3a2b` | Top bar |
| `--pop` | `#b0843a` honey | `#d4ad62` | Small accents, rules, focus ring |
| `--pop-ink` | `#84601f` | `#d9b36a` | Honey text (dates, prices) |
| `--logo-pop` | `#dcb76f` | `#d4ad62` | The lines of text in the logo, on the green bar |

## Type

- Titles, book titles and notes: a book serif from the device ("Iowan Old Style" on Apple devices, "Palatino Linotype" on Windows, then Palatino, Book Antiqua, Georgia).
- Everything else: the device's own sans serif (`system-ui`).
- No font files are downloaded. Because of that, titles look slightly different on an iPhone and on Windows. If that ever matters, the plan allows one self-hosted typeface; it would be added in `styles/` and named first in `--font-display`.
- Sizes: body 15 px, small 13 px, page titles 26 px on phones and 34 px on wide screens, book titles 30 px on the book page.

## Spacing and shape

- Spacing steps: 4, 8, 10, 16, 24 and 48 px ("cozy").
- Cover grid: covers at least 150 px wide on phones (two across) and 200 px on wide screens, with 14 px between columns and 22 px between rows.
- Corners: 12 px on small elements, 18 px on cards, fully round on buttons and chips. Covers have 4 px corners on the spine side and 9 px on the open side, so they read as books.
- Cover shadows are soft and lie down and to the right, as if lit from the top left.

## Logo and icon

- The mark: an open book with a capital L on the left page and four lines of text on the right, after the old "ex libris" bookplates. The book and the L are drawn in the main color; the lines of text are honey.
- `app/icons/logo.svg`: the mark on a clear background, in forest and honey.
- `app/icons/icon.svg`: the home-screen icon, the mark in ivory and honey on a forest-green rounded square.
- In the app's top bar the mark is drawn in ivory with honey lines, from `prototypes/shared/logo.js` for now.
- iPhones need PNG copies of the icon for the home screen; these are made from `icon.svg` in phase 5.

## Light and dark

Both modes follow the device by default. The settings page (phase 8) offers "follow device", "light" and "dark", which set `data-theme` on the page; `styles/tokens.css` already handles all three.
