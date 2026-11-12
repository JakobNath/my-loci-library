# Status

Where the project stands and what comes next. Read this first in any working session; update it at the end of each one. `PLAN.md` is the design and stays the source of truth; this file only says where things are. Last brought up to date on 12 November 2026 (app version 1.8.0).

## Where things stand

Every build phase is done, from 1 to 14, and phase 15 (anthologies and lasting sources) is under way (`docs/plan/archive/BUILD_PLAN_phases_1-14.md`). The one build step left is the shelf view review (13.0), which needs real books on a shelf. The app, the laptop tools and the Zotero companion have been tried live:

- **Sync** works on Jakob's laptop and phone, each with its own key, against the test catalog (`my-loci-library-test-data`). The real catalog (`my-loci-library-data`) is still empty and untouched.
- **Logos**: an export of 53 resources imported cleanly in a trial on a copy of the test data.
- **Zotero**: four trials into "Loci test" found and fixed eight citation problems; Chicago notes copied from Zotero now read correctly.
- **Book search** (Wishlist and Add) shows specific editions with English titles, publishers and covers, and finds books by publisher or series.
- **Phase 14** (better book data from the Library of Congress, Open Library and Google Books; data format version 2) is built, tested on the test catalog, and checked on the phones.
- **Version 1.1.1**: a device already connected to one data repository and connected to another now checks the new one, asks, and empties its own copy first (keeping its keys), so no sample book can reach the real catalog (`docs/decisions/sync.md`). **1.1.2** names the problem when the key is the old one or does not open the new repository, and Settings shows the catalog's name. **1.1.3** lays out Sync as three numbered steps (which catalog, make a key for it, paste and connect). **1.1.4** uses one key for all devices, without an expiry date, and a "Share setup link" button: only the first device is set up by hand, the others open the link. **1.1.6** also takes a setup link pasted into step 3's key box, because an app on an iPhone's home screen keeps its data apart from Safari and cannot receive a tapped link.
- **Version 1.2.0** (second tour fixes, 11 November 2026): straight spine photos, steadier magnifiers and a preview in the photo editor; new Library controls; covers that keep their own shape; a tighter grid caption; wishlist covers in search; an "i" beside unclear fields and a guide in Settings ("How the catalog is organized").
- **Version 1.3.0** (second tour, part B: adding books, 11 November 2026). Adding asks what only a person knows: the original language and title, category and tags, the translation, and this copy (acquired, price, value, markings, notes). The laptop fills catalog facts, and "Needs details" (a Library filter, a line on the book page, a count in Settings) shows what is still empty. "Add a set of volumes" takes a set's facts once, then volumes scanned or pasted. "Arrange" in the shelf view moves a book along its shelf. The start-up code is 99.6 KB of 100 (407 bytes free), after moving the picture view's and filter panel's styles to `screens.css`.
- **Version 1.4.0** (phase 15, step 3, 11 November 2026): adding a book also asks HathiTrust, so a Loeb volume's works are offered while adding (The Apostolic Fathers I: I Clement, II Clement, Ignatius, Polycarp, Didache), and a volume of a set is recorded with its set and volume number. The laptop asks HathiTrust too, names itself to every source, rests a source that refuses, and has a `check-sources` command.
- **Version 1.5.0** (phase 15, step 5, 11 November 2026): "Yes, and it holds several works" when adding; a collection's language, category and tags asked once for all its works; "Works in this book" ("Edit the works" on the book page) gives each work its original title, language, date, category and tags; a work a book no longer lists goes to the trash unless another book holds it. Start-up code: 219 bytes free.
- **Version 1.7.0** (phase 15, steps 6 and 7, 12 November 2026; there was no 1.6.0, as format 3 and Wikidata were published together): data format 3 (other titles and Wikidata IDs on works, Open Library and HathiTrust IDs on editions, pieces and "cite" in contents, found contents; version-2 files stay as stored until edited), the "Also inside" search line, and original dates, titles and IDs offered from Wikidata while adding, each date confirmed with one tap. The laptop tools were updated the same day, and now stop with "Update the tools first" on any record newer than they know (the backup still runs).

- **Version 1.8.0** (phase 15, step 8, 12 November 2026): known sets. A volume of a known set takes its works from the list; a set that prints one ISBN on every volume (Great Books) asks "Which volume?" first and marks the volumes already held; a work printed across volumes (Gibbon, the Summa) stays one work; the Wishlist shows set gaps with "Put the missing on the wishlist"; new Logos volumes of a known set take its works. The first list is Great Books of the Western World (1990): 61 volumes, 358 works, not yet checked by Jakob, so its dates are offered with one tap rather than filled in.

All tests pass: 182 in the app (and 169 on the self-test page), 196 in the tools.

## Waiting on Jakob

Moved from `FOR_JAKOB.md` on 10 November 2026. In order.

**Done** (one line each; the details are in git history)

- [x] Phase 14 on the phones: each phone on 1.1.0 or later, the Google Books key on each, phase 14's phone checks tried.
- [x] The first tour of the app (10 November 2026): nothing to fix.
- [x] Ready for the real catalog (11 November 2026): the two-device check, the daily backup (Task Scheduler, 12:30, into `My Drive › My Loci Library backup`), and his wife's iPhone set up by setup link.

**1.3.0 on the phones**

- [ ] Try the four checks under "Adding books, second tour part B" in `DEVICE_CHECKS.md`: Arrange, a translated book, scanning a set, and pasting a set's volumes.

**1.8.0 on every device** (published 12 November 2026; includes 1.7.0)

- [ ] Reload Jakob's phone, his wife's iPhone (close the home-screen app and open it again) and the laptop's Firefox to 1.8.0, then try "Format 3 and Wikidata (1.7.0)" and "Known sets (1.8.0)" in `DEVICE_CHECKS.md`, and the 1.4.0 and 1.5.0 ones above them if not done yet. A device still on 1.5.0 that meets a newer record says so and waits, changing nothing, until it is reloaded.
- [ ] **Check the Great Books list** with the volumes at hand (`handoffs/2026-11-12-great-books-check.md`): the ISBN printed in the volumes, the disagreements, and ten random lines. Then a working session adds the `checked:` line (and drops the ISBN line that is not printed), and the list's dates fill in without a tap.

**Before the real Zotero run**

- [ ] Clear the Zotero trial: in Zotero, select everything in "Loci test", move it to the trash, empty the trash, and delete the collection.

**3. Start cataloging for real** (walked through together)

- [x] Every device on the real catalog (11 November 2026): Jakob's phone by hand, the laptop's Firefox and his wife's iPhone by setup link.
- [x] The laptop tools point at the real catalog (`dataRepo` in `config.json`, 10 November 2026).
- [ ] Import the whole Logos library: a full, unfiltered export, run with `--full`.
- [ ] First real Zotero run: `loci-zotero.cmd` with no `--collection`. It sends into "My Loci Library" and, on that first run only, links books already in Zotero, keeping a copy of each before changing it.
- [ ] Shelve and scan, one bookcase at a time. For the Book of Concord and similar collections, give each work its traditional author where there is one (Melanchthon for the Augsburg Confession and the Apology, Luther for the Smalcald Articles and the catechisms).

**4. Shelf view review** (build step 13.0)

- [ ] Once a few dozen real books are on a shelf, go through the shelf view at the bookcase: can a book be found from the screen, do the sizes and drawn spines look like the real shelf, is the way there quick enough.

## Next tasks for a working session

Each is sized for one session. Take the first one that is not waiting on Jakob.

0. (Second tour, part B, adding books, is done and released as 1.3.0, 11 November 2026. Its phone checks are waiting on Jakob, above.)
0a. **Phase 15: anthologies and lasting sources** (planned with Jakob on 11 November 2026; PLAN.md, "Anthologies", "Original dates", "Book data", "Search"; decisions in `docs/decisions/book-data.md` and the others of that date; the full plan, live research answers and Jakob's 20 decisions in `handoffs/2026-11-12-sources-and-anthologies-phases.md`). Steps, ordered by risk; each is one session:
   1. [x] Decisions into the documents: PLAN.md, the CLAUDE.md copies, decisions, `SOURCES.md`, the yearly check (11 November 2026).
   2. [x] Source groundwork (tools only, 11 November 2026): every request names the tools, the addresses sit together in `loci-enrich/sources.mjs`, a refusing source rests for the rest of the run, and `check-sources` compares live answers with the recorded ones. The phone has nothing to change until it asks Wikidata (step 7), so there was no app release.
   3. [x] HathiTrust on the phone and the laptop: contents read by volume and set records (released as 1.4.0, 11 November 2026). The free-scan link moved to step 6, since it needs the HathiTrust ID that format 3 stores.
   4. [x] The laptop's source files (tools only, 11 November 2026): raw answers in `integrations/answers/`, the source of each value in `enrich.json`, and books without an ISBN asked by LCCN or OCLC number.
   5. [x] Collections made easy (released as 1.5.0, 11 November 2026): "Yes, and it holds several works", language, category and tags once for a collection, "Works in this book" ("Edit the works" on the book page), unused works trashed.
   6. [x] Data format 3 (published in 1.7.0, 12 November 2026): other titles and Wikidata IDs on works, Open Library and HathiTrust IDs on editions, pieces and "cite" in contents, found contents; `migrate` from version 2; the "Also inside" search line (20,000 pieces searched in 6 ms); record checks moved to `core/validate.js`. The free-scan link (needs the stored HathiTrust ID) is still to do.
   7. [x] Wikidata (published in 1.7.0, 12 November 2026): one query per book; "Use these dates" under a collection's contents; the first date suggestion for a single work; IDs, other titles and original titles for new works; a Settings switch. Still to do: "Possibly the same as", the laptop's re-check of stored IDs. The original-text marker is built on the `known-sets` branch.
   8. [x] Known sets (released as 1.8.0, 12 November 2026): the list format with a `checked:` line, "Which volume?", a listed volume's works when adding, one work across volumes, set gaps on the Wishlist, new Logos volumes, and the Great Books (1990) list. Jakob owns the 1990 edition; the list answers to both its ISBN (0-85229-531-6) and the 1952 one (0-85229-163-9), until the printed one is known (`docs/decisions/book-data.md`). Waiting on Jakob's check of the list (above). Filling books already in the catalog is step 11.
   9. [ ] Contents-page photos, the laptop page "Contents to enter", found contents offered on the book page (1.9.0).
   10. [ ] Zotero sections only for works marked to cite. Needs Jakob's go-ahead; before his first real Zotero run.
   11. [ ] Filling existing books from known lists (changes real records): a verified backup and a report first; undone with `git revert`.
   12. [ ] Known-set lists, one per session, for the volumes Jakob owns first: Luther's Works, the Chicago Complete Greek Tragedies, Loeb, Library of America, the CPH sets (Walther, Gerhard, the Concordia Commentary, Luther's Complete Sermons), Watts, Schaff, TDNT, Everyman's Library, the Folio Shakespeare.
1. (The daily backup and the switch of every device are done, 11 November 2026.) The full Logos import (section 3 above), then the first real Zotero run once Jakob has cleared "Loci test". The tools already point at the real catalog. Handoff: `handoffs/2026-11-11-real-catalog.md`.
2. Build step 13.0 changes, after his shelf view review.
3. Phase 16 (wanted, 12 November 2026): the laptop admin page with the project's documentation for a person, the shelf planner, printing shelf lists, colleague setup and announcing. See `handoffs/2026-11-12-big-run-plan.md`.

## Open questions for Jakob

- **Settings › Value** by any level of a location: built (12 November 2026, "Totals by" on the Value page; `docs/decisions/screens.md`).
- **Uncertain original dates** in Zotero: decided and built (12 November 2026): only an exact year goes to Zotero; "c. 397–400" is no longer cited as "orig. 397" (`docs/decisions/zotero-and-citations.md`).
- **Anonymous pieces in Zotero**: Zotero's Chicago style puts the editor first for them; for now they are corrected by hand when citing. **Deferred by Jakob (12 November 2026).** When it comes up again, explain it at length, with pros and cons, and advise him as a classicist and theologian who writes for academic journals.
- **A light for the barcode scanner**: Jakob would like it on iOS too (the app runs from the iPhone home screen). Research whether iOS Safari can turn on the torch from a web page; build it behind a feature check if it can, and say plainly if it cannot.
- **Google Books' branding terms** (from the overnight report): **deferred by Jakob (12 November 2026).** When it comes up again, explain it at length, with pros and cons, and advise him as a classicist and theologian who writes for academic journals.

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
