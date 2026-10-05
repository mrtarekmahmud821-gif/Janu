// ==========================================
// File: task.js
// Description: টাস্ক পেজের সমস্ত অ্যাড টাস্ক এবং সোশ্যাল মিডিয়া টাস্ক
// ==========================================

// --- টাস্ক লোডার স্টাব ---
window.loadAvailableTasks = window.loadAvailableTasks || function() { console.log("Task list loaded."); };
window.loadMyTasksManagement = window.loadMyTasksManagement || function() { console.log("User task manager loaded."); };
window.loadAppInstallTasks = window.loadAppInstallTasks || function() { console.log("App installs loaded."); };

// --- অ্যাড ওয়াচ টাস্ক ---
window.watchTaskAd = async (type) => {
    if (type === 'richads') {
        if (typeof window.watchCustomAd === 'function') {
            window.watchCustomAd('richads');
        } else {
            window.showToast("Custom ad engine not loaded properly.", "error");
        }
        return;
    }

    let adShown = false;

    const withTimeout = (promise, ms = 3000) => {
        return Promise.race([
            promise,
            new Promise(resolve => setTimeout(() => resolve(false), ms))
        ]);
    };

    try {
        if (type === 'gigapub') {
            if (typeof window.showGiga === 'function') {
                adShown = await withTimeout(window.showGiga().then(() => true).catch(() => false));
            }
        }
        else if (type === 'monetag') {
            if (typeof show_10373507 === 'function') {
                adShown = await withTimeout(show_10373507().then(() => true).catch(() => false));
            }
        } 
        else if (type === 'adexora') {
            if (typeof window.showAdexora === 'function') {
                adShown = await withTimeout(window.showAdexora().then(() => true).catch(() => false));
            }
        } 
        else if (type === 'adexium') {
            if (typeof AdexiumWidget !== 'undefined') {
                adShown = await withTimeout(new Promise((resolve) => {
                    try {
                        const widget = new AdexiumWidget({ 
                            wid: '994b631c-6659-4975-a09b-9bb3b4eb0290', 
                            adFormat: 'interstitial' 
                        });
                        widget.show();
                        resolve(true);
                    } catch (e) {
                        resolve(false);
                    }
                }));
            }
        }
        else if (type === 'tads') {
            if (window.tads && typeof window.tads.init === 'function') {
                adShown = await withTimeout(new Promise((resolve) => {
                    try {
                        const adController = window.tads.init({
                            widgetId: "9404",
                            type: 'fullscreen',
                            debug: false,
                            onShowReward: () => resolve(true),
                            onAdsNotFound: () => resolve(false)
                        });

                        if (adController && typeof adController.then === 'function') {
                            adController.then(ctrl => {
                                if (ctrl && typeof ctrl.showAd === 'function') {
                                    ctrl.showAd();
                                } else {
                                    resolve(false);
                                }
                            }).catch(() => resolve(false));
                        } else {
                            resolve(false);
                        }
                    } catch (err) {
                        resolve(false);
                    }
                }));
            }
        }
    } catch (e) {
        console.warn(`${type} ad error:`, e);
        adShown = false;
    }

    if (!adShown && type !== 'richads') {
        window.showToast("Primary ad not available. Showing fallback ad...", "info");
        if (typeof window.Adsgram !== 'undefined') {
            try {
                const fallbackAd = window.Adsgram.init({ blockId: "int-40246" });
                fallbackAd.show().then(() => {
                    processTask(50, type);
                }).catch(() => {
                    window.showToast("No ads available right now.", "error");
                });
            } catch (err) {
                window.showToast("No ads available right now.", "error");
            }
        } else {
            window.showToast("Fallback ad provider not ready.", "error");
        }
    } else if (adShown) {
        processTask(50, type);
    }
};

// --- টাস্ক রিওয়ার্ড প্রসেসর (SHIB) ---
async function processTask(shibAmount, adType) {
    const now = Date.now();
    const currentUser = window.currentUser;
    const db = window.db;
    const doc = window.doc;
    const updateDoc = window.updateDoc;
    const increment = window.increment;
    
    if (!currentUser || !currentUser.id) {
        window.showToast("User session error. Please reopen the app.", "error");
        return;
    }

    const userRef = doc(db, "users", currentUser.id);
    const updateData = { 
        shib: increment(shibAmount),
        [`lastAdTime_${adType}`]: now 
    };

    try {
        await updateDoc(userRef, updateData);
        currentUser.shib = (currentUser.shib || 0) + shibAmount;
        currentUser[`lastAdTime_${adType}`] = now;

        window.updateUI(); 
        window.showToast(`🎉 Success! You earned ${shibAmount} SHIB!`, "success");
        
    } catch (error) {
        console.error("Reward Error:", error);
        window.showToast("Failed to add reward. Please try again.", "error");
    }
}
window.processTask = processTask;

// --- টেলিগ্রাম সোশ্যাল টাস্ক সাবমিশন ---
window.submitAdTask = async () => {
    const nameInput = document.getElementById('ad-name');
    const linkInput = document.getElementById('ad-link');
    const targetSelect = document.getElementById('ad-target');

    if (!nameInput || !linkInput || !targetSelect) return;

    const currentUser = window.currentUser;
    const db = window.db;
    const addDoc = window.addDoc;
    const collection = window.collection;
    const updateDoc = window.updateDoc;
    const doc = window.doc;
    const increment = window.increment;
    const serverTimestamp = window.serverTimestamp;

    const channelName = nameInput.value.trim();
    const channelLink = linkInput.value.trim();
    const target = parseInt(targetSelect.value);
    
    const costs = { 100: 1.00, 500: 4.50, 1000: 8.00 };
    const totalCost = costs[target];

    if (!channelName || !channelLink) return window.showToast("Please fill all fields!", "error");
    if (!totalCost) return window.showToast("Please select a valid package!", "error");

    if (currentUser.usdt < totalCost) {
        window.showToast(`Insufficient USDT balance! Need ${totalCost} USDT.`, "error");
        window.switchTab('profile');
        window.closeModal('modal-adtask');
        return;
    }

    const btn = document.querySelector('[onclick="submitAdTask()"]');
    try {
        if(btn) {
            btn.disabled = true;
            btn.innerText = "Processing...";
        }

        await addDoc(collection(db, "tasks"), {
            channelName: channelName,
            channelLink: channelLink,
            targetUsers: target,
            currentJoined: 0,
            reward: 100,             
            taskType: "user",        
            createdBy: currentUser.id,
            active: false,           
            approved: false,         
            chatId: "",              
            completedBy: [],
            createdAt: serverTimestamp()
        });

        await updateDoc(doc(db, "users", currentUser.id), { 
            usdt: increment(-totalCost) 
        });
        
        currentUser.usdt -= totalCost;
        window.updateUI();

        window.showToast(`Mission submitted! Cost: ${totalCost} USDT. Waiting for approval.`, "success");
        
        nameInput.value = "";
        linkInput.value = "";
        window.closeModal('modal-adtask');

    } catch (e) {
        console.error("Submission Error:", e);
        window.showToast("Error creating task. Try again.", "error");
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerText = "Pay & Submit Task";
        }
    }
};
