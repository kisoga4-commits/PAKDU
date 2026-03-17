const CACHE_NAME = 'FAKDU-Cache-v9.20';

// รายชื่อไฟล์และลิงก์ทั้งหมดที่แอปต้องกักตุนไว้ใช้ตอน Offline
// สังเกตว่าผมเพิ่ม ./client.html เข้าไปเตรียมรอไว้แล้ว
const ASSETS_TO_CACHE = [

  './',

  './index.html',

  './manifest.json',

  'https://cdn.tailwindcss.com',

  'https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;900&display=swap',

  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',

  'https://unpkg.com/html5-qrcode'

];

// 1. ขั้นตอนติดตั้ง (Install): บังคับโหลดไฟล์ทั้งหมดไปเก็บในคลัง (Cache) ทันที
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] กักตุนไฟล์สำเร็จ (Caching assets)');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // บังคับให้ SW ตัวใหม่ทำงานทันที
});

// 2. ขั้นตอนทำความสะอาด (Activate): ลบ Cache ของ V9.19 หรือเวอร์ชันเก่าๆ ทิ้ง ป้องกันไฟล์ตีกัน
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] ลบ Cache เก่าทิ้ง: ', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. ขั้นตอนดักจับการดึงข้อมูล (Fetch): ลอจิกแก้จอขาว
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 3.1 ถ้าเจอไฟล์ใน Cache (แม้ไม่มีเน็ต) ให้ส่งไฟล์นั้นไปโชว์เลย จอไม่ขาวแน่นอน!
      if (response) {
        return response;
      }
      
      // 3.2 ถ้าไม่เจอใน Cache ค่อยวิ่งไปหาอินเทอร์เน็ต
      return fetch(event.request).catch(() => {
        // 3.3 ถ้าเน็ตก็หลุด แล้วดันหาไฟล์ไม่เจอ ให้บังคับโยนหน้า index.html กลับไปให้ (Offline Fallback)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
