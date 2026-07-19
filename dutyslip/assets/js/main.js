// ===============================================================
// main.js
// ---------------------------------------------------------------
// Main entry point for the SHRD Duty Slip frontend.
//
// Startup flow:
// 1. Wait for the document.
// 2. Load all HTML components.
// 3. Initialize driver authentication.
// 4. Hide the application loader.
// ===============================================================

import {
  loadDutySlipComponents
} from "./componentLoader.js";

import {
  initializeDriverAuthentication
} from "./auth.js";


// ===============================================================
// INITIALIZE APPLICATION
// ===============================================================

async function initializeDutySlipApplication() {
  const applicationLoader =
    document.getElementById("appLoader");

  try {
    // Load header, login, dashboard and footer.
    await loadDutySlipComponents();

    // Attach login, session and logout functionality.
    initializeDriverAuthentication();

  } catch (error) {
    console.error(
      "Duty Slip application failed to initialize:",
      error
    );

    showApplicationError();

  } finally {
    // Hide the loader regardless of success or failure.
    if (applicationLoader) {
      applicationLoader.style.display = "none";
    }
  }
}


// ===============================================================
// DISPLAY APPLICATION ERROR
// ===============================================================

function showApplicationError() {
  document.body.innerHTML = `
    <main class="duty-app-error-screen">
      <section class="duty-app-error-card">
        <div class="duty-app-error-icon">⚠️</div>

        <h2>Unable to load Duty Slip Portal</h2>

        <p>
          Please refresh the page and try again.
        </p>

        <button
          type="button"
          class="btn btn-primary"
          onclick="window.location.reload()"
        >
          Refresh Page
        </button>
      </section>
    </main>
  `;
}


// ===============================================================
// START AFTER HTML DOCUMENT IS READY
// ===============================================================

document.addEventListener(
  "DOMContentLoaded",
  initializeDutySlipApplication
);