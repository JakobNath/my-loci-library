# Data format

This file describes every record and field in the catalog. It is the most important document in the project: if the app is ever lost, the data can be read, and a new app written, from this file alone.

Format version: **1** (November 2026).

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
  images/thumb/<id>.jpg     about 200 px tall
  images/detail/<id>.jpg    about 600 px tall
  images/master/<id>.jpg    1,600 px on the long side; only for our own photos
  images/inbox/             covers left by laptop tools, waiting to be processed
  catalog.json              all records in one file, built on the laptop for fast loading
  integrations/zotero-links.json   kept by the Zotero tool; the app never reads it
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
| `format` | number | The format version this record was written in. Currently 1. |
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
| `originalLanguage` | text or null | | "Latin", "Greek", "German"... |
| `datings` | list of datings | | When the work was written; see "Datings". Empty until a person adds one. Never filled from a lookup. |
| `sortYear` | number or null | | Our own choice of year to sort by, when we hold an opinion. Null means: the earliest year of the working dating. |
| `category` | text or null | | One broad grouping: "Patristics". |
| `tags` | list of text | | Free topic labels: "Christology". |

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
| `languages` | list of text | | The languages printed in it. Two make a diglot ("Greek", "English"), three a triglot. |
| `pages` | text or null | | The pages as printed: "xxviii, 311", or "89–132" for a journal issue. The app counts them (339; 44). |
| `height` | number or null | | In millimeters. |
| `heightSource` | text or null | | `measured` (a person) or `catalog` (a library record). |
| `thickness` | number or null | | In millimeters. |
| `thicknessSource` | text or null | | `measured`, `catalog` or `photo` (worked out from a spine photo and the height). |
| `medium` | text | yes | `physical` or `logos`. (Not called `format`, which is the record's format version.) |
| `logosId` | text or null | | The Logos resource ID, for a Logos edition. |
| `logosExtra` | object | | Columns from the Logos export that have no field of their own, kept as they came: `{ "Resource Type": "Monograph" }`. |
| `cite` | true or false | | For a Logos edition: send it to Zotero. Physical editions are always sent. |
| `images` | list | | Covers and spines; see "Images". |

Estimated sizes are never stored. When height or thickness is null, the app works them out each time from the other data, in the order given in `PLAN.md` under "Book sizes".

### Contents

Each entry:

| Field | Type | Meaning |
| --- | --- | --- |
| `work` | work ID | The work. |
| `extent` | text | `complete`, `selections`, or a free range: "Books I–IV". |
| `translator` | text or null | Only when this piece's translator differs from the edition's. |
| `pages` | text or null | Where it is in the book: "1–55". |

An anthology's date range is not stored. It is worked out from the working datings of its contents: from the earliest sort year to the latest year among them.

### Images

Each entry:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | text | The image's own ID. Its files are `images/thumb/<id>.jpg`, `images/detail/<id>.jpg` and, for our own photos, `images/master/<id>.jpg`. |
| `kind` | text | `cover` or `spine`. Later kinds can be added without changing the format. |
| `source` | text | `photo` (ours), `openlibrary`, `googlebooks`, `logos`, or `generated` (a citation-style tile). |
| `color` | text or null | For a cover: its main color as `#rrggbb`, worked out once when it was saved. Used for the edge of a drawn spine. |
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
  "bindings": ["Hardcover", "Hardcover with dust jacket", "Paperback", "Mass-market paperback", "Leather", "Bonded leather", "Cloth", "Library binding", "Journal issue"]
}
```

- `dateStyle`: `AD` (AD/BC) or `CE` (CE/BCE).
- `anthologiesInShelfLists`: `once` (at the earliest date) or `each` (under each contained work).
- Categories, tags, series, places and the like are not stored here: they are the values found on the records, and renaming one edits those records.

## catalog.json

All records in one file, so a device can load the catalog with one download:

```json
{ "format": 1, "built": "2026-11-09T22:00:00Z", "works": [], "editions": [], "copies": [], "authors": [], "wishlist": [] }
```

It is rebuilt on the laptop (by `loci-backup`, daily or on demand) and never edited by hand. Devices load it, then any record files changed after `built`. If it is ever lost or wrong, it can be rebuilt from the record files, which are always the truth.

## Merging

Each record carries, in `changed`, the moment each field was last edited. When two devices have both changed a record, the merged record takes each field from whichever side changed it last. A field changed on only one side keeps that change. Git history keeps every earlier version.

## Format versions

- Version 1: this document.
- When the format changes, the version number rises, this document says what changed, and the core module gains a `migrate` step that upgrades a version-1 record to version 2 (and so on, one version at a time), with tests. Old records are never silently reinterpreted.

## Examples

A work with a disputed dating (sample book #10):

```json
{
  "format": 1,
  "type": "work",
  "id": "d7dche0q2m4k",
  "title": "Didache",
  "subtitle": "The Teaching of the Twelve Apostles",
  "authors": [],
  "originalTitle": "Διδαχή",
  "originalLanguage": "Greek",
  "datings": [
    { "text": "c. 50–70", "earliest": 50, "latest": 70, "certainty": "circa", "kind": null, "note": "early dating", "working": false },
    { "text": "c. 100–120", "earliest": 100, "latest": 120, "certainty": "circa", "kind": null, "note": "majority view", "working": true }
  ],
  "sortYear": null,
  "category": "Patristics",
  "tags": ["Church order"],
  "trashed": null,
  "created": "2026-11-09T14:00:00Z",
  "changed": {}
}
```

An anthology edition (sample book #6, NA28; contents shortened here):

```json
{
  "format": 1,
  "type": "edition",
  "id": "n2a8ed7v1kcx",
  "title": "Novum Testamentum Graece",
  "subtitle": null,
  "contents": [
    { "work": "m4t7h3w2q9zk", "extent": "complete", "translator": null, "pages": null },
    { "work": "m4rk8x2p6ywa", "extent": "complete", "translator": null, "pages": null }
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
  "languages": ["Greek"],
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
    { "id": "g8c0na28cvr1", "kind": "cover", "source": "openlibrary", "color": "#2c3f6b", "master": false, "waiting": null }
  ],
  "trashed": null,
  "created": "2026-11-09T14:00:00Z",
  "changed": {}
}
```

A copy:

```json
{
  "format": 1,
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
  "format": 1,
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
  "format": 1,
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
