// The service worker: keeps the app's own files on the device so it opens
// with no connection, and fetches a new version in the background. A new
// version waits until the person taps "Reload", so nothing changes mid-task.
//
// To release a new version, change VERSION. The files listed below are the
// whole app; the barcode decoder is cached the first time the scan screen
// opens. Prototypes, tests and docs are never cached.

const VERSION = 'v0.5.1';
const FILES = [
  './', 'index.html', 'main.js', 'manifest.webmanifest', 'styles/tokens.css', 'styles/app.css',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-512.png',
  'core/ids.js', 'core/html.js', 'core/dating.js', 'core/anthology.js', 'core/pages.js', 'core/sizes.js',
  'core/search.js', 'core/records.js', 'core/merge.js', 'core/shelf-order.js', 'core/zotero.js', 'core/library.js', 'core/contents.js',
  'edges/storage.js', 'edges/device.js',
  'ui/icons.js', 'ui/pieces.js', 'ui/long-list.js', 'ui/library.js', 'ui/book.js', 'ui/shelf.js', 'ui/wishlist.js', 'ui/settings.js', 'ui/edit.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name !== VERSION).map(name => caches.delete(name)))));
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
  if (!FILES.includes(path || './')) return;
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then(hit => hit || fetch(event.request)));
});
