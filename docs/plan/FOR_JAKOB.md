# For Jakob

What was built while you were away, what is waiting on you, and decisions you may want to look over. Each item says exactly what to do. Tick it when it is done.

## What was built (version 1.0.0, 2026-11-10)

Every build phase is done. The steps still open are the ones that need you: a key, an export, or a real bookcase.

- **Phase 9, value and exports.** Settings › Value shows the total value of the books on the shelves, totals by room, how many have no value yet, and the Logos total kept apart, with a CSV for an insurance agent. Settings › Export saves the whole catalog as CSV, JSON, CSL-JSON or BibTeX. A value history entry can be deleted in the book's edit form.
- **Phase 10, backups.** `loci-backup` pulls the data, rebuilds `catalog.json`, copies changed files to your Google Drive folder, saves a monthly snapshot of the exports and a `catalog.html` that opens anywhere with no internet, and records the backup; the app shows the last backup date and, once a year, reminds you to make a full archive (`loci-backup --archive`). `loci-sizes` fills book heights from the Library of Congress. The tools README explains setup and how to schedule it in Task Scheduler.
- **Phase 11, Logos importer.** `logos-import` brings in a Logos export, never overwrites a field you edited in Loci, marks books gone from Logos only after a full export, suggests links to works you already have for you to confirm, and fetches covers by ISBN into the inbox. The laptop covers page now saves those covers into the catalog.
- **Phase 12, Zotero companion.** `loci-zotero` sends physical books and Logos books marked "cite" to a "My Loci Library" collection, with book sections for anthologies, original dates, pinned citation keys in your Better BibTeX pattern, shelf locations and Loci links. It never deletes anything; books given away or removed are tagged.
- **Phase 13, release.** `HOW_IT_WORKS.md` now describes every part and how to look after it (the yearly ten-minute check, and how to move the Loci links in Zotero if the app's address ever changes). `SETUP_FOR_COLLEAGUES.md` walks a colleague through their own copy. Both public repositories are tagged `v1.0.0`.
- **Smaller start.** The styles of the screens that load later moved to their own file, so opening the app reads about 92 KB of its 100 KB budget.

All tests pass: 107 in the app (`node --test`), 94 on the self-test page, 111 in the tools.

## Waiting on you

- [ ] **A GitHub key for sync (build steps 4.1 and 7.1).** Make a fine-grained token for `my-loci-library-test-data` (Contents: read and write), then in the app open Settings › Advanced › Sync, type `JakobNath/my-loci-library-test-data`, paste the token and tap "Connect and download". The phone checks under "Phase 7" in `DEVICE_CHECKS.md` follow from there.
- [ ] **A small Logos export (build step 4.4, and the check for 11.1–11.4).** In Logos, filter the Library to a few dozen resources of different kinds, use Print/Export to save a spreadsheet (CSV), and put it at `inputs/logos-sample.csv` in the workspace folder. Then the importer's column table (`my-loci-library-tools/logos-to-my-loci-library/columns.mjs`) is checked against it, and the importer is run on a copy of the test data.
- [ ] **A Zotero key (build steps 4.3 and 12.1–12.4).** At zotero.org/settings/keys, note your user ID and make a private key with library and write access. Put both in the tools' `config.json` (see `config.example.json`; it is never committed), with `dataRepo` pointing at the test data. Then run `my-loci-library-to-zotero/loci-zotero.cmd --collection "Loci test"`, check the sample books in Zotero (original dates in citations, citation keys, shelf locations), run it again (it should send nothing), and delete the "Loci test" collection and its items in Zotero afterward.
- [ ] **The shelf view review (build step 13.0)**, once several dozen real books are on a shelf.
- [ ] **Phone checks** in `DEVICE_CHECKS.md`, whenever convenient.

## Decisions to look over

- **Settings › Value** shows totals by room, using the first two parts of a location (Home › Office). If you would rather see totals by bookcase or by shelf, say so.
- **Citation keys** in exports and in Zotero follow your Better BibTeX pattern (`Augustine1991`, with a, b, c for repeats), or the title's first word when there is no author or editor. Keys already pinned in Zotero are kept.
- **Zotero fields:** the shelf location goes in "Loc. in Archive" and the Loci link in URL; the original date and the pinned key go in Extra.
- **Zotero is reached through its web API**, because Zotero 7's local connection cannot write. It needs the key above; Zotero on the laptop shows changes after its own sync.
- **The Logos importer** reads columns by the names in its table. The names were a first guess, made before your export was at hand.
- **Version 1.0.0** was tagged as the build plan says, before the live checks above. If any of them turns up a problem, the fix becomes 1.0.1.
- **The yearly archive reminder** appears in Settings and, at most once a week, when the app opens, starting a year after the first laptop backup.
