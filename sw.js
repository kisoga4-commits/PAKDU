const CACHE_NAME = 'FAKDU-Cache-v9.21';

// รายชื่อไฟล์ที่แอปจะ "ดูด" เก็บไว้ในเครื่องทันทีที่ติดตั้ง
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './client.html',
  './manifest.json',
  './icon.png', // <--- เพิ่มชื่อไฟล์รูปโลโก้ของป๋าตรงนี้แล้ว
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://unpkg.com/html5-qrcode'
];

// 1. ขั้นตอนติดตั้ง: โหลดไฟล์เข้าโกดังในเครื่อง
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('V9.21: กำลังกักตุนไฟล์รวมถึง icon.png...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. ขั้นตอนอัปเดต: ลบของเก่าทิ้งเมื่อมีการเปลี่ยนเลข CACHE_NAME
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
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
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response; 
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
