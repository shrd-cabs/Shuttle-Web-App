// ===============================================================
// captainUi.js
// ---------------------------------------------------------------
// Contains ONLY Captain UI related functions
//
// RESPONSIBILITIES:
// - Show/hide captain login and dashboard
// - Switch captain dashboard tabs
// ===============================================================


// ===============================================================
// SHOW CAPTAIN MAIN CONTENT AFTER LOGIN
// ===============================================================
export function showCaptainMainContent() {
  console.log("--------------------------------------------------");
  console.log("🖥️ showCaptainMainContent() called");

  const loginSection = document.getElementById("captainLoginSection");
  const dashboard = document.getElementById("captainDashboard");

  if (loginSection) {
    loginSection.style.display = "none";
    console.log("✅ captainLoginSection hidden");
  } else {
    console.warn("⚠️ captainLoginSection not found");
  }

  if (dashboard) {
    dashboard.style.display = "block";
    console.log("✅ captainDashboard shown");
  } else {
    console.warn("⚠️ captainDashboard not found");
  }

  console.log("--------------------------------------------------");
}


// ===============================================================
// SHOW CAPTAIN LOGIN SCREEN
// ===============================================================
export function showCaptainLoginContent() {
  console.log("--------------------------------------------------");
  console.log("🔐 showCaptainLoginContent() called");

  const loginSection = document.getElementById("captainLoginSection");
  const dashboard = document.getElementById("captainDashboard");

  if (loginSection) {
    loginSection.style.display = "block";
    console.log("✅ captainLoginSection shown");
  } else {
    console.warn("⚠️ captainLoginSection not found");
  }

  if (dashboard) {
    dashboard.style.display = "none";
    console.log("✅ captainDashboard hidden");
  } else {
    console.warn("⚠️ captainDashboard not found");
  }

  console.log("--------------------------------------------------");
}


// ===============================================================
// SWITCH CAPTAIN DASHBOARD TABS
// ---------------------------------------------------------------
// EXPECTED SECTION IDS:
// dashboard -> captainDashboardSection
// manifest  -> captainManifestSection
// ===============================================================
export function switchCaptainTabUI(tabName) {
  console.log("--------------------------------------------------");
  console.log(`🟣 switchCaptainTabUI() called → ${tabName}`);

  // Remove active from all tab buttons
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Hide all content sections
  document.querySelectorAll(".content-section").forEach((section) => {
    section.classList.remove("active");
    section.style.display = "none";
  });

  // Activate clicked tab
  const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeTab) {
    activeTab.classList.add("active");
    console.log(`✅ Activated captain tab: ${tabName}`);
  } else {
    console.warn(`⚠️ Captain tab not found for: ${tabName}`);
  }

  // Map tab name -> section ID
  const sectionMap = {
    dashboard: "captainDashboardSection",
    manifest: "captainManifestSection"
  };

  const targetSectionId = sectionMap[tabName];
  const section = document.getElementById(targetSectionId);

  if (section) {
    section.classList.add("active");
    section.style.display = "block";
    console.log(`✅ Activated captain section: ${targetSectionId}`);
  } else {
    console.error(`❌ Captain section not found: ${targetSectionId}`);
  }

  console.log("--------------------------------------------------");
}