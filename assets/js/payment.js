// ===============================================================
// payment.js (BOOKING PAYMENT + PASS + WALLET + ROUND TRIP SUPPORT 🚀🔥)
// ---------------------------------------------------------------
// FEATURES
// ---------------------------------------------------------------
// ✅ Seat HOLD before payment
// ✅ Supports ONEWAY booking
// ✅ Supports ROUNDTRIP booking (same day, 2 booking rows)
// ✅ Fetch active applicable pass for booking
// ✅ Show pass details inside payment summary modal
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
// This file expects backend to support:
// 1. getApplicablePassForBooking
// 2. createHoldBooking
// 3. createOrder
// 4. processWalletBookingPayment
// 5. verifyMixedBookingPayment
// 6. confirmBooking
//
// ROUND TRIP BACKEND EXPECTATION
// ---------------------------------------------------------------
// For ROUNDTRIP, createHoldBooking should create 2 booking rows
// and return booking_ids array.
// Final payment APIs should accept:
// - booking_ids=ID1,ID2
// and process both rows together.
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { currentUser } from "./state.js";

const HOLD_TIME = 5 * 60 * 1000;

// ===============================================================
// HOLD STATE
// ---------------------------------------------------------------
// One-way   -> holdBookingIds = [singleId]
// RoundTrip -> holdBookingIds = [onwardId, returnId]
// ===============================================================
let holdBookingIds = [];
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

  tripType: "ONEWAY",

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
//
// ROUND TRIP SUPPORT
// ---------------------------------------------------------------
// For round trip, we send a combined route hint + total amount.
// Current backend may still use only total_amount. Route id fallback:
// - One-way   => selected routeId
// - Roundtrip => onward routeId
// ===============================================================
async function fetchApplicablePass(booking, totalAmount) {
  const routeIdForPass =
    booking?.tripType === "ROUNDTRIP"
      ? (booking?.onward?.routeId || "")
      : (booking?.routeId || "");

  const tripType = booking?.tripType || "ONEWAY";

  const url =
    `${APP_CONFIG.API_URL}?action=getApplicablePassForBooking` +
    `&user_email=${encodeURIComponent(currentUser.email)}` +
    `&route_id=${encodeURIComponent(routeIdForPass)}` +
    `&trip_type=${encodeURIComponent(tripType)}` +
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
// HELPER: DETECT TRIP TYPE
// ===============================================================
function getBookingTripType(booking) {
  const tripType = String(booking?.tripType || "ONEWAY").toUpperCase();
  return tripType === "ROUNDTRIP" ? "ROUNDTRIP" : "ONEWAY";
}

// ===============================================================
// HELPER: VALIDATE SELECTED BOOKING
// ===============================================================
function validateSelectedBooking(booking) {
  console.log("🧪 validateSelectedBooking() called with:", booking);

  if (!booking) {
    throw new Error("Please select a route first");
  }

  const tripType = getBookingTripType(booking);

  if (tripType === "ROUNDTRIP") {
    if (!booking.onward || !booking.return) {
      throw new Error("Please select both onward and return routes");
    }

    if (!booking.travelDate) {
      throw new Error("Travel date missing for round trip");
    }

    if (!booking.pax) {
      throw new Error("Passenger count missing");
    }

    return;
  }

  if (!booking.routeId) {
    throw new Error("Please select a route first");
  }
}

// ===============================================================
// HELPER: GET DISPLAY DESCRIPTION
// ===============================================================
function getBookingDescription(booking) {
  const tripType = getBookingTripType(booking);

  if (tripType === "ROUNDTRIP") {
    const onwardRoute = booking?.onward?.routeName || "Onward";
    const returnRoute = booking?.return?.routeName || "Return";
    return `${onwardRoute} + ${returnRoute}`;
  }

  return booking?.routeName || "SHRD Shuttle Booking";
}

// ===============================================================
// HELPER: COMPUTE BOOKING ORIGINAL TOTAL
// ===============================================================
function getBookingOriginalAmount(booking) {
  const tripType = getBookingTripType(booking);

  if (tripType === "ROUNDTRIP") {
    const onward = Number(booking?.onward?.totalAmount || 0);
    const ret = Number(booking?.return?.totalAmount || 0);
    const total = onward + ret;

    console.log("💰 Round trip original amount computed:", total);
    return total;
  }

  const total = Number(booking?.totalAmount || 0);
  console.log("💰 One-way original amount computed:", total);
  return total;
}

// ===============================================================
// HELPER: ROUND-TRIP LEG AMOUNTS
// ---------------------------------------------------------------
// Returns per-leg original/final amounts for storage in booking rows.
// For now:
// - if no pass => each leg keeps its own amount
// - if pass applied => split discount proportionally across both legs
// ===============================================================
function getRoundTripLegAmounts() {
  const booking = paymentSummaryState.booking || {};

  const onwardOriginal = Number(booking?.onward?.totalAmount || 0);
  const returnOriginal = Number(booking?.return?.totalAmount || 0);

  const combinedOriginal = onwardOriginal + returnOriginal;
  const combinedFinal = Number(paymentSummaryState.totalAmount || combinedOriginal);

  console.log("🧮 getRoundTripLegAmounts() called");
  console.log("➡️ onwardOriginal:", onwardOriginal);
  console.log("⬅️ returnOriginal:", returnOriginal);
  console.log("🧾 combinedOriginal:", combinedOriginal);
  console.log("💰 combinedFinal:", combinedFinal);

  // No pass / no discount / invalid totals
  if (
    !paymentSummaryState.passApplied ||
    combinedOriginal <= 0 ||
    combinedFinal >= combinedOriginal
  ) {
    const noDiscountLegs = {
      onward_original_total_amount: onwardOriginal,
      onward_final_total_amount: onwardOriginal,
      return_original_total_amount: returnOriginal,
      return_final_total_amount: returnOriginal
    };

    console.log("✅ Round-trip leg amounts (NO DISCOUNT split needed):", noDiscountLegs);
    return noDiscountLegs;
  }

  // Proportional split of discounted final amount
  let onwardFinal = Math.round((onwardOriginal / combinedOriginal) * combinedFinal);
  let returnFinal = combinedFinal - onwardFinal;

  const discountedLegs = {
    onward_original_total_amount: onwardOriginal,
    onward_final_total_amount: onwardFinal,
    return_original_total_amount: returnOriginal,
    return_final_total_amount: returnFinal
  };

  console.log("✅ Round-trip leg amounts (DISCOUNT SPLIT):", discountedLegs);
  return discountedLegs;
}

// ===============================================================
// BUILD PASS PAYLOAD FOR BOOKING CONFIRMATION
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
// BUILD ROUND-TRIP LEG QUERY STRING
// ---------------------------------------------------------------
// Sends per-leg totals so backend can store each booking row correctly
// ===============================================================
function buildRoundTripLegQueryString() {
  const tripType = paymentSummaryState.tripType || "ONEWAY";

  if (tripType !== "ROUNDTRIP") {
    console.log("ℹ️ buildRoundTripLegQueryString() skipped for ONEWAY");
    return "";
  }

  const legs = getRoundTripLegAmounts();

  const query =
    `&onward_original_total_amount=${encodeURIComponent(legs.onward_original_total_amount)}` +
    `&onward_final_total_amount=${encodeURIComponent(legs.onward_final_total_amount)}` +
    `&return_original_total_amount=${encodeURIComponent(legs.return_original_total_amount)}` +
    `&return_final_total_amount=${encodeURIComponent(legs.return_final_total_amount)}`;

  console.log("🔗 Round-trip leg query string built:", query);
  return query;
}

// ===============================================================
// HELPER: BUILD BOOKING IDS QUERY STRING
// ===============================================================
function buildBookingIdsQueryString() {
  const ids = Array.isArray(holdBookingIds) ? holdBookingIds.filter(Boolean) : [];
  const query = `&booking_ids=${encodeURIComponent(ids.join(","))}`;

  console.log("🧾 buildBookingIdsQueryString() =>", query);
  return query;
}

// ===============================================================
// INJECT PAYMENT SUMMARY MODAL HTML
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

          <div class="payment-summary-row">
            <span>Trip Type</span>
            <strong id="summaryTripType">One Way</strong>
          </div>

          <div class="payment-summary-row">
            <span>Journey</span>
            <strong id="summaryJourneyLabel">-</strong>
          </div>

          <div class="payment-summary-row">
            <span>Total Fare</span>
            <strong id="summaryOriginalFare">₹0</strong>
          </div>

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

// ===============================================================
// FORMAT DISPLAY DATE TIME
// ===============================================================
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
// HELPER: BUILD JOURNEY LABEL
// ===============================================================
function buildJourneyLabel(booking) {
  const tripType = getBookingTripType(booking);

  if (tripType === "ROUNDTRIP") {
    const onward = booking?.onward
      ? `${booking.onward.fromStop} → ${booking.onward.toStop}`
      : "Onward not selected";

    const ret = booking?.return
      ? `${booking.return.fromStop} → ${booking.return.toStop}`
      : "Return not selected";

    return `${onward} | ${ret}`;
  }

  return `${booking?.fromStop || "-"} → ${booking?.toStop || "-"}`;
}

// ===============================================================
// UPDATE PAYMENT SUMMARY UI
// ===============================================================
function updatePaymentSummaryUI() {
  console.log("🔄 updatePaymentSummaryUI() called");
  console.log("📦 paymentSummaryState:", paymentSummaryState);

  const tripTypeEl = document.getElementById("summaryTripType");
  const journeyLabelEl = document.getElementById("summaryJourneyLabel");
  const originalFareEl = document.getElementById("summaryOriginalFare");
  const walletBalanceEl = document.getElementById("summaryWalletBalance");
  const walletUsedEl = document.getElementById("summaryWalletUsed");
  const onlineAmountEl = document.getElementById("summaryOnlineAmount");
  const checkbox = document.getElementById("useWalletCheckbox");
  const confirmBtn = document.getElementById("paymentSummaryConfirmBtn");

  const passSection = document.getElementById("passSection");
  const passNameEl = document.getElementById("summaryPassName");
  const passDiscountEl = document.getElementById("summaryPassDiscount");
  const passExpiryEl = document.getElementById("summaryPassExpiry");
  const passRemainingEl = document.getElementById("summaryPassRemaining");
  const fareAfterPassEl = document.getElementById("summaryFareAfterPass");

  if (tripTypeEl) {
    tripTypeEl.textContent =
      paymentSummaryState.tripType === "ROUNDTRIP" ? "Round Trip" : "One Way";
  }

  if (journeyLabelEl) {
    journeyLabelEl.textContent = buildJourneyLabel(paymentSummaryState.booking);
  }

  if (originalFareEl) {
    originalFareEl.textContent = formatAmount(paymentSummaryState.originalAmount);
  }

  if (walletBalanceEl) {
    walletBalanceEl.textContent = formatAmount(paymentSummaryState.walletBalance);
  }

  if (passSection) {
    passSection.style.display = "block";
  }

  if (paymentSummaryState.passApplied && paymentSummaryState.passDetails) {
    const p = paymentSummaryState.passDetails;

    console.log("🎫 Rendering applied pass in summary:", p);

    if (passNameEl) passNameEl.textContent = p.pass_name || "Pass Applied";
    if (passDiscountEl) passDiscountEl.textContent = `- ${formatAmount(paymentSummaryState.passDiscountAmount)}`;
    if (passExpiryEl) passExpiryEl.textContent = formatDisplayDateTime(p.expiry_date || "-");
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

  if (checkbox) {
    checkbox.checked = paymentSummaryState.useWallet;
  }

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
// ===============================================================
export async function openPaymentModal() {
  try {
    console.log("💳 Starting payment flow...");

    togglePayLoader(true);

    const booking = window.selectedBooking;
    validateSelectedBooking(booking);

    const tripType = getBookingTripType(booking);

    console.log("📦 Booking Data:", booking);
    console.log("🛣️ Trip Type:", tripType);

    let passData = null;
    const originalAmount = getBookingOriginalAmount(booking);

    try {
      passData = await fetchApplicablePass(booking, originalAmount);
      console.log("🎫 Applicable pass fetched successfully:", passData);
    } catch (passError) {
      console.warn("⚠️ Failed to fetch/apply pass. Proceeding without pass.", passError);
      passData = {
        success: true,
        hasPass: false
      };
    }

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

    const walletBalance = await fetchWalletBalance(currentUser.email);
    console.log("💰 Wallet balance fetched:", walletBalance);

    paymentSummaryState = {
      booking,
      tripType,

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
// HELPER: CREATE HOLD BOOKING FOR ONE-WAY / ROUND-TRIP
// ===============================================================
async function createHoldBookingForSelectedTrip(booking) {
  console.log("⏳ createHoldBookingForSelectedTrip() called");
  console.log("📦 booking:", booking);

  const tripType = getBookingTripType(booking);

  if (tripType === "ROUNDTRIP") {
    const onward = booking.onward;
    const ret = booking.return;

    const holdUrl =
      `${APP_CONFIG.API_URL}?action=createHoldBooking` +
      `&trip_type=ROUNDTRIP` +
      `&booking_date=${encodeURIComponent(new Date().toISOString().split("T")[0])}` +
      `&travel_date=${encodeURIComponent(booking.travelDate)}` +

      `&onward_route_id=${encodeURIComponent(onward.routeId)}` +
      `&onward_bus_id=${encodeURIComponent(onward.busId)}` +
      `&onward_bus_number=${encodeURIComponent(onward.busNumber)}` +
      `&onward_driver_name=${encodeURIComponent(onward.driverName)}` +
      `&onward_driver_phone=${encodeURIComponent(onward.driverPhone)}` +
      `&onward_fromStop=${encodeURIComponent(onward.fromStop)}` +
      `&onward_toStop=${encodeURIComponent(onward.toStop)}` +
      `&onward_scheduled_pickup_time=${encodeURIComponent(onward.arrivalTime)}` +
      `&onward_scheduled_drop_time=${encodeURIComponent(onward.reachingTime)}` +
      `&onward_fare_per_seat=${encodeURIComponent(Number(onward.totalAmount || 0) / Number(booking.pax || 1))}` +
      `&onward_total_amount=${encodeURIComponent(onward.totalAmount)}` +

      `&return_route_id=${encodeURIComponent(ret.routeId)}` +
      `&return_bus_id=${encodeURIComponent(ret.busId)}` +
      `&return_bus_number=${encodeURIComponent(ret.busNumber)}` +
      `&return_driver_name=${encodeURIComponent(ret.driverName)}` +
      `&return_driver_phone=${encodeURIComponent(ret.driverPhone)}` +
      `&return_fromStop=${encodeURIComponent(ret.fromStop)}` +
      `&return_toStop=${encodeURIComponent(ret.toStop)}` +
      `&return_scheduled_pickup_time=${encodeURIComponent(ret.arrivalTime)}` +
      `&return_scheduled_drop_time=${encodeURIComponent(ret.reachingTime)}` +
      `&return_fare_per_seat=${encodeURIComponent(Number(ret.totalAmount || 0) / Number(booking.pax || 1))}` +
      `&return_total_amount=${encodeURIComponent(ret.totalAmount)}` +

      `&passenger_name=${encodeURIComponent(currentUser.name)}` +
      `&passenger_email=${encodeURIComponent(currentUser.email)}` +
      `&passenger_phone=${encodeURIComponent(currentUser.phone)}` +
      `&seats_booked=${encodeURIComponent(booking.pax)}`;

    console.log("🌐 ROUNDTRIP createHoldBooking URL:", holdUrl);

    const holdData = await safeFetch(holdUrl);
    console.log("📥 ROUNDTRIP HOLD response:", holdData);

    if (!holdData.success) {
      throw new Error(holdData.error || "Failed to create round-trip booking hold");
    }

    if (Array.isArray(holdData.booking_ids) && holdData.booking_ids.length > 0) {
      return holdData.booking_ids;
    }

    if (holdData.booking_id) {
      return [holdData.booking_id];
    }

    throw new Error("Round-trip HOLD created but booking IDs missing");
  }

  const holdUrl =
    `${APP_CONFIG.API_URL}?action=createHoldBooking` +
    `&trip_type=ONEWAY` +
    `&booking_date=${encodeURIComponent(new Date().toISOString().split("T")[0])}` +
    `&travel_date=${encodeURIComponent(booking.travelDate)}` +
    `&route_id=${encodeURIComponent(booking.routeId)}` +
    `&bus_id=${encodeURIComponent(booking.busId)}` +
    `&bus_number=${encodeURIComponent(booking.busNumber)}` +
    `&driver_name=${encodeURIComponent(booking.driverName)}` +
    `&driver_phone=${encodeURIComponent(booking.driverPhone)}` +
    `&fromStop=${encodeURIComponent(booking.fromStop)}` +
    `&toStop=${encodeURIComponent(booking.toStop)}` +
    `&scheduled_pickup_time=${encodeURIComponent(booking.arrivalTime)}` +
    `&scheduled_drop_time=${encodeURIComponent(booking.reachingTime)}` +
    `&passenger_name=${encodeURIComponent(currentUser.name)}` +
    `&passenger_email=${encodeURIComponent(currentUser.email)}` +
    `&passenger_phone=${encodeURIComponent(currentUser.phone)}` +
    `&seats_booked=${encodeURIComponent(booking.pax)}` +
    `&fare_per_seat=${encodeURIComponent(Number(booking.totalAmount || 0) / Number(booking.pax || 1))}` +
    `&total_amount=${encodeURIComponent(booking.totalAmount)}`;

  console.log("🌐 ONEWAY createHoldBooking URL:", holdUrl);

  const holdData = await safeFetch(holdUrl);
  console.log("📥 ONEWAY HOLD Response:", holdData);

  if (!holdData.success) {
    throw new Error(holdData.error || "Failed to create booking hold");
  }

  if (holdData.booking_id) {
    return [holdData.booking_id];
  }

  if (Array.isArray(holdData.booking_ids) && holdData.booking_ids.length > 0) {
    return holdData.booking_ids;
  }

  throw new Error("Hold created but booking ID missing");
}

// ===============================================================
// CONFIRM PAYMENT SUMMARY
// ===============================================================
async function confirmPaymentSummary() {
  console.log("✅ confirmPaymentSummary() called");
  console.log("📦 Current summary state:", paymentSummaryState);

  try {
    closePaymentSummaryModal();
    togglePayLoader(true);

    const booking = paymentSummaryState.booking;
    const tripType = getBookingTripType(booking);

    holdBookingIds = [];
    console.log("🧹 holdBookingIds reset before new payment flow");

    const createdIds = await createHoldBookingForSelectedTrip(booking);
    holdBookingIds = createdIds;

    console.log("🧾 HOLD Booking IDs Created:", holdBookingIds);

    startHoldTimer();

    const totalAmount = Number(paymentSummaryState.totalAmount || 0);
    const walletUsed = Number(paymentSummaryState.walletUsed || 0);
    const onlineAmount = Number(paymentSummaryState.onlineAmount || 0);
    const passQueryString = buildPassQueryString();
    const roundTripLegQueryString = buildRoundTripLegQueryString();
    const bookingIdsQueryString = buildBookingIdsQueryString();

    console.log("📘 Booking being confirmed:", booking);
    console.log("🛣️ tripType:", tripType);
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
        bookingIdsQueryString +
        `&trip_type=${encodeURIComponent(tripType)}` +
        `&email=${encodeURIComponent(currentUser.email)}` +
        `&amount=${encodeURIComponent(totalAmount)}` +
        passQueryString +
        roundTripLegQueryString
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
        description: `${getBookingDescription(booking)} (Wallet + Online)`,

        handler: async function (response) {
          console.log("✅ Mixed payment success:", response);

          togglePayLoader(true);
          clearTimeout(holdTimer);

          try {
            const verifyData = await safeFetch(
              `${APP_CONFIG.API_URL}?action=verifyMixedBookingPayment` +
              bookingIdsQueryString +
              `&trip_type=${encodeURIComponent(tripType)}` +
              `&email=${encodeURIComponent(currentUser.email)}` +
              `&wallet_amount=${encodeURIComponent(walletUsed)}` +
              `&online_amount=${encodeURIComponent(onlineAmount)}` +
              `&razorpay_order_id=${encodeURIComponent(response.razorpay_order_id)}` +
              `&razorpay_payment_id=${encodeURIComponent(response.razorpay_payment_id)}` +
              `&razorpay_signature=${encodeURIComponent(response.razorpay_signature)}` +
              passQueryString +
              roundTripLegQueryString
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
      description: getBookingDescription(booking),

      handler: async function (response) {
        console.log("✅ Full payment success:", response);

        togglePayLoader(true);
        clearTimeout(holdTimer);

        try {
          const confirmData = await safeFetch(
            `${APP_CONFIG.API_URL}?action=confirmBooking` +
            bookingIdsQueryString +
            `&trip_type=${encodeURIComponent(tripType)}` +
            `&razorpay_order_id=${encodeURIComponent(response.razorpay_order_id)}` +
            `&razorpay_payment_id=${encodeURIComponent(response.razorpay_payment_id)}` +
            `&razorpay_signature=${encodeURIComponent(response.razorpay_signature)}` +
            passQueryString +
            roundTripLegQueryString
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

  clearTimeout(holdTimer);

  holdTimer = setTimeout(async () => {
    console.log("⌛ HOLD TIME EXPIRED");
    await cancelHoldBooking();
  }, HOLD_TIME);
}

// ===============================================================
// CANCEL HOLD BOOKING
// ===============================================================
async function cancelHoldBooking() {
  if (!Array.isArray(holdBookingIds) || holdBookingIds.length === 0) {
    console.warn("⚠️ No holdBookingIds present, skipping cancel");
    return;
  }

  console.log("🚫 Cancelling HOLD booking IDs:", holdBookingIds);

  try {
    const tripType = paymentSummaryState?.tripType || "ONEWAY";

    const data = await safeFetch(
      `${APP_CONFIG.API_URL}?action=cancelBooking` +
      buildBookingIdsQueryString() +
      `&trip_type=${encodeURIComponent(tripType)}`
    );

    console.log("📥 Cancel Response:", data);
  } catch (err) {
    console.error("❌ Cancel Error:", err);
  }

  holdBookingIds = [];
  console.log("❌ HOLD booking(s) cancelled and local IDs reset");
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