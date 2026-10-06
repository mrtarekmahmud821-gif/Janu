// =======================================================
// home.js - Mining Cards Engine + Claim Reward
// =======================================================

// মাইনিং কার্ড রেন্ডার ইঞ্জিন চালু করা
function startMiningCardEngine() {
    if (window.miningRenderInterval) clearInterval(window.miningRenderInterval);
    renderMiningCards();
    window.miningRenderInterval = setInterval(() => {
        renderMiningCards();
    }, 1000);
}
window.startMiningCardEngine = startMiningCardEngine;

// মাইনিং কার্ডগুলো স্ক্রিনে দেখানো
function renderMiningCards() {
    const container = document.getElementById('mining-cards-container');
    if (!container || !window.currentUser) return;

    const now = Date.now();
    let cards = window.currentUser.miningCards || [];
    const activeCards = cards.filter(card => now < card.expiresAt);

    // মেয়াদ শেষ হওয়া কার্ড পরিষ্কার + প্রিমিয়াম স্ট্যাটাস রাখা
    if (activeCards.length !== cards.length) {
        const hadBoughtMiner = cards.some(c => c.type !== 'free' && c.type !== 'referral');
        window.currentUser.miningCards = activeCards;

        let updateObj = { miningCards: activeCards };
        if (hadBoughtMiner) {
            window.currentUser.hasPremiumMiner = true;
            window.currentUser.isWithdrawUnlocked = true;
            updateObj.hasPremiumMiner = true;
            updateObj.isWithdrawUnlocked = true;
        }

        if (window.db && window.currentUser.id) {
            updateDoc(doc(window.db, "users", window.currentUser.id), updateObj).catch(e => console.error(e));
        }
    }

    if (activeCards.length === 0) {
        container.innerHTML = `
            <div class="glass p-6 rounded-2xl text-center border border-white/10">
                <p class="text-sm font-bold text-slate-300">NO ACTIVE MINING CARD!</p>
                <p class="text-[10px] text-slate-400 mt-1">Buy a new miner from the store</p>
                <button onclick="openGiftHub()" class="mt-3 bg-[#F7931A] px-4 py-2 rounded-xl text-xs font-bold text-white">UPGRADE</button>
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
                    Cooldown (\( {cdMin}: \){cdSec < 10 ? '0' : ''}${cdSec})
                </button>`;
        } else if (isCycleComplete) {
            btnStateHtml = `
                <button onclick="claimCardReward('${card.id}')" class="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 py-3 rounded-xl font-black text-xs uppercase text-white shadow-lg animate-pulse">
                    CLAIM ${card.rewardPerCycle} SHIB
                </button>`;
        } else {
            const remainingCycleSec = Math.ceil((cycleMs - elapsedCycleMs) / 1000);
            const cMin = Math.floor(remainingCycleSec / 60);
            const cSec = remainingCycleSec % 60;
            btnStateHtml = `
                <button disabled class="w-full bg-[#F7931A]/20 border border-[#F7931A]/40 text-[#F7931A] py-3 rounded-xl font-bold text-xs uppercase cursor-not-allowed flex items-center justify-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-[#F7931A] animate-ping"></span>
                    MINING (\( {cMin}: \){cSec < 10 ? '0' : ''}${cSec})
                </button>`;
        }

        html += `
        <div class="glass p-4 rounded-2xl border border-white/10 space-y-3">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-sm text-white">${card.title || 'Mining Card'}</h4>
                    <p class="text-[10px] text-[#F7931A]">${card.rewardPerCycle} SHIB / 15 min</p>
                </div>
                <span class="text-[9px] bg-white/5 px-2 py-1 rounded-full text-zinc-300">${hoursLeft}h ${minsLeft}m left</span>
            </div>
            
            <div class="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-[#F7931A] to-[#FFB347] transition-all duration-1000" style="width: ${cycleProgress * 100}%"></div>
            </div>
            
            <div class="flex justify-between text-[10px] text-zinc-400">
                <span>Mined: ${currentMinedCoins} SHIB</span>
                <span>Total: ${card.totalCoins || 0} SHIB</span>
            </div>
            
            ${btnStateHtml}
        </div>`;
    });

    container.innerHTML = html;
}
window.renderMiningCards = renderMiningCards;

// কার্ড থেকে রিওয়ার্ড ক্লেইম করা
async function claimCardReward(cardId) {
    if (!window.currentUser || !window.db) return;

    const cards = window.currentUser.miningCards || [];
    const cardIndex = cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = cards[cardIndex];
    const now = Date.now();
    const cycleMs = 15 * 60 * 1000;

    if (now - card.lastClaimTime < cycleMs) {
        window.showTopToast("Mining cycle not completed yet!", "error");
        return;
    }

    try {
        const reward = Number(card.rewardPerCycle) || 200;
        const userRef = doc(window.db, "users", window.currentUser.id);

        // কার্ড আপডেট
        cards[cardIndex].lastClaimTime = now;
        cards[cardIndex].cooldownUntil = now + (60 * 1000); // ১ মিনিট কুলডাউন

        await updateDoc(userRef, {
            pp: increment(reward),
            miningCards: cards
        });

        window.currentUser.pp = (Number(window.currentUser.pp) || 0) + reward;
        window.currentUser.miningCards = cards;

        if (typeof window.updateUI === 'function') window.updateUI();
        renderMiningCards();

        window.triggerHaptic('notification', 'success');
        window.showTopToast(`+${reward} SHIB claimed successfully!`, "success");

    } catch (e) {
        console.error("Claim Error:", e);
        window.showTopToast("Claim failed. Please try again.", "error");
    }
}
window.claimCardReward = claimCardReward;

// পুরনো মাইনিং চেক (যদি থাকে)
function checkExistingMining() {
    // বর্তমানে কার্ড সিস্টেম ব্যবহার করা হচ্ছে
    renderMiningCards();
}
window.checkExistingMining = checkExistingMining;

// মাইনার কিনা
async function buyUpgrade(minerType) {
    if (!window.currentUser || !window.db) return;

    const plans = {
        miner_1: { hours: 48, reward: 200, usdt: 0.12, title: 'Miner #1 (Starter)' },
        miner_2: { hours: 72, reward: 200, usdt: 0.15, title: 'Miner #2 (Pro)' },
        miner_3: { hours: 72, reward: 250, usdt: 0.20, title: 'Miner #3 (VIP Ultra)' }
    };

    const plan = plans[minerType];
    if (!plan) return;

    if (Number(window.currentUser.usdt || 0) < plan.usdt) {
        window.showTopToast("Insufficient USDT balance!", "error");
        return;
    }

    try {
        const userRef = doc(window.db, "users", window.currentUser.id);
        const newCard = window.createCardObject('premium', plan.hours, plan.reward, plan.usdt, plan.title);

        const existingCards = window.currentUser.miningCards || [];
        existingCards.push(newCard);

        await updateDoc(userRef, {
            usdt: increment(-plan.usdt),
            miningCards: existingCards,
            hasPremiumMiner: true,
            isWithdrawUnlocked: true
        });

        window.currentUser.usdt = (Number(window.currentUser.usdt) || 0) - plan.usdt;
        window.currentUser.miningCards = existingCards;
        window.currentUser.hasPremiumMiner = true;
        window.currentUser.isWithdrawUnlocked = true;

        if (typeof window.updateUI === 'function') window.updateUI();
        renderMiningCards();
        closeGiftHub();

        window.showTopToast(`${plan.title} activated successfully!`, "success");
        window.triggerHaptic('notification', 'success');

    } catch (e) {
        console.error("Buy Miner Error:", e);
        window.showTopToast("Purchase failed. Please try again.", "error");
    }
}
window.buyUpgrade = buyUpgrade;
