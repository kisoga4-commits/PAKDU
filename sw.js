// ตั้งชื่อเวอร์ชันแคช (ถ้าวันหลังพี่แก้โค้ด ให้มาเปลี่ยนเลขตรงนี้เป็น v7.18 เพื่อให้แอปอัปเดต)
const CACHE_NAME = 'FAKDU-Cache-v7.17';

// ไฟล์แกนหลักที่ต้องบังคับโหลดลงเครื่องทันที (Pre-cache)
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// 1. Install Event (ติดตั้งทหารยาม และสูบไฟล์หลักลงแคช)
self.addEventListener('install', (event) => {
    self.skipWaiting(); // บังคับให้ Service Worker ตัวใหม่ทำงานทันที ไม่ต้องรอปิดแอป
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching Core Assets...');
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// 2. Activate Event (ตื่นขึ้นมาทำงาน และลบแคชเวอร์ชันเก่าทิ้ง)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // ถ้าชื่อแคชไม่ตรงกับเวอร์ชันปัจจุบัน ให้ลบทิ้งไปเลย (กันไฟล์ขยะล้นเครื่อง)
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // สั่งให้ทหารยามคุมหน้าเว็บทันที
    );
});

// 3. Fetch Event (ดักจับทุกการดึงข้อมูล เพื่อทำระบบ Offline 100%)
self.addEventListener('fetch', (event) => {
    // ข้ามการแคชพวก Chrome Extension หรือ API แปลกๆ
    if (!(event.request.url.indexOf('http') === 0)) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // เจอไฟล์ในแคช? เอาไปใช้เลย! (เน็ตหลุดก็ทำงานได้)
            if (cachedResponse) {
                return cachedResponse;
            }
            
            // ถ้าไม่เจอในแคช (เช่น พวก Tailwind, CDN) ให้วิ่งไปหาเน็ต
            return fetch(event.request).then((networkResponse) => {
                // ถ้าโหลดไม่ได้ หรือเป็นไฟล์แปลกๆ ให้ปล่อยผ่าน
                if (!networkResponse || networkResponse.status !== 200 || (networkResponse.type !== 'basic' && networkResponse.type !== 'cors')) {
                    return networkResponse;
                }

                // ถ้าโหลดสำเร็จ ให้ก็อปปี้ไฟล์นั้นยัดลงแคชไว้ด้วย (Dynamic Caching)
                // คราวหน้าเปิดแอปแบบไม่มีเน็ต จะได้มีไฟล์พวกนี้ใช้
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // ถ้าเน็ตหลุด และหาในแคชไม่เจอ
                console.log('[SW] You are offline and resource is not cached.');
            });
        })
    );
});
