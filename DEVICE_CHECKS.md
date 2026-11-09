# Device checks

Things that can only be checked on a real phone or a particular browser. Work through them when convenient. Tick each one and note the date and device.

## Phase 2

- [x] iPhone (Safari): done 2026-11-09 on iOS 18.7; both tests passed (see `HOW_IT_WORKS.md`). Open `prototypes/phone-test.html`, run both tests, press "Copy results" and paste the report back. The barcode test should read the ISBN on the back of any book.
- [x] Android: the same as above. Done 2026-11-09 in Firefox 159 on Android 16; both tests passed (see `HOW_IT_WORKS.md`).
- [ ] Android (Chrome): the same again, to check the browser's own barcode detector, which Chrome has and Firefox does not.
- [ ] Both phones: open each of the five prototypes and check that covers look sharp and nothing is cut off.
- [ ] Desktop Firefox (Windows): open `prototypes/phone-test.html` and run both tests. The storage test should pass; for the barcode test, use "Or read a photo" with a photo of a book's barcode.

## Phase 5

- [ ] iPhone: once the real app exists, add it to the home screen, open it from there, and check on the self-test page that persistent storage is reported as granted (it was not granted in an ordinary Safari tab).

## Photo prototype

- [ ] iPhone and Android: open `prototypes/photos/capture.html`, choose Cover, start the camera and hold a book still on a plain surface. The green outline should follow the book and take the photo by itself; the straightened result should look right. Repeat with Spine. Note how many milliseconds are shown while tracking.
- [ ] iPhone and Android: open `prototypes/photos/lab.html`, choose Spine, start the camera and fill the tall frame with a spine. Note the camera resolution shown under the viewer, whether it saves by itself or opens the editor, and the milliseconds shown with each result (budget: under 500 ms per photo).
- [ ] iPhone: open `prototypes/photos/camera-permission.html` in Safari, add it to the home screen, open it from there, run tests A to D, and paste back the report (how often the camera permission is asked).
