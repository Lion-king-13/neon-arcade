// sw.js — service worker minimal (requis pour l'installabilité PWA / empaquetage Meta)
const CACHE = 'neon-arcade-v1';
const ASSETS = [
  './', './index.html', './engine.js', './hub.js', './manifest.webmanifest',
  './games/whackamole.js', './games/butterflies.js', './games/ducks.js',
  './games/shooting.js', './games/balloons.js', './games/chamboultout.js',
  './games/reflexpads.js', './games/fishing.js', './games/ringtoss.js',
  './assets/icon-192.png', './assets/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  // Cache d'abord pour les fichiers locaux ; réseau pour le reste (ex : Three.js via CDN).
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});