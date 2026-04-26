// ===============================================================
// searchRoutes.js (ONE WAY + ROUND TRIP SUPPORT 🚀)
// ---------------------------------------------------------------
// Handles route searching functionality.
//
// RESPONSIBILITIES:
// 1. Initialize trip date input
// 2. Handle One Way / Round Trip trip type toggle
// 3. Handle Swap Stops button
// 4. Validate booking form inputs
// 5. Call backend searchRoutes API
// 6. Render:
//    - One Way routes
//    - Round Trip onward + return routes
// 7. Track selected route(s) safely
// 8. Update booking summary safely
// 9. Preserve global booking object for payment.js
// 10. Keep existing one-way flow backward-compatible
//
// IMPORTANT:
// ---------------------------------------------------------------
// ✅ Common trip date for both one-way and round-trip
// ✅ From / To are swapped for return route search automatically
// ✅ Round trip requires 2 selections:
//    - onward route
//    - return route
// ✅ window.selectedBooking remains available globally
// ✅ Includes detailed console logs for debugging
// ===============================================================

import { APP_CONFIG } from "./config.js";
import { currentUser } from "./state.js";

// ===============================================================
// CONSTANTS
// ===============================================================
const MAX_ADVANCE_DAYS = 7;

// ===============================================================
// MODULE STATE
// ===============================================================
let selectedRouteIndex = -1;

// Round-trip selection state
let selectedOnwardRouteIndex = -1;
let selectedReturnRouteIndex = -1;

// Rendered routes memory
let renderedRouteState = {
  tripType: "ONEWAY",
  onwardRoutes: [],
  returnRoutes: [],
  oneWayRoutes: []
};

// ===============================================================
// MODULE INITIALIZER
// ===============================================================
export function initSearchRoutes() {
  console.log("--------------------------------------------------");
  console.log("🔎 Initializing Route Search Module...");

  const checkBtn = document.getElementById("checkAvailabilityBtn");
  const dateInput = document.getElementById("tripDate");
  const oneWayBtn = document.getElementById("oneWayBtn");
  const roundTripBtn = document.getElementById("roundTripBtn");
  const swapBtn = document.getElementById("swapStopsBtn");

  initializeTripDate(dateInput);
  initializeTripTypeToggle(oneWayBtn, roundTripBtn);
  initializeSwapStopsButton(swapBtn);

  if (!checkBtn) {
    console.warn("⚠️ checkAvailabilityBtn not found");
    console.log("--------------------------------------------------");
    return;
  }

  checkBtn.removeEventListener("click", checkAvailability);
  checkBtn.addEventListener("click", checkAvailability);

  console.log("✅ Route Search Module Initialized");
  console.log("--------------------------------------------------");
}

// ===============================================================
// DATE INITIALIZATION
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

  dateInput.min = today;
  dateInput.max = maxDate;

  if (!dateInput.value || dateInput.value < today || dateInput.value > maxDate) {
    dateInput.value = today;
  }

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
// TRIP TYPE TOGGLE
// ===============================================================
function initializeTripTypeToggle(oneWayBtn, roundTripBtn) {
  if (!oneWayBtn || !roundTripBtn) {
    console.warn("⚠️ Trip type buttons not found");
    return;
  }

  oneWayBtn.removeEventListener("click", handleOneWayClick);
  roundTripBtn.removeEventListener("click", handleRoundTripClick);

  oneWayBtn.addEventListener("click", handleOneWayClick);
  roundTripBtn.addEventListener("click", handleRoundTripClick);

  console.log("✅ Trip type toggle initialized");
}

function handleOneWayClick() {
  console.log("🛣️ Trip Type selected: ONEWAY");
  setTripType("ONEWAY");
}

function handleRoundTripClick() {
  console.log("🔁 Trip Type selected: ROUNDTRIP");
  setTripType("ROUNDTRIP");
}

function setTripType(type) {
  const tripTypeInput = getElement("tripType");
  const oneWayBtn = getElement("oneWayBtn");
  const roundTripBtn = getElement("roundTripBtn");
  const routesContainer = getElement("routesContainer");

  if (tripTypeInput) {
    tripTypeInput.value = type.toLowerCase();
  }

  if (oneWayBtn) {
    oneWayBtn.classList.toggle("active", type === "ONEWAY");
  }

  if (roundTripBtn) {
    roundTripBtn.classList.toggle("active", type === "ROUNDTRIP");
  }

  resetRenderedRoutesState();
  clearSelectedBooking();
  clearBookingSummary();

  if (routesContainer) {
    routesContainer.innerHTML = "";
  }

  showAlert("", "");
  console.log("✅ Trip type updated to:", type);
}

// ===============================================================
// SWAP STOPS BUTTON
// ===============================================================
function initializeSwapStopsButton(swapBtn) {
  if (!swapBtn) {
    console.warn("⚠️ swapStopsBtn not found");
    return;
  }

  swapBtn.removeEventListener("click", swapStops);
  swapBtn.addEventListener("click", swapStops);

  console.log("✅ Swap stops button initialized");
}

function swapStops(event) {
  console.log("🔄 swapStops() called");

  const swapBtn = event?.currentTarget;

  const fromSearch = getElement("tripFromSearch");
  const fromHidden = getElement("tripFrom");
  const toSearch = getElement("tripToSearch");
  const toHidden = getElement("tripTo");

  if (!fromSearch || !fromHidden || !toSearch || !toHidden) {
    console.warn("⚠️ One or more stop inputs not found");
    return;
  }

  // 👇 rotation logic (works with hover)
  if (swapBtn) {
    let rotation = parseInt(swapBtn.dataset.rotation || "0", 10);

    // If hovered, base is already 180 visually → compensate
    const isHovered = swapBtn.matches(":hover");
    if (isHovered) {
      rotation += 180;
    }

    rotation += 180;

    swapBtn.dataset.rotation = rotation;
    swapBtn.style.transform = `rotate(${rotation}deg)`;

    console.log(`🔁 Rotation: ${rotation}deg`);
  }

  // swap logic
  const tempSearch = fromSearch.value;
  const tempHidden = fromHidden.value;

  fromSearch.value = toSearch.value;
  fromHidden.value = toHidden.value;

  toSearch.value = tempSearch;
  toHidden.value = tempHidden;

  console.log("✅ Stops swapped successfully");

  resetRenderedRoutesState();
  clearSelectedBooking();
  clearBookingSummary();

  const routesContainer = getElement("routesContainer");
  if (routesContainer) {
    routesContainer.innerHTML = "";
  }

  showAlert("", "");
}

// ===============================================================
// FORMAT DATE AS YYYY-MM-DD USING LOCAL DATE PARTS
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

function getCurrentTripType() {
  const raw = getInputValue("tripType").toUpperCase();
  return raw === "ROUNDTRIP" ? "ROUNDTRIP" : "ONEWAY";
}

// ===============================================================
// STATE RESET HELPERS
// ===============================================================
function resetRenderedRoutesState() {
  selectedRouteIndex = -1;
  selectedOnwardRouteIndex = -1;
  selectedReturnRouteIndex = -1;

  renderedRouteState = {
    tripType: getCurrentTripType(),
    onwardRoutes: [],
    returnRoutes: [],
    oneWayRoutes: []
  };

  window._renderedRoutes = [];
  window._renderedOnwardRoutes = [];
  window._renderedReturnRoutes = [];

  console.log("🧹 Route render state reset");
}

function clearSelectedBooking() {
  window.selectedBooking = null;
  console.log("🧹 window.selectedBooking cleared");
}

function clearBookingSummary() {
  const selectedSeatsDisplay = getElement("selectedSeatsDisplay");
  const dateDisplay = getElement("dateDisplay");
  const journeyTimeDisplay = getElement("journeyTimeDisplay");
  const totalAmountDisplay = getElement("totalAmountDisplay");
  const routeDisplay = getElement("routeDisplay");

  if (selectedSeatsDisplay) selectedSeatsDisplay.innerText = "None";
  if (dateDisplay) dateDisplay.innerText = "Not selected";
  if (journeyTimeDisplay) dateDisplay ? null : null;
  if (journeyTimeDisplay) journeyTimeDisplay.innerText = "Not selected";
  if (totalAmountDisplay) totalAmountDisplay.innerText = "Not selected";
  if (routeDisplay) routeDisplay.innerText = "Not selected";

  console.log("🧹 Booking summary cleared");
}

// ===============================================================
// LOG CHECK AVAILABILITY CLICK
// ---------------------------------------------------------------
// This runs for analysis purpose only.
// Even if logging fails, searchRoutes should continue.
// ===============================================================
async function logCheckAvailabilityClick({
  tripType,
  travelDate,
  fromStop,
  toStop,
  pax
}) {
  try {
    console.log("📝 Logging Check Availability click...");
    console.log("👤 Current User from state.js:", currentUser);

    const params = new URLSearchParams({
      action: "logAvailabilitySearch",
      trip_type: tripType || "ONEWAY",
      travel_date: travelDate || "",
      from_stop: fromStop || "",
      to_stop: toStop || "",
      seats_required: pax || "",
      user_email: currentUser?.email || "GUEST",
      user_name: currentUser?.name || "Guest User",
      device: navigator.userAgent || "",
      page_url: window.location.href || ""
    });

    const logUrl = `${APP_CONFIG.API_URL}?${params.toString()}`;

    console.log("📡 Availability Log URL:", logUrl);

    const response = await fetch(logUrl);
    const data = await response.json();

    console.log("✅ Availability log response:", data);

  } catch (error) {
    console.warn("⚠️ Availability log failed, continuing search:", error);
  }
}

// ===============================================================
// CHECK AVAILABILITY
// ===============================================================
async function checkAvailability() {
  console.log("--------------------------------------------------");
  console.log("🚌 Check Availability clicked");

  const tripType = getCurrentTripType();
  const travelDate = getInputValue("tripDate");
  const fromStop = getInputValue("tripFrom");
  const toStop = getInputValue("tripTo");
  const pax = getInputValue("noOfPAX");

  console.log("📌 Search Params:", {
    tripType,
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

  // ✅ Loader starts immediately
  toggleLoader(true);

  // ✅ Log click in background only.
  // ❌ Do not use await here.
  logCheckAvailabilityClick({
    tripType,
    travelDate,
    fromStop,
    toStop,
    pax
  });

  routesContainer.innerHTML = "";
  resetRenderedRoutesState();
  clearSelectedBooking();
  clearBookingSummary();
  showAlert("", "");

  if (!travelDate || !fromStop || !toStop) {
    console.warn("⚠️ Missing required input(s)");
    showAlert("Please select date and stops.", "warning");
    toggleLoader(false);
    console.log("--------------------------------------------------");
    return;
  }

  if (!isTripDateWithinAllowedRange(travelDate)) {
    console.warn("⚠️ Travel date is outside allowed range");
    showAlert(`Please select a date between today and the next ${MAX_ADVANCE_DAYS} days.`, "warning");
    toggleLoader(false);
    console.log("--------------------------------------------------");
    return;
  }

  if (fromStop === toStop) {
    console.warn("⚠️ From stop and To stop are same");
    showAlert("From and To stops cannot be the same.", "warning");
    toggleLoader(false);
    console.log("--------------------------------------------------");
    return;
  }

  try {
    console.log("🌐 Calling backend searchRoutes API...");

    const url =
      `${APP_CONFIG.API_URL}?action=searchRoutes` +
      `&trip_type=${encodeURIComponent(tripType)}` +
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

    if (!data?.success) {
      console.warn("⚠️ Backend returned unsuccessful response");
      showAlert(data?.error || "No trips available for selected date.", "warning");
      routesContainer.innerHTML = `
        <div class="route-empty">
          🚫 No trips available for selected date
        </div>
      `;
      console.log("--------------------------------------------------");
      return;
    }

    // ==========================================================
    // ROUND TRIP FLOW
    // ==========================================================
    if (tripType === "ROUNDTRIP") {
      const onwardRoutes = Array.isArray(data.onward_routes) ? data.onward_routes : [];
      const returnRoutes = Array.isArray(data.return_routes) ? data.return_routes : [];

      console.log("🔁 Round Trip Results:");
      console.log("➡️ onwardRoutes:", onwardRoutes.length);
      console.log("⬅️ returnRoutes:", returnRoutes.length);

      if (onwardRoutes.length === 0 || returnRoutes.length === 0) {
        console.warn("⚠️ Missing onward or return routes for round trip");

        showAlert("Round trip routes not available for selected date.", "warning");

        routesContainer.innerHTML = `
          <div class="route-empty">
            🚫 Round trip routes not available for selected date
          </div>
        `;

        console.log("--------------------------------------------------");
        return;
      }

      renderedRouteState.tripType = "ROUNDTRIP";
      renderedRouteState.onwardRoutes = onwardRoutes;
      renderedRouteState.returnRoutes = returnRoutes;

      window._renderedOnwardRoutes = onwardRoutes;
      window._renderedReturnRoutes = returnRoutes;

      showAlert("Onward and return routes found successfully.", "success");
      renderRoundTripRoutes({
        onwardRoutes,
        returnRoutes,
        travelDate,
        pax,
        fromStop,
        toStop
      });

      console.log("--------------------------------------------------");
      return;
    }

    // ==========================================================
    // ONE WAY FLOW
    // ==========================================================
    const routes = Array.isArray(data.routes) ? data.routes : [];

    if (routes.length === 0) {
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

    console.log(`✅ ${routes.length} one-way route(s) found`);

    renderedRouteState.tripType = "ONEWAY";
    renderedRouteState.oneWayRoutes = routes;

    showAlert("Routes found successfully.", "success");
    renderRoutes(routes, travelDate, pax, fromStop, toStop);

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
// RENDER ONE-WAY ROUTES
// ===============================================================
function renderRoutes(routes, travelDate, pax, fromStop, toStop) {
  console.log("🎨 Rendering one-way routes...");

  const container = getElement("routesContainer");
  if (!container) {
    console.error("❌ routesContainer not found during render");
    return;
  }

  selectedRouteIndex = -1;
  window._renderedRoutes = routes;

  let html = `<h3>Select Available Route</h3>`;

  routes.forEach((route, index) => {
    html += buildRouteCardHtml({
      route,
      index,
      sectionType: "oneway",
      buttonText: "Select Route"
    });
  });

  container.innerHTML = html;
  attachOneWayRouteListeners(routes, travelDate, pax, fromStop, toStop);

  console.log("✅ One-way routes rendered successfully");
}

// ===============================================================
// RENDER ROUND-TRIP ROUTES
// ===============================================================
function renderRoundTripRoutes({
  onwardRoutes,
  returnRoutes,
  travelDate,
  pax,
  fromStop,
  toStop
}) {
  console.log("🎨 Rendering round-trip routes...");

  const container = getElement("routesContainer");
  if (!container) {
    console.error("❌ routesContainer not found during round-trip render");
    return;
  }

  selectedOnwardRouteIndex = -1;
  selectedReturnRouteIndex = -1;

  let html = `
    <div class="roundtrip-routes-wrapper">

      <div class="roundtrip-section">
        <h3>Onward Route (${escapeHtml(fromStop)} → ${escapeHtml(toStop)})</h3>
  `;

  onwardRoutes.forEach((route, index) => {
    html += buildRouteCardHtml({
      route,
      index,
      sectionType: "onward",
      buttonText: "Select Onward"
    });
  });

  html += `
      </div>

      <div class="roundtrip-section" style="margin-top:20px;">
        <h3>Return Route (${escapeHtml(toStop)} → ${escapeHtml(fromStop)})</h3>
  `;

  returnRoutes.forEach((route, index) => {
    html += buildRouteCardHtml({
      route,
      index,
      sectionType: "return",
      buttonText: "Select Return"
    });
  });

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;

  attachRoundTripRouteListeners({
    onwardRoutes,
    returnRoutes,
    travelDate,
    pax,
    fromStop,
    toStop
  });

  console.log("✅ Round-trip routes rendered successfully");
}

// ===============================================================
// ROUTE CARD HTML BUILDER
// ===============================================================
function buildRouteCardHtml({ route, index, sectionType, buttonText }) {
  const routeName = route.route_name ?? "-";
  const pickupTime = route.arrivalTime_at_pickup ?? "-";
  const dropTime = route.reachingTime_at_drop ?? "-";
  const availableSeats = route.available_seats ?? "-";
  const farePerSeat = route.fare_per_seat ?? "-";
  const totalAmount = route.total_amount ?? "-";

  return `
    <div
      class="route-card"
      data-route-card-index="${index}"
      data-route-section="${escapeHtml(sectionType)}"
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
        data-route-index="${index}"
        data-route-section="${escapeHtml(sectionType)}">
        ${escapeHtml(buttonText)}
      </button>
    </div>
  `;
}

// ===============================================================
// ATTACH ONE-WAY LISTENERS
// ===============================================================
function attachOneWayRouteListeners(routes, travelDate, pax, fromStop, toStop) {
  const buttons = document.querySelectorAll('.select-route-btn[data-route-section="oneway"]');
  console.log(`🔘 Found ${buttons.length} one-way route button(s)`);

  buttons.forEach((btn) => {
    btn.addEventListener("click", function () {
      const index = Number(this.dataset.routeIndex);
      const route = routes?.[index];

      console.log("🖱️ One-way Select Route clicked:", { index, route });

      if (!route) {
        console.error("❌ Route data not found for selected one-way button");
        showAlert("Unable to select this route.", "error");
        return;
      }

      applySelectedRouteUI(index, "oneway");
      selectedRouteIndex = index;

      selectRouteHandler({
        tripType: "ONEWAY",
        routeId: route.route_id ?? "",
        routeName: route.route_name ?? "-",
        arrivalTime: route.arrivalTime_at_pickup ?? "-",
        reachingTime: route.reachingTime_at_drop ?? "-",
        travelDate,
        pax,
        totalAmount: Number(route.total_amount ?? 0),
        fromStop,
        toStop,
        busId: route.bus_id ?? "",
        busNumber: route.bus_number ?? "-",
        driverName: route.driver_name ?? "-",
        driverPhone: route.driver_phone ?? "-"
      });
    });
  });
}

// ===============================================================
// ATTACH ROUND-TRIP LISTENERS
// ===============================================================
function attachRoundTripRouteListeners({
  onwardRoutes,
  returnRoutes,
  travelDate,
  pax,
  fromStop,
  toStop
}) {
  const onwardButtons = document.querySelectorAll('.select-route-btn[data-route-section="onward"]');
  const returnButtons = document.querySelectorAll('.select-route-btn[data-route-section="return"]');

  console.log(`🔘 Found ${onwardButtons.length} onward button(s)`);
  console.log(`🔘 Found ${returnButtons.length} return button(s)`);

  onwardButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      const index = Number(this.dataset.routeIndex);
      const route = onwardRoutes?.[index];

      console.log("🖱️ Onward route selected:", { index, route });

      if (!route) {
        console.error("❌ Onward route data not found");
        showAlert("Unable to select onward route.", "error");
        return;
      }

      selectedOnwardRouteIndex = index;
      applySelectedRouteUI(index, "onward");
      updateRoundTripSelection({
        legType: "onward",
        route,
        travelDate,
        pax,
        fromStop,
        toStop
      });
    });
  });

  returnButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      const index = Number(this.dataset.routeIndex);
      const route = returnRoutes?.[index];

      console.log("🖱️ Return route selected:", { index, route });

      if (!route) {
        console.error("❌ Return route data not found");
        showAlert("Unable to select return route.", "error");
        return;
      }

      selectedReturnRouteIndex = index;
      applySelectedRouteUI(index, "return");
      updateRoundTripSelection({
        legType: "return",
        route,
        travelDate,
        pax,
        fromStop,
        toStop
      });
    });
  });
}

// ===============================================================
// APPLY SELECTED ROUTE UI
// ===============================================================
function applySelectedRouteUI(selectedIndex, sectionType = "oneway") {
  console.log("🎨 applySelectedRouteUI() called", { selectedIndex, sectionType });

  const allCards = document.querySelectorAll(`.route-card[data-route-section="${sectionType}"]`);
  const allButtons = document.querySelectorAll(`.select-route-btn[data-route-section="${sectionType}"]`);

  allCards.forEach((card) => card.classList.remove("selected"));

  allButtons.forEach((button) => {
    if (sectionType === "onward") {
      button.textContent = "Select Onward";
    } else if (sectionType === "return") {
      button.textContent = "Select Return";
    } else {
      button.textContent = "Select Route";
    }
  });

  const selectedCard = document.querySelector(
    `.route-card[data-route-card-index="${selectedIndex}"][data-route-section="${sectionType}"]`
  );

  const selectedButton = document.querySelector(
    `.select-route-btn[data-route-index="${selectedIndex}"][data-route-section="${sectionType}"]`
  );

  if (selectedCard) {
    selectedCard.classList.add("selected");
    console.log("✅ Selected class added");
  } else {
    console.warn("⚠️ Selected route card not found");
  }

  if (selectedButton) {
    if (sectionType === "onward") {
      selectedButton.textContent = "Selected ✓";
    } else if (sectionType === "return") {
      selectedButton.textContent = "Selected ✓";
    } else {
      selectedButton.textContent = "Selected ✓";
    }
    console.log("✅ Selected button text updated");
  } else {
    console.warn("⚠️ Selected route button not found");
  }
}

// ===============================================================
// ONE-WAY ROUTE SELECTION HANDLER
// ===============================================================
function selectRouteHandler({
  tripType,
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
  console.log("🟢 One-way Route Selected:", routeId);

  updateBookingSummaryUI({
    pax,
    travelDate,
    journeyText: `${arrivalTime} → ${reachingTime}`,
    totalText: `₹${totalAmount}`,
    routeText: routeName
  });

  window.selectedBooking = {
    tripType: tripType || "ONEWAY",
    routeId,
    routeName,
    arrivalTime,
    reachingTime,
    travelDate,
    pax,
    totalAmount: Number(totalAmount || 0),
    fromStop,
    toStop,
    busId,
    busNumber,
    driverName,
    driverPhone
  };

  console.log("📦 Stored One-way Booking Object:", window.selectedBooking);
  showAlert("Route selected successfully.", "success");
}

// ===============================================================
// ROUND-TRIP SELECTION HANDLER
// ===============================================================
function updateRoundTripSelection({
  legType,
  route,
  travelDate,
  pax,
  fromStop,
  toStop
}) {
  console.log("🔁 updateRoundTripSelection() called", { legType, route });

  const existingBooking = window.selectedBooking || {
    tripType: "ROUNDTRIP",
    travelDate,
    pax,
    onward: null,
    return: null,
    totalAmount: 0
  };

  const legPayload = {
    routeId: route.route_id ?? "",
    routeName: route.route_name ?? "-",
    arrivalTime: route.arrivalTime_at_pickup ?? "-",
    reachingTime: route.reachingTime_at_drop ?? "-",
    travelDate,
    pax,
    totalAmount: Number(route.total_amount ?? 0),
    fromStop: legType === "onward" ? fromStop : toStop,
    toStop: legType === "onward" ? toStop : fromStop,
    busId: route.bus_id ?? "",
    busNumber: route.bus_number ?? "-",
    driverName: route.driver_name ?? "-",
    driverPhone: route.driver_phone ?? "-"
  };

  if (legType === "onward") {
    existingBooking.onward = legPayload;
  } else if (legType === "return") {
    existingBooking.return = legPayload;
  }

  existingBooking.tripType = "ROUNDTRIP";
  existingBooking.travelDate = travelDate;
  existingBooking.pax = pax;

  const onwardAmount = Number(existingBooking.onward?.totalAmount || 0);
  const returnAmount = Number(existingBooking.return?.totalAmount || 0);
  existingBooking.totalAmount = onwardAmount + returnAmount;

  window.selectedBooking = existingBooking;

  console.log("📦 Updated Round-trip Booking Object:", window.selectedBooking);

  updateRoundTripSummaryUI(existingBooking);

  if (existingBooking.onward && existingBooking.return) {
    showAlert("Onward and return routes selected successfully.", "success");
  } else if (existingBooking.onward) {
    showAlert("Onward route selected. Please select return route.", "success");
  } else if (existingBooking.return) {
    showAlert("Return route selected. Please select onward route.", "success");
  }
}

// ===============================================================
// SUMMARY UPDATERS
// ===============================================================
function updateBookingSummaryUI({
  pax,
  travelDate,
  journeyText,
  totalText,
  routeText
}) {
  const selectedSeatsDisplay = getElement("selectedSeatsDisplay");
  const dateDisplay = getElement("dateDisplay");
  const journeyTimeDisplay = getElement("journeyTimeDisplay");
  const totalAmountDisplay = getElement("totalAmountDisplay");
  const routeDisplay = getElement("routeDisplay");

  if (selectedSeatsDisplay) {
    selectedSeatsDisplay.innerText = pax;
    console.log("✅ selectedSeatsDisplay updated:", pax);
  }

  if (dateDisplay) {
    dateDisplay.innerText = travelDate;
    console.log("✅ dateDisplay updated:", travelDate);
  }

  if (journeyTimeDisplay) {
    journeyTimeDisplay.innerText = journeyText;
    console.log("✅ journeyTimeDisplay updated:", journeyText);
  }

  if (totalAmountDisplay) {
    totalAmountDisplay.innerText = totalText;
    console.log("✅ totalAmountDisplay updated:", totalText);
  }

  if (routeDisplay) {
    routeDisplay.innerText = routeText;
    console.log("✅ routeDisplay updated:", routeText);
  }
}

function updateRoundTripSummaryUI(booking) {
  console.log("🧾 updateRoundTripSummaryUI() called", booking);

  const onwardJourney = booking.onward
    ? `${booking.onward.arrivalTime} → ${booking.onward.reachingTime}`
    : "Not selected";

  const returnJourney = booking.return
    ? `${booking.return.arrivalTime} → ${booking.return.reachingTime}`
    : "Not selected";

  const onwardRoute = booking.onward
    ? booking.onward.routeName
    : "Not selected";

  const returnRoute = booking.return
    ? booking.return.routeName
    : "Not selected";

  updateBookingSummaryUI({
    pax: booking.pax,
    travelDate: booking.travelDate,
    journeyText: `Onward: ${onwardJourney} | Return: ${returnJourney}`,
    totalText: booking.totalAmount > 0 ? `₹${booking.totalAmount}` : "Not selected",
    routeText: `Onward: ${onwardRoute} | Return: ${returnRoute}`
  });
}

// ===============================================================
// OPTIONAL GLOBAL SUPPORT FOR LEGACY ONE-WAY CALLS
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
    tripType: "ONEWAY",
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