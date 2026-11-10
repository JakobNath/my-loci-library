# For Jakob

Where the project stands, what comes next, and what is waiting on you. Each item says exactly what to do; tick it when it is done. Last brought up to date on 10 November 2026 (app version 1.0.5).

## Where things stand

Every build phase is done. The one build step left is the shelf view review (13.0), which needs real books on a shelf. The app, the laptop tools and the Zotero companion have been tried live:

- **Sync** works on your laptop and phone, each with its own key, against the test catalog (`my-loci-library-test-data`). The real catalog (`my-loci-library-data`) is still empty and untouched.
- **Logos**: your export of 53 resources imported cleanly in a trial on a copy of the test data, and the importer now matches Logos's real columns.
- **Zotero**: four trials into "Loci test" found and fixed eight citation problems; Chicago notes copied from Zotero now read correctly. One of your own Zotero items (*Loci theologici 1*) was overwritten by the first trial and was restored exactly from Zotero's backup.
- **Book search** (Wishlist and Add) was rebuilt on 10 November after your notes: it now shows specific editions with English titles, publishers and covers, and finds books when you add a publisher or series ("anna karenina everyman's library", "complete works of plato hackett").

All tests pass: 109 in the app, 118 in the tools.

## What comes next, in order

### 1. Tour the app and note what needs work (next; 30–45 minutes, on your phone)

- [ ] **Add 5–10 real books**, including one with no cover online, an old book without a barcode, and a translation (to try the original-date suggestions). For photos the phone's own camera opens: use its flash button if the light is poor.
- [ ] **Open each book's page**: the cover beside the title, tap the cover for the full-size view, tap the shelf link.
- [ ] **Library**: try Filter (by location, and "Needs an original date"), save a view, change the sort.
- [ ] **Shelf view**: open the shelf you just filled.
- [ ] **Wishlist**: add a book by title, and one by pasting an Amazon link.
- [ ] **Settings**: is the main page simple enough for your wife? Look at Value, Export and Trash.
- [ ] **Search** (the bar at the top): an author, a word from your notes, a Greek word.
- [ ] **Offline**: airplane mode on, keep using it, then reconnect and watch the unsent badge clear.
- [ ] **Send the notes**, screen by screen, in any form; they are fixed in order of importance, with questions where a choice is yours.

### 2. Get ready for the real catalog (one sitting, after the tour fixes)

- [ ] **Two-device check**: edit one book's notes on the phone and another field on the laptop, both offline; reconnect both; the book should have both changes (`DEVICE_CHECKS.md`, Phase 7).
- [ ] **Daily backup**: install Google Drive for desktop, then set up and schedule `loci-backup` together (the tools README, "Setting up on a laptop" and "Running it every day").
- [ ] **Your wife**: show her the app, and add her phone with its own key (Settings › Advanced › Sync › "How to make a key").
- [ ] **Clear the Zotero trial** (if not done): in Zotero, select everything in "Loci test", move it to the trash, empty the trash, and delete the collection.

### 3. Start cataloging for real (walked through together)

- [ ] **Switch each device** to `my-loci-library-data` (the app's README, "Starting to catalog for real"): new keys for the real repository, and the sample books cleared from each device first.
- [ ] **Point the laptop tools** at the real catalog: change `dataRepo` in the tools' `config.json`.
- [ ] **Import your whole Logos library**: a full, unfiltered export, run with `--full`.
- [ ] **First real Zotero run**: `loci-zotero.cmd` with no `--collection`. It sends into "My Loci Library" and, on that first run only, links books already in your Zotero, keeping a copy of each before changing it.
- [ ] **Shelve and scan**, one bookcase at a time. For the Book of Concord and similar collections, give each work its traditional author where there is one (Melanchthon for the Augsburg Confession and the Apology, Luther for the Smalcald Articles and the catechisms).

### 4. Shelf view review (build step 13.0)

- [ ] Once a few dozen real books are on a shelf, go through the shelf view at the bookcase: can you find a book from the screen, do the sizes and drawn spines look like the real shelf, is the way there quick enough.

### 5. Later, when wanted

The extras the plan set aside: the price estimator, and recognising a book from a photo of its title page.

## Done

- [x] **A GitHub key for sync** (build steps 4.1 and 7.1), 10 November: laptop and phone connected to the test catalog; the app sent 31 files in one commit.
- [x] **A small Logos export** (build step 4.4 and the check for 11.1–11.4), 10 November: 53 resources.
- [x] **A Zotero key and the Zotero trials** (build steps 4.3 and 12.1–12.4), 10 November.

## Your notes of 9 November (looked into on 10 November)

- **Flashlight during photos.** Cover and spine photos open the phone's own camera, which has its own flash button (the lightning bolt at the top); turn it on there. A light for the in-app barcode scanner would need a feature only Chrome on Android has (iPhones do not support it), which the plan rules out; it can be added for Android only if you want, as a recorded exception.
- **Wishlist not finding the author (Hackett's *Complete Works of Plato*).** Open Library often named works in their original language and authors in Greek ("Πλάτων"), and the Hackett volume was not among the first results. Fixed: results are now specific editions, with English titles and authors in Latin letters, ranked by how many of your words they hold; picking one fills title, author, publisher, ISBN and cover.
- **Not finding *Anna Karenina*, Everyman's Library.** Words like "Everyman's Library" or "Hackett" are in no title, so they pushed the right book out. Fixed: the last word or two are also tried as the publisher, which brings up that publisher's edition (here, Everyman's Library, 1992). The Add screen's title search uses the same search.

## Decisions to look over

- **Settings › Value** shows totals by room, using the first two parts of a location (Home › Office). If you would rather see totals by bookcase or by shelf, say so.
- **Citation keys** in exports and in Zotero follow your Better BibTeX pattern (`Augustine1991`, with a, b, c for repeats), or the title's first word when there is no author or editor. Keys already pinned in Zotero are kept.
- **Zotero fields**: only bibliographic data; the original date and the pinned key use Zotero's own Original Date and Citation Key fields; a volume of a set has the set as its title and its own title as `volume-title` in Extra. The Loci link, with the shelf in its title, is a link attached under each book. Bibles are sent as one book, without sections. Anonymous pieces keep their sections, and Zotero's Chicago style puts the editor first for them; correct those by hand when citing.
- **Zotero is reached through its web API**, because Zotero 7's local connection cannot write. Zotero on the laptop shows changes after its own sync.
- **The Logos importer** matches your real export. Five bookkeeping columns that change with every export are left out, editors in the Authors column come in as authors, and covers come from Open Library by title when it has the same title (about 1 in 8 in the trial).
- **Version numbers**: 1.0.0 was tagged as the build plan says; fixes since then are 1.0.1 to 1.0.5.
- **The yearly archive reminder** appears in Settings and, at most once a week, when the app opens, starting a year after the first laptop backup.
