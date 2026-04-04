// ===============================================================
// wallet.gs
// ---------------------------------------------------------------
// Handles wallet APIs
//
// FUNCTIONS:
// ---------------------------------------------------------------
// 1. getWalletBalance(params)
// 2. getWalletTransactions(params)
// 3. addWalletTransaction(params)
// 4. verifyWalletPayment(params)
// 5. hasWalletPaymentAlreadyProcessed(referenceId)
// 6. getUserRowByEmail(email)
// 7. generateWalletTransactionId()
// 8. rowToObject(headers, row)
//
// NOTES:
// ---------------------------------------------------------------
// ✅ Only SUCCESS updates actual wallet balance
// ✅ PENDING / FAILED only create ledger rows
// ✅ Signature verification mandatory for wallet top-up
// ✅ Duplicate payment protection added
// ✅ Includes Logger.log for Apps Script debugger
// ===============================================================


// ===============================================================
// GET WALLET BALANCE
// ===============================================================
function getWalletBalance(params) {
  var debug = [];

  try {
    var email = String(params.email || "").trim().toLowerCase();

    debug.push("💰 getWalletBalance() called");
    debug.push("📧 Email: " + email);
    Logger.log(debug.join("\n"));

    if (!email) {
      return jsonResponse({
        success: false,
        error: "Email is required",
        debug: debug
      });
    }

    var userInfo = getUserRowByEmail(email);

    if (!userInfo.found) {
      debug.push("❌ User not found");
      Logger.log(debug.join("\n"));

      return jsonResponse({
        success: false,
        error: "User not found",
        debug: debug
      });
    }

    var balance = Number(userInfo.user.wallet_balance || 0);

    debug.push("✅ Wallet balance fetched: " + balance);
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: true,
      email: email,
      wallet_balance: balance,
      debug: debug
    });

  } catch (error) {
    debug.push("🔥 ERROR: " + error.toString());
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: false,
      error: error.toString(),
      debug: debug
    });
  }
}


// ===============================================================
// GET WALLET TRANSACTIONS
// ===============================================================
function getWalletTransactions(params) {
  var debug = [];

  try {
    var email = String(params.email || "").trim().toLowerCase();
    var limit = Number(params.limit || 10);

    debug.push("📜 getWalletTransactions() called");
    debug.push("📧 Email: " + email);
    debug.push("📌 Limit: " + limit);
    Logger.log(debug.join("\n"));

    if (!email) {
      return jsonResponse({
        success: false,
        error: "Email is required",
        debug: debug
      });
    }

    var sheet = getWalletTransactionsSheet();
    var data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      debug.push("ℹ️ No wallet transactions found");
      Logger.log(debug.join("\n"));

      return jsonResponse({
        success: true,
        transactions: [],
        debug: debug
      });
    }

    var headers = data[0];
    var rows = data.slice(1);
    var emailIndex = headers.indexOf("email_id");

    var filtered = rows
      .filter(function(row) {
        return String(row[emailIndex] || "").trim().toLowerCase() === email;
      })
      .map(function(row) {
        return rowToObject(headers, row);
      })
      .reverse()
      .slice(0, limit);

    debug.push("✅ Transactions fetched: " + filtered.length);
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: true,
      email: email,
      transactions: filtered,
      debug: debug
    });

  } catch (error) {
    debug.push("🔥 ERROR: " + error.toString());
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: false,
      error: error.toString(),
      debug: debug
    });
  }
}


// ===============================================================
// ADD WALLET TRANSACTION
// ---------------------------------------------------------------
// Generic wallet ledger writer
//
// IMPORTANT:
// ---------------------------------------------------------------
// - SUCCESS updates Users.Wallet_balance
// - PENDING / FAILED do NOT update real balance
// ===============================================================
function addWalletTransaction(params) {
  var debug = [];

  try {
    var email = String(params.email || "").trim().toLowerCase();
    var transactionType = String(params.transaction_type || "").trim().toUpperCase();
    var amount = Number(params.amount || 0);
    var status = String(params.status || "SUCCESS").trim().toUpperCase();
    var paymentMode = String(params.payment_mode || "SYSTEM").trim().toUpperCase();
    var referenceId = String(params.reference_id || "").trim();
    var remarks = String(params.remarks || "").trim();
    var createdBy = String(params.created_by || "SYSTEM").trim().toUpperCase();

    debug.push("🚀 addWalletTransaction() called");
    debug.push("📧 Email: " + email);
    debug.push("🔁 Transaction Type: " + transactionType);
    debug.push("💵 Amount: " + amount);
    debug.push("📌 Status: " + status);
    debug.push("💳 Payment Mode: " + paymentMode);
    debug.push("🧾 Reference ID: " + referenceId);
    Logger.log(debug.join("\n"));

    if (!email) {
      return jsonResponse({
        success: false,
        error: "Email is required",
        debug: debug
      });
    }

    if (!transactionType) {
      return jsonResponse({
        success: false,
        error: "transaction_type is required",
        debug: debug
      });
    }

    if (["CREDIT", "DEBIT", "REFUND"].indexOf(transactionType) === -1) {
      return jsonResponse({
        success: false,
        error: "Invalid transaction_type",
        debug: debug
      });
    }

    if (["SUCCESS", "PENDING", "FAILED"].indexOf(status) === -1) {
      return jsonResponse({
        success: false,
        error: "Invalid status",
        debug: debug
      });
    }

    if (!amount || amount <= 0) {
      return jsonResponse({
        success: false,
        error: "Amount must be greater than 0",
        debug: debug
      });
    }

    var userInfo = getUserRowByEmail(email);

    if (!userInfo.found) {
      debug.push("❌ User not found");
      Logger.log(debug.join("\n"));

      return jsonResponse({
        success: false,
        error: "User not found",
        debug: debug
      });
    }

    var userSheet = getUsersSheet();
    var walletSheet = getWalletTransactionsSheet();

    var currentBalance = Number(userInfo.user.wallet_balance || 0);
    var balanceBefore = currentBalance;
    var balanceAfter = currentBalance;

    debug.push("💰 Current Balance: " + currentBalance);

    // ===========================================================
    // Only SUCCESS affects real balance
    // ===========================================================
    if (status === "SUCCESS") {
      if (transactionType === "CREDIT" || transactionType === "REFUND") {
        balanceAfter = currentBalance + amount;
      } else if (transactionType === "DEBIT") {
        if (currentBalance < amount) {
          debug.push("❌ Insufficient wallet balance");
          Logger.log(debug.join("\n"));

          return jsonResponse({
            success: false,
            error: "Insufficient wallet balance",
            wallet_balance: currentBalance,
            debug: debug
          });
        }

        balanceAfter = currentBalance - amount;
      }
    } else {
      balanceAfter = currentBalance;
      debug.push("ℹ️ Non-success transaction. Balance unchanged.");
    }

    var transactionId = generateWalletTransactionId();
    var createdAt = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyy-MM-dd HH:mm:ss"
    );

    debug.push("🆔 Transaction ID: " + transactionId);
    debug.push("💰 Balance Before: " + balanceBefore);
    debug.push("💰 Balance After: " + balanceAfter);

    // ===========================================================
    // APPEND TO LEDGER
    // ===========================================================
    walletSheet.appendRow([
      transactionId,
      email,
      transactionType,
      amount,
      balanceBefore,
      balanceAfter,
      status,
      paymentMode,
      referenceId,
      remarks,
      createdAt,
      createdBy
    ]);

    debug.push("✅ Wallet transaction appended");

    // ===========================================================
    // UPDATE USERS SHEET ONLY FOR SUCCESS
    // Users columns:
    // Name | Email | Phone | Password | Role | Wallet_balance | Status | created_at
    // Wallet_balance = column 6
    // ===========================================================
    if (status === "SUCCESS") {
      userSheet.getRange(userInfo.rowNumber, 6).setValue(balanceAfter);
      debug.push("✅ Users.Wallet_balance updated");
    } else {
      debug.push("ℹ️ Users.Wallet_balance not updated due to status: " + status);
    }

    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: true,
      transaction_id: transactionId,
      email: email,
      transaction_type: transactionType,
      amount: amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      wallet_balance: balanceAfter,
      status: status,
      payment_mode: paymentMode,
      reference_id: referenceId,
      remarks: remarks,
      created_at: createdAt,
      created_by: createdBy,
      debug: debug
    });

  } catch (error) {
    debug.push("🔥 ERROR: " + error.toString());
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: false,
      error: error.toString(),
      debug: debug
    });
  }
}


// ===============================================================
// VERIFY WALLET PAYMENT
// ---------------------------------------------------------------
// Secure wallet top-up flow
//
// REQUIRED PARAMS:
// ---------------------------------------------------------------
// email
// amount
// razorpay_order_id
// razorpay_payment_id
// razorpay_signature
//
// FLOW:
// ---------------------------------------------------------------
// 1. Validate params
// 2. Verify Razorpay signature server-side
// 3. Prevent duplicate payment credit
// 4. Credit wallet only after verification
// ===============================================================
function verifyWalletPayment(params) {
  var debug = [];

  try {
    var email = String(params.email || "").trim().toLowerCase();
    var amount = Number(params.amount || 0);
    var razorpayOrderId = String(params.razorpay_order_id || "").trim();
    var razorpayPaymentId = String(params.razorpay_payment_id || "").trim();
    var razorpaySignature = String(params.razorpay_signature || "").trim();

    debug.push("🔐 verifyWalletPayment() called");
    debug.push("📧 Email: " + email);
    debug.push("💵 Amount: " + amount);
    debug.push("🧾 Razorpay Order ID: " + razorpayOrderId);
    debug.push("🧾 Razorpay Payment ID: " + razorpayPaymentId);
    Logger.log(debug.join("\n"));

    if (!email) {
      return jsonResponse({
        success: false,
        error: "Email is required",
        debug: debug
      });
    }

    if (!amount || amount <= 0) {
      return jsonResponse({
        success: false,
        error: "Amount must be greater than 0",
        debug: debug
      });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return jsonResponse({
        success: false,
        error: "Missing Razorpay verification parameters",
        debug: debug
      });
    }

    // ===========================================================
    // Prevent duplicate wallet credit for same payment_id
    // ===========================================================
    if (hasWalletPaymentAlreadyProcessed(razorpayPaymentId)) {
      debug.push("⚠️ Duplicate payment detected");
      Logger.log(debug.join("\n"));

      return jsonResponse({
        success: false,
        error: "This payment has already been processed",
        duplicate: true,
        reference_id: razorpayPaymentId,
        debug: debug
      });
    }

    // ===========================================================
    // Server-side signature verification
    // ===========================================================
    var isValidSignature = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    debug.push("🔐 Signature Valid: " + isValidSignature);
    Logger.log(debug.join("\n"));

    if (!isValidSignature) {
      debug.push("❌ Invalid Razorpay signature");
      Logger.log(debug.join("\n"));

      return jsonResponse({
        success: false,
        error: "Invalid payment signature",
        debug: debug
      });
    }

    // ===========================================================
    // Signature is valid → now safely credit wallet
    // ===========================================================
    debug.push("✅ Signature verified successfully");
    debug.push("💰 Crediting wallet now...");
    Logger.log(debug.join("\n"));

    var transactionResult = addWalletTransaction({
      email: email,
      transaction_type: "CREDIT",
      amount: amount,
      status: "SUCCESS",
      payment_mode: "RAZORPAY",
      reference_id: razorpayPaymentId,
      remarks: "Wallet top-up",
      created_by: "USER"
    });

    var parsedResult = JSON.parse(transactionResult.getContent());

    debug.push("📥 addWalletTransaction() response received");
    Logger.log(debug.join("\n"));

    if (!parsedResult.success) {
      debug.push("❌ Wallet transaction failed after verification");
      Logger.log(debug.join("\n"));

      return jsonResponse({
        success: false,
        error: parsedResult.error || "Wallet credit failed",
        debug: debug
      });
    }

    debug.push("🎉 Wallet credited successfully");
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: true,
      message: "Wallet credited successfully",
      wallet_balance: parsedResult.wallet_balance,
      transaction_id: parsedResult.transaction_id,
      reference_id: razorpayPaymentId,
      debug: debug
    });

  } catch (error) {
    debug.push("🔥 ERROR: " + error.toString());
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: false,
      error: error.toString(),
      debug: debug
    });
  }
}


// ===============================================================
// DUPLICATE PAYMENT CHECK
// ---------------------------------------------------------------
// Prevents same razorpay_payment_id from being credited twice
// ===============================================================
function hasWalletPaymentAlreadyProcessed(referenceId) {
  Logger.log("🔍 hasWalletPaymentAlreadyProcessed() called for: " + referenceId);

  if (!referenceId) return false;

  var sheet = getWalletTransactionsSheet();
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return false;
  }

  var headers = data[0];
  var referenceIndex = headers.indexOf("reference_id");
  var statusIndex = headers.indexOf("status");

  for (var i = 1; i < data.length; i++) {
    var rowReference = String(data[i][referenceIndex] || "").trim();
    var rowStatus = String(data[i][statusIndex] || "").trim().toUpperCase();

    if (rowReference === referenceId && rowStatus === "SUCCESS") {
      Logger.log("⚠️ Duplicate successful reference_id found");
      return true;
    }
  }

  Logger.log("✅ No duplicate payment found");
  return false;
}


// ===============================================================
// GET USER ROW BY EMAIL
// ===============================================================
function getUserRowByEmail(email) {
  Logger.log("🔍 getUserRowByEmail() searching: " + email);

  var sheet = getUsersSheet();
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return {
      found: false
    };
  }

  var headers = data[0];
  var emailIndex = headers.indexOf("Email");
  var walletIndex = headers.indexOf("Wallet_balance");

  for (var i = 1; i < data.length; i++) {
    var rowEmail = String(data[i][emailIndex] || "").trim().toLowerCase();

    if (rowEmail === email) {
      Logger.log("✅ User found at row: " + (i + 1));

      return {
        found: true,
        rowNumber: i + 1,
        user: {
          email: rowEmail,
          wallet_balance: Number(data[i][walletIndex] || 0)
        }
      };
    }
  }

  Logger.log("⚠️ User not found");

  return {
    found: false
  };
}


// ===============================================================
// GENERATE WALLET TRANSACTION ID
// ===============================================================
function generateWalletTransactionId() {
  var sheet = getWalletTransactionsSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return "WTX1001";
  }

  var lastId = String(sheet.getRange(lastRow, 1).getValue() || "").trim();
  var lastNumber = Number(lastId.replace("WTX", "")) || 1000;

  return "WTX" + (lastNumber + 1);
}


// ===============================================================
// ROW TO OBJECT HELPER
// ===============================================================
function rowToObject(headers, row) {
  var obj = {};

  headers.forEach(function(header, index) {
    obj[header] = row[index];
  });

  return obj;
}

function processWalletBookingPayment(params) {
  var debug = [];

  try {
    var bookingId = String(params.booking_id || "").trim();
    var email = String(params.email || "").trim().toLowerCase();
    var amount = Number(params.amount || 0);

    debug.push("🚀 processWalletBookingPayment() called");
    debug.push("🧾 Booking ID: " + bookingId);
    debug.push("📧 Email: " + email);
    debug.push("💵 Amount: " + amount);
    Logger.log(debug.join("\n"));

    if (!bookingId || !email || !amount || amount <= 0) {
      return jsonResponse({
        success: false,
        error: "Missing required parameters",
        debug: debug
      });
    }

    // 1. DEBIT WALLET
    var debitResult = addWalletTransaction({
      email: email,
      transaction_type: "DEBIT",
      amount: amount,
      status: "SUCCESS",
      payment_mode: "WALLET",
      reference_id: bookingId,
      remarks: "Booking payment using wallet",
      created_by: "USER"
    });

    var debitJson = JSON.parse(debitResult.getContent());

    if (!debitJson.success) {
      return jsonResponse({
        success: false,
        error: debitJson.error || "Wallet deduction failed",
        debug: debug
      });
    }

    debug.push("✅ Wallet debited successfully");
    Logger.log(debug.join("\n"));

    // 2. CONFIRM BOOKING
    var bookingResult = confirmWalletBooking(bookingId);

    if (!bookingResult.success) {
      debug.push("❌ Booking confirm failed after wallet debit");
      debug.push("↩️ Starting wallet refund rollback");
      Logger.log(debug.join("\n"));

      // 3. REFUND WALLET
      addWalletTransaction({
        email: email,
        transaction_type: "REFUND",
        amount: amount,
        status: "SUCCESS",
        payment_mode: "SYSTEM",
        reference_id: bookingId,
        remarks: "Wallet refund due to booking confirmation failure",
        created_by: "SYSTEM"
      });

      return jsonResponse({
        success: false,
        error: bookingResult.error || "Booking failed after wallet debit. Amount refunded.",
        refunded: true,
        debug: debug
      });
    }

    debug.push("🎉 Full wallet booking payment completed");
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: true,
      message: "Booking paid fully by wallet",
      booking_id: bookingId,
      wallet_balance: debitJson.wallet_balance,
      transaction_id: debitJson.transaction_id,
      debug: debug
    });

  } catch (error) {
    debug.push("🔥 ERROR: " + error.toString());
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: false,
      error: error.toString(),
      debug: debug
    });
  }
}

function verifyMixedBookingPayment(params) {
  var debug = [];

  try {
    var bookingId = String(params.booking_id || "").trim();
    var email = String(params.email || "").trim().toLowerCase();
    var walletAmount = Number(params.wallet_amount || 0);
    var onlineAmount = Number(params.online_amount || 0);
    var razorpayOrderId = String(params.razorpay_order_id || "").trim();
    var razorpayPaymentId = String(params.razorpay_payment_id || "").trim();
    var razorpaySignature = String(params.razorpay_signature || "").trim();

    debug.push("🚀 verifyMixedBookingPayment() called");
    debug.push("🧾 Booking ID: " + bookingId);
    debug.push("📧 Email: " + email);
    debug.push("💵 Wallet Amount: " + walletAmount);
    debug.push("💵 Online Amount: " + onlineAmount);
    debug.push("🧾 Razorpay Payment ID: " + razorpayPaymentId);
    Logger.log(debug.join("\n"));

    if (!bookingId || !email || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return jsonResponse({
        success: false,
        error: "Missing verification parameters",
        debug: debug
      });
    }

    // 1. VERIFY SIGNATURE
    var isValid = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      return jsonResponse({
        success: false,
        error: "Invalid payment signature",
        debug: debug
      });
    }

    debug.push("✅ Razorpay signature verified");
    Logger.log(debug.join("\n"));

    // 2. DEDUCT WALLET PART
    if (walletAmount > 0) {
      var walletResult = addWalletTransaction({
        email: email,
        transaction_type: "DEBIT",
        amount: walletAmount,
        status: "SUCCESS",
        payment_mode: "WALLET",
        reference_id: bookingId,
        remarks: "Partial wallet used in booking",
        created_by: "USER"
      });

      var walletJson = JSON.parse(walletResult.getContent());

      if (!walletJson.success) {
        return jsonResponse({
          success: false,
          error: walletJson.error || "Wallet deduction failed",
          debug: debug
        });
      }

      debug.push("✅ Wallet partial deduction done");
      Logger.log(debug.join("\n"));
    }

    // 3. CONFIRM BOOKING
    var bookingResult = confirmMixedBooking(
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!bookingResult.success) {
      debug.push("❌ Booking confirm failed after mixed payment");
      debug.push("↩️ Starting wallet refund rollback");
      Logger.log(debug.join("\n"));

      // 4. REFUND WALLET PART
      if (walletAmount > 0) {
        addWalletTransaction({
          email: email,
          transaction_type: "REFUND",
          amount: walletAmount,
          status: "SUCCESS",
          payment_mode: "SYSTEM",
          reference_id: bookingId,
          remarks: "Wallet refund due to mixed booking confirmation failure",
          created_by: "SYSTEM"
        });
      }

      return jsonResponse({
        success: false,
        error: bookingResult.error || "Booking failed after mixed payment. Wallet refunded.",
        refunded: true,
        debug: debug
      });
    }

    debug.push("🎉 Mixed booking payment completed successfully");
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: true,
      message: "Mixed booking payment completed",
      booking_id: bookingId,
      razorpay_payment_id: razorpayPaymentId,
      debug: debug
    });

  } catch (error) {
    debug.push("🔥 ERROR: " + error.toString());
    Logger.log(debug.join("\n"));

    return jsonResponse({
      success: false,
      error: error.toString(),
      debug: debug
    });
  }
}