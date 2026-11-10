# Device checks

Things that can only be checked on a real phone or a particular browser. Work through them when convenient. Tick each one and note the date and device.

## Phase 2

- [x] iPhone (Safari): done 2026-11-09 on iOS 18.7; both tests passed (see `HOW_IT_WORKS.md`). Open `prototypes/phone-test.html`, run both tests, press "Copy results" and paste the report back. The barcode test should read the ISBN on the back of any book.
- [x] Android: the same as above. Done 2026-11-09 in Firefox 159 on Android 16; both tests passed (see `HOW_IT_WORKS.md`).
- [ ] Android (Chrome): the same again, to check the browser's own barcode detector, which Chrome has and Firefox does not.
- [ ] Both phones: open each of the five prototypes and check that covers look sharp and nothing is cut off.
- [ ] Desktop Firefox (Windows): open `prototypes/phone-test.html` and run both tests. The storage test should pass; for the barcode test, use "Or read a photo" with a photo of a book's barcode.

## Phase 5

- [ ] Both phones: open `https://jakobnath.github.io/my-loci-library/tests/`. Every line should be green, including the five speed lines, which should say "phone targets". Note the opening time shown on the first speed line.
- [ ] Both phones: open the app (`https://jakobnath.github.io/my-loci-library/`) in an ordinary tab (not a private one) and wait for the note "Ready to use offline" (or check Settings), then turn on airplane mode and reload. The app should still open (it will be empty until the test data or sync is loaded). First attempt on Firefox for Android, 2026-11-09, failed with version 0.5.2; fixed in 0.5.3, to be checked again.
- [ ] Desktop: open `tests/load-test-data.html` on the local server, choose `catalog.json` from the test-data repository, then open the app: 19 books should be on the shelves, and Settings should show the app version.
- [ ] iPhone: once the real app exists, add it to the home screen, open it from there, and check on the self-test page that persistent storage is reported as granted (it was not granted in an ordinary Safari tab).

## Photo prototype

- [ ] iPhone and Android: open `prototypes/photos/capture.html`, choose Cover, start the camera and hold a book still on a plain surface. The green outline should follow the book and take the photo by itself; the straightened result should look right. Repeat with Spine. Note how many milliseconds are shown while tracking.
- [ ] iPhone and Android: open `prototypes/photos/lab.html`, choose Spine, start the camera and fill the tall frame with a spine. Note the camera resolution shown under the viewer, whether it saves by itself or opens the editor, and the milliseconds shown with each result (budget: under 500 ms per photo).
- [ ] iPhone: open `prototypes/photos/camera-permission.html` in Safari, add it to the home screen, open it from there, run tests A to D, and paste back the report (how often the camera permission is asked).

## Phase 6

- [ ] Both phones: in the app, open Add, tap Scan, allow the camera, and scan the barcode on the back of a few books in a row. Each should open a review card within a second or two; after "Save, next book" the camera should read the next one without asking for the camera again. Note which reader the screen names (the browser's own detector or the bundled decoder).
- [ ] Both phones: on a review card, tap "Take a cover photo", photograph a book held in the hand, line up the corners (the magnifier should show while dragging), and tap "Use photo". The saved cover should be straight and sharp in the library and on the book page.
- [ ] Both phones: the same with "Add a spine photo", typing a measured height. The book page should show the spine beside the cover.
- [ ] Both phones: with Google Books' free key typed in Settings, scan a book Open Library does not know. Without the key, the app should say that Google Books refused, and still open the review card.
- [ ] Desktop with a USB barcode scanner (if one is ever bought): click the "ISBN or title" box and scan; the book should be looked up as if typed.
- [ ] Both phones: scan a barcode with the camera. There should be a beep, a green glow with "✓ Read" and the ISBN, and (Android only) a short buzz. Turn the beep off in Settings and scan again: glow and buzz only.

## Phase 7

- [ ] Laptop (the first live sync, which is also build step 4.1): make a fine-grained key for `my-loci-library-test-data` (Contents: read and write), then in the app's Settings › Sync type `JakobNath/my-loci-library-test-data`, paste the key, and tap "Connect and download". The 21 sample books (190 records) should appear, with nothing downloaded file by file (they all match `catalog.json`). Then add a book; within a few seconds the "unsent" badge should clear, and the test-data repository on GitHub should show one new commit with the new records and pictures.
- [ ] Phone: connect to the same repository with a second key (one key per device). The laptop's new book should appear, with its cover. Edit its notes on the phone and its value on the laptop, both offline; reconnect both: the book should end up with both changes.
- [ ] Either device: cancel a key on GitHub, then tap "Sync now": the app should say the key has expired or was cancelled, and keep the changes.

## Phase 8

- [ ] Phone: on the Library, tap Filter, pick a location and "Needs an original date", then save it as a view. The view's chip should appear above the toolbar, and tapping it later should bring back the same books in the same order. Once sync is connected, the saved view should also appear on the laptop after its next sync.
- [ ] Phone: on the Wishlist, add an item with a note, then tap "I bought it". The entry form should open filled from the item, with the note in the copy's notes. After saving, the item should be gone from the Wishlist and listed in Settings › Trash.
- [ ] Phone: in Settings › Lists, rename a place (a shelf, say). The books on it should show the new name on their pages and in the Library's location filter.
- [ ] Phone (0.8.4 or later): add a book with a spine photo. On its page, tap the small cover: the cover and spine should open full size, and the spine's lettering should be readable. Tap anywhere to close.
