# My Loci Library

A lightweight catalog of our physical books and Logos library. It runs in any modern browser, works offline, and keeps its data as plain text files in a separate private repository.

Created by Jakob Nath.

## Status

In use while the last build phases are finished. The app is published at
https://jakobnath.github.io/my-loci-library/

## Starting to catalog for real

The app keeps its catalog in a private GitHub repository. During the build it used `my-loci-library-test-data`; the real catalog lives in `my-loci-library-data`. To switch a device to the real catalog:

1. On github.com, make a fine-grained personal access token for this device: Settings › Developer settings › Personal access tokens › Fine-grained tokens. Repository access: only `my-loci-library-data`. Permissions: Contents, read and write. Give it an expiry (a year) and name it after the device.
2. In the app: Settings › Advanced › Sync. Type `JakobNath/my-loci-library-data`, paste the token, and tap "Connect and download".
3. A device that was connected to the test data still holds the sample books. Before connecting it to the real catalog, clear the site's data for the app in the browser's settings (or use a private window once to check), so no sample book is sent to the real catalog.
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
