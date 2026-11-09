# Vendored code

Third-party code copied into this repository. Nothing is loaded from the internet. The plan allows one library here (the barcode decoder) and never more than two.

## zxing-wasm 3.1.6 (barcode decoder)

- Files: `zxing-wasm/zxing-reader.js` (the "reader" build, as a plain script that defines the global `ZXingWASM`) and `zxing-wasm/zxing_reader.wasm`.
- Source: https://github.com/Sec-ant/zxing-wasm, npm package `zxing-wasm`, version 3.1.6, copied from `dist/iife/reader/index.js` and `dist/reader/zxing_reader.wasm`.
- It wraps the zxing-cpp barcode library (https://github.com/zxing-cpp/zxing-cpp), compiled to WebAssembly.
- Licenses: MIT for zxing-wasm (`zxing-wasm/LICENSE-zxing-wasm.txt`), Apache 2.0 for zxing-cpp (`zxing-wasm/LICENSE-zxing-cpp.txt`).
- Size: about 38 KB of JavaScript and 950 KB of WebAssembly. It is loaded only on the scan screen.
- SHA-256 of the files as copied:
  - `zxing-reader.js`: ffd72d59d54082194f7c086b384dcd930bdeb0c5b39fbb13779694e69bb0d344
  - `zxing_reader.wasm`: 5003fb4b88c4fbd1fd518a2fd8c8ad365c519e183a08c03a322dddfea3cea84e

### Why this one

It reads EAN-13 (the barcode on the back of books) reliably, including from camera frames that are slightly blurred or tilted, and works in Safari on iPhone, where the browser's own `BarcodeDetector` is still switched off. It is the reader-only build, so it carries no code for creating barcodes.

### Important when using it

By default the script fetches its `.wasm` file from a public CDN. The app must always tell it to use the local copy instead:

```js
ZXingWASM.prepareZXingModule({
  overrides: { locateFile: (path, prefix) => new URL('vendor/zxing-wasm/' + path, base).href }
});
```

### Upgrading

Download a newer version of the npm package, copy the same two files, update the version, hashes and size above, and rerun the phone test page on an iPhone and an Android phone.
