//* client-globals open
// ======================================================================
// 📱 FAKDU CLIENT CORE v9.30 (Client Node Logic)
// ======================================================================
const DB_NAME = "FAKDU_PWA_DB_V930"; // ต้องชื่อเดียวกับ Master เพื่อให้เทสเครื่องเดียวกันได้
let idb;
let db = null;
let clientName = localStorage.getItem('FAKDU_CLIENT_NAME');
let isPaired = localStorage.getItem('FAKDU_CLIENT_PAIRED') === 'true';

let activeUnitId = null;
let clientCart = []; // ตะกร้าแยกเฉพาะของเครื่องลูกเครื่องนี้
let pendingAddonItem = null; 
let currentAddonQty = 1;
//** client-globals close

//* client-db open
// 📦 ระบบฐานข้อมูลและการซิงค์ (Stub สำหรับ Firebase)
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onsuccess = e => { idb = e.target.result; resolve(idb); };
        req.onerror = e => reject("DB Error");
    });
}
function loadFromIDB() {
    return new Promise((resolve) => {
        const tx = idb.transaction('store', 'readonly');
        const req = tx.objectStore('store').get('fakdu_data');
        req.onsuccess = () => resolve(req.result);
    });
}
function saveToIDB() {
    return new Promise((resolve) => {
        const tx = idb.transaction('store', 'readwrite');
        tx.objectStore('store').put(db, 'fakdu_data');
        tx.oncomplete = () => { resolve(); };
    });
}

// ฟังก์ชันอัปเดตข้อมูลจาก Master (ถ้ามี Firebase จะใช้ onValue แทน)
async function syncNow() {
    const data = await loadFromIDB();
    if(data) {
        db = data;
        renderCustomerGrid();
        showToast("✅ อัปเดตข้อมูลล่าสุดแล้ว");
    }
}
//** client-db close

//* client-boot open
// 🚀 เริ่มต้นระบบเครื่องลูก
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await openIndexedDB();
        db = await loadFromIDB();
        
        if (!db) {
            alert("ไม่พบฐานข้อมูล Master กรุณาเปิดหน้า Master เพื่อสร้างฐานข้อมูลก่อน");
            return;
        }

        if (isPaired && clientName) {
            // ถ้าเคยจับคู่แล้ว ให้เข้าหน้าโต๊ะเลย
            document.getElementById('screen-pairing').classList.add('hidden');
            document.getElementById('display-client-name').innerText = clientName;
            document.getElementById('display-shop-name').innerText = db.shopName;
            syncNow(); // โหลดข้อมูลโต๊ะล่าสุด
        } else {
            // โชว์หน้า Pairing
            document.getElementById('screen-pairing').classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
    }
});
//** client-boot close

//* client-pairing open
// 🔗 ระบบจับคู่ (Pairing) ด้วย PIN / QR
let html5QrCode;
function startScanner() {
    document.getElementById('qr-reader').style.display = 'block'; 
    document.getElementById('btn-scan-qr').classList.add('hidden'); 
    document.getElementById('btn-stop-scan').classList.remove('hidden');
    
    html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { 
            document.getElementById('client-pin-input').value = decodedText; 
            stopScanner(); attemptPairing(); 
        },
        (errorMessage) => { /* ignore */ }
    ).catch(err => { showToast("ไม่สามารถเปิดกล้องได้"); stopScanner(); });
}

function stopScanner() { 
    if(html5QrCode) { html5QrCode.stop().then(()=>{ html5QrCode.clear(); }).catch(e=>{}); } 
    document.getElementById('qr-reader').style.display = 'none'; 
    document.getElementById('btn-scan-qr').classList.remove('hidden'); 
    document.getElementById('btn-stop-scan').classList.add('hidden'); 
}

async function attemptPairing() {
    const pin = document.getElementById('client-pin-input').value.trim().toUpperCase();
    const name = document.getElementById('client-name-input').value.trim();
    
    if (!pin || !name) return showToast("กรุณากรอก PIN และชื่อพนักงาน");

    // ดึงข้อมูลล่าสุดมาเช็ค
    db = await loadFromIDB();

    if (pin === db.syncKey) {
        // รหัสตรง! บันทึกสถานะ
        localStorage.setItem('FAKDU_CLIENT_PAIRED', 'true');
        localStorage.setItem('FAKDU_CLIENT_NAME', name);
        clientName = name;
        isPaired = true;

        document.getElementById('screen-pairing').classList.add('hidden');
        document.getElementById('display-client-name').innerText = clientName;
        document.getElementById('display-shop-name').innerText = db.shopName;
        
        syncNow();
    } else {
        showToast("❌ รหัส PIN ไม่ถูกต้อง");
        // แอบส่ง Log ทุจริตไปให้ Master
        db.fraudLogs.push({ time: Date.now(), client: name || "Unknown", reason: "Client PIN Failed" });
        saveToIDB();
    }
}

function disconnectClient() {
    if(confirm("แน่ใจหรือไม่ที่จะออกจากระบบ? (ต้องสแกน QR ใหม่)")) {
        localStorage.removeItem('FAKDU_CLIENT_PAIRED');
        localStorage.removeItem('FAKDU_CLIENT_NAME');
        location.reload();
    }
}
//** client-pairing close

//* client-pos open
// 🛒 ระบบรับออร์เดอร์ (ลูกคีย์อย่างเดียว ลบไม่ได้)
function renderCustomerGrid() { 
    const grid = document.getElementById('grid-units'); grid.innerHTML = ''; 
    for(let i=1; i<=db.unitCount; i++) { 
        let u = db.units.find(x => x.id == i); if(!u) continue; 
        
        let cls = 'bg-white text-gray-400 border-gray-200'; // ว่าง
        if(u.orders && u.orders.length > 0) { 
            cls = 'bg-yellow-50 text-yellow-700 border-yellow-400 shadow-md'; // มีคนนั่ง
        } 
        
        grid.innerHTML += `<div class="aspect-square rounded-2xl flex flex-col items-center justify-center font-black cursor-pointer border-2 transition-transform active:scale-95 ${cls}" onclick="openTable(${u.id})"><div class="text-2xl mb-1">${db.unitType === 'โต๊ะ' ? '🍽️' : '📝'}</div><div class="text-3xl leading-none">${u.id}</div></div>`; 
    } 
}

function openTable(id) { 
    activeUnitId = id; 
    document.getElementById('active-unit-id').innerText = id; 
    clientCart = []; // ล้างตะกร้าเครื่องลูกทุกครั้งที่เข้าโต๊ะใหม่
    renderItemList(); 
    updateCartTotal(); 
    switchTab('order'); 
}

function renderItemList() { 
    const box = document.getElementById('item-list'); box.innerHTML = ''; 
    db.items.forEach(i => { 
        const img = i.img ? `<img src="${i.img}" class="w-16 h-16 rounded-xl object-cover border flex-shrink-0">` : `<div class="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🍔</div>`; 
        const addonBadge = (i.addons && i.addons.length > 0) ? `<div class="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg">+ตัวเลือก</div>` : ''; 
        box.innerHTML += `<div class="bg-white border p-3 rounded-2xl flex items-center gap-3 cursor-pointer relative overflow-hidden active:scale-95 transition-transform shadow-sm" onclick="handleItemClick(${i.id})">${addonBadge}${img}<div class="flex-1"><div class="font-black text-gray-800 text-sm mb-1">${i.name}</div><div class="text-blue-600 font-black text-xs">฿${i.price}</div></div><div class="bg-blue-50 text-blue-600 w-8 h-8 rounded-lg flex items-center justify-center font-black border border-blue-100">+</div></div>`; 
    }); 
}

function handleItemClick(id) { 
    const item = db.items.find(x => x.id === id); 
    if(item.addons && item.addons.length > 0) { 
        pendingAddonItem = item; currentAddonQty = 1; 
        document.getElementById('addon-qty').innerText = currentAddonQty; 
        document.getElementById('addon-name').innerText = item.name; 
        document.getElementById('addon-price').innerText = item.price; 
        const list = document.getElementById('addon-options'); list.innerHTML = ''; 
        item.addons.forEach((a, idx) => { 
            list.innerHTML += `<label class="flex justify-between items-center bg-gray-50 border p-3 rounded-xl cursor-pointer active:scale-95"><div class="flex items-center gap-3"><input type="checkbox" class="addon-checkbox w-5 h-5 accent-blue-600" data-price="${a.price}" data-name="${a.name}"> <span class="font-bold text-sm text-gray-700">${a.name}</span></div><div class="font-black text-gray-500">+฿${a.price}</div></label>`; 
        }); 
        document.getElementById('modal-addon').classList.remove('hidden'); 
    } else { 
        addToCart(item, [], 1); 
    } 
}

function adjustQty(val) { 
    currentAddonQty += val; 
    if(currentAddonQty < 1) currentAddonQty = 1; 
    document.getElementById('addon-qty').innerText = currentAddonQty; 
}

function confirmAddon() { 
    let selectedAddons = []; 
    document.querySelectorAll('.addon-checkbox:checked').forEach(cb => { 
        selectedAddons.push({ name: cb.getAttribute('data-name'), price: parseInt(cb.getAttribute('data-price')) }); 
    }); 
    addToCart(pendingAddonItem, selectedAddons, currentAddonQty); 
    closeModal('modal-addon'); 
}

function addToCart(item, addons, qty) { 
    let addonText = addons.length > 0 ? ` (${addons.map(a=>a.name).join(', ')})` : ''; 
    let totalAddonPrice = addons.reduce((sum, a) => sum + a.price, 0); 
    let finalPrice = item.price + totalAddonPrice; 
    let finalName = item.name + addonText; 
    
    let ex = clientCart.find(c => c.name === finalName && c.price === finalPrice); 
    if(ex) { ex.qty += qty; ex.total += (finalPrice * qty); } 
    else { clientCart.push({ id: Date.now(), itemId: item.id, name: finalName, price: finalPrice, qty: qty, total: finalPrice * qty, orderBy: clientName }); } 
    
    updateCartTotal(); showToast(`เพิ่ม ${finalName} x${qty}`); 
}

function updateCartTotal() { 
    let t = 0, q = 0; 
    clientCart.forEach(c => { t += c.total; q += c.qty; }); 
    document.getElementById('cart-total').innerText = t.toLocaleString(); 
    document.getElementById('cart-count').innerText = q; 
}

function reviewCart() { 
    if(clientCart.length === 0) return showToast("ตะกร้าว่างเปล่า"); 
    document.getElementById('review-unit').innerText = activeUnitId; 
    const box = document.getElementById('review-list'); box.innerHTML = ''; 
    let t = 0; 
    clientCart.forEach((c, idx) => { 
        t += c.total; 
        box.innerHTML += `<div class="flex justify-between items-center py-3"><div class="flex-1 font-bold text-gray-800">${c.name} <span class="bg-gray-100 px-2 rounded ml-1 text-xs">x${c.qty}</span></div><div class="flex items-center gap-2"><span class="font-black text-blue-900">฿${c.total.toLocaleString()}</span><button onclick="editClientCart(${idx},-1)" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 font-bold">-</button><button onclick="editClientCart(${idx},1)" class="w-8 h-8 rounded-lg bg-green-50 text-green-600 font-bold">+</button></div></div>`; 
    }); 
    document.getElementById('review-total-price').innerText = t.toLocaleString(); 
    document.getElementById('modal-review').classList.remove('hidden'); 
}

function editClientCart(idx, d) { 
    clientCart[idx].qty += d; 
    clientCart[idx].total = clientCart[idx].qty * clientCart[idx].price; 
    if(clientCart[idx].qty <= 0) clientCart.splice(idx, 1); 
    if(clientCart.length === 0) { closeModal('modal-review'); updateCartTotal(); } 
    else { reviewCart(); updateCartTotal(); } 
}

// 🚀 ส่งข้อมูลไปให้ Master (ยัดลง IndexedDB)
async function sendOrderToMaster() {
    if(clientCart.length === 0) return;
    
    // โหลด DB ล่าสุดเพื่อป้องกันข้อมูลทับกัน (Concurrency Issue)
    db = await loadFromIDB();
    const u = db.units.find(x => x.id === activeUnitId); 
    
    if(u.status === 'busy') u.newItemsQty += clientCart.reduce((s,c)=>s+c.qty, 0); 
    u.status = 'busy'; 
    if(!u.startTime) u.startTime = Date.now(); 
    
    // เอาออร์เดอร์ยัดใส่ของ Master
    clientCart.forEach(c => { 
        let ex = u.orders.find(o => o.name === c.name && o.price === c.price); 
        if(ex) { ex.qty += c.qty; ex.total += c.total; } else { u.orders.push({...c}); } 
    }); 
    
    await saveToIDB(); // บันทึกกลับไป
    
    clientCart = []; // เคลียร์ตะกร้าตัวเอง
    closeModal('modal-review'); 
    switchTab('tables'); 
    renderCustomerGrid(); // รีเฟรชสีโต๊ะ
    showToast("🚀 ส่งเข้าครัวเรียบร้อย"); 
}
//** client-pos close
