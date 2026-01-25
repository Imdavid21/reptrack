const CACHE_NAME = 'health-os-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Dynamic cache for API responses
const API_CACHE_NAME = 'health-os-api-v1';
const API_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests: Network first, fall back to cache
  if (url.pathname.includes('/functions/') || url.hostname.includes('supabase')) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Static assets: Cache first, fall back to network
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML: Network first for fresh content
  if (request.destination === 'document') {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Default: Network first
  event.respondWith(networkFirstWithCache(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline page if available
    return caches.match('/');
  }
}

// Network-first strategy with cache fallback
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful GET responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // For API requests, return a JSON error
    if (request.url.includes('/functions/')) {
      return new Response(
        JSON.stringify({ error: 'Offline', offline: true }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // For HTML, return cached index
    return caches.match('/');
  }
}

// Handle skip waiting message
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
