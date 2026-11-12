# Setting up your own copy

My Loci Library catalogs your books: the ones on your shelves and your Logos library. You use the same app as everyone else, at https://jakobnath.github.io/my-loci-library/, but your catalog is your own: it lives in a private repository on GitHub that only you (and anyone you invite) can see. No programming is needed. Setting up takes about fifteen minutes.

Created by Jakob Nath.

## 1. A GitHub account and a private repository

1. Make a free account at github.com if you do not have one.
2. Click "+" (top right) › New repository. Name it `my-loci-library-data`. Choose **Private**. Tick "Add a README file". Click "Create repository".

This repository is your catalog. Nothing else needs to go in it: the app adds its folders and files as you add books. Every book you add becomes a small text file in it, and GitHub keeps every earlier version, so nothing you do in the app can be lost for good.

## 2. One key

The app needs a key to read and write your repository. Make one, on the first device you set up; the others get it from that device with a setup link (section 3).

1. Sign in to github.com in your browser.
2. Open this link: https://github.com/settings/personal-access-tokens/new?name=My+Loci+Library&description=Sync+for+My+Loci+Library&expires_in=none&contents=write
   It opens GitHub's form for a new key with a name, no expiry and the permission "Contents: Read and write" already filled in. (If you would rather have keys that expire, choose an expiry date here; the app tells you when one stops working.)
3. Find "Repository access" and choose "Only select repositories". In the list that appears, pick `my-loci-library-data`.
4. Scroll to the bottom and click "Generate token".
5. Copy the code it shows (it starts with `github_pat_`). GitHub shows it only once.

The same steps, with the link, are in the app under Settings › Advanced › Sync, as three numbered steps.

## 3. Connect the app

1. Open https://jakobnath.github.io/my-loci-library/ on the device. On a phone, add it to the home screen (Safari: Share › Add to Home Screen; Chrome: menu › Add to Home screen) so it opens like an app, even with no connection.
2. Settings › Advanced › Sync. Type your repository as `your-github-name/my-loci-library-data`, paste the key, and tap "Connect and download".
3. Settings should then show your repository under "Catalog in use".
4. For each other phone, tablet or computer: on the connected device, tap "Share setup link" (Settings › Advanced › Sync), send the link to the other device by text or email, and open it there. It connects by itself, with the same keys. Anyone with the link can read and change your catalog, so send it only to your own devices.

## 4. Add books

Tap Add, then "Scan a barcode" and point the camera at the barcode on the back of a book. The app looks the book up, then asks one question per screen: is this the book, when was the work first written (a person always sets this; the app only suggests), the cover, the binding, and where it stands. Books without a barcode can be found by title or typed in.

Your changes are saved on the device at once and sent to GitHub a few seconds later. With no connection they wait, and go when the connection returns; the small "unsent" badge at the top shows how many are waiting.

## 5. Your settings

Settings › Advanced › The library holds the choices that describe your catalog (date style, currency, what adding asks for). They are saved in your repository, so every device you use shares them.

## Optional: a Google Books key

The app finds most books through Open Library and HathiTrust, which need no key. Google Books fills some gaps (a cover, a missing publisher) but refuses most requests without a free key of your own. Settings › Advanced › "Google Books key" has the steps (about two minutes, with any Google account) and a "Test the key" button. One key serves all your devices, and the setup link carries it to them. Without one the app works the same, with a few more fields left for you to type.

## Logos

If you use Logos, its library can be imported in one go on a laptop (the laptop tools below, "logos-to-my-loci-library"): export the library from Logos as a spreadsheet and run the import. Logos books appear beside the physical ones, marked as Logos, and are kept out of the insurance value.

## New versions

The app updates itself. When a new version is published, a line "New version · Reload" appears at the bottom; tap it, or close the app and open it again. Settings shows the version at the bottom. Your catalog is never changed by an update without the app saying so.

## Leaving, or keeping a copy

Your catalog is plain text that any program can read (the format is described in `DATA_FORMAT.md` in the app's repository). On GitHub, your repository's "Code" › "Download ZIP" gives you all of it; Settings › Export in the app saves a spreadsheet (CSV), a JSON file, or a bibliography (CSL-JSON or BibTeX) for Zotero and other reference managers.

## If the key stops working

The app says so in plain words and keeps every change on the device. Make a new key (section 2), paste it in Settings › Advanced › Sync on one device, and send the setup link to the others.

## Optional: the laptop tools

Backups to Google Drive, filling in catalog details (pages, sizes, series), Logos import, sending books to Zotero, a shelf planner and printed shelf lists are separate tools for a laptop with Node installed (nothing else to install). They are at https://github.com/JakobNath/my-loci-library-tools, with instructions in their README; their admin page (`admin/admin.cmd` on Windows, `admin/admin.sh` on Linux) gathers them on one page with the whole handbook. The app works fully without them; GitHub's history is already a backup of every change.
