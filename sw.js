const CACHE_NAME = 'essence-pwa-v1';
const urlsToCache = [
  '/essence-pasaporte/',
  '/essence-pasaporte/index.html',
  '/essence-pasaporte/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve la caché si existe, si no, busca en la red
        return response || fetch(event.request);
      })
  );
});
