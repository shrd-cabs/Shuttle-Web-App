// ===============================================================
// wallet.js
// ---------------------------------------------------------------
// Handles all wallet related UI and API integration
//
// FUNCTIONS:
// ---------------------------------------------------------------
// 1. waitForElement(id, callback)
// 2. safeFetch(url)
// 3. formatAmount(amount)
// 4. formatWalletDate(dateValue)
// 5. syncWalletForUser(user)
// 6. syncWalletFromStorage()
// 7. hideWalletUI()
// 8. fetchWalletBalance(email)
// 9. fetchWalletTransactions(email, limit)
// 10. refreshWalletData()
// 11. openWalletPopup()
// 12. closeWalletPopup()
// 13. setWalletAmount(amount)
// 14. handleAddMoney()
// 15. renderWalletTransactions(transactions)
//
// NOTES:
// ---------------------------------------------------------------
// ✅ Live API integrated
// ✅ Razorpay wallet top-up integrated
// ✅ Uses APP_CONFIG.RAZORPAY_KEY_ID
// ✅ Safe for dynamically loaded header
// ✅ Inline onclick support through window binding
// ✅ Includes comments + console logs
// ===============================================================

import { APP_CONFIG } from "./config.js";


// ===============================================================
// HELPER: WAIT FOR ELEMENT
// ---------------------------------------------------------------
// Since header loads dynamically, this waits until target exists
// ===============================================================
function waitForElement(id, callback) {
  console.log(`⏳ waitForElement() called for #${id}`);

  const el = document.getElementById(id);

  if (el) {
    console.log(`✅ Element found instantly: #${id}`);
    callback(el);
    return;
  }

  console.warn(`⚠️ Element not found yet: #${id}. Waiting...`);

  const observer = new MutationObserver(() => {
    const dynamicEl = document.getElementById(id);

    if (dynamicEl) {
      console.log(`✅ Element appeared later: #${id}`);
      observer.disconnect();
      callback(dynamicEl);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}


// ===============================================================
// HELPER: SAFE FETCH
// ---------------------------------------------------------------
// Prevents silent API failures and shows raw response in console
// ===============================================================
async function safeFetch(url) {
  console.log("🌐 safeFetch() URL:", url);

  try {
    const res = await fetch(url);
    const text = await res.text();

    console.log("📡 RAW API Response:", text);

    try {
      const json = JSON.parse(text);
      console.log("✅ Parsed JSON Response:", json);
      return json;
    } catch (err) {
      console.error("❌ JSON Parse Error:", err);
      throw new Error("Invalid JSON response from server");
    }

  } catch (error) {
    console.error("❌ Fetch Error:", error);
    throw error;
  }
}


// ===============================================================
// HELPER: FORMAT AMOUNT
// ===============================================================
function formatAmount(amount) {
  const numericAmount = Number(amount || 0);
  return `₹${numericAmount}`;
}


// ===============================================================
// HELPER: FORMAT DATE
// ---------------------------------------------------------------
// Converts backend date into readable format
// ===============================================================
function formatWalletDate(dateValue) {
  console.log("📅 formatWalletDate() input:", dateValue);

  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    console.warn("⚠️ Invalid date format received:", dateValue);
    return String(dateValue);
  }

  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}


// ===============================================================
// SYNC WALLET FOR A GIVEN USER
// ---------------------------------------------------------------
// Updates top-right wallet chip using provided user object
// ===============================================================
export function syncWalletForUser(user) {
  console.log("💰 syncWalletForUser() called with user:", user);

  if (!user) {
    console.warn("⚠️ No user passed to syncWalletForUser()");
    return;
  }

  const balance = Number(user.wallet_balance || 0);
  console.log("💵 Parsed wallet balance:", balance);

  waitForElement("walletAmount", (walletAmountEl) => {
    walletAmountEl.textContent = formatAmount(balance);
    console.log("✅ walletAmount updated:", walletAmountEl.textContent);

    const walletBox = document.getElementById("walletBox");
    if (walletBox) {
      walletBox.style.display = "flex";
      console.log("✅ walletBox shown");
    } else {
      console.warn("⚠️ walletBox not found");
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.style.display = "block";
      console.log("✅ logoutBtn shown");
    } else {
      console.warn("⚠️ logoutBtn not found");
    }
  });
}


// ===============================================================
// SYNC WALLET FROM LOCAL STORAGE
// ---------------------------------------------------------------
// Useful as fallback after component loads
// ===============================================================
export function syncWalletFromStorage() {
  console.log("🔄 syncWalletFromStorage() called");

  const savedUser = localStorage.getItem("currentUser");

  if (!savedUser) {
    console.log("ℹ️ No currentUser in localStorage");
    return;
  }

  try {
    const user = JSON.parse(savedUser);
    console.log("✅ Parsed user from storage:", user);

    syncWalletForUser(user);

  } catch (error) {
    console.error("❌ syncWalletFromStorage() failed:", error);
  }
}


// ===============================================================
// HIDE WALLET UI
// ---------------------------------------------------------------
// Used on logout
// ===============================================================
export function hideWalletUI() {
  console.log("🙈 hideWalletUI() called");

  const walletBox = document.getElementById("walletBox");
  const walletAmount = document.getElementById("walletAmount");
  const walletPopupBalance = document.getElementById("walletPopupBalance");
  const logoutBtn = document.getElementById("logoutBtn");

  if (walletBox) {
    walletBox.style.display = "none";
    console.log("✅ walletBox hidden");
  }

  if (walletAmount) {
    walletAmount.textContent = "₹0";
    console.log("✅ walletAmount reset");
  }

  if (walletPopupBalance) {
    walletPopupBalance.textContent = "₹0";
    console.log("✅ walletPopupBalance reset");
  }

  if (logoutBtn) {
    logoutBtn.style.display = "none";
    console.log("✅ logoutBtn hidden");
  }

  closeWalletPopup();
}


// ===============================================================
// FETCH WALLET BALANCE FROM API
// ===============================================================
async function fetchWalletBalance(email) {
  console.log("📡 fetchWalletBalance() called for:", email);

  const url =
    `${APP_CONFIG.API_URL}?action=getWalletBalance` +
    `&email=${encodeURIComponent(email)}`;

  console.log("🌐 Wallet balance URL:", url);

  const result = await safeFetch(url);

  console.log("📥 Wallet balance API response:", result);

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch wallet balance");
  }

  return Number(result.wallet_balance || 0);
}


// ===============================================================
// FETCH WALLET TRANSACTIONS FROM API
// ===============================================================
async function fetchWalletTransactions(email, limit = 10) {
  console.log("📡 fetchWalletTransactions() called for:", email, "limit:", limit);

  const url =
    `${APP_CONFIG.API_URL}?action=getWalletTransactions` +
    `&email=${encodeURIComponent(email)}` +
    `&limit=${encodeURIComponent(limit)}`;

  console.log("🌐 Wallet transactions URL:", url);

  const result = await safeFetch(url);

  console.log("📥 Wallet transactions API response:", result);

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch wallet transactions");
  }

  return result.transactions || [];
}


// ===============================================================
// REFRESH WALLET DATA
// ---------------------------------------------------------------
// Refreshes:
// 1. live wallet balance
// 2. localStorage currentUser
// 3. top wallet chip
// 4. popup balance
// 5. transaction list
// ===============================================================
async function refreshWalletData() {
  console.log("🔄 refreshWalletData() called");

  const savedUser = localStorage.getItem("currentUser");

  if (!savedUser) {
    console.warn("⚠️ No currentUser found in localStorage during refresh");
    return;
  }

  const user = JSON.parse(savedUser);
  const email = String(user.email || "").trim().toLowerCase();

  if (!email) {
    console.warn("⚠️ User email missing during refreshWalletData()");
    return;
  }

  console.log("👤 Refreshing wallet for:", email);

  // ===========================================================
  // Fetch latest balance
  // ===========================================================
  const latestBalance = await fetchWalletBalance(email);
  console.log("✅ Latest wallet balance fetched:", latestBalance);

  user.wallet_balance = latestBalance;
  localStorage.setItem("currentUser", JSON.stringify(user));
  console.log("✅ localStorage currentUser updated with latest balance");

  // ===========================================================
  // Update header wallet UI
  // ===========================================================
  syncWalletForUser(user);

  // ===========================================================
  // Update popup balance
  // ===========================================================
  const walletPopupBalance = document.getElementById("walletPopupBalance");
  if (walletPopupBalance) {
    walletPopupBalance.textContent = formatAmount(latestBalance);
    console.log("✅ walletPopupBalance updated");
  }

  // ===========================================================
  // Fetch latest transactions
  // ===========================================================
  const transactions = await fetchWalletTransactions(email, 10);
  console.log("✅ Latest wallet transactions fetched:", transactions);

  renderWalletTransactions(transactions);

  console.log("🎉 Wallet data refresh completed");
}


// ===============================================================
// OPEN WALLET POPUP
// ---------------------------------------------------------------
// Opens modal and loads live balance + live transactions
// ===============================================================
async function openWalletPopup() {
  console.log("💳 openWalletPopup() called");

  const overlay = document.getElementById("walletModalOverlay");
  const walletPopupBalance = document.getElementById("walletPopupBalance");
  const transactionsContainer = document.getElementById("walletTransactionsList");

  if (!overlay) {
    console.error("❌ walletModalOverlay not found");
    return;
  }

  overlay.style.display = "flex";
  console.log("✅ Wallet popup opened");

  if (walletPopupBalance) {
    walletPopupBalance.textContent = "Loading...";
  }

  if (transactionsContainer) {
    transactionsContainer.innerHTML = `
      <div class="wallet-empty-state">Loading transactions...</div>
    `;
  }

  const savedUser = localStorage.getItem("currentUser");

  if (!savedUser) {
    console.warn("⚠️ No currentUser found in storage while opening wallet");

    if (walletPopupBalance) {
      walletPopupBalance.textContent = "₹0";
    }

    if (transactionsContainer) {
      transactionsContainer.innerHTML = `
        <div class="wallet-empty-state">Please login again</div>
      `;
    }

    return;
  }

  try {
    await refreshWalletData();
  } catch (error) {
    console.error("❌ openWalletPopup() failed:", error);

    if (walletPopupBalance) {
      walletPopupBalance.textContent = "Error";
    }

    if (transactionsContainer) {
      transactionsContainer.innerHTML = `
        <div class="wallet-empty-state">Failed to load wallet data</div>
      `;
    }

    alert("Unable to load wallet details");
  }
}


// ===============================================================
// CLOSE WALLET POPUP
// ===============================================================
function closeWalletPopup() {
  console.log("❌ closeWalletPopup() called");

  const overlay = document.getElementById("walletModalOverlay");

  if (!overlay) {
    console.warn("⚠️ walletModalOverlay not found while closing");
    return;
  }

  overlay.style.display = "none";
  console.log("✅ Wallet popup closed");
}


// ===============================================================
// SET QUICK AMOUNT
// ===============================================================
function setWalletAmount(amount) {
  console.log("💵 setWalletAmount() called with:", amount);

  const input = document.getElementById("walletAddAmount");

  if (!input) {
    console.error("❌ walletAddAmount input not found");
    return;
  }

  input.value = amount;
  console.log("✅ walletAddAmount set to:", input.value);
}


// ===============================================================
// HANDLE ADD MONEY
// ---------------------------------------------------------------
// Razorpay wallet top-up flow
//
// FLOW:
// 1. Read entered amount
// 2. Create wallet Razorpay order from backend
// 3. Open Razorpay
// 4. On payment success -> add wallet transaction
// 5. Refresh wallet balance + transaction history
// ===============================================================
async function handleAddMoney() {
  console.log("🚀 handleAddMoney() called");

  const input = document.getElementById("walletAddAmount");
  const addMoneyBtn = document.querySelector(".wallet-add-btn");

  if (!input) {
    console.error("❌ walletAddAmount input not found");
    return;
  }

  const amount = Number(input.value);
  console.log("💵 Entered amount:", amount);

  if (!amount || amount <= 0) {
    console.warn("⚠️ Invalid amount entered");
    alert("Please enter a valid amount");
    return;
  }

  const savedUser = localStorage.getItem("currentUser");

  if (!savedUser) {
    console.warn("⚠️ No currentUser found while adding wallet money");
    alert("Please login again");
    return;
  }

  let user;
  let email;
  let name;
  let phone;

  try {
    user = JSON.parse(savedUser);
    email = String(user.email || "").trim().toLowerCase();
    name = user.name || "User";
    phone = user.phone || "";

    console.log("👤 Wallet top-up user:", user);

    if (!email) {
      throw new Error("User email missing");
    }

    // ===========================================================
    // Disable button while processing
    // ===========================================================
    if (addMoneyBtn) {
      addMoneyBtn.disabled = true;
      addMoneyBtn.textContent = "Processing...";
      console.log("⏳ wallet-add-btn disabled");
    }

    // ===========================================================
    // 1. CREATE WALLET ORDER
    // ===========================================================
    const amountInPaise = amount * 100;

    console.log("🌐 Creating wallet order...");
    console.log("💵 Amount in paise:", amountInPaise);

    const order = await safeFetch(
      `${APP_CONFIG.API_URL}?action=createWalletOrder&amount=${encodeURIComponent(amountInPaise)}`
    );

    console.log("📥 Wallet order response:", order);

    if (!order.success) {
      throw new Error(order.error || "Failed to create wallet order");
    }

    // ===========================================================
    // 2. PREPARE RAZORPAY OPTIONS
    // ===========================================================
    const options = {
      key: APP_CONFIG.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency || "INR",
      order_id: order.id,

      name: "SHRD Shuttle",
      description: "Wallet Top-up",

      prefill: {
        name,
        email,
        contact: phone
      },

      notes: {
        purpose: "wallet_topup",
        email
      },

      // =======================================================
      // PAYMENT SUCCESS HANDLER
      // =======================================================
      handler: async function (response) {
        console.log("✅ Wallet payment success:", response);

        try {
          if (addMoneyBtn) {
            addMoneyBtn.disabled = true;
            addMoneyBtn.textContent = "Updating Wallet...";
            console.log("⏳ Updating wallet after Razorpay success");
          }

          // =====================================================
          // 3. ADD WALLET TRANSACTION
          // =====================================================
          const verifyUrl =
            `${APP_CONFIG.API_URL}?action=verifyWalletPayment` +
            `&email=${encodeURIComponent(email)}` +
            `&amount=${encodeURIComponent(amount)}` +
            `&razorpay_order_id=${encodeURIComponent(response.razorpay_order_id)}` +
            `&razorpay_payment_id=${encodeURIComponent(response.razorpay_payment_id)}` +
            `&razorpay_signature=${encodeURIComponent(response.razorpay_signature)}`;

            console.log("🌐 Wallet verify URL:", verifyUrl);

            const verifyResult = await safeFetch(verifyUrl);

            console.log("📥 Wallet verify response:", verifyResult);

            if (!verifyResult.success) {
            throw new Error(verifyResult.error || "Wallet verification failed");
            }

          // =====================================================
          // 4. REFRESH WALLET UI
          // =====================================================
          await refreshWalletData();

          // =====================================================
          // 5. CLEAR INPUT
          // =====================================================
          input.value = "";
          console.log("✅ walletAddAmount input cleared");

          alert(`✅ ₹${amount} added to wallet successfully`);

        } catch (error) {
          console.error("❌ Wallet top-up success handler failed:", error);
          alert("Payment was successful, but wallet update failed. Please contact support.");
        } finally {
          if (addMoneyBtn) {
            addMoneyBtn.disabled = false;
            addMoneyBtn.textContent = "Proceed to Add Money";
            console.log("✅ wallet-add-btn restored after success handler");
          }
        }
      },

      // =======================================================
      // USER CLOSED / CANCELLED RAZORPAY
      // =======================================================
      modal: {
        ondismiss: function () {
          console.log("❌ Wallet Razorpay popup closed by user");

          if (addMoneyBtn) {
            addMoneyBtn.disabled = false;
            addMoneyBtn.textContent = "Proceed to Add Money";
            console.log("✅ wallet-add-btn restored after dismiss");
          }
        }
      },

      theme: {
        color: "#6f42c1"
      }
    };

    console.log("💳 Opening Razorpay with options:", options);

    // ===========================================================
    // 3. OPEN RAZORPAY
    // ===========================================================
    const rzp = new Razorpay(options);
    rzp.open();

  } catch (error) {
    console.error("❌ handleAddMoney() failed:", error);
    alert(error.message || "Unable to start wallet payment");

    if (addMoneyBtn) {
      addMoneyBtn.disabled = false;
      addMoneyBtn.textContent = "Proceed to Add Money";
      console.log("✅ wallet-add-btn restored after error");
    }
  }
}


// ===============================================================
// RENDER WALLET TRANSACTIONS
// ===============================================================
function renderWalletTransactions(transactions) {
  console.log("🖼️ renderWalletTransactions() called");
  console.log("📦 Transactions received:", transactions);

  const transactionsContainer = document.getElementById("walletTransactionsList");

  if (!transactionsContainer) {
    console.error("❌ walletTransactionsList not found");
    return;
  }

  if (!transactions || !transactions.length) {
    transactionsContainer.innerHTML = `
      <div class="wallet-empty-state">No transactions found</div>
    `;
    console.log("ℹ️ No transactions to render");
    return;
  }

  transactionsContainer.innerHTML = transactions.map((txn) => {
    const type = String(txn.transaction_type || "").toUpperCase();
    const isCredit = type === "CREDIT" || type === "REFUND";
    const amountClass = isCredit ? "wallet-credit" : "wallet-debit";
    const amountSign = isCredit ? "+" : "-";
    const remarks = txn.remarks || txn.transaction_type || "Wallet Transaction";
    const createdAt = formatWalletDate(txn.created_at);
    const status = txn.status || "-";

    return `
      <div class="wallet-transaction-item">
        <div class="wallet-transaction-left">
          <div class="wallet-transaction-title">${remarks}</div>
          <div class="wallet-transaction-date">${createdAt}</div>
        </div>
        <div class="wallet-transaction-right">
          <div class="wallet-transaction-amount ${amountClass}">
            ${amountSign}${formatAmount(txn.amount)}
          </div>
          <div class="wallet-transaction-status">${status}</div>
        </div>
      </div>
    `;
  }).join("");

  console.log("✅ Wallet transactions rendered successfully");
}


// ===============================================================
// CLOSE POPUP WHEN CLICKING OUTSIDE
// ===============================================================
window.addEventListener("click", function (event) {
  const overlay = document.getElementById("walletModalOverlay");

  if (overlay && event.target === overlay) {
    console.log("🖱️ Overlay clicked");
    closeWalletPopup();
  }
});


// ===============================================================
// EXPOSE FUNCTIONS GLOBALLY
// ---------------------------------------------------------------
// Required because HTML uses inline onclick handlers
// ===============================================================
window.openWalletPopup = openWalletPopup;
window.closeWalletPopup = closeWalletPopup;
window.setWalletAmount = setWalletAmount;
window.handleAddMoney = handleAddMoney;

console.log("✅ wallet.js loaded successfully");