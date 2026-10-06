// =======================================================
// task.js - Ad Tasks + Telegram Missions
// =======================================================

// অ্যাড কুলডাউন চেক
function checkSpecificAdCooldown(type) {
    // প্রয়োজন অনুযায়ী বাটন ডিজেবল/এনেবল করা যায়
}
window.checkSpecificAdCooldown = checkSpecificAdCooldown;

// বিভিন্ন অ্যাড নেটওয়ার্ক থেকে অ্যাড দেখানো
async function watchTaskAd(network) {
    if (!window.currentUser) return;

    window.showTopToast(`Loading ${network} ad...`, "success");

    try {
        if (network === 'monetag' && typeof show_10373507 === 'function') {
            show_10373507().then(() => {
                giveAdReward(50, 'monetag');
            }).catch(() => {
                window.showTopToast("Ad not available right now.", "error");
            });
        } 
        else if (network === 'adexium' && window.adexiumAds) {
            // Adexium handling
            window.showTopToast("Adexium ad requested.", "success");
            giveAdReward(50, 'adexium');
        }
        else if (network === 'gigapub') {
            window.showTopToast("GigaPub ad requested.", "success");
            giveAdReward(50, 'gigapub');
        }
        else if (network === 'tads') {
            window.showTopToast("Tads ad requested.", "success");
            giveAdReward(50, 'tads');
        }
        else if (window.Adsgram) {
            const controller = window.Adsgram.init({ blockId: "int-44160" });
            controller.show().then(() => {
                giveAdReward(50, 'adsgram');
            }).catch(() => {
                window.showTopToast("Ad failed to load.", "error");
            });
        } else {
            window.showTopToast("Ad network not ready.", "error");
        }
    } catch (e) {
        console.error("Ad Error:", e);
        window.showTopToast("Failed to show ad.", "error");
    }
}
window.watchTaskAd = watchTaskAd;

// অ্যাড দেখার পর রিওয়ার্ড দেওয়া
async function giveAdReward(amount, network) {
    if (!window.currentUser || !window.db) return;

    try {
        const userRef = doc(window.db, "users", window.currentUser.id);
        await updateDoc(userRef, {
            pp: increment(amount),
            [`lastAdTime_${network}`]: Date.now()
        });

        window.currentUser.pp = (Number(window.currentUser.pp) || 0) + amount;
        if (typeof window.updateUI === 'function') window.updateUI();

        window.triggerHaptic('notification', 'success');
        window.showTopToast(`+${amount} SHIB received from ${network}!`, "success");
    } catch (e) {
        console.error("Reward Error:", e);
    }
}
window.giveAdReward = giveAdReward;

// টেলিগ্রাম মিশন লোড করা
export async function loadAvailableTasks() {
    const taskList = document.getElementById('available-tasks-list');
    if (!taskList) return;

    const currentUserId = window.getCleanCurrentUserId();
    if (!currentUserId) {
        setTimeout(loadAvailableTasks, 800);
        return;
    }

    try {
        const q = query(
            collection(window.db, "tasks"), 
            where("approved", "==", true), 
            where("active", "==", true)
        );

        onSnapshot(q, (snap) => {
            let html = '';
            if (snap.empty) {
                taskList.innerHTML = `
                <div class="glass p-4 rounded-xl text-center">
                    <p class="text-[10px] text-slate-500 italic">No telegram missions available right now.</p>
                </div>`;
                return;
            }

            snap.forEach(docSnap => {
                const task = docSnap.data();
                const taskId = docSnap.id;
                
                const completedByArray = Array.isArray(task.completedBy) ? task.completedBy : [];
                const alreadyDone = completedByArray.includes(currentUserId);

                if (!alreadyDone && (Number(task.currentJoined) < Number(task.targetUsers))) {
                    html += `
                    <div id="task-card-${taskId}" class="glass p-4 rounded-xl flex justify-between items-center border border-white/5 mb-2">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-[#F7931A]/10 rounded-full flex items-center justify-center text-[#F7931A] font-bold text-[10px]">TG</div>
                            <div>
                                <p class="text-sm font-bold truncate w-32">${task.channelName}</p>
                                <p class="text-[10px] text-emerald-400 font-bold">+${task.reward || 100} SHIB</p>
                            </div>
                        </div>
                        <button id="task-btn-${taskId}" 
                                data-status="join"
                                onclick="handleTelegramTask('\( {task.channelLink}', ' \){taskId}', '${task.chatId}')" 
                                class="bg-[#F7931A] px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all">Join</button>
                    </div>`;
                }
            });
            
            taskList.innerHTML = html || `
            <div class="glass p-4 rounded-xl text-center">
                <p class="text-[10px] text-slate-500 italic">All missions completed!</p>
            </div>`;
        });
    } catch (e) {
        console.error("Load Available Tasks Error:", e);
        taskList.innerHTML = '<p class="text-xs text-red-500 text-center">Missions loading error...</p>';
    }
}
window.loadAvailableTasks = loadAvailableTasks;

// টেলিগ্রাম জয়েন + ভেরিফাই হ্যান্ডলার
window.handleTelegramTask = function(usernameOrLink, taskId, chatId) {
    const btn = document.getElementById(`task-btn-${taskId}`);
    const currentUserId = window.getCleanCurrentUserId();
    
    if (!btn || !currentUserId || window.isProcessing || btn.disabled) return; 

    let cleanUsername = usernameOrLink.trim();
    if (cleanUsername.includes("t.me/")) {
        const parts = cleanUsername.split("t.me/");
        if (parts[1]) {
            cleanUsername = parts[1].split('?')[0].split('/')[0];
        }
    }
    cleanUsername = cleanUsername.replace("@", "").replace(/\/$/, "").trim(); 

    const telegramWebLink = `https://t.me/${cleanUsername}`;
    const currentStatus = btn.getAttribute("data-status") || "join";

    // Join মোড
    if (currentStatus === "join") {
        window.lastClickedTaskId = taskId; 
        window.triggerHaptic('impact', 'medium');

        btn.setAttribute("data-status", "verify");
        btn.innerText = "Verify";
        btn.classList.replace('bg-[#F7931A]', 'bg-yellow-600');

        if (window.tg) {
            if (typeof window.tg.openTelegramLink === 'function') {
                window.tg.openTelegramLink(telegramWebLink);
            } else if (typeof window.tg.openLink === 'function') {
                window.tg.openLink(telegramWebLink);
            } else {
                window.open(telegramWebLink, '_blank');
            }
        } else {
            window.open(telegramWebLink, '_blank');
        }
        return;
    }

    // Verify মোড
    if (currentStatus === "verify") {
        let targetVerifyId = chatId ? String(chatId).trim() : "";
        if (!targetVerifyId || targetVerifyId === "undefined" || targetVerifyId === "null") {
            targetVerifyId = `@${cleanUsername}`;
        }

        window.isProcessing = true;
        btn.disabled = true;
        btn.innerText = "Checking...";

        fetch('/.netlify/functions/check-membership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                chatId: targetVerifyId
            })
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP Error! Status: ${res.status}`);
            return res.json();
        })
        .then(async (data) => {
            if (data && data.joined === true) {
                try {
                    const userRef = doc(window.db, "users", currentUserId);
                    const taskRef = doc(window.db, "tasks", taskId);

                    await runTransaction(window.db, async (transaction) => {
                        const userSnap = await transaction.get(userRef);
                        if (!userSnap.exists()) throw new Error("User not found!");

                        const taskSnap = await transaction.get(taskRef);
                        if (!taskSnap.exists()) throw new Error("Task not found!");

                        const taskData = taskSnap.data();
                        const completedBy = Array.isArray(taskData.completedBy) ? taskData.completedBy : [];
                        
                        if (completedBy.includes(currentUserId)) {
                            throw new Error("You already completed this mission!");
                        }

                        if (Number(taskData.currentJoined) >= Number(taskData.targetUsers)) {
                            throw new Error("Mission quota full!");
                        }

                        let rewardAmt = Number(taskData.reward) || 100;

                        transaction.update(userRef, { pp: increment(rewardAmt) });
                        transaction.update(taskRef, {
                            currentJoined: increment(1),
                            completedBy: arrayUnion(currentUserId)
                        });

                        window.currentUser.pp = (Number(window.currentUser.pp) || 0) + rewardAmt;
                    });

                    if (typeof window.updateUI === 'function') window.updateUI();
                    window.triggerHaptic('notification', 'success');
                    window.showTopToast("Mission completed! Reward added.", "success");
                    
                    const card = document.getElementById(`task-card-${taskId}`);
                    if (card) card.remove();
                    window.lastClickedTaskId = null;

                } catch (dbError) {
                    console.error("Transaction Error:", dbError);
                    window.showTopToast(dbError.message || "Reward failed", "error");
                    btn.disabled = false;
                    btn.innerText = "Verify";
                    btn.setAttribute("data-status", "verify");
                }
            } else {
                window.triggerHaptic('notification', 'error');
                window.showTopToast("You have not joined the channel/group yet.", "error");
                btn.disabled = false;
                btn.setAttribute("data-status", "join");
                btn.innerText = "Join";
                btn.classList.replace('bg-yellow-600', 'bg-[#F7931A]');
            }
        })
        .catch(err => {
            console.error("API Error:", err);
            window.showTopToast("Connection error. Try again.", "error");
            btn.disabled = false;
            btn.setAttribute("data-status", "join");
            btn.innerText = "Join";
            btn.classList.replace('bg-yellow-600', 'bg-[#F7931A]');
        })
        .finally(() => {
            window.isProcessing = false;
        });
    }
};

// ইউজারের নিজের তৈরি টাস্ক লোড
export async function loadMyTasksManagement() {
    const taskContainer = document.getElementById('my-tasks-list');
    if (!taskContainer) return;

    const currentUserId = window.getCleanCurrentUserId();
    if (!currentUserId) {
        setTimeout(loadMyTasksManagement, 1000); 
        return;
    }

    try {
        const q = query(
            collection(window.db, "tasks"), 
            where("createdBy", "==", currentUserId)
        );

        onSnapshot(q, (snap) => {
            let html = '';
            if (snap.empty) {
                taskContainer.innerHTML = '<p class="text-[10px] text-slate-500 italic py-2 text-center">You haven\'t created any missions yet.</p>';
                return;
            }

            snap.forEach(docSnap => {
                const task = docSnap.data();
                
                let statusBadge = task.approved 
                    ? '<span class="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Live</span>' 
                    : (task.status === "rejected" 
                        ? '<span class="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded">Rejected</span>' 
                        : '<span class="text-[9px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Pending</span>');
                
                const progress = Math.min((task.currentJoined / task.targetUsers) * 100, 100);

                html += `
                <div class="glass p-3 rounded-xl border border-white/5 mb-2">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <p class="text-xs font-bold truncate w-32 text-[#F7931A]">${task.channelName}</p>
                            <div class="mt-1">${statusBadge}</div>
                        </div>
                        <div class="text-right">
                            <p class="text-[11px] font-black text-white">${task.currentJoined} / ${task.targetUsers}</p>
                            <p class="text-[8px] text-slate-500 uppercase">Joined</p>
                        </div>
                    </div>
                    <div class="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div class="bg-[#F7931A] h-full transition-all duration-500" style="width: ${progress}%"></div>
                    </div>
                </div>`;
            });
            taskContainer.innerHTML = html;
        });
    } catch (e) {
        console.error("Load My Task Error:", e);
    }
}
window.loadMyTasksManagement = loadMyTasksManagement;

// অ্যাড টাস্ক সাবমিট
async function submitAdTask() {
    window.showTopToast("Task submission feature coming soon.", "success");
}
window.submitAdTask = submitAdTask;
