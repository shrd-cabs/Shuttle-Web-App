🚍 SHRD Shuttle Web App

SHRD Shuttle Web App is a web-based shuttle seat booking system built using HTML, CSS, and JavaScript (ES Modules) and hosted via GitHub Pages.

This project is designed to run fully on the frontend and can optionally connect to a backend using Google Apps Script + Google Sheets.

✨ Features
👤 User Module

Login system

Signup system

Auto-login using localStorage

Logout system

🚌 Booking Module

Route selection

Date selection

Time selection

Seat selection UI

Booking summary generation

💳 Payment Module

Payment modal UI

Payment method selection

Payment simulation

✅ Confirmation Module

Booking confirmation modal UI

Booking details display

❌ Cancel Booking Module

Cancel booking UI

Booking ID input form

🛠 Admin Panel Module

API key + spreadsheet configuration UI

Connection testing UI

Sync buttons (future-ready)

🎯 Project Objective

The goal of this project is to create a lightweight shuttle booking system that:

Works fully on the frontend

Can be hosted using GitHub Pages

Can optionally connect to Google Sheets as a database using Google Apps Script

🌐 Hosting Information (GitHub Pages)

Since this project is hosted on GitHub Pages:

✅ index.html must exist in the root directory
✅ All file paths must be relative
✅ ES Modules must be loaded properly
❌ Avoid local file paths like file:///Users/...

Correct example:

<script type="module" src="./assets/js/main.js"></script>


Incorrect example:

<script src="file:///Users/.../main.js"></script>

⚙️ Tech Stack
Technology	Purpose
HTML	UI structure
CSS	Styling and layout
JavaScript (ES Modules)	Application logic
GitHub Pages	Hosting
Google Apps Script	Backend API (optional)
Google Sheets	Database storage (optional)
📁 Project Structure
Shuttle-Web-App/
│
├── index.html
├── README.md
│
└── assets/
    │
    ├── css/
    │   └── styles.css
    │
    ├── js/
    │   ├── main.js
    │   ├── config.js
    │   ├── componentLoader.js
    │   ├── auth.js
    │   ├── ui.js
    │   ├── booking.js
    │   └── stubs.js
    │
    └── components/
        ├── header.html
        ├── login.html
        ├── mainContent.html
        ├── footer.html
        ├── paymentModal.html
        └── confirmationModal.html

🧩 Why This Modular Structure?

This project is divided into multiple modules because it makes development easier:

✅ Easy debugging
✅ Clean separation of features
✅ Faster onboarding for new developers
✅ Multiple developers can work without conflicts
✅ New features can be added without breaking existing code

🖥 Frontend Documentation
📦 UI Components (assets/components)

All UI sections are stored as separate .html files and loaded dynamically into index.html.

header.html

Contains:

Logo

App title

Logout button

Injected into:

#headerComponent

login.html

Contains:

Login form

Signup form

Signup toggle UI

Uses:

login()

signup()

toggleSignup()

Injected into:

#loginComponent

mainContent.html

Contains:

Navigation tabs

Booking section

My Trips section

Cancel booking section

Admin panel section

Uses:

switchTab()

Injected into:

#mainContentComponent

paymentModal.html

Contains:

Payment modal UI

Payment method selection

Pay now and cancel buttons

Uses:

processPayment()

closePaymentModal()

Injected into:

#paymentModalComponent

confirmationModal.html

Contains:

Confirmation modal UI

Booking details display

Done button

Uses:

closeConfirmationModal()

Injected into:

#confirmationModalComponent

footer.html

Contains:

Footer information

Injected into:

#footerComponent

🧠 JavaScript Modules (assets/js)

This project uses ES Modules (type="module").

main.js (Application Entry Point)

Responsibilities:

imports all modules

loads all HTML components dynamically

attaches required functions to window

registers stub functions

runs autoLogin after UI is ready

Why we attach functions to window:

HTML uses inline onclick like:

<button onclick="login()">Login</button>


So functions must be global:

window.login = login;
window.logout = logout;

componentLoader.js

Loads HTML component files using fetch() and injects them into placeholders in index.html.

Example:

await loadComponent("headerComponent", "./assets/components/header.html");

config.js

Stores project configuration such as backend URL.

Example:

export const APP_CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
};

auth.js

Handles authentication:

login

signup

logout

auto login

Uses:

localStorage

Apps Script API calls via fetch

ui.js

Handles UI operations:

switching tabs

showing and hiding sections

toggling signup form

booking.js

Handles booking logic:

seat selection UI

booking summary updates

payment modal open/close

confirmation modal open/close

cancel booking UI logic

stubs.js

Contains placeholder functions for future features to avoid runtime errors when buttons are clicked.

🔄 Application Flow
High-Level Flow
index.html
   |
   v
main.js
   |
   v
Load all UI components
   |
   v
Attach functions to window
   |
   v
autoLogin()
   |
   +--------------------------+
   |                          |
   v                          v
Login Screen            Main Dashboard
   |
   v
Booking -> Payment -> Confirmation

Step-by-Step Flow

User opens the website

index.html loads

main.js starts execution

HTML components are injected into placeholders

required functions are attached to window

autoLogin checks localStorage

if user exists, dashboard is shown

user books seats and proceeds to payment

payment modal appears

confirmation modal appears

user can navigate to cancel/admin panels

▶️ Running the Project Locally

Do not open index.html directly from Finder.

Run using a local server:

npx http-server -p 3000


Then open:

http://localhost:3000

⚠️ Common Issues
CORS / file:/// error

Reason:
You opened the file directly from Finder.

Fix:
Run using localhost (Live Server or http-server).

Function not defined error (login, toggleSignup, etc.)

Reason:
Function not attached to window.

Fix:
Ensure main.js includes:

window.login = login;
window.toggleSignup = toggleSignupForm;

.DS_Store appearing in git

Reason:
macOS generates .DS_Store.

Fix:
Add to .gitignore:

.DS_Store

🔥 GitHub Workflow
Clone Repository
git clone https://github.com/shrd-cabs/Shuttle-Web-App.git
cd Shuttle-Web-App
code .

Push Changes
git add .
git commit -m "your message"
git push