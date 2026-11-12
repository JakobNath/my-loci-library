# How it works

A plain guide to the parts of My Loci Library and how to fix each one. It is written for someone who remembers nothing about the project.

## The parts

My Loci Library is three things: an app that runs in a browser, a private repository of plain text files that holds the catalog, and a few laptop tools. Nothing depends on a company's service except GitHub (to keep and sync the files), and moving to another service means rewriting one file.

**The catalog** is a folder of small JSON files, one per record, in a private GitHub repository (`my-loci-library-data`). `DATA_FORMAT.md` describes every field. The files are the truth: everything else (the app's stored copy, `catalog.json`, the backups) can be rebuilt from them. Pictures sit beside them in `images/`.

**The app** (this repository, published by GitHub Pages) is plain HTML, CSS and JavaScript with no build step. It is arranged in three rings, and code only reaches inward:

- `core/`: pure functions, with no screen, storage or network. The data format, dates, search, sorting, merging, exports. Every rule worth testing lives here, and its tests are in `core/tests/`. The laptop tools use a copy of this folder.
- `edges/`: one file for each outside system: `storage.js` (the device's own copy, in IndexedDB), `sync-github.js` (GitHub), `lookup-openlibrary.js` and `lookup-googlebooks.js` (book lookups), `camera.js` (scanning), `photo.js` (pictures), `device.js` (this device's settings). If an outside system changes, only its edge changes.
- `ui/` and `main.js`: the screens. `main.js` holds the app's state, turns the address after "#" into a screen, and hands each screen the actions it may take. The Library and book pages load at once; Add, the entry form (with "Works in this book", `ui/works.js`, at `#/edit/<id>/works`), the shelf view, Wishlist, Settings and Value load the first time they are opened, with `styles/screens.css`.

All colors, fonts and sizes come from `styles/tokens.css`. `sw.js` (the service worker) keeps every file on the device so the app opens with no connection; raising its `VERSION` makes devices fetch a new version. `laptop/covers.html` is a page for the laptop only, which turns covers left in `images/inbox/` into the app's picture sizes.

**The tests**: open `tests/index.html` on any device (it runs the core tests, the storage tests and the speed tests there), or run `node --test` in this folder (the same core tests, the sync tests against a stand-in for GitHub, and the architecture checks: each ring only reaches inward, each outside system is used by one edge, data put into a page is always escaped, the app stays within its size budget, and every file the app loads is kept for offline use).

**The laptop tools** (`my-loci-library-tools`, with its own README): `loci-backup` (daily backup, monthly snapshot of the exports and an HTML catalog, yearly archive), `loci-enrich` (fills empty book fields from the Library of Congress, Open Library and Google Books; the sources, their limits and terms are in `SOURCES.md`), `logos-to-my-loci-library` (Logos import) and `my-loci-library-to-zotero` (one-way sending to Zotero). They run on Node with nothing installed beyond it, and read the laptop's `config.json`.

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

**Moving a device to another data repository** (from the test catalog to the real one, say): type the new name in Settings › Advanced › Sync, paste a key made for it, and tap "Connect and download". The app checks the new repository first, then asks before emptying this device's copy, so no record from the old catalog is sent to the new one. The old catalog stays on GitHub; the keys and this device's settings stay on the device (`connectSync` in `main.js`).

**If GitHub refuses the key**, the app says so in plain words and keeps every change on the device. Make a new key on one device (Settings › Advanced › Sync, steps 1 to 3), then tap "Share setup link" there and open the link on each other device.

**Setting up another device**: on a connected device, Settings › Advanced › Sync › "Share setup link". The link carries the catalog, the sync key and the Google Books key after the "#", which browsers never send to a server; opening it connects the device and takes the keys out of the address (`takeSetupLink` in `main.js`, `setupLink` in `core/settings.js`).

**If a lookup service disappears** (Open Library, Google Books), adding books still works by typing; only the lookup file in `edges/` needs replacing. If a service used by `loci-enrich` disappears, the fields it would have filled simply stay as they are.

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
