// ===============================================================
// auth.js
// ---------------------------------------------------------------
// Handles Duty Slip driver authentication.
//
// Responsibilities:
// 1. Read mobile number and password.
// 2. Validate frontend input.
// 3. Send login request to Apps Script.
// 4. Save logged-in driver session.
// 5. Restore session after page refresh.
// 6. Show dashboard after successful login.
// 7. Handle logout.
// ===============================================================

import { CONFIG } from "./config.js";


// ===============================================================
// INITIALIZE DRIVER AUTHENTICATION
// ---------------------------------------------------------------
// Called after all HTML components have loaded.
// ===============================================================

export function initializeDriverAuthentication() {
  const loginForm =
    document.getElementById("driverLoginForm");

  const logoutButton =
    document.getElementById("logoutBtn");

  const passwordToggleButton =
    document.getElementById("togglePasswordBtn");

  const mobileInput =
    document.getElementById("driverMobile");

  // Handle login form submission.
  loginForm?.addEventListener(
    "submit",
    handleDriverLogin
  );

  // Handle logout.
  logoutButton?.addEventListener(
    "click",
    logoutDriver
  );

  // Show or hide password.
  passwordToggleButton?.addEventListener(
    "click",
    togglePasswordVisibility
  );

  // Allow only digits in the mobile-number input.
  mobileInput?.addEventListener(
    "input",
    function () {
      this.value = normalizeMobileNumber(
        this.value
      ).slice(0, 10);
    }
  );

  // Check whether the driver already has a valid session.
  restoreDriverSession();
}


// ===============================================================
// HANDLE DRIVER LOGIN
// ===============================================================

async function handleDriverLogin(event) {
  event.preventDefault();

  const mobileInput =
    document.getElementById("driverMobile");

  const passwordInput =
    document.getElementById("driverPassword");

  const mobile = normalizeMobileNumber(
    mobileInput?.value
  );

  const password =
    passwordInput?.value.trim() || "";

  hideLoginError();

  // =============================================================
  // FRONTEND VALIDATION
  // =============================================================

  if (!isValidIndianMobile(mobile)) {
    showLoginError(
      "Please enter a valid 10-digit mobile number."
    );

    mobileInput?.focus();
    return;
  }

  if (!password) {
    showLoginError(
      "Please enter your password."
    );

    passwordInput?.focus();
    return;
  }

  if (
    !CONFIG.API_URL ||
    CONFIG.API_URL.includes("PASTE_")
  ) {
    showLoginError(
      "Duty Slip API URL has not been configured."
    );

    return;
  }

  setLoginLoading(true);

  try {
    // ===========================================================
    // PREPARE FORM DATA
    // -----------------------------------------------------------
    // Apps Script receives these values through e.parameter.
    // ===========================================================

    const requestBody =
      new URLSearchParams();

    requestBody.set(
      "action",
      "validateDriverLogin"
    );

    requestBody.set(
      "mobile",
      mobile
    );

    requestBody.set(
      "password",
      password
    );

    // ===========================================================
    // SEND LOGIN REQUEST
    // ===========================================================

    const response = await fetch(
      CONFIG.API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded;charset=UTF-8"
        },

        body: requestBody.toString()
      }
    );

    if (!response.ok) {
      throw new Error(
        `Server returned HTTP ${response.status}`
      );
    }

    const result =
      await response.json();

    // ===========================================================
    // HANDLE FAILED LOGIN
    // ===========================================================

    if (
      !result.success ||
      !result.driver
    ) {
      showLoginError(
        result.error ||
        "Invalid mobile number or password."
      );

      return;
    }

    // ===========================================================
    // HANDLE SUCCESSFUL LOGIN
    // ===========================================================

    saveDriverSession(result.driver);

    showDriverDashboard(
      result.driver
    );

    // Clear password after successful login.
    if (passwordInput) {
      passwordInput.value = "";
    }

  } catch (error) {
    console.error(
      "Driver login failed:",
      error
    );

    showLoginError(
      "Unable to connect to the server. Please try again."
    );

  } finally {
    setLoginLoading(false);
  }
}


// ===============================================================
// SAVE DRIVER SESSION
// ---------------------------------------------------------------
// Only safe driver details are stored.
//
// Password is never stored in localStorage.
// ===============================================================

function saveDriverSession(driver) {
  const session = {
    driver: driver,
    login_time: Date.now()
  };

  localStorage.setItem(
    CONFIG.STORAGE_KEYS.DRIVER_SESSION,
    JSON.stringify(session)
  );
}


// ===============================================================
// RESTORE DRIVER SESSION
// ---------------------------------------------------------------
// Called whenever the page loads.
//
// The session is rejected when:
// - Stored data is invalid.
// - Session is older than 12 hours.
// - Driver role is not DRIVER.
// - Driver status is not ACTIVE.
// ===============================================================

function restoreDriverSession() {
  try {
    const storedSession =
      localStorage.getItem(
        CONFIG.STORAGE_KEYS.DRIVER_SESSION
      );

    if (!storedSession) {
      showDriverLogin();
      return;
    }

    const session =
      JSON.parse(storedSession);

    if (
      !session ||
      !session.driver ||
      !session.login_time
    ) {
      clearDriverSession();
      showDriverLogin();
      return;
    }

    const sessionAge =
      Date.now() - Number(session.login_time);

    if (
      sessionAge >
      CONFIG.SESSION_DURATION_MS
    ) {
      clearDriverSession();
      showDriverLogin();
      return;
    }

    const role =
      String(
        session.driver.role || ""
      ).toUpperCase();

    const status =
      String(
        session.driver.status || ""
      ).toUpperCase();

    if (
      role !== "DRIVER" ||
      status !== "ACTIVE"
    ) {
      clearDriverSession();
      showDriverLogin();
      return;
    }

    showDriverDashboard(
      session.driver
    );

  } catch (error) {
    console.error(
      "Unable to restore driver session:",
      error
    );

    clearDriverSession();
    showDriverLogin();
  }
}


// ===============================================================
// SHOW DRIVER DASHBOARD
// ===============================================================

function showDriverDashboard(driver) {
  const loginSection =
    document.getElementById(
      "driverLoginSection"
    );

  const dashboard =
    document.getElementById(
      "driverDashboard"
    );

  const logoutButton =
    document.getElementById(
      "logoutBtn"
    );

  const headerInfo =
    document.getElementById(
      "driverHeaderInfo"
    );

  // Hide login screen.
  if (loginSection) {
    loginSection.style.display = "none";
  }

  // Show dashboard.
  if (dashboard) {
    dashboard.style.display = "block";
  }

  // Show logout button.
  if (logoutButton) {
    logoutButton.style.display = "inline-flex";
  }

  // Show driver name in header.
  if (headerInfo) {
    headerInfo.style.display = "flex";
  }

  setElementText(
    "headerDriverName",
    driver.name || "Driver"
  );

  setElementText(
    "dashboardDriverName",
    driver.name || "Driver"
  );

  setElementText(
    "dashboardDriverMobile",
    driver.mobile
      ? `Mobile: ${driver.mobile}`
      : "Mobile: Not available"
  );

  setElementText(
    "dashboardVendorName",
    driver.vendor_name
      ? `Vendor: ${driver.vendor_name}`
      : "Vendor: Not assigned"
  );
}


// ===============================================================
// SHOW DRIVER LOGIN
// ===============================================================

function showDriverLogin() {
  const loginSection =
    document.getElementById(
      "driverLoginSection"
    );

  const dashboard =
    document.getElementById(
      "driverDashboard"
    );

  const logoutButton =
    document.getElementById(
      "logoutBtn"
    );

  const headerInfo =
    document.getElementById(
      "driverHeaderInfo"
    );

  if (loginSection) {
    loginSection.style.display = "block";
  }

  if (dashboard) {
    dashboard.style.display = "none";
  }

  if (logoutButton) {
    logoutButton.style.display = "none";
  }

  if (headerInfo) {
    headerInfo.style.display = "none";
  }
}


// ===============================================================
// LOGOUT DRIVER
// ===============================================================

function logoutDriver() {
  clearDriverSession();

  const loginForm =
    document.getElementById(
      "driverLoginForm"
    );

  loginForm?.reset();

  hideLoginError();
  showDriverLogin();

  document
    .getElementById("driverMobile")
    ?.focus();
}


// ===============================================================
// CLEAR DRIVER SESSION
// ===============================================================

function clearDriverSession() {
  localStorage.removeItem(
    CONFIG.STORAGE_KEYS.DRIVER_SESSION
  );
}


// ===============================================================
// LOGIN BUTTON LOADING STATE
// ===============================================================

function setLoginLoading(isLoading) {
  const loginButton =
    document.getElementById(
      "driverLoginBtn"
    );

  const buttonText =
    document.getElementById(
      "driverLoginBtnText"
    );

  const loader =
    document.getElementById(
      "driverLoginLoader"
    );

  if (loginButton) {
    loginButton.disabled = isLoading;
  }

  if (buttonText) {
    buttonText.textContent =
      isLoading
        ? "Logging in..."
        : "Login";
  }

  if (loader) {
    loader.style.display =
      isLoading
        ? "inline-block"
        : "none";
  }
}


// ===============================================================
// DISPLAY LOGIN ERROR
// ===============================================================

function showLoginError(message) {
  const errorElement =
    document.getElementById(
      "driverLoginError"
    );

  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
  errorElement.style.display = "block";
}


// ===============================================================
// HIDE LOGIN ERROR
// ===============================================================

function hideLoginError() {
  const errorElement =
    document.getElementById(
      "driverLoginError"
    );

  if (!errorElement) {
    return;
  }

  errorElement.textContent = "";
  errorElement.style.display = "none";
}


// ===============================================================
// PASSWORD VISIBILITY
// ===============================================================

function togglePasswordVisibility() {
  const passwordInput =
    document.getElementById(
      "driverPassword"
    );

  const toggleButton =
    document.getElementById(
      "togglePasswordBtn"
    );

  if (
    !passwordInput ||
    !toggleButton
  ) {
    return;
  }

  const passwordIsHidden =
    passwordInput.type === "password";

  passwordInput.type =
    passwordIsHidden
      ? "text"
      : "password";

  toggleButton.textContent =
    passwordIsHidden
      ? "Hide"
      : "Show";

  toggleButton.setAttribute(
    "aria-label",
    passwordIsHidden
      ? "Hide password"
      : "Show password"
  );
}


// ===============================================================
// MOBILE NUMBER NORMALIZATION
// ===============================================================

function normalizeMobileNumber(value) {
  let mobile =
    String(value || "")
      .replace(/\D/g, "");

  if (
    mobile.length === 12 &&
    mobile.startsWith("91")
  ) {
    mobile = mobile.substring(2);
  }

  return mobile;
}


// ===============================================================
// INDIAN MOBILE VALIDATION
// ===============================================================

function isValidIndianMobile(mobile) {
  return /^[6-9]\d{9}$/.test(mobile);
}


// ===============================================================
// SAFE ELEMENT TEXT UPDATE
// ===============================================================

function setElementText(
  elementId,
  value
) {
  const element =
    document.getElementById(elementId);

  if (element) {
    element.textContent = value;
  }
}