const CACHE_NAME = 'parking-app-v1';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icon-light-32x32.png',
    '/apple-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Simple network-first strategy for dynamic routes, cache-first for static assets
    const url = new URL(event.request.url);

    if (STATIC_ASSETS.includes(url.pathname)) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    } else {
        // Network first for other requests
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
    }
});
