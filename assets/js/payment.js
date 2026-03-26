// ===============================================================
// payment.js (ULTIMATE PRO VERSION 🚀🔥)
// ---------------------------------------------------------------
// Features:
// ✅ Seat HOLD before payment
// ✅ Configurable timer
// ✅ Auto cancel on timeout
// ✅ Update booking after success
// ✅ Loader UI (UX improved)
// ✅ Safe API handling (no silent failures)
// ✅ Full debug logs (Chrome console)
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { currentUser } from "./state.js";

// ===============================================================
// ⏳ CONFIGURABLE HOLD TIMER
// ===============================================================
const HOLD_TIME = 1 * 60 * 1000; // 🔥 CHANGE HERE

let holdBookingId = null;
let holdTimer = null;


// ===============================================================
// 🎨 LOADER CONTROL (BUTTON UX)
// ===============================================================
function togglePayLoader(show) {

  const btnText = document.getElementById("payBtnText");
  const loader  = document.getElementById("payLoader");
  const btn     = document.getElementById("payBtn");

  if (!btn || !btnText || !loader) return;

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
// 🔐 SAFE FETCH (VERY IMPORTANT 🔥)
// Prevents blank responses breaking your app
// ===============================================================
async function safeFetch(url) {

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
// 💳 MAIN PAYMENT FUNCTION
// ===============================================================
export async function openPaymentModal() {

  try {

    console.log("💳 Starting payment flow...");

    togglePayLoader(true); // ✅ START LOADER

    // ==========================================================
    // 1️⃣ GET BOOKING DATA
    // ==========================================================
    const booking = window.selectedBooking;

    if (!booking) {
      togglePayLoader(false);
      alert("⚠️ Please select a route first");
      return;
    }

    console.log("📦 Booking Data:", booking);

    const amount = parseInt(booking.totalAmount) * 100;

    // ==========================================================
    // 2️⃣ CREATE HOLD BOOKING
    // ==========================================================
    console.log("⏳ Creating HOLD booking...");

    const holdData = await safeFetch(
      `${APP_CONFIG.API_URL}?action=createHoldBooking` +
      `&booking_date=${new Date().toISOString().split("T")[0]}` +
      `&travel_date=${booking.travelDate}` +
      `&route_id=${booking.routeId}` +
      `&bus_id=` +
      `&fromStop=${booking.fromStop}` +
      `&toStop=${booking.toStop}` +
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

    // ==========================================================
    // 3️⃣ START HOLD TIMER
    // ==========================================================
    startHoldTimer();

    // ==========================================================
    // 4️⃣ CREATE RAZORPAY ORDER
    // ==========================================================
    console.log("🌐 Creating Razorpay order...");

    const order = await safeFetch(
      `${APP_CONFIG.API_URL}?action=createOrder&amount=${amount}`
    );

    console.log("📥 Order Response:", order);

    if (!order.success) {
      togglePayLoader(false);
      alert("❌ Failed to create order");
      return;
    }

    console.log("🧾 Order Created:", order);

    // ==========================================================
    // 5️⃣ STOP LOADER BEFORE OPENING RAZORPAY
    // ==========================================================
    togglePayLoader(false);

    // ==========================================================
    // 6️⃣ RAZORPAY OPTIONS
    // ==========================================================
    const options = {

      key: "rzp_test_SToJcqhAImfHOY",
      amount: order.amount,
      currency: "INR",
      order_id: order.id,

      name: "SHRD Shuttle",
      description: booking.routeName,

      // ======================================================
      // ✅ PAYMENT SUCCESS
      // ======================================================
      handler: async function (response) {

        console.log("✅ Payment Success:", response);

        clearTimeout(holdTimer);

        try {

          console.log("🔄 Confirming booking...");

          const confirmData = await safeFetch(
            `${APP_CONFIG.API_URL}?action=confirmBooking` +
            `&booking_id=${holdBookingId}` +
            `&razorpay_order_id=${response.razorpay_order_id}` +
            `&razorpay_payment_id=${response.razorpay_payment_id}` +
            `&razorpay_signature=${response.razorpay_signature}`
          );

          console.log("📥 Confirm Response:", confirmData);

          if (!confirmData.success) {
            alert("❌ Booking confirmation failed");
            return;
          }

          console.log("🎉 Booking Confirmed!");
          alert("✅ Booking Confirmed!");

        } catch (err) {
          console.error("❌ Confirm Error:", err);
          alert("Booking confirmation failed");
        }
      },

      // ======================================================
      // ❌ USER CANCELLED
      // ======================================================
      modal: {
        ondismiss: async function () {

          console.log("❌ Payment cancelled by user");

          clearTimeout(holdTimer);

          await cancelHoldBooking();
        }
      },

      theme: {
        color: "#6f42c1"
      }
    };

    // ==========================================================
    // 7️⃣ OPEN RAZORPAY
    // ==========================================================
    const rzp = new Razorpay(options);
    rzp.open();

  } catch (error) {

    console.error("❌ Payment error:", error);

    togglePayLoader(false);

    alert("Payment failed");
  }
}


// ===============================================================
// ⏳ HOLD TIMER
// ===============================================================
function startHoldTimer() {

  console.log(`⏳ HOLD TIMER STARTED (${HOLD_TIME / 1000}s)`);

  holdTimer = setTimeout(async () => {

    console.log("⌛ HOLD TIME EXPIRED");

    await cancelHoldBooking();

  }, HOLD_TIME);
}


// ===============================================================
// ❌ CANCEL HOLD BOOKING
// ===============================================================
async function cancelHoldBooking() {

  if (!holdBookingId) return;

  console.log("🚫 Cancelling HOLD booking:", holdBookingId);

  try {

    const data = await safeFetch(
      `${APP_CONFIG.API_URL}?action=cancelBooking` +
      `&booking_id=${holdBookingId}`
    );

    console.log("📥 Cancel Response:", data);

  } catch (err) {
    console.error("❌ Cancel Error:", err);
  }

  console.log("❌ HOLD booking cancelled");
}