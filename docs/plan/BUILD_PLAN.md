# My Loci Library: build plan

This file turns `PLAN.md` into ordered steps. Work through it top to bottom. Each step ends with a **Check**; tick the step (`- [x]`) only when its check passes, then commit. `CLAUDE.md` says how to handle anything unexpected.

There is exactly one stop, at the end of phase 2. After Jakob says "go", phases 3 to 13 run without stopping.

---

## Before starting (Jakob)

1. Make an empty folder named `My Loci Library`.
2. Put these four files in it: `CLAUDE.md`, `BUILD_PLAN.md`, `PLAN.md` (the master plan's first tab, exported as Markdown) and `SAMPLE_BOOKS.md` (its Sample books tab, exported as Markdown).
3. Make sure Git, the GitHub command line (`gh`, signed in with `gh auth login`) and Node (current LTS version) are installed. Claude Code checks this in step 1.1.
4. Open Claude Code in the `My Loci Library` folder and say: *"Read CLAUDE.md, then start BUILD_PLAN.md at phase 1. Run until the STOP at the end of phase 2."*

---

## Phase 1: Foundations

- [x] **1.1 Check the tools.** Confirm `git`, `gh` (signed in as JakobNath) and `node` are available. If one is missing, say exactly what to install and wait. This is the only allowed early stop.
  **Check:** all three report a version, and `gh auth status` shows JakobNath.
- [x] **1.2 Turn off AI attribution.** In the workspace's `.claude/settings.json`, set `"includeCoAuthoredBy": false` (or the current equivalent setting if it has been renamed), and set Git's user name to "Jakob Nath" for these repos.
  **Check:** a test commit message in a scratch repo contains no co-author line.
- [x] **1.3 Create the repos** with `gh`: `my-loci-library` (public), `my-loci-library-tools` (public), `my-loci-library-test-data` (private), `my-loci-library-data` (private, holding only a README saying it holds the real catalog). Clone them into the workspace.
  **Check:** all four folders exist and push to GitHub.
- [x] **1.4 App repo skeleton.** Create the folders `app/`, `core/`, `styles/` (with `tokens.css`), `vendor/`, `tests/`, `prototypes/`, `docs/plan/`. Move `PLAN.md`, `SAMPLE_BOOKS.md` and `BUILD_PLAN.md` into `docs/plan/`, leaving pointer files in the workspace that say where they went. Copy `CLAUDE.md` in. Add `LICENSE` (MIT, "Copyright (c) 2026 Jakob Nath"), and skeletons for `README.md`, `DATA_FORMAT.md`, `HOW_IT_WORKS.md` (with a "Decisions" section), `DEVICE_CHECKS.md` and `SETUP_FOR_COLLEAGUES.md`. Every README says "Created by Jakob Nath".
  **Check:** the files exist and contain no AI attribution.
- [x] **1.5 Tools repo skeleton.** Folders `core/` (copy of the app's core, empty for now), `logos-to-my-loci-library/`, `my-loci-library-to-zotero/`, `loci-backup/`. Add `LICENSE`, `README.md`, a copy of `CLAUDE.md`, and a small `update-core` script (`.cmd` and `.sh`) that copies `core/` from the app repo.
  **Check:** `node --test` runs (zero tests is fine).
- [x] **1.6 Test page.** `tests/index.html` loads test files as ES modules, runs them, and prints plain pass/fail lines with a total.
  **Check:** it opens in a browser and reports "0 tests, 0 failures".
- [x] **1.7 GitHub Pages.** Turn on Pages for `my-loci-library` (main branch, root) with a placeholder `index.html`.
  **Check:** `https://jakobnath.github.io/my-loci-library/` loads the placeholder.

---

## Phase 2: Design prototypes (as soon as possible)

Goal: show Jakob and his wife five real, clickable directions on their own phones, quickly. Prototypes are throwaway pages. They don't need the real data format, only realistic content.

- [x] **2.1 Prototype content.** Build `prototypes/shared/sample-books.js` from `SAMPLE_BOOKS.md`: all 21 books with titles, authors, editions, original dates, anthology contents, locations, values and statuses. For covers, draw simple generated tiles (title and author in clean type) rather than fetching real images.
  **Check:** every sample book appears in the data, including the anthology contents for #6, #8 and #9.
- [x] **2.2 Five design directions.** In `prototypes/option-1/` through `option-5/`, build five clearly different looks. Suggested starting points, which can be changed: classic library card catalog; minimal and modern (Libib-like); warm bookshop; scholarly and typographic; gallery of covers. Each option includes:
  - the Library tab (cover grid and list), the Wishlist tab, and search
  - a book detail page, shown for an anthology with a disputed date and for a "no longer owned" copy
  - the batch-add flow with a pretend scan, the missing-data prompts and the corner-crop cover step
  - phone and desktop layouts, light and dark mode
  - "a little color, just a little pop", and covers shown generously

  Each option uses its own `tokens.css` and stays within the size budget.
  **Check:** all five work at 375 px and 1280 px widths in light and dark mode, with no console errors.
- [x] **2.3 Logo and icon.** Three simple SVG logo and app-icon ideas for "My Loci Library", shown on the index page.
  **Check:** each icon reads clearly at 48 px.
- [x] **2.4 Phone test page.** `prototypes/phone-test.html` with two tests:
  - **Barcode scan:** uses `BarcodeDetector` where available, otherwise the bundled decoder. Pick the smallest reliable open-source ISBN decoder, vendor it with its license, and display the decoded ISBN.
  - **Offline storage:** request persistent storage, write and read back about 50 MB of dummy data in IndexedDB, and report `navigator.storage.estimate()`.

  A "Copy results" button copies a plain-text report.
  **Check:** both tests run in desktop Chrome and Firefox; real-phone results come from Jakob at the stop.
- [x] **2.5 Prototype index.** `prototypes/index.html` links the five options, the icons and the phone test page, with one sentence describing each option. Publish to Pages.
  **Check:** `https://jakobnath.github.io/my-loci-library/prototypes/` works on a phone-sized screen.

### STOP

Tell Jakob, in a short message:

- the prototypes link
- what's needed from him:
  1. look through the five options with his wife and talk through choices here
  2. run the phone test page on both phones (iPhone and Android) and paste the results
  3. put a small Logos Library spreadsheet export (CSV, filtered to a few dozen books) in `inputs/logos-sample.csv`
  4. leave Zotero open on the laptop during the rest of the build (phase 4 and phase 12 use it)
- that after the design is chosen, saying "go" starts phases 3 to 13 without stopping

During the stop, iterate on the designs until a direction is chosen. Then:

- [x] **2.6a Drawn spine design.** In the prototypes, show several options for the drawn spine that stands in for a book with no spine photo (type, color, ornament, how width follows page count). Show each one on a shelf mixed with real spine photos from `prototypes/photos/real/` and with other drawn spines. Iterate with Jakob and his wife until one is approved, then record it in `docs/plan/DESIGN.md`.
  **Check:** Jakob has approved one option.
- [x] **2.6 Lock the design.** Write the chosen look into `styles/tokens.css` and record it in `docs/plan/DESIGN.md` (direction, colors, type, spacing, icon). Record the phone test results in `HOW_IT_WORKS.md`. If the iPhone barcode test failed, choose a different decoder and retest before continuing.
  **Check:** Jakob has said "go".

---

## Phase 3: Data format and core

- [x] **3.1 Write `DATA_FORMAT.md`.** Cover:
  - every record type: work, edition, copy, author, wishlist item, shared settings
  - every field with its type, whether it's required, and its meaning in plain words
  - the data repo layout (for example `works/`, `editions/`, `copies/`, `authors/`, `wishlist/`, `settings.json`, `covers/thumb/`, `covers/detail/`, `covers/master/`, `covers/inbox/`, `catalog.json`, `integrations/zotero-links.json`)
  - the ID format, the format version, and the per-field timestamps used for newest-wins merging
  - how trash, value history (one entry per day or session), partial acquired dates, original dates and disputed datings, anthology contents and Logos extra columns are stored
  - one complete example of each record type, including an anthology (NA28) and a disputed date (Didache)
  - a "Words" section defining each term in the vocabulary of `CODE_STYLE.md` section 4, used the same way in data, code, screens and docs
  - covers, spines and masters: where each image lives and its size. Images are a list on the record, each with a kind (`cover`, `spine`), so later kinds need no format change; a cover image also stores its main color
  **Check:** every field named in `PLAN.md` appears in `DATA_FORMAT.md`.
- [x] **3.2 Core module** in `core/`, plain ES modules that run unchanged in browsers and Node: IDs; record creation and validation; the date parser and formatter (every form in `PLAN.md`, historical century convention, AD/BC or CE/BCE output); anthology date ranges; pages as printed to a page count ("xxviii, 311" is 339, "89–132" is 44, "4 v." gives no count); size estimates (height and thickness from the best available source, in the order in `PLAN.md`, with the source named); search normalization (accent folding, Greek transliteration); field-level merge; Zotero and CSL field mapping; `escapeHtml`, the single helper that escapes all text from data before it goes into HTML (`CODE_STYLE.md` section 6).
  **Check:** the core imports cleanly in the browser test page and in `node --test`.
- [x] **3.3 Core tests.** Cover every row of the date table in `PLAN.md` plus the extra forms; centuries (2nd c. = 101–200, no year 0); disputed datings and sort overrides; anthology ranges (#6, #8, #9); validation errors; merge conflicts; "logos" matching "λόγος"; `escapeHtml`. Core takes random bytes and the current time as arguments; it never reads them itself. Replace the hard-coded colors and font in `tests/index.html` with tokens. Add the architecture tests from `CODE_STYLE.md` section 8, as short scans of the source files: `core/` imports nothing outside `core/` and uses no browser or Node globals; only `edges/sync-github.js` mentions `api.github.com`, and only each lookup edge mentions its service; no file outside `edges/storage.js` uses `indexedDB`; every `${...}` inside an `innerHTML` template is `escapeHtml(...)`, a number, or a call to a function whose name ends in `Html`; `core/` uses no `Math.random`, `Date.now` or `crypto`; the app's own files stay under 100 KB. Folders that don't exist yet pass trivially, so the tests are already in place when phase 5 creates them.
  **Check:** all pass in both the browser and Node, and each architecture test fails when a deliberate violation is added.
- [x] **3.4 Test data.** Turn all 21 sample books into valid records in `my-loci-library-test-data`, following `DATA_FORMAT.md`, and generate `catalog.json`. Add a 66-book Bible contents list to the docs for pasting.
  **Check:** every record validates, and the counts match `SAMPLE_BOOKS.md`.
- [x] **3.5 Share the core with the tools repo.** Run `update-core`, and add a tools test that fails if the two copies differ.
  **Check:** the test passes, and fails if a core file is edited in only one place.

---

## Phase 4: Prove the remaining risky parts

Each check is a small throwaway script or page. Write each result and any fallback chosen into `HOW_IT_WORKS.md` under "Verified approaches". Never stop here; switch to the fallback and continue.

- [x] **4.1 Many files, one commit.** (2026-11-10: done live by the app itself, from Jakob's browser: commit 3e5cc81 in the test data holds 31 files, records and pictures, in one commit. Its time was not measured; the sync tests cover the same path.) From a browser page, commit 30 test records to `my-loci-library-test-data` in a single commit using GitHub's Git Data API (blobs, tree, commit, ref update).
  **Check:** one commit containing 30 files, and the time it took, recorded.
- [x] **4.2 Online covers in the browser.** Try compressing an Open Library cover and a Google Books cover in the browser.
  **Fallback** if blocked: the laptop tool downloads covers into `covers/inbox/` in the data repo, and the app compresses them from there.
  **Check:** the result and the chosen approach recorded.
- [x] **4.3 Zotero.** (Answered in phase 12: Zotero 7's local connection only reads, so the web API is used; `original-date` and the pinned key go in Zotero's own Original Date and Citation Key fields.) With Zotero open, create a test item in a "Loci test" collection through the local connection, set `original-date`, pin a Better BibTeX citekey using the method Better BibTeX documents, then delete the test item.
  **Fallback:** Zotero's web API.
  **Check:** the method that worked recorded, with no test items left behind.
- [x] **4.4b Catalog heights.** From Node, look up the sample books' ISBNs in the Library of Congress catalog (its SRU service, MARC field 300) and read the height in centimeters.
  **Fallback:** another free library catalog; if none works, sizes stay estimated and `loci-sizes` is left out.
  **Check:** the share of sample books with a height, and the method, recorded.
- [x] **4.4 Logos export.** Read `inputs/logos-sample.csv`, list its columns, and write the column-to-field mapping into the tools README.
  **Check:** every column is either mapped or marked "kept as extra Logos data".

---

## Phase 5: App skeleton

Prototype code, including the photo detection and enhancement, must be rewritten to `CODE_STYLE.md` before it enters the app. Nothing is copied from `prototypes/` as it is.

- [x] **5.0 Folder layout.** Set up the layout from `CODE_STYLE.md` section 2: `core/` (already there), `edges/` (one module per outside system: `storage.js`, `sync-github.js`, `lookup-openlibrary.js`, `lookup-googlebooks.js`, `camera.js`, `photo.js`, `device.js`, each created when its step needs it), `ui/` (one file per screen exporting `render(container, state, actions)`), and `main.js`, which holds the app's top-level state and wires the rest together. All sit at the repo root next to `core/`. Move the icons from `icons/` to `icons/` and remove `app/`. `edges/device.js` keeps device settings and the sync key in localStorage. Lookup edges also fetch cover image bytes and hand them to `edges/photo.js`.
  **Check:** the architecture tests from step 3.3 run against the new folders and pass.
- [x] **5.1 App shell:** `index.html`, a web app manifest with the chosen icon, a simple service worker (offline app files, background version check, a "New version, reload" note), and hash routes (`#/book/<id>`, `#/wishlist`, `#/settings`). Uses `styles/tokens.css`.
  **Check:** it works offline after one visit, and a new deploy shows the reload note.
- [x] **5.2 Storage:** IndexedDB for records, thumbnails and an outbox of unsynced changes. Request persistent storage, handle "storage full" with a plain message, and keep the interface ready for the sync module.
  **Check:** storage tests pass, including a simulated full disk.
- [x] **5.3 Library view:** grid and list that draw only visible rows, physical books by default with Logos one tap away, and sorting by the fields in `PLAN.md`.
  **Check:** with 10,000 generated books (6,000 physical, 4,000 Logos, with works, copies and authors), a scripted scroll never leaves more than 50 ms between frames, and the app starts in 300 ms or less on the laptop.
- [x] **5.3b Shelf view:** for a location, spines side by side in shelf order, using spine photos and the drawn spine in `docs/plan/DESIGN.md` for books without one. Heights and thicknesses come from the core size estimates.
  **Check:** a sample shelf mixing photographed and drawn spines matches the approved design, and scrolling stays within the speed target.
- [x] **5.4 Book detail page:** every field, the spine beside the cover when there is one, all datings, anthology contents with dates, anthologies containing a work, other editions (physical and Logos together), value history, the cite toggle on Logos books, and the "No longer in library" banner.
  **Check:** each sample book displays correctly, and the largest anthology (the Bible, 66 works) renders in 16 ms or less on the laptop.
- [x] **5.5 Entry and editing:** work, edition and copy forms; contributors with roles; contents with table-of-contents paste; the date field with a live preview; autocomplete from managed lists; one notes box.
  **Check:** #6, #8 and #20 can be entered from scratch.
- [x] **5.6 Offline search:** a prebuilt index, results grouped by work, owned and wishlist together and labeled, Logos labeled "digital", no-longer-owned copies faded. The search box is never re-rendered while typing; only the result list redraws, showing the first 50 results.
  **Check:** one search over 10,000 books takes 10 ms or less on the laptop. A `DEVICE_CHECKS.md` item: open the self-tests on each phone, and every timing line is green.
- [x] **5.7 Development data:** a development-only loader that fills IndexedDB from the test-data records.
  **Check:** the loader can't run against the real data repo.

---

## Phase 6: Batch add

- [x] **6.1 Scanning:** camera scan (`BarcodeDetector` or the vendored decoder, loaded only on this screen), USB scanner input (an ISBN typed and followed by Enter), plus typed ISBN or title search.
  **Check:** desktop tests pass; a phone camera check is added to `DEVICE_CHECKS.md`.
- [x] **6.2 Lookups:** Open Library first, then Google Books, mapped to edition fields, including page count. Never fill original dates. A found cover of at least 400 px tall is imported automatically in the background. Google Books takes an optional per-device API key; a refused request falls back quietly to Open Library and manual entry, with a plain note.
  **Check:** tests with recorded responses pass, and the app still works with both lookups off.
- [x] **6.3 Matching and duplicates:** suggest an existing work for confirmation (never link automatically), and warn when the ISBN already exists ("Add another copy?").
  **Check:** #12 and #13 group under one work; #16 triggers the warning.
- [x] **6.4 Review card and missing-data prompts:** each book is reviewed as it is scanned, before the next scan: the found cover (with "Wrong cover? Take a photo" and an optional spine photo) and prompts for the fields set in shared settings (default: title, subtitle, author, original date, binding, publisher, edition year), each skippable.
  **Check:** the prompts follow the settings.
- [x] **6.5 Photos:** the phone's own camera or photo library through a file input; the manual editor (four corners for a cover, two edge lines and two end bars for a spine, no snapping, two magnifiers (1.5× and 3×) away from the finger, 90° rotate and fine straighten); compression to the two JPEG sizes plus a master; a blurred placeholder; the cover's main color worked out once and stored. Sizes and quality sit in one settings block. Loaded only when a photo is taken. For a spine, an optional height box shows the current height with its source ("23 cm · catalog", "~22 cm · guess"); a typed height is stored as measured. Rewritten from the prototype editor to `CODE_STYLE.md`; no automatic detection or enhancement.
  **Check:** outputs land near the sizes in `PLAN.md`, and a phone check is added to `DEVICE_CHECKS.md`.
- [x] **6.5b Laptop covers page:** `laptop/covers.html` compresses covers from `covers/inbox/` and can re-make covers from masters. Phones never load it, and the service worker does not cache it.
  **Check:** an inbox of sample covers is processed into both sizes.
- [x] **6.6 Speed:** after Save, the next scan is ready within 200 ms; cover downloads and sync never block it.
  **Check:** the timing test passes with recorded lookup responses.

---

## Phase 7: Sync (against the test-data repo)

- [x] **7.1 Sync module and setup:** (2026-11-10: connected live on Jakob's laptop and phone with their own keys; both downloaded the test catalog and sent their changes. The two-device editing check is in `DEVICE_CHECKS.md`.) the first-launch screen (paste key, choose data repo), first download with a progress bar, then loading `catalog.json` plus any newer records.
  **Check:** a fresh browser profile sets up and loads the test data.
- [x] **7.2 Writing:** the outbox is sent as one commit per batch, with newest-wins merging per field. Devices never rebuild `catalog.json`; the laptop does (step 10.1).
  **Check:** two simulated devices editing the same record offline merge correctly.
- [x] **7.3 Errors and status:** plain messages for expired keys (with renewal steps), going offline, and rate limits; an "unsynced changes" badge.
  **Check:** each error case is tested.
- [x] **7.4 Version safety:** an older app meeting newer-format data asks for a refresh and writes nothing.
  **Check:** tested.

---

## Phase 8: Organizing

- [x] **8.1** Location paths, sorting by every field in `PLAN.md`, filters, and saved views.
- [x] **8.2** Status rules: no longer owned (banner, faded, excluded from counts, shelf lists and totals); trash with restore.
- [x] **8.3** Wishlist tab: standalone records, and "I bought it" opening a prefilled entry form that keeps the note.
- [x] **8.4** Managed lists: rename and merge categories, tags, series, bindings and locations.
- [x] **8.5** Settings page exactly as listed in `PLAN.md`: shared settings saved in the data repo's `settings.json`, device settings kept on the device.
- [x] **8.6 Interface review with Jakob.** (Done 2026-11-11, except the shelf view, which Jakob will review once several dozen real books are shelved: step 13.0.) Go through every screen on a phone, using the notes in `docs/plan/INTERFACE_NOTES.md`, and ask Jakob about each screen in turn (what feels clunky, too wordy, unclear or slow) before changing it. Fix what is agreed, keeping to the design in `docs/plan/DESIGN.md` and the size budget. Record each change under "Decisions" in `HOW_IT_WORKS.md`.
  **Check for 8.1–8.5:** a test for each item, and the sample books behave as their "What it tests" column says.

---

## Phase 9: Value and exports

- [x] **9.1 Value view:** total value of owned physical books, totals by location, count of books with no value, a separate Logos total, and CSV export. Value history: same-day changes collapse into one entry, and history can be deleted.
  **Check:** totals for the sample data are right.
- [x] **9.2 Exports:** CSV, JSON, CSL-JSON and BibTeX in the app, loaded only when used. The self-contained HTML catalog (thumbnails embedded, opens with no internet) is built by `loci-backup` on the laptop.
  **Check:** each export opens correctly and keeps titles, authors, editions and original dates.

---

## Phase 10: Backups

- [x] **10.1 `loci-backup` tool:** pulls the data repo, mirrors it to the Google Drive folder named in a small config file (changed files only), saves a dated export snapshot monthly (including the HTML catalog), rebuilds `catalog.json` and its search text, and writes a last-backup status file the app can show.
  **Check:** tests with a temporary folder pass; the `.cmd` and `.sh` launchers work.
- [x] **10.2 Scheduling and reminder:** Task Scheduler and cron instructions in the tools README; the yearly full-archive reminder in the app.
  **Check:** the instructions are written, and the reminder appears after a simulated year.
- [x] **10.2b `loci-sizes` tool:** fills catalog heights for books without one, never overwrites a measured height, reports what it filled, commits once. `loci-backup` runs it daily; `.cmd` and `.sh` launchers run it by hand.
  **Check:** tests with recorded catalog responses pass, and a second run changes nothing.
- [x] **10.3 Ready for real data:** document in the README how to point the app at `my-loci-library-data`. Real cataloging can begin after this phase. Don't point the app at it yourself.
  **Check:** the documentation exists.

---

## Phase 11: Logos importer

- [x] **11.1 Import:** reads the Logos CSV, matches rows by resource ID, adds new books, keeps unmapped columns as extra Logos data, never overwrites fields edited in Loci, and writes a change report.
- [x] **11.2 Removals:** a full export marks missing digital books "no longer owned"; a filtered export never removes anything.
- [x] **11.3 Linking:** suggests links between digital editions and existing works, for confirmation.
- [x] **11.4 Covers:** fetches covers into `covers/inbox/` (compressed by the laptop covers page) or writes a citation-style tile description for the app to render; works in resumable batches sized for about 4,000 books.
  **Check for 11.1–11.4:** tests using `inputs/logos-sample.csv` pass, and a second run changes nothing.
  (2026-11-10: checked with Jakob's export of 53 resources: all imported in 0.2 s into a copy of the test data, and a second run changed nothing. The tests use a sample in the same 24-column shape.)

---

## Phase 12: Zotero companion

- [x] **12.1 One-way sync** into a "My Loci Library" collection: every physical edition, Logos editions marked "cite", book sections for the contents of anthologies that are sent, and `original-date` set. Wishlist items are never sent.
- [x] **12.2 Fields:** shelf location and a permanent Loci link (fixed pattern, record ID only), refreshed every run; a link file in `integrations/zotero-links.json`; pinned Better BibTeX keys in the existing author + year pattern.
- [x] **12.3 Safety:** never deletes Zotero items (tags them "Loci: no longer owned" or "Loci: removed"); the first run links existing items and writes a report of every difference it overwrote; uses the web API as a fallback.
- [x] **12.4 Speed and launchers:** only changed books are processed; one new book arrives in under 10 seconds; one-click `.cmd` and `.sh` launchers; README notes on optional scheduling.
  **Check for 12.1–12.4:** against a "Loci test" collection, the sample books arrive correctly, a second run changes nothing, and the timing test passes. Remove the test collection afterward.
  (2026-11-10: checked with Jakob in four live trials into "Loci test". The trials found and fixed: a wrongly linked real item (restored), citation fields that Chicago would print, premodern names, anthology dates and authors, volumes of a set, section translators and edition wording; Chicago notes copied from Zotero were then checked by Jakob. A second run sent nothing in 1.5 s. Removing the test collection is Jakob's, in `docs/plan/FOR_JAKOB.md`.)

---

## Phase 13: Release

- [ ] **13.0 Shelf view review with Jakob.** (Waiting on Jakob until real books are shelved; it does not block phase 14. Continue with phase 14.) Once several dozen real books are on a shelf, go through the shelf view with Jakob at the bookcase: can he find a book from the screen, do the sizes and drawn spines look like the real shelf, and is the way there quick enough. Fix what is agreed, as in step 8.6.
- [x] **13.1** Finish `README.md`, `HOW_IT_WORKS.md` (including the yearly ten-minute check and how to rewrite Zotero links if the app's address ever changes), and `SETUP_FOR_COLLEAGUES.md`.
- [x] **13.2** About screen: app version, data format version, MIT license, "Created by Jakob Nath".
- [x] **13.3** Run every test in both repos, confirm the size budget, and search both repos for any AI attribution.
- [x] **13.4** Tag version 1.0 in both public repos.
- [x] **13.5** Write a short summary for Jakob: what was built, the decisions recorded, and the open items in `DEVICE_CHECKS.md`.
  **Check:** all tests pass, nothing attributes AI, and the tags exist.

---

## Phase 14: Better book data

Designed with Jakob on 10 November 2026; read `PLAN.md`, "Book data", first. Jakob's decisions: all three sources (Library of Congress, Open Library, Google Books); Google Books on the laptop and the phones, with key-making made easy; the nightly tool fills empty fields and reports; anthology contents are offered to confirm, never for Bibles; the new fields (format version 2) come last. Keep to the hard rules in `CLAUDE.md`: the phone app may call only Open Library, Google Books and GitHub; original dates are never filled; nothing a person typed is overwritten; adding a book stays as fast as now; the start-up size budget holds (the Add screen loads when opened).

- [x] **14.1 Recorded answers.** For these ISBNs, record each source's real answer as test data: 9780199537822 (Chadwick, *Confessions*), 9780140449136 (*Crime and Punishment*, translated from Russian), 9780758615473 (Chemnitz, *Loci theologici*, a set), 9780872203495 (Plato, *Complete Works*, edited), 9780060652920 (*Mere Christianity*, with a table of contents on Open Library), 9780674990401 (Loeb Plato, not in the Library of Congress), 9781857150582 (Everyman *Anna Karenina*), and one Bible. Sources: Open Library's full edition record (`https://openlibrary.org/isbn/<isbn>.json`, following its redirect) and its work record; the Library of Congress (`http://lx2.loc.gov:210/lcdb?version=1.1&operation=searchRetrieve&query=bath.isbn=<isbn>&maximumRecords=3&recordSchema=marcxml`, from Node); Google Books (`https://www.googleapis.com/books/v1/volumes?q=isbn:<isbn>` and the volume's own record, with the key from the tools' `config.json` if Jakob has made one; otherwise from its documented shape, noted as such). Keep them as small JavaScript modules that export the text (`core/tests/answers/`), so the same core tests run in the browser and in Node.
  **Check:** the answers are committed, and no key appears in any of them.
  (2026-11-10: recorded with Jakob's Google Books key, which was removed from every answer. None of the eight Library of Congress records lists contents, so a ninth book was added for that: Holmes, *The Apostolic Fathers in English*, 9780801031083.)
- [x] **14.2 Reading each source (core).** A pure core module reads each source into Loci's fields, with tests against 14.1:
  - Library of Congress MARC: pages as printed from 300 $a ("xxx, 1808 p. ;" becomes "xxx, 1808"), height from 300 $c in millimeters, edition (250), series and number (490/830), place and publisher (260/264), title and subtitle (245, with catalogue punctuation removed and sentence case put into title case), translators and editors with their roles (245 $c "translated by", "edited by", "with an introduction by", and 700 relator codes), original title (240 $a without ". English") and original language (041 $h, as a language name), contents (505), and, for 14.7, subjects (650), call numbers (050, 082) and numbers (010, 035).
  - Open Library's full edition record: pagination, number of pages, edition name, series, publish places, binding from physical format, height and thickness from physical dimensions, table of contents.
  - Google Books: height and thickness from dimensions, page count, publisher, the larger cover images.
  - Merging: a value is taken only from a record that lists the book's own ISBN; for bibliographic facts the Library of Congress wins, then Open Library, then Google Books; for height, thickness and covers whichever has them; pages as printed always beat a bare page count. Original dates are never produced; the work's first publication stays a suggestion, as now.
  **Check:** each recorded book reads as a person reading the title page would expect (for example *Complete Works*: Plato; edited by John M. Cooper; xxx, 1808 pages; 24 cm; Hackett, Indianapolis, 1997; original language Ancient Greek).
  (2026-11-10: `core/marc.js` and `core/book-data.js`, with tests in `core/tests/book-data.tests.js`. *Complete Works* reads: Plato; edited by John M. Cooper, with D.S. Hutchinson as associate editor; xxx, 1808; 24 cm; Hackett Publishing, Indianapolis, Ind., 1997; Ancient Greek.)
- [x] **14.3 One rule for Bibles.** Move `isBible` from `my-loci-library-to-zotero/zotero-items.mjs` into the app's core, and use it from the Zotero companion and from adding books.
  **Check:** both repos' tests pass; the Zotero companion still sends NA28 and the Holy Bible without sections.
  (2026-11-10: `core/bible.js`. In the test catalog it still picks out NA28 and the Holy Bible and nothing else. Adding books uses it from step 14.4, where contents are first offered.)
- [x] **14.4 Fuller entries at scan time (phone).** The Open Library edge also fetches the full edition record, and the Google Books edge is asked whenever a key is set, both at the same moment as the lookups made now. Adding a book then fills pages as printed, edition, series and number, place, height and thickness, and the binding step pre-selects a binding the record names. When the record lists an anthology's contents and the book is not a Bible, the steps offer them in the contents box to correct or accept (one plain question, as the other steps), creating the works only when accepted.
  **Check:** core tests; on the local preview, scanning or typing the 14.1 ISBNs gives those fields; adding a book takes no longer than before (time it); the start-up size budget passes.
  (2026-11-10: on the local preview, typing 9780060652920 gave the edition, pages as printed, place, 22 cm and a pre-selected Paperback, saved as such; 9780801031083 offered its 21 works and, once accepted, skipped the date step. Open Library's two requests took a median of 650 ms before and 668 ms now, over 27 lookups each. A Google Books key was not tried in the browser: Jakob's key stays out of the app on this laptop, so its part is tested with the recorded answers, and the phone check is in `DEVICE_CHECKS.md`.)
- [x] **14.5 A Google Books key in two minutes.** In Settings › Advanced, beside the Google Books key box: a short step-by-step guide with direct links (enable the Books API at `https://console.cloud.google.com/apis/library/books.googleapis.com`, make a key under `https://console.cloud.google.com/apis/credentials`, restrict it to the Books API), and a "Test the key" button that makes one lookup and says plainly whether it works and why not. The same guide in the tools README for `"googleBooksKey"` in `config.json`. One key may be pasted into every device. Add the steps to `docs/plan/FOR_JAKOB.md`.
  **Check:** the guide and the button work on the local preview (the button tested with a fake answer as well); `DEVICE_CHECKS.md` has a phone item for pasting and testing the key.
  (2026-11-10: on the local preview the button said "Paste a key into the box first." with an empty box and, for a made-up key, read Google's real refusal as "Google does not know this key..."; the other answers are tested with fake ones in `core/tests/book-data.tests.js`.)
- [x] **14.6 `loci-enrich` on the laptop.** Replace `loci-sizes` with `loci-enrich` (folder, `.cmd` and `.sh` launchers, README; `loci-backup` runs it daily). For every edition with an ISBN it asks the Library of Congress, then Open Library and Google Books (with `googleBooksKey` from `config.json`), and fills **empty fields only**: pages as printed, height and thickness, edition, series and number, place, translators and editors, original title and original language. It keeps what it last wrote in the data repository (`integrations/enrich.json`, as the Logos importer does), so a field a person changed is never touched again; it never fills an original date; anthology contents (never for Bibles) are listed in its report as suggestions only. It is gentle on the services (a short pause between books), asks again about books not found only after 90 days, can be limited (`--limit`), carries on where it stopped, writes a plain report, and commits once.
  **Check:** tests with the 14.1 answers (fields filled; a field a person edited is left alone; a second run changes nothing; Bibles get no contents suggestion); a run on a temporary copy of the test data, with its report read.
  (2026-11-10: on a copy of the test data, with Jakob's Google key, 13 books with ISBNs were asked in 21 s and 9 filled; a second run asked nothing. Reading the first report led to four fixes, now tested: Open Library's sizes of a boxed set (the Ante-Nicene Fathers, 35.8 cm) are no longer used, a series that repeats the book's set is not filled, volume labels and front matter are never suggested as works, and a bookseller's "New Ed edition" reads "New ed.".)
- [x] **14.7 New fields: data format version 2.** In `DATA_FORMAT.md`, each edition gains `identifiers` (`lccn`, `oclc`, `lcc`, `ddc`; each null when unknown) and `subjects` (a list of subject headings), in a fixed key order. Raise the format version to 2; core gains `migrate`, which upgrades a version-1 record to version 2 (adding the empty fields), with tests; every place that reads records (storage, sync, `catalog.json`, the tools' `readRecords`) reads through it. Publish the app that reads version 2 before any tool writes it, so no device meets data newer than it understands. Fill the new fields at scan time and in `loci-enrich`; show them in the book page's Edition facts; add them to the CSV export; the Zotero companion sends the Library of Congress call number as Zotero's Call Number (Chicago does not print it).
  **Check:** migration tests (a version-1 record reads, edits and saves as version 2; nothing is lost); the sync tests pass with a mix of versions; all tests in both repos pass; the test data upgraded on a copy first, then for real.
  (2026-11-10: version 1.1.0 of the app, which reads version 2, was published and confirmed on GitHub Pages before the test catalog was upgraded: 219 records on a copy, then 223 for real, each checked to have lost nothing. Adding *Confessions* on the local preview saved its LCCN, OCLC number, call number, Dewey number and subjects, and the book page showed them.)
- [ ] **14.8 Close the phase.** Record each decision in `HOW_IT_WORKS.md`; update `docs/plan/FOR_JAKOB.md` (what was built, and the steps waiting on Jakob: making the Google key and pasting it into each device); add phone checks to `DEVICE_CHECKS.md`; raise the app version (1.1.0); update the core copy in the tools; run every test in both repos and the self-test page.
  **Check:** all tests pass, the size budget holds, and nothing attributes AI.

---

## Phase 15: Later (not part of this run)

Price estimator, title-page photo recognition, and the other deferred items in `PLAN.md`.
