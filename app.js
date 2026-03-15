// ==========================================
// 
// ==========================================

// 1. ใส่รหัสกุญแจ Firebase ของพี่ตรงนี้ (เดี๋ยวเราไปสมัครแล้วเอามาใส่ทีหลัง)
const firebaseConfig = {
  apiKey: "AIzaSyC4jOmVcZp0HmmDqZCmHufnq2yyoPcvyVM",
  authDomain: "pakdu-a26c4.firebaseapp.com",
  projectId: "pakdu-a26c4",
  storageBucket: "pakdu-a26c4.firebasestorage.app",
  messagingSenderId: "414809008203",
  appId: "1:414809008203:web:757dceafa78d91900d85ce",
  measurementId: "G-2B03KJ4D68"
};

// 2. เริ่มต้นเชื่อมต่อ Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const cloudDB = firebase.firestore();

// 3. เปิดโหมด Offline 100% (สำคัญมาก: ทำให้พนักงานขายได้แม้เน็ตหลุด)
cloudDB.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("⚠️ เปิดแอปซ้อนกันหลายหน้าต่าง โหมด Offline ทำงานได้แค่หน้าต่างเดียวนะครับ");
        } else if (err.code === 'unimplemented') {
            console.warn("⚠️ เบราว์เซอร์นี้ไม่รองรับโหมด Offline ของ Firebase");
        }
    });

// ==========================================
// 
// ==========================================

// ส่งบิลยอดขายขึ้น Cloud เมื่อมีการเช็คบิล
window.syncSaleToCloud = async function(saleRecord) {
    try {
        await cloudDB.collection("sales").doc(saleRecord.id.toString()).set(saleRecord);
        console.log("✅ ซิงค์ยอดขายขึ้น Cloud สำเร็จ!");
    } catch (error) {
        console.error("❌ ซิงค์ล้มเหลว (ระบบจะแอบส่งใหม่ตอนมีเน็ตเอง):", error);
    }
};


window.syncTableToCloud = async function(tableData) {
    try {
        await cloudDB.collection("tables").doc(tableData.id.toString()).set(tableData);
        console.log(`✅ อัปเดตสถานะโต๊ะ ${tableData.id} ขึ้น Cloud สำเร็จ!`);
    } catch (error) {
        console.error("❌ อัปเดตโต๊ะล้มเหลว:", error);
    }
};


window.syncMenuToCloud = async function(menuData) {
    try {
        await cloudDB.collection("menus").doc(menuData.id.toString()).set(menuData);
        console.log("✅ ซิงค์เมนูอาหารขึ้น Cloud สำเร็จ!");
    } catch (error) {
        console.error("❌ ซิงค์เมนูล้มเหลว:", error);
    }
};
