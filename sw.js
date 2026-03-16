const CACHE_NAME = 'FAKDU-Cache-v7.20';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // ใส่ไฟล์ CSS/JS ภายนอกที่แอปต้องใช้
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://unpkg.com/html5-qrcode'
];

// 1. ตอนติดตั้งแอป: กวาดไฟล์เข้าคลังให้หมด
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('FAKDU: กักตุนเสบียงเรียบร้อย!');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. ตอนเปลี่ยนเวอร์ชัน: เคลียร์คลังเก่าทิ้ง ไม่ให้ข้อมูลตีกัน
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// 3. ตอนดักฟังคำสั่งเรียกไฟล์ (หัวใจสำคัญกันจอขาว)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // ถ้าในคลังมีไฟล์ (Offline) -> ส่งไฟล์นั้นเลย
      // ถ้าในคลังไม่มี -> วิ่งไปหาเน็ต (Online)
      return cachedResponse || fetch(event.request);
    })
  );
});
