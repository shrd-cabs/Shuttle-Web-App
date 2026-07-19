// ===============================================================
// config.js
// ---------------------------------------------------------------
// Central configuration for the SHRD Duty Slip frontend.
//
// This file stores:
// 1. Duty Slip Apps Script API URL
// 2. Driver session storage key
// 3. Session duration
// ===============================================================

export const CONFIG = Object.freeze({

  // =============================================================
  // DUTY SLIP APPS SCRIPT WEB APP URL
  // =============================================================
  API_URL:
    "https://script.google.com/macros/s/AKfycbwCKOb-X67TiZb6M6uahbnioiY1LJNTGSiduAO3iS91FF3jrk3ElOk2dZYH4QO_Sh-A/exec",

  // =============================================================
  // LOCAL STORAGE KEYS
  // -------------------------------------------------------------
  // Keeps the Duty Slip login separate from the main shuttle app.
  // =============================================================
  STORAGE_KEYS: Object.freeze({
    DRIVER_SESSION:
      "shrd_duty_slip_driver_session"
  }),

  // =============================================================
  // SESSION DURATION
  // -------------------------------------------------------------
  // Driver remains logged in for 12 hours.
  // =============================================================
  SESSION_DURATION_MS:
    12 * 60 * 60 * 1000
});

console.log(
  "✅ Duty Slip API configured:"
);