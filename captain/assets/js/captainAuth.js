// ===============================================================
// captainAuth.js
// ---------------------------------------------------------------
// Captain authentication module
// ===============================================================

import { APP_CONFIG } from "/assets/js/config.js";
import { loadCaptainDashboard } from "./captainDashboard.js";
import { showCaptainMainContent, showCaptainLoginContent } from "./captainUi.js";

const CAPTAIN_SESSION_KEY = "captainSession";

// ===============================================================
// HELPER: BUTTON LOADER
// ===============================================================
function toggleCaptainButtonLoader(button, textEl, loaderEl, isLoading, loadingText) {
  console.log("🔄 toggleCaptainButtonLoader() called", { isLoading, loadingText });

  if (!button || !textEl || !loaderEl) {
    console.warn("⚠️ toggleCaptainButtonLoader() missing required element");
    return;
  }

  if (!textEl.dataset.defaultText) {
    textEl.dataset.defaultText = textEl.textContent;
  }

  button.disabled = isLoading;
  textEl.textContent = isLoading ? loadingText : textEl.dataset.defaultText;
  loaderEl.style.display = isLoading ? "inline-block" : "none";
}

// ===============================================================
// HEADER UI HELPERS
// ===============================================================
function showCaptainHeader(session) {
  console.log("👨‍✈️ showCaptainHeader() called", session);

  const captainInfoBox = document.getElementById("captainInfoBox");
  const captainHeaderName = document.getElementById("captainHeaderName");
  const captainLogoutBtn = document.getElementById("captainLogoutBtn");

  if (captainInfoBox) captainInfoBox.style.display = "flex";
  if (captainHeaderName) captainHeaderName.textContent = session.name || "Captain";
  if (captainLogoutBtn) captainLogoutBtn.style.display = "inline-block";
}

function hideCaptainHeader() {
  console.log("🙈 hideCaptainHeader() called");

  const captainInfoBox = document.getElementById("captainInfoBox");
  const captainLogoutBtn = document.getElementById("captainLogoutBtn");

  if (captainInfoBox) captainInfoBox.style.display = "none";
  if (captainLogoutBtn) captainLogoutBtn.style.display = "none";
}

// ===============================================================
// FILL HEADER / DASHBOARD FIELDS
// ===============================================================
function fillCaptainHeaderFields(session) {
  console.log("🧾 fillCaptainHeaderFields() called", session);

  const captainNameEl = document.getElementById("captainName");
  const captainMobileEl = document.getElementById("captainMobileDisplay");
  const captainBusEl = document.getElementById("captainBus");
  const captainStatusEl = document.getElementById("captainStatus");

  if (captainNameEl) captainNameEl.textContent = session.name || "-";
  if (captainMobileEl) captainMobileEl.textContent = session.mobile || "-";
  if (captainBusEl) captainBusEl.textContent = session.busNo || "-";
  if (captainStatusEl) captainStatusEl.textContent = session.status || "-";
}

// ===============================================================
// STORAGE HELPERS
// ===============================================================
function clearCaptainSession() {
  console.log("🧹 clearCaptainSession() called");
  localStorage.removeItem(CAPTAIN_SESSION_KEY);
}

function saveCaptainSession(session) {
  console.log("💾 saveCaptainSession() called", session);
  localStorage.setItem(CAPTAIN_SESSION_KEY, JSON.stringify(session));
}

export function getCaptainSession() {
  const raw = localStorage.getItem(CAPTAIN_SESSION_KEY);

  if (!raw) {
    console.log("ℹ️ No saved captain session found");
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    console.log("✅ Captain session restored from localStorage", parsed);
    return parsed;
  } catch (error) {
    console.error("❌ Failed to parse captain session:", error);
    localStorage.removeItem(CAPTAIN_SESSION_KEY);
    return null;
  }
}

// ===============================================================
// LOGIN FUNCTION
// ===============================================================
export async function loginCaptain() {
  console.log("--------------------------------------------------");
  console.log("🔐 loginCaptain() called");

  const mobile = document.getElementById("captainMobile")?.value.trim();
  const pin = document.getElementById("captainPin")?.value.trim();

  const loginBtn = document.getElementById("captainLoginBtn");
  const loginBtnText = document.getElementById("captainLoginBtnText");
  const loginLoader = document.getElementById("captainLoginLoader");

  if (!mobile || !pin) {
    console.warn("⚠️ Mobile or PIN missing");
    alert("Enter mobile number and PIN");
    return;
  }

  try {
    toggleCaptainButtonLoader(loginBtn, loginBtnText, loginLoader, true, "Logging in...");

    const url =
      `${APP_CONFIG.API_URL}?action=validateCaptainLogin` +
      `&mobile=${encodeURIComponent(mobile)}` +
      `&pin=${encodeURIComponent(pin)}`;

    console.log("📡 Captain Login API URL:", url);

    const response = await fetch(url);
    const result = await response.json();

    console.log("📥 Captain Login API Response:", result);

    if (result.success && result.driver) {
      const captainSession = {
        driverId: result.driver.driverId || "",
        name: result.driver.name || "",
        mobile: result.driver.mobile || "",
        busId: result.driver.busId || "",
        busNo: result.driver.busNo || "",
        status: result.driver.status || "",
        supplierName: result.driver.supplierName || "",
        loginTime: new Date().toISOString()
      };

      saveCaptainSession(captainSession);
      fillCaptainHeaderFields(captainSession);
      showCaptainHeader(captainSession);
      showCaptainMainContent();

      await loadCaptainDashboard();

      alert(`Welcome ${captainSession.name}!`);
    } else {
      alert(result.message || "Invalid mobile number or PIN");
    }

  } catch (error) {
    console.error("❌ Captain Login Error:", error);
    alert("Network / server error");

  } finally {
    toggleCaptainButtonLoader(loginBtn, loginBtnText, loginLoader, false);
    console.log("🏁 loginCaptain() completed");
    console.log("--------------------------------------------------");
  }
}

// ===============================================================
// LOGOUT FUNCTION
// ===============================================================
export function logoutCaptain() {
  console.log("--------------------------------------------------");
  console.log("🚪 logoutCaptain() called");

  clearCaptainSession();

  const mobileInput = document.getElementById("captainMobile");
  const pinInput = document.getElementById("captainPin");

  if (mobileInput) mobileInput.value = "";
  if (pinInput) pinInput.value = "";

  hideCaptainHeader();
  showCaptainLoginContent();

  alert("Logged out successfully");

  console.log("🏁 logoutCaptain() completed");
  console.log("--------------------------------------------------");
}

// ===============================================================
// AUTO LOGIN FUNCTION
// ===============================================================
export async function autoLoginCaptain() {
  console.log("--------------------------------------------------");
  console.log("🔁 autoLoginCaptain() called");

  const savedSession = getCaptainSession();

  if (!savedSession) {
    showCaptainLoginContent();
    console.log("--------------------------------------------------");
    return;
  }

  fillCaptainHeaderFields(savedSession);
  showCaptainHeader(savedSession);
  showCaptainMainContent();
  await loadCaptainDashboard();

  console.log("✅ Captain session restored");
  console.log("🏁 autoLoginCaptain() completed");
  console.log("--------------------------------------------------");
}

// ===============================================================
// INIT FUNCTION
// ===============================================================
export function initCaptainAuth() {
  console.log("🛠️ initCaptainAuth() called");
}