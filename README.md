# My Loci Library

A lightweight catalog of our physical books and Logos library. It runs in any modern browser, works offline, and keeps its data as plain text files in a separate private repository.

Created by Jakob Nath.

## Status

In use while the last build phases are finished. The app is published at
https://jakobnath.github.io/my-loci-library/

## Starting to catalog for real

The app keeps its catalog in a private GitHub repository. During the build it used `my-loci-library-test-data`; the real catalog lives in `my-loci-library-data`. To switch a device to the real catalog:

1. Make a key for this device: open https://github.com/settings/personal-access-tokens/new?name=My+Loci+Library&description=Sync+for+one+device&expires_in=366&contents=write while signed in to GitHub. The form opens with a name, a year's expiry and "Contents: Read and write" already set. Under "Repository access", choose "Only select repositories" and pick `my-loci-library-data`. Click "Generate token" and copy the code (it starts with `github_pat_`). The same steps are in the app, under Settings › Advanced › Sync › "How to make a key".
2. In the app: Settings › Advanced › Sync. Type `JakobNath/my-loci-library-data`, paste the token, and tap "Connect and download".
3. A device that was connected to the test data still holds the sample books. When it connects to the real catalog, the app first checks the new repository and key, then asks before removing the sample books from the device (version 1.1.1 and later). They stay in the test repository, and no sample book is sent to the real catalog. The device keeps its keys and settings.
4. On the laptop, set `dataRepo` in the tools' `config.json` to the real repository's folder, and schedule `loci-backup` (see the tools README).

Each device has its own token. When one expires, make a new one the same way; the catalog on the device is kept.

## Where to read next

- `docs/plan/PLAN.md`: the master plan.
- `DATA_FORMAT.md`: how the catalog is stored (written in phase 3).
- `HOW_IT_WORKS.md`: the parts of the app and how to repair each one.
- `DEVICE_CHECKS.md`: things that can only be checked on a real phone.
- `SETUP_FOR_COLLEAGUES.md`: setting up your own copy.

## Self-tests

Serve this folder with any static web server and open `tests/index.html`. Each check prints a pass or fail line, followed by a total.

## License

MIT. See `LICENSE`.
