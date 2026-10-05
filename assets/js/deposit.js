// ==========================================
// File: deposit.js
// Description: Cloudinary ও Binance UID ব্যবহারের মাধ্যমে ডিপোজিট প্রসেসিং
// ==========================================

import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- Cloudinary কনফিগারেশন ---
const CLOUD_NAME = "dnlvrtnga";
const UPLOAD_PRESET = "pp_mining_preset";

// --- ডিপোজিট Binance UID ---
const DEPOSIT_BINANCE_UID = "929789732";

// --- Binance UID কপি করার ফাংশন ---
window.copyBinanceUID = () => {
    navigator.clipboard.writeText(DEPOSIT_BINANCE_UID);
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
    if (typeof window.showToast === 'function') {
        window.showToast(`Binance UID (${DEPOSIT_BINANCE_UID}) copied to clipboard!`, "info");
    } else {
        alert(`Binance UID (${DEPOSIT_BINANCE_UID}) copied to clipboard!`);
    }
};

window.copyWallet = window.copyBinanceUID;

// --- ডিপোজিট সাবমিট ---
window.submitDeposit = async () => {
    const currentUser = window.currentUser;
    const db = window.db;

    const amountInput = document.getElementById('dep-amount');
    const screenshotInput = document.getElementById('dep-screenshot');
    const btn = document.querySelector('[onclick="submitDeposit()"]');

    if (!amountInput || !screenshotInput) return;

    const amount = amountInput.value;
    const file = screenshotInput.files[0];

    if (!amount || amount <= 0) {
        return typeof window.showToast === 'function' ? window.showToast("Enter a valid amount!", "error") : alert("Enter a valid amount!");
    }
    if (!file) {
        return typeof window.showToast === 'function' ? window.showToast("Please upload a payment screenshot!", "error") : alert("Please upload a payment screenshot!");
    }
    if (!currentUser || !currentUser.id) {
        return typeof window.showToast === 'function' ? window.showToast("User session error! Please reopen the app.", "error") : alert("User session error! Please reopen the app.");
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Uploading Proof...";
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        const cloudData = await cloudRes.json();

        if (cloudData.secure_url) {
            await addDoc(collection(db, "deposits"), {
                userId: currentUser.id,
                userName: currentUser.name || "Unknown",
                amount: parseFloat(amount),
                method: "Binance UID",
                depositUID: DEPOSIT_BINANCE_UID,
                screenshotUrl: cloudData.secure_url, 
                status: "pending",
                createdAt: serverTimestamp(),
                time: Date.now()
            });

            if (typeof window.showToast === 'function') {
                window.showToast("Deposit submitted! Admin will verify the screenshot.", "success");
            } else {
                alert("Deposit submitted! Admin will verify the screenshot.");
            }

            amountInput.value = "";
            screenshotInput.value = "";
            
            if (typeof window.closeModal === 'function') {
                window.closeModal('modal-deposit');
            }
        } else {
            throw new Error("Cloudinary Upload Failed");
        }
    } catch (e) {
        console.error("Deposit Error:", e);
        if (typeof window.showToast === 'function') {
            window.showToast("Submission failed! Try again.", "error");
        } else {
            alert("Submission failed! Try again.");
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "Submit Deposit";
        }
    }
};
