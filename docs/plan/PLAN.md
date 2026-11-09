# My Loci Library — Master Plan

Nov 8, 2026, revised Nov 9, 2026 · Jakob Nath

## Purpose and principles

My Loci Library is a lightweight, open-source catalog of our physical books and Logos library. It is built to outlast any app, company, or device for 40+ years. Created by Jakob Nath.

**What it must do (the ten goals)**

1. Manual entry for odd books (out of print, rare, custom-made).
2. An estimated value per book, totaled for raising personal-property insurance.
3. Phone search while in used bookstores, so we see what we already own.
4. Zotero integration for citing in papers.
5. Cover images, compressed but still sharp and beautiful.
6. Notes on each book: why we own it, why this edition or translator, gifts, and so on.
7. Fast entry by barcode scan.
8. Flexible location (place, room, case, shelf) and many ways to sort, including by original date.
9. An original publication date on every work, handled with scholarly care.
10. Sustainability: nothing depends on one company, and the data stays readable if everything else breaks.

**Guiding principles**

- **The data outlives the app.** The catalog is plain text files we own, documented in `DATA_FORMAT.md`. The app is disposable and can be rebuilt from the spec.
- **Lightweight above all.** Plain HTML, CSS and JavaScript with no frameworks, no build step and no npm packages. Any third-party code is copied into the repo, never loaded from the internet.
- **Offline first.** Every device keeps a full copy. If sync or lookups stop working, search, adding, and exporting still work.
- **External services are optional.** Open Library and Google Books only speed up entry. Manual entry always works.
- **Exports are the guarantee.** CSV, JSON, CSL-JSON, BibTeX, and a self-contained HTML catalog are always available.
- **Extras live outside the app.** Logos import, Zotero sync, price estimating, and anything AI-related are separate laptop tools or done by hand. They never add weight to the main app.
- **The phone app stays small and fast.** It reads, searches, adds and edits. Anything heavy (bulk cover processing, re-cropping from masters, the HTML catalog, building `catalog.json`) happens on the laptop, in a tool or in a separate laptop page the phone never loads. Speed is a main design goal: no lag, and search that feels instant.
- **Human-made feel.** Documentation is plain text written for people. There are no AI attributions anywhere, including commit messages, and credit goes only to Jakob Nath.
- **Open source from day one,** under the MIT license, so colleagues can use it.

## Architecture

Three GitHub repositories keep code, data and laptop tools separate. The private data repository is the shared "folder" that every device syncs through.

| Repository | Visibility | Holds |
| --- | --- | --- |
| `my-loci-library` | Public, MIT | The app: static HTML/CSS/JS served free on GitHub Pages, plus the laptop pages (`laptop/`), docs, self-tests, `CLAUDE.md` and `CODE_STYLE.md` |
| `my-loci-library-data` | Private | The catalog: one text file per record, covers, a generated combined file for fast loading |
| `my-loci-library-tools` | Public, MIT | Laptop tools, one folder each: Logos importer, Zotero companion, backup, catalog sizes, price estimator |

**Devices**

- Phones (Android and iPhone): the app is added to the home screen from the browser, with no app store.
- Laptops: Windows now, and it must also run on Linux. The app runs in any modern browser, and the tools run on Node.

**Sync**

- Each device keeps a full offline copy of the catalog and the grid thumbnails of physical books. Logos thumbnails are cached once seen, which keeps a phone's first download near 10 MB instead of 50 MB.
- When online, the app reads and writes the private data repo through GitHub. Saving a batch (say, 30 books) makes one commit, not hundreds.
- Devices load the combined catalog file plus any records newer than it, so startup stays fast as the library grows. Only the laptop builds the combined file (daily, through `loci-backup`, or on demand). Phones write single records and never rebuild it.
- Access is one key per device (laptop, Jakob's phone, wife's phone), all on Jakob's GitHub account. Losing a phone means cancelling one key.
- When a key expires, the app shows a plain message and a link to the renewal steps. It never fails silently.
- Conflicts: if both of us edit the same record offline, the newest edit wins per field. Git history keeps every older version.
- First launch on a new device: one short setup screen to paste the key and choose the data repo, then the first download with a progress bar. Nothing more.
- Colleagues use the same hosted app with their own private data repo and key. Each release is clearly labeled.

**Backups**

- **Continuous:** every save is a commit to the private GitHub repo, so the full history is off-site within seconds.
- **Daily:** a small laptop tool (`loci-backup`, scheduled with Windows Task Scheduler, or cron on Linux) pulls the latest data and mirrors it into a "My Loci Library backup" folder in Google Drive, copying only changed files.
- **Monthly:** the same tool saves a dated snapshot of the exports (CSV, JSON, BibTeX, HTML catalog), which are small.
- **Yearly:** the app reminds us to save a full dated archive, including covers, to an external drive.
- The laptop's own copy of the data repo is one more complete backup.
- The HTML catalog embeds only thumbnails, keeping it roughly 15–60 MB. It is built on the laptop by `loci-backup`, not in the app.

**Language decisions**

- App: plain JavaScript, HTML and CSS.
- Tools: JavaScript on Node using only built-in modules, with zero npm packages.
- Shared logic is written once in a small core module of plain JavaScript that runs unchanged in browsers and in Node, imported by both the app and the tools (the tools repo keeps a copy, refreshed by a small script, and a test fails if the two copies differ): the data format, validation, the date parser, and the Zotero field mapping.

## Data model

Records come in three linked layers: a **work** (the *Confessions*), its **editions** (a particular translation or printing, which can contain several works), and **copies** (the physical or digital item we hold). Each record is its own small text file with a permanent ID, so edits from two people rarely collide.

**Work** (shared by every edition that contains it)

- Title, subtitle, and authors (as author records, see below).
- Original language and original title (e.g., Latin, *Confessiones*), so search finds it under either title.
- Original date: see the dates section.
- Main category and topic tags.

**Edition**

- Title and subtitle as printed (can differ from the work's).
- Contributors with roles: translator, editor, introduction, and others. Authors come from the work or works the edition contains.
- Publisher, place, edition publication year, and pages as printed (filled from lookups when available). Pages are kept exactly as printed ("xxviii, 311", or "89–132" for a journal issue), and the app works out the real count from them (339, 44).
- Size: height and thickness in millimeters, both optional, each marked with where it came from: *measured* (a person), *catalog* (a library record) or *photo* (thickness worked out from a spine photo and the height). See "Book sizes" below.
- Translation first published (for reprints of older translations).
- Series and series number (Loeb Classical Library 36), and set title plus volume label (*Church Dogmatics* I/1). Both optional.
- ISBN, and a languages list ("Greek, English" marks a diglot; three languages, a triglot).
- Contents: one work, or several for an anthology (see below).
- Format: physical or Logos digital. A digital edition carries its Logos resource ID.
- A "cite" toggle that sends a Logos edition to Zotero. Physical editions are always sent.

**Copy** (one per item we hold)

- Binding from a pick list we extend (hardcover, paperback, leather, bonded leather, cloth…). Physical only.
- Location path: Place › Room › Case › Shelf. Only the parts we know are filled. Physical only.
- A "writing or markings when acquired" checkbox.
- Added to catalog: set automatically. Acquired: optional, and accepts partial answers ("2019", "before 2015", blank).
- Purchase price (optional).
- Estimated value, which stamps its own date. Value history is kept, but several changes within one day or session count as one. History can be deleted easily.
- **One free notes box** for anything: why we own it, why this edition or translator, gifts, condition.
- Status: owned or no longer owned (given away, sold, lost, or gone from Logos).

**Anthologies** (fully featured; many of our books are collections)

- An edition's contents is an ordered list. Each entry links to a work and can add how much of it is included (complete, selections, or a free-text range such as "Books I–IV"), a translator for that piece when it differs from the edition's, and pages.
- Every contained work is a full work with its own authors, original title, and original date. Searching "Phaedo" finds Loeb Plato I, shown as "*Phaedo* — in *Plato I* (Loeb 36)".
- Adding contents is fast: paste a table of contents, one work per line ("Plato — Euthyphro"), and the app turns it into entries, creating new works as needed. New works without dates appear in the "needs original date" filter.
- The edition's author line is the shared author when there is one (Plato). Otherwise it shows the editors, with each piece's author on the contents list.
- The dates section explains how an anthology's date range is computed.
- Each volume of a multi-volume set (Ante-Nicene Fathers 1–10) is its own edition, grouped by set title and volume label. A Bible is an anthology too, listing its 66 books (plus the Apocrypha when included), entered by pasting a book list kept with the documentation.

**Authors**

One author record holds every name form (Augustine, Augustine of Hippo, Aurelius Augustinus), so searching any of them finds all his books. One form is marked preferred and sent to Zotero.

**Categories, tags and lists we build ourselves**

- A category is one broad grouping per work (e.g., Patristics). Tags are free topic labels (e.g., Christology, Stoicism). Both live on the work, so every edition and anthology containing it shares them.
- Locations are never tags. They have their own fields on each copy.
- Categories, tags, series, bindings, places, rooms, cases and shelves are created in the app as we type, with autocomplete afterward. They can be renamed or merged later. Nothing is created in advance.

**Wishlist**

A wishlist item is a small standalone record, not linked to any existing work. It holds the title, author, edition details (translator, publisher), ISBN if known, an optional cover, and one free note for why we want it, prices, or where we saw it. One tap of "I bought it" opens the normal entry form prefilled with these details and keeps the note. The item then leaves the wishlist. The wishlist is shared between us.

**Status, deleting and duplicates**

- **No longer owned:** the record stays, so its notes survive. It shows a clear "No longer in library" banner, a faded cover, and a badge in results. It is left out of counts, shelf lists, and value totals.
- **Deleting** moves a record to a trash we can restore from. Git history keeps everything regardless.
- **During entry only,** scanning an ISBN already in the catalog warns: "You already have this edition (Office › Case 2). Add another copy?"

**IDs and format versions**

- Every record gets a random permanent ID that is never changed or reused. Each book also has its own address in the app, which Zotero items link to.
- Every record carries a format version. An older copy of the app that meets newer data asks to be refreshed instead of changing anything.
- New fields can be added later without breaking older records. Lending, read/unread, and whose book it is are not in version 1.

## Original dates

Original dates live on the work, are typed naturally, and are never auto-filled. Online sources usually give the date of a translation or edition, not when the work was written, so auto-filling would quietly add wrong dates.

**Typing a date**

The date field accepts what a scholar writes, and the app shows a preview of how it read the entry before saving:

| You type | Stored as (earliest – latest) | Certainty |
| --- | --- | --- |
| 1689 | 1689 – 1689 | Exact |
| c. 397 | 397 – 397 | Circa |
| 397–400 | 397 – 400 | Range |
| 1530–59 | 1530 – 1559 | Range |
| 4th c. BC | −400 – −301 | Century |
| early 2nd c. | 101 – 133 | Century |
| after 1517 | 1517 – (open) | Open-ended |

The parser also handles forms such as "4th–5th c.", "mid-3rd c.", "397/398", "c. 1200 BC" and "fl. 1150". Centuries follow the historical convention: the 2nd century is 101–200, there is no year 0, and 1 BC is stored as −1. "Early", "mid" and "late" mean thirds of a century.

**What is stored**

- Display text: exactly what we typed.
- Earliest and latest year, with BC years stored as negative numbers.
- Certainty: exact, circa, range, century, open-ended, or disputed.
- Sort year: defaults to the earliest year. We can override it with a year of our choosing when we hold an opinion on the dating.
- An optional date type (composed, first published, delivered, first performed). It is hidden unless opened, because it is rarely needed.

**Disputed works**

A work can carry several datings, each with its own range and a free-text note on who holds it (for the Didache: "c. 50–70, early dating" and "c. 100–120, majority view"). One dating is marked as our working date, and sorting uses it. The extra datings are tucked behind a small "add another dating" link so the form stays simple.

**Edition dates are separate**

An edition records its own publication year and, for reprints, when the translation first appeared. A 2010 reprint of an 1871 translation shows both, beside the work's original date.

**Anthology dates**

- An anthology's date is computed from its contents: a range from the earliest to the latest working date of the works it contains, shown as, for example, "2nd–4th c. AD (12 works)".
- It sorts by its earliest date unless we override it with a year of our choosing.
- The range updates itself when contents or their dates change.
- The book page lists each contained work with its own date and flags any still missing one.
- Shelf lists show an anthology once, at its earliest date. A setting lists it under each contained work instead.

**Display and prompts**

- AD/BC by default, with a setting to switch to CE/BCE.
- A "needs original date" filter lists every work still missing one.
- The batch-add screen prompts for the original date when a scanned book's work has none. It can be skipped.

## Covers and images

Every cover is a JPEG in two sizes, made by one shared piece of code. JPEG was chosen because every phone can create it and it is the format most likely to open in 40 years. Safari can display WebP but cannot create it from a web page.

| Size | Approx. dimensions | Approx. file size | Where it lives |
| --- | --- | --- | --- |
| Grid thumbnail | 200 px tall | about 10 KB | Cached offline on every device for instant scrolling |
| Detail image | 600 px tall | about 40–60 KB | Loaded when a book is opened; cached once seen |

- A tiny blurred placeholder shows while images load.
- **Masters:** photos taken from the app are not saved to the phone's photo library, so a straightened master (1,600 px on the long side, high-quality JPEG) is kept in the data repo. Phones never download masters. The laptop page uses them to re-make covers later.
- **Found covers are imported automatically.** After a scan, a cover from Open Library (then Google Books) is downloaded and saved with no question. A cover under 400 px tall counts as not found. The review card shows it, with "Wrong cover? Take a photo".
- **Cover inbox:** laptop tools save downloaded covers (for example, from the Logos importer) into an inbox folder. A separate laptop page (`laptop/covers.html`, opened in a desktop browser, never loaded by phones) compresses them with the same code used for phone photos. Node cannot decode images without packages, which is why this is a browser page and not a Node tool. One image pipeline, no extra dependencies.
- **Generated tiles:** when no cover can be found, the tools create a clean, citation-style tile showing the title, subtitle and author, at the same size as other covers.
- Sizes and quality settings live in one clearly labeled settings block, so they are easy to tune later. Sharpness and beauty take priority over file size.
- Expected size: about 50–70 MB per 1,000 books with both sizes.

**Taking photos**

Most books need no photo: the online cover is used. Photos are for books with no findable cover (old, rare, custom), for a wrong online cover, and for spines, which are almost never online. Any book can always be given its own cover photo instead.

**Spines** are optional: any book can have a spine photo, and none is ever asked for. A spine shows on the book's page beside the cover and in the shelf view. Images are stored as a list, each marked with its kind (cover, spine), so another kind (a title page, say) can be added later without changing the format.

- Photos come from the phone's own camera, opened from the app, or from the photo library. This gives full resolution and needs no camera permission. The app's live camera is used only for barcode scanning.
- No particular background is needed, and the book can be held in the hand.
- The editor opens at once with the outline already placed: four corners for a cover; two edge lines and two end bars for a spine. Each handle snaps to a strong edge within a few pixels (never further), a magnifier shows under the finger, and the photo can be rotated in 90° steps and fine-straightened.
- Nothing is detected or saved automatically: every photo gets one look, usually one to three drags.
- No enhancement (white balance, lighting) in the app. If it is ever wanted, it belongs on the laptop page, working from masters.
- The result goes through the same compression. This is about 400 lines of plain code, loaded only when a photo is taken, with no outside library.

With about 4,000 Logos books, total cover storage should land near 300 MB, plus about 0.2 MB per photographed book for its master, comfortable for GitHub. Phones keep physical-book thumbnails offline (about 10 MB) and cache the rest once seen.

**Book sizes**

The shelf view draws every book at a believable size from the first day, and the sizes get more exact as data arrives. Only real values are stored; estimates are worked out each time from the current data, so better data replaces them by itself.

- **Height**, best source first: measured, catalog, the same series or set as a book whose height is known, then a typical height for its binding (about 17.5 cm for a mass-market paperback, 21.5 cm for a trade paperback, 23.5 cm for a hardback).
- **Thickness**, best source first: measured, a spine photo's shape times the height, a catalog value, then the page count times about 0.06 mm a page plus the covers (about 0.5 mm for a paperback, 5–6 mm for a hardback). Thin Bible paper comes out about twice too thick by page count; a spine photo corrects it.
- **Measuring is optional and never asked for.** When a spine photo is taken, a height box shows the current value with a small label saying where it came from ("23 cm · catalog", "~22 cm · guess"). A ruler is worth it only for a guess, usually an old or rare book. A height typed by a person is never overwritten.
- **Catalog heights** come from library records (the Library of Congress lists most books' heights, rounded up to the whole centimeter). A phone app cannot reach that service, which allows neither encrypted connections nor calls from web pages, so the laptop tool `loci-sizes` fetches them. It runs daily with the backup, and can be run by hand at any time.
- **No reference object** (such as a sheet of paper) is needed in photos. It would sit at a different depth from the spine, limit the book size, and add a step to every photo.
- **Later, if wanted:** one photo of a whole shelf would give the relative sizes of every book on it at once.

## App features and screens

The app has two tabs, **Library** and **Wishlist**, built from the same components. The look is modeled on Libib: minimal and modern on the surface, with full detail one tap away. The Library's main view shows physical books, with Logos books one tap away.

**Library and Wishlist views**

- A cover grid and a dense list view.
- **Shelf view:** for a location, spines stand side by side like the real shelf. A book with no spine photo gets a drawn spine (title and author set vertically in the design's colors, its width taken from the page count). The drawn spine's look is chosen by Jakob and his wife from several options, shown among real spine photos, before it is built.
- Sort by any field: title, subtitle, author, original date, edition year, binding, series, category, location, value, date added, and more.
- Filters by format (physical or Logos), location, category, tags, status, and "needs original date".
- **Saved views,** such as "Office shelves by original date" or "Greek texts by author".
- Shelf lists come from views sorted by original date. They are read on screen, not printed.

**Search** (works fully offline)

- Searches title, subtitle, original title, author names (any form), contributors, series, ISBN, notes, tags, and the works inside anthologies.
- Accents are ignored and Greek is transliterated, so "logos" also finds λόγος.
- Results group editions under their work ("*Confessions*: 3 editions"), expandable.
- Owned and wishlist items appear together in search, clearly labeled. When browsing, they stay in separate tabs.
- No-longer-owned copies appear faded with a badge. Logos books appear too, labeled "digital".

**Book detail page**

- Comprehensive data: work, edition and copy fields; all datings; notes; value with its history; location.
- Other editions of the same work, physical and Logos, listed together. An anthology lists its contents with each work's date, and any work lists the anthologies that contain it.
- The "cite" toggle on Logos books, plus a "No longer in library" banner when relevant.

**Batch add** (one screen for a whole stack or a single book; each book is reviewed as it is scanned, before the next scan)

1. Scan a barcode, or type an ISBN or title.
2. The book is looked up in Open Library, falling back to Google Books. If neither finds it, manual entry opens.
3. The app suggests a matching existing work ("Same work as *Confessions*?"), which we confirm with one tap. It never links automatically.
4. Missing critical fields are highlighted, each skippable: title, subtitle, author, original date, binding, publisher and edition year.
5. A found cover is saved automatically. If none was found, or it is wrong, take or choose a photo and line it up in the editor. Cover downloads and syncing run in the background and never hold up the next scan.
6. Next book, or finish.

If a scanned ISBN is already in the catalog, the screen warns before adding: "You already have this edition. Add another copy?" Phone cameras are the main way to scan, including for the first 1,000+ books. A USB barcode scanner would also work on the laptop if one is ever bought, since it types the ISBN like a keyboard. No extra code is needed for that.

**Value view**

Shows the total estimated value of owned books, totals by location, and a count of books with no value yet, plus a CSV export for an insurance agent. Logos books are left out of the insurance total, since digital licenses usually aren't covered as personal property. Their value can be shown as a separate total. The app never guesses prices. Estimating missing values is a separate tool.

**Settings**

Settings stay short, and every setting must earn its place. The defaults are chosen so most people never need to open settings. Settings that describe the library are shared between us and saved in the data repo. Settings about one screen apply to that device only.

*Shared*

- Date style: AD/BC or CE/BCE.
- Currency symbol.
- Anthologies in shelf lists: once at the earliest date, or under each contained work.
- Which empty fields batch-add prompts for (default: title, subtitle, author, original date, binding, publisher, edition year).
- Default sort for Library and Wishlist.
- Lookup sources: Open Library and Google Books, each on or off. Google Books may need a free API key per device; without one it can refuse requests, and the app carries on with Open Library and manual entry.
- Lists: rename or merge categories, tags, series, bindings and locations.

*This device*

- Theme: follow device, light, or dark.
- Library view: grid or list, and cover size (small, medium, large).
- Show Logos books in the main Library view (off by default).
- Scanning: camera or USB scanner, and a beep or vibration on success.
- Sync: key, data repo, status, "sync now", and the count of unsynced changes.

*Data and care*

- Exports: CSV, JSON, CSL-JSON, BibTeX. The HTML catalog is made on the laptop by `loci-backup`.
- Backups: date of the last daily mirror (reported by the laptop tool) and the yearly archive reminder.
- Trash, with restore.
- Self-test page.
- About: app version, data format version, MIT license, "Created by Jakob Nath".

*Deliberately not settings*

Custom fields, custom color themes, rearranging the form, and plugins. Each would multiply what can break. The look can still change through the single design-tokens file.

**Design process**

Before the full build, Claude Code makes five clickable prototypes. Each uses working navigation, real sample books, and the batch-add flow, on phone and desktop. Jakob and his wife choose and refine one together. Requirements from her: it should look nice, show the photos well, and have a little color, "just a little pop". The design step also produces a logo and app icon. Styling lives in one clearly separated file of design tokens, so the look can change later without touching logic.

## Laptop tools

All tools live in `my-loci-library-tools`, one independent folder each. They run on Node with zero npm packages and work on Windows and Linux. Every tool is safe to run any number of times, because it only changes what is different. They stay simple, though they are not bound by the app's size limits.

**logos-to-my-loci-library** (about 4,000 resources)

1. In Logos, filter the Library (for example, "added in the last 7 days") and use Print/Export to save a spreadsheet (CSV). This takes about 30 seconds.
2. Run the tool on that file. It matches rows by Logos resource ID and imports every resource type. It keeps every column Logos provides; columns without a matching field are stored on the record as extra Logos data.
3. It adds new books. On later runs it never overwrites a field we have edited in Loci: it only updates Logos-supplied fields we haven't touched, and writes a report of what changed.
4. An occasional full, unfiltered export lets it mark digital books that have disappeared from Logos as "no longer owned". Filtered exports never remove anything.
5. It suggests links between digital editions and works we already have, for confirmation. Logos anthologies come in as single books, and their contents can be added later by hand.
6. It fetches covers into the cover inbox, or generates a citation-style tile when none is found. The first import of about 4,000 covers is processed in batches over several sessions, with progress shown.

The tool never reads Logos's internal database, which would break whenever Logos changes. BibTeX export is a fallback only, since Logos's BibTeX has been reported to break other tools.

**my-loci-library-to-zotero**

- Syncs one way, from Loci into a "My Loci Library" collection in Zotero.
- Sends every physical book. Logos books go only when marked "cite", and wishlist items never go.
- Creates one Zotero item per edition. Two copies of one edition become one item, and a Logos edition is its own item. Every work inside an anthology that is sent to Zotero also gets its own Zotero "book section" item linked to the anthology, so a single piece can be cited in Chicago form. This can mean a few thousand extra items, which Zotero handles fine.
- Sets `original-date` so Chicago citations show the original date.
- Writes the shelf location and the book's permanent Loci link into Zotero fields, refreshed every run. Links use a fixed pattern containing only the record ID, so if the app's address ever changes, one run rewrites them all.
- Keeps the current Better BibTeX citekey pattern, author + edition year (Adler1972). It pins every key so it never changes. Same-author, same-year books get Better BibTeX's usual suffixes (Augustine1997a, Augustine1997b), and pinning stops those from shifting when new books arrive.
- Never deletes from Zotero, since Obsidian notes may cite those items. Books we no longer own, or delete from Loci, are tagged "Loci: no longer owned" or "Loci: removed".
- Keeps its own link file (Loci record → Zotero item) inside the data repo. The app never reads it.
- On the first run, links books we own that are already in Zotero and lets Loci take over their data, with a report of every difference it overwrote.
- Uses Zotero's local connection on the laptop, with Zotero's web API as a fallback.
- Speed target: under about 10 seconds to add one newly marked book. Only changed books are processed.
- Runs from a one-click shortcut on Windows and a matching command on Linux. The README explains optional scheduling with Windows Task Scheduler.

**loci-backup**

Runs daily through Windows Task Scheduler (or cron on Linux). It handles the daily mirror and the monthly export snapshot described under Backups in the architecture section, and then runs `loci-sizes`.

**loci-sizes**

Fills in catalog heights for books that have none, from library records found by ISBN (the Library of Congress first). It never overwrites a height a person typed, writes a short report of what it filled, and commits the changes to the data repo. It runs daily after `loci-backup` and from a one-click shortcut on Windows and a matching command on Linux. If the library service ever changes or disappears, nothing else depends on it: sizes simply stay estimated.

**Price estimator** (later)

A separate script that suggests values for books with none, using their other data. It never runs automatically, and its suggestions are reviewed before they are saved.

## How Loci, Zotero and Obsidian work together

Each tool has one job, so no fact is ever edited in two places, and data flows in one direction.

```
Logos export ──► logos-to-my-loci-library ──┐
                                            ▼
phones and laptop ◄──sync both ways──► My Loci Library data (private GitHub repo)
                                            │
                     my-loci-library-to-zotero (laptop, one way, in seconds)
                                            ▼
          Zotero › "My Loci Library" collection (each item links back to the book's page and shelf)
                                            │  pinned citekey
                                            ▼
          Obsidian (My Loci), unchanged, notes via Zotero Integration
```

Only the laptop tools cross between systems. The app itself never talks to Zotero or Obsidian.

| Tool | Its one job | Edit here |
| --- | --- | --- |
| My Loci Library | What we own: physical and Logos editions, notes, location, value | Book data, dates, notes, location |
| Zotero | Citing: citation data, PDFs and annotations, plus everything we don't own (articles, library books) | Non-Loci items only. Changes to Loci items are overwritten on the next sync |
| Obsidian (My Loci) | Thinking: the zettelkasten, commonplace notes, quotes | Notes and ideas |

**Citing while writing**

1. Mark a Logos book "cite" on the phone or laptop. Physical books are always sent.
2. Click the companion shortcut. The book reaches Zotero within about 10 seconds.
3. Cite it in Word or LibreOffice through Zotero's plugin, with Chicago showing the original date.
4. Import it into Obsidian with Zotero Integration exactly as today (Zotero must be open; Better BibTeX is installed).

**Obsidian note template**

Obsidian needs no changes. The Zotero Integration template stays exactly as it is, and notes never contain Loci links or shelf locations. From a note, the existing link to the Zotero item shows the book's current shelf location and its link back to Loci, both refreshed every sync.

**Citekeys and note names**

The existing pattern stays. Better BibTeX makes citekeys from author + edition year (Adler1972), and Zotero Integration names each note citekey + " - " + title ("Adler1972 - How to read a book"). Keys are pinned, so renaming a book in Loci never renames or breaks a note.

## Lightweight and long-lasting rules

These rules keep the app fast on any phone and working through years of iOS, Android and Windows updates. Claude Code follows them in every phase.

**Only proven web features**

- Use only features that are "Baseline widely available", meaning supported consistently in Safari (iOS and Mac), Chrome (Android and desktop), Edge and Firefox for at least 30 months.
- Anything newer is used only behind a check, with a working fallback. For example, Android's built-in barcode detector is used when present, while iPhones, where Safari still has it switched off, use the bundled scanner.
- Never use Chromium-only features (like direct folder access), push notifications, or anything experimental.

**Small and fast**

- Size budget: the app itself (HTML, CSS, JS) stays under about 100 KB. The barcode decoder (about 2 MB) is the one large file. It, the photo editor and the export code load only when used, and are then cached.
- System fonts by default, with at most one self-hosted typeface if the chosen design needs it.
- Long lists draw only the rows on screen, so 5,000 books scroll as smoothly as 50.
- Search uses a prebuilt, accent-free index kept with the offline copy, so results appear as you type.
- Images load lazily, and only at the size shown.

**Storage that can't lose data**

- Records live in IndexedDB, and app files in the service worker's Cache Storage. localStorage holds nothing important.
- The app asks the browser for persistent storage. Home-screen apps on iPhone are exempt from Safari's 7-day clearing of site data and get a large storage allowance.
- The local copy is treated as a cache of GitHub. If a phone ever clears it, the app simply downloads it again. The only risk is unsynced edits, so an "unsynced changes" badge stays visible until they reach GitHub.
- Every write checks for "storage full" errors and explains them plainly.

**Updates without surprises**

- A simple service worker serves the app offline and checks for a new version in the background. When one exists, a small "New version — reload" note appears. Nothing changes mid-task.
- App and data versions are checked against each other (see IDs and format versions).

**No single point of failure**

- The app is just static files. If GitHub Pages ever ends, they can be hosted anywhere, or opened from the laptop, with no code changes.
- All GitHub-specific code sits in one small sync module. Swapping GitHub for another storage service later means rewriting that one file.
- The app also works in an ordinary browser tab. In 2024 Apple briefly planned to remove home-screen web apps in the EU, then reversed course. If something like that ever happened for real, only the home-screen icon would be lost.
- Third-party code lives in a `vendor` folder, each file with its version, license and source noted. The goal is one library (the barcode decoder), and never more than two.

**Checked on real devices**

- Claude Code tests each phase in desktop browsers, including phone-sized views. Anything that needs a real phone goes on a running `DEVICE_CHECKS.md` list, which Jakob works through on his iPhone, an Android phone, and Windows (Edge, Chrome and Firefox) when convenient. Nothing waits on it.
- `HOW_IT_WORKS.md` includes a yearly ten-minute check: open the app on each device, run the self-test page, and fix anything red.

## Maintenance, testing and credits

The software won't wear out, but browsers, phones, GitHub and lookup services will change. Everything below makes a repair in 2035 quick, whether it's done by Jakob, another person, or any AI.

**Self-tests**

- The app has a plain test page: open it in a browser and it runs readable checks with clear pass/fail lines.
- The tools use Node's built-in test runner.
- Tests cover the date parser, the data format, search, exports, cover compression, sync, and the Zotero sync speed target.
- Tests are short and written so a human can read and fix them. They don't depend on any particular AI tool.
- Every Claude Code session starts by running the tests.

**Speed targets** (checked by the tests)

Targets are set for 10,000 books: up to about 6,000 physical (under 2,000 today) and about 4,000 Logos, with their works, copies and authors.

- Search results update within about 50 ms of each keystroke on a recent phone (100 ms on a 5-year-old one).
- Tapping a book opens its page within about 100 ms.
- The app opens and is usable within about 1 second on a recent phone (2 seconds on a 5-year-old one).
- Scrolling the whole library never stalls a frame for more than about 50 ms.
- After tapping Save on a scanned book, the next scan is ready within about 200 ms; a lookup shows within about 1.5 seconds on a good connection.
- Add one newly marked book to Zotero in under about 10 seconds.

The tests check these on the laptop against tighter budgets (search 10 ms, book page 16 ms, start 300 ms), leaving room for a phone about five times slower. The self-test page also runs on a phone, so the same timing lines are checked on the real devices through `DEVICE_CHECKS.md`.

**Documentation**

- `README.md`: what it is, how to set it up, and how to use it.
- `DATA_FORMAT.md`: every field, explained in plain language. This is the most important file in the project.
- `HOW_IT_WORKS.md`: a plain-English guide to the parts and how to fix each one, written for a future reader who remembers nothing.
- `SETUP_FOR_COLLEAGUES.md`: a roughly 10-minute guide for non-programmers (create a private data repo, open the app, add a key).
- `CLAUDE.md`: rules every Claude Code session must follow (see below).
- `CODE_STYLE.md`: how code is written, so any file can be understood and safely changed in five minutes.
- All of it reads as written by and for people, in a plain style with no AI tone.

**Rules in `CLAUDE.md`**

- No frameworks, no build step, no npm packages. Third-party code is copied into the repo.
- Never change the data format without updating `DATA_FORMAT.md` and keeping old records readable.
- Run the self-tests before and after every change.
- The app never talks to Zotero, Obsidian, or any AI service.
- No AI attribution in code, docs, or commit messages. Credit goes only to Jakob Nath.
- Prefer the simplest working solution, and record anything new under "Decisions" in `HOW_IT_WORKS.md`.

**Credits and license**

- "Created by Jakob Nath" appears in the README, the app's About screen, and the license.
- MIT license.
- Claude Code's commit co-author setting is turned off before the first commit.

## Deferred and out of scope

**Later, if wanted**

- The price estimator script.
- Title-page photo recognition for books without an ISBN.
- Shelf photos: one photo of a whole shelf giving every book's relative size, and perhaps its spine image.
- Lending, read/unread, and whose book it is (the format allows adding these).
- Colleague setup polish and announcing the project.
- Recompressing or enhancing covers on the laptop page, from masters.

**Never in the app**

- AI features of any kind, including "copy AI prompt" buttons. AI help is done by hand outside the app.
- Direct links to Zotero, Obsidian, or Logos. Those go only through laptop tools.
- Accounts, a hosted server, or app-store apps.
- Ratings, social features, or reading trackers.
- Printing shelf lists.

## Build phases (draft order)

The design prototypes come right after the foundations, so the look is chosen early. The data format follows, because everything else is built on it. All phases go into one `BUILD_PLAN.md` that Claude Code works through step by step. It stops only once, after the design prototypes.

1. **Foundations:** turn off commit co-author lines first. Claude Code then creates the repos with Git and the GitHub command line (`my-loci-library`, `my-loci-library-data`, `my-loci-library-tools`, plus `my-loci-library-test-data` for building), turns on GitHub Pages, and adds the license, `CLAUDE.md`, and doc skeletons.
2. **Design prototypes (as soon as possible):** five clickable options for phone and desktop, published on GitHub Pages so both of us can open them on our phones. They use the sample books as made-up data and show the library grid, book detail, and batch add. A small phone test page comes with them (camera barcode scan and offline storage), plus a logo and icon.
   - **The one stop:** Jakob and his wife choose and refine a design with Claude Code. Jakob runs the phone test page on both phones and provides a small Logos spreadsheet export. After Jakob says go, every phase below runs without stopping.
3. **Data format and core:** write `DATA_FORMAT.md`, turn the sample books into test data, and build the shared core module (record format, validation, date parser, anthology date ranges) with tests.
4. **Prove the remaining risky parts:** multi-file commits from a browser, compressing online covers in the browser, Zotero local writes and citekey pinning, and the columns in Jakob's Logos export. If one fails, Claude Code switches to the documented fallback and notes it in `HOW_IT_WORKS.md` instead of stopping.
5. **App skeleton:** storage built ready for sync, Library view (grid and list) in the chosen design, book detail, manual entry including anthology contents, and offline search.
6. **Batch add:** barcode scanning (camera, plus USB scanner input), Open Library and Google Books lookup with automatic cover import, work matching, missing-data prompts, duplicate warning, cover and spine photos with the manual editor and compression, and the laptop covers page.
7. **Sync:** against the test-data repo. Per-device keys, first-launch setup, conflict handling, expiry messages.
8. **Organizing:** locations, sorting, saved views, status rules, wishlist tab, trash, managed lists, settings.
9. **Value and exports:** value view, CSV, JSON, CSL-JSON, BibTeX, and the HTML catalog.
10. **Backups:** the `loci-backup` tool (daily mirror, monthly snapshot) and the yearly reminder. Real cataloging can begin once this phase is done.
11. **Logos importer.**
12. **Zotero companion.**
13. **Release:** finish the docs, write the colleague setup guide, and tag version 1.0. The app and tools repos are public from phase 1, since GitHub Pages and open source both need that.
14. **Later:** price estimator and other deferred items.

Sample books for phases 2 and 4: see `SAMPLE_BOOKS.md`.
