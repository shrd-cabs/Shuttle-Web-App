// ===============================================================
// componentLoader.js
// ---------------------------------------------------------------
// This file loads HTML component files dynamically and injects
// them into index.html placeholders.
//
// Responsibilities:
// 1. Fetch the HTML file from given path
// 2. Validate response
// 3. Find placeholder div using componentId
// 4. Inject HTML inside placeholder
// 5. Dispatch custom event after component is loaded
//    (So other modules can initialize safely)
// ===============================================================

export async function loadComponent(componentId, filePath) {

  console.log("--------------------------------------------------");
  console.log(`📦 Component Load Requested`);
  console.log(`🆔 Target Placeholder ID: #${componentId}`);
  console.log(`📄 Component File Path: ${filePath}`);

  try {

    // -----------------------------------------------------------
    // 1️⃣ Fetch HTML file
    // -----------------------------------------------------------
    console.log(`📥 Fetching component file...`);

    const response = await fetch(filePath);

    if (!response.ok) {
      console.error(`❌ Fetch failed for: ${filePath}`);
      console.error(`⚠️ HTTP Status Code: ${response.status}`);
      throw new Error(`Failed to load component file: ${filePath}`);
    }

    console.log(`✅ File fetched successfully: ${filePath}`);

    // -----------------------------------------------------------
    // 2️⃣ Convert response to HTML text
    // -----------------------------------------------------------
    const html = await response.text();

    console.log(`📜 HTML content loaded, injecting into DOM...`);

    // -----------------------------------------------------------
    // 3️⃣ Find placeholder element in index.html
    // -----------------------------------------------------------
    const target = document.getElementById(componentId);

    if (!target) {
      console.error(`❌ Placeholder not found in index.html: #${componentId}`);
      throw new Error(`Component container not found: #${componentId}`);
    }

    // -----------------------------------------------------------
    // 4️⃣ Inject HTML into placeholder
    // -----------------------------------------------------------
    target.innerHTML = html;

    console.log(`🎉 Component Injected Successfully into #${componentId}`);

    // -----------------------------------------------------------
    // 5️⃣ Dispatch Custom Event
    // -----------------------------------------------------------
    // This allows main.js to safely initialize modules
    // AFTER the component is fully injected.
    document.dispatchEvent(
      new CustomEvent("componentLoaded", {
        detail: { id: componentId }
      })
    );

    console.log("📢 componentLoaded event dispatched");
    console.log("--------------------------------------------------");

    return true;

  } catch (error) {

    console.error("--------------------------------------------------");
    console.error(`🚨 COMPONENT LOAD ERROR`);
    console.error(`🆔 Component ID: #${componentId}`);
    console.error(`📄 File Path: ${filePath}`);
    console.error("❌ Error Details:", error);
    console.error("--------------------------------------------------");

    throw error;
  }
}