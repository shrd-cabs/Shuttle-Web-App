// ===============================================================
// myTrips.js
// ---------------------------------------------------------------
// Handles everything related to user's bookings.
//
// RESPONSIBILITIES
// ---------------------------------------------------------------
// 1. Fetch trips from backend API
// 2. Cache trips for fast tab switching
// 3. Render trips to UI
// 4. Handle Current / Upcoming / Past tabs
// 5. Open trip details modal
// 6. Show policy inside same modal
// 7. Show cancellation preview inside same modal
// 8. Final cancel booking and refresh trip list
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { currentUser } from "./state.js";

// ===============================================================
// LOCAL CACHE
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
window.showTripsTab = function(tabType) {
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
// FORMAT DATE + TIME
// ===============================================================
function formatDateTime(dateStr) {
  if (!dateStr) return "";

  const d = new Date(dateStr);

  if (isNaN(d.getTime())) return String(dateStr);

  const date = d.toISOString().split("T")[0];
  const time = d.toTimeString().split(" ")[0];

  return `${date} Time - ${time}`;
}

function formatTimeOnly(timeStr) {
  if (!timeStr) return "";

  const parts = String(timeStr).split(":");
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }

  return timeStr;
}

// ===============================================================
// BUILD TRIP CARD
// ===============================================================
function buildTripCard(trip) {
  const status = String(trip.booking_status || "").toUpperCase();

  return `
    <div class="trip-card"
         onclick='handleTripClick(event, ${JSON.stringify(trip)})'>

      <div class="trip-route">
        ${escapeHTML(trip.from_stop)} → ${escapeHTML(trip.to_stop)}
      </div>

      <div class="trip-details">
        <div class="trip-detail-item trip-detail-full trip-status-row">
          <strong>Status:</strong>
          <span class="trip-status ${status}">${status}</span>
        </div>

        <div class="trip-detail-item">
          <strong>Date:</strong>
          <span>${escapeHTML(trip.travel_date)}</span>
        </div>

        <div class="trip-detail-item">
          <strong>Seats:</strong>
          <span>${escapeHTML(trip.seats_booked)}</span>
        </div>

        <div class="trip-detail-item">
          <strong>Time:</strong>
          <span>${escapeHTML(formatTimeOnly(trip.scheduled_pickup_time))} → ${escapeHTML(formatTimeOnly(trip.scheduled_drop_time))}</span>
        </div>

        <div class="trip-detail-item">
          <strong>Total:</strong>
          <span>₹${escapeHTML(trip.total_amount)}</span>
        </div>
      </div>
    </div>
  `;
}

// ===============================================================
// HANDLE CARD CLICK
// ===============================================================
window.handleTripClick = function(event, trip) {
  console.log("🟢 Trip card clicked");
  event.stopPropagation();
  openTripDetails(trip);
};

// ===============================================================
// OPEN MODAL
// ---------------------------------------------------------------
// Uses same modal for all views:
// 1. details
// 2. policy
// 3. cancelPreview
// ===============================================================
window.openTripDetails = function(trip) {
  console.log("📋 Opening Trip Details:", trip);

  const modal = document.getElementById("tripDetailsModal");
  if (!modal) return;

  modal.dataset.trip = JSON.stringify(trip);
  renderTripModalView("details", trip);

  modal.style.display = "flex";
};

// ===============================================================
// GET CURRENT MODAL TRIP
// ===============================================================
function getCurrentModalTrip() {
  const modal = document.getElementById("tripDetailsModal");
  if (!modal || !modal.dataset.trip) return null;

  try {
    return JSON.parse(modal.dataset.trip);
  } catch (error) {
    console.error("❌ Failed to parse modal trip:", error);
    return null;
  }
}

// ===============================================================
// RENDER MODAL VIEW
// ---------------------------------------------------------------
// mode:
// - details
// - policy
// - cancelPreview
// ===============================================================
function renderTripModalView(mode, trip, previewData = null) {
  const content = document.getElementById("tripDetailsContent");
  if (!content || !trip) return;

  if (mode === "details") {
    renderTripDetailsView(content, trip);
    return;
  }

  if (mode === "policy") {
    renderPolicyView(content, trip);
    return;
  }

  if (mode === "cancelPreview") {
    renderCancelPreviewView(content, trip, previewData);
    return;
  }
}

// ===============================================================
// DETAILS VIEW
// ===============================================================
function renderTripDetailsView(content, trip) {
  const bookingStatus = String(trip.booking_status || "").toUpperCase();
  const paymentStatus = String(trip.payment_status || "").toUpperCase();

  const isAlreadyCancelled =
    bookingStatus === "CANCELLED" ||
    paymentStatus === "REFUNDED" ||
    paymentStatus === "NO_REFUND";

  const isPaidAndConfirmed =
    bookingStatus === "CONFIRMED" &&
    (paymentStatus === "PAID" || paymentStatus === "SUCCESS");

  // ===========================================================
  // CHECK IF TRIP IS PAST
  // -----------------------------------------------------------
  // If travel date is before today, disable cancellation
  // If travel date is today, you may still want backend preview
  // to decide based on pickup time slab.
  // ===========================================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tripDate = new Date(trip.travel_date);
  tripDate.setHours(0, 0, 0, 0);

  const isPastTrip = tripDate.getTime() < today.getTime();

  const disableCancel = isAlreadyCancelled || !isPaidAndConfirmed || isPastTrip;

  let cancelButtonText = "Cancel Trip";

  if (isAlreadyCancelled) {
    cancelButtonText = "Already Cancelled";
  } else if (isPastTrip) {
    cancelButtonText = "Past Trip";
  } else if (!isPaidAndConfirmed) {
    cancelButtonText = "Cancellation Not Allowed";
  }

  content.innerHTML = `
    <div class="trip-modal-header">
      <h2 class="trip-title">Trip Details</h2>
      <span class="trip-close" onclick="closeTripDetails()">✖</span>
    </div>

    <div class="trip-popup-grid">
      <div><strong>Booking ID:</strong> ${escapeHTML(String(trip.booking_id || ""))}</div>
      <div><strong>Travel Date:</strong> ${escapeHTML(String(trip.travel_date || ""))}</div>

      <div><strong>Bus Number:</strong> ${escapeHTML(String(trip.bus_number || ""))}</div>
      <div><strong>Driver:</strong> ${escapeHTML(String(trip.driver_name || ""))}</div>

      <div><strong>Driver Phone:</strong> ${escapeHTML(String(trip.driver_phone || ""))}</div>
      <div>
        <strong>Time:</strong>
        ${escapeHTML(formatTimeOnly(String(trip.scheduled_pickup_time || "")))} → ${escapeHTML(formatTimeOnly(String(trip.scheduled_drop_time || "")))}
      </div>

      <div><strong>From:</strong> ${escapeHTML(String(trip.from_stop || ""))}</div>
      <div><strong>To:</strong> ${escapeHTML(String(trip.to_stop || ""))}</div>

      <div><strong>Passenger:</strong> ${escapeHTML(String(trip.passenger_name || ""))}</div>
      <div><strong>Email:</strong> ${escapeHTML(String(trip.passenger_email || ""))}</div>

      <div><strong>Phone:</strong> ${escapeHTML(String(trip.passenger_phone || ""))}</div>
      <div><strong>Seats:</strong> ${escapeHTML(String(trip.seats_booked || ""))}</div>

      <div><strong>Fare/Seat:</strong> ₹${escapeHTML(String(trip.fare_per_seat || 0))}</div>
      <div><strong>Total:</strong> ₹${escapeHTML(String(trip.total_amount || 0))}</div>

      <div><strong>Payment:</strong> ${escapeHTML(String(trip.payment_status || ""))}</div>
      <div>
        <strong>Status:</strong>
        <span class="trip-status ${String(trip.booking_status || "").toUpperCase()}">
          ${escapeHTML(String(trip.booking_status || "").toUpperCase())}
        </span>
      </div>

      <div><strong>Payment method:</strong> ${escapeHTML(String(trip.payment_type || ""))}</div>
      <div><strong>Created At:</strong> ${formatDateTime(trip.created_at)}</div>
    </div>

    <div class="trip-popup-actions">
      <button
        class="btn btn-danger"
        onclick="prepareCancellationPreview()"
        ${disableCancel ? "disabled" : ""}
      >
        ${cancelButtonText}
      </button>

      <button class="btn btn-secondary" disabled>Send Email</button>
      <button class="btn btn-light" onclick="showCancellationPolicy()">Policy</button>
      <button class="btn btn-primary" onclick="closeTripDetails()">Close</button>
    </div>
  `;
}

// ===============================================================
// POLICY VIEW
// ===============================================================
function renderPolicyView(content, trip) {
  content.innerHTML = `
    <div class="trip-modal-header">
      <h2 class="trip-title">Cancellation Policy</h2>
      <span class="trip-close" onclick="closeTripDetails()">✖</span>
    </div>

    <div class="trip-policy-wrapper">
      <div class="trip-policy-highlight">
        <strong>Important:</strong> ₹10 fixed deduction is applied in every cancellation.
      </div>

      <div class="trip-policy-list">
        <div class="trip-policy-card">
          <div class="trip-policy-heading">More than 6 hours before pickup</div>
          <div class="trip-policy-text">Only ₹10 deduction</div>
        </div>

        <div class="trip-policy-card">
          <div class="trip-policy-heading">6 hours to 2 hours before pickup</div>
          <div class="trip-policy-text">₹10 + 25% deduction</div>
        </div>

        <div class="trip-policy-card">
          <div class="trip-policy-heading">2 hours to 1 hour before pickup</div>
          <div class="trip-policy-text">₹10 + 50% deduction</div>
        </div>

        <div class="trip-policy-card">
          <div class="trip-policy-heading">1 hour to 30 minutes before pickup</div>
          <div class="trip-policy-text">₹10 + 75% deduction</div>
        </div>

        <div class="trip-policy-card trip-policy-card-danger">
          <div class="trip-policy-heading">Less than 30 minutes before pickup</div>
          <div class="trip-policy-text">100% deduction (No refund)</div>
        </div>
      </div>
    </div>

    <div class="trip-popup-actions">
      <button class="btn btn-secondary" onclick="goBackToTripDetails()">Back</button>
      <button class="btn btn-primary" onclick="closeTripDetails()">Close</button>
    </div>
  `;
}

// ===============================================================
// CANCEL PREVIEW VIEW
// ===============================================================
function renderCancelPreviewView(content, trip, previewData) {
  content.innerHTML = `
    <div class="trip-modal-header">
      <h2 class="trip-title">Cancellation Breakup</h2>
      <span class="trip-close" onclick="closeTripDetails()">✖</span>
    </div>

    <div class="trip-popup-grid">
      <div><strong>Booking ID:</strong> ${escapeHTML(String(trip.booking_id || ""))}</div>
      <div><strong>Total Fare:</strong> ₹${escapeHTML(String(previewData.total_amount || 0))}</div>

      <div><strong>Fixed Deduction:</strong> ₹${escapeHTML(String(previewData.fixed_deduction || 0))}</div>
      <div><strong>Percentage Deduction:</strong> ${escapeHTML(String(previewData.percent_deduction || 0))}%</div>

      <div><strong>Percentage Deduction Amount:</strong> ₹${escapeHTML(String(previewData.percent_deduction_amount || 0))}</div>
      <div><strong>Total Deduction:</strong> ₹${escapeHTML(String(previewData.deduction_amount || 0))}</div>

      <div><strong>Refund To Wallet:</strong> ₹${escapeHTML(String(previewData.refund_amount || 0))}</div>
      <div><strong>Rule Applied:</strong> ${escapeHTML(String(previewData.rule_label || ""))}</div>

      <div><strong>Travel Date:</strong> ${escapeHTML(String(trip.travel_date || ""))}</div>
      <div><strong>Pickup Time:</strong> ${escapeHTML(String(trip.scheduled_pickup_time || ""))}</div>
    </div>

    <div class="trip-preview-note">
      Refund, if applicable, will be credited to your wallet after cancellation.
    </div>

    <div class="trip-popup-actions">
      <button class="btn btn-secondary" onclick="goBackToTripDetails()">Back</button>
      <button class="btn btn-danger" onclick="confirmCancellation()">Confirm Cancel</button>
      <button class="btn btn-primary" onclick="closeTripDetails()">Close</button>
    </div>
  `;
}

// ===============================================================
// SHOW POLICY INSIDE SAME MODAL
// ===============================================================
window.showCancellationPolicy = function() {
  const trip = getCurrentModalTrip();
  if (!trip) return;

  renderTripModalView("policy", trip);
};

// ===============================================================
// GO BACK TO DETAILS
// ===============================================================
window.goBackToTripDetails = function() {
  const trip = getCurrentModalTrip();
  if (!trip) return;

  renderTripModalView("details", trip);
};

// ===============================================================
// PREPARE CANCELLATION PREVIEW
// ---------------------------------------------------------------
// Calls backend preview API and shows breakup in same modal
// ===============================================================
window.prepareCancellationPreview = async function() {
  try {
    const trip = getCurrentModalTrip();

    if (!trip || !trip.booking_id) {
      alert("Invalid booking data");
      return;
    }

    const content = document.getElementById("tripDetailsContent");
    if (content) {
      content.innerHTML = `
        <div class="trip-modal-header">
          <h2 class="trip-title">Cancellation Breakup</h2>
          <span class="trip-close" onclick="closeTripDetails()">✖</span>
        </div>
        <p class="info-message">Calculating cancellation breakup...</p>
      `;
    }

    const previewUrl =
      `${APP_CONFIG.API_URL}?action=getCancellationPreview` +
      `&booking_id=${encodeURIComponent(trip.booking_id)}` +
      `&email=${encodeURIComponent(trip.passenger_email || currentUser?.email || "")}`;

    console.log("🌐 Calling cancellation preview API:", previewUrl);

    const response = await fetch(previewUrl);
    const data = await response.json();

    console.log("📥 Cancellation Preview Response:", data);

    if (!data.success) {
      throw new Error(data.error || "Unable to fetch cancellation breakup");
    }

    const modal = document.getElementById("tripDetailsModal");
    if (modal) {
      modal.dataset.preview = JSON.stringify(data);
    }

    renderTripModalView("cancelPreview", trip, data);

  } catch (error) {
    console.error("❌ prepareCancellationPreview() failed:", error);
    alert(error.message || "Failed to get cancellation preview");

    const trip = getCurrentModalTrip();
    if (trip) renderTripModalView("details", trip);
  }
};

// ===============================================================
// CONFIRM CANCELLATION
// ---------------------------------------------------------------
// Final API call to cancel booking
// ===============================================================
window.confirmCancellation = async function() {
  try {
    const trip = getCurrentModalTrip();

    if (!trip || !trip.booking_id) {
      alert("Invalid booking data");
      return;
    }

    const content = document.getElementById("tripDetailsContent");
    if (content) {
      content.innerHTML = `
        <div class="trip-modal-header">
          <h2 class="trip-title">Cancelling Booking</h2>
          <span class="trip-close" onclick="closeTripDetails()">✖</span>
        </div>
        <p class="info-message">Please wait, we are cancelling your booking...</p>
      `;
    }

    const cancelUrl =
      `${APP_CONFIG.API_URL}?action=cancelBooking` +
      `&booking_id=${encodeURIComponent(trip.booking_id)}` +
      `&email=${encodeURIComponent(trip.passenger_email || currentUser?.email || "")}`;

    console.log("🌐 Calling final cancel API:", cancelUrl);

    const response = await fetch(cancelUrl);
    const data = await response.json();

    console.log("📥 Cancel Booking Response:", data);

    if (!data.success) {
      throw new Error(data.error || "Cancellation failed");
    }

    alert(
      `Booking cancelled successfully.\n\n` +
      `Refund To Wallet: ₹${data.refund_amount}\n` +
      `Total Deduction: ₹${data.deduction_amount}\n` +
      `Rule Applied: ${data.rule_label}`
    );

    closeTripDetails();
    await loadMyTrips();

  } catch (error) {
    console.error("❌ confirmCancellation() failed:", error);
    alert(error.message || "Failed to cancel booking");

    const trip = getCurrentModalTrip();
    const modal = document.getElementById("tripDetailsModal");

    let previewData = null;
    if (modal?.dataset?.preview) {
      try {
        previewData = JSON.parse(modal.dataset.preview);
      } catch (e) {
        previewData = null;
      }
    }

    if (trip && previewData) {
      renderTripModalView("cancelPreview", trip, previewData);
    } else if (trip) {
      renderTripModalView("details", trip);
    }
  }
};

// ===============================================================
// CLOSE MODAL
// ===============================================================
window.closeTripDetails = function() {
  console.log("❌ Closing Trip Details");

  const modal = document.getElementById("tripDetailsModal");
  if (!modal) return;

  modal.style.display = "none";
  delete modal.dataset.trip;
  delete modal.dataset.preview;
};

// ===============================================================
// OUTSIDE CLICK CLOSE
// ===============================================================
document.addEventListener("click", function(event) {
  const modal = document.getElementById("tripDetailsModal");

  if (!modal || modal.style.display !== "flex") return;

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
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}