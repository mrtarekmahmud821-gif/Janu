// ==========================================
// File: home.js
// Description: হোম পেজ, মাইনিং ইঞ্জিন এবং SHIB রিওয়ার্ড ক্লেম সিস্টেম
// ==========================================

// --- মাইনিং কার্ড অবজেক্ট জেনারেটর ---
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

let miningRenderInterval = null;

// --- মাইনিং কার্ড ইঞ্জিন ---
function startMiningCardEngine() {
    if (miningRenderInterval) clearInterval(miningRenderInterval);
    renderMiningCards();
    miningRenderInterval = setInterval(() => {
        renderMiningCards();
    }, 1000);
}
window.startMiningCardEngine = startMiningCardEngine;

function renderMiningCards() {
    const container = document.getElementById('mining-cards-container');
    if (!container) return;

    const currentUser = window.currentUser;
    const db = window.db;
    const doc = window.doc;
    const updateDoc = window.updateDoc;

    const now = Date.now();
    let cards = currentUser.miningCards || [];
    const activeCards = cards.filter(card => now < card.expiresAt);

    if (activeCards.length !== cards.length) {
        const hadBoughtMiner = cards.some(c => c.type !== 'free' && c.type !== 'referral');
        currentUser.miningCards = activeCards;
        let updateObj = { miningCards: activeCards };
        if (hadBoughtMiner) {
            currentUser.hasPremiumMiner = true;
            currentUser.isWithdrawUnlocked = true;
            updateObj.hasPremiumMiner = true;
            updateObj.isWithdrawUnlocked = true;
        }
        updateDoc(doc(db, "users", currentUser.id), updateObj);
    }

    if (activeCards.length === 0) {
        container.innerHTML = `
            <div class="glass p-6 rounded-2xl text-center border border-white/10">
                <p class="text-sm font-bold text-slate-300">NO ACTIVE MINING CARD!</p>
                <p class="text-[10px] text-slate-400 mt-1">Buy A New Miner From The Store</p>
                <button onclick="openGiftHub()" class="mt-3 bg-blue-600 px-4 py-2 rounded-xl text-xs font-bold text-white">UPGRADE</button>
            </div>`;
        return;
    }

    let html = '';
    const cycleMs = 15 * 60 * 1000;

    activeCards.forEach((card) => {
        const remainingLifetimeMs = Math.max(0, card.expiresAt - now);
        const hoursLeft = Math.floor(remainingLifetimeMs / (1000 * 60 * 60));
        const minsLeft = Math.floor((remainingLifetimeMs % (1000 * 60 * 60)) / (1000 * 60));

        const elapsedCycleMs = now - card.lastClaimTime;
        const cycleProgress = Math.min(1.0, elapsedCycleMs / cycleMs);
        const currentMinedCoins = Math.floor(cycleProgress * card.rewardPerCycle);
        
        const isCycleComplete = elapsedCycleMs >= cycleMs;
        const cooldownRemainingMs = card.cooldownUntil ? Math.max(0, card.cooldownUntil - now) : 0;
        const isCooldownActive = cooldownRemainingMs > 0;

        let btnStateHtml = '';
        if (isCooldownActive) {
            const cooldownSec = Math.ceil(cooldownRemainingMs / 1000);
            const cdMin = Math.floor(cooldownSec / 60);
            const cdSec = cooldownSec % 60;
            btnStateHtml = `
                <button disabled class="w-full bg-slate-800 text-slate-400 py-3 rounded-xl font-bold text-xs uppercase cursor-not-allowed">
                    🕒 Cooldown (${cdMin}:${cdSec < 10 ? '0' : ''}${cdSec})
                </button>`;
        } else if (isCycleComplete) {
            btnStateHtml = `
                <button onclick="claimCardReward('${card.id}')" class="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 py-3 rounded-xl font-black text-xs uppercase text-white shadow-lg shadow-emerald-600/30 animate-pulse">
                    CLAIM ${card.rewardPerCycle} SHIB
                </button>`;
        } else {
            const remainingCycleSec = Math.ceil((cycleMs - elapsedCycleMs) / 1000);
            const cMin = Math.floor(remainingCycleSec / 60);
            const cSec = remainingCycleSec % 60;
            btnStateHtml = `
                <button disabled class="w-full bg-blue-900/40 border border-blue-500/30 text-blue-300 py-3 rounded-xl font-bold text-xs uppercase cursor-not-allowed flex items-center justify-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                    MINING (${cMin}:${cSec < 10 ? '0' : ''}${cSec})
                </button>`;
        }

        html += `
            <div class="glass-card p-4 rounded-2xl border border-blue-500/30 relative overflow-hidden mb-4 shadow-xl">
                <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">⚡</span>
                        <div>
                            <h4 class="font-black text-xs text-white uppercase">${card.title}</h4>
                            <p class="text-[9px] text-blue-400 font-bold">${card.durationHours}H Card • Total: ${card.totalCoins.toLocaleString()} SHIB (~$${card.usdtValue} USDT)</p>
                        </div>
                    </div>
                    <span class="bg-blue-600/20 text-blue-400 text-[9px] font-black px-2.5 py-1 rounded-full border border-blue-500/30">
                        ⏳ ${hoursLeft}h ${minsLeft}m Left
                    </span>
                </div>

                <div class="my-3 bg-black/40 p-3 rounded-xl border border-white/5">
                    <div class="flex justify-between items-center text-[10px] font-bold mb-1">
                        <span class="text-slate-400 uppercase">15-Min Progress</span>
                        <span class="text-emerald-400">${currentMinedCoins} / ${card.rewardPerCycle} SHIB</span>
                    </div>
                    <div class="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div class="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500" style="width: ${cycleProgress * 100}%"></div>
                    </div>
                </div>

                ${btnStateHtml}
            </div>`;
    });

    container.innerHTML = html;
}

// --- কার্ড রিওয়ার্ড ক্লেম ---
window.claimCardReward = (cardId) => {
    const currentUser = window.currentUser;
    const db = window.db;
    const doc = window.doc;
    const updateDoc = window.updateDoc;
    const increment = window.increment;

    const card = (currentUser.miningCards || []).find(c => c.id === cardId);
    if (!card) return;

    if (!window.Adsgram) {
        window.showToast("Ad SDK not loaded. Try again!", "error");
        return;
    }

    const AdController = window.Adsgram.init({ blockId: "19955" });

    AdController.show().then(async (result) => {
        if (result.done) {
            try {
                const now = Date.now();
                const reward = card.rewardPerCycle;
                card.lastClaimTime = now;

                const cooldownDuration = 3 * 60 * 1000;
                currentUser.miningCards.forEach(c => {
                    if (c.id !== cardId) {
                        c.cooldownUntil = now + cooldownDuration;
                    }
                });

                const userRef = doc(db, "users", currentUser.id);
                await updateDoc(userRef, { 
                    shib: increment(reward),
                    miningCards: currentUser.miningCards
                });

                currentUser.shib = (currentUser.shib || 0) + reward;
                window.updateUI();
                renderMiningCards();

                if (window.tg?.HapticFeedback) window.tg.HapticFeedback.notificationOccurred('success');
                window.showToast(`🎉 Claimed ${reward} SHIB!`, "success");

            } catch (error) {
                console.error("Claim Error:", error);
                window.showToast("Database error!", "error");
            }
        } else {
            window.showToast("Watch the full ad to claim!", "error");
        }
    }).catch(() => {
        window.showToast("Ads not available right now.", "error");
    });
};

// --- ম্যানুয়াল মাইনিং রিওয়ার্ড ক্লেম ---
window.claimReward = () => {
    const currentUser = window.currentUser;
    const db = window.db;
    const doc = window.doc;
    const updateDoc = window.updateDoc;
    const increment = window.increment;

    const claimBtn = document.getElementById('btn-claim');
    if (!claimBtn) return;
    if (!window.Adsgram) {
        window.showToast("Ad SDK not loaded yet. Please try again!", "error");
        return;
    }

    claimBtn.disabled = true;
    claimBtn.innerText = "Ads Loading...";

    const AdController = window.Adsgram.init({ blockId: "19955" });
    AdController.show().then(async (result) => {
        if (result.done) {
            try {
                const rewardAmount = 200;
                const userRef = doc(db, "users", currentUser.id);
                await updateDoc(userRef, { 
                    shib: increment(rewardAmount), 
                    miningStartTime: 0 
                });

                currentUser.shib = (currentUser.shib || 0) + rewardAmount;
                currentUser.miningStartTime = 0;

                const startBtn = document.getElementById('btn-start');
                const counter = document.getElementById('local-counter');
                const statusText = document.getElementById('mining-status');

                if (claimBtn) claimBtn.classList.add('hidden');
                if (startBtn) startBtn.classList.remove('hidden');
                if (counter) counter.innerText = "0";
                if (statusText) statusText.innerText = "OFFLINE";

                window.updateUI();
                if (window.tg?.HapticFeedback) window.tg.HapticFeedback.notificationOccurred('success');
                window.showToast(`🎉 Success! You earned ${rewardAmount} SHIB.`, "success");

            } catch (error) {
                console.error("Reward Error:", error);
                window.showToast("Database error! Please try again.", "error");
            } finally {
                claimBtn.disabled = false;
                claimBtn.innerText = "CLAIM REWARDS";
            }
        } else {
            window.showToast("You must watch the full ad to claim rewards!", "error");
            claimBtn.disabled = false;
            claimBtn.innerText = "CLAIM REWARDS";
        }
    }).catch((err) => {
        console.error("Adsgram Error:", err);
        window.showToast("Ads not available right now.", "error");
        claimBtn.disabled = false;
        claimBtn.innerText = "CLAIM REWARDS";
    });
};
