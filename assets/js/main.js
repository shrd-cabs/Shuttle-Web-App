// ===============================================================
// main.js
// ---------------------------------------------------------------
// MAIN entry point of SHRD Shuttle Web App.
//
// Responsibilities:
// 1. Load HTML components dynamically
// 2. Attach global window functions
// 3. Register stub functions
// 4. Listen for component load events
// 5. Initialize route search AFTER mainContent loads
// 6. Run autoLogin
// ===============================================================


// ===============================================================
// IMPORT MODULES
// ===============================================================
import { login, signup, logout, autoLogin } from "./auth.js";
import { toggleSignupForm, switchTabUI } from "./ui.js";
import { registerStubFunctions } from "./stubs.js";
import { loadComponent } from "./componentLoader.js";
import { loadStops } from "./stops.js";
import { initSearchRoutes } from "./searchRoutes.js";

console.log("📦 Modules imported successfully");


// ===============================================================
// GLOBAL LOADER HIDE FUNCTION
// ===============================================================
function hideLoader() {
  const loader = document.getElementById("appLoader");

  if (loader) {
    loader.style.display = "none";
    console.log("✅ App loader hidden successfully");
  } else {
    console.warn("⚠️ appLoader not found");
  }
}


// ===============================================================
// ATTACH FUNCTIONS TO WINDOW (For HTML onclick support)
// ===============================================================
console.log("🔗 Attaching global functions to window...");

window.login = login;
window.signup = signup;
window.logout = logout;
window.toggleSignup = toggleSignupForm;

// switchTab requires event object
window.switchTab = function (tabName) {
  console.log(`🟣 Tab switching requested: ${tabName}`);
  switchTabUI(tabName, event);
};

console.log("✅ Window functions attached successfully");


// ===============================================================
// REGISTER STUB FUNCTIONS
// ===============================================================
console.log("🧩 Registering stub functions...");
registerStubFunctions();
console.log("✅ Stub functions registered");


// ===============================================================
// LISTEN FOR COMPONENT LOADED EVENT
// This ensures route search initializes ONLY after
// mainContent component is injected into DOM
// ===============================================================
document.addEventListener("componentLoaded", async function (e) {

  // We only care about mainContent component
  if (e.detail.id === "mainContentComponent") {

    console.log("🔥 mainContent loaded → Preparing Route Search");

    // Load stops first
    const stopsLoaded = await loadStops();

    if (stopsLoaded) {
      console.log("✅ Stops loaded → Initializing Route Search");
      initSearchRoutes();
    } else {
      console.warn("⚠️ Stops not loaded → Route search not initialized");
    }
  }
});


// ===============================================================
// MAIN APPLICATION STARTUP
// ===============================================================
document.addEventListener("DOMContentLoaded", async function () {

  console.log("🚀 DOMContentLoaded fired");
  console.log("📌 Starting component loading process...");

  // -------------------------------------------------------------
  // Load UI Components Sequentially
  // -------------------------------------------------------------
  await loadComponent("headerComponent", "./components/header.html");
  await loadComponent("loginComponent", "./components/login.html");
  await loadComponent("mainContentComponent", "./components/mainContent.html");
  await loadComponent("footerComponent", "./components/footer.html");
  await loadComponent("paymentModalComponent", "./components/paymentModal.html");
  await loadComponent("confirmationModalComponent", "./components/confirmationModal.html");

  console.log("🎉 All components loaded successfully!");

  // -------------------------------------------------------------
  // Setup Enter Key Support
  // -------------------------------------------------------------
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      await login();
    });
  }

  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      await signup();
    });
  }

  // -------------------------------------------------------------
  // Run Auto Login
  // -------------------------------------------------------------
  autoLogin();

  console.log("✅ SHRD JS MODULES LOADED SUCCESSFULLY");

  // Hide global loader
  hideLoader();

});