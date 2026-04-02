// ===============================================================
// payment.js (WALLET SELECTION + SUMMARY POPUP VERSION 🚀🔥)
// ---------------------------------------------------------------
// FEATURES:
// ✅ Seat HOLD before payment
// ✅ Wallet balance check
// ✅ Payment summary popup
// ✅ Wallet usage only if checkbox selected
// ✅ Full wallet / partial wallet / full online all supported
// ✅ Safe API handling
// ✅ Full debug logs
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { currentUser } from "./state.js";

const HOLD_TIME = 5 * 60 * 1000;

let holdBookingId = null;
let holdTimer = null;

// ===============================================================
// PAYMENT SUMMARY STATE
// ===============================================================
let paymentSummaryState = {
  booking: null,
  totalAmount: 0,
  walletBalance: 0,
  useWallet: false,
  walletUsed: 0,
  onlineAmount: 0
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

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch wallet balance");
  }

  return Number(result.wallet_balance || 0);
}


// ===============================================================
// FORMAT AMOUNT
// ===============================================================
function formatAmount(amount) {
  return `₹${Number(amount || 0)}`;
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
          <div class="payment-summary-row">
            <span>Total Fare</span>
            <strong id="summaryTotalFare">₹0</strong>
          </div>

          <div class="payment-summary-row">
            <span>Wallet Balance</span>
            <strong id="summaryWalletBalance">₹0</strong>
          </div>

          <label class="payment-wallet-checkbox">
            <input type="checkbox" id="useWalletCheckbox" onchange="handleWalletCheckboxChange()">
            <span>Use wallet balance for this booking</span>
          </label>

          <div class="payment-summary-row">
            <span>Wallet Used</span>
            <strong id="summaryWalletUsed">₹0</strong>
          </div>

          <div class="payment-summary-row">
            <span>Pay Online</span>
            <strong id="summaryOnlineAmount">₹0</strong>
          </div>
        </div>

        <div class="payment-summary-footer">
          <button type="button" class="payment-summary-cancel-btn" onclick="closePaymentSummaryModal()">
            Cancel
          </button>

          <button type="button" class="payment-summary-confirm-btn" id="paymentSummaryConfirmBtn" onclick="confirmPaymentSummary()">
            Proceed
          </button>
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
// UPDATE PAYMENT SUMMARY UI
// ===============================================================
function updatePaymentSummaryUI() {
  console.log("🔄 updatePaymentSummaryUI() called");
  console.log("📦 paymentSummaryState:", paymentSummaryState);

  const totalFareEl = document.getElementById("summaryTotalFare");
  const walletBalanceEl = document.getElementById("summaryWalletBalance");
  const walletUsedEl = document.getElementById("summaryWalletUsed");
  const onlineAmountEl = document.getElementById("summaryOnlineAmount");
  const checkbox = document.getElementById("useWalletCheckbox");
  const confirmBtn = document.getElementById("paymentSummaryConfirmBtn");

  if (totalFareEl) totalFareEl.textContent = formatAmount(paymentSummaryState.totalAmount);
  if (walletBalanceEl) walletBalanceEl.textContent = formatAmount(paymentSummaryState.walletBalance);

  if (checkbox) {
    checkbox.checked = paymentSummaryState.useWallet;
  }

  if (paymentSummaryState.useWallet) {
    paymentSummaryState.walletUsed = Math.min(
      paymentSummaryState.walletBalance,
      paymentSummaryState.totalAmount
    );
  } else {
    paymentSummaryState.walletUsed = 0;
  }

  paymentSummaryState.onlineAmount =
    paymentSummaryState.totalAmount - paymentSummaryState.walletUsed;

  if (walletUsedEl) walletUsedEl.textContent = formatAmount(paymentSummaryState.walletUsed);
  if (onlineAmountEl) onlineAmountEl.textContent = formatAmount(paymentSummaryState.onlineAmount);

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

    if (!booking) {
      togglePayLoader(false);
      alert("⚠️ Please select a route first");
      return;
    }

    console.log("📦 Booking Data:", booking);

    // ==========================================================
    // CREATE HOLD BOOKING
    // ==========================================================
    console.log("⏳ Creating HOLD booking...");

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
      `&passenger_name=${currentUser.name}` +
      `&passenger_email=${currentUser.email}` +
      `&passenger_phone=${currentUser.phone}` +
      `&seats_booked=${booking.pax}` +
      `&fare_per_seat=${booking.totalAmount / booking.pax}` +
      `&total_amount=${booking.totalAmount}`
    );

    console.log("📥 HOLD Response:", holdData);

    if (!holdData.success) {
      togglePayLoader(false);
      alert("❌ Failed to create booking hold");
      return;
    }

    holdBookingId = holdData.booking_id;
    console.log("🧾 HOLD Booking Created:", holdBookingId);

    startHoldTimer();

    // ==========================================================
    // FETCH WALLET BALANCE
    // ==========================================================
    const walletBalance = await fetchWalletBalance(currentUser.email);
    console.log("💰 Wallet balance fetched:", walletBalance);

    paymentSummaryState = {
      booking,
      totalAmount: Number(booking.totalAmount || 0),
      walletBalance,
      useWallet: false,
      walletUsed: 0,
      onlineAmount: Number(booking.totalAmount || 0)
    };

    togglePayLoader(false);
    openPaymentSummaryModal();

  } catch (error) {
    console.error("❌ Payment flow start failed:", error);
    togglePayLoader(false);
    alert("Unable to start payment");
  }
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
    const totalAmount = paymentSummaryState.totalAmount;
    const walletUsed = paymentSummaryState.walletUsed;
    const onlineAmount = paymentSummaryState.onlineAmount;

    // ==========================================================
    // CASE 1: FULL WALLET PAYMENT
    // ==========================================================
    if (walletUsed > 0 && onlineAmount === 0) {
      console.log("💰 Full wallet payment selected");

      const walletPayResult = await safeFetch(
        `${APP_CONFIG.API_URL}?action=processWalletBookingPayment` +
        `&booking_id=${encodeURIComponent(holdBookingId)}` +
        `&email=${encodeURIComponent(currentUser.email)}` +
        `&amount=${encodeURIComponent(totalAmount)}`
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
        alert("❌ Failed to create online payment order");
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
              `&razorpay_signature=${encodeURIComponent(response.razorpay_signature)}`
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
            alert("Mixed payment verification failed");
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
    console.log("🔴 Wallet not selected, full Razorpay payment");

    const order = await safeFetch(
      `${APP_CONFIG.API_URL}?action=createOrder&amount=${encodeURIComponent(totalAmount * 100)}`
    );

    console.log("📥 Full payment order response:", order);

    if (!order.success) {
      togglePayLoader(false);
      alert("❌ Failed to create order");
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
            `&razorpay_signature=${encodeURIComponent(response.razorpay_signature)}`
          );

          console.log("📥 confirmBooking response:", confirmData);

          togglePayLoader(false);

          if (!confirmData.success) {
            alert("❌ Booking confirmation failed");
            return;
          }

          alert("✅ Booking Confirmed!");

        } catch (err) {
          console.error("❌ Full payment confirm error:", err);
          togglePayLoader(false);
          alert("Booking confirmation failed");
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
    alert("Unable to continue payment");
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