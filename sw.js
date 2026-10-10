// Vaishno Pearl Maintenance Tracker — service worker
// Network-first strategy: always tries to fetch the latest version first,
// and only falls back to the cached copy if the device is offline.
// This avoids "stuck on an old version" problems for a frequently-updated app.

const CACHE_NAME = 'vaishno-pearl-v604';
const PRECACHE_URLS = [
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Same-origin files (index.html etc.): always revalidate with the server so the browser's
  // HTTP cache (GitHub Pages allows ~10 min) can never serve a stale copy after an update.
  const sameOrigin = new URL(event.request.url).origin === self.location.origin;
  const net = sameOrigin ? fetch(event.request.url, { cache: 'no-cache' }) : fetch(event.request);

  event.respondWith(
    net
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
