// ===============================================================
// ui.js
// ---------------------------------------------------------------
// Contains ONLY UI related functions
//
// Responsibilities:
// - Show/hide login and main content
// - Toggle signup form
// - Switch dashboard tabs
// ===============================================================



// ===============================================================
// SHOW MAIN APP AFTER LOGIN
// ===============================================================
export function showMainContent() {

  document.getElementById("loginSection").style.display = "none";
  document.getElementById("mainContent").style.display = "block";
  document.getElementById("logoutBtn").style.display = "block";

}



// ===============================================================
// SHOW LOGIN SCREEN
// ===============================================================
export function showLoginContent() {

  document.getElementById("loginSection").style.display = "block";
  document.getElementById("mainContent").style.display = "none";
  document.getElementById("logoutBtn").style.display = "none";

}



// ===============================================================
// TOGGLE SIGNUP FORM
// ===============================================================
export function toggleSignupForm() {

  const form = document.getElementById("signupForm");

  form.style.display =
    form.style.display === "none" ? "block" : "none";

}



// ===============================================================
// SWITCH DASHBOARD TABS
// (Booking / MyTrips etc)
// ===============================================================
export function switchTabUI(tabName) {

  // Remove active class from all nav tabs
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.classList.remove("active");
  });

  // Hide all sections
  document.querySelectorAll(".content-section").forEach(section => {
    section.classList.remove("active");
  });

  // Activate correct tab button
  const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeTab) activeTab.classList.add("active");

  // Show correct section
  const section = document.getElementById(tabName + "Section");
  if (section) section.classList.add("active");

}