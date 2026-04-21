const CACHE_NAME = 'timer-app-v1';
const urlsToCache = [
  '/Timer-App/',
  '/Timer-App/index.html',
  '/Timer-App/styles.css',
  '/Timer-App/app.js',
  '/Timer-App/manifest.json',
  '/Timer-App/icons/icon-192.svg',
  '/Timer-App/icons/icon-512.svg'
];

// Install service worker and cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
