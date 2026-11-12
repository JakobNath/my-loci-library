// The service worker: keeps the app's own files on the device so it opens
// with no connection, and fetches a new version in the background. A new
// version waits until the person taps "Reload", so nothing changes mid-task.
//
// To release a new version, change VERSION. The files listed below are the
// whole app; the barcode decoder is cached the first time the scan screen
// opens. Prototypes, tests and docs are never cached.

const VERSION = 'v1.12.0';
const FILES = [
  './', 'index.html', 'main.js', 'manifest.webmanifest', 'styles/tokens.css', 'styles/app.css', 'styles/screens.css',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-512.png',
  'core/ids.js', 'core/html.js', 'core/dating.js', 'core/anthology.js', 'core/pages.js', 'core/sizes.js',
  'core/search.js', 'core/records.js', 'core/merge.js', 'core/shelf-order.js', 'core/zotero.js', 'core/library.js', 'core/contents.js', 'core/entry.js',
  'core/lookup.js', 'core/book-data.js', 'core/marc.js', 'core/wikidata.js', 'core/bible.js', 'core/matching.js', 'core/settings.js', 'core/trash.js', 'core/lists.js', 'core/value.js', 'core/exports.js', 'core/backup-status.js', 'core/outline.js', 'core/known-sets.js',
  'edges/storage.js', 'edges/device.js', 'edges/lookup-openlibrary.js', 'edges/lookup-googlebooks.js', 'edges/lookup-hathitrust.js', 'edges/lookup-wikidata.js', 'edges/camera.js', 'edges/photo.js', 'edges/sync-github.js',
  'ui/icons.js', 'ui/pieces.js', 'ui/long-list.js', 'ui/library.js', 'ui/book.js', 'ui/book-more.js', 'ui/shelf.js', 'ui/wishlist.js', 'ui/settings.js', 'ui/lists.js', 'ui/value.js', 'ui/save-file.js', 'ui/edit.js',
  'ui/add.js', 'ui/add-questions.js', 'ui/add-set.js', 'ui/works.js', 'ui/images.js', 'ui/photo-editor.js', 'ui/field-help.js', 'ui/known-sets.js',
  // The known sets' lists (ui/known-sets.js), read when adding and on the wishlist.
  'sets/great-books-1990.txt', 'sets/luthers-works.txt', 'sets/complete-greek-tragedies-2013.txt',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES)));
});

self.addEventListener('activate', event => {
  // Remove older versions, and look after open pages at once, so even the
  // first visit can go offline without a second reload.
  event.waitUntil(caches.keys()
    .then(names => Promise.all(names.filter(name => name !== VERSION).map(name => caches.delete(name))))
    .then(() => self.clients.claim()));
});

// The page asks the waiting version to take over when "Reload" is tapped.
self.addEventListener('message', event => {
  if (event.data === 'activate') self.skipWaiting();
});

// App files come from the cache first; anything else (lookups, GitHub,
// the self-tests) goes to the network as usual.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  const path = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  // The barcode decoder is kept the first time the scan screen loads it.
  if (path.startsWith('vendor/')) {
    event.respondWith(caches.open(VERSION).then(cache => cache.match(path).then(hit => hit || fetch(event.request).then(response => {
      if (response.ok) cache.put(path, response.clone());
      return response;
    }))));
    return;
  }
  if (!FILES.includes(path || './')) return;
  // ignoreVary: GitHub Pages marks files "Vary: Accept-Encoding", and some
  // browsers (Firefox) would otherwise refuse a stored copy when a page
  // load's headers differ from those used when it was stored.
  event.respondWith(caches.open(VERSION)
    .then(cache => cache.match(path || './', { ignoreSearch: true, ignoreVary: true }))
    .then(hit => hit || fetch(event.request)));
});
