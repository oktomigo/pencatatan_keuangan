// service-worker.js — cache aset statis (CacheFirst), offline support

const CACHE_NAME    = 'catatuang-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/static/css/tokens.css',
  '/static/css/main.css',
  '/static/js/router.js',
  '/static/js/utils.js',
  '/static/js/mock.js',
  '/static/js/state.js',
  '/static/js/toast.js',
  '/static/js/modal.js',
  '/static/manifest.json',
];

// Install — cache semua aset statis
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — CacheFirst untuk aset statis, NetworkFirst untuk API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API routes: selalu ke network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Aset statis & halaman: CacheFirst
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached ?? fetch(event.request).then((response) => {
        // Cache response baru untuk aset statis
        if (response.ok && url.pathname.startsWith('/static/')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
    )
  );
});
