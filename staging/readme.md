🚍 SHRD Shuttle Web App

SHRD Shuttle Web App is a web-based shuttle seat booking system built using HTML, CSS, and JavaScript (ES Modules) and hosted via GitHub Pages.

This project runs fully on the frontend and connects to a backend built using Google Apps Script + Google Sheets.

✨ Features
👤 User Module

Login system

Signup systems

Auto-login using localStorage

Logout system

🚌 Booking Module

Route search (connected to backend)

Travel date selection

Dynamic route listing

Seat availability display

Fare calculation

Route selection

Booking summary generation

💳 Payment Module

Payment modal UI

Payment method selection

Payment simulation

Razorpay-ready structure

✅ Confirmation Module

Booking confirmation modal UI

Booking details display

❌ Cancel Booking Module

Cancel booking UI

Booking ID input form

🛠 Admin Panel Module

API configuration UI

Backend connection testing

Future sync support

🆕 What Was Added Today
✅ 1. Route Search Integration (Live Backend Connection)

The frontend now connects to:

?action=searchRoutes

It sends:

travel_date

from_stop

to_stop

seats_required

Backend returns:

Available routes

24-hour formatted departure time

Available seats

Fare per seat

Total amount

✅ 2. Dynamic Routes Display

The following container now displays routes dynamically:

<div id="routesContainer"></div>
Behavior:

If routes are found → user sees selectable route cards

If no routes found → styled message appears:

<div class="alert error">
  ❌ No routes available for selected journey.
</div>
✅ 3. Seat Availability Logic Integrated

Frontend now displays:

Available seats

Total price calculation

Prevents selection if insufficient seats

✅ 4. 24-Hour Time Formatting Fix

Backend now sends:

18:00

Instead of:

1899-12-30T12:38:50.000Z

No frontend formatting required.

🎯 Project Objective

The goal of this project is to create a lightweight shuttle booking system that:

Works fully on the frontend

Can be hosted using GitHub Pages

Connects to Google Sheets as a database using Google Apps Script

Validates seat availability in real-time

🌐 Hosting Information (GitHub Pages)

Since this project is hosted on GitHub Pages:

✅ index.html must exist in root
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
Google Apps Script	Backend API
Google Sheets	Database storage
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
    │   ├── searchRoutes.js      # NEW - route search logic
    │   └── stubs.js
    │
    └── components/
        ├── header.html
        ├── login.html
        ├── mainContent.html
        ├── footer.html
        ├── paymentModal.html
        └── confirmationModal.html
🧩 Modular Structure Benefits

✅ Easy debugging

✅ Clear separation of concerns

✅ Scalable architecture

✅ Backend-frontend separation

✅ Production ready

🧠 JavaScript Modules Overview
main.js

Entry point

Loads components

Attaches functions to window

Runs autoLogin

searchRoutes.js (New)

Handles:

Calling backend searchRoutes

Rendering route cards

Displaying no-route message

Handling route selection

Updating booking summary

booking.js

Handles:

Seat selection UI

Summary calculation

Payment modal

Confirmation modal

🔄 Updated Application Flow
User selects route details
        ↓
searchRoutes.js calls backend
        ↓
Backend validates seats & fare
        ↓
Routes displayed dynamically
        ↓
User selects route
        ↓
Seat selection
        ↓
Payment modal
        ↓
Confirmation modal
▶️ Running Locally

Do NOT open index.html directly.

Use a local server:

npx http-server -p 3000

Then open:

http://localhost:3000
⚠️ Common Issues
❌ Routes not displaying

Check:

Backend deployment version updated

Correct Apps Script URL in config.js

Console logs for API response

❌ "Invalid action" error

Ensure backend Code.gs contains:

case "searchRoutes":
  return searchRoutes(e);
❌ Time showing 1899 date

Backend not updated to latest deployment version.

🔥 GitHub Workflow

Clone:

git clone https://github.com/shrd-cabs/Shuttle-Web-App.git
cd Shuttle-Web-App
code .

Push:

git add .
git commit -m "Added route search integration"
git push
🚀 Current System Status

✅ Frontend modular architecture stable

✅ Backend fully connected

✅ Live route search working

✅ Seat availability validation working

✅ 24-hour time formatting fixed

✅ No-route UI handling implemented