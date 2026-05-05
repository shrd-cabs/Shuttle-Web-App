// ===============================================================
// main.js
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
// ✅ wallet.js imported properly
// ✅ Wallet sync delegated to wallet.js only
// ✅ No duplicate wallet logic in main.js
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
import { syncWalletFromStorage } from "./wallet.js";
import "./wallet.js";
import { initTravelPass } from "./tripPasses.js";
import { loadLiveTracking } from "./liveTracking.js";

console.log("📦 Modules loaded");


// ===============================================================
// CONFIG: COMPONENT LIST
// ===============================================================
const COMPONENTS = [
  ["headerComponent", "./components/header.html"],
  ["loginComponent", "./components/login.html"],
  ["mainContentComponent", "./components/mainContent.html"],
  ["footerComponent", "./components/footer.html"]
];


// ===============================================================
// UTIL: SAFE WALLET SYNC
// ---------------------------------------------------------------
// Delegates wallet rendering to wallet.js
// ===============================================================
function syncWalletUI() {
  console.log("🔄 syncWalletUI() called from main.js");
  syncWalletFromStorage();
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

    switchTab: async (tabName, event) => {
      console.log(`🟣 Tab switch → ${tabName}`);

      // Existing UI tab switch
      switchTabUI(tabName, event);

      // Existing My Trips behavior - unchanged
      if (tabName === "myTrips") {
        console.log("🧳 Loading trips...");
        loadMyTrips();
      }

      // This is additive and does not affect existing functions
      if (tabName === "travelPass") {
        console.log("🎫 Loading travel pass module...");
        await initTravelPass();
      }

      if (tabName === "liveTracking") {
        console.log("🚍 Loading live tracking...");
        loadLiveTracking();
      }
    }
  });
}

// ===============================================================
// COMPONENT EVENT LISTENER
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

    if (!form) {
      console.warn(`⚠️ Form not found: #${id}`);
      return;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log(`📨 Form submitted: #${id}`);
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
    console.log(`📦 Loading component: ${id}`);
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

    // 4️⃣ Extra safety wallet sync
    setTimeout(() => {
      console.log("🔁 Final wallet sync fallback");
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