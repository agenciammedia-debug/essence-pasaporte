importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// 1. Ignorar notificaciones automáticas de suscripción que no vengan de tu backend
self.addEventListener('push', function(event) {
  if (event.data) {
    let data = event.data.json();
    // Si el mensaje es el de bienvenida genérico, lo descartamos
    if (data.alert && data.alert.includes('subscribing')) {
      event.stopImmediatePropagation();
    }
  }
});

// 2. Configuración de caché más segura para no romper la conexión
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 3. Estrategia de Fetch mejorada (Prioridad a red, caché como respaldo)
self.addEventListener('fetch', (event) => {
  // Ignoramos las llamadas a la API de OneSignal para que no las cachee
  if (event.request.url.includes('onesignal.com')) return;
  
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
