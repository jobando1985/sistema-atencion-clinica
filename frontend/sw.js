// Service Worker mínimo para que la app sea instalable como PWA
const CACHE = 'clinica-v2';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './manifest.json',
    './icon.svg',
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    // Network-first para llamadas API; cache para assets estáticos
    const url = new URL(e.request.url);
    if (url.pathname.startsWith('/api/')) return;  // no interceptar API
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
