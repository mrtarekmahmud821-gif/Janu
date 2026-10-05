// ==========================================
// File: refer.js
// Description: রেফারেল লিংক তৈরি, শেয়ার এবং লিডারবোর্ড ডিসপ্লে
// ==========================================

// --- রেফারেল লিংক কপি করা ---
window.copyLink = () => {
    const currentUser = window.currentUser;
    const link = `https://t.me/PPCoin_bot/app?startapp=r_${currentUser.id}`;
    navigator.clipboard.writeText(link);
    if (window.tg?.HapticFeedback) window.tg.HapticFeedback.impactOccurred('medium'); 
    window.showToast("Referral link copied!", "success");
};

// --- রেফারেল লিংক শেয়ার করা ---
window.shareLink = () => {
    const currentUser = window.currentUser;
    const link = `https://t.me/PPCoin_bot/app?startapp=r_${currentUser.id}`;
    const text = encodeURIComponent("🚀 Start Mining SHIB and earn Bonus! Join now:");
    if (window.tg?.openTelegramLink) {
        window.tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`);
    } else {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, '_blank');
    }
};

// --- লিডারবোর্ড ফেচ ও রেন্ডার ---
async function loadLeaderboard() {
    const db = window.db;
    const currentUser = window.currentUser;
    const query = window.query;
    const collection = window.collection;
    const orderBy = window.orderBy;
    const limit = window.limit;
    const getDocs = window.getDocs;

    if (!db) return;

    try {
        const q = query(collection(db, "users"), orderBy("referral_count", "desc"), limit(10));
        const snap = await getDocs(q);
        
        let html = '';
        let myRank = 0;
        const docs = snap.docs;

        for (let i = 0; i < docs.length; i++) {
            const userData = docs[i].data();
            const isMe = userData.id === currentUser.id;
            
            if (isMe) {
                myRank = i + 1;
            }

            if (i < 10) {
                let rankDisplay = `#${i + 1}`;
                if (i === 0) rankDisplay = "🥇";
                else if (i === 1) rankDisplay = "🥈";
                else if (i === 2) rankDisplay = "🥉";

                const refCount = userData.referral_count || userData.referrals || 0;
                const isVerified = refCount >= 30 || userData.isVerified;
                const verifiedIcon = isVerified ? `<svg class="w-4 h-4 fill-blue-500 inline-block ml-1" viewBox="0 0 24 24"><path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.7l-3.61.81.34 3.68L1 12l2.44 2.79-.34 3.69 3.61.82 1.89 3.2L12 21.04l3.4 1.46 1.89-3.2 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z"/></svg>` : '';

                const photoUrl = userData.photo || '';
                const photoHTML = photoUrl 
                    ? `<img src="${photoUrl}" class="w-8 h-8 rounded-full border border-blue-500/30 object-cover">`
                    : `<div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-blue-400 font-bold border border-blue-500/20">SHIB</div>`;

                const shibVal = userData.shib !== undefined ? userData.shib : (userData.pp || 0);

                html += `
                    <div class="flex justify-between items-center p-4 border-b border-white/5 ${isMe ? 'bg-blue-600/10' : ''}">
                        <div class="flex items-center gap-3 overflow-hidden">
                            <span class="text-sm font-black w-6 text-center">${rankDisplay}</span>
                            ${photoHTML}
                            <div class="flex flex-col">
                                <span class="text-xs font-bold flex items-center ${isMe ? 'text-blue-400' : 'text-white'}">
                                    ${userData.name}${verifiedIcon}
                                </span>
                                <span class="text-[10px] text-slate-400 font-bold tracking-tight">${Number(shibVal).toFixed(0)} SHIB</span>
                            </div>
                        </div>
                        
                        <div class="text-right flex flex-col items-end">
                            <span class="text-sm font-black text-green-400 uppercase tracking-tighter">${refCount} REFS</span>
                            <span class="text-[8px] text-slate-500 font-bold uppercase">Referrals</span>
                        </div>
                    </div>`;
            }
        }

        const leaderboardList = document.getElementById('leaderboard-list');
        if (leaderboardList) leaderboardList.innerHTML = html;

        const myRankContainer = document.getElementById('my-rank-container');
        if (myRankContainer) {
            myRankContainer.classList.remove('hidden');
            
            const rankNum = document.getElementById('my-rank-number');
            if (rankNum) rankNum.innerText = myRank > 0 ? `#${myRank}` : "100+";
            
            const rankPP = document.getElementById('my-rank-pp');
            if (rankPP) {
                const myRefs = currentUser.referral_count || currentUser.referrals || 0;
                const myShib = currentUser.shib !== undefined ? currentUser.shib : (currentUser.pp || 0);
                rankPP.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="text-right">
                            <p class="text-sm font-black text-green-400">${myRefs} REFS</p>
                            <p class="text-[10px] font-bold text-blue-400">${Number(myShib).toFixed(0)} SHIB</p>
                        </div>
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error("Leaderboard Error:", e);
    }
}
window.loadLeaderboard = loadLeaderboard;
