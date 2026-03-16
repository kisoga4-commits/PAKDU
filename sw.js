const CACHE_NAME = 'FAKDU-Cache-v8.0';

// รายชื่อไฟล์และลิงก์ทั้งหมดที่แอปต้องกักตุนไว้ใช้ตอน Offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://unpkg.com/html5-qrcode'
];

// 1. ติดตั้งแอป (Install) - โหลดเสบียงทุกอย่างมาเก็บไว้ในเครื่อง
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('FAKDU V8.0: โหลดไฟล์เก็บลงเครื่องสำเร็จ!');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. อัปเดตแอป (Activate) - ล้างแคชเวอร์ชันเก่าทิ้ง ป้องกันข้อมูลตีกัน
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. ดักจับการดึงข้อมูล (Fetch) - จุดแก้ปัญหาจอขาว
self.addEventListener('fetch', (event) => {
  // ไม่แคชคำสั่งที่วิ่งไปหา API หรือ Cloud (ถ้ามี)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // ถ้าไม่มีเน็ต: ให้ส่งไฟล์จากแคช (cachedResponse) ไปโชว์ที่หน้าจอ
      // ถ้ามีเน็ตแต่ไม่มีในแคช: ให้วิ่งไปดึงจากเน็ต (fetch)
      return cachedResponse || fetch(event.request);
    }).catch(() => {
      // ป้องกันบัคกรณีเน็ตหลุดและหาแคชไม่เจอ
      console.log('FAKDU: Offline mode fallback');
    })
  );
});
