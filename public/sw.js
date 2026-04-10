const CACHE_NAME = 'poshan-saathi-cache-v3';
const OFFLINE_URL = '/offline.html';
const BG_SYNC_TAG = 'sync-pending-posts';
const PERIODIC_SYNC_TAG = 'periodic-refresh';

const URLS_TO_CACHE = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/screenshot-desktop.png',
  '/screenshot-mobile.png',
  '/favicon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      )
    )
  );
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;

        if (e.request.mode === 'navigate') {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }

        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
  );
});

// One-off background sync
self.addEventListener('sync', (e) => {
  if (e.tag === BG_SYNC_TAG) {
    e.waitUntil(retryPendingPosts());
  }
});

// Periodic sync
self.addEventListener('periodicsync', (e) => {
  if (e.tag === PERIODIC_SYNC_TAG) {
    e.waitUntil(refreshCachedData());
  }
});

// Push notifications
self.addEventListener('push', (e) => {
  let data = { title: 'Poshan Saathi', body: 'You have a new update', url: '/' };

  if (e.data) {
    try {
      data = e.data.json();
    } catch {
      data.body = e.data.text();
    }
  }

  e.waitUntil(
    self.registration.showNotification(data.title || 'Poshan Saathi', {
      body: data.body || 'You have a new update',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(clients.openWindow(targetUrl));
});

// TODO: Implement with IndexedDB queue of failed POST requests
async function retryPendingPosts() {
  return Promise.resolve();
}

// TODO: Periodic refresh endpoint(s) you want updated
async function refreshCachedData() {
  try {
    const res = await fetch('/api/summary');
    if (res && res.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/summary', res.clone());
    }
  } catch (err) {
    // ignore when offline
  }
}
