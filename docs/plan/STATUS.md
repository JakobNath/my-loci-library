# Status

Where the project stands and what comes next. Read this first in any working session; update it at the end of each one. `PLAN.md` is the design and stays the source of truth; this file only says where things are. Last brought up to date on 11 November 2026 (app version 1.3.0).

## Where things stand

Every build phase is done, from 1 to 14 (`docs/plan/archive/BUILD_PLAN_phases_1-14.md`). The one build step left is the shelf view review (13.0), which needs real books on a shelf. The app, the laptop tools and the Zotero companion have been tried live:

- **Sync** works on Jakob's laptop and phone, each with its own key, against the test catalog (`my-loci-library-test-data`). The real catalog (`my-loci-library-data`) is still empty and untouched.
- **Logos**: an export of 53 resources imported cleanly in a trial on a copy of the test data.
- **Zotero**: four trials into "Loci test" found and fixed eight citation problems; Chicago notes copied from Zotero now read correctly.
- **Book search** (Wishlist and Add) shows specific editions with English titles, publishers and covers, and finds books by publisher or series.
- **Phase 14** (better book data from the Library of Congress, Open Library and Google Books; data format version 2) is built, tested on the test catalog, and checked on the phones.
- **Version 1.1.1**: a device already connected to one data repository and connected to another now checks the new one, asks, and empties its own copy first (keeping its keys), so no sample book can reach the real catalog (`docs/decisions/sync.md`). **1.1.2** names the problem when the key is the old one or does not open the new repository, and Settings shows the catalog's name. **1.1.3** lays out Sync as three numbered steps (which catalog, make a key for it, paste and connect). **1.1.4** uses one key for all devices, without an expiry date, and a "Share setup link" button: only the first device is set up by hand, the others open the link. **1.1.6** also takes a setup link pasted into step 3's key box, because an app on an iPhone's home screen keeps its data apart from Safari and cannot receive a tapped link.
- **Version 1.2.0** (second tour fixes, 11 November 2026): straight spine photos, steadier magnifiers and a preview in the photo editor; new Library controls; covers that keep their own shape; a tighter grid caption; wishlist covers in search; an "i" beside unclear fields and a guide in Settings ("How the catalog is organized").
- **Version 1.3.0** (second tour, part B: adding books, 11 November 2026). Adding asks what only a person knows: the original language and title, category and tags, the translation, and this copy (acquired, price, value, markings, notes). The laptop fills catalog facts, and "Needs details" (a Library filter, a line on the book page, a count in Settings) shows what is still empty. "Add a set of volumes" takes a set's facts once, then volumes scanned or pasted. "Arrange" in the shelf view moves a book along its shelf. The start-up code is 99.6 KB of 100 (407 bytes free), after moving the picture view's and filter panel's styles to `screens.css`.

All tests pass: 149 in the app (and 137 on the self-test page), 157 in the tools.

## Waiting on Jakob

Moved from `FOR_JAKOB.md` on 10 November 2026. In order.

**Phase 14 on the phones**

- [x] **Update each phone to 1.1.0.** Open the app; when "New version · Reload" appears at the bottom, tap it (or close and reopen the app). Settings shows the version at the bottom. A phone still on 1.0.5 will say the catalog is in a newer format and wait, without changing anything, until it is reloaded.
- [x] **Put the Google Books key on each phone** (once it has 1.1.0; one key serves every device). On the laptop, copy the key from the tools' `config.json` and send it to yourself in a way you trust. On each phone: Settings › Advanced, paste it into **Google Books key** under "This device", then tap **Test the key**; it should say "The key works", and otherwise says what to change.
- [x] **Try the phone checks** for phase 14 in `DEVICE_CHECKS.md` (scan *Mere Christianity* or another book with a table of contents; scan a Bible; test the key).

**1.3.0 on the phones**

- [ ] Reload each phone to 1.3.0 (Settings shows the version at the bottom), then try the four checks under "Adding books, second tour part B" in `DEVICE_CHECKS.md`: Arrange, a translated book, scanning a set, and pasting a set's volumes.

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
- [x] Daily backup: install Google Drive for desktop, then set up and schedule `loci-backup` (the tools README, "Setting up on a laptop" and "Running it every day"). (Done 11 November 2026: Drive mirrors My Drive to `C:\Users\Jakob\My Drive`; the backup goes to `My Drive\My Loci Library backup`; the Task Scheduler task "My Loci Library backup" runs daily at 12:30 and catches up a missed day. First run by hand and by the scheduler both succeeded.)
- [x] Jakob's wife: show her the app, and send her phone the setup link (Settings › Advanced › Sync › "Share setup link" on Jakob's phone, once it is on the real catalog). Her phone is an iPhone: add the app to the home screen first, then copy the link from the message (press and hold, Copy) and paste it into step 3 in the home-screen app (`DEVICE_CHECKS.md`, "Moving to the real catalog"). (Done 11 November 2026, on 1.1.6.)
- [ ] Clear the Zotero trial: in Zotero, select everything in "Loci test", move it to the trash, empty the trash, and delete the collection.

**3. Start cataloging for real** (walked through together)

- [x] (11 November 2026: all three devices are on the real catalog: Jakob's phone by hand, the laptop's Firefox and his wife's iPhone home-screen app by setup link. The real catalog holds only real books: 5 books and 2 wishlist items.) Switch each device to `my-loci-library-data` (the app's README, "Starting to catalog for real"): reload to 1.1.4; on Jakob's phone follow the three steps in Settings › Advanced › Sync (one key, no expiry), then "Share setup link" to the laptop browser and his wife's phone; the app asks, then empties the device of the test catalog. This is also the device check "Moving to the real catalog" in `DEVICE_CHECKS.md`. The books added during the tour stay in the test catalog and are scanned again into the real one.
- [x] Point the laptop tools at the real catalog: change `dataRepo` in the tools' `config.json`. (Done 10 November 2026.)
- [ ] Import the whole Logos library: a full, unfiltered export, run with `--full`.
- [ ] First real Zotero run: `loci-zotero.cmd` with no `--collection`. It sends into "My Loci Library" and, on that first run only, links books already in Zotero, keeping a copy of each before changing it.
- [ ] Shelve and scan, one bookcase at a time. For the Book of Concord and similar collections, give each work its traditional author where there is one (Melanchthon for the Augsburg Confession and the Apology, Luther for the Smalcald Articles and the catechisms).

**4. Shelf view review** (build step 13.0)

- [ ] Once a few dozen real books are on a shelf, go through the shelf view at the bookcase: can a book be found from the screen, do the sizes and drawn spines look like the real shelf, is the way there quick enough.

## Next tasks for a working session

Each is sized for one session. Take the first one that is not waiting on Jakob.

0. (Second tour, part B, adding books, is done and released as 1.3.0, 11 November 2026. Its phone checks are waiting on Jakob, above.)
0a. **Anthologies and fuller book data** (Jakob, 11 November 2026, while adding the Everyman Montaigne; to be planned before scanning many collections). Handoff, with the decisions Jakob needs to make: `handoffs/2026-11-11-anthologies-and-book-data.md`. Found:
   - Adding offers "Is this a collection?" only when a lookup lists contents. Otherwise the only way is Edit › "This book holds several works", which leaves the book's first work behind as an unused record. Fix: a plain "This book holds several works" choice in the add steps, and trash the unused work when a book is turned into a collection.
   - The works inside a collection get only an author, title and date. Their original title, language, category and tags cannot be entered in the app, though PLAN.md ("Anthologies") says each is a full work. Fix: let each work in a collection have them.
   - Jakob wants the Library of Congress, Open Library and Google Books to give as much as they can for every book added, without anyone needing to know what to do, and without waiting for the night. The phone cannot reach the Library of Congress (plain http, refuses calls from web pages). To weigh: running `loci-enrich` in GitHub Actions on the data repository after each sync, so results arrive within minutes. This needs a PLAN.md change, the Google Books key as a repository secret, and a trial of whether the Library of Congress answers GitHub's servers. The alternative is the laptop running it hourly. Either way, contents a source lists should be offered in the app for one-tap confirmation ("Contents found: 3 works. Use them?"), rather than only in the tool's report.
   - Facts checked for Montaigne, *The Complete Works*, translated by Frame:
     - The UK Everyman ISBN 9781857152593 is on Open Library (translator, introduction, 1376 pages) but not in the Library of Congress.
     - The US Everyman ISBN 9781400040216 is in the Library of Congress as "The complete works : essays, travel journal, letters", "li, 1336 pages ; 21 cm", with no contents note.
     - None of the three sources lists the essays one by one.
1. (The daily backup and the switch of every device are done, 11 November 2026.) The full Logos import (section 3 above), then the first real Zotero run once Jakob has cleared "Loci test". The tools already point at the real catalog. Handoff: `handoffs/2026-11-11-real-catalog.md`.
2. Build step 13.0 changes, after his shelf view review.
3. Phase 15 (later, only when Jakob asks): the price estimator, and recognising a book from a photo of its title page.

## Open questions for Jakob

- **Settings › Value** shows totals by room (the first two parts of a location, Home › Office). Totals by bookcase or by shelf instead?
- **Uncertain original dates** ("c. 110"): Zotero has no field for "circa". Leave as is, or mark them somehow?
- **Anonymous pieces in Zotero**: Zotero's Chicago style puts the editor first for them; for now they are corrected by hand when citing.
- **A light for the barcode scanner** works only in Chrome on Android, which the plan rules out. Parked unless Jakob wants it as a recorded exception.

## Decisions to look over

Choices made without Jakob, each with its reason in `docs/decisions/`:

- Adding a book (1.3.0): "Needs details" lists physical books only (Logos details come from the Logos export) and follows the chosen sort; a set's volumes keep the year their lookup finds; tags are offered as chips up to the 20 most used (`docs/decisions/screens.md`).
- Sync now uses one key for all our devices, without an expiry date, passed between devices by a setup link (Jakob's request; PLAN.md "Sync" changed to match).
- Citation keys follow his Better BibTeX pattern (`Augustine1991`, with a, b, c for repeats). Keys already pinned in Zotero are kept.
- Zotero fields hold only bibliographic data; the Loci link, with the shelf in its title, is attached under each book. Bibles are sent as one book, without sections.
- Zotero is reached through its web API, because Zotero 7's local connection cannot write.
- Version numbers: 1.0.0 as tagged; fixes 1.0.1 to 1.0.5; phase 14 is 1.1.0.
- Book data: places keep their state as the Library of Congress gives it; an associate editor has the role "other"; `loci-enrich` asks about each book again every 90 days.
- The yearly archive reminder appears in Settings and, at most once a week, when the app opens, starting a year after the first laptop backup.
