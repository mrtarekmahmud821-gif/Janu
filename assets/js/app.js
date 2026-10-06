// =======================================================
// app.js - মূল অ্যাপ লজিক, ইউজার স্টেট, ইনিট, নেভিগেশন
// =======================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { 
    getFirestore, doc, getDoc, setDoc, updateDoc, increment, 
    collection, query, orderBy, limit, getDocs, addDoc, 
    serverTimestamp, arrayUnion, where, onSnapshot, runTransaction
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyAD0iYQhYwUWdssGzYFHR9kbP1ZQTlsm80",
    authDomain: "free-income-app-eeade.firebaseapp.com",
    projectId: "free-income-app-eeade",
    storageBucket: "free-income-app-eeade.firebasestorage.app",
    messagingSenderId: "780467222664",
    appId: "1:780467222664:web:5f09f8f03833e7b19f873d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// গ্লোবাল এক্সপোর্ট (অন্য ফাইল থেকে ব্যবহারের জন্য)
window.db = db;
window.doc = doc;
window.updateDoc = updateDoc;
window.increment = increment;
window.collection = collection;
window.query = query;
window.where = where;
window.getDoc = getDoc;
window.setDoc = setDoc;
window.onSnapshot = onSnapshot;
window.runTransaction = runTransaction;
window.serverTimestamp = serverTimestamp;
window.arrayUnion = arrayUnion;
window.orderBy = orderBy;
window.limit = limit;
window.getDocs = getDocs;
window.addDoc = addDoc;

// --- Telegram WebApp ---
const tg = window.Telegram?.WebApp || null;
if (tg) {
    tg.expand();
    tg.ready();
    tg.enableClosingConfirmation();
}
window.tg = tg;

// --- App State ---
let currentUser = { 
    id: "000000", 
    name: "Loading...", 
    pp: 0,               // এখন SHIB হিসেবে ব্যবহার হবে
    usdt: 0, 
    totalDeposited: 0, 
    referrals: 0, 
    referral_count: 0, 
    photo: "", 
    lastBonus: 0, 
    bonusDay: 0,
    miningStartTime: 0, 
    uid: "", 
    miningCards: [], 
    hasReceivedFreeCard: false,
    hasPremiumMiner: false, 
    isWithdrawUnlocked: false, 
    isVerified: false, 
    isBanned: false
};
window.currentUser = currentUser;

let isRichAdsEnabled = false;
let richAdsInterval = 15;
let adCooldownMinutes = 5; 
let lastClickedTaskId = null;
let currentTab = 'home';
let miningRenderInterval = null;
let isProcessing = false;
window.selectedWithdrawAmount = 0;
window.isProcessing = false;

// =======================================================
// নোটিফিকেশন সিস্টেম (সবসময় স্ক্রিনের উপরে)
// =======================================================
function showTopToast(message, type = 'error') {
    let toast = document.getElementById('top-withdraw-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'top-withdraw-toast';
        document.body.appendChild(toast);
    }

    const bgColor = type === 'error' 
        ? 'bg-red-600/90 border-red-400' 
        : 'bg-emerald-600/90 border-emerald-400';
    
    toast.className = `fixed top-5 left-1/2 -translate-x-1/2 z-[99999] px-5 py-3 rounded-2xl text-xs font-semibold text-white shadow-2xl backdrop-blur-md border transition-all duration-300 transform translate-y-0 opacity-100 flex items-center gap-2 max-w-[90vw] text-center ${bgColor}`;
    toast.innerHTML = `<span>${message}</span>`;

    setTimeout(() => {
        toast.classList.add('-translate-y-10', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3000);
}
window.showTopToast = showTopToast;
window.showToast = showTopToast;
window.showCustomTopNotification = showTopToast;

// =======================================================
// হেল্পার ফাংশন
// =======================================================
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

function getCleanCurrentUserId() {
    if (!window.currentUser || !window.currentUser.id) return null;
    return String(window.currentUser.id).trim();
}
window.getCleanCurrentUserId = getCleanCurrentUserId;

function triggerHaptic(type, style = 'medium') {
    try {
        if (tg?.HapticFeedback) {
            if (type === 'impact' && tg.HapticFeedback.impactOccurred) {
                tg.HapticFeedback.impactOccurred(style);
            } else if (type === 'notification' && tg.HapticFeedback.notificationOccurred) {
                tg.HapticFeedback.notificationOccurred(style);
            }
        }
    } catch (e) {
        console.warn("Haptic feedback not supported:", e);
    }
}
window.triggerHaptic = triggerHaptic;

// =======================================================
// Telegram Native Back Button
// =======================================================
function updateTelegramBackButton() {
    if (!tg || !tg.BackButton) return;
    const visibleModals = document.querySelectorAll('[id^="modal-"]:not(.hidden), #banned-screen-modal:not(.hidden)');
    if (visibleModals.length > 0 || (currentTab !== 'home')) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}
window.updateTelegramBackButton = updateTelegramBackButton;

if (tg && tg.BackButton) {
    tg.BackButton.onClick(() => {
        const visibleModals = document.querySelectorAll('[id^="modal-"]:not(.hidden)');
        if (visibleModals.length > 0) {
            visibleModals.forEach(modal => {
                modal.classList.add('hidden');
            });
            updateTelegramBackButton();
            return;
        }
        if (currentTab !== 'home') {
            switchTab('home');
        }
    });
}

// =======================================================
// UI আপডেট
// =======================================================
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

    const refUnlockStatus = document.getElementById('ref-unlock-status');
    const hasPremiumMiner = Boolean(
        currentUser.hasPremiumMiner || 
        currentUser.hasBoughtMiner || 
        currentUser.isWithdrawUnlocked ||
        (Array.isArray(currentUser.miningCards) && currentUser.miningCards.some(c => c.type !== 'free' && c.type !== 'referral'))
    );
    
    if (refUnlockStatus) {
        if (hasPremiumMiner || refCount >= 5 || currentUser.isWithdrawUnlocked || currentUser.isVerified) {
            refUnlockStatus.innerText = "UNLOCKED";
            refUnlockStatus.className = "text-xs font-black text-emerald-400 mt-1";
        } else {
            const needed = Math.max(0, 5 - refCount);
            refUnlockStatus.innerText = `${needed} Referrals Needed`;
            refUnlockStatus.className = "text-xs font-black text-amber-400 mt-1";
        }
    }

    if (refCount >= 10 || currentUser.isVerified) {
        const badge = document.getElementById('verified-badge');
        if (badge) badge.classList.remove('hidden');
    }

    const adBalanceEl = document.getElementById('ad-balance');
    if (adBalanceEl) adBalanceEl.innerText = `\[ {Number(currentUser.usdt || 0).toFixed(2)}`;

    const totalDepositEl = document.getElementById('total-deposit-show');
    if (totalDepositEl) totalDepositEl.innerText = ` \]{Number(currentUser.totalDeposited || 0).toFixed(2)}`;

    // SHIB ব্যালেন্স আপডেট
    const currentFullBalance = currentUser.pp || 0;
    const balanceSelectors = [
        '#pp-header', '#pp-balance', '#user-pp',
        '.pp-amount', '.user-pp', '.pp-balance',
        '#balance-display', '#total-pp', '#user-coins'
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

// =======================================================
// মাইনিং কার্ড অবজেক্ট তৈরি
// =======================================================
function createCardObject(type, durationHours, rewardPerCycle, usdtValue, title) {
    const now = Date.now();
    const totalCycles = (durationHours * 60) / 15;
    const totalCoins = totalCycles * rewardPerCycle;
    return {
        id: 'card_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        type: type,
        title: title || 'Mining Card',
        durationHours: durationHours,
        rewardPerCycle: rewardPerCycle,
        usdtValue: usdtValue,
        totalCoins: totalCoins,
        createdAt: now,
        expiresAt: now + (durationHours * 60 * 60 * 1000),
        lastClaimTime: now,
        cooldownUntil: 0
    };
}
window.createCardObject = createCardObject;

// =======================================================
// INIT APP
// =======================================================
async function init() {
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
    let userCountry = "Unknown";
    fetchUserCountry().then(c => {
        userCountry = c;
        if(currentUser) currentUser.country = c;
    });

    const userRef = doc(db, "users", currentUser.id);
    const settingsRef = doc(db, "settings", "config");

    try {
        const [settingsSnap, snap] = await Promise.all([
            getDoc(settingsRef).catch(() => null),
            getDoc(userRef)
        ]);

        if (settingsSnap && settingsSnap.exists()) {
            const data = settingsSnap.data();
            adCooldownMinutes = data.adCooldown || 5;
            isRichAdsEnabled = data.richAdsActive || false; 
            richAdsInterval = data.richAdsInterval || 60; 
        }

        if (snap && snap.exists()) {
            const userData = snap.data();

            if (userData && userData.isBanned === true) {
                window.checkUserBannedStatus(userData);
                return;
            }

            currentUser = { ...currentUser, ...userData, lastActive: currentTime, country: userCountry };

            if (!currentUser.hasReceivedFreeCard) {
                const freeCard = createCardObject('free', 48, 200, 0.22, 'Free Starter Miner');
                currentUser.miningCards = currentUser.miningCards || [];
                currentUser.miningCards.push(freeCard);
                currentUser.hasReceivedFreeCard = true;

                updateDoc(userRef, {
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
            // নতুন ইউজার
            const freeCard = createCardObject('free', 48, 200, 0.22, 'Free Starter Miner');
            const newUser = {
                id: currentUser.id,
                name: currentUser.name,
                pp: 0,
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
                miningCards: [freeCard],
                hasReceivedFreeCard: true,
                hasPremiumMiner: false,
                isWithdrawUnlocked: false,
                isVerified: false,
                isBanned: false,
                createdAt: serverTimestamp(),
                lastAdTime_adsgram: 0, 
                lastAdTime_monetag: 0, 
                lastAdTime_adexora: 0, 
                lastAdTime_gigapub: 0,
                lastAdTime_adexium: 0
            };

            await setDoc(userRef, newUser);
            currentUser = newUser;

            if (newUser.referredBy && !newUser.referralRewarded) {
                const refRef = doc(db, "users", newUser.referredBy);
                getDoc(refRef).then(async (refSnap) => {
                    if (refSnap.exists()) {
                        const refData = refSnap.data();
                        const refCard = createCardObject('referral', 48, 200, 0.22, 'Referral Reward Miner');
                        const existingCards = refData.miningCards || [];
                        existingCards.push(refCard);

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

        // Daily Active User Tracking
        const todayStr = new Date().toISOString().split('T')[0];
        const analyticsRef = doc(db, "analytics", todayStr);
        setDoc(analyticsRef, {
            activeUsers: arrayUnion(currentUser.id)
        }, { merge: true }).catch(e => console.error("Analytics Error:", e));

    } catch (e) {
        console.error("Init Error:", e);
    }

    const refLinkElement = document.getElementById('ref-link');
    if (refLinkElement) {
        refLinkElement.value = `https://t.me/PPCoin_bot/app?startapp=r_${currentUser.id}`;
    }
    
    if (window.checkExistingMining) window.checkExistingMining();
    ['gigapub', 'adsgram', 'monetag', 'adexora', 'adexium'].forEach(type => {
        if (window.checkSpecificAdCooldown) window.checkSpecificAdCooldown(type);
    });
    
    if (window.checkWebVisitData) window.checkWebVisitData(); 
    if (window.startMiningCardEngine) window.startMiningCardEngine();
    
    updateUI();
    updateTelegramBackButton();
}
window.init = init;

// =======================================================
// Banned Screen Logic
// =======================================================
window.checkUserBannedStatus = (userData) => {
    if (userData && userData.isBanned === true) {
        const modal = document.getElementById('banned-screen-modal');
        if (modal) modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            if (window.showBannedAutoAd) window.showBannedAutoAd();
        }, 3000);
        return true;
    }
    return false;
};

window.showBannedAutoAd = function() {
    if (window.Adsgram) {
        try {
            const autoAdController = window.Adsgram.init({ blockId: "19948" });
            autoAdController.show().catch(err => console.error("Banned Ad Error:", err));
        } catch (e) {
            console.error("Adsgram Init Error:", e);
        }
    }
};

window.handleBannedRefresh = () => {
    if (window.Adsgram) {
        try {
            const refreshAdController = window.Adsgram.init({ blockId: "int-19954" });
            refreshAdController.show().then(() => {
                window.location.reload();
            }).catch(() => {
                window.location.reload();
            });
        } catch (e) {
            window.location.reload();
        }
    } else {
        window.location.reload();
    }
};

// =======================================================
// Navigation (Tab Switch)
// =======================================================
function switchTab(tabName, pushHistory = true) {
    if (currentTab === tabName) return;

    const pageLoader = document.getElementById('page-loader');
    if (pageLoader) pageLoader.classList.remove('hidden');

    setTimeout(() => {
        document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        const targetPage = document.getElementById(`page-${tabName}`);
        const targetNav = document.getElementById(`nav-${tabName}`);

        if (targetPage) targetPage.classList.remove('hidden');
        if (targetNav) targetNav.classList.add('active');

        currentTab = tabName;
        window.currentTab = currentTab;

        updateTelegramBackButton();
        if (pageLoader) pageLoader.classList.add('hidden');
    }, 180);
}
window.switchTab = switchTab;

// =======================================================
// Modal Helpers
// =======================================================
function openModal(id) {
    document.getElementById(id)?.classList.remove('hidden');
    updateTelegramBackButton();
}
window.openModal = openModal;

function closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
    updateTelegramBackButton();
}
window.closeModal = closeModal;

function openGiftHub() {
    const modal = document.getElementById('modal-gift-hub');
    const drawer = document.getElementById('gift-hub-content');
    if (modal) modal.classList.remove('hidden');
    setTimeout(() => {
        if (drawer) drawer.classList.add('open');
    }, 10);
    updateTelegramBackButton();
}
window.openGiftHub = openGiftHub;

function closeGiftHub() {
    const modal = document.getElementById('modal-gift-hub');
    const drawer = document.getElementById('gift-hub-content');
    if (drawer) drawer.classList.remove('open');
    setTimeout(() => {
        if (modal) modal.classList.add('hidden');
    }, 350);
    updateTelegramBackButton();
}
window.closeGiftHub = closeGiftHub;

function switchProfileTab(subTab) {
    const depView = document.getElementById('profile-deposit-view');
    const withView = document.getElementById('profile-withdraw-view');
    const depBtn = document.getElementById('tab-btn-deposit');
    const withBtn = document.getElementById('tab-btn-withdraw');

    if (subTab === 'deposit') {
        if (depView) depView.classList.remove('hidden');
        if (withView) withView.classList.add('hidden');
        if (depBtn) depBtn.className = "py-2.5 rounded-xl font-bold text-xs uppercase transition-all bg-[#F7931A] text-white shadow-md";
        if (withBtn) withBtn.className = "py-2.5 rounded-xl font-bold text-xs uppercase transition-all text-zinc-400 hover:text-white";
    } else {
        if (depView) depView.classList.add('hidden');
        if (withView) withView.classList.remove('hidden');
        if (withBtn) withBtn.className = "py-2.5 rounded-xl font-bold text-xs uppercase transition-all bg-[#F7931A] text-white shadow-md";
        if (depBtn) depBtn.className = "py-2.5 rounded-xl font-bold text-xs uppercase transition-all text-zinc-400 hover:text-white";
    }
}
window.switchProfileTab = switchProfileTab;

function copyBotUsername() {
    const botText = document.getElementById("bot-username")?.innerText || "";
    navigator.clipboard.writeText(botText).then(() => {
        showTopToast("Bot username copied!", "success");
    });
}
window.copyBotUsername = copyBotUsername;

// =======================================================
// Premium Loading Bar (Telegram style)
// =======================================================
function startPremiumLoader() {
    const bar = document.getElementById('loading-bar');
    const percentText = document.getElementById('loading-percent');
    const loader = document.getElementById('app-loader');
    if (!bar || !loader) return;

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 11 + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            bar.style.width = '100%';
            if (percentText) percentText.innerText = '100%';
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                    init(); // লোডিং শেষ হলে অ্যাপ চালু
                }, 400);
            }, 250);
        } else {
            bar.style.width = progress + '%';
            if (percentText) percentText.innerText = Math.floor(progress) + '%';
        }
    }, 110);
}

// অ্যাপ লোড হলে লোডিং শুরু
window.addEventListener('DOMContentLoaded', () => {
    startPremiumLoader();
});
