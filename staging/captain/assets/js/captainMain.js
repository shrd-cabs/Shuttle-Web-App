// ===============================================================
// captainMain.js
// ---------------------------------------------------------------
// Entry point for SHRD Captain Panel
//
// RESPONSIBILITIES:
// 1. Load captain HTML components
// 2. Attach global functions
// 3. Setup login form handler
// 4. Restore captain session if available
// 5. Hide loader after app init
// ===============================================================

import { loadCaptainComponent } from "./captainComponentLoader.js";
import {
  loginCaptain,
  logoutCaptain,
  autoLoginCaptain,
  initCaptainAuth
} from "./captainAuth.js";
import "./captainDashboard.js";

console.log("📦 Captain modules loaded");


// ===============================================================
// COMPONENT CONFIG
// ===============================================================
const CAPTAIN_COMPONENTS = [
  ["captainHeaderComponent", "./components/captainHeader.html"],
  ["captainLoginComponent", "./components/captainLogin.html"],
  ["captainMainContentComponent", "./components/captainMainContent.html"],
  ["captainFooterComponent", "./components/captainFooter.html"]
];


// ===============================================================
// HIDE LOADER
// ===============================================================
function hideCaptainLoader() {
  const loader = document.getElementById("appLoader");

  if (loader) {
    loader.style.display = "none";
    console.log("✅ Captain loader hidden");
  } else {
    console.warn("⚠️ Captain loader not found");
  }
}


// ===============================================================
// ATTACH GLOBAL FUNCTIONS
// ===============================================================
function attachCaptainGlobalFunctions() {
  console.log("🔗 Attaching captain global functions");

  Object.assign(window, {
    loginCaptain,
    logoutCaptain
  });
}


// ===============================================================
// FORM HANDLERS
// ===============================================================
function setupCaptainFormHandlers() {
  console.log("🛠️ setupCaptainFormHandlers() called");

  const form = document.getElementById("captainLoginForm");

  if (!form) {
    console.warn("⚠️ Captain login form not found: #captainLoginForm");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("📨 Captain login form submitted");
    await loginCaptain();
  });

  console.log("✅ Captain login form handler attached");
}


// ===============================================================
// LOAD ALL COMPONENTS
// ===============================================================
async function loadAllCaptainComponents() {
  console.log("📌 Loading captain components...");

  for (const [id, path] of CAPTAIN_COMPONENTS) {
    console.log(`📦 Loading captain component: ${id} from ${path}`);
    await loadCaptainComponent(id, path);
  }

  console.log("🎉 All captain components loaded");
}


// ===============================================================
// INIT APP
// ===============================================================
async function initCaptainApp() {
  console.log("🚀 Initializing Captain App...");

  try {
    await loadAllCaptainComponents();

    initCaptainAuth();
    console.log("✅ initCaptainAuth() completed");

    setupCaptainFormHandlers();

    await autoLoginCaptain();
    console.log("✅ autoLoginCaptain() completed");

    console.log("🎉 Captain App ready");

  } catch (error) {
    console.error("❌ Captain App initialization failed:", error);

  } finally {
    hideCaptainLoader();
  }
}


// ===============================================================
// START APP
// ===============================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 Captain DOM Ready");

  attachCaptainGlobalFunctions();
  initCaptainApp();
});