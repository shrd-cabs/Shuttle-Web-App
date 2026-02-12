// ===============================================================
// ui.js
// ---------------------------------------------------------------
// This file contains ONLY UI-related functions.
//
// It is responsible for:
// - Showing/hiding sections like login/main content
// - Switching tabs inside the dashboard
// - Showing signup form
//
// UI logic should stay separate from API/auth logic.
// ===============================================================

export function showMainContent() {
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("mainContent").style.display = "block";
  document.getElementById("logoutBtn").style.display = "block";
}

export function showLoginContent() {
  document.getElementById("loginSection").style.display = "block";
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("logoutBtn").style.display = "none";
}

export function toggleSignupForm() {
  const form = document.getElementById("signupForm");

  // IMPORTANT: Default display is none in HTML
  form.style.display = form.style.display === "none" ? "block" : "none";
}

export function switchTabUI(tabName, event) {
  // Remove active class from all tabs
  document.querySelectorAll(".nav-tab").forEach((tab) => tab.classList.remove("active"));

  // Remove active class from all sections
  document.querySelectorAll(".content-section").forEach((sec) => sec.classList.remove("active"));

  // Add active class to clicked tab
  event.target.classList.add("active");

  // Show the correct section
  document.getElementById(tabName + "Section")?.classList.add("active");
}
