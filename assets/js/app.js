// ==========================================
// File: app.js
// Description: অ্যাপের মূল কনফিগারেশন, টেলিগ্রামের নেটিভ ব্যাক বাটন ও লোডার
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, increment, 
    collection, query, orderBy, limit, getDocs, addDoc, 
    serverTimestamp, arrayUnion, where 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- ফায়ারবেস কনফিগারেশন ---
const firebaseConfig = {
    apiKey: "AIzaSyAD0iYQhYwUWdssGzYFHR9kbP1ZQTlsm80",
    authDomain: "free-income-app-eeade.firebaseapp.com",
    projectId: "free-income-app-eeade",
    storageBucket: "free-income-app-eeade.firebasestorage.app",
    messagingSenderId: "780467222664",
    appId: "1:780467222664:web:5f09f8f03833e7b19f873d"
};

// ফায়ারবেস অ্যাপ ও ডাটাবেস সেটআপ
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.db = db;
window.doc = doc;
window.updateDoc = updateDoc;
window.increment = increment;
window.getDoc = getDoc;
window.setDoc = setDoc;
window.collection = collection;
window.addDoc = addDoc;
window.serverTimestamp = serverTimestamp;

// --- টেলিগ্রাম WebApp ইনিশিয়ালাইজেশন ---
const tg = window.Telegram?.WebApp || window.Telegram;
window.tg = tg;

if (tg) {
    tg.expand();
    tg.ready();
}

// --- গ্লোবাল ইউজার অবজেক্ট (Currency: SHIB) ---
let currentUser = { 
    id: "000000", name: "Loading...", shib: 0, usdt: 0, 
    totalDeposited: 0, referrals: 0, referral_count: 0, photo: "", lastBonus: 0, bonusDay: 0,
    miningStartTime: 0, uid: "", miningCards: [], hasReceivedFreeCard: false,
    hasPremiumMiner: false, isWithdrawUnlocked: false, isVerified: false, isBanned: false
};
window.currentUser = currentUser;
window.currentTab = 'home';

// --- টেলিগ্রাম নেটিভ লোডার (Progress Indicator) ---
window.showTelegramLoader = function() {
    if (tg && tg.MainButton) {
        tg.MainButton.showProgress(false);
    }
};

window.hideTelegramLoader = function() {
    if (tg && tg.MainButton) {
        tg.MainButton.hideProgress();
    }
};

// --- টেলিগ্রাম নেটিভ ব্যাক বাটন হ্যান্ডলার ---
function updateTelegramBackButton() {
    if (!tg || !tg.BackButton) return;
    const visibleModals = document.querySelectorAll('.modal:not(.hidden), [id^="modal-"]:not(.hidden), #banned-screen-modal:not(.hidden)');
    if (visibleModals.length > 0 || (window.currentTab !== 'home' && window.currentTab !== 'main')) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}
window.updateTelegramBackButton = updateTelegramBackButton;

if (tg && tg.BackButton) {
    tg.BackButton.onClick(() => {
        const visibleModals = document.querySelectorAll('.modal:not(.hidden), [id^="modal-"]:not(.hidden)');
        if (visibleModals.length > 0) {
            visibleModals.forEach(modal => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });
            updateTelegramBackButton();
            return;
        }
        if (window.currentTab !== 'home' && window.currentTab !== 'main') {
            window.switchTab('home');
        }
    });
}

// --- টোস্ট নোটিফিকেশন ---
function showToast(message, type = 'info') {
    let toast = document.getElementById('top-withdraw-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'top-withdraw-toast';
        document.body.appendChild(toast);
    }

    const bgColor = type === 'error' ? 'bg-red-600/90 border-red-400' : 'bg-emerald-600/90 border-emerald-400';
    
    toast.className = `fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-2xl text-xs font-semibold text-white shadow-2xl backdrop-blur-md border transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 max-w-[90vw] text-center ${bgColor}`;
    toast.innerHTML = `<span>${message}</span>`;

    setTimeout(() => {
        toast.classList.add('-translate-y-10', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3000);
}
window.showToast = showToast;
window.showTopToast = showToast;
window.showCustomTopNotification = showToast;

// --- ইউজারের দেশ ট্র্যাক করার ফাংশন ---
async function fetchUserCountry() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); 
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        return data.country_name || "Unknown";
    } catch (e) {
        return "Unknown";
    }
}
window.fetchUserCountry = fetchUserCountry;

// --- গ্লোবাল UI আপডেট ফাংশন (SHIB রিফ্লেক্ট করে) ---
function updateUI() {
    if (!currentUser) return;

    const userNameEl = document.getElementById('user-name');
    const userIdEl = document.getElementById('user-id');
    const usdtHeaderEl = document.getElementById('usdt-header');
    const userPhotoEl = document.getElementById('user-photo');
    const userPlaceholderEl = document.getElementById('user-placeholder');

    if (userNameEl) userNameEl.innerText = currentUser.name || "User";
    if (userIdEl) userIdEl.innerText = currentUser.id || "000000";
    if (usdtHeaderEl) usdtHeaderEl.innerText = Number(currentUser.usdt || 0).toFixed(4);

    if (currentUser.photo && userPhotoEl) {
        userPhotoEl.src = currentUser.photo;
        userPhotoEl.classList.remove('hidden');
        if (userPlaceholderEl) userPlaceholderEl.classList.add('hidden');
    }

    const refCount = Number(
        currentUser.referral_count || 
        currentUser.referrals || 
        currentUser.referralCount || 
        currentUser.total_ref || 0
    );
    
    const totalRefEl = document.getElementById('total-ref');
    if (totalRefEl) totalRefEl.innerText = refCount;

    const refEarnEl = document.getElementById('ref-earn');
    if (refEarnEl) refEarnEl.innerText = (currentUser.total_ref_earnings || 0).toFixed(0) + " SHIB";

    const refUnlockStatus = document.getElementById('ref-unlock-status');
    const hasPremiumMiner = Boolean(
        currentUser.hasPremiumMiner || 
        currentUser.hasBoughtMiner || 
        currentUser.isWithdrawUnlocked ||
        (Array.isArray(currentUser.miningCards) && currentUser.miningCards.some(c => c.type !== 'free' && c.type !== 'referral'))
    );
    
    if (refUnlockStatus) {
        if (hasPremiumMiner || refCount >= 5 || currentUser.isWithdrawUnlocked || currentUser.isVerified) {
            refUnlockStatus.innerText = "UNLOCKED 🔓";
            refUnlockStatus.className = "text-xs font-black text-emerald-400 mt-1";
        } else {
            const needed = Math.max(0, 5 - refCount);
            refUnlockStatus.innerText = `${needed} Referrals Needed 🔒`;
            refUnlockStatus.className = "text-xs font-black text-amber-400 mt-1";
        }
    }

    if (refCount >= 10 || currentUser.isVerified) {
        const badge = document.getElementById('verified-badge');
        if (badge) badge.classList.remove('hidden');
    }

    const adBalanceEl = document.getElementById('ad-balance');
    if (adBalanceEl) adBalanceEl.innerText = `$${Number(currentUser.usdt || 0).toFixed(2)}`;

    const totalDepositEl = document.getElementById('total-deposit-show');
    if (totalDepositEl) totalDepositEl.innerText = `$${Number(currentUser.totalDeposited || 0).toFixed(2)}`;

    const currentFullBalance = currentUser.shib || currentUser.pp || 0;
    const balanceSelectors = [
        '#shib-header', '#shib-balance', '#user-shib', '#pp-header', '#pp-balance', '#user-pp',
        '.shib-amount', '.user-shib', '.shib-balance', '.pp-amount', '.user-pp', '.pp-balance',
        '#balance-display', '#total-shib', '#total-pp', '#user-coins'
    ];

    balanceSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            if (element) {
                if (element.tagName === "INPUT") {
                    element.value = parseFloat(currentFullBalance).toFixed(2);
                } else {
                    element.innerText = parseFloat(currentFullBalance).toFixed(2);
                }
            }
        });
    });
}
window.updateUI = updateUI;

// --- মডাল ওপেন ও ক্লোজ ফাংশন ---
window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        updateTelegramBackButton();
    }
};

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
    } else {
        document.querySelectorAll('.fixed.inset-0').forEach(m => m.classList.add('hidden'));
    }
    updateTelegramBackButton();
};

// --- ট্যাব সুইচিং ---
window.switchTab = (tab, el) => {
    window.currentTab = tab;
    document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const targetPage = document.getElementById(`page-${tab}`);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }

    if (tab === 'task' || tab === 'tasks') {
        if (typeof window.loadAvailableTasks === 'function') window.loadAvailableTasks(); 
        if (typeof window.loadMyTasksManagement === 'function') window.loadMyTasksManagement(); 
        if (typeof window.loadAppInstallTasks === 'function') window.loadAppInstallTasks();
    } 
    else if (tab === 'refer' || tab === 'leaderboard') {
        if (typeof window.loadLeaderboard === 'function') window.loadLeaderboard(); 
    } 
    else if (tab === 'event') {
        if (typeof window.loadEventPageData === 'function') window.loadEventPageData();
    }
    else if (tab === 'withdraw' || tab === 'profile') {
        if (typeof window.loadWithdrawHistory === 'function') window.loadWithdrawHistory();
    }

    if (el) {
        el.classList.add('active');
    } else {
        const navBtn = document.querySelector(`.nav-btn[onclick*="'${tab}'"]`);
        if (navBtn) navBtn.classList.add('active');
    }
    
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }

    updateTelegramBackButton();
};

// --- অ্যাপ লোড চালুকরণ ---
async function initApp() {
    window.showTelegramLoader();
    const tgUser = tg?.initDataUnsafe?.user;
    currentUser.id = tgUser ? tgUser.id.toString() : "99999";
    currentUser.name = tgUser ? (tgUser.first_name + (tgUser.last_name ? " " + tgUser.last_name : "")) : "Web User";
    currentUser.photo = tgUser?.photo_url || "";

    updateUI(); 

    const startParam = tg?.initDataUnsafe?.start_param || null;
    let referrerId = null;
    if (startParam && startParam.startsWith("r_")) {
        referrerId = startParam.replace("r_", "");
    }

    const currentTime = Date.now(); 
    let userCountry = await fetchUserCountry();
    currentUser.country = userCountry;

    const userRef = doc(db, "users", currentUser.id);
    const settingsRef = doc(db, "settings", "config");

    try {
        const [settingsSnap, snap] = await Promise.all([
            getDoc(settingsRef).catch(() => null),
            getDoc(userRef)
        ]);

        if (snap && snap.exists()) {
            const userData = snap.data();

            if (userData && userData.isBanned === true) {
                if (typeof window.checkUserBannedStatus === 'function') {
                    window.checkUserBannedStatus(userData);
                }
                window.hideTelegramLoader();
                return;
            }

            currentUser = { ...currentUser, ...userData, lastActive: currentTime, country: userCountry };
            
            // Legacy Balance Synchronization (PP to SHIB)
            if (userData.pp !== undefined && userData.shib === undefined) {
                currentUser.shib = userData.pp;
            }

            if (!currentUser.hasReceivedFreeCard) {
                const freeCard = window.createCardObject ? window.createCardObject('free', 48, 200, 0.22, 'Free Starter Miner') : null;
                currentUser.miningCards = currentUser.miningCards || [];
                if (freeCard) currentUser.miningCards.push(freeCard);
                currentUser.hasReceivedFreeCard = true;

                updateDoc(userRef, {
                    shib: currentUser.shib || 0,
                    miningCards: currentUser.miningCards,
                    hasReceivedFreeCard: true,
                    lastActive: currentTime,
                    country: userCountry
                }).catch(e => console.error(e));
            } else {
                updateDoc(userRef, {
                    lastActive: currentTime,
                    country: userCountry
                }).catch(e => console.error(e));
            }

        } else {
            const freeCard = window.createCardObject ? window.createCardObject('free', 48, 200, 0.22, 'Free Starter Miner') : null;
            const newUser = {
                id: currentUser.id,
                name: currentUser.name,
                shib: 0,
                usdt: 0,
                country: userCountry,
                lastActive: currentTime,
                total_ref_earnings: 0,
                referral_count: 0,
                referrals: 0,
                referredBy: (referrerId && referrerId !== currentUser.id) ? referrerId : null,
                referralRewarded: false,
                lastBonus: 0,
                bonusDay: 0,
                miningCards: freeCard ? [freeCard] : [],
                hasReceivedFreeCard: true,
                hasPremiumMiner: false,
                isWithdrawUnlocked: false,
                isVerified: false,
                isBanned: false,
                createdAt: serverTimestamp()
            };

            await setDoc(userRef, newUser);
            currentUser = newUser;

            if (newUser.referredBy && !newUser.referralRewarded) {
                const refRef = doc(db, "users", newUser.referredBy);
                getDoc(refRef).then(async (refSnap) => {
                    if (refSnap.exists()) {
                        const refData = refSnap.data();
                        const refCard = window.createCardObject ? window.createCardObject('referral', 48, 200, 0.22, 'Referral Reward Miner') : null;
                        const existingCards = refData.miningCards || [];
                        if (refCard) existingCards.push(refCard);

                        await updateDoc(refRef, { 
                            referral_count: increment(1),
                            referrals: increment(1),
                            total_ref_earnings: increment(1000),
                            miningCards: existingCards
                        });
                        await updateDoc(userRef, { referralRewarded: true });
                    }
                }).catch(e => console.error(e));
            }
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const analyticsRef = doc(db, "analytics", todayStr);
        setDoc(analyticsRef, {
            activeUsers: arrayUnion(currentUser.id)
        }, { merge: true }).catch(e => console.error("Analytics Error:", e));

    } catch (e) {
        console.error("Init Error:", e);
    }

    window.currentUser = currentUser;
    
    if (typeof window.startMiningCardEngine === 'function') window.startMiningCardEngine();
    updateUI();
    updateTelegramBackButton();
    window.hideTelegramLoader();
}

window.addEventListener('DOMContentLoaded', initApp);
