# Data format

This file describes every record and field in the catalog. It is the most important document in the project: if the app is ever lost, the data can be read, and a new app written, from this file alone.

Format version: **3** (November 2026). Version 1 and 2 records are still read; see "Format versions".

## The idea in one paragraph

The catalog is a folder of small text files, one per record, in JSON. A **work** is a piece of writing (Augustine's *Confessions*). An **edition** is one published form of one or more works (the Chadwick translation, Oxford World's Classics, 1991). A **copy** is one item we hold of an edition (our paperback, on the office shelf). An **author** record gathers every form of one person's name. A **wishlist item** is a book we want, kept apart from the library. Images (covers and spines) are JPEG files beside the records.

## Words

These words mean the same thing everywhere: in the data, the code, the screens and these documents.

| Word | Meaning |
| --- | --- |
| work | A piece of writing, independent of any printing: the *Confessions*, the *Didache*, the Gospel of Mark. |
| edition | One published form of one or more works: a translation, printing or Logos resource. |
| copy | One item we hold of an edition. Two copies of one edition are two copy records. |
| author | A person who wrote works, with every form of their name. |
| contents (of an anthology) | The ordered list of works inside an edition. An edition with one work has contents of one entry. |
| anthology | An edition whose contents hold more than one work. |
| dating | One opinion of when a work was written: a range of years, how certain it is, and an optional note. |
| working dating | The one dating of a work that we use for sorting. |
| sort year | The year a work sorts by: the earliest year of its working dating, unless a person overrides it. |
| earliest, latest | The first and last year a dating allows. Years BC are negative (1 BC is −1; there is no year 0). |
| certainty | How a dating is meant: exact, circa, range, century, open-ended. |
| location | Where a physical copy stands: place, room, case, shelf. |
| shelf order | A short text that sorts copies along their shelf. |
| binding | How a physical copy is bound (hardcover, paperback, leather...), from a list we extend. |
| series | A publisher's numbered series (Loeb Classical Library 36). |
| set | A multi-volume work published together (Chemnitz's Works, vol. 1). |
| wishlist item | A book we want; a standalone record, not linked to the library. |
| status | Whether we still hold a copy: owned, or one of the "no longer owned" reasons. |
| value | Our estimate of what a copy is worth, in the shared currency. |
| value history | Earlier values of a copy, one per day. |
| cover, spine | The two kinds of image a book can have. |
| thumbnail, detail image, master | The three sizes of every image (see "Images"). |
| cover inbox | A folder where laptop tools leave cover images for the laptop covers page to process. |
| trash | Records marked as deleted, which can be restored. |

"Book" is used in screens and in conversation for what a person means by it. It is never used as a field or record name.

## Folder layout

```
my-loci-library-data/
  works/<id>.json
  editions/<id>.json
  copies/<id>.json
  authors/<id>.json
  wishlist/<id>.json
  settings.json            settings shared by everyone using this catalog
  images/thumb/<id>.jpg     about 200 px tall (a spine 600 px)
  images/detail/<id>.jpg    about 1,000 px tall (a spine 1,600 px); images made before 2026-11-11 are 600 px
  images/master/<id>.jpg    1,600 px on the long side; only for our own photos
  images/inbox/             covers left by laptop tools, waiting to be processed
  catalog.json              all records in one file, built on the laptop for fast loading
  backup-status.json        when the laptop last backed up, kept by loci-backup
  integrations/zotero-links.json   kept by the Zotero tool; the app never reads it
  integrations/logos-import.json   kept by the Logos importer; the app never reads it
  integrations/enrich.json         kept by loci-enrich; the app never reads it
  integrations/answers/<id>.json.gz  each book's raw answers from the sources, kept by loci-enrich
```

Each record's file name is its ID. Nothing else about a record is in its file name, so renaming a book never renames a file.

## Writing the files

- UTF-8, pretty-printed with two spaces, keys always in the order given in this document, and a newline at the end.
- Fields with no value are written as `null` (or `[]` for lists, `""` for notes), never left out, so every record of a type has the same shape.
- Dates are written as `YYYY-MM-DD`; moments as UTC timestamps, `YYYY-MM-DDTHH:MM:SSZ`.
- Money is a plain number in the shared currency (see `settings.json`), with no symbol.

## IDs

Every record and every image has an ID: 12 characters from the alphabet `0123456789abcdefghjkmnpqrstvwxyz` (digits and lowercase letters without i, l, o, u, so they are easy to read aloud), made from random numbers. Example: `k7q2m9xv4hbt`. There are about 10^18 possible IDs, so two devices will not invent the same one.

An ID is permanent. It is never changed, and never reused, even after a record is deleted. Each book's address in the app (`#/book/<edition id>`) and its link from Zotero use it.

## Fields every record has

| Field | Type | Meaning |
| --- | --- | --- |
| `format` | number | The format version this record was written in. Currently 3. |
| `type` | text | `work`, `edition`, `copy`, `author` or `wishlist`. |
| `id` | text | The record's ID (see above). |
| ... | | The fields of its type, in the order listed below. |
| `trashed` | date or null | The day the record was moved to the trash; null if it is not in the trash. Restoring sets it back to null. |
| `created` | timestamp | When the record was created. Never changes. |
| `changed` | object | For each field that has ever been edited, the moment of its last edit: `{ "title": "2026-11-09T14:03:00Z" }`. Used to merge edits (see "Merging"). |

An app that meets a record whose `format` is higher than it knows asks to be refreshed and writes nothing.

## Work

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `title` | text | yes | The work's usual English title: "Confessions". |
| `subtitle` | text or null | | |
| `authors` | list of author IDs | | In order. Empty for anonymous works (the *Didache*). |
| `originalTitle` | text or null | | The title in its original language: "Confessiones". Searched too. |
| `otherTitles` | list of text | | Other titles and standard abbreviations it is known by: "Ethica Nicomachea", "Eth. Nic.". All searched. (Version 3.) |
| `originalLanguage` | text or null | | "Latin", "Greek", "German"... |
| `datings` | list of datings | | When the work was written; see "Datings". Empty until a person adds one. Never filled from a lookup. |
| `sortYear` | number or null | | Our own choice of year to sort by, when we hold an opinion. Null means: the earliest year of the working dating. |
| `category` | text or null | | One broad grouping: "Patristics". |
| `tags` | list of text | | Free topic labels: "Christology". |
| `wikidata` | text or null | | The work's Wikidata ID, "Q244161" for *Phaedo*, when known. Two works with the same ID are the same work. (Version 3.) |

### Datings

Each dating is an object:

| Field | Type | Meaning |
| --- | --- | --- |
| `text` | text | Exactly what a person typed: "c. 397–400", "early 2nd c.", "after 1517". |
| `earliest` | number or null | The first year the dating allows. BC years are negative. Null only for "before ..." datings. |
| `latest` | number or null | The last year it allows. Null for open-ended datings ("after 1517"). |
| `certainty` | text | `exact`, `circa`, `range`, `century` or `open`. |
| `kind` | text or null | Rarely needed: `composed`, `first published`, `delivered`, `first performed`. |
| `note` | text | Who holds this dating, or why: "majority view". May be empty. |
| `working` | true or false | Exactly one dating of a work is the working dating, used for sorting. |

A work with more than one dating is a disputed work. Its datings are kept side by side and none is lost.

How typed dates are read (the app shows its reading before saving):

| Typed | earliest | latest | certainty |
| --- | --- | --- | --- |
| 1689 | 1689 | 1689 | exact |
| c. 397 | 397 | 397 | circa |
| 397–400 | 397 | 400 | range |
| 1530–59 | 1530 | 1559 | range |
| 397/398 | 397 | 398 | range |
| 4th c. BC | −400 | −301 | century |
| early 2nd c. | 101 | 133 | century |
| mid-3rd c. | 234 | 266 | century |
| late 5th c. | 467 | 500 | century |
| 4th–5th c. | 301 | 500 | century |
| after 1517 | 1517 | null | open |
| before 1517 | null | 1517 | open |
| 1554– | 1554 | null | open |
| c. 1200 BC | −1200 | −1200 | circa |
| fl. 1150 | 1150 | 1150 | circa |

Centuries follow the historical convention: the 2nd century is 101–200, the 4th century BC is 400–301 BC. "Early", "mid" and "late" are thirds of a century (for the 2nd century: 101–133, 134–166, 167–200). A hyphen, an en dash or the word "to" all mean a range.

## Edition

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `title` | text | yes | The title as printed: "The Confessions". |
| `subtitle` | text or null | | As printed. |
| `contents` | list | yes | The works in this edition, in order; see "Contents". At least one. |
| `contributors` | list | | `{ "name": "Henry Chadwick", "role": "translator" }`. Roles: `translator`, `editor`, `introduction`, `illustrator`, `other`. Authors come from the works, not from here. |
| `publisher` | text or null | | |
| `place` | text or null | | Place of publication. |
| `year` | number or null | | The year this edition or printing was published. |
| `editionStatement` | text or null | | As printed: "3rd ed.", "28th revised edition". |
| `translationFirstPublished` | number or null | | For a reprint of an older translation: the year the translation first appeared. |
| `series` | text or null | | "Loeb Classical Library". |
| `seriesNumber` | text or null | | "36". Text, because some are "38A". |
| `set` | text or null | | "Chemnitz's Works". |
| `volume` | text or null | | The volume label within the set: "1", "I/1". |
| `isbn` | text or null | | ISBN-13, digits only. An ISBN-10 is converted when entered. |
| `identifiers` | object | | The edition's catalogue numbers, from library records; see "Identifiers". (Version 2.) |
| `languages` | list of text | | The languages printed in it. Two make a diglot ("Greek", "English"), three a triglot. |
| `subjects` | list of text | | Subject headings from library records, as the library writes them: "Christian saints -- Algeria -- Hippo (Extinct city) -- Biography". (Version 2.) |
| `foundContents` | list | | Works a library record lists for a book entered as one work, waiting for a person to confirm them: `{ "author": "Plato", "title": "Phaedo", "extent": null }`. Written by the laptop tool `loci-enrich`; emptied when the person accepts or declines them. (Version 3.) |
| `pages` | text or null | | The pages as printed: "xxviii, 311", or "89–132" for a journal issue. The app counts them (339; 44). |
| `height` | number or null | | In millimeters. |
| `heightSource` | text or null | | `measured` (a person) or `catalog` (a library record, Open Library or Google Books). |
| `thickness` | number or null | | In millimeters. |
| `thicknessSource` | text or null | | `measured`, `catalog` or `photo` (worked out from a spine photo and the height). |
| `medium` | text | yes | `physical` or `logos`. (Not called `format`, which is the record's format version.) |
| `logosId` | text or null | | The Logos resource ID, for a Logos edition. |
| `logosExtra` | object | | Columns from the Logos export that have no field of their own, kept as they came: `{ "Resource Type": "Monograph" }`. |
| `cite` | true or false | | For a Logos edition: send it to Zotero. Physical editions are always sent. |
| `images` | list | | Covers and spines; see "Images". |

Estimated sizes are never stored. When height or thickness is null, the app works them out each time from the other data, in the order given in `PLAN.md` under "Book sizes".

### Identifiers

An object with six keys, always in this order, each text or null when unknown (`openLibrary` and `hathiTrust` from version 3):

| Key | Meaning |
| --- | --- |
| `lccn` | Library of Congress control number: "2008491261". |
| `oclc` | OCLC (WorldCat) number: "228195188". |
| `lcc` | Library of Congress call number: "BR65.A6 E5 2008". |
| `ddc` | Dewey decimal number, without the slashes some catalogues print: "891.733". |
| `openLibrary` | Open Library's edition ID: "OL23154103M". |
| `hathiTrust` | HathiTrust's record number: "003879580". It gives the link to a free scan of the book, when HathiTrust has one. |

```json
"identifiers": { "lccn": "2008491261", "oclc": "228195188", "lcc": "BR65.A6 E5 2008", "ddc": "270.2092", "openLibrary": "OL23154103M", "hathiTrust": null }
```

### Contents

Each entry:

| Field | Type | Meaning |
| --- | --- | --- |
| `work` | work ID or null | The work; null for a piece (below). |
| `piece` | object or null | A short work kept inside this book instead of as a work record (version 3): a poem, hymn, sermon or letter. See below. Null for a work. |
| `extent` | text | `complete`, `selections`, or a free range: "Books I–IV". |
| `translator` | text or null | Only when this piece's translator differs from the edition's. |
| `pages` | text or null | Where it is in the book: "1–55". |
| `cite` | true or false | Send this work to Zotero as a section of the book (version 3). |

A **piece** holds `title` (required), `author` (a name as typed, or null), `originalTitle` (or null) and `date` (the original date as typed or listed, read by the date parser when shown, or null). A library volume of short poems or sermons would otherwise make hundreds of works, each to be dated and categorized; a piece can be made a full work at any time, and then its entry holds the work's ID instead.

An anthology's date range is not stored. It is worked out from the working datings of its contents: from the earliest sort year to the latest year among them.

### Images

Each entry:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | text | The image's own ID. Its files are `images/thumb/<id>.jpg`, `images/detail/<id>.jpg` and, for our own photos, `images/master/<id>.jpg`. |
| `kind` | text | `cover`, `spine`, or `contents` (a photo of a contents page, taken while adding when no catalog lists the works; 1.10.0). Later kinds can be added without changing the format. |
| `source` | text | `photo` (ours), `openlibrary`, `googlebooks`, `logos`, or `generated` (a citation-style tile). |
| `color` | text or null | For a cover: its main color as `#rrggbb`, worked out once when it was saved. Used for the edge of a drawn spine. |
| `ratio` | number or null | The image's width divided by its height. For a spine photo this gives the book's thickness from its height. |
| `master` | true or false | Whether a master file exists. |
| `waiting` | text or null | The address of a cover the app could not download itself (Google Books covers), for a laptop tool to fetch into `images/inbox/`. Null once the image files exist. |

The first cover in the list is the one shown.

## Copy

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `edition` | edition ID | yes | |
| `binding` | text or null | | From the binding list. Physical only. |
| `location` | list of text | | Place, room, case, shelf, as far as known: `["Home", "Office", "Case 2", "Shelf 3"]`. Physical only. |
| `shelfOrder` | text or null | | Sorts copies along a shelf (see below). Physical only. |
| `markings` | true or false | | Writing or markings when acquired. |
| `added` | date | yes | The day it was added to the catalog. Set automatically. |
| `acquired` | text or null | | When we got it, as typed: "2019", "before 2015", or null. |
| `price` | number or null | | What we paid. |
| `value` | number or null | | Our current estimated value. |
| `valueHistory` | list | | Earlier values, newest last: `{ "date": "2026-11-09", "value": 45 }`. Several changes on one day keep only that day's last value. Entries can be deleted. |
| `notes` | text | | One free notes box: why we own it, why this edition, gifts, condition. |
| `status` | text | yes | `owned`, or no longer owned: `given away`, `sold`, `lost`, `gone from Logos`. |

**Shelf order.** A short text made of the digits and letters in the ID alphabet. Copies on a shelf sort by it, as text. To place a copy between two others, the app makes a text that sorts between theirs (between `m` and `n` is `mg`), so only the moved copy changes. Copies without one follow the library's sort order, after those that have one.

## Author

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | text | yes | The preferred form, as shown and sent to Zotero: "Augustine". |
| `otherNames` | list of text | | Every other form, all searched: "Augustine of Hippo", "Aurelius Augustinus". |
| `sortName` | text or null | | How the name sorts: "Chemnitz, Martin". Null means: the last word of `name` first. |

## Wishlist item

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `title` | text | yes | |
| `subtitle` | text or null | | |
| `authors` | list of text | | Names as typed, not author records. |
| `contributors` | list | | As for an edition. |
| `publisher` | text or null | | |
| `isbn` | text or null | | |
| `images` | list | | As for an edition. |
| `notes` | text | | Why we want it, prices, where we saw it. |

When a wishlist item is bought, the app opens the normal entry form filled from it, keeps its note on the new copy, and moves the item to the trash.

## settings.json

Settings shared by everyone using the catalog. Device settings (theme, view, sync key) stay on each device and are never written here.

```json
{
  "format": 1,
  "dateStyle": "AD",
  "currency": "$",
  "anthologiesInShelfLists": "once",
  "batchAddPrompts": ["title", "subtitle", "authors", "datings", "binding", "publisher", "year"],
  "defaultSort": { "library": "title", "wishlist": "added" },
  "lookups": { "openLibrary": true, "googleBooks": true },
  "bindings": ["Hardcover", "Hardcover with dust jacket", "Paperback", "Mass-market paperback", "Leather", "Bonded leather", "Cloth", "Library binding", "Journal issue"],
  "views": [
    { "name": "Office by original date", "medium": "physical", "sort": "originalDate", "status": "owned", "location": ["Home", "Office"], "category": "", "tag": "", "needsDate": false, "needsDetails": false }
  ]
}
```

- `dateStyle`: `AD` (AD/BC) or `CE` (CE/BCE).
- `anthologiesInShelfLists`: `once` (at the earliest date) or `each` (under each contained work).
- `views`: the saved views, in the order they are shown. `medium` is `physical`, `logos` or `all`; `sort` names a sort (`title`, `subtitle`, `author`, `originalDate`, `year`, `added`, `value`, `location`, `binding`, `category`, `publisher`, `pages`, `series`); `status` is `owned`, `gone` (any status but owned), `all`, or one copy status; `location` is a place path and includes everything inside it; an empty `category` or `tag` means any; `needsDate` shows only books with a work that has no original date, and `needsDetails` only physical books missing a publisher, year, pages or binding (added 11 November 2026; a view saved before then lacks it and counts as false).
- Keys are written in the order shown. A key missing from the file takes the value shown here.
- Categories, tags, series, places and the like are not stored here: they are the values found on the records, and renaming one edits those records.

## sets/ (in the app, not in the catalog)

Known sets: checked contents lists of large sets (Great Books of the Western World, Luther's Works, Loeb), one plain text file each in the app's `sets/` folder, public like the app, since titles and dates are facts. Adding a volume of a known set takes its works from the list (PLAN.md, "Anthologies"). They are read by `core/known-sets.js`. A line starting with `#` is a note.

```
set: Great Books of the Western World
publisher: Encyclopaedia Britannica
place: Chicago
year: 1990
edition: 2nd ed.
isbn: 9780852295311
checked: 2026-11-12 Jakob Nath

volume: 6 | Plato
Plato — Euthyphro | Εὐθύφρων | Greek — c. 399–395 BC | trans. Benjamin Jowett | pp. 1–8
Edgar Allan Poe — The Raven | | English — 1845 | piece
```

- The set lines give the set's shared facts. An `isbn:` line is an ISBN printed on every volume (Great Books prints one for the whole set); a volume's own ISBNs follow its label and title on its `volume:` line.
- Each work line is "Author — Title", then, separated by `|`: the original title, "Language — original date" (as a person types a date), and any of `trans. <translator>`, `pp. <pages>` and `piece` (a short work kept inside the book's contents rather than as a work). An empty part keeps its separators.
- Every list is checked before it is used: each line against two sources, and the disagreements and a sample by a person. The person then adds the `checked:` line, with the date and their name. Only a list with that line has its dates filled in without another tap (each marked "from the <set> list" in its dating's note); a list without it offers its dates, and a person accepts them with one tap, as for Wikidata's.
- A list with any line that cannot be read is not used at all, since a half-read list could give a volume the wrong works. The tests read every list in `sets/`.
- Each list is named in `ui/known-sets.js` and kept by the service worker, so it works offline. The laptop tools keep a copy, made by `update-core`.

## catalog.json

All records in one file, so a device can load the catalog with one download:

```json
{ "format": 1, "built": "2026-11-09T22:00:00Z", "works": [], "editions": [], "copies": [], "authors": [], "wishlist": [] }
```

It is rebuilt on the laptop (by `loci-backup`, daily or on demand) and never edited by hand. Each record in it is exactly as its file stores it, in that file's format version, so a device can tell which files it need not download. A test catalog also carries `"testData": true`; the app's development loader accepts only catalogs that do, and the real catalog never does. Devices load it, then any record files changed after `built`. If it is ever lost or wrong, it can be rebuilt from the record files, which are always the truth.

## integrations/zotero-links.json

Kept by the Zotero tool: the Zotero collection, and for each record sent (an edition, or "<edition id>/<work id>" for a section of an anthology) its Zotero item key, its pinned citation key, a fingerprint of what was last sent, whether a section has been related to its anthology, and, for a book, the key and title of the link attached under it (`attachment`, `attachmentTitle`). No person edits it, and the app never reads it. If it is lost, the next run links the books already in Zotero again, as on a first run.

```json
{ "format": 1, "collection": "ABCD2345", "items": { "chadw1ck1991": { "key": "QW3RTY78", "citationKey": "Augustine1991", "sent": "5f0c1a2b3c4d5e6f" } } }
```

## integrations/logos-import.json

Kept by the Logos importer: for each Logos resource ID, the edition fields as the importer last wrote them. On the next import a field is updated only if it still holds that value, so a field edited in the app is never overwritten. No person edits it; if it is lost, the next import simply treats every filled field as edited and changes nothing.

```json
{ "format": 1, "imported": { "LLS:PIEPER1": { "title": "Christian Dogmatics", "subtitle": null, "publisher": "Concordia Publishing House", "year": 1950, "series": null, "languages": ["English"], "isbn": "9780570067130", "logosExtra": { "Resource Type": "Monograph" } } } }
```

## integrations/enrich.json

Kept by the laptop tool `loci-enrich`: for each edition it asked about, what it asked by (the ISBN, or for a book without one `lccn:<number>` or `oclc:<number>`), the day, whether any source knew the book, every value it wrote (`work.` before a field of the edition's work), and which source gave each (`from`, added 11 November 2026; books asked before then lack it). A field it once wrote is never written again, so a value a person changed or cleared stays as they left it. `wikidataChecked` (from 12 November 2026) is the day the stored Wikidata IDs of works were last checked; they are checked again after 90 days.

```json
{ "format": 1, "books": { "chadw1ck1991": { "isbn": "9780199537822", "asked": "2026-11-10", "found": true, "wrote": { "height": 200, "work.originalLanguage": "Latin" }, "from": { "height": "Library of Congress", "work.originalLanguage": "Library of Congress" } } } }
```

## integrations/answers/

Kept by `loci-enrich` (added 11 November 2026): one file per edition asked, named by the edition's ID, holding the sources' answers exactly as they were sent, so they can be read again if a source changes its answers or closes. Each file is gzip-compressed JSON (any unzip tool opens it), written again only when an answer differs from the one kept. Google Books' answers are not kept. No person edits these files, and the app never reads them; if they are lost, nothing else is.

```json
{ "format": 1, "isbn": "9780199537822", "asked": "2026-11-11", "answers": { "HathiTrust": "{…}", "Library of Congress": "<?xml …", "Open Library": "{…}" } }
```

## backup-status.json

Written by the laptop tool `loci-backup`, read by the app to show the last backup and the yearly archive reminder. No person edits it.

```json
{ "format": 1, "firstBackup": "2026-11-10T03:00:00Z", "lastMirror": "2026-11-12T03:00:00Z", "lastSnapshot": "2026-11", "lastArchive": null }
```

- `firstBackup`: the first daily backup ever made; the yearly reminder counts from it until there is an archive.
- `lastMirror`: the last copy of the data repository into the backup folder.
- `lastSnapshot`: the month of the last saved exports and HTML catalog.
- `lastArchive`: the last full archive to an external drive, or null.

## Merging

Each record carries, in `changed`, the moment each field was last edited. When two devices have both changed a record, the merged record takes each field from whichever side changed it last. A field changed on only one side keeps that change. Git history keeps every earlier version.

## Format versions

- Version 1 (November 2026): the first format.
- Version 2 (November 2026): each edition gained `identifiers` and `subjects`. A version-1 edition is read as version 2 with `identifiers` all null and `subjects` empty; any other version-1 record only changes its `format`. Nothing else changes, and a version-1 file stays as it is until the record is next saved.
- Version 3 (November 2026): each work gained `otherTitles` and `wikidata`; each edition gained `foundContents` and the identifiers `openLibrary` and `hathiTrust`; each contents entry gained `piece` and `cite`, and its `work` may be null for a piece. A version-2 work is read with no other titles and no Wikidata ID; a version-2 edition with both new identifiers null, nothing found, and every contents entry a work (`piece` null) not cited. Other records only change their `format`. A version-2 file stays as it is until the record is next saved.
- Every program that reads records reads them through `migrate` in `core/records.js`, which upgrades a record one version at a time, with tests. A record newer than the program is never changed: the app asks to be refreshed and writes nothing. Old records are never silently reinterpreted.
- When the format changes again: raise the version, say here what changed, and add the next step to `migrate`.

## Examples

A work with a disputed dating (sample book #10):

```json
{
  "format": 3,
  "type": "work",
  "id": "d7dche0q2m4k",
  "title": "Didache",
  "subtitle": "The Teaching of the Twelve Apostles",
  "authors": [],
  "originalTitle": "Διδαχή",
  "otherTitles": ["The Teaching of the Twelve Apostles"],
  "originalLanguage": "Greek",
  "datings": [
    { "text": "c. 50–70", "earliest": 50, "latest": 70, "certainty": "circa", "kind": null, "note": "early dating", "working": false },
    { "text": "c. 100–120", "earliest": 100, "latest": 120, "certainty": "circa", "kind": null, "note": "majority view", "working": true }
  ],
  "sortYear": null,
  "category": "Patristics",
  "tags": ["Church order"],
  "wikidata": "Q210752",
  "trashed": null,
  "created": "2026-11-09T14:00:00Z",
  "changed": {}
}
```

An anthology edition (sample book #6, NA28; contents shortened here):

```json
{
  "format": 3,
  "type": "edition",
  "id": "n2a8ed7v1kcx",
  "title": "Novum Testamentum Graece",
  "subtitle": null,
  "contents": [
    { "work": "m4t7h3w2q9zk", "piece": null, "extent": "complete", "translator": null, "pages": null, "cite": false },
    { "work": "m4rk8x2p6ywa", "piece": null, "extent": "complete", "translator": null, "pages": null, "cite": false }
  ],
  "contributors": [
    { "name": "Barbara Aland", "role": "editor" },
    { "name": "Kurt Aland", "role": "editor" }
  ],
  "publisher": "Deutsche Bibelgesellschaft",
  "place": "Stuttgart",
  "year": 2012,
  "editionStatement": "28th revised edition",
  "translationFirstPublished": null,
  "series": null,
  "seriesNumber": null,
  "set": null,
  "volume": null,
  "isbn": "9783438051400",
  "identifiers": { "lccn": null, "oclc": null, "lcc": null, "ddc": null, "openLibrary": null, "hathiTrust": null },
  "languages": ["Greek"],
  "subjects": [],
  "foundContents": [],
  "pages": "89*, 890",
  "height": null,
  "heightSource": null,
  "thickness": null,
  "thicknessSource": null,
  "medium": "physical",
  "logosId": null,
  "logosExtra": {},
  "cite": false,
  "images": [
    { "id": "g8c0na28cvr1", "kind": "cover", "source": "openlibrary", "color": "#2c3f6b", "ratio": 0.6667, "master": false, "waiting": null }
  ],
  "trashed": null,
  "created": "2026-11-09T14:00:00Z",
  "changed": {}
}
```

A copy:

```json
{
  "format": 3,
  "type": "copy",
  "id": "c0pyna280001",
  "edition": "n2a8ed7v1kcx",
  "binding": "Hardcover",
  "location": ["Home", "Office", "Case 2", "Shelf 1"],
  "shelfOrder": "m",
  "markings": true,
  "added": "2026-11-09",
  "acquired": "2015",
  "price": 54,
  "value": 45,
  "valueHistory": [{ "date": "2026-11-09", "value": 45 }],
  "notes": "Seminary copy. Underlining in Romans.",
  "status": "owned",
  "trashed": null,
  "created": "2026-11-09T14:00:00Z",
  "changed": {}
}
```

An author:

```json
{
  "format": 3,
  "type": "author",
  "id": "a7g5s9t1n0e2",
  "name": "Augustine",
  "otherNames": ["Augustine of Hippo", "Aurelius Augustinus"],
  "sortName": null,
  "trashed": null,
  "created": "2026-11-09T14:00:00Z",
  "changed": {}
}
```

A wishlist item:

```json
{
  "format": 3,
  "type": "wishlist",
  "id": "w1shgerhard7",
  "title": "Theological Commonplaces",
  "subtitle": "On the Nature of Theology and on Scripture",
  "authors": ["Johann Gerhard"],
  "contributors": [{ "name": "Richard J. Dinda", "role": "translator" }],
  "publisher": "Concordia Publishing House",
  "isbn": null,
  "images": [],
  "notes": "Any volume of the CPH set; about $45 new.",
  "trashed": null,
  "created": "2026-11-09T14:00:00Z",
  "changed": {}
}
```
