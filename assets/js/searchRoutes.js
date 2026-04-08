// ===============================================================
// searchRoutes.js (OPTIMIZED + SAFE VERSION)
// ---------------------------------------------------------------
// Handles route searching functionality.
//
// RESPONSIBILITIES:
// 1. Initialize trip date input
//    - Freeze past dates
//    - Allow only today to next MAX_ADVANCE_DAYS
//    - Set default date = today
// 2. Attach Check Availability button safely
// 3. Validate form inputs
// 4. Call Apps Script backend
// 5. Render available routes
// 6. Handle route selection safely
// 7. Highlight selected route card
// 8. Update booking summary
// 9. Store selected booking globally
// 10. Handle loader + alerts cleanly
//
// IMPORTANT:
// - Existing functionality is preserved
// - Existing global window.selectedBooking is preserved
// - Existing legacy window.selectRoute() is preserved
// ===============================================================

import { APP_CONFIG } from "./config.js";

// ===============================================================
// CONSTANTS
// ===============================================================
const MAX_ADVANCE_DAYS = 7;

// ===============================================================
// MODULE STATE
// ===============================================================
let selectedRouteIndex = -1;

// ===============================================================
// MODULE INITIALIZER
// ===============================================================
export function initSearchRoutes() {
  console.log("--------------------------------------------------");
  console.log("🔎 Initializing Route Search Module...");

  const checkBtn = document.getElementById("checkAvailabilityBtn");
  const dateInput = document.getElementById("tripDate");

  // Initialize trip date field
  initializeTripDate(dateInput);

  if (!checkBtn) {
    console.warn("⚠️ checkAvailabilityBtn not found");
    console.log("--------------------------------------------------");
    return;
  }

  // Prevent duplicate event registration
  checkBtn.removeEventListener("click", checkAvailability);
  checkBtn.addEventListener("click", checkAvailability);

  console.log("✅ Route Search Module Initialized");
  console.log("--------------------------------------------------");
}

// ===============================================================
// DATE INITIALIZATION
// ---------------------------------------------------------------
// - Freeze past dates
// - Allow only next MAX_ADVANCE_DAYS from today
// - Set default today
// ===============================================================
function initializeTripDate(dateInput) {
  if (!dateInput) {
    console.warn("⚠️ tripDate input not found");
    return;
  }

  const todayObj = new Date();
  const today = formatDateLocal(todayObj);

  const maxDateObj = new Date(todayObj);
  maxDateObj.setDate(maxDateObj.getDate() + MAX_ADVANCE_DAYS);
  const maxDate = formatDateLocal(maxDateObj);

  // Native restriction
  dateInput.min = today;
  dateInput.max = maxDate;

  // Set default if empty or invalid
  if (!dateInput.value || dateInput.value < today || dateInput.value > maxDate) {
    dateInput.value = today;
  }

  // iPhone / browser fallback validation
  dateInput.removeEventListener("change", handleTripDateValidation);
  dateInput.removeEventListener("input", handleTripDateValidation);

  dateInput.addEventListener("change", handleTripDateValidation);
  dateInput.addEventListener("input", handleTripDateValidation);

  console.log("📅 Trip date initialized");
  console.log("➡️ Min Date:", today);
  console.log("➡️ Max Date:", maxDate);
  console.log("➡️ Selected Date:", dateInput.value);
}

function handleTripDateValidation(event) {
  const input = event.target;
  if (!input) return;

  const selectedDate = input.value;
  const minDate = input.min;
  const maxDate = input.max;

  console.log("🛡️ Validating trip date...");
  console.log("➡️ Selected:", selectedDate);
  console.log("➡️ Allowed Min:", minDate);
  console.log("➡️ Allowed Max:", maxDate);

  if (!selectedDate) return;

  if (selectedDate < minDate) {
    console.warn("⚠️ Selected date is before min date. Resetting to min.");
    input.value = minDate;
    showAlert(`You can only select dates from ${minDate} onwards.`, "warning");
    return;
  }

  if (selectedDate > maxDate) {
    console.warn("⚠️ Selected date is after max date. Resetting to max.");
    input.value = maxDate;
    showAlert(`You can only book up to ${MAX_ADVANCE_DAYS} days from today.`, "warning");
    return;
  }

  console.log("✅ Trip date is within allowed range");
}

function isTripDateWithinAllowedRange(dateValue) {
  if (!dateValue) return false;

  const todayObj = new Date();
  const today = formatDateLocal(todayObj);

  const maxDateObj = new Date(todayObj);
  maxDateObj.setDate(maxDateObj.getDate() + MAX_ADVANCE_DAYS);
  const maxDate = formatDateLocal(maxDateObj);

  return dateValue >= today && dateValue <= maxDate;
}

// ===============================================================
// FORMAT DATE AS YYYY-MM-DD USING LOCAL DATE PARTS
// Safe for HTML date input
// ===============================================================
function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ===============================================================
// DOM HELPERS
// ===============================================================
function getElement(id) {
  return document.getElementById(id);
}

function getInputValue(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

// ===============================================================
// CHECK AVAILABILITY
// ===============================================================
async function checkAvailability() {
  console.log("--------------------------------------------------");
  console.log("🚌 Check Availability clicked");

  const travelDate = getInputValue("tripDate");
  const fromStop = getInputValue("tripFrom");
  const toStop = getInputValue("tripTo");
  const pax = getInputValue("noOfPAX");

  console.log("📌 Search Params:", {
    travelDate,
    fromStop,
    toStop,
    pax
  });

  const routesContainer = getElement("routesContainer");

  if (!routesContainer) {
    console.error("❌ routesContainer not found");
    console.log("--------------------------------------------------");
    return;
  }

  // Clear previous routes / selection / alerts
  routesContainer.innerHTML = "";
  selectedRouteIndex = -1;
  window._renderedRoutes = [];
  showAlert("", "");

  // ==========================================================
  // FORM VALIDATION
  // ==========================================================
  if (!travelDate || !fromStop || !toStop) {
    console.warn("⚠️ Missing required input(s)");
    showAlert("Please select date and stops.", "warning");
    console.log("--------------------------------------------------");
    return;
  }

  if (!isTripDateWithinAllowedRange(travelDate)) {
    console.warn("⚠️ Travel date is outside allowed range");
    showAlert(`Please select a date between today and the next ${MAX_ADVANCE_DAYS} days.`, "warning");
    console.log("--------------------------------------------------");
    return;
  }

  if (fromStop === toStop) {
    console.warn("⚠️ From stop and To stop are same");
    showAlert("From and To stops cannot be the same.", "warning");
    console.log("--------------------------------------------------");
    return;
  }

  try {
    toggleLoader(true);

    console.log("🌐 Calling backend searchRoutes API...");

    const url =
      `${APP_CONFIG.API_URL}?action=searchRoutes` +
      `&travel_date=${encodeURIComponent(travelDate)}` +
      `&from_stop=${encodeURIComponent(fromStop)}` +
      `&to_stop=${encodeURIComponent(toStop)}` +
      `&seats_required=${encodeURIComponent(pax)}`;

    console.log("📡 Request URL:", url);

    const response = await fetch(url);

    console.log("📶 Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    console.log("📥 Backend Response:", data);

    // ==========================================================
    // NO ROUTES FOUND
    // ==========================================================
    if (!data?.success || !Array.isArray(data.routes) || data.routes.length === 0) {
      console.warn("⚠️ No routes returned from backend");

      showAlert("No trips available for selected date.", "warning");

      routesContainer.innerHTML = `
        <div class="route-empty">
          🚫 No trips available for selected date
        </div>
      `;

      console.log("--------------------------------------------------");
      return;
    }

    // ==========================================================
    // ROUTES FOUND
    // ==========================================================
    console.log(`✅ ${data.routes.length} route(s) found`);

    showAlert("Routes found successfully.", "success");
    renderRoutes(data.routes, travelDate, pax, fromStop, toStop);

  } catch (error) {
    console.error("❌ Error while fetching routes:", error);
    showAlert("Error connecting to server.", "error");
  } finally {
    toggleLoader(false);
    console.log("--------------------------------------------------");
  }
}

// ===============================================================
// ESCAPE HTML
// Prevent UI break / injection in rendered content
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
// RENDER ROUTES
// ---------------------------------------------------------------
// IMPORTANT:
// We DO NOT use inline onclick with route values.
// Instead:
// 1. Store route list in memory
// 2. Render buttons with data-route-index
// 3. Attach event listeners safely
// ===============================================================
function renderRoutes(routes, travelDate, pax, fromStop, toStop) {
  console.log("🎨 Rendering routes...");

  const container = getElement("routesContainer");

  if (!container) {
    console.error("❌ routesContainer not found during render");
    return;
  }

  // Reset selection state
  selectedRouteIndex = -1;

  // Store rendered routes globally for safe selection
  window._renderedRoutes = routes;

  let html = `<h3>Select Available Route</h3>`;

  routes.forEach((route, index) => {
    console.log(`🚌 Rendering Route ${index + 1}:`, route);

    const routeName = route.route_name ?? "-";
    const pickupTime = route.arrivalTime_at_pickup ?? "-";
    const dropTime = route.reachingTime_at_drop ?? "-";
    const availableSeats = route.available_seats ?? "-";
    const farePerSeat = route.fare_per_seat ?? "-";
    const totalAmount = route.total_amount ?? "-";

    html += `
      <div
        class="route-card"
        data-route-card-index="${index}"
        style="padding:15px;margin-bottom:12px;border:1px solid #ddd;border-radius:8px;"
      >
        <h3>${escapeHtml(routeName)}</h3>

        <p>
          <strong>Journey:</strong>
          ${escapeHtml(pickupTime)} → ${escapeHtml(dropTime)}<br>

          <strong>Available Seats:</strong> ${escapeHtml(availableSeats)}<br>

          <strong>Fare per Seat:</strong> ₹${escapeHtml(farePerSeat)}<br>

          <strong>Total:</strong> ₹${escapeHtml(totalAmount)}
        </p>

        <button
          type="button"
          class="btn btn-primary select-route-btn"
          data-route-index="${index}">
          Select Route
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
  console.log("🧩 Route cards injected into DOM");

  const buttons = container.querySelectorAll(".select-route-btn");
  console.log(`🔘 Found ${buttons.length} Select Route button(s)`);

  buttons.forEach((btn) => {
    btn.addEventListener("click", function () {
      const index = Number(this.dataset.routeIndex);
      const route = window._renderedRoutes?.[index];

      console.log("🖱️ Select Route button clicked for index:", index);
      console.log("📦 Route data fetched from memory:", route);

      if (!route) {
        console.error("❌ Route data not found for selected button index:", index);
        showAlert("Unable to select this route.", "error");
        return;
      }

      // --------------------------------------------------------
      // Highlight selected route card
      // --------------------------------------------------------
      applySelectedRouteUI(index);

      // --------------------------------------------------------
      // Preserve current selected route index
      // --------------------------------------------------------
      selectedRouteIndex = index;
      console.log("🎯 selectedRouteIndex updated:", selectedRouteIndex);

      // --------------------------------------------------------
      // Existing booking selection logic
      // --------------------------------------------------------
      selectRouteHandler({
        routeId: route.route_id ?? "",
        routeName: route.route_name ?? "-",
        arrivalTime: route.arrivalTime_at_pickup ?? "-",
        reachingTime: route.reachingTime_at_drop ?? "-",
        travelDate,
        pax,
        totalAmount: route.total_amount ?? "-",
        fromStop,
        toStop,
        busId: route.bus_id ?? "",
        busNumber: route.bus_number ?? "-",
        driverName: route.driver_name ?? "-",
        driverPhone: route.driver_phone ?? "-"
      });
    });
  });

  console.log("✅ Routes rendered successfully");
}

// ===============================================================
// APPLY SELECTED ROUTE UI
// ---------------------------------------------------------------
// Removes selected style from all route cards and applies it to
// the chosen one. Also updates button text.
// ===============================================================
function applySelectedRouteUI(selectedIndex) {
  console.log("🎨 applySelectedRouteUI() called for index:", selectedIndex);

  const allCards = document.querySelectorAll(".route-card");
  const allButtons = document.querySelectorAll(".select-route-btn");

  allCards.forEach((card) => {
    card.classList.remove("selected");
  });

  allButtons.forEach((button) => {
    button.textContent = "Select Route";
  });

  const selectedCard = document.querySelector(`.route-card[data-route-card-index="${selectedIndex}"]`);
  const selectedButton = document.querySelector(`.select-route-btn[data-route-index="${selectedIndex}"]`);

  if (selectedCard) {
    selectedCard.classList.add("selected");
    console.log("✅ Selected class added to route card");
  } else {
    console.warn("⚠️ Selected route card not found in DOM");
  }

  if (selectedButton) {
    selectedButton.textContent = "Selected ✓";
    console.log("✅ Selected button text updated");
  } else {
    console.warn("⚠️ Selected route button not found in DOM");
  }
}

// ===============================================================
// ROUTE SELECTION HANDLER
// ---------------------------------------------------------------
// Updates booking summary + stores selected booking globally
// ===============================================================
function selectRouteHandler({
  routeId,
  routeName,
  arrivalTime,
  reachingTime,
  travelDate,
  pax,
  totalAmount,
  fromStop,
  toStop,
  busId,
  busNumber,
  driverName,
  driverPhone
}) {
  console.log("🟢 Route Selected:", routeId);

  const selectedSeatsDisplay = getElement("selectedSeatsDisplay");
  const dateDisplay = getElement("dateDisplay");
  const journeyTimeDisplay = getElement("journeyTimeDisplay");
  const totalAmountDisplay = getElement("totalAmountDisplay");
  const routeDisplay = getElement("routeDisplay");

  // Update booking summary safely
  if (selectedSeatsDisplay) {
    selectedSeatsDisplay.innerText = pax;
    console.log("✅ selectedSeatsDisplay updated:", pax);
  } else {
    console.warn("⚠️ selectedSeatsDisplay not found");
  }

  if (dateDisplay) {
    dateDisplay.innerText = travelDate;
    console.log("✅ dateDisplay updated:", travelDate);
  } else {
    console.warn("⚠️ dateDisplay not found");
  }

  if (journeyTimeDisplay) {
    journeyTimeDisplay.innerText = `${arrivalTime} → ${reachingTime}`;
    console.log("✅ journeyTimeDisplay updated:", `${arrivalTime} → ${reachingTime}`);
  } else {
    console.warn("⚠️ journeyTimeDisplay not found");
  }

  if (totalAmountDisplay) {
    totalAmountDisplay.innerText = `₹${totalAmount}`;
    console.log("✅ totalAmountDisplay updated:", `₹${totalAmount}`);
  } else {
    console.warn("⚠️ totalAmountDisplay not found");
  }

  if (routeDisplay) {
    routeDisplay.innerText = routeName;
    console.log("✅ routeDisplay updated:", routeName);
  } else {
    console.warn("⚠️ routeDisplay not found");
  }

  // Preserve existing global booking object structure
  window.selectedBooking = {
    routeId,
    routeName,
    arrivalTime,
    reachingTime,
    travelDate,
    pax,
    totalAmount,
    fromStop,
    toStop,
    busId,
    busNumber,
    driverName,
    driverPhone
  };

  console.log("📦 Stored Booking Object:", window.selectedBooking);
  showAlert("Route selected successfully.", "success");
}

// ===============================================================
// OPTIONAL GLOBAL SUPPORT
// ---------------------------------------------------------------
// Keeps backward compatibility if any old code still calls
// window.selectRoute(...)
// ===============================================================
window.selectRoute = function (
  routeId,
  routeName,
  arrivalTime,
  reachingTime,
  travelDate,
  pax,
  totalAmount,
  fromStop,
  toStop,
  busId,
  busNumber,
  driverName,
  driverPhone
) {
  console.warn("⚠️ Legacy window.selectRoute() called");

  selectRouteHandler({
    routeId,
    routeName,
    arrivalTime,
    reachingTime,
    travelDate,
    pax,
    totalAmount,
    fromStop,
    toStop,
    busId,
    busNumber,
    driverName,
    driverPhone
  });
};

// ===============================================================
// TOGGLE LOADER
// ===============================================================
function toggleLoader(show) {
  console.log("⏳ Loader:", show ? "ON" : "OFF");

  const text = getElement("checkBtnText");
  const loader = getElement("checkLoader");
  const checkBtn = getElement("checkAvailabilityBtn");

  if (text) {
    text.style.display = show ? "none" : "inline";
  } else {
    console.warn("⚠️ checkBtnText not found");
  }

  if (loader) {
    loader.style.display = show ? "inline-block" : "none";
  } else {
    console.warn("⚠️ checkLoader not found");
  }

  if (checkBtn) {
    checkBtn.disabled = !!show;
  } else {
    console.warn("⚠️ checkAvailabilityBtn not found while toggling loader");
  }
}

// ===============================================================
// ALERT DISPLAY
// ===============================================================
function showAlert(message, type) {
  const alertBox = getElement("bookingAlert");

  if (!alertBox) {
    console.warn("⚠️ bookingAlert element not found");
    return;
  }

  if (!message) {
    alertBox.className = "alert";
    alertBox.innerText = "";
    console.log("🧹 Alert cleared");
    return;
  }

  console.log(`📢 Alert: ${type} → ${message}`);

  alertBox.innerText = message;
  alertBox.className = `alert ${type}`;
}