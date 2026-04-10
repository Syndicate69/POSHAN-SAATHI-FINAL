const CACHE_NAME = 'poshan-saathi-cache-v2';
const URLS_TO_CACHE = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/screenshot-desktop.png',
  '/screenshot-mobile.png',
  '/favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Only cache GET requests
  if (e.request.method !== 'GET') return;
  
  // Don't cache API calls or external resources
  if (!e.request.url.startsWith(self.location.origin)) return;

  // Network First strategy
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response and cache it
        var responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(e.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // If network fails, try to return from cache
        return caches.match(e.request);
      })
  );
});
