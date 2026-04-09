// ===============================================================
// payment.js (BOOKING PAYMENT + PASS + WALLET VERSION 🚀🔥)
// ---------------------------------------------------------------
// FEATURES
// ---------------------------------------------------------------
// ✅ Seat HOLD before payment
// ✅ Fetch active applicable pass for booking
// ✅ Show pass details inside existing payment summary modal
// ✅ Apply pass discount BEFORE wallet
// ✅ Wallet balance check
// ✅ Wallet usage only if checkbox selected
// ✅ Full wallet / partial wallet / full online all supported
// ✅ Safe API handling
// ✅ Full debug logs
//
// IMPORTANT
// ---------------------------------------------------------------
// This file handles BOOKING PAYMENT only.
// Travel Pass purchase should stay inside tripPasses.js.
//
// BACKEND EXPECTATION
// ---------------------------------------------------------------
// This file calls:
// 1. getApplicablePassForBooking
// 2. createHoldBooking
// 3. createOrder
// 4. processWalletBookingPayment
// 5. verifyMixedBookingPayment
// 6. confirmBooking
//
// Pass fields are sent in booking confirmation APIs.
// Backend must be updated to save them in Bookings sheet.
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { currentUser } from "./state.js";

const HOLD_TIME = 5 * 60 * 1000;

let holdBookingId = null;
let holdTimer = null;

// ===============================================================
// PAYMENT SUMMARY STATE
// ---------------------------------------------------------------
// originalAmount = booking total before pass discount
// totalAmount    = amount after pass discount
// walletUsed     = amount covered by wallet on discounted amount
// onlineAmount   = amount left for Razorpay after wallet
// ===============================================================
let paymentSummaryState = {
  booking: null,

  originalAmount: 0,
  totalAmount: 0,

  walletBalance: 0,
  useWallet: false,
  walletUsed: 0,
  onlineAmount: 0,

  passApplied: false,
  passDetails: null,
  passDiscountAmount: 0
};


// ===============================================================
// BUTTON LOADER
// ===============================================================
function togglePayLoader(show) {
  console.log("🎛️ togglePayLoader() called with:", show);

  const btnText = document.getElementById("payBtnText");
  const loader = document.getElementById("payLoader");
  const btn = document.getElementById("payBtn");

  if (!btn || !btnText || !loader) {
    console.warn("⚠️ Payment loader elements not found");
    return;
  }

  if (show) {
    btnText.innerText = "Processing...";
    loader.style.display = "inline-block";
    btn.disabled = true;
  } else {
    btnText.innerText = "Proceed to Payment";
    loader.style.display = "none";
    btn.disabled = false;
  }
}


// ===============================================================
// SAFE FETCH
// ===============================================================
async function safeFetch(url) {
  console.log("🌐 safeFetch() URL:", url);

  try {
    const res = await fetch(url);
    const text = await res.text();

    console.log("📡 RAW API Response:", text);

    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("❌ JSON Parse Error:", err);
      throw new Error("Invalid JSON response from server");
    }

  } catch (error) {
    console.error("❌ Fetch Error:", error);
    throw error;
  }
}


// ===============================================================
// FETCH WALLET BALANCE
// ===============================================================
async function fetchWalletBalance(email) {
  console.log("💰 fetchWalletBalance() called for:", email);

  const result = await safeFetch(
    `${APP_CONFIG.API_URL}?action=getWalletBalance&email=${encodeURIComponent(email)}`
  );

  console.log("📥 Wallet balance result:", result);

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch wallet balance");
  }

  return Number(result.wallet_balance || 0);
}


// ===============================================================
// FETCH APPLICABLE PASS FOR THIS BOOKING
// ---------------------------------------------------------------
// Backend decides:
// - whether user has active pass
// - whether pass is applicable on this route/fare
// - discount amount
// - final amount after pass
// ===============================================================
async function fetchApplicablePass(booking, totalAmount) {
  const url =
    `${APP_CONFIG.API_URL}?action=getApplicablePassForBooking` +
    `&user_email=${encodeURIComponent(currentUser.email)}` +
    `&route_id=${encodeURIComponent(booking.routeId)}` +
    `&total_amount=${encodeURIComponent(totalAmount)}`;

  console.log("🎫 fetchApplicablePass() URL:", url);

  const data = await safeFetch(url);

  console.log("📥 Applicable pass response:", data);

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch applicable pass");
  }

  return data;
}


// ===============================================================
// FORMAT AMOUNT
// ===============================================================
function formatAmount(amount) {
  return `₹${Number(amount || 0)}`;
}


// ===============================================================
// BUILD PASS PAYLOAD FOR BOOKING CONFIRMATION
// ---------------------------------------------------------------
// These values map to your updated Bookings sheet columns:
//
// original_total_amount
// pass_applied
// user_pass_id
// pass_type_id
// pass_name
// pass_discount_percent
// pass_discount_amount
// final_total_amount
//
// IMPORTANT:
// If user has no pass, fill required fallback words/numbers
// ===============================================================
function getPassBookingPayload() {
  console.log("🧮 getPassBookingPayload() called");

  if (paymentSummaryState.passApplied && paymentSummaryState.passDetails) {
    const p = paymentSummaryState.passDetails;

    const payload = {
      original_total_amount: paymentSummaryState.originalAmount,
      pass_applied: "YES",
      user_pass_id: p.user_pass_id || "NA",
      pass_type_id: p.pass_type_id || "NA",
      pass_name: p.pass_name || "NA",
      pass_discount_percent: Number(p.discount_percent || 0),
      pass_discount_amount: Number(paymentSummaryState.passDiscountAmount || 0),
      final_total_amount: Number(paymentSummaryState.totalAmount || 0)
    };

    console.log("✅ Pass payload (PASS APPLIED):", payload);
    return payload;
  }

  const noPassPayload = {
    original_total_amount: Number(paymentSummaryState.originalAmount || 0),
    pass_applied: "NO",
    user_pass_id: "NA",
    pass_type_id: "NA",
    pass_name: "NA",
    pass_discount_percent: 0,
    pass_discount_amount: 0,
    final_total_amount: Number(paymentSummaryState.originalAmount || 0)
  };

  console.log("✅ Pass payload (NO PASS):", noPassPayload);
  return noPassPayload;
}


// ===============================================================
// CONVERT PASS PAYLOAD TO QUERY STRING
// ===============================================================
function buildPassQueryString() {
  const passPayload = getPassBookingPayload();

  const query =
    `&original_total_amount=${encodeURIComponent(passPayload.original_total_amount)}` +
    `&pass_applied=${encodeURIComponent(passPayload.pass_applied)}` +
    `&user_pass_id=${encodeURIComponent(passPayload.user_pass_id)}` +
    `&pass_type_id=${encodeURIComponent(passPayload.pass_type_id)}` +
    `&pass_name=${encodeURIComponent(passPayload.pass_name)}` +
    `&pass_discount_percent=${encodeURIComponent(passPayload.pass_discount_percent)}` +
    `&pass_discount_amount=${encodeURIComponent(passPayload.pass_discount_amount)}` +
    `&final_total_amount=${encodeURIComponent(passPayload.final_total_amount)}`;

  console.log("🔗 Pass query string built:", query);
  return query;
}


// ===============================================================
// INJECT PAYMENT SUMMARY MODAL HTML
// ---------------------------------------------------------------
// Creates summary modal dynamically from JS
// ===============================================================
function injectPaymentSummaryModal() {
  console.log("🧩 injectPaymentSummaryModal() called");

  if (document.getElementById("paymentSummaryOverlay")) {
    console.log("ℹ️ Payment summary modal already exists");
    return;
  }

  const modalHtml = `
    <div class="payment-summary-overlay" id="paymentSummaryOverlay" style="display:none;">
      <div class="payment-summary-modal">
        <div class="payment-summary-header">
          <h2>Payment Summary</h2>
          <button type="button" class="payment-summary-close" onclick="closePaymentSummaryModal()">×</button>
        </div>

        <div class="payment-summary-body">

          <!-- ===================================================
               FARE SUMMARY
               =================================================== -->
          <div class="payment-summary-row">
            <span>Total Fare</span>
            <strong id="summaryOriginalFare">₹0</strong>
          </div>

          <!-- ===================================================
               PASS SUMMARY
               =================================================== -->
          <div id="passSection">
            <div class="payment-summary-row">
              <span>Trip Pass</span>
              <strong id="summaryPassName">No Pass Applied</strong>
            </div>

            <div class="payment-summary-row">
              <span>Pass Discount</span>
              <strong id="summaryPassDiscount">₹0</strong>
            </div>

            <div class="payment-summary-row">
              <span>Valid Till</span>
              <strong id="summaryPassExpiry">-</strong>
            </div>

            <div class="payment-summary-row">
              <span>Remaining Trips</span>
              <strong id="summaryPassRemaining">-</strong>
            </div>

            <div class="payment-summary-row">
              <span>Fare After Pass</span>
              <strong id="summaryFareAfterPass">₹0</strong>
            </div>
          </div>

          <!-- ===================================================
               WALLET SUMMARY
               =================================================== -->
          <div class="payment-summary-row">
            <span>Wallet Balance</span>
            <strong id="summaryWalletBalance">₹0</strong>
          </div>

          <label class="payment-wallet-checkbox">
            <input type="checkbox" id="useWalletCheckbox" onchange="handleWalletCheckboxChange()">
            <span>Use wallet balance</span>
          </label>

          <div class="payment-summary-row">
            <span>Wallet Used</span>
            <strong id="summaryWalletUsed">₹0</strong>
          </div>

          <div class="payment-summary-row">
            <span>Pay Online</span>
            <strong id="summaryOnlineAmount">₹0</strong>
          </div>

          <!-- Warning -->
          <div class="payment-warning-note">
            <div class="warning-icon">⚠️</div>
            <div class="warning-text">
              <div class="warning-title">Payment in progress</div>
              <div class="warning-desc">
                Do not close or refresh this page.<br>
                Wait until you receive the <strong>booking confirmation</strong>.
              </div>
            </div>
          </div>

          <div class="payment-summary-footer">
            <!-- BUTTON WRAPPER -->
            <div class="payment-footer-buttons">
              <button type="button" class="payment-summary-cancel-btn" onclick="closePaymentSummaryModal()">
                Cancel
              </button>

              <button type="button" class="payment-summary-confirm-btn" id="paymentSummaryConfirmBtn" onclick="confirmPaymentSummary()">
                Proceed
              </button>
            </div>

          </div>
        </div>

        
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  console.log("✅ Payment summary modal injected into DOM");
}


// ===============================================================
// OPEN PAYMENT SUMMARY MODAL
// ===============================================================
function openPaymentSummaryModal() {
  console.log("🧾 openPaymentSummaryModal() called");

  const overlay = document.getElementById("paymentSummaryOverlay");
  if (!overlay) {
    console.error("❌ paymentSummaryOverlay not found");
    return;
  }

  overlay.style.display = "flex";
  updatePaymentSummaryUI();
}


// ===============================================================
// CLOSE PAYMENT SUMMARY MODAL
// ===============================================================
function closePaymentSummaryModal() {
  console.log("❌ closePaymentSummaryModal() called");

  const overlay = document.getElementById("paymentSummaryOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}

// ---------------------------------------------------------------
// FORMAT DISPLAY DATE TIME
// ---------------------------------------------------------------
// Converts values like:
//   2026-04-03T18:30:00.000Z
// into:
//   2026-04-03 Time - 18:30
//
// Notes:
// - Keeps "-" unchanged
// - Supports ISO strings directly
// - Supports general Date-parsable strings as fallback
// ---------------------------------------------------------------
function formatDisplayDateTime(value) {
  if (!value || value === "-") {
    return "-";
  }

  const str = String(value).trim();
  console.log("🕒 formatDisplayDateTime() input:", str);

  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (isoMatch) {
    const formatted = `${isoMatch[1]} Time - ${isoMatch[2]}`;
    console.log("✅ ISO formatted date-time:", formatted);
    return formatted;
  }

  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");
    const hours = String(parsedDate.getHours()).padStart(2, "0");
    const minutes = String(parsedDate.getMinutes()).padStart(2, "0");

    const formatted = `${year}-${month}-${day} Time - ${hours}:${minutes}`;
    console.log("✅ Parsed formatted date-time:", formatted);
    return formatted;
  }

  console.warn("⚠️ Could not parse date-time, returning raw value:", str);
  return str;
}

// ===============================================================
// UPDATE PAYMENT SUMMARY UI
// ---------------------------------------------------------------
// Order of calculation:
// 1. original fare
// 2. pass discount
// 3. fare after pass
// 4. wallet used on discounted fare
// 5. online amount
// ===============================================================
function updatePaymentSummaryUI() {
  console.log("🔄 updatePaymentSummaryUI() called");
  console.log("📦 paymentSummaryState:", paymentSummaryState);

  // ------------------------------------------------------------
  // Common elements
  // ------------------------------------------------------------
  const originalFareEl = document.getElementById("summaryOriginalFare");
  const walletBalanceEl = document.getElementById("summaryWalletBalance");
  const walletUsedEl = document.getElementById("summaryWalletUsed");
  const onlineAmountEl = document.getElementById("summaryOnlineAmount");
  const checkbox = document.getElementById("useWalletCheckbox");
  const confirmBtn = document.getElementById("paymentSummaryConfirmBtn");

  // ------------------------------------------------------------
  // Pass elements
  // ------------------------------------------------------------
  const passSection = document.getElementById("passSection");
  const passNameEl = document.getElementById("summaryPassName");
  const passDiscountEl = document.getElementById("summaryPassDiscount");
  const passExpiryEl = document.getElementById("summaryPassExpiry");
  const passRemainingEl = document.getElementById("summaryPassRemaining");
  const fareAfterPassEl = document.getElementById("summaryFareAfterPass");

  // ------------------------------------------------------------
  // Render original fare
  // ------------------------------------------------------------
  if (originalFareEl) {
    originalFareEl.textContent = formatAmount(paymentSummaryState.originalAmount);
  }

  // ------------------------------------------------------------
  // Render wallet balance
  // ------------------------------------------------------------
  if (walletBalanceEl) {
    walletBalanceEl.textContent = formatAmount(paymentSummaryState.walletBalance);
  }

  // ------------------------------------------------------------
  // Render pass section
  // ------------------------------------------------------------
  if (passSection) {
    passSection.style.display = "block";
  }

  if (paymentSummaryState.passApplied && paymentSummaryState.passDetails) {
    const p = paymentSummaryState.passDetails;

    console.log("🎫 Rendering applied pass in summary:", p);

    if (passNameEl) passNameEl.textContent = p.pass_name || "Pass Applied";
    if (passDiscountEl) passDiscountEl.textContent = `- ${formatAmount(paymentSummaryState.passDiscountAmount)}`;
    if (passExpiryEl) {
      passExpiryEl.textContent = formatDisplayDateTime(p.expiry_date || "-");
    }    
    if (passRemainingEl) passRemainingEl.textContent = p.remaining_trips ?? "-";
    if (fareAfterPassEl) fareAfterPassEl.textContent = formatAmount(paymentSummaryState.totalAmount);

  } else {
    console.log("ℹ️ No applicable pass for this booking");

    if (passNameEl) passNameEl.textContent = "No Pass Applied";
    if (passDiscountEl) passDiscountEl.textContent = formatAmount(0);
    if (passExpiryEl) passExpiryEl.textContent = "-";
    if (passRemainingEl) passRemainingEl.textContent = "-";
    if (fareAfterPassEl) fareAfterPassEl.textContent = formatAmount(paymentSummaryState.originalAmount);
  }

  // ------------------------------------------------------------
  // Render wallet checkbox state
  // ------------------------------------------------------------
  if (checkbox) {
    checkbox.checked = paymentSummaryState.useWallet;
  }

  // ------------------------------------------------------------
  // Wallet calculation happens on discounted amount
  // ------------------------------------------------------------
  if (paymentSummaryState.useWallet) {
    paymentSummaryState.walletUsed = Math.min(
      Number(paymentSummaryState.walletBalance || 0),
      Number(paymentSummaryState.totalAmount || 0)
    );
  } else {
    paymentSummaryState.walletUsed = 0;
  }

  paymentSummaryState.onlineAmount =
    Number(paymentSummaryState.totalAmount || 0) - Number(paymentSummaryState.walletUsed || 0);

  console.log("💳 Computed walletUsed:", paymentSummaryState.walletUsed);
  console.log("🌐 Computed onlineAmount:", paymentSummaryState.onlineAmount);

  if (walletUsedEl) {
    walletUsedEl.textContent = formatAmount(paymentSummaryState.walletUsed);
  }

  if (onlineAmountEl) {
    onlineAmountEl.textContent = formatAmount(paymentSummaryState.onlineAmount);
  }

  // ------------------------------------------------------------
  // Update confirm button label
  // ------------------------------------------------------------
  if (confirmBtn) {
    if (paymentSummaryState.onlineAmount === 0 && paymentSummaryState.walletUsed > 0) {
      confirmBtn.textContent = `Pay ${formatAmount(paymentSummaryState.totalAmount)} via Wallet`;
    } else if (paymentSummaryState.onlineAmount > 0 && paymentSummaryState.walletUsed > 0) {
      confirmBtn.textContent = `Pay ${formatAmount(paymentSummaryState.onlineAmount)} Online`;
    } else {
      confirmBtn.textContent = `Pay ${formatAmount(paymentSummaryState.totalAmount)} via Razorpay`;
    }
  }
}


// ===============================================================
// CHECKBOX CHANGE HANDLER
// ===============================================================
function handleWalletCheckboxChange() {
  console.log("☑️ handleWalletCheckboxChange() called");

  const checkbox = document.getElementById("useWalletCheckbox");
  paymentSummaryState.useWallet = checkbox ? checkbox.checked : false;

  console.log("✅ Wallet checkbox state:", paymentSummaryState.useWallet);

  updatePaymentSummaryUI();
}


// ===============================================================
// MAIN PAYMENT FUNCTION
// ---------------------------------------------------------------
// FLOW
// ---------------------------------------------------------------
// 1. Validate selected booking
// 2. Create HOLD booking
// 3. Fetch applicable pass for booking
// 4. Fetch wallet balance
// 5. Build summary state
// 6. Open payment summary modal
// ===============================================================
export async function openPaymentModal() {
  try {
    console.log("💳 Starting payment flow...");

    togglePayLoader(true);

    const booking = window.selectedBooking;

    if (!booking) {
      togglePayLoader(false);
      alert("⚠️ Please select a route first");
      return;
    }

    console.log("📦 Booking Data:", booking);

    // ==========================================================
    // FETCH APPLICABLE PASS
    // ==========================================================
    let passData = null;

    try {
      passData = await fetchApplicablePass(booking, booking.totalAmount);
      console.log("🎫 Applicable pass fetched successfully:", passData);
    } catch (passError) {
      console.warn("⚠️ Failed to fetch/apply pass. Proceeding without pass.", passError);
      passData = {
        success: true,
        hasPass: false
      };
    }

    // ==========================================================
    // APPLY PASS RESULT
    // ==========================================================
    let originalAmount = Number(booking.totalAmount || 0);
    let finalAmount = originalAmount;
    let passApplied = false;
    let passDetails = null;
    let passDiscountAmount = 0;

    if (passData?.hasPass && passData?.applicable && passData?.passDetails) {
      passApplied = true;
      passDetails = passData.passDetails;
      passDiscountAmount = Number(passDetails.discount_amount || 0);
      finalAmount = Number(passDetails.final_amount || originalAmount);

      console.log("✅ Pass applied on booking");
      console.log("🎫 Pass details:", passDetails);
      console.log("💸 Pass discount amount:", passDiscountAmount);
      console.log("💰 Final amount after pass:", finalAmount);

    } else {
      console.log("ℹ️ No applicable pass found for this booking");
    }

    // ==========================================================
    // FETCH WALLET BALANCE
    // ==========================================================
    const walletBalance = await fetchWalletBalance(currentUser.email);
    console.log("💰 Wallet balance fetched:", walletBalance);

    // ==========================================================
    // BUILD PAYMENT STATE
    // ==========================================================
    paymentSummaryState = {
      booking,

      originalAmount,
      totalAmount: finalAmount,

      walletBalance,
      useWallet: false,
      walletUsed: 0,
      onlineAmount: finalAmount,

      passApplied,
      passDetails,
      passDiscountAmount
    };

    console.log("✅ paymentSummaryState prepared:", paymentSummaryState);

    togglePayLoader(false);
    openPaymentSummaryModal();

  } catch (error) {
    console.error("❌ Payment flow start failed:", error);
    togglePayLoader(false);
    alert(error.message || "Unable to start payment");
  }
}


// ===============================================================
// CONFIRM PAYMENT SUMMARY
// ---------------------------------------------------------------
// Handles 3 cases:
//
// 1. Full wallet
// 2. Partial wallet + Razorpay
// 3. Full Razorpay
//
// PASS SUPPORT
// ---------------------------------------------------------------
// Pass payload is sent to backend in all final booking APIs.
// ===============================================================
async function confirmPaymentSummary() {
  console.log("✅ confirmPaymentSummary() called");
  console.log("📦 Current summary state:", paymentSummaryState);

  try {
    closePaymentSummaryModal();
    togglePayLoader(true);

    const booking = paymentSummaryState.booking;

    // ==========================================================
    // CREATE HOLD BOOKING (MOVED HERE)
    // ----------------------------------------------------------
    // Now HOLD entry will be created only when user clicks
    // Proceed inside payment summary modal.
    // ==========================================================
    console.log("⏳ Creating HOLD booking (on final confirm)...");

    const holdData = await safeFetch(
      `${APP_CONFIG.API_URL}?action=createHoldBooking` +
      `&booking_date=${new Date().toISOString().split("T")[0]}` +
      `&travel_date=${booking.travelDate}` +
      `&route_id=${booking.routeId}` +
      `&bus_id=${booking.busId}` +
      `&bus_number=${booking.busNumber}` +
      `&driver_name=${booking.driverName}` +
      `&driver_phone=${booking.driverPhone}` +
      `&fromStop=${booking.fromStop}` +
      `&toStop=${booking.toStop}` +
      `&scheduled_pickup_time=${booking.arrivalTime}` +
      `&scheduled_drop_time=${booking.reachingTime}` +
      `&passenger_name=${encodeURIComponent(currentUser.name)}` +
      `&passenger_email=${encodeURIComponent(currentUser.email)}` +
      `&passenger_phone=${encodeURIComponent(currentUser.phone)}` +
      `&seats_booked=${booking.pax}` +
      `&fare_per_seat=${booking.totalAmount / booking.pax}` +
      `&total_amount=${booking.totalAmount}`
    );

    console.log("📥 HOLD Response:", holdData);

    if (!holdData.success) {
      togglePayLoader(false);
      alert(holdData.error || "❌ Failed to create booking hold");
      return;
    }

    holdBookingId = holdData.booking_id;
    console.log("🧾 HOLD Booking Created:", holdBookingId);

    startHoldTimer();

    const totalAmount = Number(paymentSummaryState.totalAmount || 0); // after pass
    const walletUsed = Number(paymentSummaryState.walletUsed || 0);
    const onlineAmount = Number(paymentSummaryState.onlineAmount || 0);
    const passQueryString = buildPassQueryString();

    console.log("📘 Booking being confirmed:", booking);
    console.log("💰 totalAmount(after pass):", totalAmount);
    console.log("👛 walletUsed:", walletUsed);
    console.log("🌐 onlineAmount:", onlineAmount);

    // ==========================================================
    // CASE 1: FULL WALLET PAYMENT
    // ==========================================================
    if (walletUsed > 0 && onlineAmount === 0) {
      console.log("💰 Full wallet payment selected");

      const walletPayResult = await safeFetch(
        `${APP_CONFIG.API_URL}?action=processWalletBookingPayment` +
        `&booking_id=${encodeURIComponent(holdBookingId)}` +
        `&email=${encodeURIComponent(currentUser.email)}` +
        `&amount=${encodeURIComponent(totalAmount)}` +
        passQueryString
      );

      console.log("📥 processWalletBookingPayment response:", walletPayResult);

      clearTimeout(holdTimer);
      togglePayLoader(false);

      if (!walletPayResult.success) {
        alert(walletPayResult.error || "Wallet payment failed");
        return;
      }

      alert("✅ Booking Confirmed using Wallet!");
      return;
    }

    // ==========================================================
    // CASE 2: PARTIAL WALLET + RAZORPAY
    // ==========================================================
    if (walletUsed > 0 && onlineAmount > 0) {
      console.log("🟡 Partial wallet + Razorpay selected");

      const order = await safeFetch(
        `${APP_CONFIG.API_URL}?action=createOrder&amount=${encodeURIComponent(onlineAmount * 100)}`
      );

      console.log("📥 Mixed payment order response:", order);

      if (!order.success) {
        togglePayLoader(false);
        alert(order.error || "❌ Failed to create online payment order");
        return;
      }

      togglePayLoader(false);

      const options = {
        key: APP_CONFIG.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        order_id: order.id,
        name: "SHRD Shuttle",
        description: booking.routeName + " (Wallet + Online)",

        handler: async function (response) {
          console.log("✅ Mixed payment success:", response);

          togglePayLoader(true);
          clearTimeout(holdTimer);

          try {
            const verifyData = await safeFetch(
              `${APP_CONFIG.API_URL}?action=verifyMixedBookingPayment` +
              `&booking_id=${encodeURIComponent(holdBookingId)}` +
              `&email=${encodeURIComponent(currentUser.email)}` +
              `&wallet_amount=${encodeURIComponent(walletUsed)}` +
              `&online_amount=${encodeURIComponent(onlineAmount)}` +
              `&razorpay_order_id=${encodeURIComponent(response.razorpay_order_id)}` +
              `&razorpay_payment_id=${encodeURIComponent(response.razorpay_payment_id)}` +
              `&razorpay_signature=${encodeURIComponent(response.razorpay_signature)}` +
              passQueryString
            );

            console.log("📥 verifyMixedBookingPayment response:", verifyData);

            togglePayLoader(false);

            if (!verifyData.success) {
              alert(verifyData.error || "Mixed payment verification failed");
              return;
            }

            alert("✅ Booking Confirmed! Wallet + Online payment used");

          } catch (err) {
            console.error("❌ Mixed payment verify error:", err);
            togglePayLoader(false);
            alert(err.message || "Mixed payment verification failed");
          }
        },

        modal: {
          ondismiss: async function () {
            console.log("❌ Mixed payment cancelled by user");
            clearTimeout(holdTimer);
            await cancelHoldBooking();
          }
        },

        theme: {
          color: "#6f42c1"
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();
      return;
    }

    // ==========================================================
    // CASE 3: FULL RAZORPAY ONLY
    // ==========================================================
    console.log("🔴 Full Razorpay payment selected");

    const order = await safeFetch(
      `${APP_CONFIG.API_URL}?action=createOrder&amount=${encodeURIComponent(totalAmount * 100)}`
    );

    console.log("📥 Full payment order response:", order);

    if (!order.success) {
      togglePayLoader(false);
      alert(order.error || "❌ Failed to create order");
      return;
    }

    togglePayLoader(false);

    const options = {
      key: APP_CONFIG.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: "INR",
      order_id: order.id,

      name: "SHRD Shuttle",
      description: booking.routeName,

      handler: async function (response) {
        console.log("✅ Full payment success:", response);

        togglePayLoader(true);
        clearTimeout(holdTimer);

        try {
          const confirmData = await safeFetch(
            `${APP_CONFIG.API_URL}?action=confirmBooking` +
            `&booking_id=${encodeURIComponent(holdBookingId)}` +
            `&razorpay_order_id=${encodeURIComponent(response.razorpay_order_id)}` +
            `&razorpay_payment_id=${encodeURIComponent(response.razorpay_payment_id)}` +
            `&razorpay_signature=${encodeURIComponent(response.razorpay_signature)}` +
            passQueryString
          );

          console.log("📥 confirmBooking response:", confirmData);

          togglePayLoader(false);

          if (!confirmData.success) {
            alert(confirmData.error || "❌ Booking confirmation failed");
            return;
          }

          alert("✅ Booking Confirmed!");

        } catch (err) {
          console.error("❌ Full payment confirm error:", err);
          togglePayLoader(false);
          alert(err.message || "Booking confirmation failed");
        }
      },

      modal: {
        ondismiss: async function () {
          console.log("❌ Full payment cancelled by user");
          clearTimeout(holdTimer);
          await cancelHoldBooking();
        }
      },

      theme: {
        color: "#6f42c1"
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();

  } catch (error) {
    console.error("❌ confirmPaymentSummary() failed:", error);
    togglePayLoader(false);
    alert(error.message || "Unable to continue payment");
  }
}


// ===============================================================
// HOLD TIMER
// ===============================================================
function startHoldTimer() {
  console.log(`⏳ HOLD TIMER STARTED (${HOLD_TIME / 1000}s)`);

  holdTimer = setTimeout(async () => {
    console.log("⌛ HOLD TIME EXPIRED");
    await cancelHoldBooking();
  }, HOLD_TIME);
}


// ===============================================================
// CANCEL HOLD BOOKING
// ===============================================================
async function cancelHoldBooking() {
  if (!holdBookingId) {
    console.warn("⚠️ No holdBookingId present, skipping cancel");
    return;
  }

  console.log("🚫 Cancelling HOLD booking:", holdBookingId);

  try {
    const data = await safeFetch(
      `${APP_CONFIG.API_URL}?action=cancelBooking&booking_id=${encodeURIComponent(holdBookingId)}`
    );

    console.log("📥 Cancel Response:", data);

  } catch (err) {
    console.error("❌ Cancel Error:", err);
  }

  console.log("❌ HOLD booking cancelled");
}


// ===============================================================
// GLOBAL BINDINGS
// ===============================================================
window.closePaymentSummaryModal = closePaymentSummaryModal;
window.handleWalletCheckboxChange = handleWalletCheckboxChange;
window.confirmPaymentSummary = confirmPaymentSummary;


// ===============================================================
// INIT PAYMENT MODAL HTML
// ===============================================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("📄 payment.js DOMContentLoaded");
  injectPaymentSummaryModal();
});