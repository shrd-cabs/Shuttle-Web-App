// ===============================================================
// stops.js
// ---------------------------------------------------------------
// This file is responsible for loading the list of shuttle stops
// from Google Sheets (via Google Apps Script API).
//
// It fetches stops and injects them into the dropdowns:
// - tripFrom
// - tripTo
//
// Sheet Info:
// - Sheet Name: Stops
// - Stops stored in Column B (from B2 onwards)
// ===============================================================

import { APP_CONFIG } from "./config.js";

export async function loadStops() {
  try {
    console.log("🚌 Fetching stops from Google Sheets...");

    const response = await fetch(`${APP_CONFIG.API_URL}?action=getStops`);
    const data = await response.json();

    if (!data.success) {
      console.error("❌ Failed to load stops:", data.error);
      return false;
    }

    if (!data.stops || data.stops.length === 0) {
      console.warn("⚠️ No stops found in spreadsheet");
      return false;
    }

    const fromSelect = document.getElementById("tripFrom");
    const toSelect = document.getElementById("tripTo");

    if (!fromSelect || !toSelect) {
      console.error("❌ tripFrom or tripTo dropdown not found in HTML");
      return false;
    }

    fromSelect.innerHTML = `<option value="">Select From</option>`;
    toSelect.innerHTML = `<option value="">Select To</option>`;

    data.stops.forEach((stop) => {
      fromSelect.innerHTML += `<option value="${stop}">${stop}</option>`;
      toSelect.innerHTML += `<option value="${stop}">${stop}</option>`;
    });

    console.log("✅ Stops loaded successfully:", data.stops);
    return true;

  } catch (error) {
    console.error("❌ Error loading stops:", error);
    return false;
  }
}
