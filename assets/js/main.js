// ===============================================================
// main.js
// ---------------------------------------------------------------
// This is the MAIN entry point for the whole project.
//
// GitHub Pages loads this file from index.html.
//
// Responsibilities:
// - Import modules (auth/ui/stubs/etc.)
// - Attach required functions to "window" so HTML onclick works
// - Setup auto-login on page load
// - Setup default behaviors like tabs
//
// IMPORTANT:
// We attach functions to window because index.html calls them
// directly using onclick="login()" style.
// ===============================================================

import { login, signup, logout, autoLogin } from "./auth.js";
import { toggleSignupForm, switchTabUI } from "./ui.js";
import { registerStubFunctions } from "./stubs.js";

// ---------------------------------------------------------------
// Expose authentication functions to HTML (onclick handlers)
// ---------------------------------------------------------------
window.login = login;
window.signup = signup;
window.logout = logout;

// ---------------------------------------------------------------
// Expose UI helper functions to HTML
// ---------------------------------------------------------------
window.toggleSignup = toggleSignupForm;

// IMPORTANT: switchTab uses event so we must pass it properly
window.switchTab = function (tabName) {
  switchTabUI(tabName, event);
};

// ---------------------------------------------------------------
// Register placeholder functions (payment, booking, etc.)
// ---------------------------------------------------------------
registerStubFunctions();

// ---------------------------------------------------------------
// Auto-login if user is already saved in localStorage
// ---------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
  autoLogin();
  console.log("✅ SHRD JS MODULES LOADED SUCCESSFULLY");
});
