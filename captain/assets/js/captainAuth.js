// ===============================================================
// captainAuth.js
// ---------------------------------------------------------------
// Captain authentication module
//
// FUNCTIONS:
// 1. loginCaptain()      -> validate captain login from backend
// 2. logoutCaptain()     -> clear captain session
// 3. autoLoginCaptain()  -> restore saved captain session
// 4. initCaptainAuth()   -> bind login/logout events
// ===============================================================

import { APP_CONFIG } from "/assets/js/config.js";

const CAPTAIN_SESSION_KEY = "captainSession";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function getEl(id) {
  return document.getElementById(id);
}

function showCaptainLogin() {
  const loginSection = getEl("captainLoginSection");
  const dashboard = getEl("captainDashboard");

  if (loginSection) loginSection.style.display = "block";
  if (dashboard) dashboard.style.display = "none";
}

function showCaptainDashboard() {
  const loginSection = getEl("captainLoginSection");
  const dashboard = getEl("captainDashboard");

  if (loginSection) loginSection.style.display = "none";
  if (dashboard) dashboard.style.display = "block";
}

function fillCaptainDashboard(session) {
  const captainNameEl = getEl("captainName");
  const captainBusEl = getEl("captainBus");
  const captainStatusEl = getEl("captainStatus");
  const captainMobileEl = getEl("captainMobileDisplay");

  if (captainNameEl) captainNameEl.textContent = session.name || "-";
  if (captainBusEl) captainBusEl.textContent = session.busNo || "-";
  if (captainStatusEl) captainStatusEl.textContent = session.status || "-";
  if (captainMobileEl) captainMobileEl.textContent = session.mobile || "-";
}

function toggleCaptainLoginButton(isLoading) {
  const btn = getEl("captainLoginBtn");
  if (!btn) return;

  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Logging in..." : "Login";
}

function saveCaptainSession(session) {
  localStorage.setItem(CAPTAIN_SESSION_KEY, JSON.stringify(session));
}

function getSavedCaptainSession() {
  const raw = localStorage.getItem(CAPTAIN_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("❌ Failed to parse captain session:", error);
    localStorage.removeItem(CAPTAIN_SESSION_KEY);
    return null;
  }
}

function clearCaptainSession() {
  localStorage.removeItem(CAPTAIN_SESSION_KEY);
}

// ---------------------------------------------------------------
// Login
// ---------------------------------------------------------------
export async function loginCaptain() {
  console.log("--------------------------------------------------");
  console.log("🔐 loginCaptain() called");

  const mobile = getEl("captainMobile")?.value.trim();
  const pin = getEl("captainPin")?.value.trim();

  if (!mobile || !pin) {
    alert("Please enter mobile number and PIN");
    return;
  }

  try {
    toggleCaptainLoginButton(true);

    const url =
      `${APP_CONFIG.API_URL}?action=validateCaptainLogin` +
      `&mobile=${encodeURIComponent(mobile)}` +
      `&pin=${encodeURIComponent(pin)}`;

    console.log("📡 Sending captain login request:", url);

    const response = await fetch(url);
    const result = await response.json();

    console.log("📥 Captain login response:", result);

    if (!result.success) {
      alert(result.message || "Invalid mobile number or PIN");
      return;
    }

    const captainSession = {
      driverId: result.driver.driverId,
      name: result.driver.name,
      mobile: result.driver.mobile,
      busId: result.driver.busId || "",
      busNo: result.driver.busNo || "",
      status: result.driver.status || "",
      supplierName: result.driver.supplierName || "",
      tripAssignedTo: result.bus?.tripAssignedTo || "",
      busActive: result.bus?.active ?? "",
      totalSeats: result.bus?.totalSeats ?? "",
      loginTime: new Date().toISOString()
    };

    saveCaptainSession(captainSession);
    fillCaptainDashboard(captainSession);
    showCaptainDashboard();

    alert(`Welcome, ${captainSession.name}!`);

  } catch (error) {
    console.error("❌ Captain login error:", error);
    alert("Network / server error during login");
  } finally {
    toggleCaptainLoginButton(false);
    console.log("🏁 loginCaptain() completed");
    console.log("--------------------------------------------------");
  }
}

// ---------------------------------------------------------------
// Logout
// ---------------------------------------------------------------
export function logoutCaptain() {
  console.log("--------------------------------------------------");
  console.log("🚪 logoutCaptain() called");

  clearCaptainSession();
  showCaptainLogin();

  const mobileInput = getEl("captainMobile");
  const pinInput = getEl("captainPin");

  if (mobileInput) mobileInput.value = "";
  if (pinInput) pinInput.value = "";

  alert("Logged out successfully");

  console.log("🏁 logoutCaptain() completed");
  console.log("--------------------------------------------------");
}

// ---------------------------------------------------------------
// Auto Login
// ---------------------------------------------------------------
export function autoLoginCaptain() {
  console.log("--------------------------------------------------");
  console.log("🔁 autoLoginCaptain() called");

  const savedSession = getSavedCaptainSession();

  if (!savedSession) {
    console.log("ℹ️ No saved captain session found");
    showCaptainLogin();
    console.log("--------------------------------------------------");
    return;
  }

  fillCaptainDashboard(savedSession);
  showCaptainDashboard();

  console.log("✅ Captain session restored");
  console.log("--------------------------------------------------");
}

// ---------------------------------------------------------------
// Init Events
// ---------------------------------------------------------------
export function initCaptainAuth() {
  console.log("🛠️ initCaptainAuth() called");

  const loginBtn = getEl("captainLoginBtn");
  const logoutBtn = getEl("captainLogoutBtn");

  if (loginBtn) {
    loginBtn.addEventListener("click", loginCaptain);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logoutCaptain);
  }
}