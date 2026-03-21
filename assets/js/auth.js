// ===============================================================
// auth.js
// ---------------------------------------------------------------
// Handles Authentication:
//
// - login()
// - signup()
// - logout()
// - autoLogin()
//
// Improvements:
// ✅ Uses central API_URL (cleaner)
// ✅ Stores full user object (name, email, phone, role)
// ✅ Better error handling
// ✅ Cleaner loader handling
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { setCurrentUser, clearCurrentUser } from "./state.js";
import { showMainContent, showLoginContent } from "./ui.js";


// ===================================================
// HELPER: TOGGLE BUTTON LOADER
// ===================================================
function toggleButtonLoader(button, textEl, loaderEl, isLoading, loadingText) {
  if (!button || !textEl || !loaderEl) return;

  button.disabled = isLoading;
  textEl.textContent = isLoading ? loadingText : textEl.dataset.defaultText;
  loaderEl.style.display = isLoading ? "inline-block" : "none";
}


// ===================================================
// LOGIN FUNCTION
// ===================================================
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

    console.log("🔐 Logging in...");

    // Save default text (for reset later)
    if (loginBtnText && !loginBtnText.dataset.defaultText) {
      loginBtnText.dataset.defaultText = loginBtnText.textContent;
    }

    toggleButtonLoader(loginBtn, loginBtnText, loginLoader, true, "Logging in...");

    await new Promise((resolve) => requestAnimationFrame(resolve));

    // ✅ CLEAN API CALL
    const response = await fetch(
      `${APP_CONFIG.API_URL}?action=validateUser` +
      `&email=${encodeURIComponent(email)}` +
      `&password=${encodeURIComponent(password)}`
    );

    const result = await response.json();

    console.log("📥 Login Response:", result);

    if (result.user) {

      // ✅ STORE FULL USER OBJECT
      const user = {
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role || "user"
      };

      setCurrentUser(user);
      localStorage.setItem("currentUser", JSON.stringify(user));

      showMainContent();

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


// ===================================================
// SIGNUP FUNCTION
// ===================================================
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

    console.log("📝 Creating account...");

    // Save default text
    if (signupBtnText && !signupBtnText.dataset.defaultText) {
      signupBtnText.dataset.defaultText = signupBtnText.textContent;
    }

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

    console.log("📥 Signup Response:", result);

    if (result.success) {

      // ✅ STORE USER IMMEDIATELY
      const user = { name, email, phone, role: "user" };

      setCurrentUser(user);
      localStorage.setItem("currentUser", JSON.stringify(user));

      showMainContent();

      alert(`🎉 Account created! Welcome ${name}`);

      // Hide signup form
      const signupForm = document.getElementById("signupForm");
      if (signupForm) signupForm.style.display = "none";

    } else {
      alert("Signup failed: " + (result.error || "User already exists"));
    }

  } catch (error) {

    console.error("❌ Signup Error:", error);
    alert("Signup error – check backend");

  } finally {

    toggleButtonLoader(signupBtn, signupBtnText, signupLoader, false);

  }
}


// ===================================================
// LOGOUT FUNCTION
// ===================================================
export function logout() {

  console.log("🚪 Logging out...");

  clearCurrentUser();
  localStorage.removeItem("currentUser");

  showLoginContent();

  alert("Logged out successfully");

}


// ===================================================
// AUTO LOGIN FUNCTION
// ===================================================
export function autoLogin() {

  const savedUser = localStorage.getItem("currentUser");

  if (!savedUser) return;

  try {

    const user = JSON.parse(savedUser);

    console.log("🔁 Auto login:", user);

    setCurrentUser(user);
    showMainContent();

  } catch (error) {

    console.error("❌ AutoLogin failed:", error);
    localStorage.removeItem("currentUser");

  }
}