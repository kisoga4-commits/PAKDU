const CACHE_NAME = 'FAKDU-Cache-v9.21';

// 🚀 รายชื่อไฟล์ที่จะกักตุนไว้ในเครื่อง (ตัดตัวที่เสี่ยง Error ออกให้แล้ว)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './client.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// 1. ขั้นตอนติดตั้ง: โหลดไฟล์ลงโกดัง (ถ้าตัวไหนโหลดไม่ได้ จะข้ามไปก่อนไม่ให้เครื่องค้าง)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('V9.21: กำลังกักตุนไฟล์สำรองไว้ใช้ตอนออฟไลน์...');
      // ใช้สูตรถนอมเครื่อง: ตัวไหนโหลดไม่ได้ไม่เป็นไร เครื่องไม่พัง
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

// 2. ขั้นตอนอัปเดต: โละ Cache เก่าทิ้งเมื่อมีการเปลี่ยนเลข V9.21
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('V9.21: ลบแคชเก่าทิ้งเรียบร้อย');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. ขั้นตอนดักจับ: ถ้าไม่มีเน็ต ให้ดึงไฟล์จากโกดังมาโชว์ (กันจอขาว)
self.addEventListener('fetch', (event) => {
  // ไม่ดักจับข้อมูลจาก Firebase (ต้องใช้เน็ตจริงเท่านั้น)
  if (event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response; // ถ้ามีในแคช เอาไปใช้เลย
      
      return fetch(event.request).catch(() => {
        // ถ้าโหลดไม่ได้และเป็นหน้าหลัก ให้เปิด index.html สำรอง
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
