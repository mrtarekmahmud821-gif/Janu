// ==========================================
// File: withdraw.js
// Description: Binance UID এর মাধ্যমে SHIB উইথড্রয়াল প্রসেসিং
// ==========================================

window.selectedWithdrawAmount = 0;

// --- উইথড্র অ্যামাউন্ট নির্বাচন ---
window.selectWithdraw = (amt, btnElement) => {
    const currentUser = window.currentUser;
    const userSHIB = Number(currentUser.shib || currentUser.pp || 0);
    window.selectedWithdrawAmount = amt;
    const withdrawBtn = document.getElementById('btn-withdraw');

    if (!withdrawBtn) return;

    withdrawBtn.disabled = false;
    withdrawBtn.classList.remove('opacity-50', 'bg-slate-700', 'cursor-not-allowed');
    withdrawBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');

    if (userSHIB < amt) {
        window.showToast("⚠️ Insufficient balance in your account!", "error");
    }

    document.querySelectorAll('.w-btn').forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white', 'border-blue-500');
        b.classList.add('bg-white/5');
    });
    if (btnElement) {
        btnElement.classList.add('bg-blue-600', 'text-white', 'border-blue-500');
        btnElement.classList.remove('bg-white/5');
    }
};

// --- উইথড্র এক্সেকিউশন ---
window.executeWithdraw = async () => {
    const currentUser = window.currentUser;
    const db = window.db;
    const addDoc = window.addDoc;
    const collection = window.collection;
    const updateDoc = window.updateDoc;
    const doc = window.doc;
    const increment = window.increment;
    const serverTimestamp = window.serverTimestamp;

    if (!currentUser || !currentUser.id) {
        return window.showToast("User data loading... Please try again!", "error");
    }

    const uidInput = document.getElementById('withdraw-uid');
    const binanceUID = uidInput ? uidInput.value.trim() : '';
    const btn = document.getElementById('btn-withdraw');

    const selectedAmt = Number(window.selectedWithdrawAmount || 0);
    const userSHIB = Number(currentUser.shib || currentUser.pp || 0);

    if (selectedAmt === 0) {
        return window.showToast("Please select a withdrawal amount!", "error");
    }
    if (!binanceUID) {
        return window.showToast("Please enter your Binance Pay UID!", "error");
    }
    if (isNaN(userSHIB) || userSHIB < selectedAmt) {
        return window.showToast("⚠️ Insufficient balance to process withdrawal!", "error");
    }

    const refCount = Number(
        currentUser.referral_count || 
        currentUser.referrals || 
        currentUser.referralCount || 
        currentUser.total_ref || 0
    );
    const hasEnoughRefs = refCount >= 5;

    const hasPremiumMiner = Boolean(
        currentUser.hasPremiumMiner || 
        currentUser.hasBoughtMiner ||
        (Array.isArray(currentUser.miningCards) && currentUser.miningCards.some(card => 
            ['miner_1', 'miner_2', 'miner_3'].includes(card.type) || 
            (card.type && card.type.startsWith('miner_')) ||
            (card.type !== 'free' && card.type !== 'referral')
        ))
    );

    const isUnlocked = Boolean(
        currentUser.isWithdrawUnlocked || 
        currentUser.isVerified || 
        hasEnoughRefs || 
        hasPremiumMiner
    );

    if (!isUnlocked) {
        openWithdrawLockedModal(); 
        return;
    }

    const lastWithdrawTime = currentUser.lastWithdrawAt?.seconds 
        ? currentUser.lastWithdrawAt.seconds * 1000 
        : (typeof currentUser.lastWithdrawAt === 'number' ? currentUser.lastWithdrawAt : 0);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (lastWithdrawTime && (now - lastWithdrawTime) < oneDayMs) {
        const remainingHours = Math.ceil((oneDayMs - (now - lastWithdrawTime)) / (1000 * 60 * 60));
        return window.showToast(`⚠️ Daily limit reached. Please try again in ${remainingHours} hour(s).`, "error");
    }

    try {
        btn.disabled = true;
        const originalText = btn.innerText;
        btn.innerText = "Processing...";
        
        await addDoc(collection(db, "withdrawals"), {
            userId: currentUser.id,
            userName: currentUser.name || "Unknown",
            amount: selectedAmt,
            wallet: binanceUID,
            currency: "SHIB",
            method: "Binance",
            status: "pending",
            createdAt: serverTimestamp() 
        });

        let userUpdateData = { 
            shib: increment(-selectedAmt),
            lastWithdrawAt: serverTimestamp(),
            isWithdrawUnlocked: true
        };

        await updateDoc(doc(db, "users", currentUser.id), userUpdateData);
        
        currentUser.shib = userSHIB - selectedAmt; 
        currentUser.isWithdrawUnlocked = true;
        currentUser.lastWithdrawAt = { seconds: Math.floor(Date.now() / 1000) };
        window.currentUser = currentUser;
        
        window.updateUI(); 
        
        btn.disabled = false;
        btn.innerText = originalText || "WITHDRAW VIA BINANCE";
        window.selectedWithdrawAmount = 0;

        openWithdrawSuccessModal();
        if (typeof window.loadWithdrawHistory === 'function') window.loadWithdrawHistory(); 
    } catch (error) {
        window.showToast("Error: " + error.message, "error");
        if (btn) {
            btn.disabled = false;
            btn.innerText = "WITHDRAW VIA BINANCE";
        }
    }
};

function openWithdrawSuccessModal() {
    const modal = document.getElementById('modal-withdraw-success');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}
window.openWithdrawSuccessModal = openWithdrawSuccessModal;

window.closeWithdrawSuccessModal = () => {
    const modal = document.getElementById('modal-withdraw-success');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
};

function openWithdrawLockedModal() {
    const modal = document.getElementById('modal-withdraw-locked');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}
window.openWithdrawLockedModal = openWithdrawLockedModal;

window.closeWithdrawLockedModal = () => {
    const modal = document.getElementById('modal-withdraw-locked');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
};

window.redirectToReferPage = () => {
    window.closeWithdrawLockedModal();
    if (typeof window.switchTab === 'function') {
        window.switchTab('refer');
    }
};

window.openUpdateChannel = () => {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.openLink('https://t.me/ppcoinupdate');
    } else {
        window.open('https://t.me/ppcoinupdate', '_blank');
    }
};

window.loadWithdrawHistory = async () => {
    const historyList = document.getElementById('withdraw-history-list');
    const currentUser = window.currentUser;
    const db = window.db;

    if (!historyList || !currentUser || !db) return;

    try {
        const q = window.query(window.collection(db, "withdrawals"), window.where("userId", "==", currentUser.id));
        const snap = await window.getDocs(q);
        let historyData = [];
        snap.forEach(docSnap => {
            historyData.push({ id: docSnap.id, ...docSnap.data() });
        });
        
        historyData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        let html = '';
        if (historyData.length === 0) {
            historyList.innerHTML = '<p class="text-[10px] text-slate-600 italic px-1">No history found.</p>';
            return;
        }

        historyData.slice(0, 10).forEach(data => {
            const date = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : 'Pending...';
            let statusColor = "text-yellow-500"; 
            if(data.status === "successful") statusColor = "text-green-500";
            if(data.status === "rejected") statusColor = "text-red-500";

            html += `<div class="glass p-3 rounded-xl border border-white/5 mb-2"><div class="flex justify-between items-center mb-1"><span class="text-white font-bold text-[11px]">${data.amount} SHIB</span><span class="text-[9px] font-bold uppercase ${statusColor}">${data.status}</span></div><div class="flex justify-between items-center text-[9px] text-slate-400"><span class="truncate w-32">Binance ID: ${data.wallet}</span><span>${date}</span></div></div>`;
        });
        historyList.innerHTML = html;
    } catch (e) { 
        console.error("History Load Error:", e); 
    }
};
