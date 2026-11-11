# Status

Where the project stands and what comes next. Read this first in any working session; update it at the end of each one. `PLAN.md` is the design and stays the source of truth; this file only says where things are. Last brought up to date on 10 November 2026 (app version 1.1.0).

## Where things stand

Every build phase is done, from 1 to 14 (`docs/plan/archive/BUILD_PLAN_phases_1-14.md`). The one build step left is the shelf view review (13.0), which needs real books on a shelf. The app, the laptop tools and the Zotero companion have been tried live:

- **Sync** works on Jakob's laptop and phone, each with its own key, against the test catalog (`my-loci-library-test-data`). The real catalog (`my-loci-library-data`) is still empty and untouched.
- **Logos**: an export of 53 resources imported cleanly in a trial on a copy of the test data.
- **Zotero**: four trials into "Loci test" found and fixed eight citation problems; Chicago notes copied from Zotero now read correctly.
- **Book search** (Wishlist and Add) shows specific editions with English titles, publishers and covers, and finds books by publisher or series.
- **Phase 14** (better book data from the Library of Congress, Open Library and Google Books; data format version 2) is built and tested on the test catalog.

All tests pass: 134 in the app (and 118 on the self-test page), 142 in the tools.

## Waiting on Jakob

Moved from `FOR_JAKOB.md` on 10 November 2026. In order.

**Phase 14 on the phones**

- [ ] **Update each phone to 1.1.0.** Open the app; when "New version · Reload" appears at the bottom, tap it (or close and reopen the app). Settings shows the version at the bottom. A phone still on 1.0.5 will say the catalog is in a newer format and wait, without changing anything, until it is reloaded.
- [ ] **Put the Google Books key on each phone** (once it has 1.1.0; one key serves every device). On the laptop, copy the key from the tools' `config.json` and send it to yourself in a way you trust. On each phone: Settings › Advanced, paste it into **Google Books key** under "This device", then tap **Test the key**; it should say "The key works", and otherwise says what to change.
- [ ] **Try the phone checks** for phase 14 in `DEVICE_CHECKS.md` (scan *Mere Christianity* or another book with a table of contents; scan a Bible; test the key).

**1. Tour the app and note what needs work** (30 to 45 minutes, on the phone)

- [ ] Add 5 to 10 real books, including one with no cover online, an old book without a barcode, and a translation (to try the original-date suggestions). Photos open the phone's own camera: use its flash button if the light is poor.
- [ ] Open each book's page: the cover beside the title, tap the cover for the full-size view, tap the shelf link.
- [ ] Library: try Filter (by location, and "Needs an original date"), save a view, change the sort.
- [ ] Shelf view: open the shelf just filled.
- [ ] Wishlist: add a book by title, and one by pasting an Amazon link.
- [ ] Settings: is the main page simple enough for Jakob's wife? Look at Value, Export and Trash.
- [ ] Search (the bar at the top): an author, a word from the notes, a Greek word.
- [ ] Offline: airplane mode on, keep using it, then reconnect and watch the unsent badge clear.
- [ ] Send the notes, screen by screen, in any form; they are fixed in order of importance.

**2. Get ready for the real catalog** (one sitting, after the tour fixes)

- [ ] Two-device check: edit one book's notes on the phone and another field on the laptop, both offline; reconnect both; the book should have both changes (`DEVICE_CHECKS.md`, Phase 7).
- [ ] Daily backup: install Google Drive for desktop, then set up and schedule `loci-backup` (the tools README, "Setting up on a laptop" and "Running it every day").
- [ ] Jakob's wife: show her the app, and add her phone with its own key (Settings › Advanced › Sync › "How to make a key").
- [ ] Clear the Zotero trial: in Zotero, select everything in "Loci test", move it to the trash, empty the trash, and delete the collection.

**3. Start cataloging for real** (walked through together)

- [ ] Switch each device to `my-loci-library-data` (the app's README, "Starting to catalog for real"): new keys for the real repository, and the sample books cleared from each device first.
- [ ] Point the laptop tools at the real catalog: change `dataRepo` in the tools' `config.json`.
- [ ] Import the whole Logos library: a full, unfiltered export, run with `--full`.
- [ ] First real Zotero run: `loci-zotero.cmd` with no `--collection`. It sends into "My Loci Library" and, on that first run only, links books already in Zotero, keeping a copy of each before changing it.
- [ ] Shelve and scan, one bookcase at a time. For the Book of Concord and similar collections, give each work its traditional author where there is one (Melanchthon for the Augsburg Confession and the Apology, Luther for the Smalcald Articles and the catechisms).

**4. Shelf view review** (build step 13.0)

- [ ] Once a few dozen real books are on a shelf, go through the shelf view at the bookcase: can a book be found from the screen, do the sizes and drawn spines look like the real shelf, is the way there quick enough.

## Next tasks for a working session

Each is sized for one session. Take the first one that is not waiting on Jakob.

1. Fix what Jakob's tour turns up (once he sends his notes).
2. Build step 13.0 changes, after his shelf view review.
3. Phase 15 (later, only when Jakob asks): the price estimator, and recognising a book from a photo of its title page.

## Open questions for Jakob

- **Settings › Value** shows totals by room (the first two parts of a location, Home › Office). Totals by bookcase or by shelf instead?
- **Uncertain original dates** ("c. 110"): Zotero has no field for "circa". Leave as is, or mark them somehow?
- **Anonymous pieces in Zotero**: Zotero's Chicago style puts the editor first for them; for now they are corrected by hand when citing.
- **A light for the barcode scanner** works only in Chrome on Android, which the plan rules out. Parked unless Jakob wants it as a recorded exception.

## Decisions to look over

Choices made without Jakob, each with its reason in `docs/decisions/`:

- Citation keys follow his Better BibTeX pattern (`Augustine1991`, with a, b, c for repeats). Keys already pinned in Zotero are kept.
- Zotero fields hold only bibliographic data; the Loci link, with the shelf in its title, is attached under each book. Bibles are sent as one book, without sections.
- Zotero is reached through its web API, because Zotero 7's local connection cannot write.
- Version numbers: 1.0.0 as tagged; fixes 1.0.1 to 1.0.5; phase 14 is 1.1.0.
- Book data: places keep their state as the Library of Congress gives it; an associate editor has the role "other"; `loci-enrich` asks about each book again every 90 days.
- The yearly archive reminder appears in Settings and, at most once a week, when the app opens, starting a year after the first laptop backup.
