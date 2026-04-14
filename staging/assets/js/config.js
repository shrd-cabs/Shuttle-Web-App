// ===============================================================
// config.js
// ---------------------------------------------------------------
// Global configuration file for SHRD Shuttle Booking
//
// PURPOSE:
// ---------------------------------------------------------------
// Central place to store all reusable constants.
//
// SECURITY RULES:
// ---------------------------------------------------------------
// ✅ Safe for frontend:
//    - API_URL
//    - SCRIPT_ID
//    - Public keys (like Razorpay KEY_ID)
//
// ❌ NEVER store here:
//    - Razorpay keySecret
//    - Database credentials
//    - Any private tokens
//
// ===============================================================

export const APP_CONFIG = {

  // ============================================================
  // 📄 GOOGLE APPS SCRIPT CONFIG
  // ============================================================
  SCRIPT_ID: "AKfycbwIZE9kQ5ONEJB8ejsHknLWyllNL2pQAR8Q2lioo7KG8c4D2CW5LCO5JwZOF_rK7Ztq",
  SPREADSHEET_ID: "1AFyDz6GsimoI8CTXJYMI81W8VhyZDtRC6xLvT8_tbJE",

  // ============================================================
  // 📄 GOOGLE APPS SCRIPT CONFIG STAGING
  // ============================================================
  //SCRIPT_ID: "AKfycby-ipJy8giLt4C-jO-HAryu8swwVnseJo7Y0D7uF0Bn2ExlCrJgsbiSnEcthNalj6oXnw",
  //SPREADSHEET_ID: "1-mF84tkEqDumCUKXUxybqRf8ewYrXCkcqq4gE0-c3rg",

  // ============================================================
  // 🌐 API ENDPOINT
  // ============================================================
  API_URL: "https://script.google.com/macros/s/AKfycbwIZE9kQ5ONEJB8ejsHknLWyllNL2pQAR8Q2lioo7KG8c4D2CW5LCO5JwZOF_rK7Ztq/exec",

  // ============================================================
  // 🌐 API ENDPOINT STAGING
  // ============================================================
  //API_URL: "https://script.google.com/macros/s/AKfycby-ipJy8giLt4C-jO-HAryu8swwVnseJo7Y0D7uF0Bn2ExlCrJgsbiSnEcthNalj6oXnw/exec",

  // ============================================================
  // 💳 RAZORPAY CONFIG (PUBLIC ONLY)
  // ============================================================
  //Test key
  //RAZORPAY_KEY_ID: "rzp_test_SToJcqhAImfHOY"

  //Live key
  RAZORPAY_KEY_ID: "rzp_live_STnSll8AkTlMTl"

};
