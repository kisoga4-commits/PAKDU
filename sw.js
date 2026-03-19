//* sw-js open
// ======================================================================
// ⚙️ FAKDU Service Worker (Offline Engine)
// ======================================================================

// เปลี่ยนเลขเวอร์ชันตรงนี้ทุกครั้งที่มีการแก้โค้ด เพื่อบังคับให้แอปอัปเดต
const CACHE_NAME = 'fakdu-pwa-v9.32'; 

// รายชื่อไฟล์ทั้งหมดที่ต้องดูดเก็บไว้ในเครื่อง
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './client.html',
  './style.css',
  './manifest.json',
  './icon.png',
  './js/core.js',
  './js/client-core.js',
  './js/vault.js',
  // External CDNs (ตามที่คุณบรีฟไว้)
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://unpkg.com/html5-qrcode'
];

// 1. Install Event: ติดตั้งและโหลดไฟล์ทั้งหมดลง Cache ทันทีที่เปิดเว็บครั้งแรก
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all assets...');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => {
            // บังคับให้ Service Worker ตัวใหม่ทำงานทันทีโดยไม่ต้องรอโหลดหน้าใหม่
            return self.skipWaiting();
        })
    );
});

// 2. Activate Event: ล้าง Cache ตัวเก่าทิ้งเมื่อมีการเปลี่ยนเลข CACHE_NAME
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            // ให้ Service Worker เข้าควบคุมหน้าเว็บทั้งหมดทันที
            return self.clients.claim();
        })
    );
});

// 3. Fetch Event: เมื่อแอปต้องการไฟล์ ให้หาใน Cache ก่อน ถ้าไม่เจอก่อยไปหาในอินเทอร์เน็ต (Cache-First Strategy)
self.addEventListener('fetch', (event) => {
    // ข้ามการแคชข้อมูลจาก Firebase หรือ API อื่นๆ
    if (event.request.url.includes('firebaseio.com') || event.request.url.includes('googleapis.com/identity')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // ถ้าเจอไฟล์ในเครื่อง ให้ส่งกลับไปเลย (ทำงานได้แม้เน็ตตัด)
            if (cachedResponse) {
                return cachedResponse;
            }
            // ถ้าไม่เจอ ให้ไปดึงจากเน็ต
            return fetch(event.request).catch(() => {
                // กรณีเน็ตหลุดและไม่มีไฟล์ในแคชจริงๆ (เพื่อไม่ให้หน้าขาว)
                console.log('[Service Worker] Fetch failed and no cache available for:', event.request.url);
            });
        })
    );
});
//** sw-js close
