/***********************
 * CONFIG
 ***********************/
const SHEETS = {
  USERS:        'users',
  ROUTES:       'Routes',
  BUSES:        'Buses',
  TRIPS:        'Trips',
  STOPS:        'Stops',
  SEATS:        'Seats',
  BOOKINGS:     'Bookings',
  PAYMENTS:     'Payments',
  FARE_MATRIX:  'Fare_matrix',
  PASS_TYPES:   'Pass_Types',
  USER_PASSES:  'User_Passes',
  DRIVERS:      'Driver'
};

/***********************
 * WEB APP ENTRY POINTS
 ***********************/
function doGet(e) {
  return HtmlService
    .createHtmlOutput('SHRD Shuttle Booking Apps Script backend running.');
}

function doPost(e) {
  try {
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = body.action;

    let result;
    switch (action) {
      case 'signup':            result = apiSignup(body); break;
      case 'login':             result = apiLogin(body); break;

      case 'getRoutes':         result = apiGetRoutes(); break;
      case 'getTripsForRoute':  result = apiGetTripsForRoute(body); break;
      case 'getStopsForRoute':  result = apiGetStopsForRoute(body); break;
      case 'getSeatMap':        result = apiGetSeatMap(body); break;

      case 'getFare':           result = apiGetFare(body); break;
      case 'createBooking':     result = apiCreateBooking(body); break;
      case 'cancelBooking':     result = apiCancelBooking(body); break;
      case 'getUserBookings':   result = apiGetUserBookings(body); break;

      case 'getPassTypes':      result = apiGetPassTypes(); break;
      case 'getActivePasses':   result = apiGetActivePasses(body); break;
      case 'purchasePass':      result = apiPurchasePass(body); break;

      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: err && err.message ? err.message : String(err)
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/***********************
 * COMMON SHEET HELPERS
 ***********************/
function getSheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Sheet not found: ' + name);
  return sh;
}

function getAllRows_(sheet) {
  const rng = sheet.getDataRange();
  const values = rng.getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function appendRow_(sheet, obj) {
  const rng = sheet.getDataRange();
  const values = rng.getValues();
  const headers = values[0];
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
}

function simpleHash_(str) {
  let hash = 0;
  if (!str) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

/***********************
 * USERS
 * users: user_id, name, email, password, role, status, created_at
 ***********************/
function apiSignup(body) {
  const { name, email, password } = body;
  if (!name || !email || !password) {
    return { success: false, error: 'Missing name / email / password' };
  }

  const sh = getSheet_(SHEETS.USERS);
  const data = getAllRows_(sh);

  const existing = data.find(r => String(r.email).trim().toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return { success: false, error: 'Email already registered' };
  }

  const user_id = 'U' + new Date().getTime();
  const now = new Date();

  appendRow_(sh, {
    user_id,
    name,
    email,
    password: simpleHash_(password),
    role: 'user',
    status: 'active',
    created_at: now
  });

  return { success: true, user: { user_id, name, email, role: 'user', status: 'active' } };
}

function apiLogin(body) {
  const { email, password } = body;
  if (!email || !password) {
    return { success: false, error: 'Missing email / password' };
  }

  const sh = getSheet_(SHEETS.USERS);
  const data = getAllRows_(sh);
  const hash = simpleHash_(password);

  const user = data.find(r =>
    String(r.email).trim().toLowerCase() === email.trim().toLowerCase() &&
    String(r.password) === hash &&
    String(r.status).toLowerCase() !== 'blocked'
  );

  if (!user) return { success: false, error: 'Invalid credentials' };

  return {
    success: true,
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    }
  };
}

/***********************
 * ROUTES / TRIPS / STOPS
 * Routes: route_id, route_name, status
 * Trips:  trip_id, route_id, bus_id, start_time, status
 * Stops:  stop_id, route_id, stop_name, stop_order, arrival_time, departure_time
 ***********************/
function apiGetRoutes() {
  const sh = getSheet_(SHEETS.ROUTES);
  const data = getAllRows_(sh);
  const routes = data
    .filter(r => String(r.status).toLowerCase() !== 'inactive')
    .map(r => ({
      route_id: r.route_id,
      route_name: r.route_name,
      status: r.status
    }));
  return { success: true, routes };
}

function apiGetTripsForRoute(body) {
  const { route_id } = body;
  if (!route_id) return { success: false, error: 'Missing route_id' };

  const sh = getSheet_(SHEETS.TRIPS);
  const data = getAllRows_(sh);
  const trips = data
    .filter(r => String(r.route_id) === String(route_id) &&
                 String(r.status).toLowerCase() !== 'cancelled')
    .map(r => ({
      trip_id: r.trip_id,
      route_id: r.route_id,
      bus_id: r.bus_id,
      start_time: r.start_time,
      status: r.status
    }));

  return { success: true, trips };
}

function apiGetStopsForRoute(body) {
  const { route_id } = body;
  if (!route_id) return { success: false, error: 'Missing route_id' };

  const sh = getSheet_(SHEETS.STOPS);
  const data = getAllRows_(sh);
  const stops = data
    .filter(r => String(r.route_id) === String(route_id))
    .sort((a, b) => Number(a.stop_order) - Number(b.stop_order))
    .map(r => ({
      stop_id: r.stop_id,
      route_id: r.route_id,
      stop_name: r.stop_name,
      stop_order: r.stop_order,
      arrival_time: r.arrival_time,
      departure_time: r.departure_time
    }));

  return { success: true, stops };
}

/***********************
 * SEATS
 * Seats: bus_id, seat_number, status, occupied_till_stop, last_updated
 ***********************/
function apiGetSeatMap(body) {
  const { bus_id } = body;
  if (!bus_id) return { success: false, error: 'Missing bus_id' };

  const shSeats = getSheet_(SHEETS.SEATS);
  const seatsData = getAllRows_(shSeats).filter(r => String(r.bus_id) === String(bus_id));

  const seatMap = {};
  seatsData.forEach(r => {
    const sn = r.seat_number;
    seatMap[sn] = {
      status: r.status || 'available',
      occupied_till_stop: r.occupied_till_stop || '',
      last_updated: r.last_updated || ''
    };
  });

  return { success: true, seatMap };
}

/***********************
 * FARE
 * Fare_matrix: fare_id, route_id, from_stop_order, to_stop_order,
 *              from_stop_name, to_stop_name, price, currency
 ***********************/
function apiGetFare(body) {
  const { route_id, from_stop_order, to_stop_order } = body;
  if (!route_id || from_stop_order == null || to_stop_order == null) {
    return { success: false, error: 'Missing route_id / from_stop_order / to_stop_order' };
  }

  const sh = getSheet_(SHEETS.FARE_MATRIX);
  const data = getAllRows_(sh);

  const record = data.find(r =>
    String(r.route_id) === String(route_id) &&
    Number(r.from_stop_order) === Number(from_stop_order) &&
    Number(r.to_stop_order) === Number(to_stop_order)
  );

  if (!record) {
    return { success: false, error: 'Fare not defined for this segment' };
  }

  return {
    success: true,
    fare: {
      price: Number(record.price) || 0,
      currency: record.currency || 'INR',
      from_stop_name: record.from_stop_name,
      to_stop_name: record.to_stop_name
    }
  };
}

/***********************
 * PASSES
 * Pass_Types:  pass_type_id, name, duration_days, multiplier, discount_pct
 * User_Passes: user_id, pass_type_id, route_id,
 *              from_stop_order, from_stop_name,
 *              to_stop_order, to_stop_name,
 *              base_fare, final_price,
 *              start_date, end_date, status, created_at
 ***********************/
function apiGetPassTypes() {
  const sh = getSheet_(SHEETS.PASS_TYPES);
  const data = getAllRows_(sh);
  const types = data.map(r => ({
    pass_type_id: r.pass_type_id,
    name: r.name,
    duration_days: Number(r.duration_days) || 0,
    multiplier: Number(r.multiplier) || 0,
    discount_pct: Number(r.discount_pct) || 0
  }));
  return { success: true, passTypes: types };
}

function apiGetActivePasses(body) {
  const { user_id, route_id } = body;
  if (!user_id) return { success: false, error: 'Missing user_id' };

  const sh = getSheet_(SHEETS.USER_PASSES);
  const data = getAllRows_(sh);

  const today = new Date();
  const passes = data.filter(r => {
    if (String(r.user_id) !== String(user_id)) return false;
    if (route_id && String(r.route_id) !== String(route_id)) return false;
    if (String(r.status).toLowerCase() !== 'active') return false;

    const start = r.start_date instanceof Date ? r.start_date : new Date(r.start_date);
    const end = r.end_date   instanceof Date ? r.end_date   : new Date(r.end_date);
    return today >= start && today <= end;
  });

  return { success: true, passes };
}

function apiPurchasePass(body) {
  const {
    user_id,
    pass_type_id,
    route_id,
    from_stop_order,
    to_stop_order
  } = body;

  if (!user_id || !pass_type_id || !route_id ||
      from_stop_order == null || to_stop_order == null) {
    return { success: false, error: 'Missing parameters for pass purchase' };
  }

  const shPassTypes = getSheet_(SHEETS.PASS_TYPES);
  const passTypes = getAllRows_(shPassTypes);
  const pt = passTypes.find(r => String(r.pass_type_id) === String(pass_type_id));
  if (!pt) return { success: false, error: 'Pass type not found' };

  const fareRes = apiGetFare({
    route_id,
    from_stop_order,
    to_stop_order
  });
  if (!fareRes.success) return fareRes;

  const baseOneTrip = fareRes.fare.price;
  const multiplier = Number(pt.multiplier) || 0;
  const discountPct = Number(pt.discount_pct) || 0;

  const base_fare = baseOneTrip * multiplier;
  const final_price = base_fare * (1 - discountPct / 100);

  const duration_days = Number(pt.duration_days) || 30;
  const start_date = new Date();
  const end_date = new Date(start_date.getTime());
  end_date.setDate(end_date.getDate() + duration_days - 1);

  const shUserPasses = getSheet_(SHEETS.USER_PASSES);
  appendRow_(shUserPasses, {
    user_id,
    pass_type_id,
    route_id,
    from_stop_order,
    from_stop_name: fareRes.fare.from_stop_name,
    to_stop_order,
    to_stop_name: fareRes.fare.to_stop_name,
    base_fare,
    final_price,
    start_date,
    end_date,
    status: 'active',
    created_at: new Date()
  });

  return {
    success: true,
    userPass: {
      user_id,
      pass_type_id,
      route_id,
      from_stop_order,
      to_stop_order,
      base_fare,
      final_price,
      start_date,
      end_date,
      status: 'active'
    }
  };
}

/***********************
 * BOOKINGS & PAYMENTS
 * Bookings:
 *  booking_id, user_id, trip_id, bus_id, seat_number,
 *  board_stop_order, board_stop_name,
 *  deboard_stop_order, deboard_stop_name,
 *  fare, ticket_type, user_pass_id,
 *  driver_name, driver_mobile, booking_time
 *
 * Payments:
 *  payment_id, order_id, user_id, booking_id,
 *  amount, status, method, created_at, status, cancel_time
 *
 * Driver:
 *  driver_id, name, mobile, bus_id, status
 ***********************/
function apiCreateBooking(body) {
  const {
    user_id,
    trip_id,
    bus_id,
    seat_number,
    board_stop_order,
    deboard_stop_order,
    ticket_type,
    user_pass_id,
    payment_method
  } = body;

  if (!user_id || !trip_id || !bus_id || !seat_number ||
      board_stop_order == null || deboard_stop_order == null) {
    return { success: false, error: 'Missing booking details' };
  }

  const shTrips = getSheet_(SHEETS.TRIPS);
  const trips = getAllRows_(shTrips);
  const trip = trips.find(r => String(r.trip_id) === String(trip_id));
  if (!trip) return { success: false, error: 'Trip not found' };

  const route_id = trip.route_id;

  const fareRes = apiGetFare({
    route_id,
    from_stop_order: board_stop_order,
    to_stop_order: deboard_stop_order
  });
  if (!fareRes.success) return fareRes;

  let fare = fareRes.fare.price;

  let effective_user_pass_id = '';
  if (ticket_type === 'pass') {
    const passesRes = apiGetActivePasses({ user_id, route_id });
    if (!passesRes.success || !passesRes.passes.length) {
      return { success: false, error: 'No active pass available for this route' };
    }
    const pass = passesRes.passes[0];
    effective_user_pass_id = pass.pass_type_id;
    fare = 0;
  }

  const shSeats = getSheet_(SHEETS.SEATS);
  const seatsData = getAllRows_(shSeats).filter(r => String(r.bus_id) === String(bus_id));
  const seatRow = seatsData.find(r => String(r.seat_number) === String(seat_number));

  const nowStr = new Date();

  if (seatRow && String(seatRow.status).toLowerCase() === 'booked') {
    return { success: false, error: 'Seat already booked' };
  }

  if (seatRow) {
    const sh = getSheet_(SHEETS.SEATS);
    const values = sh.getDataRange().getValues();
    const headers = values[0];
    const idxBusId   = headers.indexOf('bus_id');
    const idxSeatNo  = headers.indexOf('seat_number');
    const idxStatus  = headers.indexOf('status');
    const idxOccTill = headers.indexOf('occupied_till_stop');
    const idxUpdated = headers.indexOf('last_updated');

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][idxBusId]) === String(bus_id) &&
          String(values[i][idxSeatNo]) === String(seat_number)) {
        values[i][idxStatus]  = 'booked';
        values[i][idxOccTill] = deboard_stop_order;
        values[i][idxUpdated] = nowStr;
        sh.getRange(i + 1, 1, 1, headers.length).setValues([values[i]]);
        break;
      }
    }
  } else {
    appendRow_(shSeats, {
      bus_id,
      seat_number,
      status: 'booked',
      occupied_till_stop: deboard_stop_order,
      last_updated: nowStr
    });
  }

  const shDriver = getSheet_(SHEETS.DRIVERS);
  const driverData = getAllRows_(shDriver);
  const driver = driverData.find(r =>
    String(r.bus_id) === String(bus_id) &&
    String(r.status).toLowerCase() !== 'inactive'
  );

  const driver_name = driver ? driver.name : '';
  const driver_mobile = driver ? driver.mobile : '';

  const shBookings = getSheet_(SHEETS.BOOKINGS);
  const booking_id = 'BK' + new Date().getTime();
  const boardName = fareRes.fare.from_stop_name;
  const deboardName = fareRes.fare.to_stop_name;

  appendRow_(shBookings, {
    booking_id,
    user_id,
    trip_id,
    bus_id,
    seat_number,
    board_stop_order,
    board_stop_name: boardName,
    deboard_stop_order,
    deboard_stop_name: deboardName,
    fare,
    ticket_type: ticket_type || 'single',
    user_pass_id: effective_user_pass_id || user_pass_id || '',
    driver_name,
    driver_mobile,
    booking_time: new Date()
  });

  const shPayments = getSheet_(SHEETS.PAYMENTS);
  const payment_id = 'PM' + new Date().getTime();
  const order_id = 'ORD' + new Date().getTime();

  appendRow_(shPayments, {
    payment_id,
    order_id,
    user_id,
    booking_id,
    amount: fare,
    status: 'success',
    method: payment_method || 'UPI',
    created_at: new Date(),
    cancel_time: ''
  });

  return {
    success: true,
    booking: {
      booking_id,
      user_id,
      trip_id,
      bus_id,
      seat_number,
      board_stop_order,
      board_stop_name: boardName,
      deboard_stop_order,
      deboard_stop_name: deboardName,
      fare,
      ticket_type: ticket_type || 'single',
      user_pass_id: effective_user_pass_id || user_pass_id || '',
      driver_name,
      driver_mobile
    },
    payment: {
      payment_id,
      order_id,
      amount: fare,
      status: 'success',
      method: payment_method || 'UPI'
    }
  };
}

function apiCancelBooking(body) {
  const { booking_id, user_id } = body;
  if (!booking_id || !user_id) return { success: false, error: 'Missing booking_id / user_id' };

  const shBookings = getSheet_(SHEETS.BOOKINGS);
  const values = shBookings.getDataRange().getValues();
  if (values.length < 2) return { success: false, error: 'No bookings' };

  const headers = values[0];
  const idxB_BId  = headers.indexOf('booking_id');
  const idxB_UId  = headers.indexOf('user_id');
  const idxB_Bus  = headers.indexOf('bus_id');
  const idxB_Seat = headers.indexOf('seat_number');
  const idxB_Fare = headers.indexOf('fare');

  let rowIdx = -1;
  let bus_id = '';
  let seat_number = '';
  let fare = 0;

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idxB_BId]) === String(booking_id) &&
        String(values[i][idxB_UId]) === String(user_id)) {
      rowIdx      = i + 1;
      bus_id      = values[i][idxB_Bus];
      seat_number = values[i][idxB_Seat];
      fare        = Number(values[i][idxB_Fare]) || 0;
      break;
    }
  }

  if (rowIdx === -1) return { success: false, error: 'Booking not found' };

  // Delete booking row
  shBookings.deleteRow(rowIdx);

  // Mark seat available
  const shSeats = getSheet_(SHEETS.SEATS);
  const sVals = shSeats.getDataRange().getValues();
  const sHeaders = sVals[0];
  const idxS_Bus    = sHeaders.indexOf('bus_id');
  const idxS_Seat   = sHeaders.indexOf('seat_number');
  const idxS_Status = sHeaders.indexOf('status');
  const idxS_Occ    = sHeaders.indexOf('occupied_till_stop');
  const idxS_Upd    = sHeaders.indexOf('last_updated');

  for (let i = 1; i < sVals.length; i++) {
    if (String(sVals[i][idxS_Bus]) === String(bus_id) &&
        String(sVals[i][idxS_Seat]) === String(seat_number)) {
      sVals[i][idxS_Status] = 'available';
      sVals[i][idxS_Occ]    = '';
      sVals[i][idxS_Upd]    = new Date();
      shSeats.getRange(i + 1, 1, 1, sHeaders.length).setValues([sVals[i]]);
      break;
    }
  }

  // Update payment status
  const shPay = getSheet_(SHEETS.PAYMENTS);
  const pVals = shPay.getDataRange().getValues();
  const pHeaders = pVals[0];
  const idxP_BId   = pHeaders.indexOf('booking_id');
  const idxPStatus = pHeaders.indexOf('status');
  const idxPCancel = pHeaders.indexOf('cancel_time');

  for (let i = 1; i < pVals.length; i++) {
    if (String(pVals[i][idxP_BId]) === String(booking_id)) {
      pVals[i][idxPStatus] = 'refunded';
      pVals[i][idxPCancel] = new Date();
      shPay.getRange(i + 1, 1, 1, pHeaders.length).setValues([pVals[i]]);
      break;
    }
  }

  return { success: true, message: 'Booking cancelled and seat released', refund_amount: fare };
}

function apiGetUserBookings(body) {
  const { user_id } = body;
  if (!user_id) return { success: false, error: 'Missing user_id' };

  const sh = getSheet_(SHEETS.BOOKINGS);
  const data = getAllRows_(sh);
  const bookings = data.filter(r => String(r.user_id) === String(user_id));

  return { success: true, bookings };
}
function diagnose() {
  try {
    const ss = SpreadsheetApp.getActive();
    console.log('1. Spreadsheet found:', ss ? ss.getName() : 'NULL ❌');
    
    const sh = ss.getSheetByName('Users');
    console.log('2. Users sheet found:', sh ? sh.getName() : 'NULL ❌');
    
    const data = sh.getDataRange().getValues();
    console.log('3. Users data rows:', data.length);
    
    if (data.length > 0) {
      console.log('4. Headers:', data[0]);
    }
    
    return 'Check console (View → Logs)';
  } catch (e) {
    console.log('❌ ERROR:', e.toString());
  }
}

