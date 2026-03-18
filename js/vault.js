/**
 * FAKDU POS V9.19 - Security Vault System
 * ระบบจัดการความปลอดภัย และการเข้าถึงสิทธิ์ Admin
 */

const FAKDU_Vault = {
    // 1. ระบบจัดการหน้าต่าง (Modal Control)
    openModal: (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('hidden');
    },

    closeModal: (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden');
    },

    // 2. ระบบกู้คืนรหัส (Recovery Flow)
    openRecoveryFlow: () => {
        FAKDU_Vault.closeModal('adminLoginModal');
        FAKDU_Vault.openModal('recoveryModal');
    },

    // 3. ฟังก์ชันจำลอง Machine ID (สำหรับผูกรหัสเครื่องในอนาคต)
    getMachineID: () => {
        let machineId = localStorage.getItem('fakdu_machine_id');
        if (!machineId) {
            machineId = 'FKD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            localStorage.setItem('fakdu_machine_id', machineId);
        }
        return machineId;
    }
};

// --- ฟังก์ชันตรวจรหัส Admin ---
function verifyAdminLogin() {
    const pinInput = document.getElementById('loginAdminPin');
    const pin = pinInput.value;

    // รหัสผ่านเริ่มต้น (พี่สามารถเปลี่ยนเป็นดึงจาก Database ได้)
    const MASTER_PIN = "1234"; 

    if (pin === MASTER_PIN) {
        alert("🔓 ปลดล็อกสิทธิ์ Admin สำเร็จ!");
        // ทำงานต่อหลังจากล็อกอินสำเร็จ เช่น เปิดเมนูตั้งค่า
        FAKDU_Vault.closeModal('adminLoginModal');
        pinInput.value = ""; // ล้างค่าทิ้งเพื่อความปลอดภัย
    } else {
        alert("❌ รหัส PIN ไม่ถูกต้อง! กรุณาลองใหม่");
        pinInput.value = "";
        pinInput.focus();
    }
}

// --- ฟังก์ชันกู้คืนรหัส (Offline Recovery) ---
function submitRecovery() {
    const phone = document.getElementById('recoverPhone').value;
    const color = document.getElementById('recoverFavorite').value;
    const masterKey = document.getElementById('recoverXX').value;

    // ตรรกะตรวจเช็คข้อมูลกู้คืน (ตัวอย่าง)
    if (phone === "0812345678" && color === "blue" && masterKey === "FAKDU99") {
        document.getElementById('showRecoveredPassword').classList.remove('hidden');
        document.getElementById('revealedAdminPin').innerText = "1234"; // แสดงรหัสจริง
    } else {
        alert("⚠️ ข้อมูลยืนยันตัวตนไม่ถูกต้อง! ไม่สามารถกู้คืนรหัสได้");
    }
}

// ตั้งค่า Machine ID เมื่อโหลดแอปครั้งแรก
document.addEventListener('DOMContentLoaded', () => {
    const idDisplay = document.getElementById('shop-id-display');
    if (idDisplay) {
        idDisplay.innerText = "ID: " + FAKDU_Vault.getMachineID();
    }
});