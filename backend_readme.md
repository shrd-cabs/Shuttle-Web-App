🚌 Shuttle Web App – Backend

Production backend for the Shuttle Booking System, built using:

Google Apps Script (Web App API)

Google Sheets (Database)

This backend powers:

✅ Stop Management

✅ Route Management

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

⚠️ Apps Script does NOT execute directly from GitHub.
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

Example:

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

All APIs use the query parameter:

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
🧠 API Routing

Routing is handled inside:

Code.gs

Using:

function doGet(e) {
  const action = e.parameter.action;
}

If action is invalid:

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

✅ The Web App URL remains the same
❌ But version must be updated

🔒 Deployment Settings

Use:

Execute as: Me

Who has access: Anyone

This allows public frontend access.

🏗 Current System Status

✅ Stops API Working

✅ Routes API Working

✅ Fare API Working

✅ Booking API Working

✅ Razorpay fields integrated

✅ Action-based routing stable

🚧 Next Production Enhancements

Planned improvements:

Seat availability validation

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