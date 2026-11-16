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
- [ ] Any device: Library › Filters › "Needs details" should list the book, and its page should say "Still missing: contents". Edit: the photos of the contents pages should show under "This book holds several works" once ticked. Type two lines, save: the book should leave the list.
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

## Fixes from the first real book (1.16.0, 14 November 2026)

- [ ] iPhone: on "Which works does it hold?", point the camera at a printed contents page, tap the text button, "Copy All", and paste into the box. The lines should come in without page numbers or dotted lines. Paste a second page: it should go on new lines below.
- [ ] Android: the same with Google Lens, "Copy text".
- [ ] Phone: "Photograph the contents page", then "Photograph the next page": both small pictures should show, and after saving, Edit book should show both above the contents box.
- [ ] Phone: scan Luther's Works 12 (the later printing, 978-0-7586-7506-4): "Is this the book?" should say "Selected Psalms I" and "the list of Luther's Works", and the next step should list the seven Psalm lectures.

## Testing day, batch 1 (1.17.0, 14 November 2026)

- [ ] Two phones: trash a book on one; on the other, open Add and scan or type its ISBN. It should say "Checking for changes from your other devices…" for a moment, then look the book up as new, not "You already have this edition".
- [ ] Phone: type a title in the Add box, add the book and save. The box should be empty afterwards and the keyboard closed; "Added this time" should list the book without a number.
- [ ] Phone: add an anthology with two or more translators (Luther's Works 14): the step "Translation and editors" should have "Edited by" and "This book is in: English", and the next step "Who translated each work?" one menu per work. The book page should then show "trans. …" beside each work.
- [ ] iPhone or Android: paste the contents page of Luther's Works 14 copied with the phone (Live Text or Google Lens): each Psalm line should end "— trans. …" with its translator.
- [ ] Phone: on a book page, "Edit the works": each work has a translator box; change one and save, and the book page shows the change.

## No translation year (data format 5, 14 November 2026)

- [ ] Both phones: after updating, add a translated book. "Translation and editors" should ask for the translator, editors and the book's language, and no year. In Edit book and on the book page of a translation that had a year, no translation year should show; Settings should show data format 5.

## Testing day, batch 2 (1.19.0, 14 November 2026)

- [ ] Phone: add a book no lookup knows (Loeb Euripides IV): "None of these", then fill the form with "This book holds several works" ticked, Series "Loeb Classical Library" 12, Set "Euripides", Volume "4" and Place. The next step should be "Which works does it hold?"; once saved, the book page shows the series, the set and volume, and the place.
- [ ] Phone: "Enter a book by hand instead", tick "This book holds several works": a box "For all the works" with original language, category and tags should stay. Type Greek and save; "Edit the works" shows Greek on every work.
- [ ] Phone: a book titled "Euripides" with set Euripides, volume 4 shows "Euripides, vol. 4" in the Library, in both covers and list.
- [ ] Phone: a work dated "c. 413 BC" shows "c. 413 BC" in the book page's contents.

## Testing day, batch 3 (1.20.0, 14 November 2026)

- [ ] Phone: move Euripides IV (if added again) to the trash, then scan its barcode. "Is this the book?" should show 1980 (not 1920), no subtitle "Loeb Classical #012 (Works)", and "Loeb's own style: Euripides IV: Ion. Hippolytus. Medea. Alecestic" with "Use this title".
- [ ] Phone, same book: tap "Use this title", go on, and correct "Alecestic" to "Alcestis" in the contents. The step counter should then show the title with "Alcestis". If Wikidata answers with no dates, a line says so with a link for each work; each link opens a web search in a new tab.
- [ ] Phone, same book: the language step has clear space between the chips, "Not all the same" and "Another language". Category offers "Drama" "From the record". "Translation and editors" starts "This book is in" at "Greek, English" (or "Ancient Greek, English"), with three chips; tapping one fills the box and keeps the translator typed.
- [ ] Phone, after saving: the book page shows the series Loeb Classical Library 12, and "Contents" with no dot when no work has a date.

## Dates on the right day (1.21.1, 14 November 2026)

- [ ] Phone, after 6 pm: add a book (or another copy). Its book page should say "Added" with today's date, not tomorrow's.
- [ ] Phone, after syncing: a book added on an evening before, such as one added on 11 November, now shows the earlier, right day.

## Title page and copyright page (data format 6, 1.21.0, 14 November 2026)

These could not be tried in the browser preview while building (it would not open), so they are the first look at the new step on any screen.

- [ ] Phone: move Euripides IV to the trash, then scan its barcode. After "Is this the book?" comes "Title page and copyright page": two publisher rows (Harvard University Press, Cambridge, MA; William Heinemann, London) if the record has both, else one row with "Add another publisher". The year box is outlined, with the note that 1920 is an earlier printing's. Type 1980, then 1912 in "First printed" (or tap "First printed: same as this printing" on a first printing).
- [ ] Phone, same step: type the British ISBN (0 434 99012 4) in "Other ISBNs printed". Typing "0 434 99012 5" instead should keep the step open with "its last digit does not fit". If the record lists another ISBN, "The record also lists …" shows with "Add", and tapping it puts the ISBN in the box.
- [ ] Phone, same step at phone width: the publisher and place boxes sit side by side and readable, and the "i" beside "First printed" and "Other ISBNs printed" opens a short explanation.
- [ ] Phone, after saving: the book page shows "First printed 1912" and "Other ISBNs 9780434990122". Scan the British ISBN barcode (or type 0434990124 in the Add box): "You already have this edition" should come up. Searching the Library for 9780434990122 finds the book.
- [ ] Phone: "Fix details" on "Is this the book?" now asks only the title, subtitle, authors, editors, translators and the "several works" tick; the publisher, year, series, set, volume and pages are on the next step. A book not found online ("None of these") goes the same way.
- [ ] Phone: Edit book shows "First printed" beside "Year" and "Other ISBNs (separate with ;)" beside "ISBN"; change them and save, and the book page follows. Settings shows data format 6.

## Each work, must fields and the check (1.22.0, 14 November 2026)

The Marx-Engels Reader saved on 1.21.0 (51 works ending in " -") was moved to the trash (data commit 4ea253b), to be added again as the test. Sync the phone first, so it knows.

- [ ] Phone: scan The Marx-Engels Reader (ISBN 0-393-09040-0). The contents step lists 46 works with no " -" at the ends and no part headings ("The Early Marx"). Tap "Yes, these works", choose German, and "The works in this book" shows one card per work with Karl Marx as author and German lit, and "0 of 46 answered" (or more if Wikidata's dates were used).
- [ ] Phone, same cards: "Wikidata knows … of these works" with "Use Wikidata's dates". Tapping it fills On the Jewish Question 1843, Theses on Feuerbach 1845 and others, but not the 1844 Manuscripts (1932) or the Grundrisse (1939): those cards say "first printed …, after the author died". The Poverty of Philosophy extract offers "French (Wikidata)".
- [ ] Phone, same cards: change Engels's works to Friedrich Engels and the Manifesto to "Karl Marx and Friedrich Engels"; "Ask Wikidata again" appears; tapping it later shows "Wikidata has answered" with "Show its suggestions", and nothing typed is lost. Tapping a chip on card 30 changes only that card; the page does not jump.
- [ ] Phone, same cards: each card's three "Search the web" links open a new tab with a question about that work ("What language was The Holy Family by Karl Marx first written in?" for "Alienation and Social Classes (from the Holy Family)"). "Not a work (a heading): remove" takes a card away.
- [ ] Phone, same book: Next with cards unanswered outlines them and offers "Don't know the rest"; tapping it goes on.
- [ ] Phone, same book: on "Title page and copyright page", leave "First printed (first edition)" empty and tap Next: the step stays, with "Still empty: First printed" and "Don't know or not printed". Type 1972 (the first edition's year) instead.
- [ ] Phone, same book: the spine step has "Height in cm (measure later is fine)" with "A library record gives 22 cm". Type 23.5.
- [ ] Phone, same book: "This copy" now says Next, and "Check before saving" lists the book, the works and this copy, with amber "missing" where nothing was given. Tap "Binding", choose one, Next: back on the check, with the binding filled. "Save the book" saves.
- [ ] Phone, after saving: the Library finds the Reader by searching "Engels"; the book page lists the works with their dates; Edit the works shows the original titles (Zur Judenfrage) and English for the Inaugural Address; the height is 23.5 cm.
- [ ] Phone: add a single work (Fear and Trembling, Penguin): the language step has "Search the web" under the languages and, after Danish is typed, under the original title. On the date step, Next with nothing typed names "Original date" with "Don't know".

## Record noise in anthologies (1.23.0, 14 November 2026)

- [ ] Phone: scan Holmes's The Apostolic Fathers (ISBN 978-0-8010-3468-8). "Is this the book?" shows "The Apostolic Fathers", not "Apostolic Fathers, The,". Tap "Yes, and it holds several works"; the contents step says "The record names Michael W. Holmes as the author. In a collection that is often the editor." Tick "Michael W. Holmes edited this collection; the works are by others", type two works, and the cards show no author filled in; "Editors" later starts with Michael W. Holmes.
- [ ] Phone: add Euripides IV again: the contents step does not ask whether Euripides edited it.
- [ ] Phone: scan Calvin's Institutes (LCC, ISBN 978-0-664-22028-0): the title is "Institutes of the Christian religion" by Jean Calvin, with John T. McNeill as editor and only Ford Lewis Battles as translator.
- [ ] Phone: scan Loeb Greek Lyric I (978-0-674-99157-6): the copyright page step's series number is empty (not "142, 144, 461, 476"), ready for 142 and volume 1.
- [ ] Phone: scan Bettenson's Documents of the Christian Church (978-0-19-956898-7): no author, editors Henry Scowcroft Bettenson and Chris Maunder. The Book of Concord (978-0-8006-2740-9): no author, editors Kolb and Wengert. Lull (978-0-8006-3680-7): edition "2nd ed.". Charlesworth I (978-0-385-09630-0): subtitle "Apocalyptic Literature and Testaments", pages empty.

## Lookups and cards, testing day batch 6, stage A (1.24.0, 15 November 2026)

Checked in the browser preview at phone width on 15 November 2026 (the Reader and Plutarch by ISBN, not saved), so these are for the phones themselves.

- [ ] Phone: move the Reader, Plutarch's Lives II and the Grimm to the trash first, then add the Reader again (ISBN 978-0-393-09040-6). "Is this the book?" shows "Karl Marx, Friedrich Engels" and editor Robert C. Tucker. The copyright page step says "Year of this edition or printing" and "First edition's year", with "Search the web" under them asking about the first edition "edited by Robert C. Tucker".
- [ ] Phone, same book: the contents step's "Search the web" asks for the table of contents "(Norton, 1978, edited by Robert C. Tucker)". On the cards, a work whose line names no author has an empty author with the chips Karl Marx, Friedrich Engels, Both and Anonymous; a work Wikidata knows shows its author as "(Wikidata)". A card stays outlined until an author is chosen or typed.
- [ ] Phone, same book: type "Karl Marx; Friedrich Engels" as one card's author. "Check before saving" lists each name once under Authors. After saving, the book page shows both as separate authors of that work.
- [ ] Phone, with the Wi-Fi and data off just before the cards: the line says Wikidata could not be reached, with "Try again". Turn the connection on and tap it: Wikidata's suggestions arrive.
- [ ] Phone: add Plutarch's Lives II (978-0-674-99053-1). The copyright page step has two publisher rows (Harvard University Press, Cambridge, Mass; W. Heinemann, London), series "Loeb Classical Library", number 47, set Plutarch's Lives, volume 2, and pages empty and outlined (type "x, 631"). The contents search names "Loeb Classical Library, translated by Bernadotte Perrin".
- [ ] Phone: add the Grimm (978-93-90093-02-1): the publisher is "Fingerprint! Publishing" alone, and the date step's Open Library suggestion reads "Open Library's earliest edition…: for an old work this is a later printing", never "first published".

## Original dates with direction, testing day batch 6, stage B (1.25.0, 15 November 2026)

Checked in the browser preview at phone width on 15 November 2026 (Plutarch by ISBN through the cards, Edit book and "Works in this book"; not saved), so these are for the phones themselves.

- [ ] Phone: on the date step of any single book, the line reads "The first time it appeared: first published, or written if it was not printed in the author's lifetime." Tap "Which date?": the list of eight kinds of work opens below it. Tap it again: it closes.
- [ ] Phone, same step: under the date box are six chips (Book or essay, Letter, Speech or sermon, Play, Poem, Ancient or medieval), none lit. Tap "Play": it lights, its rule shows, and "Search the web" asks "When was the play … first performed?". Tap it again: it goes out. A date typed in the box stays while tapping.
- [ ] Phone: open "Search the web" on six works and note whether the summary at the top gives one date: Pride and Prejudice (1813), Grimm's tales (1812–15, rev. 1857), the 1844 Manuscripts (written 1844), a Marx letter (its date), Oedipus the King (c. 429 BC), Plutarch's Themistocles (written c. 100). Report any that give several dates or the wrong one; the wording is one line in `core/date-search.js`.
- [ ] Phone: add the Reader again. Each card has one link at its top, "Search the web: author, language, title and date", and none under the language, original title or date. The question names the Reader and "works by Karl Marx and Friedrich Engels".
- [ ] Phone: add Plutarch's Lives II. Above the cards, "All written about the same time?" has a date box, a "Search the web" link asking when Plutarch wrote the works, "Use for every work without a date" and, once Open Library has answered, "Plutarch's lifetime, …". Type "c. 100" and tap "Use for every work without a date": every card without a date and not marked "Don't know" gets it; a card already dated keeps its own.
- [ ] Phone: on a card, type "1806-1812, 1857" as the date. The line under it says "Two dates: type only the first edition's here (Grimm's tales: 1812–15)…".
- [ ] Phone (1.25.1): on Plutarch's Lives II's copyright page step, no "The record also lists…" lines appear.
- [ ] Phone: in Edit book of a single work, tap "Speech or sermon" and save. Open Edit book again: the chip is lit. On "Works in this book", the same chips sit under each work's date.
## Data format 7, testing day batch 6, stage C (1.26.0, 15 November 2026)

- [ ] Phone: add the Grimm again (978-93-90093-02-1). On the date step type "1812–15", then tap "Revised later? Final edition's year": a box opens. Type "1857" and tap "The final text": the box below says "final edition, 1857". "Check before saving" shows "Original date: 1812–15; rev. 1857" and "Text in this book: final edition, 1857". After saving, the book page's date reads "1812–15; rev. 1857" and the Edition section "Text in this book: final edition, 1857".
- [ ] Phone, same book: in the Library sorted by original date, it sits under 1812, not 1857.
- [ ] Phone: add the Reader again (978-0-393-09040-6). On "Translation and editors" tap "Various translators": the translator box empties and the step goes on without asking for a translator. "Check before saving" says "Translators: Various translators"; so does the book page after saving, and Edit book has the tick.
- [ ] Phone, the other phone: once both have 1.26.0 and have synced, the Grimm shows "1812–15; rev. 1857" there too. A phone still on 1.25 that meets the new records asks to be refreshed.

## Lists merged item by item (1.27.0, 16 November 2026)

- [ ] Both phones: with both on 1.27.0 and synced, turn on airplane mode on both. On one, take the cover of a book; on the other, the spine of the same book. Turn the network back on and sync both (Settings › Sync now), the first one again at the end. Both phones show the book with its cover and its spine.
