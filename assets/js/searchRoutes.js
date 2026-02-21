// ===============================================================
// searchRoutes.js
// ---------------------------------------------------------------
// Handles route searching functionality.
//
// Responsibilities:
// 1. Attach Check Availability button event
// 2. Validate form inputs
// 3. Call Apps Script backend
// 4. Render available routes
// 5. Update booking summary on route selection
// 6. Handle loader + alerts cleanly
// ===============================================================

import { APP_CONFIG } from "./config.js";


// ===============================================================
// INITIALIZER FUNCTION
// ===============================================================
export function initSearchRoutes() {

  console.log("🔎 Initializing Route Search Module...");

  const checkBtn = document.getElementById("checkAvailabilityBtn");

  if (!checkBtn) {
    console.warn("⚠️ checkAvailabilityBtn not found");
    return;
  }

  checkBtn.addEventListener("click", checkAvailability);

  console.log("✅ Route Search Module Initialized");
}


// ===============================================================
// CHECK AVAILABILITY FUNCTION
// ===============================================================
async function checkAvailability() {

  console.log("🚌 Check Availability clicked");

  const travelDate = document.getElementById("tripDate").value;
  const fromStop = document.getElementById("tripFrom").value;
  const toStop = document.getElementById("tripTo").value;
  const pax = document.getElementById("noOfPAX").value;

  const routesContainer = document.getElementById("routesContainer");

  if (!routesContainer) {
    console.error("❌ routesContainer not found");
    return;
  }

  // Clear previous results + alerts
  routesContainer.innerHTML = "";
  showAlert("", "");

  // ===============================
  // BASIC VALIDATION
  // ===============================
  if (!travelDate || !fromStop || !toStop) {
    showAlert("Please select date and stops.", "warning");
    return;
  }

  try {

    toggleLoader(true);

    console.log("🌐 Calling backend searchRoutes API...");

    const response = await fetch(
      `${APP_CONFIG.API_URL}?action=searchRoutes` +
      `&travel_date=${travelDate}` +
      `&from_stop=${encodeURIComponent(fromStop)}` +
      `&to_stop=${encodeURIComponent(toStop)}` +
      `&seats_required=${pax}`
    );

    const data = await response.json();

    console.log("📥 Backend Response:", data);

    // ===============================
    // NO ROUTES FOUND
    // ===============================
    if (!data.success || !data.routes || data.routes.length === 0) {

      showAlert("No routes available for selected journey.", "warning");

      routesContainer.innerHTML = `
        <div class="route-empty">
          ❌ No routes found.
        </div>
      `;

      return;
    }

    // ===============================
    // ROUTES FOUND
    // ===============================
    showAlert("Routes found successfully.", "success");

    renderRoutes(data.routes, travelDate, pax);

  } catch (error) {

    console.error("❌ Error while fetching routes:", error);

    showAlert("Error connecting to server.", "error");

  } finally {

    toggleLoader(false);
  }
}


// ===============================================================
// RENDER ROUTES
// ===============================================================
function renderRoutes(routes, travelDate, pax) {

  console.log("🎨 Rendering routes...");

  const container = document.getElementById("routesContainer");

  let html = `<h3>Select Available Route</h3>`;

  routes.forEach(route => {

    html += `
      <div class="route-card"
           style="padding:15px;margin-bottom:12px;border:1px solid #ddd;border-radius:8px;">

        <h4>${route.route_name}</h4>

        <p>
          <strong>Departure:</strong> ${route.departure_time}<br>
          <strong>Available Seats:</strong> ${route.available_seats}<br>
          <strong>Fare per Seat:</strong> ₹${route.fare_per_seat}<br>
          <strong>Total:</strong> ₹${route.total_amount}
        </p>

        <button class="btn btn-primary"
          onclick="selectRoute(
            '${route.route_id}',
            '${route.route_name}',
            '${route.departure_time}',
            '${travelDate}',
            '${pax}',
            '${route.total_amount}'
          )">
          Select Route
        </button>

      </div>
    `;
  });

  container.innerHTML = html;

  console.log("✅ Routes rendered successfully");
}


// ===============================================================
// SELECT ROUTE
// Updates Booking Summary
// ===============================================================
window.selectRoute = function (
  routeId,
  routeName,
  departureTime,
  travelDate,
  pax,
  totalAmount
) {

  console.log("🟢 Route Selected:", routeId);

  // Update booking summary
  document.getElementById("routeDisplay").innerText = routeName;
  document.getElementById("timeDisplay").innerText = departureTime;
  document.getElementById("dateDisplay").innerText = travelDate;
  document.getElementById("selectedSeatsDisplay").innerText = pax;

  // Store globally for payment use
  window.selectedBooking = {
    routeId,
    travelDate,
    pax,
    totalAmount
  };

  showAlert("Route selected successfully.", "success");
};


// ===============================================================
// TOGGLE LOADER (Spinner Handling)
// ===============================================================
function toggleLoader(show) {

  const text = document.getElementById("checkBtnText");
  const loader = document.getElementById("checkLoader");

  if (!text || !loader) return;

  text.style.display = show ? "none" : "inline";
  loader.style.display = show ? "inline-block" : "none";
}


// ===============================================================
// ALERT DISPLAY (Matches Your CSS System)
// Uses:
// .alert
// .alert.success
// .alert.error
// .alert.warning
// ===============================================================
function showAlert(message, type) {

  const alertBox = document.getElementById("bookingAlert");

  if (!alertBox) return;

  if (!message) {
    alertBox.className = "alert";
    alertBox.innerText = "";
    return;
  }

  alertBox.innerText = message;
  alertBox.className = "alert " + type;
}