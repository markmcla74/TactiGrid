const CACHE_NAME = 'tactigrid-v4';
const ASSETS = [
    './',
'./index.html',
'./style.css',
'./script.js',
'./manifest.json',
'./icon-192.png',
'./icon-512.png'
];

// Install: Cache all game assets
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force new service worker to activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// Activate: Delete old caches (like v1) when v2 takes over
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                .filter((name) => name !== CACHE_NAME)
                .map((name) => caches.delete(name))
            );
        })
    );
});

// Fetch: Serve cached assets first, fall back to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
