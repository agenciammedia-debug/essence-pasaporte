importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'essence-pwa-v1';
const urlsToCache = [
  '/essence-pasaporte/',
  '/essence-pasaporte/index.html',
  '/essence-pasaporte/manifest.json'
];

// Usamos un Service Worker vacío pero activo.
// Esto permite que Android detecte la PWA como "instalable" 
// sin el riesgo de bloquear archivos con caché vieja.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Esta estrategia garantiza que la app siempre busque la versión más nueva en Google
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
