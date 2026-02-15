// ===============================================================
// main.js
// ---------------------------------------------------------------
// MAIN entry point of SHRD Shuttle Web App.
//
// Responsibilities:
// 1. Load HTML components dynamically (header, footer, modals, etc.)
// 2. Import and initialize JS modules
// 3. Attach required functions to "window" so HTML onclick works
// 4. Register stub functions (placeholder booking/payment functions)
// 5. Run auto-login after all components are loaded
//
// IMPORTANT:
// This file is loaded from index.html using type="module"
// ===============================================================

import { login, signup, logout, autoLogin } from "./auth.js";
import { toggleSignupForm, switchTabUI } from "./ui.js";
import { registerStubFunctions } from "./stubs.js";
import { loadComponent } from "./componentLoader.js";
import { loadStops } from "./stops.js";

console.log("📦 Modules imported successfully");

// ---------------------------------------------------------------
// Loader hide function
// ---------------------------------------------------------------
function hideLoader() {
  const loader = document.getElementById("appLoader");
  if (loader) {
    loader.style.display = "none";
    console.log("✅ Loader hidden successfully");
  } else {
    console.warn("⚠️ appLoader not found");
  }
}

// ---------------------------------------------------------------
// Attach functions to window so HTML onclick works
// ---------------------------------------------------------------
console.log("🔗 Attaching functions to window...");

window.login = login;
window.signup = signup;
window.logout = logout;

window.toggleSignup = toggleSignupForm;

// switchTab requires event object (onclick passes it automatically)
window.switchTab = function (tabName) {
  console.log(`🟣 Tab switching requested: ${tabName}`);
  switchTabUI(tabName, event);
};

console.log("✅ window functions attached successfully");

// ---------------------------------------------------------------
// Register stub functions (payment, booking, etc.)
// ---------------------------------------------------------------
console.log("🧩 Registering stub functions...");
registerStubFunctions();
console.log("✅ Stub functions registered");

// ---------------------------------------------------------------
// Load all HTML components first, then start the app
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async function () {
  console.log("🚀 DOMContentLoaded fired");
  console.log("📌 Starting component loading process...");

  // Load UI components one by one
  await loadComponent("headerComponent", "./components/header.html");
  await loadComponent("loginComponent", "./components/login.html");
  await loadComponent("mainContentComponent", "./components/mainContent.html");
  await loadComponent("footerComponent", "./components/footer.html");
  await loadComponent("paymentModalComponent", "./components/paymentModal.html");
  await loadComponent("confirmationModalComponent", "./components/confirmationModal.html");

  console.log("📍 Setting up Enter key submit support...");

  // LOGIN FORM ENTER SUPPORT
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("⌨️ Enter/Login submit triggered");
      await login();
    });
  } else {
    console.warn("⚠️ loginForm not found");
  }

  // SIGNUP FORM ENTER SUPPORT
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("⌨️ Enter/Signup submit triggered");
      await signup();
    });
  } else {
    console.warn("⚠️ signupForm not found");
  }

  // Load stops
  const stopsLoaded = await loadStops();
  if (stopsLoaded) {
    console.log("✅ Stops inserted into dropdowns");
  } else {
    console.log("⚠️ Stops were not loaded");
  }

  console.log("🎉 All components loaded successfully!");

  // Run auto login only after UI is loaded
  console.log("🔐 Running autoLogin...");
  autoLogin();

  console.log("✅ SHRD JS MODULES LOADED SUCCESSFULLY");

  // Hide loader after everything is ready
  hideLoader();
});