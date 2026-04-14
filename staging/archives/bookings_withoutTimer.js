// =======================
// booking.gs
// =======================
// This file contains all booking-related functions.
// It handles booking creation and payment data storage.

function createBooking(params) {
  try {

    // Get the Bookings sheet
    const sheet = getBookingsSheet();

    // Generate unique booking ID using timestamp
    const bookingId = "BK" + new Date().getTime();

    // Append a new row in Bookings sheet
    // Column order must match Bookings sheet headers exactly
    sheet.appendRow([
      bookingId,                     // A: booking_id
      params.booking_date,           // B: booking_date (when user booked)
      params.travel_date,            // C: travel_date
      params.route_id,               // D: route_id
      params.bus_id,                 // E: bus_id
      params.fromStop,               // F: fromStop
      params.toStop,                 // G: toStop
      params.passenger_name,         // H: passenger_name
      params.passenger_email,        // I: passneger_email
      params.passenger_phone,        // J: passenger_phone
      params.seats_booked,           // K: seats_booked
      params.fare_per_seat,          // L: fare_per_seat
      params.total_amount,           // M: total_amount
      params.razorpay_order_id,      // N: razorpay_order_id
      params.razorpay_payment_id,    // O: razorpay_payment_id
      params.razorpay_signature,     // P: razorpay_signature
      params.payment_status,         // Q: payment_status (PAID / FAILED)
      params.booking_status,         // R: booking_status (CONFIRMED / CANCELLED)
      new Date()                     // S: created_at (server timestamp)
    ]);

    // Return success response
    return jsonResponse({
      success: true,
      booking_id: bookingId
    });

  } catch (error) {

    // Return error if anything fails
    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}