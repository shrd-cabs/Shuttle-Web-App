// ===============================================================
// captainDashboard.js
// ---------------------------------------------------------------
// Handles captain dashboard + trip manifest UI
// ===============================================================

import { APP_CONFIG } from "/assets/js/config.js";
import { getCaptainSession } from "./captainAuth.js";
import { switchCaptainTabUI } from "./captainUi.js";

// ===============================================================
// STATE
// ===============================================================
let currentTripId = "";
let currentTravelDate = new Date().toISOString().slice(0, 10);

// ===============================================================
// HELPER: SAFE TIME FORMAT
// ---------------------------------------------------------------
// Converts:
// - "18:00:00" -> "18:00"
// - "18:00"    -> "18:00"
// - empty      -> "-"
// ===============================================================
function formatTime(value) {
  if (!value) return "-";

  const str = String(value).trim();

  if (/^\d{2}:\d{2}:\d{2}$/.test(str)) {
    return str.slice(0, 5);
  }

  return str;
}

// ===============================================================
// HELPER: PASSENGER TIMESTAMP FORMAT
// ---------------------------------------------------------------
// Converts:
// - "2026-04-06 22:35:19" -> "06 Apr, 10:35 PM"
// - JS date strings       -> local readable format
// - empty                 -> "Pending"
// ===============================================================
function formatPassengerTimestamp(value) {
  if (!value) return "Pending";

  const str = String(value).trim();

  // Case 1: backend formatted "YYYY-MM-DD HH:mm:ss"
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const [, y, m, d, hh, mm] = match;
    const dateObj = new Date(`${y}-${m}-${d}T${hh}:${mm}:00`);
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    }
  }

  // Case 2: already a browser-readable date string
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }

  return str;
}

// ===============================================================
// HELPER: TOGGLE ACTION BUTTON LOADER
// ---------------------------------------------------------------
// Used for:
// - Open Trip Details button
// - Mark Picked Up button
// ===============================================================
function toggleActionButtonLoader(buttonId, textId, loaderId, isLoading, loadingText = "Loading...") {
  console.log("🔄 toggleActionButtonLoader() called", {
    buttonId,
    textId,
    loaderId,
    isLoading,
    loadingText
  });

  const button = document.getElementById(buttonId);
  const textEl = document.getElementById(textId);
  const loaderEl = document.getElementById(loaderId);

  if (!button || !textEl || !loaderEl) {
    console.warn("⚠️ toggleActionButtonLoader() missing required elements");
    return;
  }

  if (!textEl.dataset.defaultText) {
    textEl.dataset.defaultText = textEl.textContent;
  }

  button.disabled = isLoading;
  textEl.textContent = isLoading ? loadingText : textEl.dataset.defaultText;
  loaderEl.style.display = isLoading ? "inline-block" : "none";
}

// ===============================================================
// HELPER: FREEZE ACTION BUTTON AFTER SUCCESS
// ---------------------------------------------------------------
// Used when an action is completed successfully.
// Example:
// - Mark Picked Up  -> Picked Up
// - Mark Stop Reached -> Reached
// ===============================================================
function freezeActionButton(buttonId, textId, finalText) {
  console.log("🧊 freezeActionButton() called", {
    buttonId,
    textId,
    finalText
  });

  const button = document.getElementById(buttonId);
  const textEl = document.getElementById(textId);

  if (!button || !textEl) {
    console.warn("⚠️ freezeActionButton() missing required elements");
    return;
  }

  button.disabled = true;
  button.dataset.frozen = "true";
  textEl.textContent = finalText;
}

// ===============================================================
// PUBLIC TAB WRAPPER
// ---------------------------------------------------------------
// This wrapper exists so HTML onclick="switchCaptainTab('...')"
// can safely call a global function attached to window.
// ===============================================================
export function switchCaptainTab(tabName) {
  console.log(`🟣 switchCaptainTab() wrapper called → ${tabName}`);
  switchCaptainTabUI(tabName);
}

// ===============================================================
// RENDER: ASSIGNED TRIPS
// ---------------------------------------------------------------
// Shows all assigned trips with action button to open details
// Includes per-button loader state
// ===============================================================
function renderTrips(trips) {
  console.log("📋 renderTrips() called", trips);

  const container = document.getElementById("captainTripsList");
  if (!container) {
    console.warn("⚠️ captainTripsList container not found");
    return;
  }

  if (!trips || !trips.length) {
    container.innerHTML = `
      <p style="text-align:center;color:#999;">
        No trips found for this bus.
      </p>
    `;
    return;
  }

  container.innerHTML = trips.map((trip) => `
    <div class="captain-list-card captain-trip-card">
      <div><strong>${trip.tripName}</strong> (${trip.tripId})</div>
      <div>Route: ${trip.firstStop} → ${trip.lastStop}</div>
      <div>Time: ${formatTime(trip.firstStopTime)} → ${formatTime(trip.lastStopTime)}</div>
      <div>Confirmed Seats: ${trip.bookingSummary.confirmedSeats}</div>
      <div>Hold Seats: ${trip.bookingSummary.holdSeats}</div>
      <div>Cancelled Seats: ${trip.bookingSummary.cancelledSeats}</div>

      <div style="margin-top:10px;">
        <button
          class="btn btn-primary captain-open-trip-btn"
          id="openTripBtn_${trip.tripId}"
          onclick="openCaptainTripManifest('${trip.tripId}')"
          type="button"
        >
          <span id="openTripBtnText_${trip.tripId}">Open Trip Details</span>
          <span id="openTripBtnLoader_${trip.tripId}" class="btn-loader" style="display:none;"></span>
        </button>
      </div>
    </div>
  `).join("");

  console.log("✅ Trips rendered successfully");
}

// ===============================================================
// RENDER: STOPS
// ---------------------------------------------------------------
// Shows stop cards with:
// - compact stop info
// - button loader state
// - disabled state for already reached stops
// ===============================================================
function renderStops(stops) {
  console.log("🛑 renderStops() called", stops);

  const container = document.getElementById("captainStopsList");
  if (!container) {
    console.warn("⚠️ captainStopsList container not found");
    return;
  }

  if (!stops || !stops.length) {
    container.innerHTML = `
      <p style="text-align:center;color:#999;">
        No stops found.
      </p>
    `;
    return;
  }

  container.innerHTML = stops.map((stop) => `
    <div class="captain-list-card">
      <strong>${stop.stopOrder}. ${stop.stopName}</strong>
      <div>Scheduled: ${formatTime(stop.arrivalTime)} | Actual: ${formatPassengerTimestamp(stop.actualReachedTime)}</div>
      <div>Status: ${stop.stopStatus}</div>
      <div>Pickups: ${stop.pickups} | Drops: ${stop.drops}</div>

      <button
        class="btn btn-primary"
        id="stopBtn_${stop.stopId}"
        onclick="markCaptainStopReached('${stop.stopId}')"
        type="button"
        ${stop.stopStatus === "REACHED" ? "disabled" : ""}
      >
        <span id="stopBtnText_${stop.stopId}">
          ${stop.stopStatus === "REACHED" ? "Reached" : "Mark Stop Reached"}
        </span>
        <span id="stopBtnLoader_${stop.stopId}" class="btn-loader" style="display:none;"></span>
      </button>
    </div>
  `).join("");

  console.log("✅ Stops rendered successfully");
}

// ===============================================================
// RENDER: PASSENGERS
// ---------------------------------------------------------------
// Shows passenger cards with:
// - cleaner pickup/drop time format
// - per-button loader state
// ===============================================================
function renderPassengers(passengers) {
  console.log("👥 renderPassengers() called", passengers);

  const container = document.getElementById("captainPassengersList");
  if (!container) {
    console.warn("⚠️ captainPassengersList container not found");
    return;
  }

  if (!passengers || !passengers.length) {
    container.innerHTML = `
      <p style="text-align:center;color:#999;">
        No confirmed passengers found.
      </p>
    `;
    return;
  }

  container.innerHTML = passengers.map((p) => `
    <div class="captain-list-card">
      <strong>${p.passengerName}</strong>
      <div>Booking: ${p.bookingId}</div>
      <div>Phone: ${p.passengerPhone || "-"}</div>
      <div>${p.fromStop} → ${p.toStop}</div>
      <div>Seats: ${p.seatsBooked}</div>
      <div>Pickup: ${formatPassengerTimestamp(p.actualPickupTime)}</div>
      <div>Drop: ${formatPassengerTimestamp(p.actualDropTime)}</div>

      <button
        class="btn btn-primary"
        id="pickupBtn_${p.bookingId}"
        onclick="markCaptainPassengerPickedUp('${p.bookingId}')"
        type="button"
        ${p.actualPickupTime ? "disabled" : ""}
      >
        <span id="pickupBtnText_${p.bookingId}">
          ${p.actualPickupTime ? "Picked Up" : "Mark Picked Up"}
        </span>
        <span id="pickupBtnLoader_${p.bookingId}" class="btn-loader" style="display:none;"></span>
      </button>
    </div>
  `).join("");

  console.log("✅ Passengers rendered successfully");
}

// ===============================================================
// LOAD DASHBOARD
// ===============================================================
export async function loadCaptainDashboard() {
  console.log("--------------------------------------------------");
  console.log("📊 loadCaptainDashboard() called");

  const session = getCaptainSession();
  console.log("🧾 Captain session:", session);

  if (!session) {
    console.warn("⚠️ No captain session found");
    return;
  }

  try {
    const url =
      `${APP_CONFIG.API_URL}?action=getCaptainDashboard` +
      `&driver_id=${encodeURIComponent(session.driverId)}` +
      `&travel_date=${encodeURIComponent(currentTravelDate)}`;

    console.log("📡 Dashboard API URL:", url);

    const response = await fetch(url);
    const result = await response.json();

    console.log("📥 Dashboard API Response:", result);

    if (!result.success) {
      alert(result.message || "Failed to load captain dashboard");
      return;
    }

    renderTrips(result.trips || []);
    console.log("✅ Dashboard loaded successfully");

  } catch (error) {
    console.error("❌ loadCaptainDashboard() failed:", error);
    alert("Failed to load dashboard");
  }

  console.log("--------------------------------------------------");
}

// ===============================================================
// OPEN TRIP DETAILS
// ---------------------------------------------------------------
// Loads selected trip stops + passengers
// Adds loading state to clicked button
// ===============================================================
export async function openCaptainTripManifest(tripId) {
  console.log("--------------------------------------------------");
  console.log(`🧭 openCaptainTripManifest() called → ${tripId}`);

  const session = getCaptainSession();
  console.log("🧾 Captain session:", session);

  if (!session) {
    console.warn("⚠️ No captain session found");
    return;
  }

  currentTripId = tripId;
  console.log("📌 currentTripId set to:", currentTripId);

  const buttonId = `openTripBtn_${tripId}`;
  const textId = `openTripBtnText_${tripId}`;
  const loaderId = `openTripBtnLoader_${tripId}`;

  try {
    toggleActionButtonLoader(buttonId, textId, loaderId, true, "Opening...");

    const url =
      `${APP_CONFIG.API_URL}?action=getCaptainTripManifest` +
      `&driver_id=${encodeURIComponent(session.driverId)}` +
      `&trip_id=${encodeURIComponent(tripId)}` +
      `&travel_date=${encodeURIComponent(currentTravelDate)}`;

    console.log("📡 Manifest API URL:", url);

    const response = await fetch(url);
    const result = await response.json();

    console.log("📥 Manifest API Response:", result);

    if (!result.success) {
      alert(result.message || "Failed to load trip details");
      return;
    }

    const manifestTripId = document.getElementById("manifestTripId");
    const manifestTripName = document.getElementById("manifestTripName");
    const manifestTravelDate = document.getElementById("manifestTravelDate");

    if (manifestTripId) manifestTripId.textContent = result.trip.tripId || "-";
    if (manifestTripName) manifestTripName.textContent = result.trip.tripName || "-";
    if (manifestTravelDate) manifestTravelDate.textContent = result.travelDate || "-";

    const captainTripId = document.getElementById("captainTripId");
    const captainRoute = document.getElementById("captainRoute");
    const captainTripStatus = document.getElementById("captainTripStatus");

    if (captainTripId) captainTripId.textContent = result.trip.tripId || "-";
    if (captainRoute) captainRoute.textContent = result.trip.tripName || "Not Assigned";
    if (captainTripStatus) captainTripStatus.textContent = "In Progress";

    renderStops(result.stops || []);
    renderPassengers(result.passengers || []);

    switchCaptainTabUI("manifest");
    console.log("✅ Trip details opened successfully");

  } catch (error) {
    console.error("❌ openCaptainTripManifest() failed:", error);
    alert("Failed to load trip details");

  } finally {
    toggleActionButtonLoader(buttonId, textId, loaderId, false);
    console.log("🏁 openCaptainTripManifest() completed");
    console.log("--------------------------------------------------");
  }
}

/// ===============================================================
// MARK PASSENGER PICKED UP
// ---------------------------------------------------------------
// Expected behavior:
// 1. Show loader while request is running
// 2. On success, freeze button immediately
// 3. Reload current trip details in background
// ===============================================================
export async function markCaptainPassengerPickedUp(bookingId) {
  console.log("--------------------------------------------------");
  console.log(`🧍 markCaptainPassengerPickedUp() called → ${bookingId}`);

  const session = getCaptainSession();
  console.log("🧾 Captain session:", session);

  if (!session) {
    console.warn("⚠️ No captain session found");
    return;
  }

  const buttonId = `pickupBtn_${bookingId}`;
  const textId = `pickupBtnText_${bookingId}`;
  const loaderId = `pickupBtnLoader_${bookingId}`;

  try {
    toggleActionButtonLoader(buttonId, textId, loaderId, true, "Saving...");

    const url =
      `${APP_CONFIG.API_URL}?action=markPassengerPickedUp` +
      `&driver_id=${encodeURIComponent(session.driverId)}` +
      `&booking_id=${encodeURIComponent(bookingId)}`;

    console.log("📡 Pickup API URL:", url);

    const response = await fetch(url);
    const result = await response.json();

    console.log("📥 Pickup API Response:", result);

    if (!result.success) {
      alert(result.message || "Failed to mark passenger pickup");
      return;
    }

    // -----------------------------------------------------------
    // Freeze button immediately after success
    // -----------------------------------------------------------
    freezeActionButton(buttonId, textId, "Picked Up");

    console.log("✅ Passenger pickup marked successfully");

    // -----------------------------------------------------------
    // Refresh manifest in background to update timestamps / state
    // -----------------------------------------------------------
    if (currentTripId) {
      console.log("🔄 Reloading current trip details...");
      await openCaptainTripManifest(currentTripId);
    }

  } catch (error) {
    console.error("❌ markCaptainPassengerPickedUp() failed:", error);
    alert("Failed to mark passenger pickup");

  } finally {
    // Keep loader hidden after completion.
    // If button is frozen, it stays disabled.
    toggleActionButtonLoader(buttonId, textId, loaderId, false);
    console.log("🏁 markCaptainPassengerPickedUp() completed");
    console.log("--------------------------------------------------");
  }
}

// ===============================================================
// MARK STOP REACHED
// ---------------------------------------------------------------
// Expected behavior:
// 1. Show loader while request is running
// 2. On success, freeze button immediately
// 3. Reload trip details in background
// ===============================================================
export async function markCaptainStopReached(stopId) {
  console.log("--------------------------------------------------");
  console.log(`📍 markCaptainStopReached() called → ${stopId}`);

  const session = getCaptainSession();
  console.log("🧾 Captain session:", session);

  if (!session || !currentTripId) {
    console.warn("⚠️ Missing session or currentTripId", {
      session,
      currentTripId
    });
    return;
  }

  const buttonId = `stopBtn_${stopId}`;
  const textId = `stopBtnText_${stopId}`;
  const loaderId = `stopBtnLoader_${stopId}`;

  try {
    toggleActionButtonLoader(buttonId, textId, loaderId, true, "Saving...");

    const url =
      `${APP_CONFIG.API_URL}?action=markStopReached` +
      `&driver_id=${encodeURIComponent(session.driverId)}` +
      `&trip_id=${encodeURIComponent(currentTripId)}` +
      `&travel_date=${encodeURIComponent(currentTravelDate)}` +
      `&stop_id=${encodeURIComponent(stopId)}`;

    console.log("📡 Stop Reached API URL:", url);

    const response = await fetch(url);
    const result = await response.json();

    console.log("📥 Stop Reached API Response:", result);

    if (!result.success) {
      alert(result.message || "Failed to mark stop reached");
      return;
    }

    // -----------------------------------------------------------
    // Freeze button immediately after success
    // -----------------------------------------------------------
    freezeActionButton(buttonId, textId, "Reached");

    console.log("✅ Stop marked reached successfully");

    // -----------------------------------------------------------
    // Refresh manifest in background to update:
    // - actual reached time
    // - backfilled stops
    // - passenger drop updates
    // -----------------------------------------------------------
    await openCaptainTripManifest(currentTripId);

  } catch (error) {
    console.error("❌ markCaptainStopReached() failed:", error);
    alert("Failed to mark stop reached");

  } finally {
    // Keep loader hidden after completion.
    // If button is frozen, it stays disabled.
    toggleActionButtonLoader(buttonId, textId, loaderId, false);
    console.log("🏁 markCaptainStopReached() completed");
    console.log("--------------------------------------------------");
  }
}
// ===============================================================
// EXPOSE FUNCTIONS GLOBALLY FOR HTML onclick
// ===============================================================
window.switchCaptainTab = switchCaptainTab;
window.openCaptainTripManifest = openCaptainTripManifest;
window.markCaptainPassengerPickedUp = markCaptainPassengerPickedUp;
window.markCaptainStopReached = markCaptainStopReached;