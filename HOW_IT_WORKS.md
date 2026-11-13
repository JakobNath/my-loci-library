# How it works

A plain guide to the parts of My Loci Library and how to fix each one. It is written for someone who remembers nothing about the project.

## The parts

My Loci Library is three things: an app that runs in a browser, a private repository of plain text files that holds the catalog, and a few laptop tools. Nothing depends on a company's service except GitHub (to keep and sync the files), and moving to another service means rewriting one file.

**The catalog** is a folder of small JSON files, one per record, in a private GitHub repository (`my-loci-library-data`). `DATA_FORMAT.md` describes every field. The files are the truth: everything else (the app's stored copy, `catalog.json`, the backups) can be rebuilt from them. Pictures sit beside them in `images/`.

**The app** (this repository, published by GitHub Pages) is plain HTML, CSS and JavaScript with no build step. It is arranged in three rings, and code only reaches inward:

- `core/`: pure functions, with no screen, storage or network. The data format, dates, search, sorting, merging, exports. Every rule worth testing lives here, and its tests are in `core/tests/`. The laptop tools use a copy of this folder.
- `edges/`: one file for each outside system: `storage.js` (the device's own copy, in IndexedDB), `sync-github.js` (GitHub), `lookup-openlibrary.js` and `lookup-googlebooks.js` (book lookups), `camera.js` (scanning), `photo.js` (pictures), `device.js` (this device's settings). If an outside system changes, only its edge changes.
- `ui/` and `main.js`: the screens. `main.js` holds the app's state, turns the address after "#" into a screen, and hands each screen the actions it may take. The Library and book pages load at once (the book page's lower part, other editions and the free-scan link, a moment later from `ui/book-more.js`); Add, the entry form (with "Works in this book", `ui/works.js`, at `#/edit/<id>/works`), the shelf view, Wishlist, Settings, Value and a set's page (`ui/set.js`, `#/set/<id>`) load the first time they are opened, with `styles/screens.css`. The code that runs a sync on this device (download, merge, send, keep thumbnails, and the checks before moving to another catalog) is `sync-run.js`, part of `main.js` kept in its own file so it loads just after the first screen appears.

All colors, fonts and sizes come from `styles/tokens.css`. `sw.js` (the service worker) keeps every file on the device so the app opens with no connection; raising its `VERSION` makes devices fetch a new version. `laptop/covers.html` is a page for the laptop only, which turns covers left in `images/inbox/` into the app's picture sizes; `laptop/contents.html` ("Contents to enter") lists the books whose contents page was photographed while adding, each opening the entry form with the photo above the contents box.

**The tests**: open `tests/index.html` on any device (it runs the core tests, the storage tests and the speed tests there), or run `node --test` in this folder (the same core tests, the sync tests against a stand-in for GitHub, and the architecture checks: each ring only reaches inward, each outside system is used by one edge, data put into a page is always escaped, the app stays within its size budget, and every file the app loads is kept for offline use).

**The laptop tools** (`my-loci-library-tools`, with its own README): `loci-backup` (daily backup, monthly snapshot of the exports and an HTML catalog, yearly archive), `loci-enrich` (fills empty book fields from the Library of Congress, Open Library and Google Books; the sources, their limits and terms are in `SOURCES.md`), `logos-to-my-loci-library` (Logos import) and `my-loci-library-to-zotero` (one-way sending to Zotero). They run on Node with nothing installed beyond it, and read the laptop's `config.json`.

## What happens when you add a book

The Add screen (`ui/add.js`, with its questions drawn by `ui/add-questions.js`) asks one question per screen. The steps, in order:

1. **Find the book.** Scan the barcode, type the ISBN, or type a title. For an ISBN the phone asks Open Library and HathiTrust at the same moment, and Google Books too when a key is set or something is still missing. Open Library's facts come first; HathiTrust fills what Open Library lacks and gives the best list of the works inside a book; Google Books fills the rest. The same edition already in the catalog is noticed, and only another copy is added. A volume of a known set (`sets/`, such as Great Books) takes its title and works from the list; when the whole set shares one ISBN, the app asks "Which volume?" first.
2. **Is this the book?** The found title, authors, publisher and cover, with "Fix details" for anything wrong. A book not found online is typed in from the title page.
3. **Contents**, only when a source lists works inside the book or the person says it holds several works. Each line becomes a work; Wikidata may offer their original dates ("Use these dates"). When nothing lists them, "Photograph the contents page" keeps a photo with the book, to be typed in later on the laptop ("Contents to enter").
4. **Same work?**, only when the catalog already holds a work with this title, such as another translation of the *Confessions*.
5. **Original date**, for a single work. Suggestions (from the lookup, Wikidata, or a checked known-set list) are offered, never saved without a tap.
6. **Original language, category and tags**, once for the book (or once for all of a collection's works), unless the work is already held. A collection whose works were written in different languages takes "Not all the same", which shows a language box for each work.
7. **Translation**, only for a translated book: the original title and the translator.
8. **Cover, spine, binding** (binding only when asked for in Settings; each photo can be taken with the camera or chosen from the photos already on the phone, and a spine is lined up by a dot at its top and foot and its two sides), then **Place** (the shelf, with the last ones used offered) and **This copy** (acquired, price, value, markings, notes).

**Photos after adding.** The book page's Pictures section (`ui/book-photos.js`, loaded with the page's lower part) takes, chooses or removes the cover and the spine photo. A new photo replaces every image of its kind; a removed one leaves its files in the data repository.

**What is saved.** Nothing is written until the last step. Then the app saves four kinds of record together (`DATA_FORMAT.md`): the **work** or works (the text as written: original title, language, date), the **edition** (this printing: publisher, year, ISBN, contents, cover), the **copy** (the object on the shelf: place, binding, price) and any new **author**. They go to the device's own store at once and to GitHub at the next sync.

**The rules behind it.** Original dates are set by a person, never saved from a lookup without a tap. Steps with nothing to ask are left out, so a simple book takes a few taps. Catalog facts the lookups miss (pages, series, size) are not asked: the laptop's `loci-enrich` fills them later, and "Needs details" shows what is still empty. A book can always be entered by hand when every lookup fails.

## Sync between devices

Every device (each phone, and the browser on the laptop) keeps a whole copy of the catalog, so the app works with no connection. When it is online it sends what changed and fetches what other devices changed, through GitHub, into the private data repository. All of this lives in one file, `edges/sync-github.js`; nothing else in the app talks to GitHub. `sync-run.js` decides when to call it and saves what comes back.

- **What travels.** One small JSON file per record. A batch of books saved together goes as one commit. A new device first downloads `catalog.json` (the whole catalog in one file, rebuilt each day by the laptop's backup) and then only the records changed since. Pictures follow in the background: the small grid pictures to every device, the larger ones when a book's page is opened.
- **When two devices change the same book** while apart, the newest edit wins field by field: notes typed on one phone and a shelf changed on the other both survive. Git keeps every older version.
- **The key.** One GitHub key, made once without an expiry date, opens the data repository for all our devices. The first device is set up by hand (Settings › Advanced › Sync); every other device opens a setup link sent from one already connected. The key lives only on the devices and in those links, never in a repository.
- **"Unsent".** The badge at the top counts changes not yet sent. They stay on the device until a sync succeeds; nothing is lost while offline.

## Looking after it

**The yearly ten-minute check.** Once a year (the app's yearly archive reminder is a good moment):

1. Open the app on each phone and the laptop, open `tests/` (Settings › Advanced › About › Run the self-tests), and check that every line is green. On the laptop, also run `node --test` in both public repositories.
2. Save the yearly archive (the tools README, "The yearly archive"), and open its `exports/catalog.html` to see that it reads.
3. Check that sync works on each device (Settings › Advanced › Sync shows the catalog in use and a recent sync). All devices share one key without an expiry date; GitHub lists it under Settings › Developer settings.
4. Look at `DEVICE_CHECKS.md` for anything left unchecked.
5. Go through `SOURCES.md`: open each source's pages, compare their addresses, limits and terms with what is written there, run `loci-enrich` once and read its report for refused or failed sources, and update "Last checked". A source that has changed or closed only stops filling its fields; fix or remove its edge file, and say so in `SOURCES.md`.

Anything red names the file to look at. Fix it in `core/` first if the rule lives there, run the tests again, raise `VERSION` in `sw.js` and `APP_VERSION` in `ui/settings.js`, and push.

**If the app's address ever changes** (a new domain, or a move away from GitHub Pages), the Loci links in Zotero must follow. Set `"appUrl"` in the tools' `config.json` to the new address, ending in a slash (for example `"https://books.example.org/"`), and run `loci-zotero` once: every item's link is part of what it compares, so every link is rewritten in that one run. Obsidian notes link to the Zotero items, not to Loci, so they need nothing.

**If a phone loses its catalog** (the browser cleared its storage), open the app and connect sync again (Settings › Advanced › Sync): the catalog downloads from `catalog.json` and the files changed since.

**Moving a device to another data repository** (from the test catalog to the real one, say): type the new name in Settings › Advanced › Sync, paste a key made for it, and tap "Connect and download". The app checks the new repository first, then asks before emptying this device's copy, so no record from the old catalog is sent to the new one. The old catalog stays on GitHub; the keys and this device's settings stay on the device (`connectSync` in `main.js`, `mayMoveToAnotherCatalog` in `sync-run.js`).

**If GitHub refuses the key**, the app says so in plain words and keeps every change on the device. Make a new key on one device (Settings › Advanced › Sync, steps 1 to 3), then tap "Share setup link" there and open the link on each other device.

**Setting up another device**: on a connected device, Settings › Advanced › Sync › "Share setup link". The link carries the catalog, the sync key and the Google Books key after the "#", which browsers never send to a server; opening it connects the device and takes the keys out of the address (`takeSetupLink` in `main.js`, `setupLink` in `core/settings.js`).

**If a lookup service disappears** (Open Library, Google Books), adding books still works by typing; only the lookup file in `edges/` needs replacing. If a service used by `loci-enrich` disappears, the fields it would have filled simply stay as they are.

**The laptop is stuck.** A laptop tool stops with "The laptop and a phone changed the same record at the same time". This is rare: it needs a phone and the laptop to change the very same book within the same few minutes. Nothing is lost. The laptop's change is the last commit in its copy of the data repository; the phone's is on GitHub. The simplest way out is to let the phone's version win and run the tool again: in the data repository's folder on the laptop, run `git fetch`, then `git reset --hard origin/main`. That discards only the laptop's one unsent commit (usually book data that `loci-enrich` will fill again on its next run). Then start the tool again.

## Verified approaches

Results of the phase 4 experiments.

- **4.2 Online covers in the browser (2026-11-09).** Open Library: works. A cover fetched by ISBN (`covers.openlibrary.org/b/isbn/<isbn>-L.jpg?default=false`, which answers "not found" instead of a blank image) could be read into a canvas and saved as JPEG in the browser: 320 × 500 px, 56 KB in, 45 KB out, about 1.3 s including the download. Open Library's large covers are often only about 500 px tall, so the detail image is never enlarged beyond the source. Google Books: blocked. Its cover images do not allow web pages from other sites to read them, so the app cannot compress them. Fallback, as the plan names: when only Google Books has a cover, the app records the cover's address on the edition as waiting, and a laptop tool downloads it into `images/inbox/`, where the laptop covers page compresses it like any other inbox cover. Until then the book shows its drawn cover tile.
- **4.4b Catalog heights (2026-11-09).** From Node, the Library of Congress catalog's SRU service (`http://lx2.loc.gov:210/LCDB`, query `bath.isbn=<isbn>`, MARC XML, field 300) gave a height for 6 of 8 sample ISBNs, to the whole centimeter rounded up ("ix, 312 p. ; 23 cm."), in about 0.2 s each. The same service cannot be reached from a web page (no encrypted connection, no cross-site permission), which is why `loci-sizes` is a laptop tool. Its newer JSON search at loc.gov found none of the sample books.
- **4.1, 4.3 and 4.4: waiting.** 4.1 (many files in one commit from a browser) needs a GitHub key made by Jakob for the test-data repository; 4.3 needs Zotero open; 4.4 needs `inputs/logos-sample.csv`. None of them blocks phase 5.

## Phone test results

Results from `prototypes/phone-test.html`, run on real phones during the design stop.

- **Android 16, Firefox 159 (2026-11-09).** Firefox has no built-in barcode detector, so the bundled decoder was used. It loaded in 345 ms the first time and 65 ms once cached. It read ISBN 9780802867339 correctly in 9.5 s on the first try, including the time spent aiming, and in 2.0 s on the second try. Storage passed: persistent storage was granted, the quota was about 56 GB, 50 MB was written in 1.1 s and read back intact in 0.3 s.
- **iPhone, iOS 18.7, Safari (2026-11-09).** Safari has no built-in barcode detector switched on, so the bundled decoder was used. It loaded in 18 ms and read ISBN 9780802867339 correctly in 1.1 s. Storage passed: the quota was about 39 GB, 50 MB was written in 1.0 s and read back intact in 0.04 s. Persistent storage was not granted in an ordinary Safari tab, which is normal; the plan relies on the home-screen app, which Safari exempts from its seven-day clearing of site data. No change of decoder is needed.

Note for phase 6: the first scan took a while. Things to try then are asking the camera for continuous focus where supported and decoding only the middle band of the frame, where the barcode sits.

## Decisions

The decisions made during the build, each with its reason, are in `docs/decisions/`, one file per topic; `docs/decisions/README.md` lists them. (They were in this section until 10 November 2026; references elsewhere to "HOW_IT_WORKS.md, Decisions" mean those files.)
