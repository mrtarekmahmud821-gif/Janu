// ==========================================
// File: webvisit.js
// Description: ওয়েবসাইট ভিজিট এবং টাইমার বেসড SHIB রিওয়ার্ড ক্লেম
// ==========================================

const WEB_LINK_1 = "https://www.profitablecpmratenetwork.com/an1nkzmp5v?key=e428dec5d97a44ad25af956b86d80b0a";
const WEB_LINK_2 = "https://omg10.com/4/9569264";

const VISIT_DURATION = 15000;         
const COOLDOWN_TIME = 15 * 60 * 1000; 

const STORAGE_KEY = "last_web_visit_time";
const STORAGE_KEY_2 = "last_web_visit_time_2";

let visitStartTime = 0;
let isVisiting = false;
let isProcessing = false;

let visitStartTime2 = 0;
let isVisiting2 = false;
let isProcessing2 = false;

function showCustomToast(message, type = "info") {
    if (typeof window.showToast === "function") {
        window.showToast(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// --- লাইভ ব্যালেন্স সিঙ্ক ---
async function dispatchBalanceUpdate(addedAmount) {
    try {
        const currentUser = window.currentUser;
        const db = window.db;
        const doc = window.doc;
        const getDoc = window.getDoc;

        let userId = currentUser?.id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
        
        if (userId && db) {
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                const userData = userSnap.data();
                if (window.currentUser) {
                    window.currentUser.shib = userData.shib !== undefined ? userData.shib : userData.pp;
                }
            } else {
                if (window.currentUser) {
                    window.currentUser.shib = (Number(window.currentUser.shib || window.currentUser.pp) || 0) + addedAmount;
                }
            }
        } else {
            if (window.currentUser) {
                window.currentUser.shib = (Number(window.currentUser.shib || window.currentUser.pp) || 0) + addedAmount;
            }
        }

        if (typeof window.updateUI === "function") window.updateUI();

    } catch (e) {
        console.error("Live UI balance sync failed:", e);
    }
}

// --- TASK 1: WEB VISIT HANDLER ---
window.handleWebVisit = async function () {
    if (isVisiting || isProcessing) {
        showCustomToast("❌ Task 1 is already in progress!", "error");
        return;
    }

    const lastVisit = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();

    if (lastVisit && (now - parseInt(lastVisit) < COOLDOWN_TIME)) {
        showCustomToast("⏳ Cooldown active for Task 1. Please wait!", "info");
        return;
    }

    isVisiting = true;
    isProcessing = false;
    visitStartTime = Date.now();

    localStorage.setItem('web_task_verification_start', visitStartTime.toString());

    try {
        window.open(WEB_LINK_1, '_blank');
    } catch (e) {
        resetTaskState();
        showCustomToast("Failed to launch link. Try again.", "error");
    }
};

// --- TASK 2: WEB VISIT HANDLER ---
window.handleWebVisit2 = async function () {
    if (isVisiting2 || isProcessing2) {
        showCustomToast("❌ Task 2 is already in progress!", "error");
        return;
    }

    const lastVisit2 = localStorage.getItem(STORAGE_KEY_2);
    const now = Date.now();

    if (lastVisit2 && (now - parseInt(lastVisit2) < COOLDOWN_TIME)) {
        showCustomToast("⏳ Cooldown active for Task 2. Please wait!", "info");
        return;
    }

    isVisiting2 = true;
    isProcessing2 = false;
    visitStartTime2 = Date.now();

    localStorage.setItem('web_task_verification_start_2', visitStartTime2.toString());

    try {
        window.open(WEB_LINK_2, '_blank');
    } catch (e) {
        resetTask2State();
        showCustomToast("Failed to launch link. Try again.", "error");
    }
};

// --- রিটার্ন ভেরিফিকেশন ---
function verifyTaskStateOnReturn() {
    const now = Date.now();

    const savedStartTime = localStorage.getItem('web_task_verification_start');
    if (isVisiting && !isProcessing && savedStartTime) {
        isVisiting = false; 
        const timeSpent = Math.floor((now - parseInt(savedStartTime)) / 1000);
        localStorage.removeItem('web_task_verification_start'); 

        if (timeSpent >= 15) {
            isProcessing = true;
            awardWebVisitReward(1);
        } else {
            resetTaskState();
            showCustomToast(`❌ Task Failed! Stayed ${timeSpent}s. Minimum required: 15s.`, "error");
        }
    }

    const savedStartTime2 = localStorage.getItem('web_task_verification_start_2');
    if (isVisiting2 && !isProcessing2 && savedStartTime2) {
        isVisiting2 = false;
        const timeSpent2 = Math.floor((now - parseInt(savedStartTime2)) / 1000);
        localStorage.removeItem('web_task_verification_start_2');

        if (timeSpent2 >= 15) {
            isProcessing2 = true;
            awardWebVisitReward(2);
        } else {
            resetTask2State();
            showCustomToast(`❌ Task 2 Failed! Stayed ${timeSpent2}s. Minimum required: 15s.`, "error");
        }
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        setTimeout(verifyTaskStateOnReturn, 800);
    }
});

// --- রিওয়ার্ড প্রদান ---
async function awardWebVisitReward(taskNumber) {
    try {
        const currentUser = window.currentUser;
        const db = window.db;
        const doc = window.doc;
        const updateDoc = window.updateDoc;
        const increment = window.increment;

        let userId = currentUser?.id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString();
        if (!userId) {
            showCustomToast("User session lost. Restart app.", "error");
            taskNumber === 1 ? resetTaskState() : resetTask2State();
            return;
        }

        const userRef = doc(db, "users", userId);
        
        await updateDoc(userRef, {
            shib: increment(50),
            lastWebVisit: new Date().toISOString()
        });

        await dispatchBalanceUpdate(50);
        
        if (taskNumber === 1) {
            localStorage.setItem(STORAGE_KEY, Date.now().toString());
            showCustomToast("🎉 Success! Task 1 +50 SHIB Added!", "success");
            startWebCooldown(COOLDOWN_TIME, 'btn-web-visit', 'webVisitTimer', STORAGE_KEY, 'webVisitInterval');
        } else {
            localStorage.setItem(STORAGE_KEY_2, Date.now().toString());
            showCustomToast("🎉 Success! Task 2 +50 SHIB Added!", "success");
            startWebCooldown(COOLDOWN_TIME, 'btn-web-visit-2', 'webVisitTimer2', STORAGE_KEY_2, 'webVisitInterval2');
        }

    } catch (error) {
        showCustomToast("Reward database transaction failed.", "error");
    } finally {
        taskNumber === 1 ? resetTaskState() : resetTask2State();
    }
}

function resetTaskState() { isVisiting = false; isProcessing = false; visitStartTime = 0; }
function resetTask2State() { isVisiting2 = false; isProcessing2 = false; visitStartTime2 = 0; }

function startWebCooldown(duration, btnId, timerId, storageKey, intervalWindowKey) {
    const btn = document.getElementById(btnId);
    const timerText = document.getElementById(timerId);

    if (!btn) return;
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.innerText = "LOCKED";

    if (timerText) timerText.style.display = "block";

    if (window[intervalWindowKey]) clearInterval(window[intervalWindowKey]);

    window[intervalWindowKey] = setInterval(() => {
        const lastVisit = localStorage.getItem(storageKey);
        if (!lastVisit) {
            clearInterval(window[intervalWindowKey]);
            resetButton(btn, timerText);
            return;
        }

        const elapsed = Date.now() - parseInt(lastVisit);
        const remaining = duration - elapsed;

        if (remaining <= 0) {
            clearInterval(window[intervalWindowKey]);
            resetButton(btn, timerText);
        } else {
            const m = Math.floor(remaining / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            if (timerText) timerText.innerText = `READY IN: ${m}m ${s}s`;
        }
    }, 1000);
}

function resetButton(btn, timerText) {
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.innerText = "VISIT";
    }
    if (timerText) timerText.style.display = "none";
}

window.checkWebVisitCooldown = function () {
    const lastVisit = localStorage.getItem(STORAGE_KEY);
    if (lastVisit) {
        const elapsed = Date.now() - parseInt(lastVisit);
        if (elapsed < COOLDOWN_TIME) startWebCooldown(COOLDOWN_TIME - elapsed, 'btn-web-visit', 'webVisitTimer', STORAGE_KEY, 'webVisitInterval');
    }
    const lastVisit2 = localStorage.getItem(STORAGE_KEY_2);
    if (lastVisit2) {
        const elapsed2 = Date.now() - parseInt(lastVisit2);
        if (elapsed2 < COOLDOWN_TIME) startWebCooldown(COOLDOWN_TIME - elapsed2, 'btn-web-visit-2', 'webVisitTimer2', STORAGE_KEY_2, 'webVisitInterval2');
    }
};

document.addEventListener("DOMContentLoaded", () => {
    if (typeof window.checkWebVisitCooldown === "function") {
        window.checkWebVisitCooldown();
    }
});
