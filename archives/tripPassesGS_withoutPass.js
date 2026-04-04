// ===============================================================
// tripPasses.gs
// ---------------------------------------------------------------
// PURPOSE
// ---------------------------------------------------------------
// Handles Travel Pass APIs using ONLY 3 sheets:
//
// 1. Pass_Types
// 2. User_Passes
// 3. Pass_usage_logs
//
// API FUNCTIONS
// ---------------------------------------------------------------
// 1. getPassTypes
// 2. getMyPasses
// 3. getPassUsageHistory
// 4. getPassDetails
// 5. buyTripPass
//
// NOTES
// ---------------------------------------------------------------
// ✅ Uses existing sheetHelpers.gs pattern
// ✅ Uses existing jsonResponse(...)
// ✅ Does NOT use Pass_Transactions sheet
// ✅ Safe and additive
// ===============================================================


// ===============================================================
// SHEET HELPERS
// ---------------------------------------------------------------
// Uses your existing getSheetOrThrow(sheetName)
// ===============================================================
function getPassTypesSheet() {
  return getSheetOrThrow("Pass_Types");
}

function getUserPassesSheet() {
  return getSheetOrThrow("User_Passes");
}

function getPassUsageLogSheet() {
  return getSheetOrThrow("Pass_usage_logs");
}


// ===============================================================
// COMMON HELPERS
// ===============================================================

/**
 * Convert sheet rows to array of objects
 * First row is treated as header row
 */
function getSheetDataAsObjects_(sheet) {
  const values = sheet.getDataRange().getValues();

  if (!values || values.length < 2) {
    return [];
  }

  const headers = values[0];

  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}


/**
 * Append row using header order
 */
function appendRowByHeaders_(sheet, rowObj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(header => rowObj[header] !== undefined ? rowObj[header] : "");
  sheet.appendRow(row);
}


/**
 * Normalize email safely
 */
function normalizeEmail_(email) {
  return String(email || "").trim().toLowerCase();
}


/**
 * Safe number conversion
 */
function toNumber_(value) {
  return Number(value || 0);
}


/**
 * Format date only
 */
function formatDateOnly_(date) {
  return Utilities.formatDate(
    new Date(date),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );
}


/**
 * Format datetime
 */
function formatDateTime_(date) {
  return Utilities.formatDate(
    new Date(date),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss"
  );
}


/**
 * Generate unique ID
 */
function generateId_(prefix) {
  return prefix + new Date().getTime();
}


/**
 * Sort rows by field descending
 */
function sortByDateDesc_(rows, fieldName) {
  return rows.sort((a, b) => {
    const aTime = new Date(a[fieldName] || 0).getTime();
    const bTime = new Date(b[fieldName] || 0).getTime();
    return bTime - aTime;
  });
}


/**
 * Check if a user pass row is active
 */
function isActivePassRow_(row) {
  const status = String(row.status || "").trim().toUpperCase();
  const paymentStatus = String(row.payment_status || "").trim().toUpperCase();
  const expiryDate = row.expiry_date ? new Date(row.expiry_date) : null;
  const today = new Date(formatDateOnly_(new Date()));

  return (
    status === "ACTIVE" &&
    paymentStatus === "PAID" &&
    expiryDate &&
    expiryDate >= today
  );
}


/**
 * Get active pass for a user
 * Internal helper for future booking integration
 */
function getActivePassForUser_(userEmail) {
  const rows = getSheetDataAsObjects_(getUserPassesSheet());

  const activePasses = rows.filter(row =>
    normalizeEmail_(row.user_email) === normalizeEmail_(userEmail) &&
    isActivePassRow_(row)
  );

  if (!activePasses.length) {
    return null;
  }

  sortByDateDesc_(activePasses, "created_at");
  return activePasses[0];
}


/**
 * Get pass type master row by ID
 */
function getPassTypeById_(passTypeId) {
  const rows = getSheetDataAsObjects_(getPassTypesSheet());

  return rows.find(row =>
    String(row.pass_type_id || "").trim() === String(passTypeId || "").trim()
  ) || null;
}


/**
 * Count usage logs for a specific user pass
 */
function countUsageForPass_(userPassId) {
  const rows = getSheetDataAsObjects_(getPassUsageLogSheet());

  return rows.filter(row =>
    String(row.user_pass_id || "").trim() === String(userPassId || "").trim()
  ).length;
}


/**
 * Get latest usage timestamp for a pass
 */
function getLastUsedAtForPass_(userPassId) {
  const rows = getSheetDataAsObjects_(getPassUsageLogSheet())
    .filter(row => String(row.user_pass_id || "").trim() === String(userPassId || "").trim());

  if (!rows.length) return "";

  sortByDateDesc_(rows, "used_at");
  return rows[0].used_at || "";
}


/**
 * Merge pass type details into user pass row for frontend detail view
 */
function enrichUserPassWithTypeDetails_(userPassRow) {
  const passType = getPassTypeById_(userPassRow.pass_type_id);

  return {
    ...userPassRow,
    pass_code: passType ? (passType.pass_code || "") : "",
    description: passType ? (passType.description || "") : "",
    max_discount_amount: passType ? (passType.max_discount_amount || "") : "",
    min_fare_amount: passType ? (passType.min_fare_amount || "") : "",
    applicable_routes: passType ? (passType.applicable_routes || "") : "",
    max_usage_per_day: passType ? (passType.max_usage_per_day || "") : "",
    max_usage_total: passType ? (passType.max_usage_total || "") : ""
  };
}


// ===============================================================
// 1) GET PASS TYPES
// ---------------------------------------------------------------
// ROUTER:
// case "getPassTypes": return getPassTypes();
// ===============================================================
function getPassTypes() {
  try {
    Logger.log("🎫 getPassTypes() called");

    const rows = getSheetDataAsObjects_(getPassTypesSheet());

    const passTypes = rows.filter(row =>
      String(row.active || "").trim().toUpperCase() === "YES"
    );

    Logger.log("✅ Active pass types found: " + passTypes.length);

    return jsonResponse({
      success: true,
      passTypes: passTypes
    });

  } catch (error) {
    Logger.log("❌ getPassTypes error: " + error);

    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}


// ===============================================================
// 2) GET MY PASSES
// ---------------------------------------------------------------
// ROUTER:
// case "getMyPasses": return getMyPasses(e.parameter);
// ===============================================================
function getMyPasses(params) {
  try {
    Logger.log("🎟️ getMyPasses() called");

    const userEmail = normalizeEmail_(params.user_email);

    if (!userEmail) {
      throw new Error("user_email is required");
    }

    let myPasses = getSheetDataAsObjects_(getUserPassesSheet())
      .filter(row => normalizeEmail_(row.user_email) === userEmail)
      .map(row => {
        const enriched = enrichUserPassWithTypeDetails_(row);

        // Sync usage_count / last_used_at from logs for better accuracy
        enriched.usage_count = countUsageForPass_(row.user_pass_id);
        enriched.last_used_at = getLastUsedAtForPass_(row.user_pass_id) || row.last_used_at || "";

        return enriched;
      });

    sortByDateDesc_(myPasses, "created_at");

    Logger.log("✅ My passes count for " + userEmail + ": " + myPasses.length);

    return jsonResponse({
      success: true,
      myPasses: myPasses
    });

  } catch (error) {
    Logger.log("❌ getMyPasses error: " + error);

    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}


// ===============================================================
// 3) GET PASS USAGE HISTORY
// ---------------------------------------------------------------
// ROUTER:
// case "getPassUsageHistory": return getPassUsageHistory(e.parameter);
// ===============================================================
function getPassUsageHistory(params) {
  try {
    Logger.log("🧾 getPassUsageHistory() called");

    const userEmail = normalizeEmail_(params.user_email);

    if (!userEmail) {
      throw new Error("user_email is required");
    }

    const usageHistory = getSheetDataAsObjects_(getPassUsageLogSheet())
      .filter(row => normalizeEmail_(row.user_email) === userEmail);

    sortByDateDesc_(usageHistory, "used_at");

    Logger.log("✅ Usage history count for " + userEmail + ": " + usageHistory.length);

    return jsonResponse({
      success: true,
      usageHistory: usageHistory
    });

  } catch (error) {
    Logger.log("❌ getPassUsageHistory error: " + error);

    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}


// ===============================================================
// 4) GET PASS DETAILS
// ---------------------------------------------------------------
// ROUTER:
// case "getPassDetails": return getPassDetails(e.parameter);
// ===============================================================
function getPassDetails(params) {
  try {
    Logger.log("🔍 getPassDetails() called");

    const userPassId = String(params.user_pass_id || "").trim();
    const userEmail = normalizeEmail_(params.user_email);

    if (!userPassId) {
      throw new Error("user_pass_id is required");
    }

    if (!userEmail) {
      throw new Error("user_email is required");
    }

    const userPassRows = getSheetDataAsObjects_(getUserPassesSheet());
    const usageRows = getSheetDataAsObjects_(getPassUsageLogSheet());

    const foundPass = userPassRows.find(row =>
      String(row.user_pass_id || "").trim() === userPassId &&
      normalizeEmail_(row.user_email) === userEmail
    );

    if (!foundPass) {
      throw new Error("Pass not found");
    }

    const pass = enrichUserPassWithTypeDetails_(foundPass);
    pass.usage_count = countUsageForPass_(foundPass.user_pass_id);
    pass.last_used_at = getLastUsedAtForPass_(foundPass.user_pass_id) || foundPass.last_used_at || "";

    const usageHistory = usageRows.filter(row =>
      String(row.user_pass_id || "").trim() === userPassId &&
      normalizeEmail_(row.user_email) === userEmail
    );

    sortByDateDesc_(usageHistory, "used_at");

    Logger.log("✅ Pass details loaded for " + userPassId);

    return jsonResponse({
      success: true,
      pass: pass,
      usageHistory: usageHistory
    });

  } catch (error) {
    Logger.log("❌ getPassDetails error: " + error);

    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}


// ===============================================================
// 5) BUY TRIP PASS
// ---------------------------------------------------------------
// ROUTER:
// case "buyTripPass": return buyTripPass(e.parameter);
//
// CURRENT VERSION
// ---------------------------------------------------------------
// - No separate transactions sheet
// - Purchase info stored in User_Passes only
// - Prevents second active pass
// - Stores snapshot fields from Pass_Types into User_Passes
//
// LATER
// ---------------------------------------------------------------
// You can connect Razorpay verification later before marking PAID.
// ===============================================================
function buyTripPass(params) {
  try {
    Logger.log("🛒 buyTripPass() called");

    const passTypeId = String(params.pass_type_id || "").trim();
    const userEmail = normalizeEmail_(params.user_email);

    if (!passTypeId) {
      throw new Error("pass_type_id is required");
    }

    if (!userEmail) {
      throw new Error("user_email is required");
    }

    const passTypes = getSheetDataAsObjects_(getPassTypesSheet());
    const userPassesSheet = getUserPassesSheet();

    // -----------------------------------------------------------
    // Find selected pass
    // -----------------------------------------------------------
    const selectedPass = passTypes.find(row =>
      String(row.pass_type_id || "").trim() === passTypeId &&
      String(row.active || "").trim().toUpperCase() === "YES"
    );

    if (!selectedPass) {
      throw new Error("Selected pass not found or inactive");
    }

    Logger.log("✅ Selected pass: " + selectedPass.pass_name);

    // -----------------------------------------------------------
    // Check active pass already exists
    // -----------------------------------------------------------
    const existingActivePass = getActivePassForUser_(userEmail);

    if (existingActivePass) {
      throw new Error("You already have an active pass");
    }

    Logger.log("✅ No active pass exists for user");

    const now = new Date();
    const userPassId = generateId_("UP");

    const purchaseDate = formatDateOnly_(now);
    const startDate = formatDateOnly_(now);

    const expiryDateObj = new Date(now);
    expiryDateObj.setDate(
      expiryDateObj.getDate() + toNumber_(selectedPass.validity_days) - 1
    );
    const expiryDate = formatDateOnly_(expiryDateObj);

    const newUserPassRow = {
      user_pass_id: userPassId,
      user_name: "",
      user_email: userEmail,
      user_phone: "",
      pass_type_id: selectedPass.pass_type_id || "",
      pass_name: selectedPass.pass_name || "",
      pass_price: toNumber_(selectedPass.pass_price),
      discount_type: selectedPass.discount_type || "",
      discount_value: toNumber_(selectedPass.discount_value),
      purchase_date: purchaseDate,
      start_date: startDate,
      expiry_date: expiryDate,
      payment_status: "PAID",
      payment_type: "RAZORPAY",
      purchase_amount: toNumber_(selectedPass.pass_price),
      razorpay_order_id: "",
      razorpay_payment_id: "",
      status: "ACTIVE",
      usage_count: 0,
      last_used_at: "",
      created_at: formatDateTime_(now),
      updated_at: formatDateTime_(now)
    };

    appendRowByHeaders_(userPassesSheet, newUserPassRow);

    Logger.log("✅ User pass created: " + userPassId);

    return jsonResponse({
      success: true,
      message: "Travel pass purchased successfully",
      user_pass_id: userPassId
    });

  } catch (error) {
    Logger.log("❌ buyTripPass error: " + error);

    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ===============================================================
// GET APPLICABLE PASS FOR BOOKING
// ---------------------------------------------------------------
// INPUT:
// user_email, route_id, total_amount
//
// OUTPUT:
// pass applicability + discount calculation
// ===============================================================
function getApplicablePassForBooking(params) {
  try {
    Logger.log("🎯 getApplicablePassForBooking called");

    const userEmail = String(params.user_email || "").trim().toLowerCase();
    const routeId = String(params.route_id || "").trim();
    const totalAmount = Number(params.total_amount || 0);

    if (!userEmail) throw new Error("user_email required");

    const userPasses = getSheetDataAsObjects_(getUserPassesSheet());
    const passTypes = getSheetDataAsObjects_(getPassTypesSheet());

    const today = new Date();

    // ===========================================================
    // STEP 1: Find active pass
    // ===========================================================
    const activePass = userPasses.find(row => {
      return (
        String(row.user_email).toLowerCase() === userEmail &&
        String(row.status).toUpperCase() === "ACTIVE" &&
        String(row.payment_status).toUpperCase() === "PAID" &&
        new Date(row.expiry_date) >= today
      );
    });

    if (!activePass) {
      return jsonResponse({
        success: true,
        hasPass: false
      });
    }

    // ===========================================================
    // STEP 2: Get pass type details
    // ===========================================================
    const passType = passTypes.find(p =>
      String(p.pass_type_id) === String(activePass.pass_type_id)
    );

    if (!passType) {
      return jsonResponse({
        success: true,
        hasPass: false
      });
    }

    // ===========================================================
    // STEP 3: Check route applicability
    // ===========================================================
    let applicableRoutes = String(passType.applicable_routes || "ALL");

    if (applicableRoutes !== "ALL") {
      const routes = applicableRoutes.split(",");
      if (!routes.includes(routeId)) {
        return jsonResponse({
          success: true,
          hasPass: true,
          applicable: false,
          reason: "Route not applicable"
        });
      }
    }

    // ===========================================================
    // STEP 4: Check min fare
    // ===========================================================
    if (totalAmount < Number(passType.min_fare_amount || 0)) {
      return jsonResponse({
        success: true,
        hasPass: true,
        applicable: false,
        reason: "Minimum fare not met"
      });
    }

    // ===========================================================
    // STEP 5: Check usage limit
    // ===========================================================
    const usageLogs = getSheetDataAsObjects_(getPassUsageLogSheet());

    const totalUsage = usageLogs.filter(log =>
      String(log.user_pass_id) === String(activePass.user_pass_id)
    ).length;

    const maxUsage = Number(passType.max_usage_total || 0);

    if (maxUsage && totalUsage >= maxUsage) {
      return jsonResponse({
        success: true,
        hasPass: true,
        applicable: false,
        reason: "Usage limit exceeded"
      });
    }

    // ===========================================================
    // STEP 6: Calculate discount
    // ===========================================================
    let discountPercent = Number(passType.discount_value || 0);

    let discountAmount = (totalAmount * discountPercent) / 100;

    // apply max cap
    const maxDiscount = Number(passType.max_discount_amount || 0);
    if (maxDiscount && discountAmount > maxDiscount) {
      discountAmount = maxDiscount;
    }

    discountAmount = Math.round(discountAmount);

    const finalAmount = totalAmount - discountAmount;

    // ===========================================================
    // STEP 7: Remaining usage
    // ===========================================================
    const remainingTrips = maxUsage
      ? maxUsage - totalUsage
      : "Unlimited";

    // ===========================================================
    // RESPONSE
    // ===========================================================
    return jsonResponse({
      success: true,
      hasPass: true,
      applicable: true,

      passDetails: {
        user_pass_id: activePass.user_pass_id,
        pass_type_id: activePass.pass_type_id,
        pass_name: activePass.pass_name,

        discount_percent: discountPercent,
        discount_amount: discountAmount,

        original_amount: totalAmount,
        final_amount: finalAmount,

        expiry_date: activePass.expiry_date,
        usage_count: totalUsage,
        remaining_trips: remainingTrips
      }
    });

  } catch (error) {
    Logger.log("❌ getApplicablePassForBooking error: " + error);

    return jsonResponse({
      success: false,
      error: error.toString()
    });
  }
}