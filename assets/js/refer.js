// ==========================================
// File: refer.js
// Description: Referral link, share, leaderboard (Top 30 + Bonus)
// এবং রেফার কাউন্ট শুধু তখনই হবে যখন রেফার্ড ইউজার
// অ্যাড নেটওয়ার্কের ৫টা টাস্ক কমপ্লিট করবে
// ==========================================

// --- Leaderboard Bonus Table (USDT) ---
const LEADERBOARD_BONUS = {
    1: 2.00,
    2: 1.00,
    3: 0.50,
    4: 0.30,
    5: 0.20,
    6: 0.15, 7: 0.15, 8: 0.15, 9: 0.15, 10: 0.15,
    11: 0.10, 12: 0.10, 13: 0.10, 14: 0.10, 15: 0.10,
    16: 0.10, 17: 0.10, 18: 0.10, 19: 0.10, 20: 0.10,
    21: 0.05, 22: 0.05, 23: 0.05, 24: 0.05, 25: 0.05,
    26: 0.05, 27: 0.05, 28: 0.05, 29: 0.05, 30: 0.05
};

function getBonusForRank(rank) {
    return LEADERBOARD_BONUS[rank] || 0;
}

// অ্যাড নেটওয়ার্ক টাস্কের নাম (এগুলো কমপ্লিট হলে কাউন্ট)
const AD_NETWORK_TASKS = ['monetag', 'adexium', 'gigapub', 'tads', 'webvisit', 'webvisit2'];

// ==========================================
// ১. রেফারেল লিংক কপি
// ==========================================
window.copyLink = () => {
    const currentUser = window.currentUser;
    if (!currentUser?.id) {
        if (window.showTopToast) window.showTopToast("User not loaded", "error");
        else if (window.showToast) window.showToast("User not loaded", "error");
        return;
    }
    const link = `https://t.me/PPCoin_bot/app?startapp=r_${currentUser.id}`;
    navigator.clipboard.writeText(link).then(() => {
        if (window.tg?.HapticFeedback) window.tg.HapticFeedback.impactOccurred('medium');
        if (window.showTopToast) window.showTopToast("Referral link copied!", "success");
        else if (window.showToast) window.showToast("Referral link copied!", "success");
    });
};

// ==========================================
// ২. রেফারেল লিংক শেয়ার
// ==========================================
window.shareLink = () => {
    const currentUser = window.currentUser;
    if (!currentUser?.id) return;

    const link = `https://t.me/PPCoin_bot/app?startapp=r_${currentUser.id}`;
    const text = encodeURIComponent("🚀 Start Mining SHIB and earn Bonus! Join now:");
    if (window.tg?.openTelegramLink) {
        window.tg.openTelegramLink(`https://t.me/share/url?url=\( {encodeURIComponent(link)}&text= \){text}`);
    } else {
        window.open(`https://t.me/share/url?url=\( {encodeURIComponent(link)}&text= \){text}`, '_blank');
    }
};

// ==========================================
// ৩. লিডারবোর্ড (Top 30) — শুধু বাটনে ক্লিক করলে লোড
// ==========================================
async function loadLeaderboard() {
    const db = window.db;
    const currentUser = window.currentUser;
    const query = window.query;
    const collection = window.collection;
    const orderBy = window.orderBy;
    const limit = window.limit;
    const getDocs = window.getDocs;

    if (!db) return;

    const list = document.getElementById('leaderboard-list');
    const btn = document.getElementById('btn-show-leaderboard');

    if (list) {
        list.classList.remove('hidden');
        list.innerHTML = '<p class="text-center text-xs text-zinc-500 p-4">Loading top 30...</p>';
    }
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="text-sm text-zinc-400">Loading...</span>';
    }

    try {
        // Top 30 by confirmed referral_count
        const q = query(
            collection(db, "users"),
            orderBy("referral_count", "desc"),
            limit(30)
        );
        const snap = await getDocs(q);

        let html = '';
        let myRank = 0;
        const docs = snap.docs;

        for (let i = 0; i < docs.length; i++) {
            const userData = docs[i].data();
            const rank = i + 1;
            const isMe = (userData.id === currentUser?.id) || (docs[i].id === String(currentUser?.id));

            if (isMe) myRank = rank;

            let rankDisplay = `#${rank}`;
            if (rank === 1) rankDisplay = "🥇";
            else if (rank === 2) rankDisplay = "🥈";
            else if (rank === 3) rankDisplay = "🥉";

            const refCount = Number(userData.referral_count || userData.referrals || 0);
            const bonus = getBonusForRank(rank);
            const name = (userData.name || "User").substring(0, 16);

            const isVerified = refCount >= 30 || userData.isVerified;
            const verifiedIcon = isVerified
                ? `<svg class="w-3.5 h-3.5 fill-[#F7931A] inline-block ml-0.5" viewBox="0 0 24 24"><path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.7l-3.61.81.34 3.68L1 12l2.44 2.79-.34 3.69 3.61.82 1.89 3.2L12 21.04l3.4 1.46 1.89-3.2 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/></svg>`
                : '';

            const photoUrl = userData.photo || '';
            const photoHTML = photoUrl
                ? `<img src="${photoUrl}" class="w-8 h-8 rounded-full border border-[#F7931A]/30 object-cover">`
                : `<div class="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-[#F7931A] font-bold border border-[#F7931A]/20">SHIB</div>`;

            // নাম | refs | bonus — এক লাইনে
            html += `
                <div class="flex justify-between items-center p-3.5 border-b border-white/5 ${isMe ? 'bg-[#F7931A]/10' : ''}">
                    <div class="flex items-center gap-2.5 overflow-hidden min-w-0">
                        <span class="text-sm font-black w-7 text-center flex-shrink-0">${rankDisplay}</span>
                        ${photoHTML}
                        <div class="flex flex-col min-w-0">
                            <span class="text-xs font-bold flex items-center truncate ${isMe ? 'text-[#F7931A]' : 'text-white'}">
                                \( {name} \){verifiedIcon}
                            </span>
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0 pl-2">
                        <span class="text-xs font-black text-emerald-400">${refCount} refs</span>
                        <span class="block text-[10px] font-semibold text-[#F7931A]">+$${bonus.toFixed(2)}</span>
                    </div>
                </div>`;
        }

        if (list) {
            list.innerHTML = html || '<p class="text-center text-xs text-zinc-500 p-4">No data yet</p>';
        }

        // My rank (যদি HTML এ my-rank-container থাকে)
        const myRankContainer = document.getElementById('my-rank-container');
        if (myRankContainer) {
            myRankContainer.classList.remove('hidden');
            const rankNum = document.getElementById('my-rank-number');
            if (rankNum) rankNum.innerText = myRank > 0 ? `#${myRank}` : "30+";

            const rankPP = document.getElementById('my-rank-pp');
            if (rankPP && currentUser) {
                const myRefs = currentUser.referral_count || currentUser.referrals || 0;
                const myShib = currentUser.shib !== undefined ? currentUser.shib : (currentUser.pp || 0);
                rankPP.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="text-right">
                            <p class="text-sm font-black text-emerald-400">${myRefs} REFS</p>
                            <p class="text-[10px] font-bold text-[#F7931A]">${Number(myShib).toFixed(0)} SHIB</p>
                        </div>
                    </div>`;
            }
        }
    } catch (e) {
        console.error("Leaderboard Error:", e);
        if (list) list.innerHTML = '<p class="text-center text-xs text-red-400 p-4">Failed to load leaderboard</p>';
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F7931A" stroke-width="2">
                    <path d="M8 21h8M12 17v4M7 4h10l1 7H6L7 4z"/>
                    <path d="M6 11v2a6 6 0 0012 0v-2"/>
                </svg>
                <span class="text-sm font-bold text-[#F7931A]">View Top 30 Leaderboard</span>`;
        }
    }
}
window.loadLeaderboard = loadLeaderboard;

// ==========================================
// ৪. রেফার কাউন্ট লজিক
//    - জয়েন করলে শুধু pending রেফার সেভ হয়
//    - অ্যাড নেটওয়ার্কের ৫টা টাস্ক কমপ্লিট হলেই
//      রেফারারের referral_count +1 হয়
// ==========================================

/**
 * নতুন ইউজার রেফার লিংক দিয়ে জয়েন করলে কল করুন (app.js init থেকে)
 * শুধু referredBy সেট করে — referral_count বাড়ায় না
 */
window.registerPendingReferral = async function (newUserId, referrerId) {
    if (!window.db || !newUserId || !referrerId) return;
    if (String(newUserId) === String(referrerId)) return; // নিজে নিজেকে রেফার নয়

    try {
        const { doc, getDoc, setDoc, updateDoc } = await getFirestoreHelpers();
        const userRef = doc(window.db, "users", String(newUserId));
        const snap = await getDoc(userRef);
        if (!snap.exists()) return;

        const data = snap.data();
        // আগে থেকে referredBy থাকলে আর চেঞ্জ করবেন না
        if (data.referredBy) return;

        await updateDoc(userRef, {
            referredBy: String(referrerId),
            referralStatus: "pending",           // pending | confirmed
            adTasksCompleted: 0,                 // কতগুলো অ্যাড টাস্ক হয়েছে
            completedAdTasks: []                 // কোন কোন টাস্ক হয়েছে
        });

        console.log("Pending referral registered for", newUserId, "→", referrerId);
    } catch (e) {
        console.error("registerPendingReferral Error:", e);
    }
};

/**
 * অ্যাড নেটওয়ার্ক টাস্ক কমপ্লিট হলে task.js থেকে কল করুন
 * taskKey: 'monetag' | 'adexium' | 'gigapub' | 'tads' | 'webvisit' | 'webvisit2' ইত্যাদি
 */
window.onAdNetworkTaskComplete = async function (taskKey) {
    if (!window.db || !window.currentUser?.id) return;
    if (!AD_NETWORK_TASKS.includes(taskKey) && !taskKey) return;

    try {
        const { doc, getDoc, updateDoc, increment, arrayUnion } = await getFirestoreHelpers();
        const userRef = doc(window.db, "users", String(window.currentUser.id));
        const snap = await getDoc(userRef);
        if (!snap.exists()) return;

        const data = snap.data();
        const referrerId = data.referredBy;
        const status = data.referralStatus || "none";

        // ইতিমধ্যে confirmed হলে আর কিছু করার নেই
        if (status === "confirmed" || !referrerId) {
            // শুধু নিজের adTasksCompleted আপডেট (ঐচ্ছিক)
            const done = Array.isArray(data.completedAdTasks) ? data.completedAdTasks : [];
            if (taskKey && !done.includes(taskKey)) {
                await updateDoc(userRef, {
                    completedAdTasks: arrayUnion(taskKey),
                    adTasksCompleted: increment(1)
                });
            }
            return;
        }

        // Pending রেফার আছে — টাস্ক যোগ করো
        const done = Array.isArray(data.completedAdTasks) ? data.completedAdTasks : [];
        if (taskKey && done.includes(taskKey)) return; // একই টাস্ক দুবার নয়

        const newCount = (Number(data.adTasksCompleted) || 0) + 1;
        const updates = {
            adTasksCompleted: increment(1)
        };
        if (taskKey) updates.completedAdTasks = arrayUnion(taskKey);

        await updateDoc(userRef, updates);

        // ৫টা অ্যাড নেটওয়ার্ক টাস্ক হলে রেফারারকে কাউন্ট দাও
        if (newCount >= 5) {
            await confirmReferral(String(window.currentUser.id), String(referrerId));
        }
    } catch (e) {
        console.error("onAdNetworkTaskComplete Error:", e);
    }
};

/**
 * রেফার কনফার্ম — রেফারারের referral_count +1
 */
async function confirmReferral(newUserId, referrerId) {
    if (!window.db || !newUserId || !referrerId) return;

    try {
        const { doc, getDoc, updateDoc, increment, runTransaction } = await getFirestoreHelpers();

        const newUserRef = doc(window.db, "users", newUserId);
        const referrerRef = doc(window.db, "users", referrerId);

        await runTransaction(window.db, async (transaction) => {
            const newSnap = await transaction.get(newUserRef);
            if (!newSnap.exists()) return;

            const newData = newSnap.data();
            if (newData.referralStatus === "confirmed") return; // ডুপ্লিকেট নয়

            // নতুন ইউজারকে confirmed মার্ক
            transaction.update(newUserRef, {
                referralStatus: "confirmed",
                referralConfirmedAt: Date.now()
            });

            // রেফারারের কাউন্ট +1
            transaction.update(referrerRef, {
                referral_count: increment(1)
            });
        });

        console.log("Referral CONFIRMED:", newUserId, "→", referrerId);

        // লোকাল আপডেট (যদি কারেন্ট ইউজার রেফারার হয়)
        if (window.currentUser && String(window.currentUser.id) === String(referrerId)) {
            window.currentUser.referral_count = (Number(window.currentUser.referral_count) || 0) + 1;
            if (typeof window.updateUI === "function") window.updateUI();
        }

        if (window.showTopToast) {
            // শুধু রেফারারকে মেসেজ দেখানো যাবে যদি সে অ্যাপে থাকে
        }
    } catch (e) {
        console.error("confirmReferral Error:", e);
    }
}

// Firebase helper (module না হলে window থেকে নেয়)
async function getFirestoreHelpers() {
    // যদি app.js থেকে export করা থাকে
    if (window.doc && window.getDoc && window.updateDoc) {
        return {
            doc: window.doc,
            getDoc: window.getDoc,
            setDoc: window.setDoc,
            updateDoc: window.updateDoc,
            increment: window.increment,
            arrayUnion: window.arrayUnion,
            runTransaction: window.runTransaction
        };
    }
    // fallback — Firebase v9 modular ইতিমধ্যে app.js এ থাকলে window এ অ্যাসাইন করুন
    return {
        doc: window.doc,
        getDoc: window.getDoc,
        setDoc: window.setDoc,
        updateDoc: window.updateDoc,
        increment: window.increment,
        arrayUnion: window.arrayUnion,
        runTransaction: window.runTransaction
    };
            }
