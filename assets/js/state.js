// ===============================================================
// state.js
// ---------------------------------------------------------------
// This file manages the global runtime state of the application.
//
// Example:
// - currentUser stores the logged-in user details.
// - setCurrentUser() updates the global state.
// - clearCurrentUser() clears user data during logout.
//
// This prevents mixing state logic inside UI or auth functions.
// ===============================================================

export let currentUser = null;

export function setCurrentUser(user) {
  currentUser = user;
}

export function clearCurrentUser() {
  currentUser = null;
}
