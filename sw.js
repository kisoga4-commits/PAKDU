const CACHE_NAME = 'FAKDU-V9.22'; // เปลี่ยนเลขตรงนี้ทุกครั้งที่อัปเดต!
const assets = [
  '/',
  '/index.html',
  '/client.html',
  // รายการไฟล์อื่นๆ ของป๋า
];

// 1. ตอนติดตั้ง: สั่งให้ข้ามการรอ (Skip Waiting)
self.addEventListener('install', (e) => {
  self.skipWaiting(); 
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(assets))
  );
});

// 2. ตอนทำงาน: ลบแคชเวอร์ชันเก่าทิ้งทันที (Activate & Clean old cache)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)) // ล้างของเก่าทิ้งให้เกลี้ยง!
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
