/**
 * FAKDU POS V9.19 - Core Logic System
 * ระบบจัดการตะกร้าสินค้าและคำนวณเงิน
 */

// 1. ตัวแปรเก็บข้อมูล (State)
let cart = [];
let grandTotal = 0;

// 2. ฟังก์ชันเพิ่มสินค้าลงตะกร้า
function addToCart(name, price) {
    // เช็คก่อนว่ามีสินค้านี้ในตะกร้าหรือยัง
    const existingItem = cart.find(item => item.name === name);

    if (existingItem) {
        // ถ้ามีแล้ว ให้เพิ่มจำนวน (Qty)
        existingItem.qty += 1;
    } else {
        // ถ้ายังไม่มี ให้เพิ่มเข้าไปใหม่
        cart.push({
            name: name,
            price: price,
            qty: 1
        });
    }

    // อัปเดตหน้าจอทันที
    renderCart();
}

// 3. ฟังก์ชันลบสินค้า (ลบทีละ 1 ชิ้น)
function removeFromCart(index) {
    if (cart[index].qty > 1) {
        cart[index].qty -= 1;
    } else {
        cart.splice(index, 1); // ถ้าเหลือ 1 ชิ้นแล้วกดลบ ให้เอาออกไปเลย
    }
    renderCart();
}

// 4. ฟังก์ชันวาดรายการสินค้าลงหน้าจอ (Render UI)
function renderCart() {
    const cartContainer = document.getElementById('cart-items');
    const totalDisplay = document.getElementById('grand-total');

    // ถ้าตะกร้าว่างเปล่า
    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="text-center text-gray-400 mt-10">รอเลือกรายการสินค้า...</p>';
        totalDisplay.innerText = "0.00";
        grandTotal = 0;
        return;
    }

    // วนลูปสร้าง HTML รายการสินค้าในตะกร้า
    let cartHTML = '';
    grandTotal = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        grandTotal += itemTotal;

        cartHTML += `
            <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border-l-4 border-blue-500 shadow-sm animate-fade-in">
                <div class="flex-1">
                    <div class="font-bold text-gray-800">${item.name}</div>
                    <div class="text-xs text-gray-500">${item.price.toFixed(2)} x ${item.qty}</div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="font-black text-blue-600">฿${itemTotal.toFixed(2)}</span>
                    <button onclick="removeFromCart(${index})" class="text-red-400 hover:text-red-600 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="Hold 10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
    });

    // แสดงผลบนหน้าจอ
    cartContainer.innerHTML = cartHTML;
    totalDisplay.innerText = grandTotal.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// 5. ฟังก์ชันชำระเงิน (ตัวอย่าง)
function processPayment() {
    if (cart.length === 0) {
        alert("กรุณาเลือกสินค้าก่อนชำระเงินครับพี่!");
        return;
    }

    alert(`ยอดชำระทั้งหมด: ฿${grandTotal.toFixed(2)}\nกำลังบันทึกข้อมูลลงฐานข้อมูลออฟไลน์...`);
    
    // ล้างตะกร้าหลังขายเสร็จ
    cart = [];
    renderCart();
}

// ผูกปุ่มคีย์ลัด (เช่น กด F10 เพื่อชำระเงิน)
document.addEventListener('keydown', (e) => {
    if (e.key === 'F10') {
        processPayment();
    }
});