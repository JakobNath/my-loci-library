# Device checks

Things only a real phone can show, and that using the app day to day never would: setting up a device, storage, working offline, failures that are rare on purpose, the backup. Everything else is checked by the two of us using the app and reporting what goes wrong (decided 15 November 2026). A new release adds an item here only if it is of this kind.

Work through them when convenient. Tick each one and note the date, the device and the version. The list was cut to these on 16 November 2026; the older, longer list is in this file's git history.

## Each phone

- [ ] Open `https://jakobnath.github.io/my-loci-library/tests/`. Every line should be green, and the speed lines should say "phone targets".
- [ ] iPhone, in the app opened from the home screen: the self-test page, opened from the app itself (Settings › Advanced › About › "Run the self-tests"), reports persistent storage as granted. In an ordinary Safari tab it is not granted, which is normal.
- [ ] Turn on airplane mode and open the app. It should open with every book, and a book can still be added by hand ("Enter a book by hand instead"); the lookups say they could not be reached instead of waiting. Turn airplane mode off: the new book syncs.

## Scanner light

- [ ] Android: Add › Scan a barcode. A "Light" button appears under the camera; tapping it turns the phone's light on and off. "Stop the camera" turns it off too.
- [ ] iPhone, in the home-screen app (iOS 17.4 or later; Settings › General › About shows the version): the same. If no Light button appears, note the iOS version; the phone's own camera, with its flash, is still used for cover and spine photos.

## Setting up a phone

- [ ] Settings › Advanced › Sync: type the catalog's name with a typo and tap "Connect and download". The app should say it cannot reach that catalog, keep its books, and stay connected as before.
- [ ] A phone left on an older version, meeting books saved in a newer data format, should say it needs refreshing and send nothing until it is reloaded.

## Sync safety

- [ ] Cancel the sync key on GitHub (or make a test key and cancel it), then tap "Sync now". The app should say plainly that the key has expired or was cancelled, and keep every unsent change. Then set the key up again with the setup link.
- [ ] Both phones on 1.27.0 or later and synced: turn on airplane mode on both. On one, take the cover of a book; on the other, the spine of the same book. Turn the network back on and sync both (Settings › Sync now), the first one again at the end. Both phones show the book with its cover and its spine.

## Backup and insurance

- [ ] On the laptop, with the internet off: open `catalog.html` from the newest backup in Google Drive (`My Loci Library backup`). It should open and find books as you type.
- [ ] Settings › Value › "Download for an insurance agent": the CSV opens in Numbers, Excel or Google Sheets with one row per book, accents intact, and the totals at the end.
