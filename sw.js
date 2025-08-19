// sw.js

const CACHE_NAME = 'alerts-pwa-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// On install: Pre-cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(self.skipWaiting())
  );
});

// On activate: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// On fetch: Respond from cache first, fallback to network, cache new requests
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request)
          .then(networkRes => {
            // Only cache successful responses for GETs (not POST, etc)
            if (
              event.request.method === 'GET' &&
              networkRes &&
              networkRes.status === 200 &&
              (networkRes.type === 'basic' || networkRes.type === 'cors')
            ) {
              let resClone = networkRes.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
            }
            return networkRes;
          })
          .catch(() => {
            // Fallback logic: Return a simple offline page or asset
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Listen for skipWaiting to update service worker immediately
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
