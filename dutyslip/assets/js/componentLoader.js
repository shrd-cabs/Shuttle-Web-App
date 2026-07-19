// ===============================================================
// componentLoader.js
// ---------------------------------------------------------------
// Loads reusable HTML components into the Duty Slip page.
//
// Components loaded:
// - Header
// - Login
// - Dashboard
// - Footer
// ===============================================================


// ===============================================================
// LOAD ONE COMPONENT
// ---------------------------------------------------------------
// elementId:
// ID of the placeholder element in index.html.
//
// componentPath:
// Relative path of the HTML component.
// ===============================================================

async function loadComponent(
  elementId,
  componentPath
) {
  const targetElement =
    document.getElementById(elementId);

  if (!targetElement) {
    throw new Error(
      `Component target not found: ${elementId}`
    );
  }

  const response = await fetch(componentPath, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(
      `Unable to load component: ${componentPath}`
    );
  }

  targetElement.innerHTML =
    await response.text();
}


// ===============================================================
// LOAD ALL DUTY SLIP COMPONENTS
// ---------------------------------------------------------------
// Components are loaded together for faster page initialization.
// ===============================================================

export async function loadDutySlipComponents() {
  await Promise.all([
    loadComponent(
      "headerComponent",
      "./components/header.html"
    ),

    loadComponent(
      "loginComponent",
      "./components/login.html"
    ),

    loadComponent(
      "dashboardComponent",
      "./components/dashboard.html"
    ),

    loadComponent(
      "footerComponent",
      "./components/footer.html"
    )
  ]);
}