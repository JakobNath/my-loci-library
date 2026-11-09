# How it works

A plain guide to the parts of My Loci Library and how to fix each one. It is written for someone who remembers nothing about the project.

## The parts

To be written as the parts are built.

## Verified approaches

Results of the phase 4 experiments go here.

## Decisions

Choices made during the build that the plan did not settle, with the reason for each.

- **No GitHub CLI at the start (2026-11-08).** `gh` was not installed when the build began. All local work for phases 1 and 2 went ahead, and the GitHub repositories were created once `gh` was installed and signed in.
- **Line endings.** Every repository has a `.gitattributes` file that stores text with Unix line endings (LF), so files read the same on Windows and Linux.
- **Local preview server.** ES modules do not load from `file://` addresses, so during development the app is served with any static server (for example `python -m http.server`). Nothing in the app depends on which server is used.
- **Barcode decoder: zxing-wasm 3.1.6, reader build (2026-11-08).** The smallest reliable choice that reads EAN-13 in Safari on iPhone, where the browser's own `BarcodeDetector` is still switched off. It is about 1 MB in total and loads only on the scan screen. Android Chrome uses the browser's own detector when it supports EAN-13. Details and the one setting that must never be removed (pointing it at the local `.wasm` file) are in `vendor/README.md`.
- **Prototypes share one engine.** The five design options in `prototypes/` all use `prototypes/shared/proto.js` for behaviour and `prototypes/shared/base.css` for structure. Each option differs only in its own `tokens.css` and `option.css`, so the comparison is about the look, not about different features. The prototypes are throwaway and are not reused in the app.
- **Prototype covers are drawn, not photographed.** Each sample book is shown as a plain tile in roughly the color of its binding, so no outside images are fetched.
