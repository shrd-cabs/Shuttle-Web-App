// ===============================================================
// routeDetails.js
// ---------------------------------------------------------------
// Standalone Route & Stops modal.
//
// PURPOSE:
// - Opens from available-route cards
// - Loads the selected journey from getRouteDetails
// - Shows pickup, drop-off, duration, bus and scheduled stops
// - Optionally expands the complete bus route
//
// IMPORTANT:
// - Does not depend on Live Tracking
// - Does not modify window.selectedBooking
// - Does not select a route
// - Does not auto-refresh
// ===============================================================

import { APP_CONFIG } from "./config.js";


// ===============================================================
// CONFIGURATION
// ===============================================================
const ROUTE_DETAILS_CONFIG = {
  MODAL_ID: "routeDetailsModal",
  CONTENT_ID: "routeDetailsModalContent",
  CACHE_ENABLED: true
};


// ===============================================================
// MODULE STATE
// ===============================================================
const routeDetailsCache = new Map();

let latestRequest = null;
let activeController = null;
let previousFocusedElement = null;


// ===============================================================
// PUBLIC FUNCTION
// ---------------------------------------------------------------
// Called from searchRoutes.js.
// ===============================================================
export async function openRouteDetails({
  routeId = "",
  routeName = "",
  fromStopId = "",
  toStopId = "",
  fromStopName = "",
  toStopName = "",
  pickupTime = "",
  dropTime = "",
  busNumber = ""
} = {}) {
  console.log("--------------------------------------------------");
  console.log("🗺️ Opening Route & Stops");

  const request = normalizeRequest({
    routeId,
    routeName,
    fromStopId,
    toStopId,
    fromStopName,
    toStopName,
    pickupTime,
    dropTime,
    busNumber
  });

  console.log("📌 Route details request:", request);

  latestRequest = request;
  previousFocusedElement = document.activeElement;

  openModal(buildLoadingHtml(request));

  if (!request.routeId) {
    renderModalContent(
      buildErrorHtml(
        "Route ID is missing. Please search for the route again."
      )
    );

    return;
  }

  // Cancel any unfinished previous request.
  if (activeController) {
    activeController.abort();
  }

  activeController = new AbortController();

  const cacheKey = buildCacheKey(request);

  try {
    let data;

    if (
      ROUTE_DETAILS_CONFIG.CACHE_ENABLED &&
      routeDetailsCache.has(cacheKey)
    ) {
      console.log("⚡ Using cached route details");

      data = routeDetailsCache.get(cacheKey);
    } else {
      data = await fetchRouteDetails(
        request,
        activeController.signal
      );

      if (ROUTE_DETAILS_CONFIG.CACHE_ENABLED) {
        routeDetailsCache.set(cacheKey, data);
      }
    }

    renderModalContent(
      buildRouteDetailsHtml(data, request)
    );

    console.log("✅ Route details displayed");

  } catch (error) {
    if (error?.name === "AbortError") {
      console.log("ℹ️ Route details request cancelled");
      return;
    }

    console.error("❌ Route details failed:", error);

    renderModalContent(
      buildErrorHtml(
        error?.message ||
        "Unable to load route details."
      )
    );

  } finally {
    console.log("--------------------------------------------------");
  }
}


// ===============================================================
// CLEAR CACHE
// ===============================================================
export function clearRouteDetailsCache() {
  routeDetailsCache.clear();

  console.log("🧹 Route details cache cleared");
}


// ===============================================================
// NORMALIZE REQUEST
// ---------------------------------------------------------------
// Hidden stop fields may contain:
// - ST001
// - or a stop name
//
// Only actual IDs are sent as from_stop_id / to_stop_id.
// ===============================================================
function normalizeRequest(options) {
  const rawFromValue =
    cleanValue(options.fromStopId);

  const rawToValue =
    cleanValue(options.toStopId);

  let safeFromStopId = "";
  let safeToStopId = "";

  let safeFromStopName =
    cleanValue(options.fromStopName);

  let safeToStopName =
    cleanValue(options.toStopName);

  if (looksLikeStopId(rawFromValue)) {
    safeFromStopId = rawFromValue;
  } else if (!safeFromStopName && rawFromValue) {
    safeFromStopName = rawFromValue;
  }

  if (looksLikeStopId(rawToValue)) {
    safeToStopId = rawToValue;
  } else if (!safeToStopName && rawToValue) {
    safeToStopName = rawToValue;
  }

  return {
    routeId:
      cleanValue(options.routeId),

    routeName:
      cleanValue(options.routeName),

    fromStopId:
      safeFromStopId,

    toStopId:
      safeToStopId,

    fromStopName:
      safeFromStopName,

    toStopName:
      safeToStopName,

    pickupTime:
      formatTimeOnly(options.pickupTime),

    dropTime:
      formatTimeOnly(options.dropTime),

    busNumber:
      cleanValue(options.busNumber)
  };
}


// ===============================================================
// CHECK STOP ID FORMAT
// ===============================================================
function looksLikeStopId(value) {
  return /^(ST|STOP)[-_]?\d+$/i.test(
    cleanValue(value)
  );
}


// ===============================================================
// FETCH ROUTE DETAILS
// ===============================================================
async function fetchRouteDetails(request, signal) {
  const params = new URLSearchParams({
    action: "getRouteDetails",
    route_id: request.routeId
  });

  if (request.fromStopId) {
    params.set(
      "from_stop_id",
      request.fromStopId
    );
  }

  if (request.toStopId) {
    params.set(
      "to_stop_id",
      request.toStopId
    );
  }

  // Send names as safe fallback.
  if (request.fromStopName) {
    params.set(
      "from_stop",
      request.fromStopName
    );
  }

  if (request.toStopName) {
    params.set(
      "to_stop",
      request.toStopName
    );
  }

  const url =
    `${APP_CONFIG.API_URL}?${params.toString()}`;

  console.log("🌐 Route details URL:", url);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    signal
  });

  if (!response.ok) {
    throw new Error(
      `Server returned HTTP ${response.status}`
    );
  }

  const data = await response.json();

  console.log("📥 Route details response:", data);

  if (!data?.success) {
    throw new Error(
      data?.error ||
      "Route details could not be loaded."
    );
  }

  if (
    !Array.isArray(data.stops) ||
    data.stops.length === 0
  ) {
    throw new Error(
      "No scheduled stops were found for this route."
    );
  }

  return data;
}


// ===============================================================
// BUILD COMPLETE MODAL CONTENT
// ===============================================================
function buildRouteDetailsHtml(data, request) {
  const route = data?.route || {};
  const journey = data?.journey || {};

  const allStops =
    Array.isArray(data?.stops)
      ? data.stops
      : [];

  const journeyStops = allStops.filter(
    stop => stop?.is_journey_stop === true
  );

  const journeyMatched =
    journey?.found === true &&
    journeyStops.length > 0;

  const displayedStops =
    journeyMatched
      ? journeyStops
      : allStops;

  const routeName =
    cleanValue(route.route_name) ||
    request.routeName ||
    "Route Details";

  const pickupStop =
    journeyMatched
      ? cleanValue(journey.from_stop_name)
      : (
          request.fromStopName ||
          cleanValue(route.first_stop) ||
          "First stop"
        );

  const dropStop =
    journeyMatched
      ? cleanValue(journey.to_stop_name)
      : (
          request.toStopName ||
          cleanValue(route.last_stop) ||
          "Last stop"
        );

  const pickupTime =
    journeyMatched
      ? (
          formatTimeOnly(journey.pickup_time) ||
          request.pickupTime ||
          "--:--"
        )
      : (
          request.pickupTime ||
          formatTimeOnly(route.route_start_time) ||
          "--:--"
        );

  const dropTime =
    journeyMatched
      ? (
          formatTimeOnly(journey.drop_time) ||
          request.dropTime ||
          "--:--"
        )
      : (
          request.dropTime ||
          formatTimeOnly(route.route_end_time) ||
          "--:--"
        );

  const busNumber =
    request.busNumber ||
    cleanValue(route.bus_number) ||
    cleanValue(route.bus_id) ||
    "-";

  const durationMinutes =
    journeyMatched
      ? toValidNumber(journey.duration_minutes)
      : (
          toValidNumber(route.duration_minutes) ??
          calculateDurationFromStops(displayedStops)
        );

  const warningHtml =
    journeyMatched
      ? ""
      : `
        <div class="route-details-notice">
          <strong>Showing the complete route</strong>

          <span>
            ${escapeHTML(
              journey.warning ||
              "The selected pickup or drop-off could not be matched exactly."
            )}
          </span>
        </div>
      `;

  const fullRouteHtml =
    journeyMatched &&
    allStops.length > journeyStops.length
      ? buildFullRouteHtml(allStops)
      : "";

  return `
    <div class="route-details-layout">

      <!-- =====================================================
           HEADER
           ===================================================== -->
      <header class="route-details-header">

        <div class="route-details-header-copy">
          <span class="route-details-eyebrow">
            Scheduled Route
          </span>

          <h2 id="routeDetailsTitle">
            ${escapeHTML(routeName)}
          </h2>

          <p>
            Review scheduled stops before selecting this route.
          </p>
        </div>

        <button
          type="button"
          class="route-details-close-btn"
          data-route-details-action="close"
          aria-label="Close route details"
        >
          ×
        </button>

      </header>


      <!-- =====================================================
           SCROLLABLE CONTENT
           ===================================================== -->
      <div class="route-details-scroll-area">

        <!-- Pickup and Drop -->
        <section class="route-details-hero">

          <div class="route-details-endpoint">
            <small>Pickup</small>

            <strong>
              ${escapeHTML(pickupTime)}
            </strong>

            <span>
              ${escapeHTML(pickupStop)}
            </span>
          </div>

          <div
            class="route-details-route-visual"
            aria-hidden="true"
          >
            <span></span>
            <b>🚌</b>
            <span></span>
          </div>

          <div
            class="
              route-details-endpoint
              route-details-endpoint-right
            "
          >
            <small>Drop-off</small>

            <strong>
              ${escapeHTML(dropTime)}
            </strong>

            <span>
              ${escapeHTML(dropStop)}
            </span>
          </div>

        </section>


        <!-- Summary -->
        <section class="route-details-stats">

          <div>
            <small>Journey time</small>

            <strong>
              ${escapeHTML(
                formatDuration(durationMinutes)
              )}
            </strong>
          </div>

          <div>
            <small>
              ${
                journeyMatched
                  ? "Journey stops"
                  : "Route stops"
              }
            </small>

            <strong>
              ${escapeHTML(displayedStops.length)}
            </strong>
          </div>

          <div>
            <small>Bus number</small>

            <strong>
              ${escapeHTML(busNumber)}
            </strong>
          </div>

        </section>


        ${warningHtml}


        <!-- Selected Journey Timeline -->
        <section class="route-details-stops-section">

          <div class="route-details-section-heading">

            <div>
              <span>
                ${
                  journeyMatched
                    ? "Your Journey"
                    : "Complete Route"
                }
              </span>

              <h3>
                ${escapeHTML(displayedStops.length)}
                scheduled stop${
                  displayedStops.length === 1
                    ? ""
                    : "s"
                }
              </h3>
            </div>

            <span class="route-details-schedule-chip">
              Scheduled times
            </span>

          </div>

          <div class="route-details-timeline">
            ${
              displayedStops
                .map((stop, index) => {
                  return buildStopHtml({
                    stop,
                    index,
                    totalStops:
                      displayedStops.length,
                    fullRouteMode: false
                  });
                })
                .join("")
            }
          </div>

        </section>


        ${fullRouteHtml}

      </div>


      <!-- =====================================================
           FOOTER
           ===================================================== -->
      <footer class="route-details-footer">

        <p>
          Times may vary due to traffic or operating conditions.
        </p>

        <button
          type="button"
          class="btn btn-primary route-details-footer-btn"
          data-route-details-action="close"
        >
          Close
        </button>

      </footer>

    </div>
  `;
}


// ===============================================================
// BUILD EXPANDABLE COMPLETE ROUTE
// ===============================================================
function buildFullRouteHtml(allStops) {
  return `
    <section class="route-details-full-route">

      <button
        type="button"
        class="route-details-expand-btn"
        data-route-details-action="toggle-full-route"
        aria-expanded="false"
      >
        <span>
          <strong>View complete bus route</strong>

          <small>
            ${escapeHTML(allStops.length)}
            scheduled stops
          </small>
        </span>

        <span
          class="route-details-expand-symbol"
          aria-hidden="true"
        >
          +
        </span>
      </button>

      <div
        class="route-details-full-route-content"
        hidden
      >
        <div class="route-details-subheading">
          Complete Bus Route
        </div>

        <div class="route-details-timeline">
          ${
            allStops
              .map((stop, index) => {
                return buildStopHtml({
                  stop,
                  index,
                  totalStops: allStops.length,
                  fullRouteMode: true
                });
              })
              .join("")
          }
        </div>
      </div>

    </section>
  `;
}


// ===============================================================
// BUILD ONE STOP
// ===============================================================
function buildStopHtml({
  stop,
  index,
  totalStops,
  fullRouteMode
}) {
  const isFirst =
    index === 0;

  const isLast =
    index === totalStops - 1;

  const isPickup =
    stop?.is_pickup === true ||
    (!fullRouteMode && isFirst);

  const isDrop =
    stop?.is_drop === true ||
    (!fullRouteMode && isLast);

  const isJourneyStop =
    stop?.is_journey_stop === true;

  let markerText =
    String(index + 1);

  let modifierClass = "";
  let badgeText = "Scheduled";

  if (isPickup) {
    markerText = "●";
    modifierClass = " is-pickup";
    badgeText = "Pickup";
  } else if (isDrop) {
    markerText = "◆";
    modifierClass = " is-drop";
    badgeText = "Drop-off";
  } else if (
    fullRouteMode &&
    isJourneyStop
  ) {
    modifierClass = " is-journey";
    badgeText = "Your journey";
  }

  const stopOrder =
    toValidNumber(stop?.stop_order) ??
    index + 1;

  return `
    <article
      class="route-details-stop${modifierClass}"
    >

      <div
        class="route-details-stop-rail"
        aria-hidden="true"
      >
        <div class="route-details-stop-marker">
          ${escapeHTML(markerText)}
        </div>

        ${
          !isLast
            ? `
              <div
                class="route-details-stop-line"
              ></div>
            `
            : ""
        }
      </div>

      <div class="route-details-stop-card">

        <div class="route-details-stop-top">

          <div>
            <h4>
              ${escapeHTML(
                stop?.stop_name || "-"
              )}
            </h4>

            <p>
              ${escapeHTML(stop?.city || "")}
            </p>
          </div>

          <time>
            ${escapeHTML(
              formatTimeOnly(
                stop?.arrival_time
              ) || "--:--"
            )}
          </time>

        </div>

        <div class="route-details-stop-meta">

          <span>
            Stop ${escapeHTML(stopOrder)}
          </span>

          <span class="route-details-stop-badge">
            ${escapeHTML(badgeText)}
          </span>

        </div>

      </div>

    </article>
  `;
}


// ===============================================================
// CREATE MODAL ONCE
// ===============================================================
function ensureModalExists() {
  let modal = document.getElementById(
    ROUTE_DETAILS_CONFIG.MODAL_ID
  );

  if (modal) {
    return modal;
  }

  modal = document.createElement("div");

  modal.id =
    ROUTE_DETAILS_CONFIG.MODAL_ID;

  modal.className =
    "route-details-overlay";

  modal.setAttribute(
    "role",
    "dialog"
  );

  modal.setAttribute(
    "aria-modal",
    "true"
  );

  modal.setAttribute(
    "aria-labelledby",
    "routeDetailsTitle"
  );

  modal.innerHTML = `
    <div class="route-details-modal">
      <div
        id="${ROUTE_DETAILS_CONFIG.CONTENT_ID}"
      ></div>
    </div>
  `;

  document.body.appendChild(modal);

  return modal;
}


// ===============================================================
// OPEN MODAL
// ===============================================================
function openModal(html) {
  const modal =
    ensureModalExists();

  renderModalContent(html);

  document.body.classList.add(
    "route-details-open"
  );

  modal.classList.add(
    "is-open"
  );

  window.setTimeout(() => {
    modal
      .querySelector(
        ".route-details-close-btn"
      )
      ?.focus({
        preventScroll: true
      });
  }, 50);
}


// ===============================================================
// RENDER MODAL CONTENT
// ===============================================================
function renderModalContent(html) {
  const modal =
    ensureModalExists();

  const content =
    modal.querySelector(
      `#${ROUTE_DETAILS_CONFIG.CONTENT_ID}`
    );

  if (content) {
    content.innerHTML = html;
  }
}


// ===============================================================
// CLOSE MODAL
// ===============================================================
function closeRouteDetailsModal() {
  const modal =
    document.getElementById(
      ROUTE_DETAILS_CONFIG.MODAL_ID
    );

  if (!modal) {
    return;
  }

  if (activeController) {
    activeController.abort();
    activeController = null;
  }

  modal.classList.remove(
    "is-open"
  );

  document.body.classList.remove(
    "route-details-open"
  );

  if (
    previousFocusedElement instanceof HTMLElement
  ) {
    previousFocusedElement.focus({
      preventScroll: true
    });
  }
}


// ===============================================================
// LOADING STATE
// ===============================================================
function buildLoadingHtml(request) {
  return `
    <div
      class="
        route-details-layout
        route-details-state-layout
      "
    >

      <header class="route-details-header">

        <div class="route-details-header-copy">
          <span class="route-details-eyebrow">
            Scheduled Route
          </span>

          <h2 id="routeDetailsTitle">
            ${escapeHTML(
              request.routeName ||
              "Route & Stops"
            )}
          </h2>

          <p>
            Loading route information...
          </p>
        </div>

        <button
          type="button"
          class="route-details-close-btn"
          data-route-details-action="close"
          aria-label="Close route details"
        >
          ×
        </button>

      </header>

      <div class="route-details-state">

        <div
          class="route-details-spinner"
          aria-hidden="true"
        ></div>

        <h3>
          Loading route and stops
        </h3>

        <p>
          Please wait while we prepare the scheduled journey.
        </p>

      </div>

    </div>
  `;
}


// ===============================================================
// ERROR STATE
// ===============================================================
function buildErrorHtml(message) {
  return `
    <div
      class="
        route-details-layout
        route-details-state-layout
      "
    >

      <header class="route-details-header">

        <div class="route-details-header-copy">
          <span class="route-details-eyebrow">
            Scheduled Route
          </span>

          <h2 id="routeDetailsTitle">
            Route details unavailable
          </h2>

          <p>
            We could not load this route.
          </p>
        </div>

        <button
          type="button"
          class="route-details-close-btn"
          data-route-details-action="close"
          aria-label="Close route details"
        >
          ×
        </button>

      </header>

      <div
        class="
          route-details-state
          route-details-error-state
        "
      >

        <div class="route-details-error-icon">
          !
        </div>

        <h3>
          Unable to load route
        </h3>

        <p>
          ${escapeHTML(message)}
        </p>

        <div class="route-details-error-actions">

          <button
            type="button"
            class="btn btn-secondary"
            data-route-details-action="close"
          >
            Close
          </button>

          <button
            type="button"
            class="btn btn-primary"
            data-route-details-action="retry"
          >
            Try Again
          </button>

        </div>

      </div>

    </div>
  `;
}


// ===============================================================
// MODAL CLICK HANDLING
// ---------------------------------------------------------------
// One delegated listener handles:
// - Close
// - Retry
// - Expand complete route
// - Outside overlay click
// ===============================================================
document.addEventListener(
  "click",
  event => {
    const modal =
      document.getElementById(
        ROUTE_DETAILS_CONFIG.MODAL_ID
      );

    if (
      !modal ||
      !modal.classList.contains("is-open")
    ) {
      return;
    }

    const actionElement =
      event.target.closest(
        "[data-route-details-action]"
      );

    if (actionElement) {
      const action =
        actionElement.dataset.routeDetailsAction;

      if (action === "close") {
        closeRouteDetailsModal();
        return;
      }

      if (
        action === "retry" &&
        latestRequest
      ) {
        routeDetailsCache.delete(
          buildCacheKey(latestRequest)
        );

        openRouteDetails(
          latestRequest
        );

        return;
      }

      if (
        action === "toggle-full-route"
      ) {
        toggleFullRoute(
          actionElement
        );

        return;
      }
    }

    // Close only when the dark overlay itself is clicked.
    if (event.target === modal) {
      closeRouteDetailsModal();
    }
  }
);


// ===============================================================
// TOGGLE COMPLETE ROUTE
// ===============================================================
function toggleFullRoute(button) {
  const section =
    button.closest(
      ".route-details-full-route"
    );

  const content =
    section?.querySelector(
      ".route-details-full-route-content"
    );

  const symbol =
    button.querySelector(
      ".route-details-expand-symbol"
    );

  if (!content) {
    return;
  }

  const isExpanded =
    button.getAttribute(
      "aria-expanded"
    ) === "true";

  button.setAttribute(
    "aria-expanded",
    String(!isExpanded)
  );

  content.hidden =
    isExpanded;

  if (symbol) {
    symbol.textContent =
      isExpanded ? "+" : "−";
  }
}


// ===============================================================
// ESCAPE KEY
// ===============================================================
document.addEventListener(
  "keydown",
  event => {
    const modal =
      document.getElementById(
        ROUTE_DETAILS_CONFIG.MODAL_ID
      );

    if (
      !modal ||
      !modal.classList.contains("is-open")
    ) {
      return;
    }

    if (event.key === "Escape") {
      closeRouteDetailsModal();
    }
  }
);


// ===============================================================
// CACHE KEY
// ===============================================================
function buildCacheKey(request) {
  return [
    request.routeId.toUpperCase(),

    (
      request.fromStopId ||
      request.fromStopName
    ).toLowerCase(),

    (
      request.toStopId ||
      request.toStopName
    ).toLowerCase()
  ].join("|");
}


// ===============================================================
// CALCULATE DURATION FROM STOPS
// ===============================================================
function calculateDurationFromStops(stops) {
  if (
    !Array.isArray(stops) ||
    stops.length < 2
  ) {
    return null;
  }

  const firstMinutes =
    timeToMinutes(
      stops[0]?.arrival_time
    );

  let lastMinutes =
    timeToMinutes(
      stops[
        stops.length - 1
      ]?.arrival_time
    );

  if (
    firstMinutes === null ||
    lastMinutes === null
  ) {
    return null;
  }

  if (lastMinutes < firstMinutes) {
    lastMinutes += 24 * 60;
  }

  return lastMinutes - firstMinutes;
}


// ===============================================================
// FORMAT DURATION
// ===============================================================
function formatDuration(value) {
  const minutes =
    toValidNumber(value);

  if (
    minutes === null ||
    minutes < 0
  ) {
    return "Scheduled";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(minutes / 60);

  const remainingMinutes =
    minutes % 60;

  return remainingMinutes === 0
    ? `${hours} hr`
    : `${hours} hr ${remainingMinutes} min`;
}


// ===============================================================
// TIME TO MINUTES
// ===============================================================
function timeToMinutes(value) {
  const time =
    formatTimeOnly(value);

  if (
    !time ||
    !time.includes(":")
  ) {
    return null;
  }

  const parts =
    time.split(":");

  const hours =
    Number(parts[0]);

  const minutes =
    Number(parts[1]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null;
  }

  return hours * 60 + minutes;
}


// ===============================================================
// FORMAT TIME
// ===============================================================
function formatTimeOnly(value) {
  const text =
    cleanValue(value);

  if (!text) {
    return "";
  }

  if (text.includes("T")) {
    const date =
      new Date(text);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date.toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }
      );
    }
  }

  const match =
    text.match(
      /(\d{1,2}):(\d{2})(?::\d{2})?/
    );

  if (match) {
    return (
      `${String(match[1]).padStart(2, "0")}` +
      `:${match[2]}`
    );
  }

  return text;
}


// ===============================================================
// CLEAN VALUE
// ===============================================================
function cleanValue(value) {
  if (
    value === null ||
    typeof value === "undefined"
  ) {
    return "";
  }

  return String(value).trim();
}


// ===============================================================
// VALID NUMBER
// ===============================================================
function toValidNumber(value) {
  if (
    value === null ||
    typeof value === "undefined" ||
    value === ""
  ) {
    return null;
  }

  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : null;
}


// ===============================================================
// ESCAPE HTML
// ===============================================================
function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}