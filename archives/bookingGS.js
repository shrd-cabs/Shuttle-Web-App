// ===============================================================
// booking.gs (UPDATED WITH PAYMENT METHOD + ROLLBACK SUPPORT 🚀)
// ---------------------------------------------------------------
// Handles:
// 1. HOLD booking (before payment)
// 2. CONFIRM booking (after payment)
// 3. CANCEL booking (user cancel / timeout)
// 4. CONFIRM wallet booking
// 5. CONFIRM mixed booking
//
// NEW FIELDS:
// ---------------------------------------------------------------
// payment_method
//
// POSSIBLE VALUES:
// ---------------------------------------------------------------
// RAZORPAY
// WALLET
// RAZORPAY+WALLET
// ===============================================================



// ===============================================================
// 1️⃣ CREATE HOLD BOOKING
// ---------------------------------------------------------------
// Creates HOLD row before payment starts
// ===============================================================
function createHoldBooking(e) {
  var debug = [];

  try {
    var sheet = getBookingsSheet();
    var params = e.parameter;

    var bookingId = "BK" + new Date().getTime();

    debug.push("🚀 createHoldBooking() called");
    debug.push("🧾 bookingId: " + bookingId);
    debug.push("📧 passenger_email: " + params.passenger_email);
    Logger.log(debug.join("\n"));

    sheet.appendRow([

      // ---------------- BASIC DETAILS ----------------
      bookingId,                       // 1  booking_id
      params.booking_date,             // 2  booking_date
      params.travel_date,              // 3  travel_date
      params.route_id,                 // 4  route_id

      // ---------------- BUS DETAILS ----------------
      params.bus_id || "",             // 5  bus_id
      params.bus_number || "",         // 6  bus_number
      params.driver_name || "",        // 7  driver_name
      params.driver_phone || "",       // 8  driver_phone

      // ---------------- JOURNEY DETAILS ----------------
      params.fromStop,                 // 9  fromStop
      params.toStop,                   // 10 toStop

      // ---------------- TIME FIELDS ----------------
      params.scheduled_pickup_time,    // 11 scheduled_pickup_time
      "",                              // 12 actual_pickup_time
      params.scheduled_drop_time,      // 13 scheduled_drop_time
      "",                              // 14 actual_drop_time

      // ---------------- PASSENGER DETAILS ----------------
      params.passenger_name,           // 15 passenger_name
      params.passenger_email,          // 16 passenger_email
      params.passenger_phone,          // 17 passenger_phone

      // ---------------- BOOKING DETAILS ----------------
      params.seats_booked,             // 18 seats_booked
      params.fare_per_seat,            // 19 fare_per_seat
      params.total_amount,             // 20 total_amount

      // ---------------- PAYMENT DETAILS ----------------
      "",                              // 21 razorpay_order_id
      "",                              // 22 razorpay_payment_id
      "",                              // 23 razorpay_signature

      // ---------------- STATUS ----------------
      "PENDING",                       // 24 payment_status
      "HOLD",                          // 25 booking_status

      // ---------------- TIMESTAMP ----------------
      new Date(),                      // 26 created_at

      // ---------------- NEW PAYMENT METHOD ----------------
      ""                               // 27 payment_method
    ]);

    debug.push("✅ HOLD booking row inserted");
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: true,
      booking_id: bookingId,
      debug: debug
    });

  } catch (error) {
    debug.push("🔥 ERROR: " + error.toString());
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: false,
      error: error.toString(),
      debug: debug
    });
  }
}



// ===============================================================
// 2️⃣ CONFIRM BOOKING (FULL RAZORPAY)
// ---------------------------------------------------------------
// IMPORTANT:
// verify signature BEFORE confirming
// ===============================================================
function confirmBooking(e) {
  var debug = [];

  try {
    var sheet = getBookingsSheet();
    var data = sheet.getDataRange().getValues();
    var params = e.parameter;

    debug.push("🚀 confirmBooking() called");
    debug.push("🧾 booking_id: " + params.booking_id);
    debug.push("🧾 razorpay_order_id: " + params.razorpay_order_id);
    debug.push("🧾 razorpay_payment_id: " + params.razorpay_payment_id);
    Logger.log(debug.join("\n"));

    // ===========================================================
    // VERIFY SIGNATURE FIRST
    // ===========================================================
    var isValid = verifyRazorpaySignature(
      params.razorpay_order_id,
      params.razorpay_payment_id,
      params.razorpay_signature
    );

    debug.push("🔐 Signature valid: " + isValid);
    Logger.log(debug.join("\n"));

    if (!isValid) {
      return jsonResponse({
        success: false,
        error: "Invalid payment signature",
        debug: debug
      });
    }

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0] || "").trim() === String(params.booking_id || "").trim()) {
        var row = i + 1;

        // Payment details
        sheet.getRange(row, 21).setValue(params.razorpay_order_id);
        sheet.getRange(row, 22).setValue(params.razorpay_payment_id);
        sheet.getRange(row, 23).setValue(params.razorpay_signature);

        // Status
        sheet.getRange(row, 24).setValue("PAID");
        sheet.getRange(row, 25).setValue("CONFIRMED");

        // Payment method
        sheet.getRange(row, 27).setValue("RAZORPAY");

        debug.push("✅ Booking confirmed with full Razorpay");
        Logger.log(debug.join("\n"));

        return jsonResponse({
          success: true,
          message: "Booking confirmed",
          payment_method: "RAZORPAY",
          debug: debug
        });
      }
    }

    return jsonResponse({
      success: false,
      error: "Booking not found",
      debug: debug
    });

  } catch (error) {
    debug.push("🔥 ERROR: " + error.toString());
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: false,
      error: error.toString(),
      debug: debug
    });
  }
}



// ===============================================================
// 3️⃣ CANCEL BOOKING
// ---------------------------------------------------------------
// User cancel / timeout / payment fail
// ===============================================================
function cancelBooking(e) {
  var debug = [];

  try {
    var sheet = getBookingsSheet();
    var data = sheet.getDataRange().getValues();
    var params = e.parameter;

    debug.push("🚀 cancelBooking() called");
    debug.push("🧾 booking_id: " + params.booking_id);
    Logger.log(debug.join("\n"));

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0] || "").trim() === String(params.booking_id || "").trim()) {
        var row = i + 1;

        sheet.getRange(row, 24).setValue("FAILED");
        sheet.getRange(row, 25).setValue("CANCELLED");

        debug.push("✅ Booking cancelled");
        Logger.log(debug.join("\n"));

        return jsonResponse({
          success: true,
          message: "Booking cancelled",
          debug: debug
        });
      }
    }

    return jsonResponse({
      success: false,
      error: "Booking not found",
      debug: debug
    });

  } catch (error) {
    debug.push("🔥 ERROR: " + error.toString());
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: false,
      error: error.toString(),
      debug: debug
    });
  }
}



// ===============================================================
// 4️⃣ CONFIRM WALLET BOOKING
// ---------------------------------------------------------------
// Full wallet payment booking confirm
// ===============================================================
function confirmWalletBooking(bookingId) {
  try {
    Logger.log("🚀 confirmWalletBooking() called for bookingId: " + bookingId);

    var sheet = getBookingsSheet();
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0] || "").trim() === String(bookingId || "").trim()) {
        var row = i + 1;

        sheet.getRange(row, 24).setValue("SUCCESS");
        sheet.getRange(row, 25).setValue("CONFIRMED");
        sheet.getRange(row, 27).setValue("WALLET");

        Logger.log("✅ Wallet booking confirmed");

        return {
          success: true
        };
      }
    }

    return {
      success: false,
      error: "Booking not found"
    };

  } catch (error) {
    Logger.log("🔥 confirmWalletBooking() error: " + error.toString());

    return {
      success: false,
      error: error.toString()
    };
  }
}



// ===============================================================
// 5️⃣ CONFIRM MIXED BOOKING
// ---------------------------------------------------------------
// Wallet + Razorpay booking confirm
// ===============================================================
function confirmMixedBooking(bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  try {
    Logger.log("🚀 confirmMixedBooking() called for bookingId: " + bookingId);

    var sheet = getBookingsSheet();
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0] || "").trim() === String(bookingId || "").trim()) {
        var row = i + 1;

        sheet.getRange(row, 21).setValue(razorpayOrderId);
        sheet.getRange(row, 22).setValue(razorpayPaymentId);
        sheet.getRange(row, 23).setValue(razorpaySignature);

        sheet.getRange(row, 24).setValue("SUCCESS");
        sheet.getRange(row, 25).setValue("CONFIRMED");
        sheet.getRange(row, 27).setValue("RAZORPAY+WALLET");

        Logger.log("✅ Mixed booking confirmed");

        return {
          success: true
        };
      }
    }

    return {
      success: false,
      error: "Booking not found"
    };

  } catch (error) {
    Logger.log("🔥 confirmMixedBooking() error: " + error.toString());

    return {
      success: false,
      error: error.toString()
    };
  }
}