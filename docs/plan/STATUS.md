# Status

Where the project stands and what comes next. Read this first in any working session; update it at the end of each one. `PLAN.md` is the design and stays the source of truth; this file only says where things are. Last brought up to date on 10 November 2026 (app version 1.1.5).

## Where things stand

Every build phase is done, from 1 to 14 (`docs/plan/archive/BUILD_PLAN_phases_1-14.md`). The one build step left is the shelf view review (13.0), which needs real books on a shelf. The app, the laptop tools and the Zotero companion have been tried live:

- **Sync** works on Jakob's laptop and phone, each with its own key, against the test catalog (`my-loci-library-test-data`). The real catalog (`my-loci-library-data`) is still empty and untouched.
- **Logos**: an export of 53 resources imported cleanly in a trial on a copy of the test data.
- **Zotero**: four trials into "Loci test" found and fixed eight citation problems; Chicago notes copied from Zotero now read correctly.
- **Book search** (Wishlist and Add) shows specific editions with English titles, publishers and covers, and finds books by publisher or series.
- **Phase 14** (better book data from the Library of Congress, Open Library and Google Books; data format version 2) is built, tested on the test catalog, and checked on the phones.
- **Version 1.1.1**: a device already connected to one data repository and connected to another now checks the new one, asks, and empties its own copy first (keeping its keys), so no sample book can reach the real catalog (`docs/decisions/sync.md`). **1.1.2** names the problem when the key is the old one or does not open the new repository, and Settings shows the catalog's name. **1.1.3** lays out Sync as three numbered steps (which catalog, make a key for it, paste and connect). **1.1.4** uses one key for all devices, without an expiry date, and a "Share setup link" button: only the first device is set up by hand, the others open the link.

All tests pass: 137 in the app (and 122 on the self-test page), 145 in the tools.

## Waiting on Jakob

Moved from `FOR_JAKOB.md` on 10 November 2026. In order.

**Phase 14 on the phones**

- [x] **Update each phone to 1.1.0.** Open the app; when "New version · Reload" appears at the bottom, tap it (or close and reopen the app). Settings shows the version at the bottom. A phone still on 1.0.5 will say the catalog is in a newer format and wait, without changing anything, until it is reloaded.
- [x] **Put the Google Books key on each phone** (once it has 1.1.0; one key serves every device). On the laptop, copy the key from the tools' `config.json` and send it to yourself in a way you trust. On each phone: Settings › Advanced, paste it into **Google Books key** under "This device", then tap **Test the key**; it should say "The key works", and otherwise says what to change.
- [x] **Try the phone checks** for phase 14 in `DEVICE_CHECKS.md` (scan *Mere Christianity* or another book with a table of contents; scan a Bible; test the key).

**1. Tour the app and note what needs work** (30 to 45 minutes, on the phone)

- [x] Add 5 to 10 real books, including one with no cover online, an old book without a barcode, and a translation (to try the original-date suggestions). Photos open the phone's own camera: use its flash button if the light is poor.
- [x] Open each book's page: the cover beside the title, tap the cover for the full-size view, tap the shelf link.
- [x] Library: try Filter (by location, and "Needs an original date"), save a view, change the sort.
- [x] Shelf view: open the shelf just filled.
- [x] Wishlist: add a book by title, and one by pasting an Amazon link.
- [x] Settings: is the main page simple enough for Jakob's wife? Look at Value, Export and Trash.
- [x] Search (the bar at the top): an author, a word from the notes, a Greek word.
- [x] Offline: airplane mode on, keep using it, then reconnect and watch the unsent badge clear.
- [x] Send the notes, screen by screen, in any form; they are fixed in order of importance. (10 November 2026: nothing to fix for now.)

**2. Get ready for the real catalog** (one sitting, after the tour fixes)

- [x] Two-device check: edit one book's notes on the phone and another field on the laptop, both offline; reconnect both; the book should have both changes (`DEVICE_CHECKS.md`, Phase 7).
- [ ] Daily backup: install Google Drive for desktop, then set up and schedule `loci-backup` (the tools README, "Setting up on a laptop" and "Running it every day").
- [ ] Jakob's wife: show her the app, and send her phone the setup link (Settings › Advanced › Sync › "Share setup link" on Jakob's phone, once it is on the real catalog).
- [ ] Clear the Zotero trial: in Zotero, select everything in "Loci test", move it to the trash, empty the trash, and delete the collection.

**3. Start cataloging for real** (walked through together)

- [ ] (11 November 2026: Jakob's phone is switched, with one key that never expires; the real catalog on GitHub still holds no sample books. Left: the laptop browser and his wife's phone, by setup link.) Switch each device to `my-loci-library-data` (the app's README, "Starting to catalog for real"): reload to 1.1.4; on Jakob's phone follow the three steps in Settings › Advanced › Sync (one key, no expiry), then "Share setup link" to the laptop browser and his wife's phone; the app asks, then empties the device of the test catalog. This is also the device check "Moving to the real catalog" in `DEVICE_CHECKS.md`. The books added during the tour stay in the test catalog and are scanned again into the real one.
- [x] Point the laptop tools at the real catalog: change `dataRepo` in the tools' `config.json`. (Done 10 November 2026.)
- [ ] Import the whole Logos library: a full, unfiltered export, run with `--full`.
- [ ] First real Zotero run: `loci-zotero.cmd` with no `--collection`. It sends into "My Loci Library" and, on that first run only, links books already in Zotero, keeping a copy of each before changing it.
- [ ] Shelve and scan, one bookcase at a time. For the Book of Concord and similar collections, give each work its traditional author where there is one (Melanchthon for the Augsburg Confession and the Apology, Luther for the Smalcald Articles and the catechisms).

**4. Shelf view review** (build step 13.0)

- [ ] Once a few dozen real books are on a shelf, go through the shelf view at the bookcase: can a book be found from the screen, do the sizes and drawn spines look like the real shelf, is the way there quick enough.

## Next tasks for a working session

Each is sized for one session. Take the first one that is not waiting on Jakob.

1. Help Jakob with the daily backup and the switch to the real catalog (sections 2 and 3 above). The tools already point at it.
2. Build step 13.0 changes, after his shelf view review.
3. Phase 15 (later, only when Jakob asks): the price estimator, and recognising a book from a photo of its title page.

## Open questions for Jakob

- **Settings › Value** shows totals by room (the first two parts of a location, Home › Office). Totals by bookcase or by shelf instead?
- **Uncertain original dates** ("c. 110"): Zotero has no field for "circa". Leave as is, or mark them somehow?
- **Anonymous pieces in Zotero**: Zotero's Chicago style puts the editor first for them; for now they are corrected by hand when citing.
- **A light for the barcode scanner** works only in Chrome on Android, which the plan rules out. Parked unless Jakob wants it as a recorded exception.

## Decisions to look over

Choices made without Jakob, each with its reason in `docs/decisions/`:

- Sync now uses one key for all our devices, without an expiry date, passed between devices by a setup link (Jakob's request; PLAN.md "Sync" changed to match).
- Citation keys follow his Better BibTeX pattern (`Augustine1991`, with a, b, c for repeats). Keys already pinned in Zotero are kept.
- Zotero fields hold only bibliographic data; the Loci link, with the shelf in its title, is attached under each book. Bibles are sent as one book, without sections.
- Zotero is reached through its web API, because Zotero 7's local connection cannot write.
- Version numbers: 1.0.0 as tagged; fixes 1.0.1 to 1.0.5; phase 14 is 1.1.0.
- Book data: places keep their state as the Library of Congress gives it; an associate editor has the role "other"; `loci-enrich` asks about each book again every 90 days.
- The yearly archive reminder appears in Settings and, at most once a week, when the app opens, starting a year after the first laptop backup.
