// ===============================================================
// componentLoader.js
// ---------------------------------------------------------------
// This file loads HTML component files dynamically and injects them
// into index.html placeholders.
//
// Example Usage:
// await loadComponent("headerComponent", "./components/header.html");
//
// Why we use this?
// - Keeps index.html clean
// - Makes project modular
// - Allows separate HTML files for each UI section
//
// Responsibilities:
// 1. Fetch the HTML file from given path
// 2. Validate response
// 3. Find placeholder div using componentId
// 4. Inject HTML inside placeholder
// 5. Log everything for debugging
// ===============================================================

export async function loadComponent(componentId, filePath) {
  console.log("--------------------------------------------------");
  console.log(`📦 Component Load Requested`);
  console.log(`🆔 Target Placeholder ID: #${componentId}`);
  console.log(`📄 Component File Path: ${filePath}`);

  try {
    console.log(`📥 Fetching component file...`);

    const response = await fetch(filePath);

    // If file is not found or server gives error
    if (!response.ok) {
      console.error(`❌ Fetch failed for: ${filePath}`);
      console.error(`⚠️ HTTP Status Code: ${response.status}`);
      throw new Error(`Failed to load component file: ${filePath}`);
    }

    console.log(`✅ File fetched successfully: ${filePath}`);

    // Convert file into text (HTML)
    const html = await response.text();

    console.log(`📜 HTML content loaded, injecting into DOM...`);

    // Find placeholder element
    const target = document.getElementById(componentId);

    if (!target) {
      console.error(`❌ Placeholder not found in index.html: #${componentId}`);
      throw new Error(`Component container not found: #${componentId}`);
    }

    // Inject HTML
    target.innerHTML = html;

    console.log(`🎉 Component Injected Successfully into #${componentId}`);
    console.log("--------------------------------------------------");

    return true;
  } catch (error) {
    console.error("--------------------------------------------------");
    console.error(`🚨 COMPONENT LOAD ERROR`);
    console.error(`🆔 Component ID: #${componentId}`);
    console.error(`📄 File Path: ${filePath}`);
    console.error("❌ Error Details:", error);
    console.error("--------------------------------------------------");

    // IMPORTANT: Throw error so main.js can stop if critical component fails
    throw error;
  }
}