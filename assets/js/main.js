// ===============================================================
// main.js (FINAL FIXED VERSION)
// ---------------------------------------------------------------
// ENTRY POINT of SHRD Shuttle Web App
//
// RESPONSIBILITIES
// ---------------------------------------------------------------
// 1. Load UI components dynamically
// 2. Attach global functions (for HTML onclick)
// 3. Initialize modules (routes, auth, trips)
// 4. Handle auto-login & wallet sync
// 5. Setup event listeners
// 6. Manage app lifecycle safely
//
// FIXES INCLUDED
// ---------------------------------------------------------------
// ✅ SAFE DOM handling (no crashes)
// ✅ Wallet sync only when element exists
// ✅ Works on refresh + first login
// ===============================================================


// ===============================================================
// MODULE IMPORTS
// ===============================================================
import { login, signup, logout, autoLogin } from "./auth.js";
import { toggleSignupForm, switchTabUI } from "./ui.js";
import { registerStubFunctions } from "./stubs.js";
import { loadComponent } from "./componentLoader.js";
import { loadStops } from "./stops.js";
import { initSearchRoutes } from "./searchRoutes.js";
import { loadMyTrips } from "./myTrips.js";
import { openPaymentModal } from "./payment.js";

console.log("📦 Modules loaded");


// ===============================================================
// CONFIG: COMPONENT LIST
// ===============================================================
/**
 * List of components to be loaded dynamically
 * Order matters because layout depends on it.
 */
const COMPONENTS = [
  ["headerComponent", "./components/header.html"],
  ["loginComponent", "./components/login.html"],
  ["mainContentComponent", "./components/mainContent.html"],
  ["footerComponent", "./components/footer.html"],
  ["paymentModalComponent", "./components/paymentModal.html"],
  ["confirmationModalComponent", "./components/confirmationModal.html"]
];


// ===============================================================
// UTIL: SAFE WALLET SYNC (FIXED)
// ---------------------------------------------------------------
// This function safely updates wallet UI
// - No crash if element not found
// - Works after refresh + autoLogin
// ===============================================================
function syncWalletUI() {

  console.log("🔄 Syncing wallet from main.js...");

  const userData = localStorage.getItem("currentUser");

  if (!userData) {
    console.log("ℹ️ No user found in storage");
    return;
  }

  try {

    const user = JSON.parse(userData);

    if (user.wallet_balance === undefined) {
      console.warn("⚠️ Wallet balance missing in user");
      return;
    }

    // ✅ FIX: Properly get element
    const walletAmountEl = document.getElementById("walletAmount");
    const walletBox = document.getElementById("walletBox");

    if (!walletAmountEl) {
      console.warn("⚠️ walletAmount element not found");
      return;
    }

    // ✅ Update UI
    walletAmountEl.textContent = user.wallet_balance;

    // Show wallet if hidden
    if (walletBox) {
      walletBox.style.display = "flex";
    }

    console.log("💰 Wallet synced successfully:", user.wallet_balance);

  } catch (error) {
    console.error("❌ Wallet sync failed:", error);
  }

}


// ===============================================================
// UTIL: HIDE LOADER
// ===============================================================
function hideLoader() {

  const loader = document.getElementById("appLoader");

  if (loader) {
    loader.style.display = "none";
    console.log("✅ Loader hidden");
  } else {
    console.warn("⚠️ Loader not found");
  }

}


// ===============================================================
// GLOBAL FUNCTIONS (USED IN HTML)
// ===============================================================
function attachGlobalFunctions() {

  console.log("🔗 Attaching global functions");

  Object.assign(window, {
    login,
    signup,
    logout,
    toggleSignup: toggleSignupForm,
    openPaymentModal,

    switchTab: (tabName, event) => {

      console.log(`🟣 Tab switch → ${tabName}`);

      switchTabUI(tabName, event);

      if (tabName === "myTrips") {
        console.log("🧳 Loading trips...");
        loadMyTrips();
      }
    }
  });

}


// ===============================================================
// COMPONENT EVENT LISTENER
// ---------------------------------------------------------------
// Runs when ANY component is loaded
// ===============================================================
function registerComponentListeners() {

  document.addEventListener("componentLoaded", async ({ detail }) => {

    const { id } = detail;

    console.log(`📦 Component loaded: ${id}`);

    // ===========================================================
    // HEADER LOADED → SYNC WALLET
    // ===========================================================
    if (id === "headerComponent") {

      console.log("🏦 Header ready → syncing wallet");
      syncWalletUI();

    }

    // ===========================================================
    // MAIN CONTENT → INIT ROUTES
    // ===========================================================
    if (id === "mainContentComponent") {

      try {

        console.log("🛣️ Initializing routes...");

        const stopsLoaded = await loadStops();

        if (!stopsLoaded) {
          console.warn("⚠️ Stops not loaded");
          return;
        }

        initSearchRoutes();
        console.log("✅ Route search ready");

      } catch (err) {
        console.error("❌ Route init failed", err);
      }

    }

  });

}


// ===============================================================
// FORM HANDLERS
// ===============================================================
function setupFormHandlers() {

  const bindForm = (id, handler) => {

    const form = document.getElementById(id);

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handler();
    });

  };

  bindForm("loginForm", login);
  bindForm("signupForm", signup);

}


// ===============================================================
// LOAD ALL COMPONENTS
// ===============================================================
async function loadAllComponents() {

  console.log("📌 Loading components...");

  for (const [id, path] of COMPONENTS) {
    await loadComponent(id, path);
  }

  console.log("🎉 Components loaded");

}


// ===============================================================
// APP INITIALIZATION
// ===============================================================
async function initApp() {

  console.log("🚀 Initializing App...");

  try {

    // 1️⃣ Load UI components
    await loadAllComponents();

    // 2️⃣ Setup forms
    setupFormHandlers();

    // 3️⃣ Auto login
    autoLogin();

    // 4️⃣ Extra safety wallet sync (after everything)
    setTimeout(() => {
      console.log("🔁 Final wallet sync (fallback)");
      syncWalletUI();
    }, 300);

    console.log("✅ App ready");

  } catch (error) {

    console.error("❌ App initialization failed:", error);

  } finally {

    hideLoader();

  }

}


// ===============================================================
// START APP
// ===============================================================
document.addEventListener("DOMContentLoaded", () => {

  console.log("📄 DOM Ready");

  attachGlobalFunctions();
  registerStubFunctions();
  registerComponentListeners();

  initApp();

});