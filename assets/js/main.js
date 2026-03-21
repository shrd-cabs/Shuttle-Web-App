// ===============================================================
// main.js
// ---------------------------------------------------------------
// ENTRY POINT of SHRD Shuttle Web App
//
// Responsibilities
// ---------------------------------------------------------------
// 1. Import core modules
// 2. Attach global handlers required by HTML
// 3. Register development stub functions
// 4. Load UI components dynamically
// 5. Initialize Route Search after main content loads
// 6. Setup login / signup form handlers
// 7. Run auto-login
// 8. Load My Trips when user opens the tab
// 9. Hide initial app loader
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

console.log("📦 All JS modules imported successfully");



// ===============================================================
// CONFIGURATION
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
// GLOBAL UTILITIES
// ===============================================================

/**
 * Hide initial loading screen once app is ready
 */
function hideLoader() {

  const loader = document.getElementById("appLoader");

  if (!loader) {
    console.warn("⚠️ Loader element not found");
    return;
  }

  loader.style.display = "none";
  console.log("✅ App loader hidden");

}



// ===============================================================
// GLOBAL WINDOW FUNCTIONS
// ---------------------------------------------------------------
// Some HTML components still rely on inline onclick handlers.
// These functions are attached to window intentionally.
// ===============================================================

function attachGlobalFunctions() {

  console.log("🔗 Attaching global window functions...");

  window.login = login;
  window.signup = signup;
  window.logout = logout;
  window.toggleSignup = toggleSignupForm;
  window.openPaymentModal = openPaymentModal;

  /**
   * Global Tab Switch Handler
   */
  window.switchTab = function (tabName, event) {

    console.log(`🟣 Switching tab → ${tabName}`);

    // Update UI
    switchTabUI(tabName, event);

    // Load trips only when user opens My Trips tab
    if (tabName === "myTrips") {

      console.log("🧳 Loading user trips...");
      loadMyTrips();

    }

  };

  console.log("✅ Global functions attached");

}



// ===============================================================
// COMPONENT LOAD LISTENER
// ---------------------------------------------------------------
// Some features must initialize only AFTER specific
// components finish loading (example: route search UI).
// ===============================================================

function registerComponentListeners() {

  document.addEventListener("componentLoaded", async function (e) {

    const componentId = e.detail.id;

    if (componentId !== "mainContentComponent") return;

    console.log("🔥 Main content loaded → preparing route search");

    try {

      const stopsLoaded = await loadStops();

      if (!stopsLoaded) {
        console.warn("⚠️ Stops failed to load");
        return;
      }

      console.log("✅ Stops loaded → initializing route search");

      initSearchRoutes();

    } catch (error) {

      console.error("❌ Route search initialization failed", error);

    }

  });

}



// ===============================================================
// FORM EVENT HANDLERS
// ===============================================================

function setupFormHandlers() {

  const loginForm = document.getElementById("loginForm");

  if (loginForm) {

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await login();
    });

  }

  const signupForm = document.getElementById("signupForm");

  if (signupForm) {

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await signup();
    });

  }

}



// ===============================================================
// LOAD ALL COMPONENTS
// ===============================================================

async function loadAllComponents() {

  console.log("📌 Loading UI components...");

  for (const [id, path] of COMPONENTS) {

    await loadComponent(id, path);

  }

  console.log("🎉 All components loaded successfully");

}



// ===============================================================
// APPLICATION INITIALIZATION
// ===============================================================

async function initApp() {

  console.log("🚀 Starting SHRD Shuttle Web App...");

  try {

    // 1️⃣ Load UI components
    await loadAllComponents();

    // 2️⃣ Setup login/signup handlers
    setupFormHandlers();

    // 3️⃣ Attempt auto login
    autoLogin();

    console.log("✅ App initialized successfully");

  } catch (error) {

    console.error("❌ App initialization failed", error);

  } finally {

    hideLoader();

  }

}



// ===============================================================
// START APPLICATION
// ===============================================================

document.addEventListener("DOMContentLoaded", () => {

  console.log("📄 DOM ready");

  attachGlobalFunctions();
  registerStubFunctions();
  registerComponentListeners();

  initApp();

});