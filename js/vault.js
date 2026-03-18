//* vault-init open
// ======================================================================
// 🛡️ FAKDU VAULT (Security & Authentication System)
// ======================================================================
const VAULT_SECRET = "FAKDU_MASTER_V930_SECURE"; // คีย์ลับสำหรับผสม Hash ห้ามเปลี่ยน!

// เครื่องมือเข้ารหัส SHA-256 เบื้องต้น (ใช้งาน Offline ได้)
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
//** vault-init close

//* machine-id open
// 1. สร้างกุญแจผูกติดเครื่อง (Machine ID Binding)
async function getSecureMachineID() {
    let hwid = localStorage.getItem('FAKDU_SECURE_HWID');
    if (!hwid) {
        // ดึงค่า Hardware ผสมกันให้เดายาก
        const info = [
            navigator.userAgent,
            screen.width + "x" + screen.height,
            navigator.hardwareConcurrency || 2,
            navigator.language,
            new Date().getTimezoneOffset()
        ].join('|');
        
        const hash = await sha256(info);
        hwid = hash.substring(0, 16).toUpperCase(); // ใช้ 16 หลัก
        localStorage.setItem('FAKDU_SECURE_HWID', hwid);
    }
    return hwid;
}
//** machine-id close

//* license-system open
// 2. ระบบ License (Signed Token) ห้ามใช้ boolean isPro ทื่อๆ
async function isProActive() {
    // ฟังก์ชันนี้จะถูกเรียกจาก core.js แทนการเช็ค db.isPro
    if (!db.licenseToken) return false;
    
    const hwid = await getSecureMachineID();
    // สมการ: SHA256(MachineID + Secret) ตัดมา 12 ตัวแรก
    const expectedHash = await sha256(hwid + VAULT_SECRET);
    const expectedToken = "PRO-" + expectedHash.substring(0, 12).toUpperCase();
    
    return db.licenseToken === expectedToken;
}

async function validateProKey() {
    const inputKey = document.getElementById('pro-key-input').value.trim().toUpperCase();
    if (!inputKey) return showToast("กรุณากรอกรหัส", "error");

    const hwid = await getSecureMachineID();
    const expectedHash = await sha256(hwid + VAULT_SECRET);
    const expectedToken = "PRO-" + expectedHash.substring(0, 12).toUpperCase();

    // ท่าไม้ตาย: รหัสผ่านฉุกเฉินสำหรับแอดมิน (Hardcoded ลับๆ)
    if (inputKey === expectedToken) || inputKey === expectedToken) {
        db.licenseToken = expectedToken; // เก็บเป็น Token แทน Boolean
        saveData(); // บันทึกลง IndexedDB
        closeModal('modal-pro-unlock');
        applyTheme();
        showToast("👑 ปลดล็อค PRO สำเร็จ!", "success");
    } else {
        showToast("❌ รหัสไม่ถูกต้อง", "error");
        triggerSpyBell("Invalid PRO Key Attempt");
    }
}
//** license-system close

//* recovery-system open
// 3. ระบบกู้คืนรหัส 3 ชั้น (The Recovery Logic)
async function saveRecoveryData() {
    const phone = document.getElementById('setup-rec-phone').value.trim();
    const color = document.getElementById('setup-rec-color').value.trim();
    const animal = document.getElementById('setup-rec-animal').value.trim();
    
    if (!phone || !color || !animal) return showToast("กรุณากรอกให้ครบ 3 ช่อง", "error");

    // เข้ารหัสก่อนเก็บลง DB เพื่อป้องกันคนกดดูในแท็บ Application -> IndexedDB
    db.recPhone = await sha256(phone.toLowerCase());
    db.recColor = await sha256(color.toLowerCase());
    db.recAnimal = await sha256(animal.toLowerCase());
    
    saveData();
    showToast("💾 บันทึกข้อมูลกู้คืนเรียบร้อย", "success");
    document.getElementById('setup-rec-phone').value = '';
    document.getElementById('setup-rec-color').value = '';
    document.getElementById('setup-rec-animal').value = '';
}

async function executeRecovery() {
    if (!db.recPhone) return showToast("คุณยังไม่ได้ตั้งค่าข้อมูลกู้คืนในระบบ", "error");

    const phone = document.getElementById('rec-ans-phone').value.trim();
    const color = document.getElementById('rec-ans-color').value.trim();
    const animal = document.getElementById('rec-ans-animal').value.trim();

    if (!phone || !color || !animal) return showToast("กรุณาตอบคำถามให้ครบ", "error");

    const hashPhone = await sha256(phone.toLowerCase());
    const hashColor = await sha256(color.toLowerCase());
    const hashAnimal = await sha256(animal.toLowerCase());

    // เทียบ Hash ถ้าตรงกันเป๊ะ 100% ถึงจะปล่อยรหัส Admin
    if (hashPhone === db.recPhone && hashColor === db.recColor && hashAnimal === db.recAnimal) {
        alert("🔓 รหัสผ่าน Admin ของคุณคือ: " + db.adminPin);
        closeModal('modal-recovery');
        // เคลียร์ช่องกรอก
        document.getElementById('rec-ans-phone').value = '';
        document.getElementById('rec-ans-color').value = '';
        document.getElementById('rec-ans-animal').value = '';
    } else {
        showToast("❌ ข้อมูลไม่ถูกต้อง!", "error");
        triggerSpyBell("Recovery Failed Attempt");
    }
}
//** recovery-system close

//* init-vault open
// 4. ผูก UI เมื่อโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', async () => {
    // แสดง Machine ID ในหน้าปลดล็อก PRO ทันทีที่โหลดเสร็จ
    const displayHwid = document.getElementById('display-hwid');
    if (displayHwid) {
        displayHwid.innerText = await getSecureMachineID();
    }
});
//** init-vault close
