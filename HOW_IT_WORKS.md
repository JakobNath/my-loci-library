# How it works

A plain guide to the parts of My Loci Library and how to fix each one. It is written for someone who remembers nothing about the project.

## The parts

To be written as the parts are built.

## Verified approaches

Results of the phase 4 experiments go here.

## Phone test results

Results from `prototypes/phone-test.html`, run on real phones during the design stop.

- **Android 16, Firefox 159 (2026-11-09).** Firefox has no built-in barcode detector, so the bundled decoder was used. It loaded in 345 ms the first time and 65 ms once cached. It read ISBN 9780802867339 correctly in 9.5 s on the first try, including the time spent aiming, and in 2.0 s on the second try. Storage passed: persistent storage was granted, the quota was about 56 GB, 50 MB was written in 1.1 s and read back intact in 0.3 s.
- **iPhone, iOS 18.7, Safari (2026-11-09).** Safari has no built-in barcode detector switched on, so the bundled decoder was used. It loaded in 18 ms and read ISBN 9780802867339 correctly in 1.1 s. Storage passed: the quota was about 39 GB, 50 MB was written in 1.0 s and read back intact in 0.04 s. Persistent storage was not granted in an ordinary Safari tab, which is normal; the plan relies on the home-screen app, which Safari exempts from its seven-day clearing of site data. No change of decoder is needed.

Note for phase 6: the first scan took a while. Things to try then are asking the camera for continuous focus where supported and decoding only the middle band of the frame, where the barcode sits.

## Decisions

Choices made during the build that the plan did not settle, with the reason for each.

- **No GitHub CLI at the start (2026-11-08).** `gh` was not installed when the build began. All local work for phases 1 and 2 went ahead, and the GitHub repositories were created once `gh` was installed and signed in.
- **Line endings.** Every repository has a `.gitattributes` file that stores text with Unix line endings (LF), so files read the same on Windows and Linux.
- **Local preview server.** ES modules do not load from `file://` addresses, so during development the app is served with any static server (for example `python -m http.server`). Nothing in the app depends on which server is used.
- **Barcode decoder: zxing-wasm 3.1.6, reader build (2026-11-08).** The smallest reliable choice that reads EAN-13 in Safari on iPhone, where the browser's own `BarcodeDetector` is still switched off. It is about 1 MB in total and loads only on the scan screen. Android Chrome uses the browser's own detector when it supports EAN-13. Details and the one setting that must never be removed (pointing it at the local `.wasm` file) are in `vendor/README.md`.
- **Prototypes share one engine.** The five design options in `prototypes/` all use `prototypes/shared/proto.js` for behaviour and `prototypes/shared/base.css` for structure. Each option differs only in its own `tokens.css` and `option.css`, so the comparison is about the look, not about different features. The prototypes are throwaway and are not reused in the app.
- **Prototype covers are drawn, not photographed.** Each sample book is shown as a plain tile in roughly the color of its binding, so no outside images are fetched.
- **GitHub Pages serves the files as they are.** An empty `.nojekyll` file in the app repo turns off GitHub's Jekyll processing, so there is no build step on GitHub's side either. Pages publishes the `main` branch from the repository root.
- **Second round of designs (2026-11-09).** Feedback on the first five: options 1 (card catalog) and 3 (warm bookshop) were the favorites, but the look should be more timeless, modern and sleek, with fewer bright digital colors. Options 6 to 8 answer that: refined versions of 1 and 3 and a blend of the two, all in warm neutrals with one muted accent.
