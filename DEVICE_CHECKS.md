# Device checks

Things that can only be checked on a real phone or a particular browser. Work through them when convenient. Tick each one and note the date and device.

## Phase 2

- [x] iPhone (Safari): done 2026-11-09 on iOS 18.7; both tests passed (see `HOW_IT_WORKS.md`). Open `prototypes/phone-test.html`, run both tests, press "Copy results" and paste the report back. The barcode test should read the ISBN on the back of any book.
- [x] Android: the same as above. Done 2026-11-09 in Firefox 159 on Android 16; both tests passed (see `HOW_IT_WORKS.md`).
- [ ] Android (Chrome): the same again, to check the browser's own barcode detector, which Chrome has and Firefox does not.

## Phase 5

- [ ] Both phones: open `https://jakobnath.github.io/my-loci-library/tests/`. Every line should be green, including the five speed lines, which should say "phone targets". Note the opening time shown on the first speed line.
- [ ] Both phones: open the app (`https://jakobnath.github.io/my-loci-library/`) in an ordinary tab (not a private one) and wait for the note "Ready to use offline" (or check Settings), then turn on airplane mode and reload. The app should still open (it will be empty until the test data or sync is loaded). First attempt on Firefox for Android, 2026-11-09, failed with version 0.5.2; fixed in 0.5.3, to be checked again.
- [ ] iPhone: once the real app exists, add it to the home screen, open it from there, and check on the self-test page that persistent storage is reported as granted (it was not granted in an ordinary Safari tab).


## Phase 6

- [ ] Both phones: in the app, open Add, tap Scan, allow the camera, and scan the barcode on the back of a few books in a row. Each should open a review card within a second or two; after "Save, next book" the camera should read the next one without asking for the camera again. Note which reader the screen names (the browser's own detector or the bundled decoder).
- [ ] Both phones: on a review card, tap "Take a cover photo", photograph a book held in the hand, line up the corners (the magnifier should show while dragging), and tap "Use photo". The saved cover should be straight and sharp in the library and on the book page.
- [ ] Both phones: the same with "Add a spine photo", typing a measured height. The book page should show the spine beside the cover.
- [ ] Both phones: with Google Books' free key typed in Settings, scan a book Open Library does not know. Without the key, the app should say that Google Books refused, and still open the review card.
- [ ] Desktop with a USB barcode scanner (if one is ever bought): click the "ISBN or title" box and scan; the book should be looked up as if typed.
- [ ] Both phones: scan a barcode with the camera. There should be a beep, a green glow with "✓ Read" and the ISBN, and (Android only) a short buzz. Turn the beep off in Settings and scan again: glow and buzz only.

## Phase 7

- [ ] Phone: connect to the same repository with a second key (one key per device). The laptop's new book should appear, with its cover. Edit its notes on the phone and its value on the laptop, both offline; reconnect both: the book should end up with both changes.
- [ ] Either device: cancel a key on GitHub, then tap "Sync now": the app should say the key has expired or was cancelled, and keep the changes.

## Phase 8

- [ ] Phone: on the Library, tap Filter, pick a location and "Needs an original date", then save it as a view. The view's chip should appear above the toolbar, and tapping it later should bring back the same books in the same order. Once sync is connected, the saved view should also appear on the laptop after its next sync.
- [ ] Phone: on the Wishlist, add an item with a note, then tap "I bought it". The entry form should open filled from the item, with the note in the copy's notes. After saving, the item should be gone from the Wishlist and listed in Settings › Trash.
- [ ] Phone: in Settings › Lists, rename a place (a shelf, say). The books on it should show the new name on their pages and in the Library's location filter.
- [ ] Phone (0.8.4 or later): add a book with a spine photo. On its page, tap the small cover: the cover and spine should open full size, and the spine's lettering should be readable. Tap anywhere to close.
- [ ] Phone (0.8.5 or later): in the Wishlist, tap "Add to wishlist", share or copy a book's link from the Amazon app or site, and paste it. The book's details and cover should fill in. Then try typing a title: small covers should appear as you type.

## Phase 9

- [ ] Phone: Settings › Value should show the total, the rooms and the count with no value. "Download for an insurance agent" should save a CSV that opens in Numbers, Excel or Google Sheets with one row per book and the totals at the end.
- [ ] Laptop: Settings › Export › each of the four. The CSV should open in a spreadsheet with accents intact; the BibTeX file should load in a reference manager (or Zotero's import) with titles, authors and original dates.

## Phase 10

- [ ] Laptop: copy `config.example.json` to `config.json` in the tools, pointing `dataRepo` at the test data and `backupFolder` at a folder in Google Drive. Run `loci-backup.cmd`. The Drive folder should get `data/` and `snapshots/<month>/`; `catalog.html` should open with no internet and find books as you type. Then schedule it in Task Scheduler as the tools README says.
- [ ] Phone: after the next sync, Settings should say "Last backup to the backup folder: <date>".

## Phase 14

- [x] Phone (1.1.0 or later): scan C. S. Lewis, *Mere Christianity* (9780060652920) or any book whose Open Library record lists contents. The first step should show the edition ("1st HarperCollins ed.") and pages as printed ("xx, 227"); the next step should ask "Is this a collection of works?" with the list filled in; "No, it is one work" should go on to the original date, and the binding step should have Paperback already chosen. Adding should feel as quick as before.
- [x] Phone: scan a Bible or Greek New Testament. No contents question should appear.
- [x] Phone: in Settings › Advanced, paste the Google Books key and tap "Test the key": it should say "The key works". Then change one letter of the key and test again: it should say Google does not know the key. Put the right key back.
- [x] Phone: after reloading to 1.1.0 (Settings shows "1.1.0" at the bottom, and Advanced › About shows data format 2), tap "Sync now". It should finish without a message about a newer format, and a book's page should still show everything it showed before. On a book added since, the edition facts may show a call number and subjects.

## Moving to the real catalog (1.1.3)

- [x] Each device (1.1.3 or later; Settings shows the version at the bottom): in Settings › Advanced › Sync, type `JakobNath/my-loci-library-data` and paste a key made for it, then tap "Connect and download". The app should ask whether to remove this device's records from the test catalog. Tap OK: the Library should be empty, Settings › Advanced should still hold the Google Books key, and `my-loci-library-data` on GitHub should get no sample books. Tap Cancel instead, and nothing should change.
- [ ] Any device: type a repository name with a typo and tap "Connect and download". The app should say it cannot reach that repository, keep its books, and stay connected to the old one.
- [ ] Any device: type the new repository name but leave the key box empty, and tap "Connect and download". The app should say the key was made for the old catalog and ask for a new one, and change nothing. Settings' main page should start its sync line with "Catalog:" and the catalog's name.
- [x] Phone (1.1.4 or later), once connected to the real catalog: Settings › Advanced › Sync › "Share setup link". The phone's share sheet should open; send the link to the other phone by text. On the other phone, open the link (in the browser the app is installed from). It should open Settings › Advanced, connect, and download the catalog; the address should end in `#/settings/advanced` with no key in it, and the Google Books key should be filled in.
- [x] iPhone (1.1.6 or later), the app added to the home screen: an app on the home screen keeps its data apart from Safari, and a link tapped in a message opens in Safari. So in the message, press and hold the setup link and choose Copy (don't tap it). Open the app from the home screen, go to Settings › Advanced › Sync, paste the link into step 3's box ("The key, or a setup link") and tap "Connect and download". It should connect and download the catalog, and the Google Books key should be filled in.

## Second tour fixes (1.2.0)

- [ ] Phone: take a spine photo of a book held at a slight slant. Drag each long edge near its top and its foot to follow the spine; the top and bottom bars should stay where they are. Tap "Use photo": the spine should come out straight, with its lettering square.
- [ ] Phone: line up a cover, dragging a top corner with the thumb. One magnifier should show, at the bottom of the photo, and stay there for the whole drag, even when the thumb crosses the middle.
- [ ] Phone: line up a spine. Two magnifiers should show, away from the thumb, and not jump sides during a drag.
- [ ] Phone: in the photo editor, hold a finger on the photo away from the outline. The straightened result should show while held and go away on letting go. Tap Preview: the same, until "Back to the outline" is tapped.
- [ ] Phone: the Library's controls (Physical, Logos, All; Sort; Filter; the view switch) are easy to tap and read, in light and dark.
- [ ] Phone: open Edit on a book and tap the "i" beside Series. One or two sentences should open under the field, without the keyboard appearing; tapping another "i" closes the first.

## Adding books, second tour part B (1.3.0)

- [ ] Phone: in a shelf view, tap Arrange, tap a book, then tap a gap further along. The book should move there at once. Close and reopen the app: it should still stand there, on the other phone too after a sync.
- [ ] Phone: add a translated book (Latin, Greek or German). The language buttons should be easy to tap; tapping English should go straight to the next step, and any other should ask for the original title. The translation step should come up with the translator filled in when the lookup found one.
- [ ] Phone: on Add, tap "Add a set of volumes", give the set's facts, and scan two volumes of it. The second should suggest the next volume number, and keep the first one's language, category and binding. Open the Library and come back to Add: the set should still be there. Tap "Finish the set" at the end.
- [ ] Phone: paste a few volumes of a set ("7 Plato" and so on, one per line) and tap a shelf. They should appear on that shelf in the order pasted, each with the set's details.

## HathiTrust while adding (1.4.0)

- [ ] Phone: scan a Loeb volume (or type its ISBN, such as 9780674996076 for The Apostolic Fathers I). "Found on" should name HathiTrust, and the next step should offer that volume's works (I Clement, II Clement, Ignatius, Polycarp, Didache). Tap "Back to scanning" if you don't want to keep it.
- [ ] Phone: Settings › Advanced: "And in HathiTrust" can be turned off and on; with it off, the same scan finds the book on Open Library only.

## Collections made easy (1.5.0)

- [ ] Phone: add a collection no catalog lists (a Library of America or Everyman volume). "Is this the book?" should offer "Yes, and it holds several works"; tap it, type two or three works, one per line, then pick a language and a category once. On the book's page, tap "Edit the works": each work should already have that language and category.
- [ ] Phone: on "Works in this book", type a date for one work and an original title for another, and fill "Same for all" with a tag. Save: the book page should show the dates, and every work the tag.
- [ ] Phone: open Edit on a book holding one work, tick "This book holds several works", list two works and save. Settings › Trash should not show the old work as a book (it is a work, not a book), and searching its old title should find only the new works.

## Format 3 and Wikidata (1.7.0)

- [ ] Each phone, and the laptop's browser: reload to 1.7.0 (Settings shows the version at the bottom). Until a device is reloaded it may say the catalog is in a newer format and wait; that is expected, and it changes nothing.
- [ ] Phone: add a Loeb Plato volume (9780674990401, Plato I). Under the contents, "Wikidata gives when 5 of these were written…" should appear within a few seconds; tap "Use these dates", and each line should end with its date. Save; on the book page each work shows its date.
- [ ] Phone: scan a single work by a known author (a Penguin Classics novel). On "When was this work written?" the first suggestion should be Wikidata's date, labelled "(Wikidata)".
- [ ] Phone: Settings › Advanced: turn "Original dates and titles from Wikidata" off; adding the same kind of book should then offer no Wikidata date. Turn it back on.
- [ ] Phone, airplane mode on: adding a book still works, and the contents step says Wikidata could not be reached instead of waiting.

## Known sets (1.8.0)

- [ ] Phone: scan a volume of Great Books of the Western World (the 1990 second edition, 60 volumes; its set ISBN is 0-85229-531-6). "Which volume of Great Books of the Western World is this?" should come first; tap the number on the spine. "Is this the book?" should then show that volume's title, and the next step its works from the list. Save, and check the book page lists the works.
- [ ] Phone, airplane mode on: the same scan still offers the volumes (the list is kept on the phone), though nothing is found online.
- [ ] Phone: Wishlist. With one or more Great Books volumes in the catalog, a line "Great Books of the Western World: … held · missing …" should appear above the list. Open it and tap "Put the missing on the wishlist"; each missing volume appears once. Tap it again: it should say they are already on the wishlist. (Remove the items afterwards if you don't want them.)

## Scanner light and Value levels (1.9.0)

- [ ] Jakob's phone (Android): Add › Scan a barcode. A "Light" button should appear under the camera; tap it: the phone's light comes on and the button is lit; tap again: it goes off. "Stop the camera" turns it off too.
- [ ] His wife's iPhone, in the home-screen app (iOS 17.4 or later; Settings › General › About shows the version): the same. If no Light button appears, or it says "This camera has no light", note the iOS version: then this iPhone cannot do it from a web page, and the phone's own camera (with its flash) is still used for cover and spine photos.
- [ ] Phone: Settings › Value › "Totals by": tap Place, Room, Bookcase and Shelf in turn; the list below should total by each. Download the CSV after choosing Bookcase: its totals at the end should be by bookcase.

## Contents photos and found works (1.10.0)

- [ ] Phone: add a book that holds several works but whose contents no catalog lists (an old anthology without a barcode, or a title typed in). At "Is this the book?" tap "Yes, and it holds several works". The next step should offer "Photograph the contents page": take the photo, and a small copy of it should appear with a note. Leave the box empty and finish adding.
- [ ] Laptop, in Firefox with the app synced: open `https://jakobnath.github.io/my-loci-library/laptop/contents.html`. The book should be listed; open it: the entry form should show the photo of the contents page under "This book holds several works" once ticked. Type two lines, save: the book should leave the list.
- [ ] After a laptop `loci-enrich` run that reports "works found inside": the book's page says "Still missing: works found inside"; Edit shows "A library catalog lists … works"; "Use these works" fills the contents box, and Save makes them works.

## Same works and free scans (1.11.0)

- [ ] Phone: open a book that has other editions in the catalog: "Other editions and collections" should appear at the foot of the page, as before, a moment after the page opens.
- [ ] Phone: add a second translation of a work already in the catalog that Wikidata knows (for example another *Phaedo*, if Plato I is held). "Same work?" should offer it, saying "Wikidata names both as one work".
- [ ] Phone: for a book published in 1930 or earlier with a HathiTrust record (found while adding, or filled in on the laptop), "Read it free online" should appear on its page and open HathiTrust.

## Luther's Works list (1.12.0)

- [ ] Phone: scan a volume of Luther's Works with an ISBN on its back (say volume 31, Career of the Reformer I). "Is this the book?" should show the volume's title, and the works step its works from the list (ten for volume 31, beginning with the Disputation Against Scholastic Theology). Save, and check the book page.
- [ ] Phone: scan a second Genesis volume (any of 1 to 8) after a first: "Lectures on Genesis" should stay one work, listed under both books.

## His wife's issues, part A (1.13.0)

- [ ] iPhone: in Add, at the cover step, tap "Choose a saved photo". The phone should offer its photo library; a chosen photo opens in the editor.
- [ ] Both phones: take a spine photo holding the book at a slant. Drag the top dot and the foot dot onto the spine's ends, then a side onto its edge. Preview should show the spine straight and upright.
- [ ] Both phones: open a book already added. Under Pictures, take a cover photo, then choose a spine photo, then remove the spine. The page should show each change at once, and the other phone should show it after a sync.
- [ ] Phone: add a collection with works in different languages (Lucretius with Epictetus, say), tap "Not all the same", choose Latin for Lucretius, and save. "Edit the works" should show Latin for Lucretius only.
- [ ] Phone: add The Count of Monte Cristo again (or any Dumas). The date step should offer 1802–1870 as his lifetime, not "24–5".

## His wife's issues, part B: data format 4 (1.14.0)

- [ ] Both phones and the laptop's Firefox: after the update, open the app once and wait for "New version · Reload" (or reload). Each device must be on 1.14.0 before books are added in the new format; one still on 1.13.0 says it needs refreshing and sends nothing, as designed.
- [ ] Phone: open a book whose copy was "Hardcover with dust jacket". The copy line should read "Hardcover · Dust jacket". Edit it: the Binding row should have Hardcover lit and the Extras row Dust jacket.
- [ ] Phone: add a book and, at the binding step, tap Hardcover, then Cloth, then Dust jacket and Slipcase. Tapping Hardcover again should turn it off. The book page should show the choices.
- [ ] Phone: on a volume of Luther's Works, tap "Add the set's details", give the short form LW and the number of volumes, and save. Every volume should then say "Volume … of Luther's Works (LW)", and searching "LW 31" should find volume 31.
- [ ] Phone: on the set's page, give the set a value and turn on "Count one value for the whole set". Settings › Value should count the set once, and a volume's page should say "Valued with the set".
- [ ] iPhone: Settings › Rename and merge › Extras: add "Signed", then remove it. Both phones should show the change after a sync.

## Original dates made quick (13 November 2026)

- [ ] iPhone home-screen app and Android: in Edit book, tap "Search the web" under the original date. A browser tab should open on a search for "When was <title> by <author> written and first published?", and going back should return to the form with nothing lost.
- [ ] Phone: add a translated book and, on the translation step, type the translator, then tap "Search the web". The search should name that translator.
