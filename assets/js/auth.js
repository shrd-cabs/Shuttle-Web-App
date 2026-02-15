// ===============================================================
// auth.js
// ---------------------------------------------------------------
// This file handles Authentication features:
//
// - login()
// - signup()
// - logout()
// - autoLogin() (keeps user logged in using localStorage)
//
// It communicates with Google Apps Script backend using fetch API.
//
// NOTE:
// All UI changes like showing/hiding login page are done using
// functions imported from ui.js.
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { setCurrentUser, clearCurrentUser } from "./state.js";
import { showMainContent, showLoginContent } from "./ui.js";

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
    // ✅ SHOW LOADER
    if (loginBtn && loginBtnText && loginLoader) {
      loginBtn.disabled = true;
      loginBtnText.textContent = "Logging in...";
      loginLoader.style.display = "inline-block";
    }

    // ✅ allow browser repaint before fetch (BEST METHOD)
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const url = `https://script.google.com/macros/s/${APP_CONFIG.SCRIPT_ID}/exec?action=validateUser&email=${encodeURIComponent(
      email
    )}&password=${encodeURIComponent(password)}`;

    const res = await fetch(url);
    const result = await res.json();

    if (result.user) {
      setCurrentUser(result.user);
      localStorage.setItem("currentUser", JSON.stringify(result.user));

      showMainContent();
      alert(`Welcome ${result.user.name}!`);
    } else {
      alert("Wrong credentials");
    }

  } catch (e) {
    console.error(e);
    alert("Network / Script error");

  } finally {
    // ✅ HIDE LOADER
    if (loginBtn && loginBtnText && loginLoader) {
      loginBtn.disabled = false;
      loginBtnText.textContent = "Login";
      loginLoader.style.display = "none";
    }
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

  const newUser = { name, email, phone, password, role: "user" };

  try {
    // ✅ SHOW LOADER
    if (signupBtn && signupBtnText && signupLoader) {
      signupBtn.disabled = true;
      signupBtnText.textContent = "Creating...";
      signupLoader.style.display = "inline-block";
    }

    // ✅ allow browser repaint before fetch (BEST METHOD)
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const params = new URLSearchParams(newUser).toString();
    const url = `https://script.google.com/macros/s/${APP_CONFIG.SCRIPT_ID}/exec?action=addUser&${params}`;

    const res = await fetch(url);
    const result = await res.json();

    if (result.success) {
      setCurrentUser(newUser);
      localStorage.setItem("currentUser", JSON.stringify(newUser));

      showMainContent();
      alert(`Account created! Welcome ${name}`);

      document.getElementById("signupForm").style.display = "none";
    } else {
      alert("Signup failed: " + (result.error || "User exists"));
    }

  } catch (e) {
    console.error(e);
    alert("Signup error – check Apps Script deployment");

  } finally {
    // ✅ HIDE LOADER
    if (signupBtn && signupBtnText && signupLoader) {
      signupBtn.disabled = false;
      signupBtnText.textContent = "Create Account";
      signupLoader.style.display = "none";
    }
  }
}

// ===================================================
// LOGOUT FUNCTION
// ===================================================
export function logout() {
  clearCurrentUser();
  localStorage.removeItem("currentUser");

  showLoginContent();
  alert("Logged out");
}

// ===================================================
// AUTO LOGIN FUNCTION
// ===================================================
export function autoLogin() {
  const savedUser = localStorage.getItem("currentUser");

  if (savedUser) {
    setCurrentUser(JSON.parse(savedUser));
    showMainContent();
  }
}