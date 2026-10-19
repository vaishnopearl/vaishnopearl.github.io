// Vaishno Pearl Maintenance Tracker — service worker
// Network-first strategy: always tries to fetch the latest version first,
// and only falls back to the cached copy if the device is offline.
// This avoids "stuck on an old version" problems for a frequently-updated app.

const CACHE_NAME = 'vaishno-pearl-v7920';
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
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== 'vp-share').map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Share-to-app: receipts shared from WhatsApp land here, are parked in a cache, then the app opens.
  if (event.request.method === 'POST' && new URL(event.request.url).pathname.endsWith('/share-target')) {
    event.respondWith((async () => {
      try {
        const fd = await event.request.formData();
        const files = fd.getAll('receipts');
        const c = await caches.open('vp-share');
        let i = 0;
        for (const f of files) {
          if (!f || !f.size) continue;
          await c.put(new URL('./__share/' + Date.now() + '-' + (i++), self.registration.scope).href,
            new Response(f, { headers: { 'Content-Type': f.type || 'image/jpeg', 'x-shared-at': String(Date.now()) } }));
        }
      } catch (e) {}
      return Response.redirect(new URL('./index.html?share=1', self.registration.scope).href, 303);
    })());
    return;
  }
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
