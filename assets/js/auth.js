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
// NEW FEATURES:
// ---------------------------------------------------------------
// ✅ Wallet UI sync (fixed)
// ✅ Handles dynamic DOM (header loads later)
// ✅ Shows wallet after login
// ✅ Full debug logs
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { setCurrentUser, clearCurrentUser } from "./state.js";
import { showMainContent, showLoginContent } from "./ui.js";


// ===============================================================
// HELPER: BUTTON LOADER
// ===============================================================
function toggleButtonLoader(button, textEl, loaderEl, isLoading, loadingText) {

  if (!button || !textEl || !loaderEl) return;

  if (!textEl.dataset.defaultText) {
    textEl.dataset.defaultText = textEl.textContent;
  }

  button.disabled = isLoading;

  textEl.textContent = isLoading
    ? loadingText
    : textEl.dataset.defaultText;

  loaderEl.style.display = isLoading ? "inline-block" : "none";
}



// ===============================================================
// HELPER: WAIT FOR ELEMENT
// ---------------------------------------------------------------
// Fixes dynamic component issue (header loads later)
// ===============================================================
function waitForElement(id, callback) {

  const el = document.getElementById(id);

  if (el) {
    console.log(`✅ Element found instantly: #${id}`);
    return callback(el);
  }

  console.warn(`⚠️ Element #${id} not found, waiting...`);

  const observer = new MutationObserver(() => {

    const el = document.getElementById(id);

    if (el) {
      console.log(`✅ Element appeared: #${id}`);
      observer.disconnect();
      callback(el);
    }

  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}



// ===============================================================
// UPDATE WALLET UI (FINAL FIXED)
// ===============================================================
function updateWalletUI(balance) {

  console.log("💰 Updating wallet UI... Balance:", balance);

  waitForElement("walletAmount", (el) => {

    // Set balance
    el.textContent = `₹${balance}`;

    console.log("💰 Wallet value set:", balance);

    // Show wallet box
    const walletBox = document.getElementById("walletBox");

    if (walletBox) {
      walletBox.style.display = "flex";
      console.log("👁️ Wallet box made visible");
    } else {
      console.warn("⚠️ walletBox not found");
    }

    // Show logout button (optional safety)
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.style.display = "block";

  });
}



// ===============================================================
// LOGIN FUNCTION
// ===============================================================
export async function login() {

  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value.trim();

  const loginBtn = document.getElementById("loginBtn");
  const loginBtnText = document.getElementById("loginBtnText");
  const loginLoader = document.getElementById("loginLoader");

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  try {

    console.log("🔐 Logging in user:", email);

    toggleButtonLoader(loginBtn, loginBtnText, loginLoader, true, "Logging in...");

    await new Promise((resolve) => requestAnimationFrame(resolve));

    // API CALL
    const response = await fetch(
      `${APP_CONFIG.API_URL}?action=validateUser` +
      `&email=${encodeURIComponent(email)}` +
      `&password=${encodeURIComponent(password)}`
    );

    const result = await response.json();

    console.log("📥 Login API Response:", result);

    // SUCCESS
    if (result.success && result.user) {

      const user = {
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role || "user",
        wallet_balance: result.user.wallet_balance || 0
      };

      console.log("👤 User authenticated:", user);

      setCurrentUser(user);
      localStorage.setItem("currentUser", JSON.stringify(user));

      showMainContent();

      // ✅ Wallet update (safe)
      updateWalletUI(user.wallet_balance);

      alert(`Welcome ${user.name}!`);

    } else {
      alert("❌ Invalid email or password");
    }

  } catch (error) {

    console.error("❌ Login Error:", error);
    alert("Network / server error");

  } finally {

    toggleButtonLoader(loginBtn, loginBtnText, loginLoader, false);

  }
}



// ===============================================================
// SIGNUP FUNCTION
// ===============================================================
export async function signup() {

  const name = document.getElementById("signupName")?.value.trim();
  const email = document.getElementById("signupEmail")?.value.trim();
  const phone = document.getElementById("signupPhone")?.value.trim();
  const password = document.getElementById("signupPassword")?.value.trim();

  const signupBtn = document.getElementById("signupBtn");
  const signupBtnText = document.getElementById("signupBtnText");
  const signupLoader = document.getElementById("signupLoader");

  if (!name || !email || !phone || !password) {
    alert("Fill all signup fields");
    return;
  }

  try {

    console.log("📝 Creating account for:", email);

    toggleButtonLoader(signupBtn, signupBtnText, signupLoader, true, "Creating...");

    await new Promise((resolve) => requestAnimationFrame(resolve));

    const params = new URLSearchParams({
      name,
      email,
      phone,
      password,
      role: "user"
    });

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
        wallet_balance: result.wallet_balance || 0
      };

      console.log("👤 New user created:", user);

      setCurrentUser(user);
      localStorage.setItem("currentUser", JSON.stringify(user));

      showMainContent();

      // ✅ Wallet update
      updateWalletUI(user.wallet_balance);

      alert(`🎉 Account created! Welcome ${name}`);

    } else {
      alert("Signup failed: " + (result.error || "User exists"));
    }

  } catch (error) {

    console.error("❌ Signup Error:", error);
    alert("Signup error – check backend");

  } finally {

    toggleButtonLoader(signupBtn, signupBtnText, signupLoader, false);

  }
}



// ===============================================================
// LOGOUT FUNCTION
// ===============================================================
export function logout() {

  console.log("🚪 Logging out...");

  clearCurrentUser();
  localStorage.removeItem("currentUser");

  showLoginContent();

  alert("Logged out successfully");
}



// ===============================================================
// AUTO LOGIN FUNCTION
// ===============================================================
export function autoLogin() {

  const savedUser = localStorage.getItem("currentUser");

  if (!savedUser) {
    console.log("ℹ️ No saved session found");
    return;
  }

  try {

    const user = JSON.parse(savedUser);

    console.log("🔁 Auto login user:", user);

    setCurrentUser(user);
    showMainContent();

    // ✅ Restore wallet
    updateWalletUI(user.wallet_balance || 0);

  } catch (error) {

    console.error("❌ AutoLogin failed:", error);
    localStorage.removeItem("currentUser");

  }
}