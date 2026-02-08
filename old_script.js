// =========================
// CONFIG
// =========================
const API_URL = 'https://script.google.com/macros/s/AKfycbwmWLZ-rbJvMlwqCahM8NM9HrRzFMQU5P3lw9xyN9dQNtCoKHOZZ1IgXpWEvd4JS__x/exec';

let currentUser = null;
let selectedSeats = [];
let routesCache = [];
let tripsCache = [];
let stopsCache = [];

// =========================
// AUTH: LOGIN / SIGNUP / LOGOUT
// =========================

const login = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'login',
                email,
                password
            })
        });
        const data = await res.json();
        if (!data.success) {
            alert(data.error || 'Invalid email or password. Try signing up if you don\'t have an account.');
            return;
        }

        currentUser = data.user; // {user_id, name, email, role, status}
        showMainContent();
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    } catch (e) {
        console.error(e);
        alert('Login error. Please try again.');
    }
};

const signup = async () => {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value.trim();

    if (!name || !email || !phone || !password) {
        alert('Please fill all fields');
        return;
    }

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'signup',
                name,
                email,
                password
            })
        });
        const data = await res.json();
        if (!data.success) {
            alert(data.error || 'Signup failed.');
            return;
        }

        alert('Account created! You can now login.');
        document.getElementById('signupName').value = '';
        document.getElementById('signupEmail').value = '';
        document.getElementById('signupPhone').value = '';
        document.getElementById('signupPassword').value = '';
        toggleSignup();
    } catch (e) {
        console.error(e);
        alert('Signup error. Please try again.');
    }
};

const toggleSignup = () => {
    const form = document.getElementById('signupForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

const logout = () => {
    currentUser = null;
    selectedSeats = [];
    document.getElementById('loginSection').classList.add('active');
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
};

document.getElementById('logoutBtn').addEventListener('click', logout);

// =========================
// MAIN CONTENT INIT
// =========================

const showMainContent = () => {
    document.getElementById('loginSection').classList.remove('active');
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
    loadRoutesAndTrips();
    loadMyTrips();
};

// =========================
// ROUTES / TRIPS / STOPS
// =========================

const loadRoutesAndTrips = async () => {
    try {
        // Get routes
        let res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'getRoutes' })
        });
        let data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load routes');
        routesCache = data.routes;

        const routeSelect = document.getElementById('route');
        routeSelect.innerHTML = '';
        routesCache.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.route_id;
            opt.textContent = r.route_name;
            routeSelect.appendChild(opt);
        });

        if (routesCache.length) {
            await loadTripsForRoute(routesCache[0].route_id);
        }
    } catch (e) {
        console.error(e);
        alert('Failed to load routes.');
    }
};

const loadTripsForRoute = async (route_id) => {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'getTripsForRoute', route_id })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load trips');
        tripsCache = data.trips;

        const timeSelect = document.getElementById('tripTime');
        timeSelect.innerHTML = '';
        tripsCache.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.trip_id;
            opt.textContent = t.start_time; // adjust format if needed
            timeSelect.appendChild(opt);
        });

        await loadStopsForRoute(route_id);

        if (tripsCache.length) {
            await renderBusLayout();
        }
    } catch (e) {
        console.error(e);
        alert('Failed to load trips.');
    }
};

const loadStopsForRoute = async (route_id) => {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'getStopsForRoute', route_id })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load stops');
        stopsCache = data.stops;
    } catch (e) {
        console.error(e);
    }
};

// Update on change
document.getElementById('route').addEventListener('change', async (e) => {
    const route_id = e.target.value;
    await loadTripsForRoute(route_id);
    updateBookingSummary();
});
document.getElementById('tripTime').addEventListener('change', async () => {
    await renderBusLayout();
    updateBookingSummary();
});
document.getElementById('tripDate').addEventListener('change', updateBookingSummary);

// =========================
// BUS LAYOUT & SEATS
// =========================

const renderBusLayout = async () => {
    const busLayout = document.getElementById('busLayout');
    busLayout.innerHTML = '';

    const selectedTripId = document.getElementById('tripTime').value;
    const trip = tripsCache.find(t => String(t.trip_id) === String(selectedTripId));
    if (!trip) return;

    const bus_id = trip.bus_id;

    let seatMap = {};
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'getSeatMap', bus_id })
        });
        const data = await res.json();
        if (data.success) {
            seatMap = data.seatMap || {};
        }
    } catch (e) {
        console.error(e);
    }

    let seatIndex = 0;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 6; col++) {
            if (col === 2 || col === 3) {
                const aisle = document.createElement('div');
                aisle.className = 'seat aisle';
                busLayout.appendChild(aisle);
            } else {
                seatIndex++;
                const seat = document.createElement('div');
                const info = seatMap[seatIndex] || {};
                const status = info.status || 'available';

                seat.className = 'seat ' + status;
                seat.textContent = seatIndex;
                seat.dataset.seatNumber = seatIndex;

                if (status === 'available') {
                    seat.addEventListener('click', () => toggleSeatSelection(seatIndex, seat));
                }

                busLayout.appendChild(seat);
            }
        }
    }
};

const toggleSeatSelection = (seatNumber, element) => {
    if (selectedSeats.includes(seatNumber)) {
        selectedSeats = selectedSeats.filter(s => s !== seatNumber);
        element.classList.remove('selected');
    } else {
        selectedSeats.push(seatNumber);
        element.classList.add('selected');
    }
    updateBookingSummary();
};

const updateBookingSummary = () => {
    document.getElementById('selectedSeatsDisplay').textContent =
        selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None';
    document.getElementById('dateDisplay').textContent =
        document.getElementById('tripDate').value || 'Not selected';
    const selectedTripId = document.getElementById('tripTime').value;
    const trip = tripsCache.find(t => String(t.trip_id) === String(selectedTripId));
    document.getElementById('timeDisplay').textContent =
        trip ? trip.start_time : 'Not selected';
    const route_id = document.getElementById('route').value;
    const route = routesCache.find(r => String(r.route_id) === String(route_id));
    document.getElementById('routeDisplay').textContent =
        route ? route.route_name : 'Not selected';
};

// =========================
// PAYMENT + BOOKING
// =========================

const openPaymentModal = async () => {
    if (!currentUser) {
        showAlert('bookingAlert', 'Please login first', 'error');
        return;
    }
    if (!document.getElementById('tripDate').value) {
        showAlert('bookingAlert', 'Please select a trip date', 'error');
        return;
    }
    if (selectedSeats.length === 0) {
        showAlert('bookingAlert', 'Please select at least one seat', 'error');
        return;
    }

    const route_id = document.getElementById('route').value;
    const tripId = document.getElementById('tripTime').value;
    const trip = tripsCache.find(t => String(t.trip_id) === String(tripId));
    const route = routesCache.find(r => String(r.route_id) === String(route_id));
    if (!trip || !route || !stopsCache.length) {
        showAlert('bookingAlert', 'Route / trip / stops not loaded correctly', 'error');
        return;
    }

    const sortedStops = [...stopsCache].sort((a, b) => Number(a.stop_order) - Number(b.stop_order));
    const fromStop = sortedStops[0];
    const toStop = sortedStops[sortedStops.length - 1];

    let pricePerSeat = 0;
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'getFare',
                route_id: route_id,
                from_stop_order: fromStop.stop_order,
                to_stop_order: toStop.stop_order
            })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Fare lookup failed');
        pricePerSeat = Number(data.fare.price) || 0;
    } catch (e) {
        console.error(e);
        showAlert('bookingAlert', 'Unable to calculate fare', 'error');
        return;
    }

    const totalPrice = pricePerSeat * selectedSeats.length;

    document.getElementById('totalPrice').textContent = totalPrice;
    document.getElementById('paymentRoute').textContent = `Route: ${route.route_name}`;
    document.getElementById('paymentDate').textContent = `Date: ${document.getElementById('tripDate').value}`;
    document.getElementById('paymentTime').textContent = `Time: ${trip.start_time}`;
    document.getElementById('paymentSeats').textContent = `Seats: ${selectedSeats.join(', ')}`;

    document.getElementById('paymentModal').classList.add('show');
};

const closePaymentModal = () => {
    document.getElementById('paymentModal').classList.remove('show');
};

const processPayment = () => {
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    showAlert('bookingAlert', `Processing ${selectedMethod} payment...`, 'success');

    setTimeout(() => {
        completeBooking(selectedMethod);
    }, 1200);
};

const completeBooking = async (paymentMethod) => {
    closePaymentModal();

    try {
        if (!currentUser) throw new Error('Not logged in');

        const tripId = document.getElementById('tripTime').value;
        const trip = tripsCache.find(t => String(t.trip_id) === String(tripId));
        if (!trip) throw new Error('Trip not found');

        const route_id = trip.route_id;

        const sortedStops = [...stopsCache].sort((a, b) => Number(a.stop_order) - Number(b.stop_order));
        const fromStop = sortedStops[0];
        const toStop = sortedStops[sortedStops.length - 1];

        // For now, send first selected seat
        const seat_number = selectedSeats[0];

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'createBooking',
                user_id: currentUser.user_id,
                trip_id: trip.trip_id,
                bus_id: trip.bus_id,
                seat_number,
                board_stop_order: fromStop.stop_order,
                deboard_stop_order: toStop.stop_order,
                ticket_type: 'single',
                payment_method: paymentMethod
            })
        });
        const data = await res.json();
        if (!data.success) {
            showAlert('bookingAlert', data.error || 'Booking failed', 'error');
            return;
        }

        showConfirmationModal(data.booking, data.payment.amount);
        selectedSeats = [];
        await renderBusLayout();
        await loadMyTrips();
        resetBooking();
    } catch (e) {
        console.error(e);
        showAlert('bookingAlert', 'Error completing booking', 'error');
    }
};

const resetBooking = () => {
    selectedSeats = [];
    document.querySelectorAll('.seat.selected').forEach(s => s.classList.remove('selected'));
    document.getElementById('tripDate').value = '';
    updateBookingSummary();
};

const showConfirmationModal = (booking, amount) => {
    document.getElementById('confirmBookingId').textContent = booking.booking_id;
    document.getElementById('confirmEmail').textContent = currentUser.email;

    const route = routesCache.find(r => String(r.route_id) === String(booking.route_id));
    const trip = tripsCache.find(t => String(t.trip_id) === String(booking.trip_id));

    document.getElementById('confirmRoute').textContent = route ? route.route_name : '';
    document.getElementById('confirmDate').textContent = document.getElementById('tripDate').value;
    document.getElementById('confirmTime').textContent = trip ? trip.start_time : '';
    document.getElementById('confirmSeats').textContent = booking.seat_number;
    document.getElementById('confirmAmount').textContent = amount;

    document.getElementById('confirmationModal').classList.add('show');
};

const closeConfirmationModal = () => {
    document.getElementById('confirmationModal').classList.remove('show');
};

// =========================
// MY TRIPS & CANCELLATION
// =========================

const loadMyTrips = async () => {
    if (!currentUser) return;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'getUserBookings',
                user_id: currentUser.user_id
            })
        });
        const data = await res.json();
        const tripsList = document.getElementById('myTripsList');

        if (!data.success || !data.bookings.length) {
            tripsList.innerHTML = '<p style="text-align: center; color: #999;">No bookings found. Start by booking a seat!</p>';
            return;
        }

        tripsList.innerHTML = data.bookings.map(booking => `
            <div class="trip-card">
                <div class="trip-info">
                    <h4>Booking ID: ${booking.booking_id}</h4>
                    <p><strong>Route:</strong> ${booking.board_stop_name} → ${booking.deboard_stop_name}</p>
                    <p><strong>Seat:</strong> ${booking.seat_number}</p>
                    <p><strong>Fare:</strong> ₹${booking.fare}</p>
                    <p><strong>Booked on:</strong> ${booking.booking_time}</p>
                </div>
                <div class="trip-actions">
                    <button class="btn-cancel" onclick="cancelBookingById('${booking.booking_id}')">Cancel Trip</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
    }
};

const cancelBookingById = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    if (!currentUser) return;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'cancelBooking',
                booking_id: bookingId,
                user_id: currentUser.user_id
            })
        });
        const data = await res.json();
        if (!data.success) {
            alert(data.error || 'Unable to cancel booking');
            return;
        }
        await loadMyTrips();
        await renderBusLayout();
        alert('Booking cancelled, refund: ₹' + (data.refund_amount || 0));
    } catch (e) {
        console.error(e);
    }
};

const cancelBooking = async () => {
    const bookingId = document.getElementById('cancelBookingId').value.trim();
    if (!bookingId) {
        showAlert('cancelAlert', 'Please enter a booking ID', 'error');
        return;
    }
    if (!currentUser) {
        showAlert('cancelAlert', 'Please login first', 'error');
        return;
    }

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'cancelBooking',
                booking_id: bookingId,
                user_id: currentUser.user_id
            })
        });
        const data = await res.json();
        if (!data.success) {
            showAlert('cancelAlert', data.error || 'Unable to cancel booking', 'error');
            return;
        }
        showAlert('cancelAlert', `Booking ${bookingId} cancelled successfully!`, 'success');
        document.getElementById('cancelBookingId').value = '';
        await loadMyTrips();
        await renderBusLayout();
    } catch (e) {
        console.error(e);
        showAlert('cancelAlert', 'Error cancelling booking', 'error');
    }
};

const clearCancelForm = () => {
    document.getElementById('cancelBookingId').value = '';
    const alertEl = document.getElementById('cancelAlert');
    alertEl.classList.remove('success', 'error');
    alertEl.style.display = 'none';
};

// =========================
// ALERTS & NAV TABS
// =========================

const showAlert = (elementId, message, type) => {
    const alert = document.getElementById(elementId);
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';
};

document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;

        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

        e.target.classList.add('active');
        document.getElementById(`${tabName}Section`).classList.add('active');

        if (tabName === 'mytrips') {
            loadMyTrips();
        }
    });
});

// =========================
// INITIAL SETUP ON LOAD
// =========================

window.addEventListener('load', () => {
    // On load, show login section; backend connection is through API_URL.
});
