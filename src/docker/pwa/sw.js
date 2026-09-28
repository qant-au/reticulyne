/* APP-02: the Docker editor's service worker. Built by
 * webpack/pwa-plugin.js, which replaces the two placeholders below with a
 * cache name derived from the build and the list of files it emitted.
 *
 * - Everything the build emitted is cached at install, so the editor opens
 *   offline after its first load.
 * - Pages are network-first: a redeploy is picked up on the next load, and
 *   the cached page is the fallback only when the network is down.
 * - Other same-origin files are cache-first. Their names carry a content
 *   hash, so a cached copy can never be stale.
 * - Cross-origin requests (Google Fonts) are left to the browser.
 */
/* global self, caches, fetch, URL, __PRECACHE__ */
const CACHE = '__CACHE__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('reticulyne-') && key !== CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./', copy));
          return response;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
