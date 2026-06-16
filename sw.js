// ==========================================================================
// SERVICE WORKER - SysNetSim PWA
// Versión del caché — incrementar para forzar actualización
// ==========================================================================
const CACHE_NAME = 'sysnetsim-v1';

// Archivos a cachear para uso offline completo
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/questions.js',
  '/manifest.json',
  '/sw.js',
  '/icon-192.png',
  '/icon-512.png',
  // Google Fonts CDN
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
  // FontAwesome CDN
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2'
];

// ==========================================================================
// INSTALL: Guarda todos los recursos en caché
// ==========================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando recursos de la aplicación...');
      // Usar addAll con manejo de errores individual para CDN externos
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url =>
          cache.add(url).catch(err => {
            console.warn(`[SW] No se pudo cachear: ${url}`, err);
          })
        )
      );
    }).then(() => {
      console.log('[SW] Instalación completa.');
      return self.skipWaiting();
    })
  );
});

// ==========================================================================
// ACTIVATE: Elimina cachés viejos
// ==========================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log(`[SW] Eliminando caché viejo: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activación completa — controlando todas las pestañas.');
      return self.clients.claim();
    })
  );
});

// ==========================================================================
// FETCH: Estrategia Cache-First con red como fallback
// ==========================================================================
self.addEventListener('fetch', (event) => {
  // Solo manejar peticiones GET
  if (event.request.method !== 'GET') return;

  // Para requests a la API de puntajes, usar siempre la red (no cachear)
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'Sin conexión' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Para todo lo demás: Cache-First
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Encontrado en caché — devuelve instantáneamente
        return cachedResponse;
      }

      // No está en caché — intenta la red y guarda el resultado
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Sin red y sin caché — devuelve index.html como fallback SPA
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
