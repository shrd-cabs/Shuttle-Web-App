🗄 Backend Documentation (Google Apps Script + Google Sheets)

Backend is optional but recommended for real authentication and database support.

Backend uses:

Google Apps Script (Web App API)

Google Sheets (Database)

📂 Backend Folder Recommendation

To keep the repo clean, store backend code separately:

Shuttle-Web-App/
│
├── backend/
│   ├── Code.gs
│   ├── users.gs
│   ├── sheetHelpers.gs
│   └── utils.gs
│
└── assets/
    ├── js/
    ├── css/
    └── components/


Note:
Apps Script does not directly run from GitHub.
The backend .gs files must be copied into the Apps Script editor.

📊 Google Sheets Database Setup

Create a Google Sheet containing:

Users Sheet (Tab Name: Users)
Column	Name
A	Name
B	Email
C	Phone
D	Password
E	Role
F	Status
G	CreatedAt

Apps Script reads and writes data using these columns.

🔗 Apps Script API Actions

Apps Script uses query parameter action.

Supported actions:

Action	Purpose
validateUser	Validate login credentials
addUser	Register new user
getUsers	Fetch all users

Example request:

https://script.google.com/macros/s/DEPLOYMENT_ID/exec?action=validateUser&email=test@gmail.com&password=1234

🚀 Deployment Notes (Very Important)

Saving Apps Script code does not automatically update the deployed Web App.

To make backend changes live:

Open Apps Script

Click Deploy

Select Manage Deployments

Edit the existing deployment

Click New Version

Deploy again

The Web App URL remains the same if you update the same deployment.

🔒 Apps Script Web App Deployment Settings

While deploying, use:

Execute as: Me

Who has access: Anyone

This allows the frontend to call the backend publicly.

🚧 Future Enhancements

Planned improvements include:

persistent booking storage in Google Sheets

booking history in My Trips tab

seat availability tracking

cancellation linked to stored bookings

admin analytics dashboard

route and pricing imported from Sheets

email confirmation system

payment gateway integration

👨‍💻 Maintainers

This project is maintained by the SHRD development team.

Repository:

https://github.com/shrd-cabs/Shuttle-Web-App

📜 License

This project is private and intended for internal SHRD use only.