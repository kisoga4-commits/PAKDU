const CACHE_NAME = 'resto-pos-v1.0.0';

// ระบุไฟล์ที่ต้องการโหลดเก็บไว้ในเครื่องมือถือ (App Shell)
// ทำให้แอปเปิดติดทันทีแม้ปิดเน็ต
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 1. Install Event: ติดตั้ง Service Worker และดึงไฟล์เข้าตู้เซฟ
self.addEventListener('install', (event) => {
  self.skipWaiting(); // บังคับให้ Service Worker ตัวใหม่เข้าทำงานทันที ไม่ต้องรอปิดแอป
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate Event: ล้าง Cache เก่าทิ้งเมื่อมีการเปลี่ยนเวอร์ชัน (เปลี่ยน CACHE_NAME)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // สั่งให้ Service Worker คุมหน้าเว็บทันที
  );
});

// 3. Fetch Event: หัวใจของระบบ Offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ⚠️ กฎเหล็ก: ห้าม Cache ข้อมูลจากฐานข้อมูล (Firebase/API/WebSocket)
  // ปล่อยให้มันวิ่งออกเน็ตไปตรงๆ ข้อมูลจะได้ไม่เพี้ยนและซิงค์ได้ปกติ
  if (
    url.hostname.includes('firebase') || 
    url.hostname.includes('firestore') || 
    url.hostname.includes('googleapis') ||
    url.protocol === 'ws:' || 
    url.protocol === 'wss:' ||
    event.request.method !== 'GET' // Cache เฉพาะการอ่านไฟล์ ไม่ Cache การส่งข้อมูล (POST/PUT/DELETE)
  ) {
    return; 
  }

  // ใช้กลยุทธ์ "Cache First, fall back to Network"
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 3.1 ถ้าเจอไฟล์ในเครื่อง ให้โหลดขึ้นมาแสดงทันที (ไวปานสายฟ้า)
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 3.2 ถ้าไม่เจอในเครื่อง ให้ไปดึงจากอินเทอร์เน็ต
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        // 3.3 ระบบ Fallback: ถ้าเน็ตหลุดและพนักงานเผลอกดรีเฟรชหน้าเว็บ
        // ให้เด้งกลับไปโหลดหน้า index.html เสมอ เพื่อไม่ให้จอขาว
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
