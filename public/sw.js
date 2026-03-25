self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // This empty fetch handler is required to satisfy the PWA install criteria
  // so that Android Chrome generates a WebAPK and hides the browser top bar.
});
