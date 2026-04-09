// ===============================================================
// captainDashboard.js
// ---------------------------------------------------------------
// Handles captain dashboard + trip manifest UI
//
// FULLY UPDATED + OPTIMIZED
//
// FEATURES:
// 1. Assigned trips visible in BOTH:
//    - Dashboard tab
//    - Trip Details tab
//
// 2. Opening trip from:
//    - Dashboard -> loads trip + switches to Trip Details tab
//    - Trip Details -> loads trip only, stays on same tab
//
// 3. Mobile-friendly manifest:
//    - stop-wise accordion
//    - each stop contains:
//      - stop info
//      - mark stop reached button
//      - pickup passengers
//      - drop passengers
//      - call passenger button
//
// 4. Safer rendering:
//    - HTML escaping
//    - normalized stop matching
//    - shared render helpers
//
// 5. Optimized refresh behavior:
//    - pickup / no-show / stop updates reopen manifest in "manifest" mode
//    - no unnecessary tab switching after already being inside manifest
//
// 6. Fixed action buttons:
//    - freeze immediately on click
//    - restore properly on API failure
//    - permanently freeze after success
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
// HELPER: PASSENGER / EVENT TIMESTAMP FORMAT
// ---------------------------------------------------------------
// Converts:
// - "2026-04-06 22:35:19" -> "06 Apr, 10:35 PM"
// - JS date strings       -> local readable format
// - "NO SHOW"             -> "NO SHOW"
// - empty                 -> "Pending"
// ===============================================================
function formatPassengerTimestamp(value) {
  if (!value) return "Pending";

  const str = String(value).trim();
  if (!str) return "Pending";
  if (str.toUpperCase() === "NO SHOW") return "NO SHOW";

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
// HELPER: NORMALIZE STRING
// ---------------------------------------------------------------
// Used for stop/passenger stop-name matching
// ===============================================================
function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// ===============================================================
// HELPER: ESCAPE HTML
// ---------------------------------------------------------------
// Prevents HTML injection / broken DOM
// ===============================================================
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ===============================================================
// HELPER: BUILD PASSENGER CALL BUTTON
// ===============================================================
function buildPassengerCallButton(phone) {
  const safePhone = String(phone || "").trim();

  if (!safePhone) {
    return `
      <button class="captain-call-btn captain-call-btn-disabled" type="button" disabled>
        No Phone
      </button>
    `;
  }

  return `
    <a class="captain-call-btn" href="tel:${escapeHtml(safePhone)}">
      📞 Call ${escapeHtml(safePhone)}
    </a>
  `;
}

// ===============================================================
// HELPER: START ACTION BUTTON PENDING STATE IMMEDIATELY
// ---------------------------------------------------------------
// PURPOSE:
// 1. Freeze button instantly when user clicks
// 2. Show loader immediately
// 3. Prevent double click while API is in progress
// ===============================================================
function startActionButtonPending(buttonId, textId, loaderId, loadingText = "Saving...") {
  console.log("⏳ startActionButtonPending()", {
    buttonId,
    textId,
    loaderId,
    loadingText
  });

  const button = document.getElementById(buttonId);
  const textEl = document.getElementById(textId);
  const loaderEl = document.getElementById(loaderId);

  if (!button || !textEl || !loaderEl) {
    console.warn("⚠️ startActionButtonPending() missing required elements", {
      buttonFound: !!button,
      textFound: !!textEl,
      loaderFound: !!loaderEl
    });
    return false;
  }

  if (button.dataset.frozen === "true") {
    console.log("🧊 Button already permanently frozen, ignoring click");
    return false;
  }

  if (button.dataset.pending === "true") {
    console.log("⏳ Button already pending, ignoring duplicate click");
    return false;
  }

  if (!textEl.dataset.defaultText) {
    textEl.dataset.defaultText = textEl.textContent.trim();
  }

  button.dataset.pending = "true";
  button.disabled = true;
  button.classList.add("captain-pending-freeze");

  textEl.textContent = loadingText;
  loaderEl.style.display = "inline-block";

  return true;
}

// ===============================================================
// HELPER: RESTORE BUTTON IF API FAILS / LOADING ENDS
// ---------------------------------------------------------------
// PURPOSE:
// 1. Unfreeze pending state
// 2. Restore original button text
// 3. Hide loader
// ===============================================================
function restoreActionButton(buttonId, textId, loaderId) {
  console.log("↩️ restoreActionButton()", {
    buttonId,
    textId,
    loaderId
  });

  const button = document.getElementById(buttonId);
  const textEl = document.getElementById(textId);
  const loaderEl = document.getElementById(loaderId);

  if (!button || !textEl || !loaderEl) {
    console.warn("⚠️ restoreActionButton() missing required elements", {
      buttonFound: !!button,
      textFound: !!textEl,
      loaderFound: !!loaderEl
    });
    return;
  }

  if (button.dataset.frozen === "true") {
    console.log("🧊 Button is permanently frozen, restore skipped");
    loaderEl.style.display = "none";
    button.classList.remove("captain-pending-freeze");
    delete button.dataset.pending;
    return;
  }

  button.disabled = false;
  button.classList.remove("captain-pending-freeze");
  delete button.dataset.pending;

  textEl.textContent = textEl.dataset.defaultText || textEl.textContent;
  loaderEl.style.display = "none";
}

// ===============================================================
// HELPER: FREEZE ACTION BUTTON AFTER SUCCESS
// ---------------------------------------------------------------
// PURPOSE:
// 1. Keep button disabled permanently
// 2. Hide loader
// 3. Set final text
// ===============================================================
function freezeActionButton(buttonId, textId, finalText, loaderId = null) {
  console.log("🧊 freezeActionButton()", {
    buttonId,
    textId,
    loaderId,
    finalText
  });

  const button = document.getElementById(buttonId);
  const textEl = document.getElementById(textId);
  const loaderEl = loaderId ? document.getElementById(loaderId) : null;

  if (!button || !textEl) {
    console.warn("⚠️ freezeActionButton() missing required elements", {
      buttonFound: !!button,
      textFound: !!textEl
    });
    return;
  }

  button.disabled = true;
  button.dataset.frozen = "true";
  delete button.dataset.pending;
  button.classList.remove("captain-pending-freeze");

  textEl.textContent = finalText;
  textEl.dataset.defaultText = finalText;

  if (loaderEl) {
    loaderEl.style.display = "none";
  }
}

// ===============================================================
// HELPER: TOGGLE STOP ACCORDION
// ===============================================================
function toggleCaptainStopAccordion(headerEl) {
  console.log("📂 toggleCaptainStopAccordion() called");

  const card = headerEl.closest(".captain-stop-accordion");
  if (!card) {
    console.warn("⚠️ Accordion card not found");
    return;
  }

  card.classList.toggle("open");
}

// ===============================================================
// PUBLIC TAB WRAPPER
// ===============================================================
export function switchCaptainTab(tabName) {
  console.log(`🟣 switchCaptainTab() wrapper called → ${tabName}`);
  switchCaptainTabUI(tabName);
}

// ===============================================================
// HELPER: BUILD TRIP LIST HTML
// ---------------------------------------------------------------
// sourceTab:
// - "dashboard"
// - "manifest"
//
// Different IDs are used in both sections to avoid duplicate IDs.
// ===============================================================
function buildTripsHtml(trips, sourceTab) {
  if (!trips || !trips.length) {
    return `
      <p class="captain-empty-text">
        No trips found for this bus.
      </p>
    `;
  }

  const buttonPrefix = sourceTab === "manifest" ? "manifestOpenTripBtn_" : "openTripBtn_";
  const textPrefix = sourceTab === "manifest" ? "manifestOpenTripBtnText_" : "openTripBtnText_";
  const loaderPrefix = sourceTab === "manifest" ? "manifestOpenTripBtnLoader_" : "openTripBtnLoader_";

  return trips.map((trip) => {
    const tripId = String(trip.tripId || "");
    const tripIdAttr = escapeHtml(tripId);

    return `
      <div class="captain-list-card captain-trip-card">
        <div><strong>${escapeHtml(trip.tripName || "-")}</strong> (${tripIdAttr})</div>
        <div>Route: ${escapeHtml(trip.firstStop || "-")} → ${escapeHtml(trip.lastStop || "-")}</div>
        <div>Time: ${formatTime(trip.firstStopTime)} → ${formatTime(trip.lastStopTime)}</div>
        <div>Confirmed Seats: ${trip.bookingSummary?.confirmedSeats ?? 0}</div>
        <div>Hold Seats: ${trip.bookingSummary?.holdSeats ?? 0}</div>
        <div>Cancelled Seats: ${trip.bookingSummary?.cancelledSeats ?? 0}</div>

        <div style="margin-top:10px;">
          <button
            class="btn btn-primary captain-open-trip-btn"
            id="${buttonPrefix}${tripIdAttr}"
            onclick="openCaptainTripManifest('${tripIdAttr}', '${sourceTab}')"
            type="button"
          >
            <span id="${textPrefix}${tripIdAttr}">Open Trip Details</span>
            <span id="${loaderPrefix}${tripIdAttr}" class="btn-loader" style="display:none;"></span>
          </button>
        </div>
      </div>
    `;
  }).join("");
}

// ===============================================================
// RENDER: ASSIGNED TRIPS IN BOTH TABS
// ===============================================================
function renderTrips(trips) {
  console.log("📋 renderTrips() called", trips);

  const dashboardContainer = document.getElementById("captainTripsList");
  const manifestContainer = document.getElementById("captainTripsListManifest");

  if (!dashboardContainer && !manifestContainer) {
    console.warn("⚠️ No trip containers found");
    return;
  }

  const dashboardHtml = buildTripsHtml(trips, "dashboard");
  const manifestHtml = buildTripsHtml(trips, "manifest");

  if (dashboardContainer) {
    dashboardContainer.innerHTML = dashboardHtml;
  }

  if (manifestContainer) {
    manifestContainer.innerHTML = manifestHtml;
  }

  console.log("✅ Trips rendered successfully in both sections");
}

// ===============================================================
// HELPER: PICKUP PASSENGER CARD
// ===============================================================
function buildPickupPassengerCard(passenger) {
  const bookingIdRaw = String(passenger.bookingId || "");
  const bookingId = escapeHtml(bookingIdRaw);

  const pickupValue = String(passenger.actualPickupTime || "").trim().toUpperCase();
  const dropValue = String(passenger.actualDropTime || "").trim().toUpperCase();

  const isNoShow = pickupValue === "NO SHOW" || dropValue === "NO SHOW";
  const isPicked = !!pickupValue && pickupValue !== "NO SHOW";

  return `
    <div class="captain-passenger-item">
      <div class="captain-passenger-name">${escapeHtml(passenger.passengerName || "-")}</div>
      <div class="captain-passenger-line">Booking: ${bookingId}</div>
      <div class="captain-passenger-line">Phone: ${escapeHtml(passenger.passengerPhone || "-")}</div>
      <div class="captain-passenger-line">
        ${escapeHtml(passenger.fromStop || "-")} → ${escapeHtml(passenger.toStop || "-")}
      </div>
      <div class="captain-passenger-line">Seats: ${passenger.seatsBooked ?? 0}</div>
      <div class="captain-passenger-line">Pickup: ${formatPassengerTimestamp(passenger.actualPickupTime)}</div>
      <div class="captain-passenger-line">Drop: ${formatPassengerTimestamp(passenger.actualDropTime)}</div>

      <div class="captain-passenger-buttons">
        ${buildPassengerCallButton(passenger.passengerPhone)}

        <button
          class="captain-pickup-btn"
          id="pickupBtn_${bookingId}"
          onclick="markCaptainPassengerPickedUp('${bookingId}')"
          type="button"
          ${(isPicked || isNoShow) ? "disabled" : ""}
        >
          <span id="pickupBtnText_${bookingId}">
            ${isPicked ? "Picked Up" : isNoShow ? "Pickup Closed" : "Mark Picked Up"}
          </span>
          <span id="pickupBtnLoader_${bookingId}" class="btn-loader" style="display:none;"></span>
        </button>

        <button
          class="captain-no-show-btn"
          id="noShowBtn_${bookingId}"
          onclick="markCaptainPassengerNoShow('${bookingId}')"
          type="button"
          ${(isPicked || isNoShow) ? "disabled" : ""}
        >
          <span id="noShowBtnText_${bookingId}">
            ${isNoShow ? "No Show" : "Didn’t Show"}
          </span>
          <span id="noShowBtnLoader_${bookingId}" class="btn-loader" style="display:none;"></span>
        </button>
      </div>
    </div>
  `;
}

// ===============================================================
// HELPER: DROP PASSENGER CARD
// ===============================================================
function buildDropPassengerCard(passenger) {
  const pickupValue = String(passenger.actualPickupTime || "").trim().toUpperCase();
  const dropValue = String(passenger.actualDropTime || "").trim().toUpperCase();

  const isNoShow = pickupValue === "NO SHOW" || dropValue === "NO SHOW";
  const isDropped = !!dropValue && dropValue !== "NO SHOW";

  return `
    <div class="captain-passenger-item">
      <div class="captain-passenger-name">${escapeHtml(passenger.passengerName || "-")}</div>
      <div class="captain-passenger-line">Booking: ${escapeHtml(passenger.bookingId || "-")}</div>
      <div class="captain-passenger-line">Phone: ${escapeHtml(passenger.passengerPhone || "-")}</div>
      <div class="captain-passenger-line">
        ${escapeHtml(passenger.fromStop || "-")} → ${escapeHtml(passenger.toStop || "-")}
      </div>
      <div class="captain-passenger-line">Seats: ${passenger.seatsBooked ?? 0}</div>
      <div class="captain-passenger-line">Pickup: ${formatPassengerTimestamp(passenger.actualPickupTime)}</div>
      <div class="captain-passenger-line">Drop: ${formatPassengerTimestamp(passenger.actualDropTime)}</div>

      <div class="captain-passenger-buttons">
        ${buildPassengerCallButton(passenger.passengerPhone)}

        <button class="captain-drop-tag" type="button" disabled>
          ${isNoShow ? "No Show" : isDropped ? "Dropped" : "Drop Pending"}
        </button>
      </div>
    </div>
  `;
}

// ===============================================================
// RENDER: STOP-WISE MANIFEST
// ===============================================================
function renderStops(stops, passengers = []) {
  console.log("🛑 renderStops() called", { stops, passengers });

  const container = document.getElementById("captainStopsList");
  if (!container) {
    console.warn("⚠️ captainStopsList container not found");
    return;
  }

  if (!stops || !stops.length) {
    container.innerHTML = `
      <p class="captain-empty-text">
        No stops found.
      </p>
    `;
    return;
  }

  container.innerHTML = stops.map((stop, index) => {
    const stopNameNormalized = normalizeText(stop.stopName);

    const pickupPassengers = passengers.filter((p) => normalizeText(p.fromStop) === stopNameNormalized);
    const dropPassengers = passengers.filter((p) => normalizeText(p.toStop) === stopNameNormalized);

    const pickupHtml = pickupPassengers.length
      ? pickupPassengers.map(buildPickupPassengerCard).join("")
      : `<div class="captain-empty-mini">No pickup passengers at this stop.</div>`;

    const dropHtml = dropPassengers.length
      ? dropPassengers.map(buildDropPassengerCard).join("")
      : `<div class="captain-empty-mini">No drop passengers at this stop.</div>`;

    const stopIdRaw = String(stop.stopId || "");
    const stopId = escapeHtml(stopIdRaw);
    const isReached = String(stop.stopStatus || "").toUpperCase() === "REACHED";

    return `
      <div class="captain-stop-accordion ${index === 0 ? "open" : ""}">
        <div class="captain-stop-header" onclick="toggleCaptainStopAccordion(this)">
          <div class="captain-stop-title-row">
            <div class="captain-stop-title">
              ${escapeHtml(stop.stopOrder || "-")}. ${escapeHtml(stop.stopName || "-")}
            </div>
            <div class="captain-stop-chevron">⌄</div>
          </div>

          <div class="captain-stop-meta">
            <div>Scheduled: ${formatTime(stop.arrivalTime)} | Actual: ${formatPassengerTimestamp(stop.actualReachedTime)}</div>
            <div>Status: ${escapeHtml(stop.stopStatus || "PENDING")}</div>
          </div>

          <div class="captain-stop-badges">
            <span class="captain-badge">Pickups: ${pickupPassengers.length}</span>
            <span class="captain-badge">Drops: ${dropPassengers.length}</span>
          </div>
        </div>

        <div class="captain-stop-body">
          <div class="captain-stop-actions">
            <button
              class="btn btn-primary captain-stop-reached-btn"
              id="stopBtn_${stopId}"
              onclick="markCaptainStopReached('${stopId}')"
              type="button"
              ${isReached ? "disabled" : ""}
            >
              <span id="stopBtnText_${stopId}">
                ${isReached ? "Reached" : "Mark Stop Reached"}
              </span>
              <span id="stopBtnLoader_${stopId}" class="btn-loader" style="display:none;"></span>
            </button>
          </div>

          <div class="captain-passenger-group">
            <div class="captain-passenger-group-title">Pickup Passengers</div>
            ${pickupHtml}
          </div>

          <div class="captain-passenger-group">
            <div class="captain-passenger-group-title">Drop Passengers</div>
            ${dropHtml}
          </div>
        </div>
      </div>
    `;
  }).join("");

  console.log("✅ Stops rendered successfully");
}

// ===============================================================
// OPTIONAL LEGACY PASSENGER RENDERER
// ---------------------------------------------------------------
// Kept only as fallback if old container still exists
// ===============================================================
function renderPassengers(passengers) {
  console.log("👥 renderPassengers() called", passengers);

  const container = document.getElementById("captainPassengersList");
  if (!container) {
    return;
  }

  if (!passengers || !passengers.length) {
    container.innerHTML = `
      <p class="captain-empty-text">
        No confirmed passengers found.
      </p>
    `;
    return;
  }

  container.innerHTML = passengers.map((p) => {
    const bookingId = escapeHtml(p.bookingId || "");
    const pickupValue = String(p.actualPickupTime || "").trim().toUpperCase();
    const dropValue = String(p.actualDropTime || "").trim().toUpperCase();
    const isNoShow = pickupValue === "NO SHOW" || dropValue === "NO SHOW";
    const isPicked = !!pickupValue && pickupValue !== "NO SHOW";

    return `
      <div class="captain-list-card">
        <strong>${escapeHtml(p.passengerName || "-")}</strong>
        <div>Booking: ${escapeHtml(p.bookingId || "-")}</div>
        <div>Phone: ${escapeHtml(p.passengerPhone || "-")}</div>
        <div>${escapeHtml(p.fromStop || "-")} → ${escapeHtml(p.toStop || "-")}</div>
        <div>Seats: ${p.seatsBooked ?? 0}</div>
        <div>Pickup: ${formatPassengerTimestamp(p.actualPickupTime)}</div>
        <div>Drop: ${formatPassengerTimestamp(p.actualDropTime)}</div>

        <div class="captain-passenger-buttons" style="margin-top:10px;">
          ${buildPassengerCallButton(p.passengerPhone)}

          <button
            class="btn btn-primary"
            id="pickupBtn_${bookingId}"
            onclick="markCaptainPassengerPickedUp('${bookingId}')"
            type="button"
            ${(isPicked || isNoShow) ? "disabled" : ""}
          >
            <span id="pickupBtnText_${bookingId}">
              ${isPicked ? "Picked Up" : isNoShow ? "Pickup Closed" : "Mark Picked Up"}
            </span>
            <span id="pickupBtnLoader_${bookingId}" class="btn-loader" style="display:none;"></span>
          </button>

          <button
            class="captain-no-show-btn"
            id="noShowBtn_${bookingId}"
            onclick="markCaptainPassengerNoShow('${bookingId}')"
            type="button"
            ${(isPicked || isNoShow) ? "disabled" : ""}
          >
            <span id="noShowBtnText_${bookingId}">
              ${isNoShow ? "No Show" : "Didn’t Show"}
            </span>
            <span id="noShowBtnLoader_${bookingId}" class="btn-loader" style="display:none;"></span>
          </button>
        </div>
      </div>
    `;
  }).join("");
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
// sourceTab:
// - "dashboard" -> switch to manifest tab after loading
// - "manifest"  -> stay in manifest tab
// ===============================================================
export async function openCaptainTripManifest(tripId, sourceTab = "dashboard") {
  console.log("--------------------------------------------------");
  console.log(`🧭 openCaptainTripManifest() called → ${tripId}`, { sourceTab });

  const session = getCaptainSession();
  console.log("🧾 Captain session:", session);

  if (!session) {
    console.warn("⚠️ No captain session found");
    return;
  }

  currentTripId = tripId;
  console.log("📌 currentTripId set to:", currentTripId);

  const buttonPrefix = sourceTab === "manifest" ? "manifestOpenTripBtn_" : "openTripBtn_";
  const textPrefix = sourceTab === "manifest" ? "manifestOpenTripBtnText_" : "openTripBtnText_";
  const loaderPrefix = sourceTab === "manifest" ? "manifestOpenTripBtnLoader_" : "openTripBtnLoader_";

  const buttonId = `${buttonPrefix}${tripId}`;
  const textId = `${textPrefix}${tripId}`;
  const loaderId = `${loaderPrefix}${tripId}`;

  const started = startActionButtonPending(buttonId, textId, loaderId, "Opening...");
  if (!started) {
    console.log("ℹ️ Open trip button pending state not started, continuing safely");
  }

  try {
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
      restoreActionButton(buttonId, textId, loaderId);
      alert(result.message || "Failed to load trip details");
      return;
    }

    const manifestTripId = document.getElementById("manifestTripId");
    const manifestTripName = document.getElementById("manifestTripName");
    const manifestTravelDate = document.getElementById("manifestTravelDate");

    if (manifestTripId) manifestTripId.textContent = result.trip?.tripId || "-";
    if (manifestTripName) manifestTripName.textContent = result.trip?.tripName || "-";
    if (manifestTravelDate) manifestTravelDate.textContent = result.travelDate || "-";

    const captainTripId = document.getElementById("captainTripId");
    const captainRoute = document.getElementById("captainRoute");
    const captainTripStatus = document.getElementById("captainTripStatus");

    if (captainTripId) captainTripId.textContent = result.trip?.tripId || "-";
    if (captainRoute) captainRoute.textContent = result.trip?.tripName || "Not Assigned";
    if (captainTripStatus) captainTripStatus.textContent = "In Progress";

    renderStops(result.stops || [], result.passengers || []);

    const passengerContainer = document.getElementById("captainPassengersList");
    if (passengerContainer) {
      passengerContainer.innerHTML = "";
    }

    if (sourceTab === "dashboard") {
      switchCaptainTabUI("manifest");
    }

    restoreActionButton(buttonId, textId, loaderId);
    console.log("✅ Trip details opened successfully");

  } catch (error) {
    console.error("❌ openCaptainTripManifest() failed:", error);
    restoreActionButton(buttonId, textId, loaderId);
    alert("Failed to load trip details");
  }

  console.log("--------------------------------------------------");
}

// ===============================================================
// MARK PASSENGER PICKED UP
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

  const started = startActionButtonPending(buttonId, textId, loaderId, "Saving...");
  if (!started) return;

  try {
    const url =
      `${APP_CONFIG.API_URL}?action=markPassengerPickedUp` +
      `&driver_id=${encodeURIComponent(session.driverId)}` +
      `&booking_id=${encodeURIComponent(bookingId)}`;

    console.log("📡 Pickup API URL:", url);

    const response = await fetch(url);
    const result = await response.json();

    console.log("📥 Pickup API Response:", result);

    if (!result.success) {
      restoreActionButton(buttonId, textId, loaderId);
      alert(result.message || "Failed to mark passenger pickup");
      return;
    }

    freezeActionButton(buttonId, textId, "Picked Up", loaderId);

    const noShowBtnId = `noShowBtn_${bookingId}`;
    const noShowTextId = `noShowBtnText_${bookingId}`;
    const noShowLoaderId = `noShowBtnLoader_${bookingId}`;

    if (document.getElementById(noShowBtnId)) {
      freezeActionButton(noShowBtnId, noShowTextId, "No Show Closed", noShowLoaderId);
    }

    console.log("✅ Passenger pickup marked successfully");

    if (currentTripId) {
      console.log("🔄 Reloading current trip details...");
      await openCaptainTripManifest(currentTripId, "manifest");
    }

  } catch (error) {
    console.error("❌ markCaptainPassengerPickedUp() failed:", error);
    restoreActionButton(buttonId, textId, loaderId);
    alert("Failed to mark passenger pickup");
  }

  console.log("🏁 markCaptainPassengerPickedUp() completed");
  console.log("--------------------------------------------------");
}

// ===============================================================
// MARK PASSENGER NO SHOW
// ===============================================================
export async function markCaptainPassengerNoShow(bookingId) {
  console.log("--------------------------------------------------");
  console.log(`🚫 markCaptainPassengerNoShow() called → ${bookingId}`);

  const session = getCaptainSession();
  console.log("🧾 Captain session:", session);

  if (!session) {
    console.warn("⚠️ No captain session found");
    return;
  }

  const buttonId = `noShowBtn_${bookingId}`;
  const textId = `noShowBtnText_${bookingId}`;
  const loaderId = `noShowBtnLoader_${bookingId}`;

  const started = startActionButtonPending(buttonId, textId, loaderId, "Saving...");
  if (!started) return;

  try {
    const url =
      `${APP_CONFIG.API_URL}?action=markPassengerNoShow` +
      `&driver_id=${encodeURIComponent(session.driverId)}` +
      `&booking_id=${encodeURIComponent(bookingId)}`;

    console.log("📡 No Show API URL:", url);

    const response = await fetch(url);
    const result = await response.json();

    console.log("📥 No Show API Response:", result);

    if (!result.success) {
      restoreActionButton(buttonId, textId, loaderId);
      alert(result.message || "Failed to mark passenger as no show");
      return;
    }

    freezeActionButton(buttonId, textId, "No Show", loaderId);

    const pickupBtnId = `pickupBtn_${bookingId}`;
    const pickupTextId = `pickupBtnText_${bookingId}`;
    const pickupLoaderId = `pickupBtnLoader_${bookingId}`;

    if (document.getElementById(pickupBtnId)) {
      freezeActionButton(pickupBtnId, pickupTextId, "Pickup Closed", pickupLoaderId);
    }

    console.log("✅ Passenger marked as NO SHOW successfully");

    if (currentTripId) {
      console.log("🔄 Reloading current trip details...");
      await openCaptainTripManifest(currentTripId, "manifest");
    }

  } catch (error) {
    console.error("❌ markCaptainPassengerNoShow() failed:", error);
    restoreActionButton(buttonId, textId, loaderId);
    alert("Failed to mark passenger as no show");
  }

  console.log("🏁 markCaptainPassengerNoShow() completed");
  console.log("--------------------------------------------------");
}

// ===============================================================
// MARK STOP REACHED
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

  const started = startActionButtonPending(buttonId, textId, loaderId, "Saving...");
  if (!started) return;

  try {
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
      restoreActionButton(buttonId, textId, loaderId);
      alert(result.message || "Failed to mark stop reached");
      return;
    }

    freezeActionButton(buttonId, textId, "Reached", loaderId);
    console.log("✅ Stop marked reached successfully");

    await openCaptainTripManifest(currentTripId, "manifest");

  } catch (error) {
    console.error("❌ markCaptainStopReached() failed:", error);
    restoreActionButton(buttonId, textId, loaderId);
    alert("Failed to mark stop reached");
  }

  console.log("🏁 markCaptainStopReached() completed");
  console.log("--------------------------------------------------");
}

// ===============================================================
// EXPOSE FUNCTIONS GLOBALLY FOR HTML onclick
// ===============================================================
window.switchCaptainTab = switchCaptainTab;
window.openCaptainTripManifest = openCaptainTripManifest;
window.markCaptainPassengerPickedUp = markCaptainPassengerPickedUp;
window.markCaptainPassengerNoShow = markCaptainPassengerNoShow;
window.markCaptainStopReached = markCaptainStopReached;
window.toggleCaptainStopAccordion = toggleCaptainStopAccordion;