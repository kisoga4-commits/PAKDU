//* globals open
// ======================================================================
// 🧠 FAKDU CORE v9.30 (Master Node Logic)
// ======================================================================
const DB_NAME = "FAKDU_PWA_DB_V930";
let idb;
let IS_PRO = false; // จะถูกอัปเดตจาก vault.js
let isAdminLoggedIn = localStorage.getItem('FAKDU_ADMIN_LOGGED_IN') === 'true'; 

// โครงสร้าง Database ใหม่ (เพิ่มระบบ Security)
const DEFAULT_DB = { 
    shopName: "FAKDU", logo: "", theme: "#800000", bgColor: "#f8fafc", 
    adminPin: "admin", unitType: "โต๊ะ", unitCount: 4, 
    licenseToken: null, // เปลี่ยนจาก isPro: false เพื่อป้องกันคนแก้ F12
    recPhone: null, recColor: null, recAnimal: null, // เก็บรหัสกู้คืนที่เข้ารหัสแล้ว
    bank: "", ppay: "", qrOffline: "", syncKey: "A1B2C3", 
    units: [], items: [], sales: [], carts: {}, fraudLogs: [] 
};
let db = { ...DEFAULT_DB };

// ตัวแปรสถานะ UI
let activeUnitId = null; let tempImg = null; let currentCheckoutTotal = 0; 
let pendingAddonItem = null; let currentAddonQty = 1; let gridZoom = 2;
//** globals close

//* database open
// 📦 ระบบ IndexedDB (Offline Storage)
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = e => {
            idb = e.target.result;
            if(!idb.objectStoreNames.contains('store')) idb.createObjectStore('store');
        };
        req.onsuccess = e => { idb = e.target.result; resolve(idb); };
        req.onerror = e => reject("DB Error");
    });
}
function saveToIDB() {
    return new Promise((resolve) => {
        const tx = idb.transaction('store', 'readwrite');
        tx.objectStore('store').put(db, 'fakdu_data');
        tx.oncomplete = () => { resolve(); };
    });
}
function loadFromIDB() {
    return new Promise((resolve) => {
        const tx = idb.transaction('store', 'readonly');
        const req = tx.objectStore('store').get('fakdu_data');
        req.onsuccess = () => resolve(req.result);
    });
}

function saveData() { 
    saveToIDB().then(() => { 
        renderAll(); applyTheme(); updateSyncStatusDots(); syncToCloud(); 
    }); 
}

// ☁️ Cloud Sync (รอเชื่อม Firebase ใน sync.js)
function syncToCloud() {
    if(!navigator.onLine || !IS_PRO) return;
    // firebase.database().ref('stores/' + machineID).set(db);
    console.log("Cloud Backup Triggered");
}
//** database close

//* boot open
// 🚀 เริ่มต้นระบบ (Boot Sequence)
async function initDB() {
    try {
        await openIndexedDB();
        const storedData = await loadFromIDB();
        if(storedData) { db = { ...DEFAULT_DB, ...storedData }; } 
        
        // เช็ค License ความเป็น PRO จาก vault.js
        IS_PRO = await isProActive();
        
        // ล้างแคชยอดขายที่เก่าเกิน 90 วันอัตโนมัติ
        const limit = Date.now() - (90 * 24 * 60 * 60 * 1000); 
        db.sales = db.sales.filter(s => s.id > limit);
        if(!db.fraudLogs) db.fraudLogs = []; 
        
        if(db.units.length === 0) forceRebuildUnits(db.unitCount, db.unitType, true);
        if(!db.carts) db.carts = {}; 
        db.units.forEach(u => { if(!db.carts[u.id]) db.carts[u.id] = []; });
        
        // เซ็ตวันที่เริ่มต้นสำหรับค้นหายอดขาย
        const td = getLocalYYYYMMDD(); 
        if(document.getElementById('search-start')) {
            document.getElementById('search-start').value = td; 
            document.getElementById('search-end').value = td;
        }
        
        updateSyncStatusDots(); updateSyncUI(); renderAll(); loadSettingsToForm(); 
        applyTheme(); updateGridZoomUI(); startTableTimers(); startHeartbeatMonitor();
    } catch(err) { 
        showToast("เกิดข้อผิดพลาดในการโหลดฐานข้อมูล", "error"); console.error(err); 
    }
}
window.addEventListener('DOMContentLoaded', initDB);
//** boot close

//* utils open
// 🛠️ เครื่องมือช่วยเหลือ (Helper Functions)
const AudioContext = window.AudioContext || window.webkitAudioContext; let audioCtx;
function playSound(t) { 
    try { 
        if(!audioCtx) audioCtx = new AudioContext(); 
        if(audioCtx.state === 'suspended') audioCtx.resume(); 
        const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); 
        o.connect(g); g.connect(audioCtx.destination); 
        if(t === 'click') { o.type = 'sine'; o.frequency.setValueAtTime(600, audioCtx.currentTime); g.gain.setValueAtTime(0.05, audioCtx.currentTime); o.start(); o.stop(audioCtx.currentTime + 0.05); } 
        else if(t === 'success') { o.type = 'triangle'; o.frequency.setValueAtTime(400, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1); g.gain.setValueAtTime(0.1, audioCtx.currentTime); o.start(); o.stop(audioCtx.currentTime + 0.3); } 
        else if(t === 'error') { o.type = 'sawtooth'; o.frequency.setValueAtTime(150, audioCtx.currentTime); g.gain.setValueAtTime(0.1, audioCtx.currentTime); o.start(); o.stop(audioCtx.currentTime + 0.2); } 
    } catch(e) {} 
}

function showToast(m, type='click') { 
    playSound(type); 
    const el = document.getElementById("toast"); 
    if(!el) return;
    el.innerText = m; el.className = "show"; 
    setTimeout(() => el.className = "", 2800); 
}

function getLocalYYYYMMDD(d = new Date()) { 
    const options = { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }; 
    return new Intl.DateTimeFormat('en-CA', options).format(d); 
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function openProModal() { playSound('click'); document.getElementById('modal-pro-unlock').style.display = 'flex'; }
function openRecoveryModal() { 
    closeModal('modal-admin-pin');
    document.getElementById('modal-recovery').style.display = 'flex'; 
}
//** utils close

//* anti-theft open
// 🕵️ ระบบตรวจจับทุจริต & Sync Status
function updateSyncStatusDots() {
    const dot = document.getElementById('online-status-dot');
    if(!dot) return;
    if(!navigator.onLine) { dot.className = 'absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full border-2 border-white bg-red-500 shadow-sm z-20'; dot.title='Offline'; return; }
    
    let hasPendingOrders = false; for (const key in db.carts) { if(db.carts[key].length > 0) hasPendingOrders = true; }
    if(hasPendingOrders) { dot.className = 'absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full border-2 border-white bg-yellow-400 shadow-sm z-20'; dot.title='รอส่งออร์เดอร์'; }
    else { dot.className = 'absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full border-2 border-white bg-green-500 shadow-sm z-20'; dot.title='Online Sync'; }
}
window.addEventListener('online', updateSyncStatusDots); 
window.addEventListener('offline', updateSyncStatusDots);

function triggerSpyBell(reason = "Unknown Error") { 
    const bell = document.getElementById('spy-bell'); 
    if(bell) {
        bell.classList.remove('hidden'); 
        playSound('error'); 
        setTimeout(()=>bell.classList.add('hidden'), 5000); 
    }
    console.warn("Fraud Alert:", reason);
}

function startHeartbeatMonitor() {
    setInterval(() => {
        // เช็คว่ามี Log ทุจริตถูกส่งมาจากเครื่องลูกผ่าน Firebase (ในอนาคต) หรือ Local หรือไม่
        if(db.fraudLogs.length > 0) {
            triggerSpyBell(db.fraudLogs[0].reason);
            db.fraudLogs = []; 
            saveToIDB();
        }
    }, 5000);
}
//** anti-theft close

//* navigation open
// 🗺️ ระบบนำทาง (Navigation & Auth)
let pendingAdminAction = null; 
function switchTab(id, el = null) { 
    playSound('click'); 
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden')); 
    document.getElementById(`screen-${id}`).classList.remove('hidden'); 
    if(el) { 
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active')); 
        el.classList.add('active'); 
    } 
    if(id === 'shop') renderShopQueue(); 
    if(id === 'manage') renderAnalytics(); 
}

function attemptAdmin(target, el) { 
    if(isAdminLoggedIn) { 
        switchTab(target, el); 
    } else { 
        playSound('click'); 
        pendingAdminAction = { target, el }; 
        document.getElementById('admin-pin-desc').innerText = "รหัสผ่านเพื่อเข้าระบบ"; 
        document.getElementById('admin-pin-input').value = ""; 
        document.getElementById('modal-admin-pin').style.display = 'flex'; 
        setTimeout(() => document.getElementById('admin-pin-input').focus(), 100); 
    } 
}

function verifyAdminPin() { 
    const pin = document.getElementById('admin-pin-input').value.trim(); 
    if(pin === db.adminPin || pin === "FAKDU-V7-ADMIN") { 
        closeModal('modal-admin-pin'); 
        playSound('success'); 
        localStorage.setItem('FAKDU_ADMIN_LOGGED_IN', 'true'); 
        isAdminLoggedIn = true; 
        if(pendingAdminAction) switchTab(pendingAdminAction.target, pendingAdminAction.el); 
    } else { 
        document.getElementById('admin-pin-input').value = ""; 
        showToast("รหัส PIN ผิด", "error"); 
        triggerSpyBell("Admin PIN Error"); 
    } 
}

function adminLogout() { 
    localStorage.setItem('FAKDU_ADMIN_LOGGED_IN', 'false'); 
    isAdminLoggedIn = false; 
    switchTab('customer', document.querySelector('#tab-customer')); 
    showToast("🔒 ล็อคแอดมินแล้ว", "success"); 
}
//** navigation close

//* pos-logic open
// 🛒 ระบบขายหน้าร้าน (POS Engine)
function changeGridZoom(dir) { 
    playSound('click'); gridZoom += dir; 
    if(gridZoom < 2) gridZoom = 2; if(gridZoom > 5) gridZoom = 5; 
    updateGridZoomUI(); 
}
function updateGridZoomUI() { 
    const grid = document.getElementById('grid-units'); 
    grid.className = `grid grid-cols-${gridZoom} gap-${gridZoom>3 ? '3' : '4'}`; 
    document.getElementById('zoom-level-text').innerText = gridZoom === 2 ? 'L' : gridZoom === 3 ? 'M' : gridZoom === 4 ? 'S' : 'XS'; 
    renderCustomerGrid(); 
}

function renderCustomerGrid() { 
    const grid = document.getElementById('grid-units'); grid.innerHTML = ''; 
    let fontSize = gridZoom >= 4 ? 'text-[24px]' : 'text-[36px]'; 
    let iconSize = gridZoom >= 4 ? 'text-[24px]' : 'text-[34px]';

    for(let i=1; i<=db.unitCount; i++) { 
        let u = db.units.find(x => x.id == i); if(!u) continue; 
        let cls = 'unit-empty'; const cart = db.carts[u.id] || []; 
        if(u.orders && u.orders.length > 0) { cls = 'unit-busy'; } else if(cart.length > 0) { cls = 'unit-pending'; } 
        grid.innerHTML += `<div class="unit-card ${cls}" onclick="openTable(${u.id})"><div class="${iconSize} opacity-20 mb-1">${db.unitType === 'โต๊ะ' ? '🍽️' : '📝'}</div><div class="${fontSize} font-black leading-none">${u.id}</div></div>`; 
    } 
}

function openTable(id) { 
    playSound('click'); activeUnitId = id; document.getElementById('active-unit-id').innerText = id; 
    if(!db.carts[id]) db.carts[id] = []; 
    renderItemList(); updateCartTotal(); 
    
    const u = db.units.find(x => x.id === id); 
    const orderedBox = document.getElementById('ordered-items-bar'); 
    const orderedList = document.getElementById('ordered-items-list'); 
    if(u.orders && u.orders.length > 0) { 
        orderedList.innerHTML = u.orders.map(o => `• ${o.name} <span class="text-[10px] bg-white px-1 rounded">x${o.qty}</span>`).join('<br>'); 
        orderedBox.classList.remove('hidden'); 
    } else { 
        orderedBox.classList.add('hidden'); 
    } 
    switchTab('order'); 
}

function renderItemList() { 
    const box = document.getElementById('item-list'); box.innerHTML = ''; 
    db.items.forEach(i => { 
        const img = i.img ? `<img src="${i.img}" class="item-img shadow-sm">` : `<div class="item-img flex items-center justify-center text-3xl">🍔</div>`; 
        const addonBadge = (i.addons && i.addons.length > 0) ? `<div class="addon-badge">+ตัวเลือก</div>` : ''; 
        box.innerHTML += `<div class="item-btn" onclick="handleItemClick(${i.id})">${addonBadge}${img}<div class="flex-1 text-left"><div class="font-black text-gray-800 text-[16px] mb-1">${i.name}</div><div class="theme-text font-black text-sm">฿${i.price}</div></div><div class="bg-gray-100 w-10 h-10 rounded-[12px] flex items-center justify-center text-xl font-black text-gray-400 border">+</div></div>`; 
    }); 
}

function handleLockedFeatureClick(isMenuLimit = false) { 
    if(!IS_PRO) { 
        showToast(isMenuLimit ? "⚠️ ฟรีจำกัดการเพิ่มรายการ" : "🔒 เฉพาะ PRO", "error"); 
        openProModal(); return true; 
    } 
    return false; 
}

function handleItemClick(id) { 
    playSound('click'); 
    const u = db.units.find(x => x.id === activeUnitId); 
    let cart = db.carts[activeUnitId]; 
    if(!IS_PRO && (u.orders.length + cart.length >= 4)) return handleLockedFeatureClick(true); 
    
    const item = db.items.find(x => x.id === id); 
    if(item.addons && item.addons.length > 0) { 
        pendingAddonItem = item; currentAddonQty = 1; 
        document.getElementById('addon-qty-display').innerText = currentAddonQty; 
        document.getElementById('addon-modal-name').innerText = item.name; 
        document.getElementById('addon-modal-price').innerText = item.price; 
        const list = document.getElementById('addon-options-list'); list.innerHTML = ''; 
        item.addons.forEach((a, idx) => { 
            list.innerHTML += `<label class="flex justify-between items-center bg-white border p-3 rounded-xl cursor-pointer active:scale-95 transition-transform"><div class="flex items-center gap-3"><input type="checkbox" class="addon-checkbox w-5 h-5 accent-primary" data-price="${a.price}" data-name="${a.name}"> <span class="font-bold text-sm text-gray-700">${a.name}</span></div><div class="font-black text-gray-500">+฿${a.price}</div></label>`; 
        }); 
        document.getElementById('modal-addon-select').style.display = 'flex'; 
    } else { 
        addToCartActual(item, [], 1); 
    } 
}

function adjustAddonQty(val) { currentAddonQty += val; if(currentAddonQty < 1) currentAddonQty = 1; document.getElementById('addon-qty-display').innerText = currentAddonQty; playSound('click'); }
function confirmAddonSelection() { 
    let selectedAddons = []; 
    document.querySelectorAll('.addon-checkbox:checked').forEach(cb => { 
        selectedAddons.push({ name: cb.getAttribute('data-name'), price: parseInt(cb.getAttribute('data-price')) }); 
    }); 
    addToCartActual(pendingAddonItem, selectedAddons, currentAddonQty); 
    closeModal('modal-addon-select'); 
}

function addToCartActual(item, addons, qty) { 
    let cart = db.carts[activeUnitId]; 
    let addonText = addons.length > 0 ? ` (${addons.map(a=>a.name).join(', ')})` : ''; 
    let totalAddonPrice = addons.reduce((sum, a) => sum + a.price, 0); 
    let finalPrice = item.price + totalAddonPrice; 
    let finalName = item.name + addonText; 
    
    let ex = cart.find(c => c.name === finalName && c.price === finalPrice); 
    if(ex) { ex.qty += qty; ex.total += (finalPrice * qty); } 
    else { cart.push({ id: Date.now(), itemId: item.id, name: finalName, price: finalPrice, qty: qty, total: finalPrice * qty, orderBy: 'Master' }); } 
    saveData(); updateCartTotal(); showToast(`เพิ่ม ${finalName} x${qty}`); 
}

function updateCartTotal() { 
    let cart = db.carts[activeUnitId] || []; let t = 0, q = 0; 
    cart.forEach(c => { t += c.total; q += c.qty; }); 
    document.getElementById('cart-total').innerText = t.toLocaleString(); 
    document.getElementById('cart-count').innerText = q; 
}

function reviewCart() { 
    const cart = db.carts[activeUnitId] || []; 
    if(cart.length === 0) return showToast("ตะกร้าว่าง", "error"); 
    document.getElementById('review-unit-id').innerText = activeUnitId; 
    const box = document.getElementById('review-list'); box.innerHTML = ''; 
    let t = 0; 
    cart.forEach((c, idx) => { 
        t += c.total; 
        box.innerHTML += `<div class="flex justify-between items-center py-3 border-b border-gray-50"><div class="flex-1 font-bold text-gray-800">${c.name} <span class="bg-gray-100 px-2 rounded ml-1 text-xs">x${c.qty}</span></div><div class="flex items-center gap-2"><span class="font-black">฿${c.total.toLocaleString()}</span><button onclick="editCartItem(${idx},-1)" class="w-8 h-8 rounded-lg bg-gray-100 font-bold">-</button><button onclick="editCartItem(${idx},1)" class="w-8 h-8 rounded-lg bg-gray-100 font-bold">+</button></div></div>`; 
    }); 
    document.getElementById('review-total-price').innerText = t.toLocaleString(); 
    document.getElementById('modal-review').style.display = 'flex'; 
}

function editCartItem(idx, d) { 
    let cart = db.carts[activeUnitId]; 
    cart[idx].qty += d; cart[idx].total = cart[idx].qty * cart[idx].price; 
    if(cart[idx].qty <= 0) cart.splice(idx, 1); 
    saveData(); 
    if(cart.length === 0) { closeModal('modal-review'); showToast("ตะกร้าว่างเปล่า", "error"); updateCartTotal(); } 
    else { reviewCart(); updateCartTotal(); } 
}

function confirmOrderSend() { 
    const u = db.units.find(x => x.id === activeUnitId); 
    let cart = db.carts[activeUnitId]; 
    if(u.status === 'busy') u.newItemsQty = cart.reduce((s,c)=>s+c.qty, 0); 
    u.status = 'busy'; 
    if(!u.startTime) u.startTime = Date.now(); 
    cart.forEach(c => { 
        let ex = u.orders.find(o => o.name === c.name && o.price === c.price); 
        if(ex) { ex.qty += c.qty; ex.total += c.total; } else { u.orders.push({...c}); } 
    }); 
    db.carts[activeUnitId] = []; saveData(); closeModal('modal-review'); 
    switchTab('customer'); showToast("🚀 ส่งเข้าครัวแล้ว", "success"); 
}
//** pos-logic close

//* checkout open
// 🧾 ระบบเช็คบิล (Checkout)
function renderShopQueue() { 
    const box = document.getElementById('shop-queue'); box.innerHTML = ''; 
    const activeUnits = db.units.filter(u => u.orders && u.orders.length > 0).sort((a,b) => a.startTime - b.startTime); 
    if(activeUnits.length === 0) { box.innerHTML = '<div class="text-center py-20 opacity-20 font-black text-xl">ไม่มีคิวรอชำระ</div>'; return; } 
    activeUnits.forEach(u => { 
        let t = u.orders.reduce((s,o) => s + o.total, 0); 
        let badge = u.newItemsQty ? `<div class="absolute -top-2 -left-2 bg-red-500 text-white text-[9px] font-black px-2 py-1 rounded-full animate-bounce shadow-md border-2 border-white">สั่งเพิ่ม +${u.newItemsQty}</div>` : ''; 
        box.innerHTML += `<div class="bg-white border p-4 rounded-2xl flex justify-between items-center cursor-pointer active:scale-95 transition-transform shadow-sm relative mb-3" onclick="openCheckout(${u.id})">${badge}<div class="flex items-center gap-4"><div class="w-14 h-14 bg-gray-50 border-2 border-gray-200 rounded-2xl flex items-center justify-center font-black text-2xl text-gray-800">${u.id}</div><div><div class="font-black text-gray-800 text-xl">฿${t.toLocaleString()}</div><div class="text-[11px] text-gray-400 font-bold mt-1">${u.orders.length} รายการ</div></div></div><div class="absolute bottom-2 right-3 flex items-center gap-1 text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100"><div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div> <span class="admin-timer" data-start="${u.startTime}">0 นาที</span></div></div>`; 
    }); 
}

function openCheckout(id) {
    const u = db.units.find(x => x.id === id); activeUnitId = id; 
    document.getElementById('checkout-unit-id').innerText = id; 
    u.newItemsQty = 0; let t = 0; 
    const box = document.getElementById('checkout-item-list'); box.innerHTML = '';
    
    u.orders.forEach((o, idx) => { 
        t += o.total; 
        let delBtn = `<button onclick="deleteOrderItem(${idx})" class="text-red-500 w-7 h-7 rounded-lg bg-red-50 font-bold ml-2">X</button>`; 
        box.innerHTML += `<div class="flex justify-between items-center py-3 border-b border-gray-50"><div class="flex-1 font-bold text-gray-800">${o.name} <span class="bg-gray-100 px-2 rounded ml-1 text-[10px]">x${o.qty}</span><div class="text-[8px] text-gray-400 font-normal">📝 ${o.orderBy || 'Master'}</div></div><div class="flex items-center"><span>฿${o.total.toLocaleString()}</span>${delBtn}</div></div>`; 
    });
    
    document.getElementById('checkout-total').innerText = t.toLocaleString(); currentCheckoutTotal = t;
    updateQRDisplay(); document.getElementById('modal-checkout').style.display = 'flex';
}

function updateQRDisplay() { 
    const offImg = document.getElementById('qr-offline-img'); 
    const genArea = document.getElementById('qr-gen-area'); 
    const txt = document.getElementById('qr-status-text'); 
    if(navigator.onLine && db.ppay) { 
        offImg.classList.add('hidden'); genArea.innerHTML = ''; 
        new QRCode(genArea, { text: `https://promptpay.io/${db.ppay}/${currentCheckoutTotal}`, width: 150, height: 150 }); 
        txt.innerText = "ดึงข้อมูล Online"; txt.className = "text-[9px] font-bold text-green-500 mt-2"; 
    } else if(db.qrOffline) { 
        genArea.innerHTML = ''; offImg.src = db.qrOffline; offImg.classList.remove('hidden'); 
        txt.innerText = "โหมด Offline (QR ที่ตั้งไว้)"; txt.className = "text-[9px] font-bold text-orange-500 mt-2"; 
    } else { 
        genArea.innerHTML = '<p class="text-[10px] text-gray-400 mt-14">ไม่มีรูป QR</p>'; offImg.classList.add('hidden'); txt.innerText = ""; 
    } 
}

function deleteOrderItem(idx) { 
    const u = db.units.find(x => x.id === activeUnitId); 
    u.orders.splice(idx, 1); 
    if(u.orders.length === 0) { u.status = 'empty'; u.startTime = null; closeModal('modal-checkout'); } 
    saveData(); 
    if(document.getElementById('modal-checkout').style.display !== 'none') openCheckout(activeUnitId); 
}

function confirmPayment(method) { 
    const u = db.units.find(x => x.id === activeUnitId); 
    if(u.orders.length > 0) { 
        db.sales.push({ id: Date.now(), unitId: u.id, date: getLocalYYYYMMDD(), time: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }).split(' ')[1], total: currentCheckoutTotal, method: method, items: JSON.parse(JSON.stringify(u.orders)) }); 
    } 
    u.status = 'empty'; u.orders = []; u.startTime = null; u.newItemsQty = 0; db.carts[activeUnitId] = []; 
    saveData(); closeModal('modal-checkout'); showToast("✅ ชำระเงินเรียบร้อย", "success"); 
    if(!document.getElementById('screen-manage').classList.contains('hidden')) renderAnalytics(); 
}
//** checkout close

//* manage open
// 📊 ระบบหลังร้าน & Analytics
function switchManageSub(s, el) { 
    playSound('click'); 
    document.querySelectorAll('.manage-tab').forEach(t => t.classList.remove('active', 'bg-white', 'shadow-sm', 'text-gray-800')); 
    document.querySelectorAll('.manage-tab').forEach(t => t.classList.add('text-gray-500')); 
    el.classList.remove('text-gray-500'); el.classList.add('active', 'bg-white', 'shadow-sm', 'text-gray-800'); 
    document.getElementById('sub-dash').style.display = s === 'dash' ? 'block' : 'none'; 
    document.getElementById('sub-menu').style.display = s === 'menu' ? 'block' : 'none'; 
}

function switchDashTab(tab, el) { 
    playSound('click'); 
    document.querySelectorAll('.dash-sub-tab').forEach(t => t.classList.remove('active', 'bg-white', 'shadow-sm', 'text-gray-800')); 
    document.querySelectorAll('.dash-sub-tab').forEach(t => t.classList.add('text-gray-500')); 
    el.classList.remove('text-gray-500'); el.classList.add('active', 'bg-white', 'shadow-sm', 'text-gray-800'); 
    document.getElementById('dash-history').style.display = tab === 'history' ? 'block' : 'none'; 
    document.getElementById('dash-top').style.display = tab === 'top' ? 'block' : 'none'; 
}

function calculateCustomSalesRealtime() {
    const s = document.getElementById('search-start').value; 
    const e = document.getElementById('search-end').value; 
    if(!s || !e) return;
    
    const td = getLocalYYYYMMDD();
    if(!IS_PRO && (s !== td || e !== td)) {
        document.getElementById('search-start').value = td;
        document.getElementById('search-end').value = td;
        showToast("🔒 รุ่นฟรีดูได้เฉพาะยอดวันนี้", "error");
    }

    let total = 0; 
    db.sales.forEach(sale => { 
        if(sale.date >= document.getElementById('search-start').value && sale.date <= document.getElementById('search-end').value) { total += sale.total; }
    });
    document.getElementById('search-total').innerText = total.toLocaleString();
}

function renderAnalytics() {
    let t = 0, w = 0, m = 0; const todayStr = getLocalYYYYMMDD(); const todayObj = new Date(todayStr); let itemCounts = {};
    db.sales.forEach(s => { 
        let sDateObj = new Date(s.date); let diffDays = Math.ceil((todayObj - sDateObj) / (1000 * 60 * 60 * 24));
        if(s.date === todayStr) t += s.total; 
        if(IS_PRO && diffDays <= 7) w += s.total; 
        if(IS_PRO && diffDays <= 30) m += s.total; 
        s.items.forEach(i => { let baseName = i.name.split(' (')[0]; itemCounts[baseName] = (itemCounts[baseName] || 0) + i.qty; });
    });
    
    document.getElementById('stat-today').innerText = t.toLocaleString(); 
    document.getElementById('stat-week').innerText = IS_PRO ? w.toLocaleString() : "🔒"; 
    document.getElementById('stat-month').innerText = IS_PRO ? m.toLocaleString() : "🔒";
    
    calculateCustomSalesRealtime();
    
    const hl = document.getElementById('sales-history'); hl.innerHTML = '';
    [...db.sales].reverse().slice(0,50).forEach(s => { 
        let itemListStr = s.items.map(i => `${i.name}x${i.qty}`).join(', '); 
        let payMethod = s.method === 'transfer' ? '📱โอน' : '💵สด'; 
        hl.innerHTML += `<div class="py-3 flex justify-between items-center border-b border-gray-100"><div><div class="font-black text-gray-800">${s.date} <span class="font-normal text-gray-400 ml-1">${s.time}</span> <span class="text-[9px] text-green-600 ml-1 border border-green-200 px-1 rounded">${payMethod}</span></div><div class="text-[9px] text-gray-400 font-bold mt-1 truncate w-40">${itemListStr}</div></div><div class="text-right font-black theme-text text-lg tracking-tighter">฿${s.total.toLocaleString()}</div></div>`; 
    });
    
    const topBox = document.getElementById('top-items-list'); topBox.innerHTML = ''; 
    let topItems = Object.entries(itemCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);
    if(topItems.length === 0) topBox.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">ยังไม่มีข้อมูลยอดขาย</p>';
    topItems.forEach((item, idx) => { 
        const medal = idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':(idx+1)+'.'; 
        topBox.innerHTML += `<div class="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border mb-2"><div class="font-black text-gray-800">${medal} ${item[0]}</div><div class="text-[10px] font-bold bg-white px-2 py-1 rounded text-gray-500 shadow-sm">ขายได้ ${item[1]}</div></div>`; 
    });
}

function clearSales() { 
    if(confirm("ล้างประวัติยอดขายทั้งหมด? (ไม่สามารถกู้คืนได้)")) { 
        db.sales = []; saveData(); showToast("🗑️ ล้างยอดขายแล้ว", "success"); 
        document.getElementById('search-total').innerText = '0'; 
    } 
}
//** manage close

//* menu-setting open
// 🍔 ระบบตั้งค่าเมนูและโต๊ะ
function renderAdminLists() { 
    const box = document.getElementById('admin-menu-list'); box.innerHTML = ''; 
    document.getElementById('menu-count').innerText = db.items.length; 
    db.items.forEach(i => { 
        box.innerHTML += `<div class="flex justify-between items-center py-3 border-b border-gray-50"><div><div class="font-black text-gray-800 text-sm">${i.name}</div><div class="text-xs theme-text font-black">฿${i.price}</div></div><div class="flex gap-2"><button onclick="deleteItem(${i.id})" class="text-[10px] text-red-600 font-bold bg-red-50 px-3 py-2 rounded-xl">ลบ</button></div></div>`; 
    }); 
}

let tempAddons = [];
function openMenuModal() { 
    if(!IS_PRO && db.items.length >= 4) { handleLockedFeatureClick(true); return; } 
    document.getElementById('form-menu-name').value = ""; document.getElementById('form-menu-price').value = ""; 
    tempImg = null; document.getElementById('form-menu-preview').classList.add('hidden'); 
    tempAddons = []; renderAddonFields(); document.getElementById('modal-menu-form').style.display = 'flex'; 
}
function addAddonField() { tempAddons.push({name: '', price: 0}); renderAddonFields(); }
function removeAddonField(idx) { tempAddons.splice(idx, 1); renderAddonFields(); }
function updateAddonField(idx, field, value) { tempAddons[idx][field] = field === 'price' ? parseInt(value) || 0 : value; }
function renderAddonFields() { 
    const box = document.getElementById('addon-fields-container'); box.innerHTML = ''; 
    tempAddons.forEach((a, idx) => { box.innerHTML += `<div class="flex gap-2 items-center bg-white p-2 rounded-xl border shadow-sm"><input type="text" placeholder="ชื่อ" class="w-full text-xs font-bold bg-transparent outline-none" value="${a.name}" onchange="updateAddonField(${idx}, 'name', this.value)"><input type="number" placeholder="฿" class="w-16 text-xs font-black bg-transparent outline-none text-right" value="${a.price}" onchange="updateAddonField(${idx}, 'price', this.value)"><button onclick="removeAddonField(${idx})" class="text-red-500 font-bold px-2">X</button></div>`; }); 
}
function saveMenuItem() { 
    const n = document.getElementById('form-menu-name').value.trim(); 
    const p = parseInt(document.getElementById('form-menu-price').value); 
    if(!n || !p) return; 
    const validAddons = tempAddons.filter(a => a.name.trim() !== ''); 
    db.items.push({ id: Date.now(), name: n, price: p, img: tempImg, addons: validAddons }); 
    saveData(); closeModal('modal-menu-form'); showToast("บันทึกเมนูแล้ว", "success"); 
}
function deleteItem(id) { if(confirm("ลบเมนูนี้?")) { db.items = db.items.filter(i => i.id !== id); saveData(); } }

function updateUnits() { 
    const c = parseInt(document.getElementById('config-unit-count').value); 
    const t = document.getElementById('config-unit-type').value; 
    if(!IS_PRO && c > 4) { handleLockedFeatureClick(true); return; } 
    db.unitCount = c; db.unitType = t; forceRebuildUnits(c, t, false); 
    saveData(); showToast("อัปเดตระบบแล้ว", "success"); 
}
function forceRebuildUnits(c, t, bypass = false) { 
    let newUnits = []; 
    for(let i=1; i<=c; i++) { 
        let existing = db.units.find(u => u.id === i); 
        if(!bypass && existing && existing.status !== 'empty') { newUnits.push(existing); } 
        else { newUnits.push({ id: i, status: 'empty', orders: [], startTime: null, newItemsQty: 0 }); } 
    } 
    db.units = newUnits; 
}
//** menu-setting close

//* system-logic open
// ⚙️ ระบบตั้งค่าร้านค้า & อัปเดต UI
function applyTheme() {
    document.documentElement.style.setProperty('--primary', db.theme); 
    document.documentElement.style.setProperty('--bg', db.bgColor);
    document.getElementById('display-shop-name').innerText = db.shopName; 
    if(db.logo) document.getElementById('shop-logo').src = db.logo;
    document.querySelectorAll('.lbl-unit').forEach(el => el.innerText = db.unitType);
    
    // จัดการ UI ตามสถานะ IS_PRO
    const b = document.getElementById('trial-badge'); 
    const setupRec = document.getElementById('pro-recovery-setup');
    if(IS_PRO) { 
        if(b) b.style.display = 'none'; 
        if(setupRec) setupRec.classList.remove('hidden'); // โชว์กล่องตั้งค่ากันลืมรหัส
        if(document.getElementById('card-stat-week')) document.getElementById('card-stat-week').classList.remove('locked-feature'); 
        if(document.getElementById('card-stat-month')) document.getElementById('card-stat-month').classList.remove('locked-feature'); 
    } else { 
        if(b) b.style.display = 'block'; 
        if(setupRec) setupRec.classList.add('hidden');
        if(document.getElementById('card-stat-week')) document.getElementById('card-stat-week').classList.add('locked-feature'); 
        if(document.getElementById('card-stat-month')) document.getElementById('card-stat-month').classList.add('locked-feature'); 
    }
}

function handleImage(e, type) { 
    const f = e.target.files[0]; if(!f) return; 
    const r = new FileReader(); r.onload = ev => { 
        if(type === 'logo') { db.logo = ev.target.result; saveSystemSettings(); } 
        else if(type === 'qr') { db.qrOffline = ev.target.result; saveSystemSettings(); } 
        else if(type === 'temp') { tempImg = ev.target.result; const p = document.getElementById('form-menu-preview'); p.src = tempImg; p.classList.remove('hidden'); } 
    }; r.readAsDataURL(f); 
}

function saveSystemSettings() { 
    db.shopName = document.getElementById('sys-shop-name').value; 
    db.theme = document.getElementById('sys-theme').value; 
    db.bgColor = document.getElementById('sys-bg').value; 
    db.bank = document.getElementById('sys-bank').value; 
    db.ppay = document.getElementById('sys-ppay').value; 
    if(document.getElementById('sys-pin').value.trim()) db.adminPin = document.getElementById('sys-pin').value.trim(); 
    saveData(); showToast("บันทึกระบบแล้ว", "success"); 
}

function loadSettingsToForm() { 
    if(!document.getElementById('sys-shop-name')) return;
    document.getElementById('sys-shop-name').value = db.shopName; 
    document.getElementById('sys-theme').value = db.theme; 
    document.getElementById('sys-bg').value = db.bgColor; 
    document.getElementById('sys-bank').value = db.bank; 
    document.getElementById('sys-ppay').value = db.ppay; 
    document.getElementById('sys-pin').value = db.adminPin; 
}

// สร้าง QR Code ให้เครื่องลูกสแกน
function updateSyncUI() { 
    const disp = document.getElementById('display-sync-key');
    const qrArea = document.getElementById('sync-qr-area');
    if(!disp || !qrArea) return;
    disp.innerText = db.syncKey; 
    qrArea.innerHTML = ''; 
    new QRCode(qrArea, { text: db.syncKey, width: 64, height: 64 }); 
}

function requestNewSyncKey() { 
    if(confirm("เตะเครื่องลูกออกทั้งหมดแล้วสร้างรหัสใหม่?")) {
        db.syncKey = Math.random().toString(36).substring(2, 8).toUpperCase(); 
        saveData(); updateSyncUI(); 
        showToast("✅ สร้างรหัสใหม่แล้ว", "success");
    }
}

function renderAll() { 
    renderCustomerGrid(); renderShopQueue(); renderAdminLists(); renderAnalytics(); 
}

function startTableTimers() { 
    setInterval(() => { 
        const now = Date.now(); 
        document.querySelectorAll('.admin-timer').forEach(el => { 
            const start = parseInt(el.getAttribute('data-start')); 
            if(start) { let d = Math.floor((now - start) / 1000); let m = Math.floor(d / 60); el.innerText = `${m} นาที`; } 
        }); 
    }, 60000); 
}

// ป้องกันเจาะระบบผ่าน F12
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('keydown', e => { 
    if(e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'U')) { 
        e.preventDefault(); showToast("⛔ ไม่อนุญาตให้ใช้เครื่องมือนี้", "error"); triggerSpyBell("DevTools Attempt"); 
    } 
});

let hasInteracted = false; 
document.body.addEventListener('click', () => { 
    if(!hasInteracted) { 
        hasInteracted = true; 
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{}); 
    } 
}, { once: true });
//** system-logic close
