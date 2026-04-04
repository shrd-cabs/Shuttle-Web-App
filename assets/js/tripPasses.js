// ===============================================================
// tripPasses.js
// ---------------------------------------------------------------
// Travel Pass frontend module
//
// RESPONSIBILITIES
// ---------------------------------------------------------------
// 1. Load pass data from Google Sheets backend
// 2. Render Travel Pass tabs:
//    - Available Passes
//    - My Passes
//    - Usage History
// 3. Open full pass details modal
// 4. Buy pass flow with:
//    - Full Wallet
//    - Wallet + Razorpay
//    - Full Razorpay
//
// IMPORTANT
// ---------------------------------------------------------------
// - Uses currentUser.email from state.js
// - Uses APP_CONFIG.API_URL like other modules
// - Does not affect existing functions/modules
// - Uses only 3 backend sheets for pass data
// - Added date/time formatter for UI display
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { currentUser } from "./state.js";

console.log("🎫 tripPasses.js loaded");

// ===============================================================
// MODULE STATE
// ===============================================================
let currentPassTab = "available";

let tripPassState = {
  passTypes: [],
  myPasses: [],
  usageHistory: []
};

// ===============================================================
// PASS PURCHASE SUMMARY STATE
// ---------------------------------------------------------------
// totalAmount  = pass price
// walletUsed   = amount paid from wallet
// onlineAmount = amount left for Razorpay
// ===============================================================
let passPurchaseState = {
  pass: null,
  totalAmount: 0,
  walletBalance: 0,
  useWallet: false,
  walletUsed: 0,
  onlineAmount: 0
};

// ===============================================================
// INIT TRAVEL PASS
// ===============================================================
export async function initTravelPass() {
  console.log("🚀 initTravelPass() called");

  const container = document.getElementById("travelPassContent");

  if (!container) {
    console.warn("⚠️ travelPassContent container not found");
    return;
  }

  if (!currentUser?.email) {
    console.warn("❌ User not logged in for Travel Pass");

    container.innerHTML = `
      <p class="info-message error">User not logged in</p>
    `;
    return;
  }

  currentPassTab = "available";
  setActivePassTabButton(currentPassTab);

  container.innerHTML = `
    <p class="info-message">Loading travel pass data...</p>
  `;

  try {
    await loadAllTravelPassData();
    renderPassTabContent(currentPassTab);
  } catch (error) {
    console.error("❌ Failed to initialize Travel Pass:", error);

    container.innerHTML = `
      <p class="info-message error">Failed to load travel pass data</p>
    `;
  }
}

// ===============================================================
// LOAD ALL DATA
// ===============================================================
async function loadAllTravelPassData() {
  console.log("📦 Loading all Travel Pass data for:", currentUser.email);

  const [passTypesRes, myPassesRes, usageRes] = await Promise.all([
    fetchPassTypes(),
    fetchMyPasses(currentUser.email),
    fetchPassUsageHistory(currentUser.email)
  ]);

  console.log("📥 Pass Types Response:", passTypesRes);
  console.log("📥 My Passes Response:", myPassesRes);
  console.log("📥 Usage History Response:", usageRes);

  tripPassState.passTypes = passTypesRes.passTypes || [];
  tripPassState.myPasses = myPassesRes.myPasses || [];
  tripPassState.usageHistory = usageRes.usageHistory || [];

  console.log("✅ Travel Pass state ready:", tripPassState);
}

// ===============================================================
// SAFE FETCH
// ===============================================================
async function safeFetch(url) {
  console.log("🌐 safeFetch() URL:", url);

  const response = await fetch(url);
  const text = await response.text();

  console.log("📡 RAW API Response:", text);

  try {
    const parsed = JSON.parse(text);
    console.log("✅ Parsed API response:", parsed);
    return parsed;
  } catch (error) {
    console.error("❌ Failed to parse JSON response:", error);
    throw new Error("Invalid JSON response from server");
  }
}

// ===============================================================
// API CALLS
// ===============================================================
async function fetchPassTypes() {
  const url = `${APP_CONFIG.API_URL}?action=getPassTypes`;
  console.log("🌐 Fetching pass types:", url);

  const data = await safeFetch(url);

  if (!data.success) {
    console.error("❌ fetchPassTypes failed:", data);
    throw new Error(data.error || "Failed to fetch pass types");
  }

  return data;
}

async function fetchMyPasses(userEmail) {
  const url = `${APP_CONFIG.API_URL}?action=getMyPasses&user_email=${encodeURIComponent(userEmail)}`;
  console.log("🌐 Fetching my passes:", url);

  const data = await safeFetch(url);

  if (!data.success) {
    console.error("❌ fetchMyPasses failed:", data);
    throw new Error(data.error || "Failed to fetch my passes");
  }

  return data;
}

async function fetchPassUsageHistory(userEmail) {
  const url = `${APP_CONFIG.API_URL}?action=getPassUsageHistory&user_email=${encodeURIComponent(userEmail)}`;
  console.log("🌐 Fetching pass usage history:", url);

  const data = await safeFetch(url);

  if (!data.success) {
    console.error("❌ fetchPassUsageHistory failed:", data);
    throw new Error(data.error || "Failed to fetch pass usage history");
  }

  return data;
}

async function fetchPassDetails(userPassId, userEmail) {
  const url = `${APP_CONFIG.API_URL}?action=getPassDetails&user_pass_id=${encodeURIComponent(userPassId)}&user_email=${encodeURIComponent(userEmail)}`;
  console.log("🌐 Fetching pass details:", url);

  const data = await safeFetch(url);

  if (!data.success) {
    console.error("❌ fetchPassDetails failed:", data);
    throw new Error(data.error || "Failed to fetch pass details");
  }

  return data;
}

async function fetchWalletBalance(email) {
  const url = `${APP_CONFIG.API_URL}?action=getWalletBalance&email=${encodeURIComponent(email)}`;
  console.log("💰 Fetching wallet balance:", url);

  const data = await safeFetch(url);

  if (!data.success) {
    console.error("❌ fetchWalletBalance failed:", data);
    throw new Error(data.error || "Failed to fetch wallet balance");
  }

  return Number(data.wallet_balance || 0);
}

async function createPassOrder(amountInPaise, passTypeId) {
  const url =
    `${APP_CONFIG.API_URL}?action=createOrder` +
    `&amount=${encodeURIComponent(amountInPaise)}` +
    `&email=${encodeURIComponent(currentUser.email)}` +
    `&pass_type_id=${encodeURIComponent(passTypeId)}`;

  console.log("🌐 Creating pass order:", url);

  const data = await safeFetch(url);

  if (!data.success) {
    console.error("❌ createPassOrder failed:", data);
    throw new Error(data.error || "Failed to create pass order");
  }

  return data;
}

async function processWalletPassPayment(passTypeId, amount) {
  const url =
    `${APP_CONFIG.API_URL}?action=processWalletPassPayment` +
    `&user_email=${encodeURIComponent(currentUser.email)}` +
    `&pass_type_id=${encodeURIComponent(passTypeId)}` +
    `&amount=${encodeURIComponent(amount)}`;

  console.log("🌐 Processing full wallet pass payment:", url);

  const data = await safeFetch(url);

  if (!data.success) {
    console.error("❌ processWalletPassPayment failed:", data);
    throw new Error(data.error || "Wallet pass payment failed");
  }

  return data;
}

async function verifyPassPayment(passTypeId, totalAmount, response) {
  const url =
    `${APP_CONFIG.API_URL}?action=verifyPassPayment` +
    `&user_email=${encodeURIComponent(currentUser.email)}` +
    `&pass_type_id=${encodeURIComponent(passTypeId)}` +
    `&amount=${encodeURIComponent(totalAmount)}` +
    `&razorpay_order_id=${encodeURIComponent(response.razorpay_order_id)}` +
    `&razorpay_payment_id=${encodeURIComponent(response.razorpay_payment_id)}` +
    `&razorpay_signature=${encodeURIComponent(response.razorpay_signature)}`;

  console.log("🌐 Verifying full online pass payment:", url);
  console.log("📦 Full pass Razorpay response object:", response);

  const data = await safeFetch(url);

  if (!data.success) {
    console.error("❌ verifyPassPayment failed:", data);
    throw new Error(data.error || "Pass payment verification failed");
  }

  return data;
}

async function verifyMixedPassPayment(passTypeId, walletUsed, onlineAmount, response) {
  const url =
    `${APP_CONFIG.API_URL}?action=verifyMixedPassPayment` +
    `&user_email=${encodeURIComponent(currentUser.email)}` +
    `&pass_type_id=${encodeURIComponent(passTypeId)}` +
    `&wallet_amount=${encodeURIComponent(walletUsed)}` +
    `&online_amount=${encodeURIComponent(onlineAmount)}` +
    `&razorpay_order_id=${encodeURIComponent(response.razorpay_order_id)}` +
    `&razorpay_payment_id=${encodeURIComponent(response.razorpay_payment_id)}` +
    `&razorpay_signature=${encodeURIComponent(response.razorpay_signature)}`;

  console.log("🌐 Verifying mixed pass payment:", url);
  console.log("📦 Mixed pass Razorpay response object:", response);

  const data = await safeFetch(url);

  if (!data.success) {
    console.error("❌ verifyMixedPassPayment failed:", data);
    throw new Error(data.error || "Mixed pass payment verification failed");
  }

  return data;
}

// ===============================================================
// OPTIONAL UI REFRESH HELPER
// ===============================================================
async function refreshWalletUiIfAvailable() {
  try {
    console.log("🔄 Checking for wallet UI refresh hook...");

    if (typeof window.refreshWalletData === "function") {
      await window.refreshWalletData();
      console.log("✅ Wallet UI refreshed");
    } else {
      console.log("ℹ️ No wallet UI refresh hook found, skipping");
    }
  } catch (error) {
    console.warn("⚠️ Wallet UI refresh failed:", error);
  }
}

// ===============================================================
// TAB SWITCH
// ===============================================================
function showPassTab(tabName) {
  console.log("🗂️ Travel Pass tab switched:", tabName);
  currentPassTab = tabName;
  setActivePassTabButton(tabName);
  renderPassTabContent(tabName);
}

function setActivePassTabButton(tabName) {
  const ids = [
    "tabPassAvailable",
    "tabPassMyPasses",
    "tabPassUsage"
  ];

  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove("active");
  });

  const idMap = {
    available: "tabPassAvailable",
    myPasses: "tabPassMyPasses",
    usage: "tabPassUsage"
  };

  const activeBtn = document.getElementById(idMap[tabName]);
  if (activeBtn) activeBtn.classList.add("active");
}

// ===============================================================
// MAIN RENDERER
// ===============================================================
function renderPassTabContent(tabName) {
  console.log("🖼️ renderPassTabContent() called for tab:", tabName);

  const container = document.getElementById("travelPassContent");

  if (!container) {
    console.warn("⚠️ travelPassContent not found");
    return;
  }

  if (tabName === "available") {
    renderAvailablePasses(container);
  } else if (tabName === "myPasses") {
    renderMyPasses(container);
  } else if (tabName === "usage") {
    renderPassUsage(container);
  }
}

// ===============================================================
// AVAILABLE PASSES
// ===============================================================
function renderAvailablePasses(container) {
  const passes = tripPassState.passTypes;
  console.log("🎫 renderAvailablePasses() count:", passes.length);

  if (!passes.length) {
    container.innerHTML = `<div class="pass-empty">No passes available right now.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="pass-grid">
      ${passes.map(pass => `
        <div class="pass-card">
          <div class="pass-card-header">
            <div>
              <h3 class="pass-name">${escapeHtml(pass.pass_name)}</h3>
            </div>
            <div class="pass-code">${escapeHtml(pass.pass_code || "-")}</div>
          </div>

          <div class="pass-desc">${escapeHtml(pass.description || "-")}</div>

          <div class="pass-price">₹${Number(pass.pass_price || 0)}</div>

          <div class="pass-info-grid">
            <div class="pass-info-box">
              <span>Discount</span>
              <strong>${Number(pass.discount_value || 0)}%</strong>
            </div>
            <div class="pass-info-box">
              <span>Validity</span>
              <strong>${Number(pass.validity_days || 0)} Days</strong>
            </div>
            <div class="pass-info-box">
              <span>Min Fare</span>
              <strong>₹${Number(pass.min_fare_amount || 0)}</strong>
            </div>
            <div class="pass-info-box">
              <span>Max Discount</span>
              <strong>₹${Number(pass.max_discount_amount || 0)}</strong>
            </div>
          </div>

          <div class="pass-card-actions">
            <button class="btn btn-primary" onclick="buyTripPass('${escapeAttr(pass.pass_type_id)}')">
              Buy Pass
            </button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// ===============================================================
// MY PASSES
// ===============================================================
function renderMyPasses(container) {
  const passes = tripPassState.myPasses;
  console.log("🧾 renderMyPasses() count:", passes.length);

  if (!passes.length) {
    container.innerHTML = `<div class="pass-empty">No pass purchased yet.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="pass-grid">
      ${passes.map(pass => `
        <div class="pass-card">
          <div class="pass-card-header">
            <div>
              <h3 class="pass-name">${escapeHtml(pass.pass_name)}</h3>
            </div>
            <div class="pass-status ${String(pass.status || "").toLowerCase()}">
              ${escapeHtml(pass.status || "-")}
            </div>
          </div>

          <div class="pass-desc">
            Purchased on ${escapeHtml(formatDisplayDateTime(pass.purchase_date || "-"))} • Valid till ${escapeHtml(formatDisplayDateTime(pass.expiry_date || "-"))}
          </div>

          <div class="pass-info-grid">
            <div class="pass-info-box">
              <span>Purchase Amount</span>
              <strong>₹${Number(pass.purchase_amount || 0)}</strong>
            </div>
            <div class="pass-info-box">
              <span>Discount</span>
              <strong>${Number(pass.discount_value || 0)}%</strong>
            </div>
            <div class="pass-info-box">
              <span>Usage Count</span>
              <strong>${Number(pass.usage_count || 0)}</strong>
            </div>
            <div class="pass-info-box">
              <span>Payment Type</span>
              <strong>${escapeHtml(pass.payment_type || "-")}</strong>
            </div>
          </div>

          <div class="pass-card-actions">
            <button class="btn btn-primary" onclick="openPassDetails('${escapeAttr(pass.user_pass_id)}')">
              View Details
            </button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// ===============================================================
// PASS USAGE HISTORY
// ===============================================================
function renderPassUsage(container) {
  const usageHistory = tripPassState.usageHistory;
  console.log("📜 renderPassUsage() count:", usageHistory.length);

  if (!usageHistory.length) {
    container.innerHTML = `<div class="pass-empty">No pass usage found.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="pass-table-wrap">
      <table class="pass-table">
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Travel Date</th>
            <th>Route</th>
            <th>From</th>
            <th>To</th>
            <th>Original Fare</th>
            <th>Discount</th>
            <th>Final Fare</th>
            <th>Used At</th>
          </tr>
        </thead>
        <tbody>
          ${usageHistory.map(item => `
            <tr>
              <td>${escapeHtml(item.booking_id || "-")}</td>
              <td>${escapeHtml(formatDisplayDateTime(item.travel_date || "-"))}</td>
              <td>${escapeHtml(item.route_id || "-")}</td>
              <td>${escapeHtml(item.from_stop || "-")}</td>
              <td>${escapeHtml(item.to_stop || "-")}</td>
              <td>₹${Number(item.original_fare || 0)}</td>
              <td>₹${Number(item.discount_amount || 0)}</td>
              <td>₹${Number(item.final_fare || 0)}</td>
              <td>${escapeHtml(formatDisplayDateTime(item.used_at || "-"))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ===============================================================
// PASS DETAILS MODAL
// ===============================================================
async function openPassDetails(userPassId) {
  console.log("🔍 Opening pass details for:", userPassId);

  const content = document.getElementById("passDetailsContent");
  const modal = document.getElementById("passDetailsModal");

  if (!content || !modal) {
    console.warn("⚠️ Pass details modal elements not found");
    return;
  }

  content.innerHTML = `<p class="info-message">Loading pass details...</p>`;
  modal.style.display = "flex";
  try {
    const data = await fetchPassDetails(userPassId, currentUser.email);
    console.log("📥 Pass details response:", data);

    const pass = data.pass;
    const usageHistory = data.usageHistory || [];

    console.log("🧾 Pass detail object:", pass);
    console.log("📜 Pass detail usage count:", usageHistory.length);

    content.innerHTML = `
      <div class="pass-detail-title">${escapeHtml(pass.pass_name || "-")}</div>

      <div class="pass-detail-section">
        <h4>Basic Information</h4>
        <div class="pass-detail-grid">
          <div class="pass-detail-item"><span>User Pass ID</span><strong>${escapeHtml(pass.user_pass_id || "-")}</strong></div>
          <div class="pass-detail-item"><span>Pass Type ID</span><strong>${escapeHtml(pass.pass_type_id || "-")}</strong></div>
          <div class="pass-detail-item"><span>Status</span><strong>${escapeHtml(pass.status || "-")}</strong></div>
          <div class="pass-detail-item"><span>Pass Code</span><strong>${escapeHtml(pass.pass_code || "-")}</strong></div>
          <div class="pass-detail-item"><span>Description</span><strong>${escapeHtml(pass.description || "-")}</strong></div>
          <div class="pass-detail-item"><span>User Email</span><strong>${escapeHtml(pass.user_email || "-")}</strong></div>
        </div>
      </div>

      <div class="pass-detail-section">
        <h4>Validity Information</h4>
        <div class="pass-detail-grid">
          <div class="pass-detail-item"><span>Purchase Date</span><strong>${escapeHtml(formatDisplayDateTime(pass.purchase_date || "-"))}</strong></div>
          <div class="pass-detail-item"><span>Start Date</span><strong>${escapeHtml(formatDisplayDateTime(pass.start_date || "-"))}</strong></div>
          <div class="pass-detail-item"><span>Expiry Date</span><strong>${escapeHtml(formatDisplayDateTime(pass.expiry_date || "-"))}</strong></div>
          <div class="pass-detail-item"><span>Last Used At</span><strong>${escapeHtml(formatDisplayDateTime(pass.last_used_at || "-"))}</strong></div>
        </div>
      </div>

      <div class="pass-detail-section">
        <h4>Payment Information</h4>
        <div class="pass-detail-grid">
          <div class="pass-detail-item"><span>Pass Price</span><strong>₹${Number(pass.pass_price || 0)}</strong></div>
          <div class="pass-detail-item"><span>Purchase Amount</span><strong>₹${Number(pass.purchase_amount || 0)}</strong></div>
          <div class="pass-detail-item"><span>Payment Type</span><strong>${escapeHtml(pass.payment_type || "-")}</strong></div>
          <div class="pass-detail-item"><span>Payment Status</span><strong>${escapeHtml(pass.payment_status || "-")}</strong></div>
          <div class="pass-detail-item"><span>Razorpay Order ID</span><strong>${escapeHtml(pass.razorpay_order_id || "-")}</strong></div>
          <div class="pass-detail-item"><span>Razorpay Payment ID</span><strong>${escapeHtml(pass.razorpay_payment_id || "-")}</strong></div>
        </div>
      </div>

      <div class="pass-detail-section">
        <h4>Discount Rules</h4>
        <div class="pass-detail-grid">
          <div class="pass-detail-item"><span>Discount Type</span><strong>${escapeHtml(pass.discount_type || "-")}</strong></div>
          <div class="pass-detail-item"><span>Discount Value</span><strong>${Number(pass.discount_value || 0)}%</strong></div>
          <div class="pass-detail-item"><span>Max Discount Amount</span><strong>₹${Number(pass.max_discount_amount || 0)}</strong></div>
          <div class="pass-detail-item"><span>Min Fare Amount</span><strong>₹${Number(pass.min_fare_amount || 0)}</strong></div>
          <div class="pass-detail-item"><span>Applicable Routes</span><strong>${escapeHtml(pass.applicable_routes || "-")}</strong></div>
          <div class="pass-detail-item"><span>Usage Count</span><strong>${Number(pass.usage_count || 0)}</strong></div>
        </div>
      </div>

      <div class="pass-detail-section">
        <h4>Recent Usage</h4>
        ${
          usageHistory.length
            ? `
              <div class="pass-table-wrap">
                <table class="pass-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Travel Date</th>
                      <th>Route</th>
                      <th>Original Fare</th>
                      <th>Discount</th>
                      <th>Final Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${usageHistory.map(item => `
                      <tr>
                        <td>${escapeHtml(item.booking_id || "-")}</td>
                        <td>${escapeHtml(formatDisplayDateTime(item.travel_date || "-"))}</td>
                        <td>${escapeHtml(item.route_id || "-")}</td>
                        <td>₹${Number(item.original_fare || 0)}</td>
                        <td>₹${Number(item.discount_amount || 0)}</td>
                        <td>₹${Number(item.final_fare || 0)}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            `
            : `<div class="pass-empty">No usage available for this pass.</div>`
        }
      </div>

      <div style="margin-top:18px;text-align:right;">
        <button class="btn btn-secondary" onclick="closePassDetails()">Close</button>
      </div>
    `;

  } catch (error) {
    console.error("❌ Failed to load pass details:", error);

    content.innerHTML = `
      <p class="info-message error">Failed to load pass details</p>
      <div style="margin-top:18px;text-align:right;">
        <button class="btn btn-secondary" onclick="closePassDetails()">Close</button>
      </div>
    `;
  }
}

function closePassDetails() {
  console.log("❎ Closing pass details modal");
  const modal = document.getElementById("passDetailsModal");
  if (modal) modal.style.display = "none";
}

// ===============================================================
// FORMATTERS
// ===============================================================
function formatAmount(amount) {
  return `₹${Number(amount || 0)}`;
}

// ---------------------------------------------------------------
// FORMAT DISPLAY DATE TIME
// ---------------------------------------------------------------
// Converts values like:
//   2026-04-03T18:30:00.000Z
// into:
//   2026-04-03 Time - 18:30
//
// Notes:
// - Keeps "-" unchanged
// - Supports ISO strings directly
// - Supports general Date-parsable strings as fallback
// ---------------------------------------------------------------
function formatDisplayDateTime(value) {
  if (!value || value === "-") {
    return "-";
  }

  const str = String(value).trim();
  console.log("🕒 formatDisplayDateTime() input:", str);

  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (isoMatch) {
    const formatted = `${isoMatch[1]} Time - ${isoMatch[2]}`;
    console.log("✅ ISO formatted date-time:", formatted);
    return formatted;
  }

  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");
    const hours = String(parsedDate.getHours()).padStart(2, "0");
    const minutes = String(parsedDate.getMinutes()).padStart(2, "0");

    const formatted = `${year}-${month}-${day} Time - ${hours}:${minutes}`;
    console.log("✅ Parsed formatted date-time:", formatted);
    return formatted;
  }

  console.warn("⚠️ Could not parse date-time, returning raw value:", str);
  return str;
}

// ===============================================================
// INJECT PASS PURCHASE SUMMARY MODAL
// ===============================================================
function injectPassPurchaseModal() {
  console.log("🧩 injectPassPurchaseModal() called");

  if (document.getElementById("passPurchaseOverlay")) {
    console.log("ℹ️ Pass purchase modal already exists");
    return;
  }

  const modalHtml = `
    <div class="payment-summary-overlay" id="passPurchaseOverlay" style="display:none;">
      <div class="payment-summary-modal">
        <div class="payment-summary-header">
          <h2>Buy Travel Pass</h2>
          <button type="button" class="payment-summary-close" onclick="closePassPurchaseModal()">×</button>
        </div>

        <div class="payment-summary-body">
          <div class="payment-summary-row">
            <span>Pass Name</span>
            <strong id="passPurchaseName">-</strong>
          </div>

          <div class="payment-summary-row">
            <span>Pass Price</span>
            <strong id="passPurchaseTotal">₹0</strong>
          </div>

          <div class="payment-summary-row">
            <span>Wallet Balance</span>
            <strong id="passPurchaseWalletBalance">₹0</strong>
          </div>

          <label class="payment-wallet-checkbox">
            <input type="checkbox" id="useWalletForPassCheckbox" onchange="handlePassWalletCheckboxChange()">
            <span>Use wallet balance for this pass</span>
          </label>

          <div class="payment-summary-row">
            <span>Wallet Used</span>
            <strong id="passPurchaseWalletUsed">₹0</strong>
          </div>

          <div class="payment-summary-row">
            <span>Pay Online</span>
            <strong id="passPurchaseOnlineAmount">₹0</strong>
          </div>
        </div>

        <div class="payment-summary-footer">
          <button type="button" class="payment-summary-cancel-btn" onclick="closePassPurchaseModal()">
            Cancel
          </button>

          <button type="button" class="payment-summary-confirm-btn" id="passPurchaseConfirmBtn" onclick="confirmPassPurchaseSummary()">
            Proceed
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  console.log("✅ Pass purchase modal injected");
}

// ===============================================================
// OPEN / CLOSE PASS PURCHASE MODAL
// ===============================================================
function openPassPurchaseModal() {
  console.log("🧾 openPassPurchaseModal() called");

  const overlay = document.getElementById("passPurchaseOverlay");
  if (!overlay) {
    console.error("❌ passPurchaseOverlay not found");
    return;
  }

  overlay.style.display = "flex";
  updatePassPurchaseSummaryUI();
}

function closePassPurchaseModal() {
  console.log("❌ closePassPurchaseModal() called");

  const overlay = document.getElementById("passPurchaseOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

// ===============================================================
// UPDATE PASS PURCHASE SUMMARY UI
// ===============================================================
function updatePassPurchaseSummaryUI() {
  console.log("🔄 updatePassPurchaseSummaryUI() called");
  console.log("📦 passPurchaseState:", passPurchaseState);

  const passNameEl = document.getElementById("passPurchaseName");
  const totalEl = document.getElementById("passPurchaseTotal");
  const walletBalanceEl = document.getElementById("passPurchaseWalletBalance");
  const walletUsedEl = document.getElementById("passPurchaseWalletUsed");
  const onlineAmountEl = document.getElementById("passPurchaseOnlineAmount");
  const checkbox = document.getElementById("useWalletForPassCheckbox");
  const confirmBtn = document.getElementById("passPurchaseConfirmBtn");

  if (passNameEl) {
    passNameEl.textContent = passPurchaseState.pass?.pass_name || "-";
  }

  if (totalEl) {
    totalEl.textContent = formatAmount(passPurchaseState.totalAmount);
  }

  if (walletBalanceEl) {
    walletBalanceEl.textContent = formatAmount(passPurchaseState.walletBalance);
  }

  if (checkbox) {
    checkbox.checked = passPurchaseState.useWallet;
  }

  if (passPurchaseState.useWallet) {
    passPurchaseState.walletUsed = Math.min(
      Number(passPurchaseState.walletBalance || 0),
      Number(passPurchaseState.totalAmount || 0)
    );
  } else {
    passPurchaseState.walletUsed = 0;
  }

  passPurchaseState.onlineAmount =
    Number(passPurchaseState.totalAmount || 0) - Number(passPurchaseState.walletUsed || 0);

  console.log("💰 Wallet used:", passPurchaseState.walletUsed);
  console.log("💳 Online amount:", passPurchaseState.onlineAmount);

  if (walletUsedEl) {
    walletUsedEl.textContent = formatAmount(passPurchaseState.walletUsed);
  }

  if (onlineAmountEl) {
    onlineAmountEl.textContent = formatAmount(passPurchaseState.onlineAmount);
  }

  if (confirmBtn) {
    if (passPurchaseState.onlineAmount === 0 && passPurchaseState.walletUsed > 0) {
      confirmBtn.textContent = `Pay ${formatAmount(passPurchaseState.totalAmount)} via Wallet`;
    } else if (passPurchaseState.onlineAmount > 0 && passPurchaseState.walletUsed > 0) {
      confirmBtn.textContent = `Pay ${formatAmount(passPurchaseState.onlineAmount)} Online`;
    } else {
      confirmBtn.textContent = `Pay ${formatAmount(passPurchaseState.totalAmount)} via Razorpay`;
    }
  }
}

// ===============================================================
// PASS WALLET CHECKBOX CHANGE
// ===============================================================
function handlePassWalletCheckboxChange() {
  console.log("☑️ handlePassWalletCheckboxChange() called");

  const checkbox = document.getElementById("useWalletForPassCheckbox");
  passPurchaseState.useWallet = checkbox ? checkbox.checked : false;

  console.log("✅ Pass wallet checkbox state:", passPurchaseState.useWallet);

  updatePassPurchaseSummaryUI();
}

// ===============================================================
// BUY PASS
// ---------------------------------------------------------------
// Opens pass purchase summary modal with wallet balance
//
// FRONTEND GUARD:
// Prevent opening purchase flow if user already has ACTIVE pass
// ===============================================================
async function buyTripPass(passTypeId) {
  console.log("💳 Buy pass clicked:", passTypeId);

  if (!currentUser?.email) {
    alert("User not logged in");
    return;
  }

  try {
    const pass = (tripPassState.passTypes || []).find(
      p => String(p.pass_type_id) === String(passTypeId)
    );

    if (!pass) {
      throw new Error("Pass not found");
    }

    const hasActivePass = (tripPassState.myPasses || []).some(
      p => String(p.status || "").toUpperCase() === "ACTIVE"
    );

    if (hasActivePass) {
      console.warn("⚠️ User already has an active pass");
      alert("You already have an active pass.");
      return;
    }

    console.log("🎫 Selected pass:", pass);

    const walletBalance = await fetchWalletBalance(currentUser.email);
    console.log("💰 Wallet balance for pass purchase:", walletBalance);

    passPurchaseState = {
      pass,
      totalAmount: Number(pass.pass_price || 0),
      walletBalance,
      useWallet: false,
      walletUsed: 0,
      onlineAmount: Number(pass.pass_price || 0)
    };

    console.log("✅ passPurchaseState prepared:", passPurchaseState);

    openPassPurchaseModal();

  } catch (error) {
    console.error("❌ Failed to start pass purchase:", error);
    alert(error.message || "Unable to start pass purchase");
  }
}

// ===============================================================
// CONFIRM PASS PURCHASE SUMMARY
// ---------------------------------------------------------------
// Handles 3 cases:
// 1. Full wallet
// 2. Wallet + Razorpay
// 3. Full Razorpay
// ===============================================================
async function confirmPassPurchaseSummary() {
  console.log("✅ confirmPassPurchaseSummary() called");
  console.log("📦 Current passPurchaseState:", passPurchaseState);

  try {
    closePassPurchaseModal();

    const pass = passPurchaseState.pass;
    const totalAmount = Number(passPurchaseState.totalAmount || 0);
    const walletUsed = Number(passPurchaseState.walletUsed || 0);
    const onlineAmount = Number(passPurchaseState.onlineAmount || 0);

    console.log("🧮 Purchase breakdown:", {
      pass,
      totalAmount,
      walletUsed,
      onlineAmount
    });

    if (!pass || !pass.pass_type_id) {
      throw new Error("Pass details missing");
    }

    // ===========================================================
    // CASE 1: FULL WALLET
    // ===========================================================
    if (walletUsed > 0 && onlineAmount === 0) {
      console.log("💰 Full wallet pass purchase selected");

      const result = await processWalletPassPayment(pass.pass_type_id, totalAmount);
      console.log("📥 processWalletPassPayment response:", result);

      alert(result.message || "Pass purchased successfully using wallet");

      await Promise.all([
        initTravelPass(),
        refreshWalletUiIfAvailable()
      ]);

      return;
    }

    // ===========================================================
    // CASE 2: PARTIAL WALLET + RAZORPAY
    // ===========================================================
    if (walletUsed > 0 && onlineAmount > 0) {
      console.log("🟡 Mixed pass purchase selected");

      const order = await createPassOrder(onlineAmount * 100, pass.pass_type_id);
      console.log("📥 Mixed pass order response:", order);

      const options = {
        key: APP_CONFIG.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        order_id: order.id,
        name: "SHRD Shuttle",
        description: `${pass.pass_name} (Wallet + Online)`,

        handler: async function(response) {
          console.log("✅ Mixed pass payment success:", response);

          try {
            const verifyData = await verifyMixedPassPayment(
              pass.pass_type_id,
              walletUsed,
              onlineAmount,
              response
            );

            console.log("📥 verifyMixedPassPayment response:", verifyData);

            alert(verifyData.message || "Pass purchased successfully");

            await Promise.all([
              initTravelPass(),
              refreshWalletUiIfAvailable()
            ]);

          } catch (error) {
            console.error("❌ Mixed pass verify failed:", error);
            alert(error.message || "Mixed pass payment verification failed");
          }
        },

        modal: {
          ondismiss: function() {
            console.log("❌ Mixed pass Razorpay popup dismissed");
          }
        },

        theme: {
          color: "#6f42c1"
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();
      return;
    }

    // ===========================================================
    // CASE 3: FULL RAZORPAY
    // ===========================================================
    console.log("🔴 Full online pass purchase selected");

    const order = await createPassOrder(totalAmount * 100, pass.pass_type_id);
    console.log("📥 Full pass order response:", order);

    const options = {
      key: APP_CONFIG.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: "INR",
      order_id: order.id,
      name: "SHRD Shuttle",
      description: pass.pass_name,

      handler: async function(response) {
        console.log("✅ Full pass payment success:", response);

        try {
          const verifyData = await verifyPassPayment(
            pass.pass_type_id,
            totalAmount,
            response
          );

          console.log("📥 verifyPassPayment response:", verifyData);

          alert(verifyData.message || "Pass purchased successfully");

          await Promise.all([
            initTravelPass(),
            refreshWalletUiIfAvailable()
          ]);

        } catch (error) {
          console.error("❌ Full pass verify failed:", error);
          alert(error.message || "Pass payment verification failed");
        }
      },

      modal: {
        ondismiss: function() {
          console.log("❌ Full pass Razorpay popup dismissed");
        }
      },

      theme: {
        color: "#6f42c1"
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (error) {
    console.error("❌ confirmPassPurchaseSummary() failed:", error);
    alert(error.message || "Unable to continue pass purchase");
  }
}

// ===============================================================
// HELPERS
// ===============================================================
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return String(value ?? "").replace(/'/g, "\\'");
}

// ===============================================================
// MODAL OUTSIDE CLICK CLOSE
// ===============================================================
window.addEventListener("click", function(event) {
  const passDetailsModal = document.getElementById("passDetailsModal");
  if (passDetailsModal && event.target === passDetailsModal) {
    closePassDetails();
  }

  const passPurchaseOverlay = document.getElementById("passPurchaseOverlay");
  if (passPurchaseOverlay && event.target === passPurchaseOverlay) {
    closePassPurchaseModal();
  }
});

// ===============================================================
// GLOBALS FOR HTML onclick
// ===============================================================
window.showPassTab = showPassTab;
window.openPassDetails = openPassDetails;
window.closePassDetails = closePassDetails;
window.buyTripPass = buyTripPass;
window.closePassPurchaseModal = closePassPurchaseModal;
window.handlePassWalletCheckboxChange = handlePassWalletCheckboxChange;
window.confirmPassPurchaseSummary = confirmPassPurchaseSummary;

// ===============================================================
// INIT PASS PURCHASE MODAL HTML
// ===============================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 tripPasses.js DOMContentLoaded");
  injectPassPurchaseModal();
});