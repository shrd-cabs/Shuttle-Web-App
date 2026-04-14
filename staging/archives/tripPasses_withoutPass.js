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
// 4. Buy pass flow (basic backend-connected version)
//
// IMPORTANT
// ---------------------------------------------------------------
// - Uses currentUser.email from state.js
// - Uses APP_CONFIG.API_URL like other modules
// - Does not affect existing functions/modules
// - Updated for ONLY 3 backend sheets
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
// API CALLS
// ===============================================================
async function fetchPassTypes() {
  const url = `${APP_CONFIG.API_URL}?action=getPassTypes`;
  console.log("🌐 Fetching pass types:", url);

  const response = await fetch(url);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch pass types");
  }

  return data;
}

async function fetchMyPasses(userEmail) {
  const url = `${APP_CONFIG.API_URL}?action=getMyPasses&user_email=${encodeURIComponent(userEmail)}`;
  console.log("🌐 Fetching my passes:", url);

  const response = await fetch(url);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch my passes");
  }

  return data;
}

async function fetchPassUsageHistory(userEmail) {
  const url = `${APP_CONFIG.API_URL}?action=getPassUsageHistory&user_email=${encodeURIComponent(userEmail)}`;
  console.log("🌐 Fetching pass usage history:", url);

  const response = await fetch(url);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch pass usage history");
  }

  return data;
}

async function fetchPassDetails(userPassId, userEmail) {
  const url = `${APP_CONFIG.API_URL}?action=getPassDetails&user_pass_id=${encodeURIComponent(userPassId)}&user_email=${encodeURIComponent(userEmail)}`;
  console.log("🌐 Fetching pass details:", url);

  const response = await fetch(url);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch pass details");
  }

  return data;
}

async function buyPassApi(passTypeId, userEmail) {
  const url = `${APP_CONFIG.API_URL}?action=buyTripPass&pass_type_id=${encodeURIComponent(passTypeId)}&user_email=${encodeURIComponent(userEmail)}`;
  console.log("🌐 Buying pass:", url);

  const response = await fetch(url);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to buy pass");
  }

  return data;
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
            Purchased on ${escapeHtml(pass.purchase_date || "-")} • Valid till ${escapeHtml(pass.expiry_date || "-")}
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
              <td>${escapeHtml(item.travel_date || "-")}</td>
              <td>${escapeHtml(item.route_id || "-")}</td>
              <td>${escapeHtml(item.from_stop || "-")}</td>
              <td>${escapeHtml(item.to_stop || "-")}</td>
              <td>₹${Number(item.original_fare || 0)}</td>
              <td>₹${Number(item.discount_amount || 0)}</td>
              <td>₹${Number(item.final_fare || 0)}</td>
              <td>${escapeHtml(item.used_at || "-")}</td>
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
  modal.style.display = "block";

  try {
    const data = await fetchPassDetails(userPassId, currentUser.email);
    console.log("📥 Pass details response:", data);

    const pass = data.pass;
    const usageHistory = data.usageHistory || [];

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
          <div class="pass-detail-item"><span>Purchase Date</span><strong>${escapeHtml(pass.purchase_date || "-")}</strong></div>
          <div class="pass-detail-item"><span>Start Date</span><strong>${escapeHtml(pass.start_date || "-")}</strong></div>
          <div class="pass-detail-item"><span>Expiry Date</span><strong>${escapeHtml(pass.expiry_date || "-")}</strong></div>
          <div class="pass-detail-item"><span>Last Used At</span><strong>${escapeHtml(pass.last_used_at || "-")}</strong></div>
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
                        <td>${escapeHtml(item.travel_date || "-")}</td>
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
// BUY PASS
// ===============================================================
async function buyTripPass(passTypeId) {
  console.log("💳 Buy pass clicked:", passTypeId);

  if (!currentUser?.email) {
    alert("User not logged in");
    return;
  }

  const ok = confirm("Do you want to buy this pass?");
  if (!ok) {
    console.log("ℹ️ User cancelled pass purchase");
    return;
  }

  try {
    const data = await buyPassApi(passTypeId, currentUser.email);
    console.log("✅ Buy pass response:", data);

    alert(data.message || "Pass purchased successfully");

    await initTravelPass();

  } catch (error) {
    console.error("❌ Failed to buy pass:", error);
    alert(error.message || "Failed to buy pass");
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
  const modal = document.getElementById("passDetailsModal");
  if (modal && event.target === modal) {
    closePassDetails();
  }
});

// ===============================================================
// GLOBALS FOR HTML onclick
// ===============================================================
window.showPassTab = showPassTab;
window.openPassDetails = openPassDetails;
window.closePassDetails = closePassDetails;
window.buyTripPass = buyTripPass;