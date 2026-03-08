// ===============================================================
// myTrips.js
// ---------------------------------------------------------------
// Handles everything related to user's bookings.
//
// Responsibilities
// ---------------------------------------------------------------
// 1. Fetch trips from backend API
// 2. Cache trips for fast tab switching
// 3. Render trips to UI
// 4. Handle Current / Upcoming / Past tabs
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { currentUser } from "./state.js";


// ===============================================================
// LOCAL CACHE
// ---------------------------------------------------------------
// Trips are stored here after first fetch so that switching
// between tabs does NOT trigger another API request.
// ===============================================================
let tripsCache = null;



// ===============================================================
// LOAD USER TRIPS (called when My Trips tab opens)
// ===============================================================
export async function loadMyTrips() {

  const container = document.getElementById("myTripsList");

  if (!container) {
    console.warn("⚠️ myTripsList container not found");
    return;
  }

  // -------------------------------------------------------------
  // Ensure user is logged in
  // -------------------------------------------------------------
  if (!currentUser?.email) {

    container.innerHTML = `
      <p class="info-message error">
        User not logged in
      </p>
    `;

    return;
  }

  // -------------------------------------------------------------
  // Show loading state
  // -------------------------------------------------------------
  container.innerHTML = `
    <p class="info-message">
      Loading your bookings...
    </p>
  `;

  try {

    // Fetch trips from backend
    const data = await fetchTrips(currentUser.email);

    // Store in cache
    tripsCache = data;

    // Default view → Current Trips
    showTripsTab("current");

  } catch (error) {

    console.error("❌ Failed to load trips:", error);

    container.innerHTML = `
      <p class="info-message error">
        Failed to load bookings
      </p>
    `;
  }

}



// ===============================================================
// FETCH TRIPS FROM API
// ===============================================================
async function fetchTrips(email) {

  const response = await fetch(
    `${APP_CONFIG.API_URL}?action=getMyTrips&email=${encodeURIComponent(email)}`
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Trips fetch failed");
  }

  return data;
}



// ===============================================================
// SHOW TRIPS BY TAB
// ---------------------------------------------------------------
// Called when user clicks:
// Current / Upcoming / Past
// ===============================================================
window.showTripsTab = function (tabType) {

  if (!tripsCache) return;

  // -------------------------------------------------------------
  // Update tab UI highlight
  // -------------------------------------------------------------
  document.querySelectorAll(".trip-tab").forEach(btn => {
    btn.classList.remove("active");
  });

  const activeBtn = document.getElementById("tab" + capitalize(tabType));
  if (activeBtn) activeBtn.classList.add("active");


  // -------------------------------------------------------------
  // Select correct trips from cache
  // -------------------------------------------------------------
  let trips = [];

  if (tabType === "current") trips = tripsCache.current_trips;
  if (tabType === "upcoming") trips = tripsCache.upcoming_trips;
  if (tabType === "past") trips = tripsCache.past_trips;


  // Render trips
  renderTrips(trips);

};



// ===============================================================
// RENDER TRIPS LIST
// ===============================================================
function renderTrips(trips) {

  const container = document.getElementById("myTripsList");

  if (!container) return;

  if (!trips || trips.length === 0) {

    container.innerHTML = `
      <p class="info-message">
        No bookings found.
      </p>
    `;

    return;
  }

  // Build HTML using map for better readability
  const html = trips.map(buildTripCard).join("");

  container.innerHTML = html;

}



// ===============================================================
// BUILD SINGLE TRIP CARD
// ===============================================================
function buildTripCard(trip) {

  return `
    <div class="trip-card">

      <div class="trip-route">
        ${escapeHTML(trip.from_stop)} → ${escapeHTML(trip.to_stop)}
      </div>

      <div class="trip-details">

        <div>
          <strong>Date:</strong> ${trip.travel_date}
        </div>

        <div>
          <strong>Seats:</strong> ${trip.seats}
        </div>

        <div>
          <strong>Total:</strong> ₹${trip.total_amount}
        </div>

        <div>
          <strong>Status:</strong> ${trip.booking_status}
        </div>

      </div>

    </div>
  `;
}



// ===============================================================
// UTILITY: CAPITALIZE
// ===============================================================
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}



// ===============================================================
// SECURITY: ESCAPE HTML
// ---------------------------------------------------------------
// Prevents HTML injection from backend values
// ===============================================================
function escapeHTML(str) {

  if (!str) return "";

  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}