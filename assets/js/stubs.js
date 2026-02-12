// ===============================================================
// stubs.js
// ---------------------------------------------------------------
// This file contains placeholder ("Coming soon") functions.
//
// These are functions referenced in index.html using onclick="...".
//
// Example:
// - resetBooking()
// - openPaymentModal()
// - processPayment()
//
// If these functions are not defined, the HTML will break.
// So we register them safely on window.
// ===============================================================

export function registerStubFunctions() {
  [
    "resetBooking",
    "openPaymentModal",
    "processPayment",
    "closePaymentModal",
    "closeConfirmationModal",
    "cancelBooking",
    "clearCancelForm",
    "syncAllBookingsToSheets",
    "syncAllUsersToSheets",
    "importRoutesFromSheets",
    "generateAnalytics"
  ].forEach((name) => {
    window[name] = function () {
      alert(`${name} – Coming soon!`);
    };
  });
}