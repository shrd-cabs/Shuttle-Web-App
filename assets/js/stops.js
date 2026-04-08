// ===============================================================
// stops.js
// ---------------------------------------------------------------
// This file loads the list of shuttle stops from Google Sheets
// via Google Apps Script API and initializes custom searchable
// dropdowns for:
//
// - tripFromSearch (visible input)
// - tripToSearch   (visible input)
//
// Hidden fields preserve old IDs so existing booking logic can
// continue using:
// - tripFrom
// - tripTo
//
// WHY THIS APPROACH:
// - No CDN
// - No external library
// - User can type and search
// - Existing code compatibility is preserved
// ===============================================================

import { APP_CONFIG } from "./config.js";

// ===============================================================
// MODULE STATE
// ---------------------------------------------------------------
// Stores all stops returned by backend.
// Supports both formats:
// 1. ["Bus Stand", "Iffco Chowk"]
// 2. [{ stop_id: "ST001", stop_name: "Bus Stand" }]
// ===============================================================
let allStops = [];

// ===============================================================
// LOAD STOPS FROM BACKEND
// ---------------------------------------------------------------
// Fetch stops from Apps Script API, normalize them, and initialize
// custom searchable dropdowns.
// ===============================================================
export async function loadStops() {
  try {
    console.log("--------------------------------------------------");
    console.log("🚌 loadStops() called");
    console.log("📡 Fetching stops from API...");

    const response = await fetch(`${APP_CONFIG.API_URL}?action=getStops`);
    const data = await response.json();

    console.log("📥 getStops API response:", data);

    if (!data.success) {
      console.error("❌ Failed to load stops:", data.error || data.message || "Unknown error");
      return false;
    }

    if (!data.stops || data.stops.length === 0) {
      console.warn("⚠️ No stops found in spreadsheet / API");
      return false;
    }

    // -----------------------------------------------------------
    // Normalize stop data into consistent object shape
    // Final shape:
    // {
    //   stop_id: "ST001" or "Bus Stand, Rewari",
    //   stop_name: "Bus Stand, Rewari"
    // }
    // -----------------------------------------------------------
    allStops = normalizeStops(data.stops);

    console.log("🧾 Normalized stops:", allStops);

    if (!allStops.length) {
      console.warn("⚠️ Stops were returned but normalization produced empty result");
      return false;
    }

    // -----------------------------------------------------------
    // Required HTML elements
    // -----------------------------------------------------------
    const fromSearchInput = document.getElementById("tripFromSearch");
    const toSearchInput = document.getElementById("tripToSearch");
    const fromHiddenInput = document.getElementById("tripFrom");
    const toHiddenInput = document.getElementById("tripTo");
    const fromList = document.getElementById("tripFromList");
    const toList = document.getElementById("tripToList");

    if (!fromSearchInput || !toSearchInput || !fromHiddenInput || !toHiddenInput || !fromList || !toList) {
      console.error("❌ Searchable stop elements not found in HTML", {
        fromSearchInput: !!fromSearchInput,
        toSearchInput: !!toSearchInput,
        fromHiddenInput: !!fromHiddenInput,
        toHiddenInput: !!toHiddenInput,
        fromList: !!fromList,
        toList: !!toList
      });
      return false;
    }

    // -----------------------------------------------------------
    // Reset any previous values
    // -----------------------------------------------------------
    fromSearchInput.value = "";
    toSearchInput.value = "";
    fromHiddenInput.value = "";
    toHiddenInput.value = "";

    // -----------------------------------------------------------
    // Initialize searchable dropdowns
    // -----------------------------------------------------------
    createSearchableDropdown({
      wrapperId: "tripFromDropdown",
      inputId: "tripFromSearch",
      hiddenId: "tripFrom",
      listId: "tripFromList",
      placeholderText: "Type and search pickup stop"
    });

    createSearchableDropdown({
      wrapperId: "tripToDropdown",
      inputId: "tripToSearch",
      hiddenId: "tripTo",
      listId: "tripToList",
      placeholderText: "Type and search drop stop"
    });

    console.log("✅ Stops loaded and searchable dropdowns initialized successfully");
    console.log("--------------------------------------------------");
    return true;

  } catch (error) {
    console.error("❌ Error loading stops:", error);
    console.log("--------------------------------------------------");
    return false;
  }
}

// ===============================================================
// NORMALIZE STOPS
// ---------------------------------------------------------------
// Supports both backend shapes:
//
// A) ["Bus Stand, Rewari", "Iffco Chowk"]
// B) [{ stop_id: "ST001", stop_name: "Bus Stand, Rewari" }]
//
// Returns uniform array:
// [{ stop_id, stop_name }]
// ===============================================================
function normalizeStops(stops) {
  console.log("🧩 normalizeStops() called");

  if (!Array.isArray(stops)) {
    console.warn("⚠️ normalizeStops() received non-array data");
    return [];
  }

  const normalized = stops
    .map((stop, index) => {
      // Case 1: plain string stop
      if (typeof stop === "string") {
        const stopName = stop.trim();
        if (!stopName) return null;

        return {
          stop_id: stopName,
          stop_name: stopName,
          stop_index: index
        };
      }

      // Case 2: object stop
      if (stop && typeof stop === "object") {
        const stopName =
          String(stop.stop_name || stop.stopName || stop.name || stop.stop || "").trim();

        const stopId =
          String(stop.stop_id || stop.stopId || stop.id || stopName).trim();

        if (!stopName) return null;

        return {
          stop_id: stopId || stopName,
          stop_name: stopName,
          stop_index: index
        };
      }

      return null;
    })
    .filter(Boolean);

  console.log(`✅ normalizeStops() output count: ${normalized.length}`);
  return normalized;
}

// ===============================================================
// CREATE SEARCHABLE DROPDOWN
// ---------------------------------------------------------------
// Creates one custom no-library searchable dropdown.
//
// INPUTS:
// - wrapperId : outer div
// - inputId   : visible text input
// - hiddenId  : actual selected stop value
// - listId    : dropdown results container
// ===============================================================
function createSearchableDropdown({
  wrapperId,
  inputId,
  hiddenId,
  listId,
  placeholderText = "Type and search"
}) {
  console.log("🔧 createSearchableDropdown() called", {
    wrapperId,
    inputId,
    hiddenId,
    listId
  });

  const wrapper = document.getElementById(wrapperId);
  const input = document.getElementById(inputId);
  const hiddenInput = document.getElementById(hiddenId);
  const list = document.getElementById(listId);

  if (!wrapper || !input || !hiddenInput || !list) {
    console.error("❌ Missing searchable dropdown elements", {
      wrapperFound: !!wrapper,
      inputFound: !!input,
      hiddenInputFound: !!hiddenInput,
      listFound: !!list
    });
    return;
  }

  input.placeholder = placeholderText;

  // -----------------------------------------------------------
  // Prevent duplicate binding when loadStops() is called again
  // -----------------------------------------------------------
  if (input.dataset.bound === "true") {
    console.log(`ℹ️ ${inputId} already bound, refreshing list only`);
    renderDropdownList(list, allStops, input, hiddenInput);
    return;
  }

  input.dataset.bound = "true";

  let filteredStops = [...allStops];
  let activeIndex = -1;

  // -----------------------------------------------------------
  // Show full list on focus
  // -----------------------------------------------------------
  input.addEventListener("focus", () => {
    console.log(`🎯 ${inputId} focused`);
    filteredStops = filterStops(input.value);
    activeIndex = -1;
    renderDropdownList(list, filteredStops, input, hiddenInput, activeIndex);
  });

  // -----------------------------------------------------------
  // Filter as user types
  // -----------------------------------------------------------
  input.addEventListener("input", () => {
    const keyword = input.value || "";
    console.log(`⌨️ ${inputId} input changed:`, keyword);

    // Clear hidden field until valid selection is made
    hiddenInput.value = "";

    filteredStops = filterStops(keyword);
    activeIndex = -1;
    renderDropdownList(list, filteredStops, input, hiddenInput, activeIndex);
  });

  // -----------------------------------------------------------
  // Keyboard support
  // -----------------------------------------------------------
  input.addEventListener("keydown", (event) => {
    const isListVisible = list.style.display === "block";

    if (!isListVisible && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      filteredStops = filterStops(input.value);
      activeIndex = -1;
      renderDropdownList(list, filteredStops, input, hiddenInput, activeIndex);
    }

    if (!filteredStops.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, filteredStops.length - 1);
      renderDropdownList(list, filteredStops, input, hiddenInput, activeIndex);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      renderDropdownList(list, filteredStops, input, hiddenInput, activeIndex);
      return;
    }

    if (event.key === "Enter") {
      if (activeIndex >= 0 && filteredStops[activeIndex]) {
        event.preventDefault();
        selectStop(filteredStops[activeIndex], input, hiddenInput, list);
      }
      return;
    }

    if (event.key === "Escape") {
      console.log(`⌫ ${inputId} dropdown closed with Escape`);
      hideDropdown(list);
    }
  });

  // -----------------------------------------------------------
  // Validate typed text on blur
  // -----------------------------------------------------------
  input.addEventListener("blur", () => {
    // Delay so click selection can complete before hiding
    setTimeout(() => {
      const typedValue = normalizeText(input.value);
      const exactMatch = allStops.find(
        (stop) => normalizeText(stop.stop_name) === typedValue
      );

      if (!typedValue) {
        hiddenInput.value = "";
        input.value = "";
        console.log(`ℹ️ ${inputId} cleared on blur`);
      } else if (exactMatch) {
        hiddenInput.value = exactMatch.stop_id;
        input.value = exactMatch.stop_name;
        console.log(`✅ ${inputId} exact match on blur:`, exactMatch);
      } else if (!hiddenInput.value) {
        console.warn(`⚠️ ${inputId} typed value does not match any stop, clearing hidden value`);
      }

      hideDropdown(list);
    }, 150);
  });

  // -----------------------------------------------------------
  // Click outside to close dropdown
  // -----------------------------------------------------------
  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) {
      hideDropdown(list);
    }
  });

  // Initial render with all stops hidden until focus
  renderDropdownList(list, allStops, input, hiddenInput, activeIndex);
  hideDropdown(list);

  console.log(`✅ Searchable dropdown initialized for ${inputId}`);
}

// ===============================================================
// FILTER STOPS
// ---------------------------------------------------------------
// Filters by stop name and stop id.
// ===============================================================
function filterStops(keyword) {
  const search = normalizeText(keyword);

  if (!search) {
    return [...allStops];
  }

  const filtered = allStops.filter((stop) => {
    const stopName = normalizeText(stop.stop_name);
    const stopId = normalizeText(stop.stop_id);

    return stopName.includes(search) || stopId.includes(search);
  });

  console.log(`🔎 filterStops("${keyword}") -> ${filtered.length} matches`);
  return filtered;
}

// ===============================================================
// RENDER DROPDOWN LIST
// ---------------------------------------------------------------
// Rebuilds dropdown items every time user types / navigates.
// ===============================================================
function renderDropdownList(list, items, input, hiddenInput, activeIndex = -1) {
  if (!list) return;

  if (!items || !items.length) {
    list.innerHTML = `<div class="searchable-empty">No stops found</div>`;
    list.style.display = "block";
    return;
  }

  list.innerHTML = items.map((stop, index) => `
    <div
      class="searchable-item ${index === activeIndex ? "active" : ""}"
      data-stop-id="${escapeHtml(stop.stop_id)}"
      data-stop-name="${escapeHtml(stop.stop_name)}"
    >
      ${escapeHtml(stop.stop_name)}
    </div>
  `).join("");

  list.style.display = "block";

  const itemElements = list.querySelectorAll(".searchable-item");

  itemElements.forEach((itemEl, index) => {
    // Use mousedown so selection works before blur fires
    itemEl.addEventListener("mousedown", (event) => {
      event.preventDefault();

      const selectedStop = items[index];
      if (!selectedStop) return;

      selectStop(selectedStop, input, hiddenInput, list);
    });
  });
}

// ===============================================================
// SELECT STOP
// ---------------------------------------------------------------
// Sets visible input and hidden input value
// ===============================================================
function selectStop(stop, input, hiddenInput, list) {
  if (!stop || !input || !hiddenInput || !list) return;

  input.value = stop.stop_name;
  hiddenInput.value = stop.stop_id;

  console.log("✅ Stop selected:", {
    visibleText: stop.stop_name,
    hiddenValue: stop.stop_id
  });

  hideDropdown(list);
}

// ===============================================================
// HIDE DROPDOWN
// ===============================================================
function hideDropdown(list) {
  if (!list) return;
  list.style.display = "none";
}

// ===============================================================
// NORMALIZE TEXT
// ===============================================================
function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
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