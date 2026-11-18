const SW_VERSION = '2.6.0-ota';
const CACHE_NAME = `infinite-notes-cache-v${SW_VERSION}`;

// Static shell assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/version.json',
  '/1000445683.png',
  '/library-bg.png',
  '/app-icon.png',
  '/app-icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/maskable-icon-512.png',
  '/apple-touch-icon.png'
];

// Install Event: Precache core shell & activate immediately if requested
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      // Notify clients that a new SW bundle is installed in background
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'OTA_SW_INSTALLED',
            version: SW_VERSION
          });
        });
      });
    })
  );
});

// Activate Event: Purge outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW-OTA] Deleting legacy cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      // Notify active clients that new version is live
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'OTA_SW_ACTIVATED',
            version: SW_VERSION
          });
        });
      });
    })
  );
});

// Fetch Event: Cache Invalidation & Network-First strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests or non-http(s)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Bypass Firebase, Firestore, Google APIs, and backend /api routes
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // 1. version.json manifest: ALWAYS Network-Only (with short cache fallback for offline)
  if (url.pathname === '/version.json') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 2. HTML Navigation requests: Network-First to guarantee latest live OTA UI
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/') || caches.match('/index.html');
        })
    );
    return;
  }

  // 3. Static Assets (JS / CSS / SVG / Fonts): Stale-While-Revalidate with Background Cache Refresh
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          // Ignore network errors when offline
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Message Listener for client-side OTA coordination
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    console.log('[SW-OTA] skipWaiting triggered by client');
    self.skipWaiting();
  }

  if (event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({
        version: SW_VERSION,
        cacheName: CACHE_NAME
      });
    }
  }

  if (event.data.type === 'PURGE_AND_ROLLBACK') {
    console.log('[SW-OTA] Emergency purge & rollback requested');
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      self.registration.unregister().then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      });
    });
  }
});
