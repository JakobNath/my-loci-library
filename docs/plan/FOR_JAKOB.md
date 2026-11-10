# For Jakob

What is waiting on you, and decisions made while you were away that you may want to look over. Each item says exactly what to do. Tick it when it is done.

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
- **The yearly archive reminder** appears in Settings and, at most once a week, when the app opens, starting a year after the first laptop backup.
