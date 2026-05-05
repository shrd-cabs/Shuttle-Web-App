// ===============================================================
// liveTracking.js
// ---------------------------------------------------------------
// Handles customer-side Live Tracking.
//
// RESPONSIBILITIES:
// ---------------------------------------------------------------
// 1. Fetch today's trips using existing getMyTrips API
// 2. Hide trips whose scheduled drop time has passed
// 3. Show active trips as professional cards
// 4. Show LIVE blinking badge for currently active trips
// 5. Open centered live tracking popup
// 6. Show full route timeline from backend
// 7. Handle NOT STARTED / IN PROGRESS / COMPLETED states
// 8. Show ETA / countdown for next stop
// 9. Auto-refresh selected tracking every 30 seconds
// 10. Mobile-friendly popup behavior
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { currentUser } from "./state.js";


// ===============================================================
// LOCAL STATE
// ===============================================================
let liveTripsCache = null;
let selectedTrackingBookingId = null;
let liveTrackingRefreshTimer = null;


// ===============================================================
// CONFIG
// ===============================================================
const LIVE_TRACKING_REFRESH_MS = 30000;


// ===============================================================
// LOAD LIVE TRACKING TAB
// ===============================================================
export async function loadLiveTracking() {
  console.log("🚍 Loading Live Tracking...");

  const tripsContainer = document.getElementById("liveTripsList");
  const detailsContainer = document.getElementById("liveTrackingDetails");

  if (!tripsContainer) {
    console.warn("⚠️ liveTripsList container not found");
    return;
  }

  if (detailsContainer) {
    detailsContainer.style.display = "none";
    detailsContainer.innerHTML = "";
  }

  if (!currentUser?.email) {
    tripsContainer.innerHTML = `
      <p class="info-message error">User not logged in</p>
    `;
    return;
  }

  tripsContainer.innerHTML = `
    <div class="live-loading-card">
      <div class="live-loader"></div>
      <p>Loading today's live trips...</p>
    </div>
  `;

  try {
    const data = await fetchLiveTrips(currentUser.email);

    console.log("📥 Live Trips API Response:", data);

    liveTripsCache = data.current_trips || [];

    renderLiveTrips(liveTripsCache);

  } catch (error) {
    console.error("❌ Failed to load live tracking:", error);

    tripsContainer.innerHTML = `
      <p class="info-message error">Failed to load live tracking</p>
    `;
  }
}


// ===============================================================
// FETCH TODAY'S TRIPS
// ===============================================================
async function fetchLiveTrips(email) {
  console.log("📡 Calling getMyTrips API for Live Tracking...");

  const response = await fetch(
    `${APP_CONFIG.API_URL}?action=getMyTrips&email=${encodeURIComponent(email)}`
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Live trips fetch failed");
  }

  return data;
}


// ===============================================================
// RENDER LIVE TRIPS
// ===============================================================
function renderLiveTrips(trips) {
  const container = document.getElementById("liveTripsList");

  if (!container) return;

  const activeTrips = (trips || []).filter(trip => !isTripPassed(trip));

  if (!activeTrips.length) {
    container.innerHTML = `
      <div class="live-empty-state">
        <div class="live-empty-icon">🚌</div>
        <h3>No active trip for live tracking</h3>
        <p>Your live tracking will appear here on your travel date before your trip ends.</p>
      </div>
    `;
    return;
  }

  const html = activeTrips.map(trip => buildLiveTripCard(trip)).join("");

  container.innerHTML = `
    <div class="live-trips-header">
      <div>
        <h3>Today's Trackable Trips</h3>
        <p>Select a trip to view live route progress.</p>
      </div>
      <span>${activeTrips.length} Trip${activeTrips.length > 1 ? "s" : ""}</span>
    </div>

    ${html}
  `;
}


// ===============================================================
// BUILD LIVE TRIP CARD
// ===============================================================
function buildLiveTripCard(trip) {
  const status = String(trip.booking_status || "").toUpperCase();
  const pickupTime = formatTimeOnly(trip.scheduled_pickup_time);
  const dropTime = formatTimeOnly(trip.scheduled_drop_time);

  const liveState = getTripLiveState(trip);
  const liveBadge = buildLiveCardBadge(liveState);

  return `
    <div class="trip-card live-trip-card">

      <div class="live-trip-top">
        <div>
          <div class="trip-route live-trip-route">
            ${escapeHTML(trip.from_stop)} → ${escapeHTML(trip.to_stop)}
          </div>

          <div class="live-trip-subtitle">
            ${escapeHTML(trip.travel_date)} • ${escapeHTML(pickupTime)} - ${escapeHTML(dropTime)}
          </div>
        </div>

        <div class="live-card-badges">
          ${liveBadge}
          <span class="trip-status ${escapeHTML(status)}">
            ${escapeHTML(status || "CONFIRMED")}
          </span>
        </div>
      </div>

      <div class="live-trip-grid">

        <div class="live-trip-info">
          <small>Booking ID</small>
          <strong>${escapeHTML(trip.booking_id)}</strong>
        </div>

        <div class="live-trip-info">
          <small>Bus</small>
          <strong>${escapeHTML(trip.bus_number)}</strong>
        </div>

        <div class="live-trip-info">
          <small>Driver</small>
          <strong>${escapeHTML(trip.driver_name || "-")}</strong>
        </div>

        <div class="live-trip-info">
          <small>Seats</small>
          <strong>${escapeHTML(trip.seats_booked || "-")}</strong>
        </div>

      </div>

      <div class="live-track-btn-wrapper">
        <button
          class="btn btn-primary live-track-btn"
          type="button"
          onclick="window.loadLiveTrackingDetails('${escapeHTML(trip.booking_id)}')"
        >
          Track Now
        </button>
      </div>

    </div>
  `;
}


// ===============================================================
// BUILD LIVE CARD BADGE
// ===============================================================
function buildLiveCardBadge(state) {
  if (state === "LIVE") {
    return `
      <span class="live-now-badge">
        <span class="live-now-dot"></span>
        LIVE
      </span>
    `;
  }

  if (state === "UPCOMING") {
    return `
      <span class="live-upcoming-badge">
        Upcoming
      </span>
    `;
  }

  return "";
}


// ===============================================================
// GET TRIP LIVE STATE
// ---------------------------------------------------------------
// LIVE:
// - Today's trip
// - Current time between pickup and drop time
//
// UPCOMING:
// - Today's trip but pickup time is still in future
// ===============================================================
function getTripLiveState(trip) {
  const now = new Date();

  if (!trip.travel_date || !trip.scheduled_pickup_time || !trip.scheduled_drop_time) {
    return "UPCOMING";
  }

  const pickupTime = formatTimeOnly(trip.scheduled_pickup_time);
  const dropTime = formatTimeOnly(trip.scheduled_drop_time);

  const pickupDateTime = new Date(`${trip.travel_date}T${pickupTime}:00`);
  const dropDateTime = new Date(`${trip.travel_date}T${dropTime}:00`);

  if (isNaN(pickupDateTime.getTime()) || isNaN(dropDateTime.getTime())) {
    return "UPCOMING";
  }

  if (now >= pickupDateTime && now <= dropDateTime) {
    return "LIVE";
  }

  return "UPCOMING";
}


// ===============================================================
// LOAD LIVE TRACKING DETAILS
// ===============================================================
window.loadLiveTrackingDetails = async function(bookingId) {
  console.log("📍 Track Now clicked:", bookingId);

  if (!bookingId) {
    alert("Booking ID missing");
    return;
  }

  if (!currentUser?.email) {
    alert("User not logged in");
    return;
  }

  selectedTrackingBookingId = bookingId;

  openLiveTrackingModal(`
    <div class="live-modal-loading">
      <div class="live-loader"></div>
      <p>Loading live tracking...</p>
    </div>
  `);

  try {
    const data = await fetchTrackingDetails(bookingId, currentUser.email);

    console.log("📥 Tracking Details Response:", data);

    renderTrackingModal(data);
    startLiveTrackingAutoRefresh();

  } catch (error) {
    console.error("❌ Failed to load tracking details:", error);

    stopLiveTrackingAutoRefresh();

    openLiveTrackingModal(`
      <div class="trip-modal-header live-modal-header">
        <div>
          <h2 class="trip-title">Live Tracking</h2>
        </div>
        <span class="trip-close" onclick="closeLiveTrackingModal()">✖</span>
      </div>

      <p class="info-message error">${escapeHTML(error.message || "Unable to load tracking")}</p>
    `);
  }
};


// ===============================================================
// FETCH TRACKING DETAILS
// ===============================================================
async function fetchTrackingDetails(bookingId, email) {
  const url =
    `${APP_CONFIG.API_URL}?action=getLiveTrackingDetails` +
    `&booking_id=${encodeURIComponent(bookingId)}` +
    `&email=${encodeURIComponent(email)}`;

  console.log("🌐 Tracking URL:", url);

  const response = await fetch(url);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Tracking fetch failed");
  }

  return data;
}


// ===============================================================
// OPEN LIVE TRACKING MODAL
// ---------------------------------------------------------------
// Creates a dedicated centered modal.
// Removes old modal if it was created with old trip-modal classes.
// ===============================================================
function openLiveTrackingModal(html) {
  let modal = document.getElementById("liveTrackingModal");

  if (modal && !modal.classList.contains("live-tracking-modal-overlay")) {
    modal.remove();
    modal = null;
  }

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "liveTrackingModal";
    modal.className = "live-tracking-modal-overlay";

    modal.innerHTML = `
      <div class="live-tracking-modal-box">
        <div id="liveTrackingModalContent"></div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  const content = document.getElementById("liveTrackingModalContent");

  if (content) {
    content.innerHTML = html;
  }

  document.body.classList.add("live-modal-open");
  modal.style.display = "flex";
}


// ===============================================================
// CLOSE LIVE TRACKING MODAL
// ===============================================================
window.closeLiveTrackingModal = function() {
  console.log("❌ Closing live tracking modal");

  stopLiveTrackingAutoRefresh();

  const modal = document.getElementById("liveTrackingModal");

  if (modal) {
    modal.style.display = "none";
  }

  document.body.classList.remove("live-modal-open");
};


// ===============================================================
// RENDER TRACKING MODAL
// ===============================================================
function renderTrackingModal(data) {
  const booking = data.booking || {};
  const stops = data.stops || [];
  const summary = calculateTrackingSummary(stops);
  const etaText = getEtaText(booking, summary);

  const stopsHtml = stops
    .map((stop, index) => buildTrackingStop(stop, index, summary))
    .join("");

  openLiveTrackingModal(`
    <div class="trip-modal-header live-modal-header">

      <div>
        <h2 class="trip-title">Live Tracking</h2>
        <p class="live-modal-subtitle">
          Auto-refreshing every 30 seconds
        </p>
      </div>

      <span class="trip-close" onclick="closeLiveTrackingModal()">✖</span>

    </div>

    <div class="live-route-title">
      <span>${escapeHTML(booking.from_stop || "-")}</span>
      <strong>→</strong>
      <span>${escapeHTML(booking.to_stop || "-")}</span>
    </div>

    <div class="live-status-strip">
      ${buildTripStatusBadge(summary.tripStatus)}
      <span>Bus ${escapeHTML(booking.bus_number || "-")}</span>
      <span>${escapeHTML(booking.scheduled_pickup_time || "-")} - ${escapeHTML(booking.scheduled_drop_time || "-")}</span>
    </div>

    <div class="tracking-summary-card">

      <div class="tracking-summary-top">
        <div>
          <h3>${summary.progressPercent}% Completed</h3>
          <p>${summary.reachedCount} of ${summary.totalStops} stops reached</p>
        </div>

        <div class="live-pulse-dot"></div>
      </div>

      <div class="tracking-progress">
        <div
          class="tracking-progress-fill"
          style="width:${summary.progressPercent}%;">
        </div>
      </div>

      <div class="tracking-current-grid">

        <div class="tracking-current-box">
          <small>Current Stop</small>
          <strong>
            ${
              summary.tripStatus === "NOT_STARTED"
                ? "Trip not started"
                : summary.currentStop
                  ? escapeHTML(summary.currentStop.stop_name)
                  : "-"
            }
          </strong>
        </div>

        <div class="tracking-current-box">
          <small>Next Stop</small>
          <strong>
            ${
              summary.nextStop
                ? escapeHTML(summary.nextStop.stop_name)
                : "Trip completed"
            }
          </strong>
        </div>

        <div class="tracking-current-box">
          <small>ETA / Status</small>
          <strong>${escapeHTML(etaText)}</strong>
        </div>

      </div>

    </div>

    <div class="live-booking-info">

      <div>
        <small>Booking ID</small>
        <strong>${escapeHTML(booking.booking_id || "-")}</strong>
      </div>

      <div>
        <small>Driver</small>
        <strong>${escapeHTML(booking.driver_name || "-")}</strong>
      </div>

      <div>
        <small>Driver Phone</small>
        <strong>${escapeHTML(booking.driver_phone || "-")}</strong>
      </div>

      <div>
        <small>Last Updated</small>
        <strong>${escapeHTML(summary.lastUpdatedAt || "Waiting for first update")}</strong>
      </div>

    </div>

    <div class="tracking-timeline">
      ${stopsHtml}
    </div>

    <div class="trip-popup-actions live-modal-actions">
      <button class="btn btn-secondary" onclick="refreshLiveTrackingDetails()">
        Refresh Now
      </button>

      <button class="btn btn-primary" onclick="closeLiveTrackingModal()">
        Close
      </button>
    </div>
  `);
}


// ===============================================================
// GET ETA TEXT
// ---------------------------------------------------------------
// Shows helpful ETA / countdown based on next stop time.
// ===============================================================
function getEtaText(booking, summary) {
  if (summary.tripStatus === "COMPLETED") {
    return "Trip completed";
  }

  if (!summary.nextStop) {
    return "Waiting for next update";
  }

  const travelDate = booking.travel_date;

  if (!travelDate || !summary.nextStop.scheduled_arrival_time) {
    return "ETA unavailable";
  }

  const scheduledTime = formatTimeOnly(summary.nextStop.scheduled_arrival_time);
  const targetTime = new Date(`${travelDate}T${scheduledTime}:00`);

  if (isNaN(targetTime.getTime())) {
    return `Expected at ${scheduledTime}`;
  }

  const now = new Date();
  const diffMs = targetTime.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (summary.tripStatus === "NOT_STARTED") {
    if (diffMinutes > 0) {
      return `Trip starts in ${formatMinutes(diffMinutes)}`;
    }

    return `Scheduled at ${scheduledTime}`;
  }

  if (diffMinutes > 0) {
    return `Next stop in ${formatMinutes(diffMinutes)}`;
  }

  if (diffMinutes >= -5) {
    return "Arriving shortly";
  }

  return `Scheduled ${Math.abs(diffMinutes)} min ago`;
}


// ===============================================================
// FORMAT MINUTES
// ===============================================================
function formatMinutes(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${mins} min`;
}


// ===============================================================
// BUILD TRIP STATUS BADGE
// ===============================================================
function buildTripStatusBadge(status) {
  const cleanStatus = String(status || "NOT_STARTED").toUpperCase();

  let label = "Not Started";

  if (cleanStatus === "IN_PROGRESS") label = "In Progress";
  if (cleanStatus === "COMPLETED") label = "Completed";

  return `
    <span class="live-trip-badge ${cleanStatus}">
      ${label}
    </span>
  `;
}


// ===============================================================
// BUILD TRACKING STOP
// ===============================================================
function buildTrackingStop(stop, index, summary) {
  const status = String(stop.stop_status || "PENDING").toUpperCase();

  const isReached = status === "REACHED";
  const isNext = summary.nextStop && summary.nextStop.stop_id === stop.stop_id;
  const isCurrent = summary.currentStop && summary.currentStop.stop_id === stop.stop_id;

  let statusClass = "PENDING";
  let marker = "○";
  let label = "Upcoming";

  if (isReached) {
    statusClass = "REACHED";
    marker = "✓";
    label = "Reached";
  }

  if (!isReached && isNext) {
    statusClass = "NEXT";
    marker = "➜";
    label = summary.tripStatus === "NOT_STARTED" ? "First Stop" : "Next Stop";
  }

  if (isCurrent) {
    statusClass += " CURRENT";
  }

  return `
    <div class="tracking-stop ${statusClass}">

      <div class="tracking-stop-marker">
        ${marker}
      </div>

      <div class="tracking-stop-content">

        <div class="tracking-stop-main">
          <div>
            <div class="tracking-stop-title">
              ${escapeHTML(stop.stop_name || "-")}
            </div>

            <div class="tracking-stop-city">
              ${escapeHTML(stop.city || "")}
            </div>
          </div>

          <span class="tracking-stop-status ${statusClass}">
            ${label}
          </span>
        </div>

        <div class="tracking-stop-meta">
          <span>
            Scheduled:
            <strong>${escapeHTML(formatTimeOnly(stop.scheduled_arrival_time)) || "-"}</strong>
          </span>

          <span>
            Actual:
            <strong>${escapeHTML(formatDateTime(stop.actual_reached_time)) || "-"}</strong>
          </span>
        </div>

      </div>

    </div>
  `;
}


// ===============================================================
// CALCULATE TRACKING SUMMARY
// ===============================================================
function calculateTrackingSummary(stops) {
  const totalStops = stops.length;

  const reachedStops = stops.filter(stop => {
    return String(stop.stop_status || "").toUpperCase() === "REACHED";
  });

  const reachedCount = reachedStops.length;

  let tripStatus = "NOT_STARTED";

  if (reachedCount === 0) {
    tripStatus = "NOT_STARTED";
  } else if (reachedCount < totalStops) {
    tripStatus = "IN_PROGRESS";
  } else if (reachedCount === totalStops && totalStops > 0) {
    tripStatus = "COMPLETED";
  }

  const currentStop =
    reachedStops.length > 0 ? reachedStops[reachedStops.length - 1] : null;

  let nextStop = null;

  if (reachedCount === 0 && stops.length > 0) {
    nextStop = stops[0];
  } else {
    nextStop = stops.find(stop => {
      return String(stop.stop_status || "").toUpperCase() !== "REACHED";
    }) || null;
  }

  const progressPercent =
    totalStops > 0 ? Math.round((reachedCount / totalStops) * 100) : 0;

  let lastUpdatedAt = "";

  reachedStops.forEach(stop => {
    if (stop.updated_at) {
      lastUpdatedAt = formatDateTime(stop.updated_at);
    } else if (stop.actual_reached_time) {
      lastUpdatedAt = formatDateTime(stop.actual_reached_time);
    }
  });

  return {
    totalStops,
    reachedCount,
    currentStop,
    nextStop,
    progressPercent,
    tripStatus,
    lastUpdatedAt
  };
}


// ===============================================================
// START AUTO REFRESH
// ===============================================================
function startLiveTrackingAutoRefresh() {
  stopLiveTrackingAutoRefresh();

  console.log("🔁 Starting live tracking auto-refresh");

  liveTrackingRefreshTimer = setInterval(async () => {
    if (!selectedTrackingBookingId || !currentUser?.email) return;

    console.log("🔄 Auto-refreshing live tracking...");

    try {
      const data = await fetchTrackingDetails(
        selectedTrackingBookingId,
        currentUser.email
      );

      renderTrackingModal(data);

    } catch (error) {
      console.error("❌ Auto-refresh failed:", error);
    }

  }, LIVE_TRACKING_REFRESH_MS);
}


// ===============================================================
// STOP AUTO REFRESH
// ===============================================================
function stopLiveTrackingAutoRefresh() {
  if (liveTrackingRefreshTimer) {
    clearInterval(liveTrackingRefreshTimer);
    liveTrackingRefreshTimer = null;
  }
}


// ===============================================================
// MANUAL REFRESH
// ===============================================================
window.refreshLiveTrackingDetails = async function() {
  console.log("🔄 Manual refresh clicked");

  if (!selectedTrackingBookingId) {
    alert("Please select a trip first");
    return;
  }

  if (!currentUser?.email) {
    alert("User not logged in");
    return;
  }

  try {
    const data = await fetchTrackingDetails(
      selectedTrackingBookingId,
      currentUser.email
    );

    renderTrackingModal(data);

  } catch (error) {
    console.error("❌ Manual refresh failed:", error);
    alert(error.message || "Unable to refresh tracking");
  }
};


// ===============================================================
// CHECK IF TRIP HAS PASSED
// ===============================================================
function isTripPassed(trip) {
  if (!trip.travel_date || !trip.scheduled_drop_time) return false;

  const endTime = formatTimeOnly(trip.scheduled_drop_time);

  if (!endTime) return false;

  const tripEnd = new Date(`${trip.travel_date}T${endTime}:00`);

  if (isNaN(tripEnd.getTime())) return false;

  return new Date().getTime() > tripEnd.getTime();
}


// ===============================================================
// FORMAT DATE + TIME
// ===============================================================
function formatDateTime(dateStr) {
  if (!dateStr) return "";

  const str = String(dateStr).trim();

  if (!str) return "";

  if (str.includes(" ") && str.includes(":")) {
    const parts = str.split(" ");
    return `${parts[0]} ${formatTimeOnly(parts[1])}`;
  }

  if (str.includes("T")) {
    const d = new Date(str);

    if (!isNaN(d.getTime())) {
      const date = d.toLocaleDateString("en-CA");
      const time = d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });

      return `${date} ${time}`;
    }
  }

  return str;
}


// ===============================================================
// FORMAT TIME ONLY
// ===============================================================
function formatTimeOnly(timeStr) {
  if (!timeStr) return "";

  const str = String(timeStr).trim();

  if (!str) return "";

  if (str.includes("T")) {
    const d = new Date(str);

    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    }
  }

  if (str.includes(" ")) {
    const timePart = str.split(" ")[1] || "";
    return formatTimeOnly(timePart);
  }

  const parts = str.split(":");

  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }

  return str;
}


// ===============================================================
// CLOSE MODAL ON OUTSIDE CLICK
// ===============================================================
document.addEventListener("click", function(event) {
  const modal = document.getElementById("liveTrackingModal");

  if (!modal || modal.style.display !== "flex") return;

  if (event.target === modal) {
    closeLiveTrackingModal();
  }
});


// ===============================================================
// CLOSE MODAL ON ESC
// ===============================================================
document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    const modal = document.getElementById("liveTrackingModal");

    if (modal && modal.style.display === "flex") {
      closeLiveTrackingModal();
    }
  }
});


// ===============================================================
// UTILITIES
// ===============================================================
function escapeHTML(str) {
  if (!str) return "";

  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}