// ===============================================================
// payment.js
// ---------------------------------------------------------------
// Handles Razorpay payment flow (aligned with project structure)
// ===============================================================
// Test razorpay keys
//    const keyId = "rzp_test_SToJcqhAImfHOY";       // your key id
//    const keySecret = "2pe9V2jxgFH5BAcgIaA8PXmZ";      // your secret
// Live razorpay keys
//    const keyId = "rzp_live_STnSll8AkTlMTl";       // your key id
//  const keySecret = "Lbg218z4qgdfH4jIl2FkYPxw";      // your secret 

import { APP_CONFIG } from "./config.js";

export async function openPaymentModal() {
  try {
    console.log("💳 Starting payment...");

    // ===============================
    // GET BOOKING DATA
    // ===============================
    const booking = window.selectedBooking;

    if (!booking) {
      alert("⚠️ Please select a route first");
      return;
    }

    console.log("📦 Booking Data:", booking);

    const amount = parseInt(booking.totalAmount) * 100; // ₹ → paise

    // ===============================
    // CALL BACKEND (Apps Script)
    // ===============================
    console.log("🌐 Creating Razorpay order...");

    const response = await fetch(
      `${APP_CONFIG.API_URL}?action=createOrder&amount=${amount}`
    );

    const order = await response.json();

    console.log("🧾 Order Response:", order);

    if (!order.success) {
      alert("❌ Failed to create order");
      return;
    }

    // ===============================
    // RAZORPAY OPTIONS
    // ===============================
    const options = {
      key: "rzp_live_STnSll8AkTlMTl",
      amount: order.amount,
      currency: "INR",
      order_id: order.id,

      name: "SHRD Shuttle",
      description: booking.routeName,

      handler: async function (response) {
        console.log("✅ Payment Success:", response);

        alert("Payment Successful!");

        // ===============================
        // SAVE BOOKING TO SHEET
        // ===============================
        await fetch(`${APP_CONFIG.API_URL}?action=saveBooking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...booking,
            payment_id: response.razorpay_payment_id,
            order_id: response.razorpay_order_id,
            status: "SUCCESS",
            date: new Date().toISOString()
          })
        });

        window.location.href = "success.html";
      },

      modal: {
        ondismiss: function () {
          console.log("❌ Payment cancelled");
        }
      },

      theme: {
        color: "#6f42c1"
      }
    };

    // ===============================
    // OPEN RAZORPAY
    // ===============================
    const rzp = new Razorpay(options);
    rzp.open();

  } catch (error) {
    console.error("❌ Payment error:", error);
    alert("Payment failed");
  }
}