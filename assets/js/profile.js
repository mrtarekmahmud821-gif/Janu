// ==========================================
// File: profile.js
// Description: প্রোফাইল অপশন, মাইনার শপ আপগ্রেড এবং ডেইলি বোনাস
// ==========================================

// --- আপগ্রেড মাইনার ও প্যাকেজ ক্রয় ---
window.buyUpgrade = async (plan) => {
    const currentUser = window.currentUser;
    const db = window.db;
    const doc = window.doc;
    const updateDoc = window.updateDoc;
    const increment = window.increment;

    if (!currentUser || !currentUser.id) return window.showToast("User data loading... Please wait!", "error");

    let cost = 0;
    let newCard = null;

    if (plan === 'miner_1') {
        cost = 0.12;
        newCard = window.createCardObject('miner_1', 48, 200, 0.22, 'Miner #1 (48 Hours)');
    } else if (plan === 'miner_2') {
        cost = 0.15;
        newCard = window.createCardObject('miner_2', 72, 200, 0.30, 'Miner #2 (72 Hours)');
    } else if (plan === 'miner_3') {
        cost = 0.20;
        newCard = window.createCardObject('miner_3', 72, 250, 0.40, 'Miner #3 (72 Hours - 250 SHIB)');
    } else if (plan === 'mining_2x') {
        cost = 1.00;
    } else if (plan === 'verification') {
        cost = 1.00;
    }

    const userUSDT = Number(currentUser.usdt || 0);
    if (userUSDT < cost) {
        window.showToast(`⚠️ Insufficient USDT balance! Need $${cost.toFixed(2)} USDT.`, "error");
        window.switchTab('profile');
        if (typeof window.closeGiftHub === 'function') window.closeGiftHub();
        return;
    }

    if (!confirm(`Confirm purchase for $${cost.toFixed(2)} USDT?`)) return;

    try {
        const userRef = doc(db, "users", currentUser.id);

        if (newCard) {
            currentUser.miningCards = currentUser.miningCards || [];
            currentUser.miningCards.push(newCard);
            currentUser.usdt = userUSDT - cost;
            currentUser.hasPremiumMiner = true;
            currentUser.isWithdrawUnlocked = true;

            await updateDoc(userRef, {
                usdt: increment(-cost),
                miningCards: currentUser.miningCards,
                hasPremiumMiner: true,
                isWithdrawUnlocked: true
            });
            window.showToast(`🎉 Success! Purchased ${newCard.title}. Withdrawal Unlocked!`, "success");
        } 
        else if (plan === 'mining_2x') {
            await updateDoc(userRef, { 
                usdt: increment(-cost),
                isMining2x: true,
                mining2xExpiry: Date.now() + (30 * 24 * 60 * 60 * 1000)
            });
            currentUser.usdt -= cost;
            window.showToast("Success! Mining 2x activated for 30 days.", "success");
        } 
        else if (plan === 'verification') {
            await updateDoc(userRef, { 
                usdt: increment(-cost),
                isVerified: true,
                isWithdrawUnlocked: true
            });
            currentUser.usdt -= cost;
            currentUser.isVerified = true;
            currentUser.isWithdrawUnlocked = true;
            window.showToast("Success! You are now Verified. Withdrawal Unlocked!", "success");
        }

        window.updateUI();
        if (typeof window.startMiningCardEngine === 'function') window.startMiningCardEngine();
        if (typeof window.closeGiftHub === 'function') window.closeGiftHub();

        if (window.tg?.HapticFeedback) window.tg.HapticFeedback.notificationOccurred('success');
    } catch (e) {
        console.error("Purchase Error:", e);
        window.showToast("Something went wrong. Try again.", "error");
    }
};

// --- ডেইলি বোনাস মডাল ও রিওয়ার্ড ক্লেম ---
const bonusRewards = [0.0005, 0.0005, 0.0007, 0.0007, 0.0015, 0.002, 0.003];
window.openBonusModal = () => {
    const currentUser = window.currentUser;
    const grid = document.getElementById('bonus-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (currentUser.lastBonus !== 0 && (now - currentUser.lastBonus) > (dayMs * 2)) {
        currentUser.bonusDay = 0;
    }
    for (let i = 0; i < 7; i++) {
        const box = document.createElement('div');
        box.className = `day-box ${i < (currentUser.bonusDay || 0) ? 'completed' : (i === (currentUser.bonusDay || 0) ? 'current' : '')}`;
        box.innerHTML = `<p class="text-[9px]">Day ${i+1}</p><p class="text-[8px]">$${bonusRewards[i]}</p>`;
        grid.appendChild(box);
    }
    const btn = document.getElementById('btn-bonus-claim');
    if (btn) {
        btn.disabled = (currentUser.lastBonus !== 0 && (now - currentUser.lastBonus) < dayMs);
        btn.innerText = btn.disabled ? "Claimed Today" : "Claim Reward";
    }
    window.openModal('modal-bonus');
};

window.claimDailyBonus = async () => {
    const currentUser = window.currentUser;
    const db = window.db;
    const doc = window.doc;
    const updateDoc = window.updateDoc;
    const increment = window.increment;

    if (!window.Adsgram) return window.showToast("Ad SDK not loaded!", "error");
    const AdController = window.Adsgram.init({ blockId: "19948" });
    AdController.show().then(async (res) => {
        if (res.done) {
            const reward = bonusRewards[currentUser.bonusDay || 0];
            const nextDay = ((currentUser.bonusDay || 0) + 1) % 7;
            const userRef = doc(db, "users", currentUser.id);
            await updateDoc(userRef, { usdt: increment(reward), lastBonus: Date.now(), bonusDay: nextDay });
            currentUser.usdt += reward; 
            currentUser.bonusDay = nextDay; 
            currentUser.lastBonus = Date.now();
            window.updateUI(); 
            window.closeModal('modal-bonus');
            if (window.tg?.HapticFeedback) window.tg.HapticFeedback.notificationOccurred('success');
            window.showToast("Reward added successfully!", "success");
        }
    }).catch(() => window.showToast("Ads not available right now.", "error"));
};
