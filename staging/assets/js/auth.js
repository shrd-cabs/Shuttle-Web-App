// ===============================================================
// auth.js
// ---------------------------------------------------------------
// Handles Authentication System
//
// FUNCTIONS:
// ---------------------------------------------------------------
// 1. login()       → Authenticate user
// 2. signup()      → Create new account
// 3. logout()      → Clear session
// 4. autoLogin()   → Restore session
//
// NOTES:
// ---------------------------------------------------------------
// ✅ Wallet code fully removed from auth.js
// ✅ Wallet UI is now handled only by wallet.js
// ✅ Auth.js only triggers wallet sync/hide functions
// ✅ Includes comments + console logs
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { setCurrentUser, clearCurrentUser } from "./state.js";
import { showMainContent, showLoginContent } from "./ui.js";
import { syncWalletForUser, hideWalletUI } from "./wallet.js";


// ===============================================================
// HELPER: BUTTON LOADER
// ---------------------------------------------------------------
// Reusable loader for login/signup buttons
// ===============================================================
function toggleButtonLoader(button, textEl, loaderEl, isLoading, loadingText) {
  console.log("🔄 toggleButtonLoader() called", {
    isLoading,
    loadingText
  });

  if (!button || !textEl || !loaderEl) {
    console.warn("⚠️ toggleButtonLoader() missing required element");
    return;
  }

  if (!textEl.dataset.defaultText) {
    textEl.dataset.defaultText = textEl.textContent;
  }

  button.disabled = isLoading;

  textEl.textContent = isLoading
    ? loadingText
    : textEl.dataset.defaultText;

  loaderEl.style.display = isLoading ? "inline-block" : "none";

  console.log("✅ Button loader updated");
}


// ===============================================================
// LOGIN FUNCTION
// ===============================================================
export async function login() {
  console.log("--------------------------------------------------");
  console.log("🔐 login() called");

  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value.trim();

  const loginBtn = document.getElementById("loginBtn");
  const loginBtnText = document.getElementById("loginBtnText");
  const loginLoader = document.getElementById("loginLoader");

  console.log("📧 Login email:", email);

  if (!email || !password) {
    console.warn("⚠️ Email or password missing");
    alert("Enter email and password");
    return;
  }

  try {
    toggleButtonLoader(loginBtn, loginBtnText, loginLoader, true, "Logging in...");

    await new Promise((resolve) => requestAnimationFrame(resolve));

    console.log("📡 Sending validateUser request...");

    const response = await fetch(
      `${APP_CONFIG.API_URL}?action=validateUser` +
      `&email=${encodeURIComponent(email)}` +
      `&password=${encodeURIComponent(password)}`
    );

    const result = await response.json();

    console.log("📥 Login API Response:", result);

    if (result.success && result.user) {
      const user = {
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role || "user",
        wallet_balance: Number(result.user.wallet_balance || 0)
      };

      console.log("✅ User authenticated:", user);

      setCurrentUser(user);
      localStorage.setItem("currentUser", JSON.stringify(user));

      console.log("💾 currentUser saved to localStorage");

      showMainContent();
      console.log("✅ Main content shown");

      // =========================================================
      // Wallet sync is now handled only by wallet.js
      // =========================================================
      syncWalletForUser(user);

      alert(`Welcome ${user.name}!`);
    } else {
      console.warn("⚠️ Invalid login credentials");
      alert("❌ Invalid email or password");
    }

  } catch (error) {
    console.error("❌ Login Error:", error);
    alert("Network / server error");

  } finally {
    toggleButtonLoader(loginBtn, loginBtnText, loginLoader, false);
    console.log("🏁 login() completed");
    console.log("--------------------------------------------------");
  }
}


// ===============================================================
// SIGNUP FUNCTION
// ===============================================================
export async function signup() {
  console.log("--------------------------------------------------");
  console.log("📝 signup() called");

  const name = document.getElementById("signupName")?.value.trim();
  const email = document.getElementById("signupEmail")?.value.trim();
  const phone = document.getElementById("signupPhone")?.value.trim();
  const password = document.getElementById("signupPassword")?.value.trim();

  const signupBtn = document.getElementById("signupBtn");
  const signupBtnText = document.getElementById("signupBtnText");
  const signupLoader = document.getElementById("signupLoader");

  console.log("📧 Signup email:", email);

  if (!name || !email || !phone || !password) {
    console.warn("⚠️ Signup fields missing");
    alert("Fill all signup fields");
    return;
  }

  try {
    toggleButtonLoader(signupBtn, signupBtnText, signupLoader, true, "Creating...");

    await new Promise((resolve) => requestAnimationFrame(resolve));

    const params = new URLSearchParams({
      name,
      email,
      phone,
      password,
      role: "user"
    });

    console.log("📡 Sending addUser request...");

    const response = await fetch(
      `${APP_CONFIG.API_URL}?action=addUser&${params}`
    );

    const result = await response.json();

    console.log("📥 Signup API Response:", result);

    if (result.success) {
      const user = {
        name,
        email,
        phone,
        role: "user",
        wallet_balance: Number(result.wallet_balance || 0)
      };

      console.log("✅ New user created:", user);

      setCurrentUser(user);
      localStorage.setItem("currentUser", JSON.stringify(user));

      console.log("💾 currentUser saved to localStorage");

      showMainContent();
      console.log("✅ Main content shown");

      // =========================================================
      // Wallet sync is now handled only by wallet.js
      // =========================================================
      syncWalletForUser(user);

      alert(`🎉 Account created! Welcome ${name}`);
    } else {
      console.warn("⚠️ Signup failed:", result.error);
      alert("Signup failed: " + (result.error || "User exists"));
    }

  } catch (error) {
    console.error("❌ Signup Error:", error);
    alert("Signup error – check backend");

  } finally {
    toggleButtonLoader(signupBtn, signupBtnText, signupLoader, false);
    console.log("🏁 signup() completed");
    console.log("--------------------------------------------------");
  }
}


// ===============================================================
// LOGOUT FUNCTION
// ===============================================================
export function logout() {
  console.log("--------------------------------------------------");
  console.log("🚪 logout() called");

  clearCurrentUser();
  localStorage.removeItem("currentUser");

  console.log("🧹 User session cleared");

  showLoginContent();
  console.log("✅ Login screen shown");

  // =============================================================
  // Wallet hide is now handled only by wallet.js
  // =============================================================
  hideWalletUI();

  alert("Logged out successfully");

  console.log("🏁 logout() completed");
  console.log("--------------------------------------------------");
}


// ===============================================================
// AUTO LOGIN FUNCTION
// ===============================================================
export function autoLogin() {
  console.log("--------------------------------------------------");
  console.log("🔁 autoLogin() called");

  const savedUser = localStorage.getItem("currentUser");

  if (!savedUser) {
    console.log("ℹ️ No saved session found");
    console.log("--------------------------------------------------");
    return;
  }

  try {
    const user = JSON.parse(savedUser);

    console.log("✅ Saved user found:", user);

    setCurrentUser(user);
    showMainContent();

    console.log("✅ Main content restored from saved session");

    // =========================================================
    // Wallet sync is now handled only by wallet.js
    // =========================================================
    syncWalletForUser(user);

  } catch (error) {
    console.error("❌ autoLogin failed:", error);
    localStorage.removeItem("currentUser");
  }

  console.log("🏁 autoLogin() completed");
  console.log("--------------------------------------------------");
}