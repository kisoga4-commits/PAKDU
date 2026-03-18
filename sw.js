const CACHE_NAME = 'FAKDU-V9.22'; // ขยับเลขตรงนี้ (เช่น 9.22 -> 9.23) เพื่อบังคับลูกค้าอัปเดต
const assets = ['/', '/index.html', '/client.html'];

self.addEventListener('install', (e) => {
  self.skipWaiting(); 
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(assets)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => {
    return Promise.all(ks.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
  }));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
