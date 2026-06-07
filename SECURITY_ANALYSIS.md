# SHRD Shuttle Web App - Security Vulnerability Analysis

**Analysis Date**: May 9, 2026  
**Status**: ⚠️ **CRITICAL ISSUES FOUND**

---

## Executive Summary

This codebase contains **multiple critical and high-severity security vulnerabilities** that expose sensitive user data, credentials, and payment information. The application uses insecure authentication patterns, exposes secrets in client-side code, and lacks proper input validation. **Immediate remediation is required before production deployment.**

---

## 1. CRITICAL VULNERABILITIES

### 1.1 **Credentials Stored in Client-Side Code & URL Parameters** ⚠️ CRITICAL

**Severity**: **CRITICAL**

**Location**: 
- [assets/js/auth.js](assets/js/auth.js#L81) - Login function
- [assets/js/auth.js](assets/js/auth.js#L155-L161) - Signup function
- [captain/assets/js/captainAuth.js](captain/assets/js/captainAuth.js#L135-L140) - Captain login

**Issue**:
Passwords and emails are transmitted in **plain text within URL query parameters** to backend API:

```javascript
// ❌ INSECURE - Password visible in URL
const response = await fetch(
  `${APP_CONFIG.API_URL}?action=validateUser` +
  `&email=${encodeURIComponent(email)}` +
  `&password=${encodeURIComponent(password)}`
);
```

**Risks**:
- Passwords logged in server access logs
- Visible in browser history
- Interceptable by proxy tools
- Visible in network inspection tools
- Browser history retains credentials

**Recommendation**:
- ✅ Use **POST requests with HTTPS** (never GET for credentials)
- ✅ Send credentials in **request body**, never URL parameters
- ✅ Implement HTTPS/TLS 1.2+ enforcement
- ✅ Add HTTP Strict-Transport-Security (HSTS) headers

---

### 1.2 **Google Apps Script API Key Exposed in Client Code** ⚠️ CRITICAL

**Severity**: **CRITICAL**

**Location**: [assets/js/config.js](assets/js/config.js#L28-L34)

**Issue**:
The deployed Google Apps Script URL (including the deployment ID) is hardcoded in publicly accessible JavaScript:

```javascript
// ❌ EXPOSED - Anyone can call this endpoint
API_URL: "https://script.google.com/macros/s/AKfycbwIZE9kQ5ONEJB8ejsHknLWyllNL2pQAR8Q2lioo7KG8c4D2CW5LCO5JwZOF_rK7Ztq/exec"
```

**Risks**:
- Attackers can **directly call the backend API** bypassing your frontend
- No rate limiting or request origin verification visible
- Can create fake bookings, read user data, modify wallet balances
- Can access all database information (bookings, user credentials, payments)

**Recommendation**:
- ✅ **Do NOT expose backend URLs in client code**
- ✅ Implement backend proxy/gateway (Node.js, Python Flask, etc.)
- ✅ Add API rate limiting (max 100 requests/min per IP)
- ✅ Implement API authentication (JWT tokens, API keys)
- ✅ Add request origin validation (check Referer header)
- ✅ Implement CORS headers strictly (`Access-Control-Allow-Origin: https://yourdomain.com` only)

---

### 1.3 **Razorpay Live Key Exposed in Client Code** ⚠️ CRITICAL

**Severity**: **CRITICAL**

**Location**: [assets/js/config.js](assets/js/config.js#L36-L40)

**Issue**:
Live Razorpay public key is hardcoded in JavaScript (accessible to anyone):

```javascript
// ⚠️ LIVE KEY EXPOSED
RAZORPAY_KEY_ID: "rzp_live_STnSll8AkTlMTl"
```

**Risks**:
- Competitors can integrate with your Razorpay account
- Attackers can charge payments to legitimate customers
- Can create fraudulent transactions
- Potential PCI compliance violations

**Recommendation**:
- ✅ Use **test key in development**, rotate live key immediately
- ✅ Razorpay public key exposure is **acceptable** (it's meant to be public)
- ✅ BUT never expose **secret key** (this may be in backend code)
- ✅ Implement strong server-side payment validation
- ✅ Verify all Razorpay webhooks with secret key on backend only

---

### 1.4 **User Session Stored in Unencrypted localStorage** ⚠️ CRITICAL

**Severity**: **CRITICAL**

**Location**:
- [assets/js/auth.js](assets/js/auth.js#L100) - Login stores full user object
- [captain/assets/js/captainAuth.js](captain/assets/js/captainAuth.js#L85) - Captain session stored

**Issue**:
Sensitive user data stored in **plain text in localStorage**, accessible via JavaScript:

```javascript
// ❌ INSECURE - Anyone with JS access can read this
localStorage.setItem("currentUser", JSON.stringify(user));
```

Data stored includes:
```json
{
  "name": "John Doe",
  "email": "john@example.com", 
  "phone": "9876543210",
  "role": "user",
  "wallet_balance": 5000
}
```

**Risks**:
- **XSS vulnerability** allows thieves to read user data
- Data persists even after closing browser
- Available to **any JavaScript running on page** (including scripts from malicious ads)
- Unencrypted and visible in browser DevTools

**Recommendation**:
- ✅ Use **sessionStorage** instead (cleared on browser close)
- ✅ Or use **memory-only storage** (in-memory variables)
- ✅ Implement proper **session tokens** (JWT with short expiry)
- ✅ Add encryption if localStorage is necessary
- ✅ **Never store passwords** in client storage
- ✅ Never store sensitive wallet_balance in localStorage

---

### 1.5 **No Input Validation on Forms** ⚠️ CRITICAL

**Severity**: **HIGH**

**Location**:
- [assets/js/auth.js](assets/js/auth.js#L65-L68) - Login validation
- [assets/js/auth.js](assets/js/auth.js#L140-L143) - Signup validation

**Issue**:
Only checks if fields are empty/null, no format validation:

```javascript
// ❌ MINIMAL VALIDATION - No format checking
if (!email || !password) {
  console.warn("⚠️ Email or password missing");
  alert("Enter email and password");
  return;
}
```

**Risks**:
- Invalid email formats accepted
- No password strength requirements
- No phone number format validation
- Enables injection attacks
- SQL injection possible if backend is vulnerable

**Recommendation**:
- ✅ Validate email format: `const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- ✅ Validate password strength (min 8 chars, uppercase, lowercase, number, special char)
- ✅ Validate phone format: `const phoneRegex = /^[0-9]{10}$/`
- ✅ Implement rate limiting on failed login attempts
- ✅ Add CAPTCHA after 3 failed attempts
- ✅ Sanitize all user inputs

---

## 2. HIGH-SEVERITY VULNERABILITIES

### 2.1 **No CSRF Protection** ⚠️ HIGH

**Severity**: **HIGH**

**Issue**:
No CSRF tokens or same-site cookie protections found in:
- Login/Signup forms
- Payment operations
- User profile updates

**Risks**:
- Attackers can forge requests on behalf of logged-in users
- Can create unauthorized bookings
- Can deduct wallet balances

**Recommendation**:
- ✅ Generate **CSRF tokens** on backend for each session
- ✅ Include token in all form submissions
- ✅ Validate tokens server-side
- ✅ Use **SameSite=Strict** cookie attribute
- ✅ Validate Referer header on server

---

### 2.2 **No XSS Protection** ⚠️ HIGH

**Severity**: **HIGH**

**Location**: [assets/js/componentLoader.js](assets/js/componentLoader.js#L50) - Direct innerHTML injection

**Issue**:
HTML components loaded via `innerHTML` without sanitization:

```javascript
// ❌ Could be exploited if external HTML is compromised
target.innerHTML = html;
```

**Risks**:
- Malicious scripts injected into payment modals
- User credentials stolen via fake forms
- Wallet balance manipulated

**Recommendation**:
- ✅ Use `textContent` instead of `innerHTML` for user data
- ✅ Use **DOMPurify** library for HTML sanitization
- ✅ Implement Content Security Policy (CSP) header:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' https://checkout.razorpay.com;
  ```
- ✅ Sanitize all user inputs before display

---

### 2.3 **Payment Modal Directly Injects HTML** ⚠️ HIGH

**Severity**: **HIGH**

**Location**: [assets/js/payment.js](assets/js/payment.js#L353-L550)

**Issue**:
Large HTML string inserted via `insertAdjacentHTML()` for payment summary modal:

```javascript
// ❌ Large unescaped HTML injection
document.body.insertAdjacentHTML("beforeend", modalHtml);
```

**Risks**:
- If any user data in modal is unescaped, XSS attack vector
- Payment summary could show modified amounts if data is compromised

**Recommendation**:
- ✅ Use templating engine (Handlebars, Nunjucks)
- ✅ Always escape user data: `textContent` instead of `innerHTML`
- ✅ Use DOM API: `document.createElement()` instead of HTML strings

---

### 2.4 **Passwords Sent Over GET Requests** ⚠️ HIGH

**Severity**: **HIGH**

**Location**: [assets/js/auth.js](assets/js/auth.js#L78-L84)

**Issue**:
Login uses GET request for sensitive data:

```javascript
// ❌ GET requests expose data in multiple places
const response = await fetch(
  `${APP_CONFIG.API_URL}?action=validateUser&email=...&password=...`
);
```

**Risks**:
- Browser history logs passwords
- Proxy servers log full URLs
- CDN access logs contain credentials
- Referrer header leaks credentials
- More visible in developer tools

**Recommendation**:
- ✅ Use **POST requests** exclusively for authentication
- ✅ Use **HTTPS** with TLS 1.3
- ✅ Add `Referrer-Policy: no-referrer` header
- ✅ Implement rate limiting on login endpoint

---

### 2.5 **No Password Strength Validation** ⚠️ HIGH

**Severity**: **HIGH**

**Location**: [assets/js/auth.js](assets/js/auth.js#L132-L140)

**Issue**:
Signup accepts any password without validation:

```javascript
// ❌ No strength requirements
const password = document.getElementById("signupPassword")?.value.trim();

if (!name || !email || !phone || !password) {
  // Only checks if empty
  alert("Fill all signup fields");
  return;
}
```

**Recommendation**:
- ✅ Require minimum **12 characters** (OWASP standard)
- ✅ Require uppercase, lowercase, number, special character
- ✅ Check against common password lists
- ✅ Show password strength indicator to user
- ✅ Disable weak passwords

---

## 3. MEDIUM-SEVERITY VULNERABILITIES

### 3.1 **"Forgot Password" Returns Stored Password** ⚠️ MEDIUM

**Severity**: **MEDIUM**

**Location**: [assets/js/auth.js](assets/js/auth.js#L207-L250)

**Issue**:
The `forgotPassword` function sends **stored password to user email**:

```javascript
// ⚠️ SECURITY ANTI-PATTERN
export async function forgotPassword() {
  // Sends stored password to email
  const response = await fetch(
    `${APP_CONFIG.API_URL}?action=forgotPassword&email=${email}`
  );
}
```

**Risks**:
- Passwords should **never be stored in plain text**
- Email is often less secure than password
- If email is compromised, password is exposed
- Violates security best practices

**Recommendation**:
- ✅ Implement **password reset tokens** (not password recovery)
- ✅ Generate short-lived tokens (15 minutes expiry)
- ✅ Send reset link via email, not password
- ✅ Hash passwords using bcrypt/Argon2 (backend only)
- ✅ Never email passwords

---

### 3.2 **No Session Timeout** ⚠️ MEDIUM

**Severity**: **MEDIUM**

**Location**: [assets/js/auth.js](assets/js/auth.js#L280-L297)

**Issue**:
Auto-login restores session indefinitely:

```javascript
// ⚠️ No expiration check
export function autoLogin() {
  const savedUser = localStorage.getItem("currentUser");
  if (!savedUser) return;
  
  try {
    const user = JSON.parse(savedUser);
    setCurrentUser(user); // Session never expires
    showMainContent();
  }
}
```

**Risks**:
- User leaves computer unattended → anyone can use account
- Long-lived sessions increase compromise window
- No automatic re-authentication for sensitive operations

**Recommendation**:
- ✅ Add session **expiration timestamps** (30 minutes)
- ✅ Implement **activity timeout** (logout after 15 mins of inactivity)
- ✅ Show logout timer to user
- ✅ Require re-authentication for sensitive operations (payment, password change)
- ✅ Implement server-side session validation

---

### 3.3 **No API Rate Limiting** ⚠️ MEDIUM

**Severity**: **MEDIUM**

**Issue**:
No rate limiting found on:
- Login attempts
- API calls
- Payment operations
- Wallet transactions

**Risks**:
- Brute force attacks on login
- DDoS attacks on API
- Unauthorized payment attempts

**Recommendation**:
- ✅ Implement rate limiting:
  - 5 login attempts per 15 minutes per IP
  - 100 API requests per minute per user
  - 10 payment operations per hour per user
- ✅ Use backend middleware: `express-rate-limit` (Node.js)
- ✅ Add progressive delays after failures
- ✅ Implement CAPTCHA after threshold

---

### 3.4 **No HTTPS Enforcement** ⚠️ MEDIUM

**Severity**: **MEDIUM**

**Issue**:
No HTTPS enforcement in index.html or headers

**Risks**:
- Man-in-the-middle (MITM) attacks
- Session hijacking
- Credential theft

**Recommendation**:
- ✅ Deploy only over **HTTPS**
- ✅ Add HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- ✅ Enforce HTTPS in .htaccess or nginx config:
  ```
  RewriteEngine On
  RewriteCond %{HTTPS} off
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
  ```
- ✅ Use TLS 1.2+ only

---

### 3.5 **Captain PIN Transmitted in Plain Text** ⚠️ MEDIUM

**Severity**: **MEDIUM**

**Location**: [captain/assets/js/captainAuth.js](captain/assets/js/captainAuth.js#L135-L140)

**Issue**:
Captain PIN sent via URL parameter in GET request:

```javascript
// ⚠️ PIN visible in URL
const url =
  `${APP_CONFIG.API_URL}?action=validateCaptainLogin` +
  `&mobile=${encodeURIComponent(mobile)}` +
  `&pin=${encodeURIComponent(pin)}`;
```

**Recommendation**:
- ✅ Use POST requests for authentication
- ✅ Hash PIN on client before sending (server-side hash remains authoritative)
- ✅ Implement rate limiting for PIN entry

---

### 3.6 **No Security Headers** ⚠️ MEDIUM

**Severity**: **MEDIUM**

**Issue**:
Missing standard security headers in HTML/server config

**Recommendation**:
Add these HTTP headers:
```
Content-Security-Policy: default-src 'self'; script-src 'self' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 4. LOW-SEVERITY VULNERABILITIES

### 4.1 **Excessive Console Logging** ⚠️ LOW

**Severity**: **LOW**

**Issue**:
Sensitive data logged to console:

```javascript
console.log("📥 Login API Response:", result); // Shows user object
console.log("🌐 Wallet balance URL:", url); // Shows email in URL
```

**Recommendation**:
- ✅ Disable console logging in production
- ✅ Use production build to strip logs
- ✅ Never log passwords, tokens, PII

---

### 4.2 **Default Error Messages Expose Backend Structure** ⚠️ LOW

**Severity**: **LOW**

**Issue**:
Backend URLs and action names visible in errors

**Recommendation**:
- ✅ Show generic error messages to users
- ✅ Log detailed errors only on server
- ✅ Implement proper error tracking (Sentry, etc.)

---

### 4.3 **No Wallet Balance Integrity Check** ⚠️ LOW

**Severity**: **LOW**

**Issue**:
Wallet balance stored in localStorage, can be manipulated via DevTools

**Recommendation**:
- ✅ Always validate wallet balance on backend before payment
- ✅ Never trust client-side balance calculations
- ✅ Implement server-side balance verification

---

## 5. MISSING SECURITY FEATURES

### 5.1 ❌ Missing Two-Factor Authentication (2FA)
- Recommendation: Implement OTP via SMS/Email for login and payments

### 5.2 ❌ Missing Email Verification
- Recommendation: Verify email before account activation

### 5.3 ❌ Missing Phone Number Verification
- Recommendation: Verify phone via OTP before adding to account

### 5.4 ❌ No Audit Logging
- Recommendation: Log all sensitive operations (login, payments, profile changes)

### 5.5 ❌ No Security Questions for Account Recovery
- Recommendation: Implement security questions as backup recovery method

### 5.6 ❌ Missing IP Whitelisting
- Recommendation: For admin/captain accounts, implement IP whitelisting

### 5.7 ❌ No SSL Certificate Pinning
- Recommendation: Consider for mobile apps (if any)

### 5.8 ❌ No Payment Encryption
- Recommendation: Encrypt sensitive payment data in transit

---

## 6. COMPLIANCE ISSUES

### PCI DSS Violations
- **Issue**: Payment data handling does not follow PCI DSS standards
- **Risk**: Heavy fines, card network penalties
- **Recommendation**: 
  - Use Razorpay's hosted payment forms (avoid handling card data)
  - Implement tokenization
  - Get PCI DSS certification

### GDPR Violations
- **Issue**: No explicit consent for data storage, no data deletion mechanism
- **Recommendation**:
  - Add privacy policy with explicit user consent
  - Implement right to be forgotten (data deletion)
  - Add cookie consent banner

---

## 7. PRIORITY REMEDIATION CHECKLIST

### 🔴 CRITICAL (Fix Immediately)
- [ ] Stop sending passwords via URL parameters → Use POST + HTTPS
- [ ] Remove Google Apps Script URL from client code → Use backend proxy
- [ ] Rotate Razorpay keys immediately
- [ ] Stop storing full user objects in localStorage
- [ ] Implement strict input validation on all forms

### 🟠 HIGH (Fix Within 1 Week)
- [ ] Implement CSRF protection
- [ ] Add XSS protection and CSP headers
- [ ] Implement password strength validation
- [ ] Add rate limiting on all endpoints
- [ ] Replace "forgot password" with password reset via token

### 🟡 MEDIUM (Fix Within 2 Weeks)
- [ ] Add session timeout and activity tracking
- [ ] Implement HTTPS enforcement (HSTS)
- [ ] Add security headers (CSP, X-Frame-Options, etc.)
- [ ] Disable console logging in production
- [ ] Implement server-side session validation

### 🟢 LOW (Fix Within 1 Month)
- [ ] Improve error messages
- [ ] Add audit logging
- [ ] Implement 2FA
- [ ] Add email verification
- [ ] Add phone number verification

---

## 8. RECOMMENDED ARCHITECTURE CHANGES

### Current (Insecure)
```
Browser → Google Apps Script API (Direct, exposed endpoint)
```

### Recommended (Secure)
```
Browser → Your Backend Server (Node.js/Python/etc.)
         ↓
Your Backend → Google Apps Script (With API key, hidden)
         ↓
Your Backend → Razorpay API (With secret key, never exposed)
         ↓
Your Backend ← Database (Encrypted, isolated)
```

---

## 9. IMPLEMENTATION EXAMPLES

### Example: Secure Login (POST with HTTPS)
```javascript
// ✅ SECURE
export async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  // Validate format
  if (!isValidEmail(email)) {
    alert("Invalid email format");
    return;
  }

  if (!isValidPassword(password)) {
    alert("Password must be 8+ chars with uppercase, lowercase, number");
    return;
  }

  try {
    // Use POST, never GET
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": getCsrfToken() // Add CSRF token
      },
      body: JSON.stringify({ email, password }),
      credentials: "include" // Send cookies for session
    });

    const result = await response.json();

    if (result.success) {
      // Use sessionStorage (not localStorage)
      sessionStorage.setItem("session_token", result.token);
      
      // Show main content
      showMainContent();
      alert(`Welcome ${result.user.name}!`);
    } else {
      alert(result.error);
    }
  } catch (error) {
    alert("Login failed. Please try again.");
  }
}

// Validation functions
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /[0-9]/.test(password);
}

function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]').content;
}
```

### Example: XSS Prevention
```javascript
// ❌ UNSAFE
element.innerHTML = userProvidedData;

// ✅ SAFE
element.textContent = userProvidedData;

// ✅ SAFE (for HTML)
element.innerHTML = DOMPurify.sanitize(userProvidedData);
```

### Example: Session Timeout
```javascript
class SessionManager {
  constructor(timeoutMinutes = 30) {
    this.timeoutMinutes = timeoutMinutes;
    this.timeoutId = null;
    this.resetTimeout();
  }

  resetTimeout() {
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.logout();
    }, this.timeoutMinutes * 60 * 1000);
  }

  logout() {
    sessionStorage.removeItem("session_token");
    alert("Session expired. Please log in again.");
    window.location.href = "/login";
  }
}

// Reset timeout on user activity
document.addEventListener("click", () => sessionManager.resetTimeout());
document.addEventListener("keypress", () => sessionManager.resetTimeout());
```

---

## 10. TESTING & VALIDATION

### Manual Testing
- [ ] Test login with SQL injection payload: `' OR '1'='1`
- [ ] Test with XSS payload: `<script>alert('xss')</script>`
- [ ] Modify localStorage to change wallet balance and verify backend rejects
- [ ] Use DevTools network tab to verify POST requests are used
- [ ] Check for HTTPS enforcement
- [ ] Verify passwords aren't visible in browser history
- [ ] Test session timeout functionality

### Automated Testing
- [ ] Use OWASP ZAP for vulnerability scanning
- [ ] Use Burp Suite for penetration testing
- [ ] Run `npm audit` for dependency vulnerabilities
- [ ] Implement unit tests for validation functions
- [ ] Use ESLint with security plugin

### Tools
- **OWASP ZAP**: Web application security scanner
- **Burp Suite**: Professional penetration testing
- **Snyk**: Dependency vulnerability scanner
- **npm audit**: Check npm package vulnerabilities

---

## 11. REFERENCES & STANDARDS

- **OWASP Top 10 2021**: https://owasp.org/Top10/
- **OWASP Authentication Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- **PCI DSS v3.2.1**: https://www.pcisecuritystandards.org/
- **GDPR**: https://gdpr-info.eu/
- **NIST Cybersecurity Framework**: https://www.nist.gov/cyberframework

---

## CONCLUSION

This application has **multiple critical security flaws** that must be fixed before production deployment. The most urgent issues are:

1. **Credentials in URL parameters** → Switch to POST + HTTPS
2. **Backend URL exposed** → Implement backend proxy
3. **Session stored in localStorage** → Use secure tokens
4. **No input validation** → Add comprehensive validation
5. **No CSRF protection** → Implement CSRF tokens

**Estimated remediation time**: 2-4 weeks with experienced developer.

**Recommendation**: Address all CRITICAL items before any production use.
