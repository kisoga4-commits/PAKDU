const CACHE_NAME = 'pos-thaiban-v1';

// รายชื่อไฟล์ที่ต้องการให้มันจำไว้ในเครื่อง (ฝังลงมือถือ)
const urlsToCache = [
  './',
  './index.html',
  './shop.html',
  './manifest.json',
  './icon.png'
];

// 1. ตอนติดตั้งแอป (Install) -> ให้โหลดไฟล์มาเก็บไว้
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('กำลังฝังไฟล์ลงเครื่อง...');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. ตอนดึงข้อมูล (Fetch) -> ถ้าไม่มีเน็ต ให้เอาของที่จำไว้มาโชว์
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // ถ้าเจอไฟล์ในเครื่อง (Offline) ให้ใช้เลย
        if (response) {
          return response;
        }
        // ถ้าไม่เจอ ค่อยวิ่งไปหาจากเน็ต
        return fetch(event.request);
      })
  );
});

// 3. ตอนอัปเดตแอป (Activate) -> ล้างไฟล์เก่าทิ้งถ้ามีการอัปเดตเวอร์ชัน
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});