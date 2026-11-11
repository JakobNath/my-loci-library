# Interface notes

Things Jakob has noticed while testing on his phones, kept for the interface review (build plan step 8.6). Each note says what was seen, and what has been done so far. Add new notes at the end; tick a note once the review has dealt with it.

## Adding books

- [x] The single review card was clunky, not step by step, sometimes too wordy and sometimes not explaining enough, and did not ask enough (2026-11-10). Done: batch add asks one question per screen (version 0.6.2). To check in the review: whether each step's wording is now the right length, and whether any step should be added, merged or dropped.
- [x] It was hard to tell that a scan had worked (2026-11-09). Done: beep, green glow with "✓ Read", and a buzz on Android (0.6.1).
- [x] The year of the printing was taken for the original date (2026-11-09). Done: the date step asks "When was this work written? (not this printing)" with labelled suggestions (0.6.1, 0.6.2).
- [x] No photo was asked for when no cover was found (2026-11-10). Done: the cover is checked during the steps (0.6.2).
- [ ] Looked-up data is sometimes poor: titles in lower case (done: title case), wrong or missing covers (done: checked and a photo offered), wrong or missing details (publisher, year, pages). To review: whether "Fix details" is enough, or more should be asked.

## Photo editor

- [x] A corner moved away from where it was placed when let go (2026-11-10). Done: no snapping; handles stay where they are let go (0.6.3).
- [x] The magnifier was too close and hard to see (2026-11-10). Done: two magnifiers, 1.5× and 3×, away from the finger, centred on the point being placed, with the outline drawn in (0.6.3).
- [x] Reviewed (2026-11-11): the straighten slider was not needed and is gone (0.8.4); dragging was not raised as a problem.
- [x] Spine photos were too blurry to read, and covers were soft (2026-11-11). Done: spines are kept 1,600 px tall (600 px in the shelf view) and covers 1,000 px, both lightly sharpened after shrinking (0.8.4). Pictures taken before then keep their old size; the laptop can re-make them from their masters later.

## Spines

- [x] A spine photo did not show in the shelf view, and could not be seen on the book page (2026-11-10). Done: both show it (0.6.2).

## General

- [ ] Some parts of the interface could be better ("some UI systems could be improved", 2026-11-10). To review screen by screen with Jakob: the library grid and list, search, the book page, the shelf view, settings, and the phone feel overall (too much scrolling, small buttons and text, the camera size: partly done in 0.6.2).

## Review with Jakob, round 1 and 2 (2026-11-11)

- [x] Library screen: fine as it is.
- [x] Book page: the cover was too big on a phone. Done: the cover (with any spine photo) takes about a third of the width, and tapping it shows the pictures full size (0.8.4).
- [x] Adding books was not quite clear enough at four points; slight improvements were wanted. Done (0.8.4):
  - Where am I: each step is headed "Step 3 of 7: Original date · <title>".
  - Did it look it up: the screen says which service it is asking ("Looking up ISBN … on Open Library…", then Google Books if needed), and the first step says where the book was found.
  - What a step wants: every step has one plain line saying what to do.
  - Was it saved: a green line at the top of the scan screen says "✓ Saved: <title> on <place>. Ready for the next book."

## Review with Jakob, round 3 (2026-11-11)

- [x] Search: fine as it is.
- [x] Settings: good as it is.
- [x] Phone feel (scrolling, sizes, camera): good now.
- [x] Wishlist: adding an item should find the book and its cover, not ask for everything by hand; an Amazon link should work. Done (0.8.5): a find box takes a title (results as you type, with small covers), an ISBN, or an Amazon link (its ISBN is read from the address; Amazon is never contacted). The item gets its cover, falling back to the work's cover when the edition has none, and "I bought it" carries the cover into the library.
- [ ] Shelf view: to be reviewed once several dozen real books are on a shelf (build step 13.0).
- [x] Settings was crowded, and the trash would take too much room; most settings are of no interest to everyone (2026-11-11). Done (0.8.6): a short main page, with Trash, Rename and merge, and Advanced on pages of their own.
- [x] The book page left wide empty space beside the small cover (2026-11-11). Done (0.8.6): title, author, dates, shelf and Edit sit beside the cover.

## Second tour, Jakob and his wife (2026-11-11)

- [x] Photo editor: the magnifiers jumped sides when dragging near the middle, a thumb covered them near the top, and a cover had two that looked different. Done (1.2.0): they stay put for a drag and sit away from the thumb; a cover has one.
- [x] A way to see the result while lining up a photo. Done (1.2.0): hold the photo away from the outline, or tap Preview.
- [x] Spine photos sometimes came out crooked. Done (1.2.0): a spine's edge moves only across itself; its ends can be tilted.
- [x] Library grid: too much space between title and author. Done (1.2.0).
- [x] Search: wishlist items had no cover. Done (1.2.0).
- [x] The shelves button looked wrong, and the Library's buttons could look more modern than pills. Done (1.2.0): a segmented switch, Sort, a Filter button and an icon switch.
- [x] A cover squarer than 2:3 (Liddell and Scott) showed a band of color above it. Done (1.2.0).
- [x] Explain the fields (what is a series?) and how tags work, without crowding the screens. Done (1.2.0): an "i" beside unclear fields, and Settings › How the catalog is organized.
- [ ] Adding should ask more of what only a person knows (original language and so on), rather than leaving it for Edit; sets of many volumes should be quick to add; books should be movable along a shelf; and what the laptop fills later should be clear. Planned for the next session: `handoffs/2026-11-11-second-tour.md`, "Session B".
