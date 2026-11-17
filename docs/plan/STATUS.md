# Status

Where the project stands and what comes next, on one screen. Read it first in every working session and keep it current. `PLAN.md` is the design; this file only says where things are. The history up to 16 November 2026 (every release, finished tasks, older decisions to look over) is in `archive/STATUS_to_2026-11-16.md`; since then, in git history and `docs/decisions/`.

Last brought up to date on 17 November 2026 (after 1.27.3).

## Where things stand

- App **1.27.3**, data format 7. Tests: 418 with `node --test` at the root, the laptop tools' included (416 pass, and 2 to-do tests for the shelf planner's known faults), 322 on the self-test page.
- 17 November, after 1.27.3: the laptop tools moved into this repository's `tools/` folder, with their history, and use the app's own `core/` and `sets/`; `update-core` and the copies are gone (decision "The tools moved into the app's repository", `docs/decisions/laptop-tools.md`). No release: nothing the phones load changed.
- 1.27.3 (17 November): Wikidata's original title is the one in the work's own language. A work with titles in many languages (Frankenstein, the City of God, Werther) had been offered whichever came last, such as "Frankenşteyn" (decision "Wikidata's original title in the work's own language", `docs/decisions/book-data.md`). Answers are also smaller and quicker.
- The feature freeze was lifted on 17 November 2026 (`PROJECT.md`). The daily backup now runs on battery too.
- 17 November, before 1.27.3: docs brought up to date, a few tests added, Wikidata's new address tried (still closed), the live lookup check re-run (1.27.2's fixes hold), and the Marx-Engels Reader's six works given Marx and Engels as two authors in the catalog. Details in the workspace's `handoffs/2026-11-17-overnight.md`.
- 1.27.2 (16 November) settled the lookup problems left from 14 November: Bromiley no longer an author of Kittel's dictionary; "Michel de Montaigne", not "Montaigne, Michel de"; an author's name already in the library is reused (so "Virgil" or "Fyodor Dostoevsky", once corrected, holds for later books); "The Aeneid" from HathiTrust where Open Library says "Aenid"; Wikidata finds works by the author's ID (Dostoevsky, Virgil) and "On the Bondage of the Will"; its date follows the working-date rule (Pride and Prejudice 1813, not c. 1800). Melville on the Oxford Ovid stays a "Fix details" case.
- **Alpha**: the app is being tried on real books, and books may be entered again. Jakob expects alpha to end near the end of November 2026; from then on the catalog is real and a format change is serious.
- Every build phase is done except the shelf view review (13.0), which needs real books on a shelf. Phase 15's known-set lists and step 11 are on hold.
- All devices sync with the real catalog (`my-loci-library-data`); the daily backup runs at 12:30.
- The "End of alpha" list is done: 1.26.2 (sync and copies), 1.27.0 (lists merged item by item), 1.27.1 (library-record names and titles), and the housekeeping of 16 November (phone checks cut to ten, rules in `CODE_STYLE.md`, this file shortened).

## Waiting on Jakob

- [ ] **The checking hour**: the workspace's `handoffs/CHECKING_HOUR.md` (the three known-set lists, the admin page). Send the answers by number in a new chat; that session corrects the lists, adds their `checked:` lines and releases the Greek tragedies list.
- [ ] **Phone checks**: the ten in `DEVICE_CHECKS.md`, when convenient.
- [ ] **The first real Zotero run**: `loci-zotero.cmd` with no `--collection`. It links books already in Zotero, filling only their empty fields.
- [ ] **Shelve and scan**, one bookcase at a time. When a bookcase is ready, "Planning the shelves" on the admin page; record the arrangement only once the books are moved. With a few dozen books shelved: the shelf view review (13.0).
- [ ] **On hold** (13 November): the full Logos import (`--full`), and new known-set lists (Loeb first).
- **Deferred questions**, to explain at length with pros and cons when they come up: anonymous pieces in Zotero (Chicago puts the editor first); Google Books' branding terms (options: leave as is, recommended; use Google only as a last fallback and name it on the book; drop it).

## Next tasks for a working session

1. **Whatever the testing turns up**: fix what Jakob and his wife report, a few problems per release, and re-run the live lookup check after any change to lookups (the workspace's `handoffs/2026-11-14-first-real-book.md` says how). The handoff's own list of lookup problems is done (1.27.2).
2. **Finish moving the laptop to `tools/`** (17 November 2026, the move itself is done): `config.json` copied to `tools/` with `dataRepo` as `../../my-loci-library-data`, one backup run from the new place, the scheduled task and the desktop shortcut to the admin page pointed at `tools/`, then a pointer note in the old `my-loci-library-tools` and that repository archived on GitHub; its laptop folder deleted after a week of good backups. Each step with Jakob's yes.
3. **First week of December 2026**: check Wikidata's new query address (still closed on 17 November) and move to it if it answers (`SOURCES.md`).
4. **The admin page rebuild**, when Jakob wants it. It takes in the shelf planner's two faults (it records a newly worked-out plan, not the printed one; its place field needs a "›" that cannot be typed) and a progress display (the workspace's `handoffs/2026-11-13-audit.md`).
