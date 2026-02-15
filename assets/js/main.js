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

console.log("🔥 main.js loaded successfully");

// ---------------------------------------------------------------
// Import Modules
// ---------------------------------------------------------------
import { login, signup, logout, autoLogin } from "./auth.js";
import { toggleSignupForm, switchTabUI } from "./ui.js";
import { registerStubFunctions } from "./stubs.js";
import { loadComponent } from "./componentLoader.js";

console.log("📦 Modules imported successfully");

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

  console.log("🎉 All components loaded successfully!");

  // Run auto login only after UI is loaded
  console.log("🔐 Running autoLogin...");
  autoLogin();

  console.log("✅ SHRD JS MODULES LOADED SUCCESSFULLY");
});
