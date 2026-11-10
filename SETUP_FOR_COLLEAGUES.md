# Setting up your own copy

My Loci Library catalogs your books: the ones on your shelves and your Logos library. You use the same app as everyone else, at https://jakobnath.github.io/my-loci-library/, but your catalog is your own: it lives in a private repository on GitHub that only you (and anyone you invite) can see. No programming is needed. Setting up takes about fifteen minutes.

Created by Jakob Nath.

## 1. A GitHub account and a private repository

1. Make a free account at github.com if you do not have one.
2. Click "+" (top right) › New repository. Name it `my-loci-library-data`. Choose **Private**. Tick "Add a README file". Click "Create repository".

This repository is your catalog. Every book you add becomes a small text file in it, and GitHub keeps every earlier version, so nothing you do in the app can be lost for good.

## 2. A key for each device

The app needs a key to read and write your repository. Make one for each phone, tablet or computer you will use, so a lost phone's key can be cancelled on its own.

1. Sign in to github.com in your browser.
2. Open this link: https://github.com/settings/personal-access-tokens/new?name=My+Loci+Library&description=Sync+for+one+device&expires_in=366&contents=write
   It opens GitHub's form for a new key with a name, a year's expiry and the permission "Contents: Read and write" already filled in. You may change the name to the device's ("My phone").
3. Find "Repository access" and choose "Only select repositories". In the list that appears, pick `my-loci-library-data`.
4. Scroll to the bottom and click "Generate token".
5. Copy the code it shows (it starts with `github_pat_`). GitHub shows it only once.

The same steps, with the link, are in the app under Settings › Advanced › Sync › "How to make a key".

## 3. Connect the app

1. Open https://jakobnath.github.io/my-loci-library/ on the device. On a phone, add it to the home screen (Safari: Share › Add to Home Screen; Chrome: menu › Add to Home screen) so it opens like an app, even with no connection.
2. Settings › Advanced › Sync. Type your repository as `your-github-name/my-loci-library-data`, paste the key, and tap "Connect and download".
3. Settings should then say "Connected". Do the same on each device, each with its own key.

## 4. Add books

Tap Add, then "Scan a barcode" and point the camera at the barcode on the back of a book. The app looks the book up, then asks one question per screen: is this the book, when was the work first written (a person always sets this; the app only suggests), the cover, the binding, and where it stands. Books without a barcode can be found by title or typed in.

Your changes are saved on the device at once and sent to GitHub a few seconds later. With no connection they wait, and go when the connection returns; the small "unsent" badge at the top shows how many are waiting.

## 5. Your settings

Settings › Advanced › The library holds the choices that describe your catalog (date style, currency, what adding asks for). They are saved in your repository, so every device you use shares them.

## When a key expires

The app says so in plain words and keeps every change on the device. Make a new key (step 2) and paste it in Settings › Advanced › Sync.

## Optional: the laptop tools

Backups to Google Drive, catalog heights for the shelf view, Logos import and sending books to Zotero are separate tools for a laptop with Node installed. They are at https://github.com/JakobNath/my-loci-library-tools, with instructions in their README. The app works fully without them; GitHub's history is already a backup of every change.
