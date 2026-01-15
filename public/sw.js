// Service Worker for Live Clipboard - Caching and Offline Support
const CACHE_NAME = 'live-clipboard-v1';
const OFFLINE_CACHE = 'live-clipboard-offline-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
];

// API routes that should use network-first strategy
const API_ROUTES = ['/api/'];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first - best for static assets
  cacheFirst: [
    /\.(?:js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|eot)$/,
    /^https:\/\/fonts\.googleapis\.com/,
    /^https:\/\/fonts\.gstatic\.com/,
  ],

  // Network first - best for API calls and dynamic content
  networkFirst: [
    ...API_ROUTES,
  ],

  // Network only - for non-cacheable requests
  networkOnly: [],

  // Cache only - for offline fallbacks
  cacheOnly: [],
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })))
          .catch(err => {
            console.warn('[SW] Some assets failed to cache:', err);
            // Continue installation even if some assets fail
            return Promise.resolve();
          });
      }),

      // Cache offline fallback page
      caches.open(OFFLINE_CACHE).then((cache) => {
        console.log('[SW] Caching offline fallback...');
        return cache.add(new Request('/offline', { cache: 'reload' }))
          .catch(() => {
            console.warn('[SW] Offline page not available yet');
            return Promise.resolve();
          });
      }),
    ]).then(() => {
      // Force the waiting service worker to become the active service worker
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),

      // Take control of all pages immediately
      self.clients.claim(),
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine which strategy to use
  const strategy = determineStrategy(url, request);

  if (strategy === 'cacheFirst') {
    event.respondWith(cacheFirstStrategy(request));
  } else if (strategy === 'networkFirst') {
    event.respondWith(networkFirstStrategy(request));
  } else if (strategy === 'networkOnly') {
    event.respondWith(networkOnlyStrategy(request));
  } else if (strategy === 'cacheOnly') {
    event.respondWith(cacheOnlyStrategy(request));
  } else {
    // Default: network first with cache fallback for same-origin requests
    if (url.origin === self.location.origin) {
      event.respondWith(networkFirstStrategy(request));
    } else {
      event.respondWith(networkOnlyStrategy(request));
    }
  }
});

// Determine the appropriate caching strategy
function determineStrategy(url, request) {
  const urlStr = url.href;
  const pathname = url.pathname;

  // Check cache-first patterns
  for (const pattern of CACHE_STRATEGIES.cacheFirst) {
    if (pattern instanceof RegExp && pattern.test(urlStr)) {
      return 'cacheFirst';
    }
    if (typeof pattern === 'string' && pathname.startsWith(pattern)) {
      return 'cacheFirst';
    }
  }

  // Check network-first patterns
  for (const pattern of CACHE_STRATEGIES.networkFirst) {
    if (pattern instanceof RegExp && pattern.test(urlStr)) {
      return 'networkFirst';
    }
    if (typeof pattern === 'string' && pathname.startsWith(pattern)) {
      return 'networkFirst';
    }
  }

  // Check network-only patterns
  for (const pattern of CACHE_STRATEGIES.networkOnly) {
    if (pattern instanceof RegExp && pattern.test(urlStr)) {
      return 'networkOnly';
    }
    if (typeof pattern === 'string' && pathname.startsWith(pattern)) {
      return 'networkOnly';
    }
  }

  // Check cache-only patterns
  for (const pattern of CACHE_STRATEGIES.cacheOnly) {
    if (pattern instanceof RegExp && pattern.test(urlStr)) {
      return 'cacheOnly';
    }
    if (typeof pattern === 'string' && pathname.startsWith(pattern)) {
      return 'cacheOnly';
    }
  }

  return null; // Use default strategy
}

// Cache First Strategy: Cache -> Network -> Offline
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log('[SW] Cache hit:', request.url);
    return cachedResponse;
  }

  try {
    console.log('[SW] Cache miss, fetching from network:', request.url);
    const networkResponse = await fetch(request);

    // Cache the response for future use
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Network request failed:', request.url, error);

    // Try to serve from offline cache
    const offlineCache = await caches.open(OFFLINE_CACHE);
    const offlineResponse = await offlineCache.match(request);

    if (offlineResponse) {
      return offlineResponse;
    }

    // Return a generic offline response
    return new Response('Offline - No cache available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

// Network First Strategy: Network -> Cache -> Offline
async function networkFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    console.log('[SW] Network first, fetching:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    console.error('[SW] No cache available:', request.url);

    // Try offline fallback for pages
    if (request.mode === 'navigate') {
      // Don't redirect to offline page for room pages - they need real-time connection
      const url = new URL(request.url);
      if (url.pathname.startsWith('/room/')) {
        console.log('[SW] Skipping offline fallback for room page');
        return new Response('Offline - Room requires connection', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain',
          }),
        });
      }
      
      const offlineCache = await caches.open(OFFLINE_CACHE);
      const offlineResponse = await offlineCache.match('/offline');

      if (offlineResponse) {
        return offlineResponse;
      }
    }

    // Return a 503 Service Unavailable response
    return new Response('Offline - Service Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

// Network Only Strategy: Network only, no caching
async function networkOnlyStrategy(request) {
  try {
    console.log('[SW] Network only, fetching:', request.url);
    return await fetch(request);
  } catch (error) {
    console.error('[SW] Network request failed:', request.url, error);

    // Return a 503 Service Unavailable response
    return new Response('Offline - Service Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain',
      }),
    });
  }
}

// Cache Only Strategy: Cache only, no network
async function cacheOnlyStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log('[SW] Serving from cache:', request.url);
    return cachedResponse;
  }

  console.error('[SW] Not in cache:', request.url);

  // Return a 404 Not Found response
  return new Response('Not Found in Cache', {
    status: 404,
    statusText: 'Not Found',
    headers: new Headers({
      'Content-Type': 'text/plain',
    }),
  });
}

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] Cache cleared');
      })
    );
  }
});

// Sync event - handle background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-messages') {
    event.waitUntil(
      // Implement sync logic here
      Promise.resolve()
    );
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.svg',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      data: {
        url: data.url || '/',
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Live Clipboard', options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

console.log('[SW] Service worker script loaded');
