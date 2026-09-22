// service-worker.js - cache aset statis dan fallback dashboard offline.

const CACHE_NAME = 'catatuang-v2';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/static/css/tokens.css',
  '/static/css/main.css',
  '/static/manifest.json',
  '/static/icons/icon-192.svg',
  '/static/icons/icon-512.svg',
  '/static/js/api.js',
  '/static/js/router.js',
  '/static/js/utils.js',
  '/static/js/toast.js',
  '/static/js/modal.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;

  if (url.pathname === '/api/dashboard') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && new URL(request.url).origin === self.location.origin) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ success: false, error: { code: 'OFFLINE', message: 'Mode offline.' } }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}
