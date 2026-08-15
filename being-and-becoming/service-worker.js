// Being and Becoming — service worker
//
// Strategy: network-first, falling back to cache only when offline.
// This app changes fairly often, so the priority is "always get the latest
// version when online" — the cache exists purely so the app still opens
// (with whatever was last successfully loaded) if there's no connection at all.
//
// IMPORTANT: bump CACHE_NAME every time you publish a new version of index.html.
// That's what makes the old cached copy get cleaned up automatically — if you
// forget, the app will still update fine (network-first), it just means the old
// cached fallback copy sticks around a little longer than it needs to.
const CACHE_NAME = 'being-and-becoming-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Got a fresh copy from the network — use it, and update the cache
        // in the background so the offline fallback stays reasonably current.
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => {
        // Offline (or the request failed) — fall back to whatever's cached.
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Last resort for navigations: serve the cached app shell itself.
          if (event.request.mode === 'navigate') return caches.match('./index.html');
        });
      })
  );
});
