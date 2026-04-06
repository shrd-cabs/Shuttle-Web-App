// ===============================================================
// captainMain.js
// ---------------------------------------------------------------
// ENTRY POINT of SHRD Captain Panel
//
// RESPONSIBILITIES
// ---------------------------------------------------------------
// 1. Load captain UI components dynamically
// 2. Attach global functions (if needed for HTML onclick)
// 3. Initialize captain auth
// 4. Handle auto-login
// 5. Manage captain app lifecycle safely
// ===============================================================


// ===============================================================
// MODULE IMPORTS
// ===============================================================
import { loadCaptainComponent } from "./captainComponentLoader.js";
import {
  loginCaptain,
  logoutCaptain,
  autoLoginCaptain,
  initCaptainAuth
} from "./captainAuth.js";

console.log("📦 Captain modules loaded");


// ===============================================================
// CONFIG: COMPONENT LIST
// ===============================================================
const CAPTAIN_COMPONENTS = [
  ["captainHeaderComponent", "./components/captainHeader.html"],
  ["captainLoginComponent", "./components/captainLogin.html"],
  ["captainMainContentComponent", "./components/captainMainContent.html"],
  ["captainFooterComponent", "./components/captainFooter.html"]
];


// ===============================================================
// UTIL: HIDE LOADER
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
// GLOBAL FUNCTIONS (USED IN HTML IF NEEDED)
// ===============================================================
function attachCaptainGlobalFunctions() {
  console.log("🔗 Attaching captain global functions");

  Object.assign(window, {
    loginCaptain,
    logoutCaptain
  });
}


// ===============================================================
// COMPONENT EVENT LISTENER
// ===============================================================
function registerCaptainComponentListeners() {
  document.addEventListener("captainComponentLoaded", ({ detail }) => {
    const { id } = detail;
    console.log(`📦 Captain component loaded: ${id}`);
  });
}


// ===============================================================
// FORM HANDLERS
// ===============================================================
function setupCaptainFormHandlers() {
  const bindForm = (id, handler) => {
    const form = document.getElementById(id);

    if (!form) {
      console.warn(`⚠️ Captain form not found: #${id}`);
      return;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log(`📨 Captain form submitted: #${id}`);
      await handler();
    });
  };

  bindForm("captainLoginForm", loginCaptain);
}


// ===============================================================
// LOAD ALL COMPONENTS
// ===============================================================
async function loadAllCaptainComponents() {
  console.log("📌 Loading captain components...");

  for (const [id, path] of CAPTAIN_COMPONENTS) {
    console.log(`📦 Loading captain component: ${id}`);
    await loadCaptainComponent(id, path);
  }

  console.log("🎉 Captain components loaded");
}


// ===============================================================
// APP INITIALIZATION
// ===============================================================
async function initCaptainApp() {
  console.log("🚀 Initializing Captain App...");

  try {
    // 1️⃣ Load UI components
    await loadAllCaptainComponents();

    // 2️⃣ Setup captain auth
    initCaptainAuth();

    // 3️⃣ Setup forms
    setupCaptainFormHandlers();

    // 4️⃣ Auto login
    autoLoginCaptain();

    console.log("✅ Captain App ready");

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
  registerCaptainComponentListeners();

  initCaptainApp();
});