// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAz15KYwSGhmbzx7POsDbVKvQDfW_ijjOI",
    authDomain: "salane-aabc2.firebaseapp.com",
    databaseURL: "https://salane-aabc2-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "salane-aabc2",
    storageBucket: "salane-aabc2.firebasestorage.app",
    messagingSenderId: "832887464708",
    appId: "1:832887464708:web:c76ea9d1d7a69f7160a651",
    measurementId: "G-52NPT9L2K3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// DOM Elements
const valTemp = document.getElementById('valTemp');
const valHumid = document.getElementById('valHumid');
const valLight = document.getElementById('valLight');

const barTemp = document.getElementById('barTemp');
const barHumid = document.getElementById('barHumid');
const barLight = document.getElementById('barLight');
const lastUpdated = document.getElementById('lastUpdated');

const salanStatusBadge = document.getElementById('salanStatusBadge');
const salanNet = document.getElementById('salanNet');
const modeBadge = document.getElementById('modeBadge');

const btnAuto = document.getElementById('btnAuto');
const btnManual = document.getElementById('btnManual');
const manualControls = document.getElementById('manualControls');
const manualNotice = document.getElementById('manualNotice');
const btnOpen = document.getElementById('btnOpen');
const btnClose = document.getElementById('btnClose');

const settingsForm = document.getElementById('settingsForm');
const setOpenTemp = document.getElementById('setOpenTemp');
const setOpenLight = document.getElementById('setOpenLight');
const setCloseTemp = document.getElementById('setCloseTemp');
const setCloseLight = document.getElementById('setCloseLight');
const setDelay = document.getElementById('setDelay');
const setMotorRevolutions = document.getElementById('setMotorRevolutions');
const saveMessage = document.getElementById('saveMessage');

let currentMode = 'auto';

// Helper to update timestamp
function updateTimestamp() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH');
    if (lastUpdated) lastUpdated.innerText = timeStr;
}

// ---------------------------------------------------------
// 1. Read Data from Firebase (Realtime)
// ---------------------------------------------------------

// Read Sensor Data
db.ref('sensorData').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        const temp = data.temperature !== undefined ? parseFloat(data.temperature) : 0;
        const humid = data.humidity !== undefined ? parseFloat(data.humidity) : 0;
        const light = data.light !== undefined ? parseFloat(data.light) : 0;

        if (valTemp) valTemp.innerText = temp ? temp.toFixed(1) : '--';
        if (valHumid) valHumid.innerText = humid ? humid.toFixed(1) : '--';
        if (valLight) valLight.innerText = light ? Math.round(light).toLocaleString() : '--';

        // Update progress bars (capped 0-100%)
        if (barTemp) barTemp.style.width = Math.min(Math.max((temp / 50) * 100, 0), 100) + '%';
        if (barHumid) barHumid.style.width = Math.min(Math.max(humid, 0), 100) + '%';
        if (barLight) barLight.style.width = Math.min(Math.max((light / 60000) * 100, 0), 100) + '%';

        updateTimestamp();
    }
});

// Read Status
db.ref('status').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        const state = data.salanState || 'closed';

        // Update Salan Status Badge & Graphic Visualizer
        if (state === 'open') {
            if (salanStatusBadge) {
                salanStatusBadge.innerHTML = '<span class="pill-dot"></span><span class="pill-text">กางสแลนอยู่ (OPEN)</span>';
                salanStatusBadge.className = 'state-pill state-open';
            }
            if (salanNet) salanNet.style.width = '100%';
            if (btnOpen) btnOpen.classList.add('active');
            if (btnClose) btnClose.classList.remove('active');
        } else if (state === 'closed') {
            if (salanStatusBadge) {
                salanStatusBadge.innerHTML = '<span class="pill-dot"></span><span class="pill-text">เก็บสแลนอยู่ (CLOSED)</span>';
                salanStatusBadge.className = 'state-pill state-closed';
            }
            if (salanNet) salanNet.style.width = '0%';
            if (btnClose) btnClose.classList.add('active');
            if (btnOpen) btnOpen.classList.remove('active');
        } else if (state === 'moving') {
            if (salanStatusBadge) {
                salanStatusBadge.innerHTML = '<span class="pill-dot"></span><span class="pill-text">กำลังหมุน... (MOVING)</span>';
                salanStatusBadge.className = 'state-pill state-moving';
            }
            if (salanNet) salanNet.style.width = '50%';
            if (btnOpen) btnOpen.classList.remove('active');
            if (btnClose) btnClose.classList.remove('active');
        }

        // Update Mode
        currentMode = data.mode || 'auto';
        updateModeUI();
    }
});

// Read Settings (Populate Form)
db.ref('settings').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
        if (data.thresholds) {
            if (setOpenTemp && document.activeElement !== setOpenTemp) setOpenTemp.value = data.thresholds.openTemp || 35.0;
            if (setOpenLight && document.activeElement !== setOpenLight) setOpenLight.value = data.thresholds.openLight || 40000;
            if (setCloseTemp && document.activeElement !== setCloseTemp) setCloseTemp.value = data.thresholds.closeTemp || 30.0;
            if (setCloseLight && document.activeElement !== setCloseLight) setCloseLight.value = data.thresholds.closeLight || 10000;
        }
        if (setDelay && document.activeElement !== setDelay) setDelay.value = data.delaySeconds || 60;
        if (setMotorRevolutions && document.activeElement !== setMotorRevolutions) setMotorRevolutions.value = data.motorRevolutions || 5;
    }
});

// ---------------------------------------------------------
// 2. Write Data to Firebase
// ---------------------------------------------------------

// Toggle Mode
function setMode(mode) {
    db.ref('status').update({ mode: mode });
    db.ref().update({ manualCommand: "none" });
}

if (btnAuto) btnAuto.addEventListener('click', () => setMode('auto'));
if (btnManual) btnManual.addEventListener('click', () => setMode('manual'));

function updateModeUI() {
    if (currentMode === 'auto') {
        if (btnAuto) btnAuto.classList.add('active');
        if (btnManual) btnManual.classList.remove('active');

        if (modeBadge) modeBadge.innerHTML = '<i class="fa-solid fa-robot"></i> โหมด Auto';
        if (btnOpen) btnOpen.disabled = true;
        if (btnClose) btnClose.disabled = true;

        if (manualNotice) {
            manualNotice.style.display = 'flex';
            manualNotice.innerHTML = '<i class="fa-solid fa-circle-info"></i> สลับเป็นโหมด Manual เพื่อเปิดใช้งานปุ่มสั่งงาน';
        }
    } else {
        if (btnManual) btnManual.classList.add('active');
        if (btnAuto) btnAuto.classList.remove('active');

        if (modeBadge) modeBadge.innerHTML = '<i class="fa-solid fa-hand-pointer"></i> โหมด Manual';
        if (btnOpen) btnOpen.disabled = false;
        if (btnClose) btnClose.disabled = false;

        if (manualNotice) {
            manualNotice.style.display = 'none';
        }
    }
}

// Manual Controls
if (btnOpen) {
    btnOpen.addEventListener('click', () => {
        if (confirm('ยืนยันการสั่ง "กางสแลน"?')) {
            db.ref().update({ manualCommand: "open" });
        }
    });
}

if (btnClose) {
    btnClose.addEventListener('click', () => {
        if (confirm('ยืนยันการสั่ง "เก็บสแลน"?')) {
            db.ref().update({ manualCommand: "close" });
        }
    });
}

// Save Settings
if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newSettings = {
            thresholds: {
                openTemp: parseFloat(setOpenTemp.value),
                openLight: parseFloat(setOpenLight.value),
                closeTemp: parseFloat(setCloseTemp.value),
                closeLight: parseFloat(setCloseLight.value)
            },
            delaySeconds: parseInt(setDelay.value),
            motorRevolutions: parseFloat(setMotorRevolutions.value)
        };

        db.ref('settings').update(newSettings)
            .then(() => {
                if (saveMessage) {
                    saveMessage.innerText = "✓ บันทึกการตั้งค่าลงระบบเรียบร้อยแล้ว!";
                    saveMessage.className = "toast-feedback success";
                    setTimeout(() => { saveMessage.innerText = ""; }, 3500);
                }
            })
            .catch((error) => {
                if (saveMessage) {
                    saveMessage.innerText = "❌ เกิดข้อผิดพลาด: " + error.message;
                    saveMessage.className = "toast-feedback error";
                }
            });
    });
}

// Initialize database with default values if empty
db.ref('/').once('value').then(snapshot => {
    if (!snapshot.exists()) {
        db.ref('/').set({
            sensorData: { temperature: 28.5, humidity: 65, light: 15000 },
            status: { salanState: "closed", mode: "auto" },
            settings: {
                thresholds: { openTemp: 35.0, openLight: 40000, closeTemp: 30.0, closeLight: 10000 },
                delaySeconds: 60,
                motorRevolutions: 5
            },
            manualCommand: "none"
        });
    }
});

