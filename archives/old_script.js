// ===============================================================
// SHRD Shuttle - FIXED VERSION (Login + Signup + Auto Login)
//===============================================================

const APP_CONFIG = {
    SCRIPT_ID: 'AKfycbwIZE9kQ5ONEJB8ejsHknLWyllNL2pQAR8Q2lioo7KG8c4D2CW5LCO5JwZOF_rK7Ztq',
    SPREADSHEET_ID: '1AFyDz6GsimoI8CTXJYMI81W8VhyZDtRC6xLvT8_tbJE'
};

let currentUser = null;

// ================= LOGIN =================
window.login = async function() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value.trim();

    if (!email || !password) {
        alert('Enter email and password');
        return;
    }

    try {
        const url = `https://script.google.com/macros/s/${APP_CONFIG.SCRIPT_ID}/exec?action=validateUser&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
        const res = await fetch(url);
        const result = await res.json();

        if (result.user) {
            currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMainContent();
            alert(`Welcome ${result.user.name}!`);
        } else {
            alert('Wrong credentials');
        }
    } catch (e) {
        console.error(e);
        alert('Network / Script error');
    }
};

// ================= LOGOUT =================
window.logout = function() {
    currentUser = null;
    localStorage.removeItem('currentUser');

    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';

    alert('Logged out');
};

// ================= SIGNUP =================
window.signup = async function() {
    const name = document.getElementById('signupName')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim();
    const phone = document.getElementById('signupPhone')?.value.trim();
    const password = document.getElementById('signupPassword')?.value.trim();

    if (!name || !email || !phone || !password) {
        alert('Fill all signup fields');
        return;
    }

    const newUser = { name, email, phone, password, role: 'user' };

    try {
        const params = new URLSearchParams(newUser).toString();
        const url = `https://script.google.com/macros/s/${APP_CONFIG.SCRIPT_ID}/exec?action=addUser&${params}`;

        const res = await fetch(url);
        const result = await res.json();

        if (result.success) {
            currentUser = newUser;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMainContent();
            alert(`Account created! Welcome ${name}`);
            document.getElementById('signupForm').style.display = 'none';
        } else {
            alert('Signup failed: ' + (result.error || 'User exists'));
        }
    } catch (e) {
        console.error(e);
        alert('Signup error – check Apps Script deployment');
    }
};

// ================= UI HELPERS =================
window.toggleSignup = function() {
    const form = document.getElementById('signupForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

window.switchTab = function(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(tabName + 'Section')?.classList.add('active');
};

function showMainContent() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
}

// ================= STUB FUNCTIONS =================
[
 'resetBooking','openPaymentModal','processPayment','closePaymentModal',
 'closeConfirmationModal','cancelBooking','clearCancelForm',
 'syncAllBookingsToSheets','syncAllUsersToSheets','importRoutesFromSheets',
 'generateAnalytics'
].forEach(name => {
    window[name] = function() {
        alert(`${name} – Coming soon!`);
    };
});

// ================= AUTO LOGIN =================
document.addEventListener('DOMContentLoaded', function() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showMainContent();
    }
    console.log('✅ SHRD JS LOADED');
});