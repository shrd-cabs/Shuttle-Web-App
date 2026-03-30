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
// LOAD USER TRIPS
// ===============================================================
export async function loadMyTrips() {

  console.log("📦 Loading My Trips...");

  const container = document.getElementById("myTripsList");

  if (!container) {
    console.warn("⚠️ myTripsList container not found");
    return;
  }

  if (!currentUser?.email) {

    console.warn("❌ User not logged in");

    container.innerHTML = `
      <p class="info-message error">User not logged in</p>
    `;
    return;
  }

  container.innerHTML = `<p class="info-message">Loading your bookings...</p>`;

  try {

    console.log("🌐 Fetching trips for:", currentUser.email);

    const data = await fetchTrips(currentUser.email);

    console.log("📥 Trips API Response:", data);

    tripsCache = data;

    showTripsTab("current");

  } catch (error) {

    console.error("❌ Failed to load trips:", error);

    container.innerHTML = `
      <p class="info-message error">Failed to load bookings</p>
    `;
  }
}


// ===============================================================
// FETCH TRIPS
// ===============================================================
async function fetchTrips(email) {

  console.log("📡 Calling getMyTrips API...");

  const response = await fetch(
    `${APP_CONFIG.API_URL}?action=getMyTrips&email=${encodeURIComponent(email)}`
  );

  const data = await response.json();

  console.log("📨 API Response:", data);

  if (!data.success) {
    throw new Error(data.error || "Trips fetch failed");
  }

  return data;
}


// ===============================================================
// TAB SWITCHING
// ===============================================================
window.showTripsTab = function (tabType) {

  console.log("📂 Switching Tab:", tabType);

  if (!tripsCache) return;

  document.querySelectorAll(".trip-tab").forEach(btn => {
    btn.classList.remove("active");
  });

  const activeBtn = document.getElementById("tab" + capitalize(tabType));
  if (activeBtn) activeBtn.classList.add("active");

  let trips = [];

  if (tabType === "current") trips = tripsCache.current_trips;
  if (tabType === "upcoming") trips = tripsCache.upcoming_trips;
  if (tabType === "past") trips = tripsCache.past_trips;

  console.log(`📊 ${tabType} trips count:`, trips.length);

  renderTrips(trips);
};


// ===============================================================
// RENDER TRIPS
// ===============================================================
function renderTrips(trips) {

  const container = document.getElementById("myTripsList");

  if (!container) return;

  if (!trips || trips.length === 0) {

    console.log("📭 No trips found");

    container.innerHTML = `
      <p class="info-message">No bookings found.</p>
    `;
    return;
  }

  const html = trips.map(trip => buildTripCard(trip)).join("");

  container.innerHTML = html;
}

// ===============================================================
// FORMAT DATE (YYYY-MM-DD)
// ===============================================================
function formatDateOnly(dateStr) {
  if (!dateStr) return "";

  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];
}


// ===============================================================
// FORMAT DATE + TIME
// ===============================================================
function formatDateTime(dateStr) {
  if (!dateStr) return "";

  const d = new Date(dateStr);

  const date = d.toISOString().split("T")[0];
  const time = d.toTimeString().split(" ")[0];

  return `${date} Time - ${time}`;
}

// ===============================================================
// BUILD TRIP CARD (FIXED CLICK HANDLING)
// ===============================================================
function buildTripCard(trip) {

  return `
    <div class="trip-card"
         onclick='handleTripClick(event, ${JSON.stringify(trip)})'>

      <div class="trip-route">
        ${escapeHTML(trip.from_stop)} → ${escapeHTML(trip.to_stop)}
      </div>

      <div class="trip-details">
        <div><strong>Date:</strong> ${trip.travel_date}</div>
        <div><strong>Timings:</strong> ${trip.scheduled_pickup_time} → ${trip.scheduled_drop_time}</div>
        <div><strong>Seats:</strong> ${trip.seats_booked}</div>
        <div><strong>Total:</strong> ₹${trip.total_amount}</div>
        <div><strong>Status:</strong> ${trip.booking_status}</div>
      </div>

    </div>
  `;
}


// ===============================================================
// HANDLE CARD CLICK (IMPORTANT FIX 🚀)
// ===============================================================
window.handleTripClick = function(event, trip) {

  console.log("🟢 Trip card clicked");

  // 🔥 Prevent bubbling to document
  event.stopPropagation();

  openTripDetails(trip);
};


// ===============================================================
// OPEN MODAL
// ===============================================================
window.openTripDetails = function(trip) {

  console.log("📋 Opening Trip Details:", trip);

  const modal = document.getElementById("tripDetailsModal");
  const content = document.getElementById("tripDetailsContent");

  if (!modal || !content) return;

  content.innerHTML = `

    <div class="trip-modal-header">
      <h2 class="trip-title">Trip Details</h2>
      <span class="trip-close" onclick="closeTripDetails()">✖</span>
    </div>

    <!-- ✅ IMPORTANT WRAPPER ADDED -->
    <div class="trip-popup-grid">

      <div><strong>Booking ID:</strong> ${trip.booking_id}</div>
      <div><strong>Travel Date:</strong> ${trip.travel_date}</div>

      <div><strong>Bus Number:</strong> ${trip.bus_number}</div>
      <div><strong>Driver:</strong> ${trip.driver_name}</div>

      <div><strong>Driver Phone:</strong> ${trip.driver_phone}</div>
      <div><strong>Timings:</strong> ${trip.scheduled_pickup_time} → ${trip.scheduled_drop_time}</div>
      <div><strong>From:</strong> ${trip.from_stop}</div>

      <div><strong>To:</strong> ${trip.to_stop}</div>
      <div><strong>Passenger:</strong> ${trip.passenger_name}</div>

      <div><strong>Email:</strong> ${trip.passenger_email}</div>
      <div><strong>Phone:</strong> ${trip.passenger_phone}</div>

      <div><strong>Seats:</strong> ${trip.seats_booked}</div>
      <div><strong>Fare/Seat:</strong> ₹${trip.fare_per_seat}</div>

      <div><strong>Total:</strong> ₹${trip.total_amount}</div>
      <div><strong>Payment:</strong> ${trip.payment_status}</div>

      <div>
        <strong>Status:</strong> 
        <span class="trip-status ${trip.booking_status}">
          ${trip.booking_status}
        </span>
      </div>
      <div><strong>Created At:</strong> ${formatDateTime(trip.created_at)}</div>

    </div>

    <div class="trip-popup-actions">
      <button class="btn btn-danger">Cancel Trip</button>
      <button class="btn btn-secondary">Send Email</button>
      <button class="btn btn-light">Policy</button>

      <button class="btn btn-primary" onclick="closeTripDetails()">Close</button>
    </div>
  `;

  modal.style.display = "flex";
};


// ===============================================================
// CLOSE MODAL
// ===============================================================
window.closeTripDetails = function() {

  console.log("❌ Closing Trip Details");

  const modal = document.getElementById("tripDetailsModal");

  if (modal) modal.style.display = "none";
};


// ===============================================================
// OUTSIDE CLICK CLOSE (FIXED)
// ===============================================================
document.addEventListener("click", function(event) {

  const modal = document.getElementById("tripDetailsModal");

  if (!modal || modal.style.display !== "flex") return;

  // Only close if clicked on overlay itself
  if (event.target === modal) {
    console.log("🖱️ Outside click → closing modal");
    closeTripDetails();
  }
});


// ===============================================================
// ESC KEY CLOSE
// ===============================================================
document.addEventListener("keydown", function(event) {

  if (event.key === "Escape") {

    const modal = document.getElementById("tripDetailsModal");

    if (modal && modal.style.display === "flex") {
      console.log("⌨️ ESC pressed → closing modal");
      closeTripDetails();
    }
  }
});


// ===============================================================
// UTILITIES
// ===============================================================
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHTML(str) {
  if (!str) return "";
  return str
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}