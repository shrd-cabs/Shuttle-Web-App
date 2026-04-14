🚌 Shuttle Web App – Backend

Production backend for the Shuttle Booking System, built using:

Google Apps Script (Web App API)

Google Sheets (Database)

This backend powers:

✅ Stop Management
✅ Route Management
✅ Route Search with Seat Availability (NEW)
✅ Fare Calculation
✅ Booking Creation
✅ Razorpay Payment Data Storage
✅ User Authentication

📂 Updated Project Structure
Shuttle-Web-App/
│
├── backend/
│   ├── Code.gs              # Main API router (doGet / doPost)
│   ├── users.gs             # User-related APIs
│   ├── stops.gs             # Stop API
│   ├── routes.gs            # Route APIs
│   ├── searchRoutes.gs      # ✅ Route search with seat validation (NEW)
│   ├── fares.gs             # Fare APIs
│   ├── bookings.gs          # Booking APIs
│   ├── sheetHelpers.gs      # Google Sheet helper functions
│   └── utils.gs             # jsonResponse & utility functions
│
└── frontend/
🆕 NEW FEATURE – Route Search API
🔍 searchRoutes

Searches available routes between two stops for a specific travel date.

✔ What It Does

Converts stop names → stop IDs

Validates route stop sequence order

Checks bus capacity

Counts confirmed bookings

Calculates available seats

Validates required seats

Fetches fare

Returns total amount

Formats departure time correctly (24-hour format)

📡 API Usage
?action=searchRoutes
Example:
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?action=searchRoutes&travel_date=2026-02-25&from_stop=Gurgaon&to_stop=Rewari&seats_required=1
✅ Sample Response
{
  "success": true,
  "routes": [
    {
      "route_id": "R002",
      "route_name": "Gurgaon to Rewari Evening",
      "departure_time": "18:00",
      "available_seats": 30,
      "fare_per_seat": 60,
      "total_amount": 60
    }
  ]
}
❌ If No Routes Available
{
  "success": true,
  "routes": []
}

Frontend handles this and shows:

No routes available for selected journey.

🕒 Time Handling (Important Fix Done Today)

Google Sheets stores time internally as:

1899-12-30T12:38:50.000Z

We fixed this by formatting time using:

Utilities.formatDate(
  departureTimeRaw,
  Session.getScriptTimeZone(),
  "HH:mm"
);

Now backend always returns clean 24-hour format:

18:00

No more 1899 date issue.

🧠 Booking Seat Validation Logic

Seat availability is calculated as:

availableSeats = busCapacity - confirmedBookings

Confirmed bookings are filtered by:

travel_date

route_id

booking_status = "CONFIRMED"

If:

availableSeats < seats_required

Route is excluded from results.

🔄 Updated API Routing

Inside Code.gs:

case "searchRoutes":
  return searchRoutes(e);

If invalid action:

{
  "success": false,
  "error": "Invalid action"
}
🚀 Current Backend Status (Updated)

✅ Stops API Working
✅ Routes API Working
✅ Fare API Working
✅ Booking API Working
✅ Razorpay fields integrated
✅ Action-based routing stable
✅ Route search with live seat availability working
✅ 24-hour departure time formatting fixed

🚧 Next Production Enhancements

Seat locking during payment

Razorpay signature verification

Duplicate booking prevention

Booking cancellation API

Admin analytics dashboard

Email confirmation system

Revenue reporting

Pagination for large datasets

🔒 Deployment Reminder

After any backend change:

Deploy

Manage Deployments

Edit deployment

Click New Version

Deploy

⚠ Saving is NOT enough.

If you want, I can now also generate:

🔹 A separate CHANGELOG.md

🔹 A professional production-ready README version

🔹 API documentation in Swagger-style format

You’re building this properly now 👌

in readme format

Here is your proper README.md formatted version (clean, production-ready, directly paste into README.md):

🚌 Shuttle Web App – Backend

Production backend for the Shuttle Booking System, built using:

Google Apps Script (Web App API)

Google Sheets (Database)

This backend powers:

✅ Stop Management

✅ Route Management

✅ Route Search with Seat Availability

✅ Fare Calculation

✅ Booking Creation

✅ Razorpay Payment Data Storage

✅ User Authentication

📂 Project Structure
Shuttle-Web-App/
│
├── backend/
│   ├── Code.gs              # Main API router (doGet / doPost)
│   ├── users.gs             # User-related APIs
│   ├── stops.gs             # Stop APIs
│   ├── routes.gs            # Route APIs
│   ├── searchRoutes.gs      # Route search with seat validation
│   ├── fares.gs             # Fare APIs
│   ├── bookings.gs          # Booking APIs
│   ├── sheetHelpers.gs      # Google Sheet helper functions
│   └── utils.gs             # jsonResponse & utility functions
│
└── frontend/
    ├── index.html
    └── assets/
        ├── js/
        ├── css/
        └── components/

⚠ Apps Script does NOT execute directly from GitHub.
All .gs files must be manually copied into the Google Apps Script editor.

📊 Google Sheets Database Structure

Create a Google Spreadsheet with the following tabs:

1️⃣ Users (Users)
Column	Field
A	Name
B	Email
C	Phone
D	Password
E	Role
F	Status
G	CreatedAt
2️⃣ Stops (Stops)
Column	Field
A	Stop_ID
B	StopName

Stops are read from row 2 onward.

3️⃣ Routes (Routes)
Column	Field
A	route_id
B	route_name
C	bus_id
D	departure_time
E	stop_sequence (comma-separated stop IDs)
F	active (TRUE/FALSE)

Example stop sequence:

ST001,ST002,ST003,ST004
4️⃣ Fares (Fares)
Column	Field
A	route_id
B	from_stop_id
C	to_stop_id
D	fare
E	active (TRUE/FALSE)

Fare is returned only if:

Route matches

Stops match

active = TRUE

5️⃣ Bookings (Bookings)
Column	Field
A	booking_id
B	booking_date
C	travel_date
D	route_id
E	bus_id
F	from_stop_id
G	to_stop_id
H	passenger_name
I	passenger_phone
J	seats_booked
K	fare_per_seat
L	total_amount
M	razorpay_order_id
N	razorpay_payment_id
O	payment_status
P	booking_status
Q	created_at

Booking ID format:

BK + timestamp
🔗 API Architecture

All APIs use:

?action=ACTION_NAME

Example:

https://script.google.com/macros/s/DEPLOYMENT_ID/exec?action=getStops
🚀 Supported API Actions
🔹 Stops
Action	Description
getStops	Fetch all stops
🔹 Routes
Action	Description
getRoutes	Fetch all active routes
searchRoutes	Search routes with seat availability
🔹 Fare
Action	Description
getFare	Get fare between two stops

Example:

?action=getFare&route_id=R001&from_stop_id=ST001&to_stop_id=ST003
🔹 Bookings
Action	Description
createBooking	Create new booking record

Booking is stored after successful payment.

🔹 Users
Action	Description
validateUser	Validate login credentials
addUser	Register new user
getUsers	Fetch all users
🆕 Route Search API (Seat Availability Engine)
Action
?action=searchRoutes
Required Parameters
travel_date
from_stop
to_stop
seats_required
Example
?action=searchRoutes&travel_date=2026-02-25&from_stop=Gurgaon&to_stop=Rewari&seats_required=1
✅ Sample Response
{
  "success": true,
  "routes": [
    {
      "route_id": "R002",
      "route_name": "Gurgaon to Rewari Evening",
      "departure_time": "18:00",
      "available_seats": 30,
      "fare_per_seat": 60,
      "total_amount": 60
    }
  ]
}
🧠 Seat Availability Logic
availableSeats = busCapacity - confirmedBookings

Bookings counted only when:

travel_date matches

route_id matches

booking_status = "CONFIRMED"

Routes are excluded if:

availableSeats < seats_required
🕒 Time Handling Fix

Google Sheets stores time internally as a Date object (e.g., 1899-12-30 base date).

We format departure time using:

Utilities.formatDate(
  departureTimeRaw,
  Session.getScriptTimeZone(),
  "HH:mm"
);

Now backend returns clean 24-hour format:

18:00
🧠 API Routing

Routing handled inside:

Code.gs

function doGet(e) {
  const action = e.parameter.action;
}

If invalid action:

{
  "success": false,
  "error": "Invalid action"
}
🚀 Deployment Instructions (IMPORTANT)

Saving code does NOT update the live Web App.

To deploy changes:

Open Google Apps Script

Click Deploy

Select Manage Deployments

Edit existing deployment

Click New Version

Deploy

✅ Web App URL remains the same
❌ Version must be updated

🔒 Deployment Settings

Use:

Execute as: Me

Who has access: Anyone

🏗 Current System Status

✅ Stops API Working

✅ Routes API Working

✅ Fare API Working

✅ Booking API Working

✅ Razorpay fields integrated

✅ Action-based routing stable

✅ Route search with seat availability working

✅ 24-hour departure time formatting fixed

🚧 Planned Enhancements

Seat locking during payment

Razorpay signature verification

Duplicate booking prevention

Booking cancellation API

Admin analytics dashboard

Email confirmation system

Revenue reporting

👨‍💻 Maintainers

Maintained by SHRD Development Team

Repository:
https://github.com/shrd-cabs/Shuttle-Web-App

📜 License

Private internal SHRD business system.
Not for public redistribution.