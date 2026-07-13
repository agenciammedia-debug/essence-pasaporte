const CACHE_NAME = 'essence-pwa-v1';
const urlsToCache = [
  '/essence-pasaporte/',
  '/essence-pasaporte/index.html',
  '/essence-pasaporte/app.js',
  '/essence-pasaporte/style.css',
  '/essence-pasaporte/manifest.json'
];

// Instalar el Service Worker y almacenar en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Interceptar peticiones y devolver desde caché si es necesario
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve el recurso de la caché si existe, si no, lo pide a la red
        return response || fetch(event.request);
      })
  );
});
