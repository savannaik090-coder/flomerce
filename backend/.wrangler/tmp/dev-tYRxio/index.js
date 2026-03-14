var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// .wrangler/tmp/bundle-k9n61Q/checked-fetch.js
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
var urls;
var init_checked_fetch = __esm({
  ".wrangler/tmp/bundle-k9n61Q/checked-fetch.js"() {
    urls = /* @__PURE__ */ new Set();
    __name(checkURL, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});

// .wrangler/tmp/bundle-k9n61Q/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
var init_strip_cf_connecting_ip_header = __esm({
  ".wrangler/tmp/bundle-k9n61Q/strip-cf-connecting-ip-header.js"() {
    __name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        return Reflect.apply(target, thisArg, [
          stripCfConnectingIPHeader.apply(null, argArray)
        ]);
      }
    });
  }
});

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
  }
});

// node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// utils/helpers.js
function generateId() {
  return crypto.randomUUID();
}
function generateToken(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}
function generateSubdomain(brandName) {
  return brandName.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").substring(0, 30);
}
function setRequestOrigin(request) {
  _currentRequestOrigin = request ? request.headers.get("Origin") : null;
}
function jsonResponse(data, status = 200, request = null) {
  const origin = request ? request.headers.get("Origin") : _currentRequestOrigin;
  const allowedOrigin = getAllowedOrigin(origin);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-ID",
      "Access-Control-Allow-Credentials": "true"
    }
  });
}
function getAllowedOrigin(origin) {
  if (!origin)
    return "*";
  if (origin === "https://fluxe.in")
    return origin;
  if (origin.endsWith(".fluxe.in") && origin.startsWith("https://"))
    return origin;
  if (origin === "https://fluxe-8x1.pages.dev")
    return origin;
  if (origin.endsWith(".pages.dev"))
    return origin;
  if (origin === "https://saas-platform.savannaik090.workers.dev")
    return origin;
  if (origin.endsWith(".workers.dev"))
    return origin;
  if (origin.includes("localhost"))
    return origin;
  if (origin.includes("replit.dev") || origin.includes("repl.co"))
    return origin;
  return "*";
}
function errorResponse(message, status = 400, code = "ERROR") {
  return jsonResponse({ success: false, error: message, code }, status);
}
function successResponse(data, message = "Success") {
  return jsonResponse({ success: true, message, data });
}
function corsHeaders(request) {
  const origin = request ? request.headers.get("Origin") : _currentRequestOrigin;
  const allowedOrigin = getAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-ID",
    "Access-Control-Allow-Credentials": "true"
  };
}
function handleCORS(request) {
  setRequestOrigin(request);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  return null;
}
function getExpiryDate(hours = 24) {
  const date = /* @__PURE__ */ new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}
function sanitizeInput(input) {
  if (typeof input !== "string")
    return input;
  return input.trim().replace(/[<>]/g, "");
}
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
var _currentRequestOrigin;
var init_helpers = __esm({
  "utils/helpers.js"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(generateId, "generateId");
    __name(generateToken, "generateToken");
    __name(generateOrderNumber, "generateOrderNumber");
    __name(generateSubdomain, "generateSubdomain");
    _currentRequestOrigin = null;
    __name(setRequestOrigin, "setRequestOrigin");
    __name(jsonResponse, "jsonResponse");
    __name(getAllowedOrigin, "getAllowedOrigin");
    __name(errorResponse, "errorResponse");
    __name(successResponse, "successResponse");
    __name(corsHeaders, "corsHeaders");
    __name(handleCORS, "handleCORS");
    __name(getExpiryDate, "getExpiryDate");
    __name(sanitizeInput, "sanitizeInput");
    __name(validateEmail, "validateEmail");
  }
});

// utils/auth.js
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 1e5,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const hashHex = Array.from(hashArray, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${saltHex}:${hashHex}`;
}
async function verifyPassword(password, storedHash) {
  const [saltHex, hashHex] = storedHash.split(":");
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    data,
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 1e5,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(derivedBits);
  const computedHashHex = Array.from(hashArray, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return computedHashHex === hashHex;
}
async function generateJWT(payload, secret, expiresInHours = 24) {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const now = Math.floor(Date.now() / 1e3);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInHours * 60 * 60
  };
  const base64Header = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const base64Payload = btoa(JSON.stringify(tokenPayload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${base64Header}.${base64Payload}`)
  );
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${base64Header}.${base64Payload}.${base64Signature}`;
}
async function verifyJWT(token, secret) {
  try {
    const [base64Header, base64Payload, base64Signature] = token.split(".");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signatureBytes = Uint8Array.from(
      atob(base64Signature.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(`${base64Header}.${base64Payload}`)
    );
    if (!isValid) {
      return null;
    }
    const payload = JSON.parse(atob(base64Payload.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return payload;
  } catch (e) {
    return null;
  }
}
async function validateAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  const cookie = request.headers.get("Cookie");
  let token = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (cookie) {
    const cookies = cookie.split(";").reduce((acc, c) => {
      const [key, value] = c.trim().split("=");
      acc[key] = value;
      return acc;
    }, {});
    token = cookies["auth_token"];
  }
  if (!token) {
    return null;
  }
  const payload = await verifyJWT(token, env.JWT_SECRET || "your-secret-key");
  if (!payload) {
    return null;
  }
  const user = await env.DB.prepare(
    "SELECT id, email, name, email_verified FROM users WHERE id = ?"
  ).bind(payload.userId).first();
  return user;
}
async function validateAnyAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("SiteCustomer ")) {
    const token = authHeader.substring(13);
    try {
      await ensureCustomerTablesExist(env);
      const session = await env.DB.prepare(
        `SELECT cs.customer_id, cs.site_id FROM site_customer_sessions cs
         WHERE cs.token = ? AND cs.expires_at > datetime('now')`
      ).bind(token).first();
      if (session) {
        const customer = await env.DB.prepare(
          "SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ?"
        ).bind(session.customer_id).first();
        if (customer) {
          return { id: customer.id, email: customer.email, name: customer.name, type: "customer", siteId: customer.site_id };
        }
      }
    } catch (error) {
      console.error("Customer auth validation error:", error);
    }
    return null;
  }
  const user = await validateAuth(request, env);
  if (user) {
    return { ...user, type: "owner" };
  }
  return null;
}
async function ensureCustomerTablesExist(env) {
  if (_customerTablesEnsured)
    return;
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_customers (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        UNIQUE(site_id, email)
      )
    `).run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_customer_sessions (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        site_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES site_customers(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `).run();
    _customerTablesEnsured = true;
  } catch (error) {
    console.error("Error ensuring customer tables:", error);
  }
}
var _customerTablesEnsured;
var init_auth = __esm({
  "utils/auth.js"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_helpers();
    __name(hashPassword, "hashPassword");
    __name(verifyPassword, "verifyPassword");
    __name(generateJWT, "generateJWT");
    __name(verifyJWT, "verifyJWT");
    __name(validateAuth, "validateAuth");
    __name(validateAnyAuth, "validateAnyAuth");
    _customerTablesEnsured = false;
    __name(ensureCustomerTablesExist, "ensureCustomerTablesExist");
  }
});

// workers/storefront/site-admin-worker.js
var site_admin_worker_exports = {};
__export(site_admin_worker_exports, {
  handleSiteAdmin: () => handleSiteAdmin,
  validateSiteAdmin: () => validateSiteAdmin
});
async function handleSiteAdmin(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  switch (action) {
    case "verify":
      return verifySiteAdminCode(request, env);
    case "validate":
      return validateSiteAdminToken(request, env);
    case "set-code":
      return setSiteAdminCode(request, env);
    case "auto-login":
      return autoLoginSiteAdmin(request, env);
    default:
      return errorResponse("Site admin endpoint not found", 404);
  }
}
async function verifySiteAdminCode(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { siteId, subdomain, verificationCode } = await request.json();
    if (!verificationCode) {
      return errorResponse("Verification code is required");
    }
    if (!siteId && !subdomain) {
      return errorResponse("Site ID or subdomain is required");
    }
    let site;
    if (siteId) {
      site = await env.DB.prepare(
        "SELECT id, subdomain, brand_name, settings FROM sites WHERE id = ? AND is_active = 1"
      ).bind(siteId).first();
    } else {
      site = await env.DB.prepare(
        "SELECT id, subdomain, brand_name, settings FROM sites WHERE LOWER(subdomain) = LOWER(?) AND is_active = 1"
      ).bind(subdomain).first();
    }
    if (!site) {
      return errorResponse("Site not found", 404);
    }
    let settings = {};
    try {
      if (site.settings)
        settings = JSON.parse(site.settings);
    } catch (e) {
    }
    const storedCode = settings.adminVerificationCode;
    if (!storedCode) {
      return errorResponse("Admin verification code not set for this site. Please set it from your dashboard.", 400);
    }
    if (verificationCode !== storedCode) {
      return errorResponse("Invalid verification code", 401);
    }
    const adminToken = generateToken(32);
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    await ensureSiteAdminSessionsTable(env);
    await env.DB.prepare(
      `INSERT INTO site_admin_sessions (id, site_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), site.id, adminToken, expiresAt.toISOString()).run();
    return successResponse({
      token: adminToken,
      siteId: site.id,
      subdomain: site.subdomain,
      brandName: site.brand_name,
      expiresAt: expiresAt.toISOString()
    }, "Admin access granted");
  } catch (error) {
    console.error("Verify site admin code error:", error);
    return errorResponse("Verification failed", 500);
  }
}
async function validateSiteAdminToken(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { token, siteId } = await request.json();
    if (!token || !siteId) {
      return errorResponse("Token and site ID are required");
    }
    await ensureSiteAdminSessionsTable(env);
    const session = await env.DB.prepare(
      `SELECT id, site_id, expires_at FROM site_admin_sessions 
       WHERE token = ? AND site_id = ? AND expires_at > datetime('now')`
    ).bind(token, siteId).first();
    if (!session) {
      return errorResponse("Invalid or expired admin token", 401);
    }
    return successResponse({ valid: true, siteId: session.site_id }, "Token is valid");
  } catch (error) {
    console.error("Validate site admin token error:", error);
    return errorResponse("Validation failed", 500);
  }
}
async function setSiteAdminCode(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { siteId, verificationCode } = await request.json();
    if (!siteId || !verificationCode) {
      return errorResponse("Site ID and verification code are required");
    }
    if (verificationCode.length < 4 || verificationCode.length > 20) {
      return errorResponse("Verification code must be between 4 and 20 characters");
    }
    const user = await validateAuth(request, env);
    let site = null;
    if (user) {
      site = await env.DB.prepare(
        "SELECT id, settings FROM sites WHERE id = ? AND user_id = ?"
      ).bind(siteId, user.id).first();
    }
    if (!site) {
      const siteAdmin = await validateSiteAdmin(request, env, siteId);
      if (siteAdmin) {
        site = await env.DB.prepare(
          "SELECT id, settings FROM sites WHERE id = ?"
        ).bind(siteId).first();
      }
    }
    if (!site) {
      return errorResponse("Site not found or unauthorized", 404);
    }
    let settings = {};
    try {
      if (site.settings)
        settings = JSON.parse(site.settings);
    } catch (e) {
    }
    settings.adminVerificationCode = verificationCode;
    await env.DB.prepare(
      `UPDATE sites SET settings = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(settings), siteId).run();
    return successResponse(null, "Admin verification code set successfully");
  } catch (error) {
    console.error("Set site admin code error:", error);
    return errorResponse("Failed to set verification code", 500);
  }
}
async function autoLoginSiteAdmin(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const user = await validateAuth(request, env);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }
    const { siteId } = await request.json();
    if (!siteId) {
      return errorResponse("Site ID is required");
    }
    const site = await env.DB.prepare(
      "SELECT id, subdomain, brand_name FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (!site) {
      return errorResponse("Site not found or unauthorized", 404);
    }
    const adminToken = generateToken(32);
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    await ensureSiteAdminSessionsTable(env);
    await env.DB.prepare(
      `INSERT INTO site_admin_sessions (id, site_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), site.id, adminToken, expiresAt.toISOString()).run();
    return successResponse({
      token: adminToken,
      siteId: site.id,
      subdomain: site.subdomain,
      brandName: site.brand_name,
      expiresAt: expiresAt.toISOString()
    }, "Auto-login token generated");
  } catch (error) {
    console.error("Auto-login site admin error:", error);
    return errorResponse("Auto-login failed", 500);
  }
}
async function ensureSiteAdminSessionsTable(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_admin_sessions (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `).run();
    await env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_site_admin_sessions_token ON site_admin_sessions(token)"
    ).run();
    await env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_site_admin_sessions_site ON site_admin_sessions(site_id)"
    ).run();
  } catch (error) {
    console.error("Error ensuring site_admin_sessions table:", error);
  }
}
async function validateSiteAdmin(request, env, siteId) {
  const user = await validateAuth(request, env);
  if (user) {
    const site = await env.DB.prepare(
      "SELECT id FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (site)
      return { type: "owner", userId: user.id };
  }
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("SiteAdmin ")) {
    const token = authHeader.substring(10);
    try {
      await ensureSiteAdminSessionsTable(env);
      const session = await env.DB.prepare(
        `SELECT id, site_id FROM site_admin_sessions 
         WHERE token = ? AND site_id = ? AND expires_at > datetime('now')`
      ).bind(token, siteId).first();
      if (session)
        return { type: "site-admin", siteId: session.site_id };
    } catch (error) {
      console.error("Site admin validation error:", error);
    }
  }
  return null;
}
var init_site_admin_worker = __esm({
  "workers/storefront/site-admin-worker.js"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_helpers();
    init_auth();
    __name(handleSiteAdmin, "handleSiteAdmin");
    __name(verifySiteAdminCode, "verifySiteAdminCode");
    __name(validateSiteAdminToken, "validateSiteAdminToken");
    __name(setSiteAdminCode, "setSiteAdminCode");
    __name(autoLoginSiteAdmin, "autoLoginSiteAdmin");
    __name(ensureSiteAdminSessionsTable, "ensureSiteAdminSessionsTable");
    __name(validateSiteAdmin, "validateSiteAdmin");
  }
});

// .wrangler/tmp/bundle-k9n61Q/middleware-loader.entry.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// .wrangler/tmp/bundle-k9n61Q/middleware-insertion-facade.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// workers/index.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// workers/platform/auth-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// workers/platform/email-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();

// utils/email.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
async function sendEmail(env, to, subject, html, text) {
  try {
    if (env.RESEND_API_KEY) {
      const apiKey = env.RESEND_API_KEY.trim();
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL || "noreply@fluxe.in",
          to: typeof to === "string" ? [to] : to,
          subject,
          html,
          text
        })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Resend error:", body);
        return body.message || body.error || "Resend API error";
      }
      return true;
    }
    if (env.SENDGRID_API_KEY) {
      const toList = typeof to === "string" ? [{ email: to }] : to.map((e) => ({ email: e }));
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          personalizations: [{ to: toList }],
          from: { email: env.FROM_EMAIL || "noreply@fluxe.in" },
          subject,
          content: [
            { type: "text/plain", value: text },
            { type: "text/html", value: html }
          ]
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("SendGrid error:", errorText);
        return errorText || "SendGrid API error";
      }
      return true;
    }
    console.log("No email provider configured. Email would be sent to:", to);
    console.log("Subject:", subject);
    return true;
  } catch (error) {
    console.error("Send email error:", error);
    return error.message || "Unknown email sending error";
  }
}
__name(sendEmail, "sendEmail");
function buildOrderConfirmationEmail(order, brandName, ownerEmail) {
  const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
  const itemsHtml = items.map((item) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">&#8377;${Number(item.price).toFixed(2)}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">&#8377;${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
    </tr>
  `).join("");
  const shippingAddress = typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address || order.shippingAddress;
  const addressHtml = shippingAddress ? `
    <div style="margin-top: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Address</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #333;">
        ${shippingAddress.name || order.customer_name || ""}<br>
        ${shippingAddress.address || ""}<br>
        ${shippingAddress.city || ""}, ${shippingAddress.state || ""} ${shippingAddress.pinCode || shippingAddress.pin_code || ""}<br>
        ${shippingAddress.phone || order.customer_phone || ""}
      </p>
    </div>
  ` : "";
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${brandName || "Your Store"}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; background: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <span style="font-size: 28px;">&#10003;</span>
            </div>
            <h2 style="margin: 0 0 4px; font-size: 22px; color: #0f172a;">Order Confirmed!</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || order.orderNumber || ""}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                <th style="padding: 12px 16px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
                <th style="padding: 12px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; padding: 16px; background: #f8f9fa; border-radius: 8px; margin-top: 16px;">
            <span style="font-size: 18px; font-weight: 700; color: #0f172a;">Total: &#8377;${Number(order.total).toFixed(2)}</span>
          </div>

          <div style="margin-top: 16px; padding: 12px 16px; background: #eff6ff; border-radius: 8px; font-size: 14px; color: #1e40af;">
            Payment Method: <strong>${order.payment_method === "cod" || order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</strong>
          </div>

          ${addressHtml}

          <p style="margin-top: 24px; color: #64748b; font-size: 14px; line-height: 1.6;">Your order is now being prepared. We'll update you once it's on its way. For any queries, reach out to us at ${ownerEmail ? `<a href="mailto:${ownerEmail}" style="color:#0f172a;">${ownerEmail}</a>` : brandName || "the store"}.</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || "us"}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Order Confirmation

Thank you for your order!
Order Number: ${order.order_number || order.orderNumber}
Total: Rs.${Number(order.total).toFixed(2)}
Payment: ${order.payment_method === "cod" || order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}

Your order is now being prepared.`;
  return { html, text };
}
__name(buildOrderConfirmationEmail, "buildOrderConfirmationEmail");
function buildCancellationCustomerEmail(order, brandName, reason, ownerEmail) {
  const contactLine = ownerEmail ? `For any questions or to request a refund, please contact us at <a href="mailto:${ownerEmail}" style="color:#c0392b;">${ownerEmail}</a>.` : "For any questions or to request a refund, please reply to this email.";
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #c0392b; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || "Your Store"}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; background: #fde8e8; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
              <span style="font-size: 28px;">&#10007;</span>
            </div>
            <h2 style="margin: 0 0 4px; font-size: 22px; color: #0f172a;">Order Cancelled</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || order.orderNumber || ""}</p>
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || "Customer"},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">We're sorry to inform you that your order has been cancelled.</p>
          <div style="margin: 24px 0; padding: 16px; background: #fff5f5; border-left: 4px solid #c0392b; border-radius: 4px;">
            <div style="font-size: 13px; color: #888; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Cancellation Reason</div>
            <div style="font-size: 15px; color: #333;">${reason || "No reason provided"}</div>
          </div>
          <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555;">
            <strong>Order Total:</strong> &#8377;${Number(order.total || 0).toFixed(2)}<br>
            <strong>Payment Method:</strong> ${order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}
          </div>
          <p style="margin-top: 24px; color: #64748b; font-size: 14px; line-height: 1.6;">If you paid online and a refund is applicable, it will be processed within 5\u20137 business days. ${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || "us"}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Order Cancelled

Your order #${order.order_number || order.orderNumber} has been cancelled.
Reason: ${reason || "No reason provided"}
Total: Rs.${Number(order.total || 0).toFixed(2)}

${ownerEmail ? "Contact us at: " + ownerEmail : "Please reply to this email for any queries."}`;
  return { html, text };
}
__name(buildCancellationCustomerEmail, "buildCancellationCustomerEmail");
function buildDeliveryCustomerEmail(order, brandName, ownerEmail) {
  let items = [];
  try {
    items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
    if (!Array.isArray(items))
      items = [];
  } catch (_) {
    items = [];
  }
  const itemsHtml = items.map((item) => `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">&#8377;${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
    </tr>
  `).join("");
  const contactLine = ownerEmail ? `If you have any issues with your order, contact us at <a href="mailto:${ownerEmail}" style="color:#27ae60;">${ownerEmail}</a>.` : "If you have any issues with your order, please reply to this email.";
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #27ae60; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || "Your Store"}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 52px; margin-bottom: 12px;">\u{1F4E6}</div>
            <h2 style="margin: 0 0 6px; font-size: 24px; color: #0f172a;">Your Order Has Been Delivered!</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || ""}</p>
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || "Customer"}, we hope you love your purchase! \u{1F389}</p>
          ${items.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Product</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Qty</th>
                <th style="padding: 10px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="text-align: right; padding: 12px 16px; background: #f0fdf4; border-radius: 8px; font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 24px;">
            Total Paid: &#8377;${Number(order.total || 0).toFixed(2)}
          </div>` : ""}
          <div style="margin: 24px 0; padding: 20px; background: #f0fdf4; border-radius: 10px; text-align: center;">
            <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #166534;">Enjoying your purchase?</p>
            <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">We'd love to hear from you! Share your experience and leave a review \u2014 your feedback helps us serve you better and helps other shoppers make great choices.</p>
          </div>
          <p style="margin-top: 20px; color: #64748b; font-size: 14px; line-height: 1.6;">${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || "us"}! We look forward to serving you again.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Your order #${order.order_number} has been delivered!

We hope you love your purchase. We'd love to hear your feedback \u2014 please leave a review!

Total Paid: Rs.${Number(order.total || 0).toFixed(2)}

${ownerEmail ? "For any issues, contact: " + ownerEmail : ""}`;
  return { html, text };
}
__name(buildDeliveryCustomerEmail, "buildDeliveryCustomerEmail");
function buildDeliveryOwnerEmail(order, brandName) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #1a6b3a; color: #ffffff; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Order Delivered \u2713</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${brandName || "Your Store"} \u2013 Order #${order.order_number || ""}</p>
        </div>
        <div style="padding: 24px 32px;">
          <p style="color: #333; font-size: 15px;">Order <strong>#${order.order_number || ""}</strong> has been marked as delivered.</p>
          <div style="padding: 12px 16px; background: #f0fdf4; border-radius: 8px; font-size: 14px; line-height: 1.8; margin-top: 16px;">
            <strong>Customer:</strong> ${order.customer_name || "N/A"}<br>
            <strong>Email:</strong> ${order.customer_email || "N/A"}<br>
            <strong>Phone:</strong> ${order.customer_phone || "N/A"}<br>
            <strong>Total:</strong> &#8377;${Number(order.total || 0).toFixed(2)}<br>
            <strong>Payment:</strong> ${order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}
          </div>
          <p style="margin-top: 20px; color: #64748b; font-size: 14px;">The customer has been notified and prompted to leave a review. Keep up the great work!</p>
        </div>
        <div style="background: #f8f9fa; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">This is an automated notification from ${brandName || "Fluxe"}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Order Delivered

Order #${order.order_number} has been marked as delivered.
Customer: ${order.customer_name || ""}
Total: Rs.${Number(order.total || 0).toFixed(2)}`;
  return { html, text };
}
__name(buildDeliveryOwnerEmail, "buildDeliveryOwnerEmail");
function buildCancellationOwnerEmail(order, brandName, reason) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #7f1d1d; color: #ffffff; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Order Cancelled</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${brandName || "Your Store"} - Order #${order.order_number || order.orderNumber || ""}</p>
        </div>
        <div style="padding: 24px 32px;">
          <p style="color: #333; font-size: 15px;">An order has been marked as cancelled.</p>
          <div style="margin: 20px 0; padding: 16px; background: #fff5f5; border-left: 4px solid #c0392b; border-radius: 4px;">
            <div style="font-size: 13px; color: #888; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">Cancellation Reason</div>
            <div style="font-size: 15px; color: #333;">${reason || "No reason provided"}</div>
          </div>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.8;">
            <strong>Order #:</strong> ${order.order_number || order.orderNumber || ""}<br>
            <strong>Customer:</strong> ${order.customer_name || "N/A"}<br>
            <strong>Email:</strong> ${order.customer_email || "N/A"}<br>
            <strong>Phone:</strong> ${order.customer_phone || "N/A"}<br>
            <strong>Total:</strong> &#8377;${Number(order.total || 0).toFixed(2)}
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">This is an automated notification from ${brandName || "Fluxe"}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Order Cancelled

Order #${order.order_number || order.orderNumber} has been cancelled.
Reason: ${reason || "No reason provided"}
Customer: ${order.customer_name || ""}
Total: Rs.${Number(order.total || 0).toFixed(2)}`;
  return { html, text };
}
__name(buildCancellationOwnerEmail, "buildCancellationOwnerEmail");
function buildOwnerNotificationEmail(order, brandName) {
  const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
  const itemsHtml = items.map((item) => `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px;">&#8377;${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
    </tr>
  `).join("");
  const shippingAddress = typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address || order.shippingAddress;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #059669; color: #ffffff; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">New Order Received!</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${brandName || "Your Store"} - Order #${order.order_number || order.orderNumber || ""}</p>
        </div>
        <div style="padding: 24px 32px;">
          <div style="display: flex; gap: 16px; margin-bottom: 20px;">
            <div style="padding: 12px 16px; background: #f0fdf4; border-radius: 8px; flex: 1;">
              <div style="font-size: 12px; color: #059669; text-transform: uppercase; font-weight: 600;">Total Amount</div>
              <div style="font-size: 22px; font-weight: 700; color: #0f172a;">&#8377;${Number(order.total).toFixed(2)}</div>
            </div>
          </div>

          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Customer Details</h3>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.8;">
            <strong>Name:</strong> ${order.customer_name || shippingAddress && shippingAddress.name || "N/A"}<br>
            <strong>Email:</strong> ${order.customer_email || shippingAddress && shippingAddress.email || "N/A"}<br>
            <strong>Phone:</strong> ${order.customer_phone || shippingAddress && shippingAddress.phone || "N/A"}<br>
            <strong>Payment:</strong> ${order.payment_method === "cod" || order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
          </div>

          ${shippingAddress ? `
          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Shipping Address</h3>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.6;">
            ${shippingAddress.address || ""}<br>
            ${shippingAddress.city || ""}, ${shippingAddress.state || ""} ${shippingAddress.pinCode || shippingAddress.pin_code || ""}
          </div>
          ` : ""}

          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Product</th>
                <th style="padding: 10px 16px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Qty</th>
                <th style="padding: 10px 16px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
        <div style="background: #f8f9fa; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">This is an automated notification from ${brandName || "Fluxe"}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `New Order Received!

Order #${order.order_number || order.orderNumber}
Total: Rs.${Number(order.total).toFixed(2)}
Customer: ${order.customer_name || ""}
Phone: ${order.customer_phone || ""}
Payment: ${order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}`;
  return { html, text };
}
__name(buildOwnerNotificationEmail, "buildOwnerNotificationEmail");

// workers/platform/email-worker.js
async function handleEmail(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  switch (action) {
    case "order-confirmation":
      return sendOrderConfirmation(request, env);
    case "verification":
      return sendVerificationEmail(request, env);
    case "password-reset":
      return sendPasswordResetEmail(request, env);
    case "contact":
      return sendContactEmail(request, env);
    case "appointment":
      return sendAppointmentEmail(request, env);
    case "test":
      return sendTestEmail(request, env);
    default:
      return errorResponse("Not found", 404);
  }
}
__name(handleEmail, "handleEmail");
async function sendTestEmail(request, env) {
  const { email } = await request.json();
  if (!email)
    return errorResponse("Email is required");
  const html = `<h3>Test Email</h3><p>This is a test email from Fluxe.</p>`;
  const text = `Test Email from Fluxe`;
  const sent = await sendEmail2(env, email, "Fluxe Test Email", html, text);
  if (!sent)
    return errorResponse("Failed to send test email", 500);
  return successResponse(null, "Test email sent");
}
__name(sendTestEmail, "sendTestEmail");
async function sendEmail2(env, to, subject, html, text) {
  return sendEmail(env, to, subject, html, text);
}
__name(sendEmail2, "sendEmail");
async function sendOrderConfirmation(request, env) {
  try {
    const { order, customerEmail, brandName } = await request.json();
    if (!order || !customerEmail) {
      return errorResponse("Order and customer email are required");
    }
    const { html, text } = buildOrderConfirmationEmail(order, brandName);
    const orderNum = order.order_number || order.orderNumber || "";
    const sent = await sendEmail2(env, customerEmail, `Order Confirmation - ${orderNum}`, html, text);
    if (sent !== true) {
      return errorResponse("Failed to send email", 500);
    }
    return successResponse(null, "Order confirmation sent");
  } catch (error) {
    console.error("Send order confirmation error:", error);
    return errorResponse("Failed to send email", 500);
  }
}
__name(sendOrderConfirmation, "sendOrderConfirmation");
async function sendVerificationEmail(request, env) {
  try {
    const { email, token, name, verifyUrl } = await request.json();
    if (!email || !token) {
      return errorResponse("Email and token are required");
    }
    const url = verifyUrl || `${env.APP_URL}${env.VERIFY_PATH || "/src/pages/verify-email.html"}?token=${token}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Verify Your Email</h2>
          <p>Hi ${name || "there"},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${url}" class="button">Verify Email</a>
          <p>Or copy and paste this link: ${url}</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      </body>
      </html>
    `;
    const text = `Verify Your Email

Hi ${name || "there"},

Please verify your email by visiting: ${url}

This link will expire in 24 hours.`;
    const sent = await sendEmail2(env, email, "Verify Your Email", html, text);
    if (sent !== true) {
      return jsonResponse({
        success: false,
        error: typeof sent === "string" ? sent : "Failed to send verification email",
        code: "EMAIL_PROVIDER_ERROR"
      }, 500);
    }
    return successResponse(null, "Verification email sent");
  } catch (error) {
    console.error("Send verification email error:", error);
    return errorResponse("Failed to send email", 500);
  }
}
__name(sendVerificationEmail, "sendVerificationEmail");
async function sendPasswordResetEmail(request, env) {
  try {
    const { email, token, resetUrl } = await request.json();
    if (!email || !token) {
      return errorResponse("Email and token are required");
    }
    const url = resetUrl || `${env.APP_URL}${env.RESET_PATH || "/src/pages/reset-password.html"}?token=${token}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Reset Your Password</h2>
          <p>You requested a password reset. Click the button below to set a new password:</p>
          <a href="${url}" class="button">Reset Password</a>
          <p>Or copy and paste this link: ${url}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      </body>
      </html>
    `;
    const text = `Reset Your Password

You requested a password reset. Visit this link to set a new password: ${url}

This link will expire in 1 hour.

If you didn't request this, you can safely ignore this email.`;
    const sent = await sendEmail2(env, email, "Reset Your Password", html, text);
    if (sent !== true) {
      return jsonResponse({
        success: false,
        error: typeof sent === "string" ? sent : "Failed to send password reset email",
        code: "EMAIL_PROVIDER_ERROR"
      }, 500);
    }
    return successResponse(null, "Password reset email sent");
  } catch (error) {
    console.error("Send password reset email error:", error);
    return errorResponse("Failed to send email", 500);
  }
}
__name(sendPasswordResetEmail, "sendPasswordResetEmail");
async function sendContactEmail(request, env) {
  try {
    const { name, email, phone, message, siteEmail, brandName } = await request.json();
    if (!name || !email || !message) {
      return errorResponse("Name, email and message are required");
    }
    const toEmail = siteEmail || env.CONTACT_EMAIL;
    if (!toEmail) {
      return errorResponse("No contact email configured", 500);
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>New Contact Form Submission</h2>
          <div class="field"><span class="label">Name:</span> ${name}</div>
          <div class="field"><span class="label">Email:</span> ${email}</div>
          ${phone ? `<div class="field"><span class="label">Phone:</span> ${phone}</div>` : ""}
          <div class="field"><span class="label">Message:</span></div>
          <p>${message}</p>
        </div>
      </body>
      </html>
    `;
    const text = `New Contact Form Submission

Name: ${name}
Email: ${email}${phone ? `
Phone: ${phone}` : ""}

Message:
${message}`;
    const sent = await sendEmail2(env, toEmail, `Contact Form - ${brandName || "Website"}`, html, text);
    if (!sent) {
      return errorResponse("Failed to send email", 500);
    }
    return successResponse(null, "Contact form submitted");
  } catch (error) {
    console.error("Send contact email error:", error);
    return errorResponse("Failed to send email", 500);
  }
}
__name(sendContactEmail, "sendContactEmail");
async function sendAppointmentEmail(request, env) {
  try {
    const { name, email, phone, date, time, notes, siteEmail, brandName } = await request.json();
    if (!name || !email || !date) {
      return errorResponse("Name, email and date are required");
    }
    const toEmail = siteEmail || env.CONTACT_EMAIL;
    if (!toEmail) {
      return errorResponse("No contact email configured", 500);
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>New Appointment Request</h2>
          <div class="field"><span class="label">Name:</span> ${name}</div>
          <div class="field"><span class="label">Email:</span> ${email}</div>
          ${phone ? `<div class="field"><span class="label">Phone:</span> ${phone}</div>` : ""}
          <div class="field"><span class="label">Preferred Date:</span> ${date}</div>
          ${time ? `<div class="field"><span class="label">Preferred Time:</span> ${time}</div>` : ""}
          ${notes ? `<div class="field"><span class="label">Notes:</span> ${notes}</div>` : ""}
        </div>
      </body>
      </html>
    `;
    const text = `New Appointment Request

Name: ${name}
Email: ${email}${phone ? `
Phone: ${phone}` : ""}
Preferred Date: ${date}${time ? `
Preferred Time: ${time}` : ""}${notes ? `

Notes: ${notes}` : ""}`;
    const sent = await sendEmail2(env, toEmail, `Appointment Request - ${brandName || "Website"}`, html, text);
    if (!sent) {
      return errorResponse("Failed to send email", 500);
    }
    return successResponse(null, "Appointment request submitted");
  } catch (error) {
    console.error("Send appointment email error:", error);
    return errorResponse("Failed to send email", 500);
  }
}
__name(sendAppointmentEmail, "sendAppointmentEmail");

// workers/platform/auth-worker.js
init_helpers();
init_auth();
async function handleAuth(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const action = path.split("/").pop();
  switch (action) {
    case "signup":
      return handleSignup(request, env);
    case "login":
      return handleLogin(request, env);
    case "google":
      return handleGoogleLogin(request, env);
    case "resend-verification":
      return handleResendVerification(request, env);
    case "logout":
      return handleLogout(request, env);
    case "verify-email":
      return handleVerifyEmail(request, env);
    case "send-verification":
      return handleSendVerification(request, env);
    case "reset-password":
      return handleResetPassword(request, env);
    case "request-reset":
      return handleRequestReset(request, env);
    case "me":
      return handleGetCurrentUser(request, env);
    case "update-profile":
      return handleUpdateProfile(request, env);
    default:
      return errorResponse("Not found", 404);
  }
}
__name(handleAuth, "handleAuth");
async function handleSignup(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    await ensureAuthTables(env);
    const { name, email, password, phone } = await request.json();
    if (!name || !email || !password) {
      return errorResponse("Name, email and password are required");
    }
    if (!validateEmail(email)) {
      return errorResponse("Invalid email format");
    }
    if (password.length < 8) {
      return errorResponse("Password must be at least 8 characters");
    }
    const existingUser = await env.DB.prepare(
      "SELECT id, password_hash FROM users WHERE email = ?"
    ).bind(email.toLowerCase()).first();
    if (existingUser) {
      if (existingUser.password_hash === null || existingUser.password_hash === void 0 || existingUser.password_hash === "") {
        return errorResponse("This email is already registered via Google sign-in. Please log in with Google.", 400, "USE_GOOGLE_LOGIN");
      }
      return errorResponse("Email already registered", 400, "EMAIL_EXISTS");
    }
    const userId = generateId();
    const passwordHash = await hashPassword(password);
    const verificationToken = generateToken();
    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, name, phone, email_verified, created_at)
       VALUES (?, ?, ?, ?, ?, 0, datetime('now'))`
    ).bind(userId, email.toLowerCase(), passwordHash, sanitizeInput(name), phone || null).run();
    await env.DB.prepare(
      `INSERT INTO email_verifications (id, user_id, token, expires_at)
       VALUES (?, ?, ?, ?)`
    ).bind(generateId(), userId, verificationToken, getExpiryDate(24)).run();
    const emailResponse = await handleEmail(new Request(`${env.APP_URL || ""}/api/email/verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.toLowerCase(),
        token: verificationToken,
        name: sanitizeInput(name),
        verifyUrl: `${env.APP_URL}/verify-email?token=${verificationToken}`
      })
    }), env, "/api/email/verification");
    const emailBody = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok || emailBody.success === false) {
      return jsonResponse({
        success: false,
        error: emailBody.error || "Verification email failed",
        code: "EMAIL_SEND_FAILED",
        details: emailBody
      }, 500, request);
    }
    return successResponse({
      user: {
        id: userId,
        email: email.toLowerCase(),
        name: sanitizeInput(name),
        emailVerified: false
      }
    }, "Account created. Please verify your email.");
  } catch (error) {
    console.error("Signup error:", error);
    return errorResponse("Failed to create account", 500);
  }
}
__name(handleSignup, "handleSignup");
async function ensureAuthTables(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
    console.log("Auth tables verified/created");
  } catch (error) {
    console.error("Error ensuring auth tables:", error);
  }
}
__name(ensureAuthTables, "ensureAuthTables");
async function handleLogin(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    await ensureAuthTables(env);
    const { email, password } = await request.json();
    if (!email || !password) {
      return errorResponse("Email and password are required");
    }
    const user = await env.DB.prepare(
      "SELECT id, email, password_hash, name, email_verified FROM users WHERE email = ?"
    ).bind(email.toLowerCase()).first();
    if (!user) {
      console.error("Login: User not found:", email.toLowerCase());
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    if (!user.password_hash) {
      return errorResponse("This account uses Google sign-in. Please log in with Google.", 401, "USE_GOOGLE_LOGIN");
    }
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      console.error("Login: Invalid password for:", email.toLowerCase());
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    if (!user.email_verified) {
      return errorResponse("Please verify your email", 401, "EMAIL_NOT_VERIFIED");
    }
    const token = await generateJWT({ userId: user.id, email: user.email }, env.JWT_SECRET || "your-secret-key");
    const sessionId = generateId();
    await env.DB.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at)
       VALUES (?, ?, ?, ?)`
    ).bind(sessionId, user.id, token, getExpiryDate(24 * 7)).run();
    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: !!user.email_verified
      },
      token
    }, "Login successful");
    response.headers.set("Set-Cookie", `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`);
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("Login failed", 500);
  }
}
__name(handleLogin, "handleLogin");
async function handleLogout(request, env) {
  try {
    const user = await validateAuth(request, env);
    if (user) {
      await env.DB.prepare(
        "DELETE FROM sessions WHERE user_id = ?"
      ).bind(user.id).run();
    }
    const response = successResponse(null, "Logged out successfully");
    response.headers.set("Set-Cookie", "auth_token=; Path=/; HttpOnly; Max-Age=0");
    return response;
  } catch (error) {
    return errorResponse("Logout failed", 500);
  }
}
__name(handleLogout, "handleLogout");
async function handleVerifyEmail(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { token } = await request.json();
    if (!token) {
      return errorResponse("Verification token is required");
    }
    const verification = await env.DB.prepare(
      `SELECT user_id, expires_at FROM email_verifications WHERE token = ?`
    ).bind(token).first();
    if (!verification) {
      return errorResponse("Invalid verification token", 400, "INVALID_TOKEN");
    }
    if (new Date(verification.expires_at) < /* @__PURE__ */ new Date()) {
      return errorResponse("Verification token has expired", 400, "TOKEN_EXPIRED");
    }
    await env.DB.prepare(
      'UPDATE users SET email_verified = 1, updated_at = datetime("now") WHERE id = ?'
    ).bind(verification.user_id).run();
    await env.DB.prepare(
      "DELETE FROM email_verifications WHERE user_id = ?"
    ).bind(verification.user_id).run();
    return successResponse(null, "Email verified successfully");
  } catch (error) {
    console.error("Verify email error:", error);
    return errorResponse("Verification failed", 500);
  }
}
__name(handleVerifyEmail, "handleVerifyEmail");
async function handleSendVerification(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const user = await validateAuth(request, env);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }
    if (user.email_verified) {
      return errorResponse("Email already verified", 400);
    }
    await env.DB.prepare(
      "DELETE FROM email_verifications WHERE user_id = ?"
    ).bind(user.id).run();
    const verificationToken = generateToken();
    await env.DB.prepare(
      `INSERT INTO email_verifications (id, user_id, token, expires_at)
       VALUES (?, ?, ?, ?)`
    ).bind(generateId(), user.id, verificationToken, getExpiryDate(24)).run();
    return successResponse({ verificationToken }, "Verification email sent");
  } catch (error) {
    console.error("Send verification error:", error);
    return errorResponse("Failed to send verification", 500);
  }
}
__name(handleSendVerification, "handleSendVerification");
async function handleRequestReset(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    await ensureAuthTables(env);
    const { email } = await request.json();
    if (!email) {
      return errorResponse("Email is required");
    }
    const user = await env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(email.toLowerCase()).first();
    if (!user) {
      return successResponse(null, "If email exists, reset link will be sent");
    }
    await env.DB.prepare(
      "DELETE FROM password_resets WHERE user_id = ?"
    ).bind(user.id).run();
    const resetToken = generateToken();
    await env.DB.prepare(
      `INSERT INTO password_resets (id, user_id, token, expires_at)
       VALUES (?, ?, ?, ?)`
    ).bind(generateId(), user.id, resetToken, getExpiryDate(1)).run();
    const emailResponse = await handleEmail(new Request(`${env.APP_URL || ""}/api/email/password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.toLowerCase(),
        token: resetToken,
        resetUrl: `${env.APP_URL}${env.RESET_PATH || "/src/pages/reset-password.html"}?token=${resetToken}`
      })
    }), env, "/api/email/password-reset");
    const emailBody = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok || emailBody.success === false) {
      return jsonResponse({
        success: false,
        error: emailBody.error || "Password reset email failed",
        code: "EMAIL_SEND_FAILED",
        details: emailBody
      }, 500, request);
    }
    return successResponse({ resetToken }, "Password reset link sent");
  } catch (error) {
    console.error("Request reset error:", error);
    return errorResponse("Failed to process reset request", 500);
  }
}
__name(handleRequestReset, "handleRequestReset");
async function handleResetPassword(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { token, newPassword } = await request.json();
    if (!token || !newPassword) {
      return errorResponse("Token and new password are required");
    }
    if (newPassword.length < 8) {
      return errorResponse("Password must be at least 8 characters");
    }
    const reset = await env.DB.prepare(
      `SELECT user_id, expires_at, used FROM password_resets WHERE token = ?`
    ).bind(token).first();
    if (!reset) {
      return errorResponse("Invalid reset token", 400, "INVALID_TOKEN");
    }
    if (reset.used) {
      return errorResponse("Reset token already used", 400, "TOKEN_USED");
    }
    if (new Date(reset.expires_at) < /* @__PURE__ */ new Date()) {
      return errorResponse("Reset token has expired", 400, "TOKEN_EXPIRED");
    }
    const passwordHash = await hashPassword(newPassword);
    await env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(passwordHash, reset.user_id).run();
    await env.DB.prepare(
      "UPDATE password_resets SET used = 1 WHERE token = ?"
    ).bind(token).run();
    await env.DB.prepare(
      "DELETE FROM sessions WHERE user_id = ?"
    ).bind(reset.user_id).run();
    return successResponse(null, "Password reset successfully");
  } catch (error) {
    console.error("Reset password error:", error);
    return errorResponse("Failed to reset password", 500);
  }
}
__name(handleResetPassword, "handleResetPassword");
async function handleGetCurrentUser(request, env) {
  try {
    const user = await validateAuth(request, env);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }
    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: !!user.email_verified
    });
  } catch (error) {
    return errorResponse("Failed to get user", 500);
  }
}
__name(handleGetCurrentUser, "handleGetCurrentUser");
async function handleResendVerification(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { email } = await request.json();
    if (!email)
      return errorResponse("Email is required");
    const user = await env.DB.prepare(
      "SELECT id, name, email_verified FROM users WHERE email = ?"
    ).bind(email.toLowerCase()).first();
    if (!user)
      return successResponse(null, "If account exists, verification email sent");
    if (user.email_verified)
      return errorResponse("Email already verified");
    await env.DB.prepare("DELETE FROM email_verifications WHERE user_id = ?").bind(user.id).run();
    const token = generateToken();
    await env.DB.prepare(
      `INSERT INTO email_verifications (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`
    ).bind(generateId(), user.id, token, getExpiryDate(24)).run();
    const emailResponse = await handleEmail(new Request(`${env.APP_URL || ""}/api/email/verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.toLowerCase(),
        token,
        name: user.name,
        verifyUrl: `${env.APP_URL}/verify-email?token=${token}`
      })
    }), env, "/api/email/verification");
    const emailBody = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok || emailBody.success === false) {
      return jsonResponse({
        success: false,
        error: emailBody.error || "Verification email failed",
        code: "EMAIL_SEND_FAILED",
        details: emailBody
      }, 500, request);
    }
    return successResponse(null, "Verification email sent");
  } catch (error) {
    return errorResponse("Failed to resend verification", 500);
  }
}
__name(handleResendVerification, "handleResendVerification");
async function handleGoogleLogin(request, env) {
  if (request.method !== "POST")
    return errorResponse("Method not allowed", 405);
  try {
    const { credential } = await request.json();
    if (!credential)
      return errorResponse("Credential is required", 400);
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await googleRes.json();
    if (!googleRes.ok) {
      console.error("Google token validation failed:", payload);
      return errorResponse(payload.error_description || "Invalid Google token", 401);
    }
    const clientId = env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("GOOGLE_CLIENT_ID not set in environment");
      return errorResponse("Server configuration error", 500);
    }
    if (payload.aud !== clientId) {
      console.error("Audience mismatch. Expected:", clientId, "Got:", payload.aud);
      return errorResponse("Invalid client ID", 401);
    }
    const email = payload.email.toLowerCase();
    let user = await env.DB.prepare("SELECT id, email, name, password_hash, email_verified FROM users WHERE email = ?").bind(email).first();
    if (!user) {
      const userId = generateId();
      await env.DB.prepare(
        'INSERT INTO users (id, email, password_hash, name, email_verified, created_at) VALUES (?, ?, ?, ?, 1, datetime("now"))'
      ).bind(userId, email, "", payload.name).run();
      user = { id: userId, email, name: payload.name, email_verified: 1 };
    } else {
      if (!user.email_verified) {
        await env.DB.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").bind(user.id).run();
        user.email_verified = 1;
      }
    }
    const token = await generateJWT({ userId: user.id, email: user.email }, env.JWT_SECRET);
    const sessionId = generateId();
    await env.DB.prepare(
      "INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)"
    ).bind(sessionId, user.id, token, getExpiryDate(24 * 7)).run();
    const response = successResponse({ user, token }, "Google login successful");
    response.headers.set("Set-Cookie", `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`);
    return response;
  } catch (error) {
    console.error("Google login error:", error);
    return errorResponse(error.message || "Google login failed", 500);
  }
}
__name(handleGoogleLogin, "handleGoogleLogin");
async function handleUpdateProfile(request, env) {
  if (request.method !== "PUT" && request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const user = await validateAuth(request, env);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }
    const { name, phone } = await request.json();
    await env.DB.prepare(
      `UPDATE users SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(name ? sanitizeInput(name) : null, phone || null, user.id).run();
    const updatedUser = await env.DB.prepare(
      "SELECT id, email, name, phone, email_verified FROM users WHERE id = ?"
    ).bind(user.id).first();
    return successResponse(updatedUser, "Profile updated successfully");
  } catch (error) {
    console.error("Update profile error:", error);
    return errorResponse("Failed to update profile", 500);
  }
}
__name(handleUpdateProfile, "handleUpdateProfile");

// workers/platform/sites-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
init_site_admin_worker();

// utils/cloudflare.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var CF_API_BASE = "https://api.cloudflare.com/client/v4";
function cfHeaders(apiToken) {
  return {
    "Authorization": `Bearer ${apiToken}`,
    "Content-Type": "application/json"
  };
}
__name(cfHeaders, "cfHeaders");
async function registerCustomHostname(env, hostname) {
  const token = env.CF_API_TOKEN;
  const zoneId = env.CF_ZONE_ID;
  if (!token || !zoneId) {
    console.warn("CF_API_TOKEN or CF_ZONE_ID not configured \u2014 skipping Cloudflare hostname registration");
    return { success: false, reason: "not_configured" };
  }
  const res = await fetch(`${CF_API_BASE}/zones/${zoneId}/custom_hostnames`, {
    method: "POST",
    headers: cfHeaders(token),
    body: JSON.stringify({
      hostname,
      ssl: {
        method: "http",
        type: "dv",
        settings: {
          http2: "on",
          min_tls_version: "1.2",
          tls_1_3: "on"
        }
      }
    })
  });
  const data = await res.json();
  if (!res.ok) {
    const errMsg = data?.errors?.[0]?.message || "Unknown Cloudflare API error";
    if (data?.errors?.[0]?.code === 1406) {
      return findCustomHostname(env, hostname);
    }
    console.error("Cloudflare registerCustomHostname error:", errMsg);
    return { success: false, reason: errMsg };
  }
  return { success: true, cfHostnameId: data.result.id };
}
__name(registerCustomHostname, "registerCustomHostname");
async function findCustomHostname(env, hostname) {
  const token = env.CF_API_TOKEN;
  const zoneId = env.CF_ZONE_ID;
  if (!token || !zoneId)
    return { success: false, reason: "not_configured" };
  const res = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
    { headers: cfHeaders(token) }
  );
  const data = await res.json();
  if (!res.ok || !data.result?.length) {
    return { success: false, reason: "not_found" };
  }
  return { success: true, cfHostnameId: data.result[0].id };
}
__name(findCustomHostname, "findCustomHostname");
async function deleteCustomHostname(env, cfHostnameId) {
  const token = env.CF_API_TOKEN;
  const zoneId = env.CF_ZONE_ID;
  if (!token || !zoneId) {
    console.warn("CF_API_TOKEN or CF_ZONE_ID not configured \u2014 skipping Cloudflare hostname deletion");
    return { success: false, reason: "not_configured" };
  }
  if (!cfHostnameId) {
    return { success: false, reason: "no_id" };
  }
  const res = await fetch(
    `${CF_API_BASE}/zones/${zoneId}/custom_hostnames/${cfHostnameId}`,
    { method: "DELETE", headers: cfHeaders(token) }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errMsg = data?.errors?.[0]?.message || "Unknown Cloudflare API error";
    console.error("Cloudflare deleteCustomHostname error:", errMsg);
    return { success: false, reason: errMsg };
  }
  return { success: true };
}
__name(deleteCustomHostname, "deleteCustomHostname");

// workers/platform/sites-worker.js
async function handleSites(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const siteId = pathParts[2];
  const subResource = pathParts[3];
  if (siteId && (subResource === "custom-domain" || subResource === "verify-domain")) {
    let authorized = false;
    const user2 = await validateAuth(request, env);
    if (user2) {
      const ownedSite = await env.DB.prepare("SELECT id FROM sites WHERE id = ? AND user_id = ?").bind(siteId, user2.id).first();
      if (ownedSite)
        authorized = true;
    }
    if (!authorized) {
      const siteAdmin = await validateSiteAdmin(request, env, siteId);
      if (!siteAdmin)
        return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (subResource === "custom-domain") {
      if (method === "PUT")
        return handleSetCustomDomain(request, env, siteId);
      if (method === "DELETE")
        return handleRemoveCustomDomain(env, siteId);
      return errorResponse("Method not allowed", 405);
    }
    if (subResource === "verify-domain") {
      if (method === "POST")
        return handleVerifyDomain(env, siteId);
      return errorResponse("Method not allowed", 405);
    }
  }
  if (method === "PUT" && siteId) {
    const user2 = await validateAuth(request, env);
    if (user2) {
      return updateSite(request, env, user2, siteId);
    }
    const siteAdmin = await validateSiteAdmin(request, env, siteId);
    if (siteAdmin) {
      return updateSiteAsAdmin(request, env, siteId);
    }
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  switch (method) {
    case "GET":
      return siteId ? getSite(env, user, siteId) : getUserSites(env, user);
    case "POST":
      return createSite(request, env, user);
    case "DELETE":
      return deleteSite(env, user, siteId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleSites, "handleSites");
async function getUserSites(env, user) {
  try {
    const sites = await env.DB.prepare(
      `SELECT id, subdomain, brand_name, category, template_id, logo_url, 
              primary_color, is_active, subscription_plan, created_at,
              custom_domain, domain_status
       FROM sites 
       WHERE user_id = ? 
       ORDER BY created_at DESC`
    ).bind(user.id).all();
    return successResponse(sites.results);
  } catch (error) {
    console.error("Get sites error:", error);
    return errorResponse("Failed to fetch sites", 500);
  }
}
__name(getUserSites, "getUserSites");
async function getSite(env, user, siteId) {
  try {
    const site = await env.DB.prepare(
      `SELECT * FROM sites WHERE id = ? AND user_id = ?`
    ).bind(siteId, user.id).first();
    if (!site) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    const categories = await env.DB.prepare(
      `SELECT * FROM categories WHERE site_id = ? ORDER BY display_order`
    ).bind(siteId).all();
    return successResponse({ ...site, categories: categories.results });
  } catch (error) {
    console.error("Get site error:", error);
    return errorResponse("Failed to fetch site", 500);
  }
}
__name(getSite, "getSite");
function getDefaultFeaturedVideoSettings(businessCategory) {
  const defaults = {
    jewellery: {
      featuredVideoTitle: "Let's Create Your Perfect Bridal Jewelry",
      featuredVideoDescription: "Dreaming of something truly elegant? Discover our exquisite jewelry collection. Connect with our designers and create your perfect bridal ensemble",
      featuredVideoChatButtonText: "CHAT NOW"
    },
    clothing: {
      featuredVideoTitle: "Discover Your Perfect Style",
      featuredVideoDescription: "Explore our latest fashion collection crafted for every occasion. Connect with our stylists and find the perfect outfit that defines you",
      featuredVideoChatButtonText: "CHAT NOW"
    },
    electronics: {
      featuredVideoTitle: "Experience Next-Gen Technology",
      featuredVideoDescription: "Discover cutting-edge gadgets and smart devices. Connect with our tech experts and find the perfect product for your needs",
      featuredVideoChatButtonText: "CHAT NOW"
    }
  };
  return defaults[businessCategory] || {
    featuredVideoTitle: "Discover Our Collection",
    featuredVideoDescription: "Explore our curated selection of premium products. Connect with us and find exactly what you're looking for",
    featuredVideoChatButtonText: "CHAT NOW"
  };
}
__name(getDefaultFeaturedVideoSettings, "getDefaultFeaturedVideoSettings");
async function createSite(request, env, user) {
  let siteId = null;
  let finalSubdomain = null;
  try {
    const body = await request.json();
    const { brandName, categories, templateId, logoUrl, phone, email, address, primaryColor, secondaryColor } = body;
    const category = body.category || "general";
    const subdomain = (body.subdomain || generateSubdomain(brandName)).toLowerCase().trim();
    if (!brandName) {
      return errorResponse("Brand name is required");
    }
    const existingSubdomain = await env.DB.prepare(
      "SELECT id FROM sites WHERE LOWER(subdomain) = ?"
    ).bind(subdomain).first();
    if (existingSubdomain) {
      return errorResponse("This subdomain is already taken. Please choose a different brand name.", 400, "SUBDOMAIN_TAKEN");
    }
    finalSubdomain = subdomain;
    siteId = generateId();
    const defaultSettings = getDefaultFeaturedVideoSettings(category);
    await env.DB.prepare(
      `INSERT INTO sites (id, user_id, subdomain, brand_name, category, template_id, logo_url, phone, email, address, primary_color, secondary_color, settings, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      siteId,
      user.id,
      finalSubdomain,
      sanitizeInput(brandName),
      category,
      templateId || "template1",
      logoUrl || null,
      phone || null,
      email || null,
      address || null,
      primaryColor || "#000000",
      secondaryColor || "#ffffff",
      JSON.stringify(defaultSettings)
    ).run();
    try {
      if (categories && categories.length > 0) {
        await createUserCategories(env, siteId, categories);
      } else if (category) {
        await createDefaultCategories(env, siteId, category);
      }
    } catch (catError) {
      console.error("Category creation failed, attempting to auto-create table:", catError);
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            site_id TEXT NOT NULL,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            parent_id TEXT,
            description TEXT,
            subtitle TEXT,
            show_on_home INTEGER DEFAULT 1,
            image_url TEXT,
            display_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
            UNIQUE(site_id, slug)
          )
        `).run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id)").run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(site_id, slug)").run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)").run();
        if (categories && categories.length > 0) {
          await createUserCategories(env, siteId, categories);
        } else if (category) {
          await createDefaultCategories(env, siteId, category);
        }
      } catch (retryError) {
        console.error("Retry category creation failed:", retryError);
      }
    }
    return successResponse({ id: siteId, subdomain: finalSubdomain }, "Site created successfully");
  } catch (error) {
    console.error("Create site error:", error);
    if (error.message && error.message.includes("UNIQUE constraint failed")) {
      return errorResponse("Subdomain already taken", 400, "SUBDOMAIN_TAKEN");
    }
    return errorResponse("Failed to create site: " + error.message, 500);
  }
}
__name(createSite, "createSite");
async function createDefaultCategories(env, siteId, businessCategory) {
  const categoryTemplates = {
    jewellery: [
      { name: "New Arrivals", slug: "new-arrivals", subtitle: "Discover our latest exquisite collections", showOnHome: 1, children: [] },
      { name: "Jewellery Collection", slug: "jewellery-collection", subtitle: "Exquisite pieces for every occasion", showOnHome: 1, children: [] },
      { name: "Featured Collection", slug: "featured-collection", subtitle: "Handpicked favourites just for you", showOnHome: 1, children: [] }
    ],
    clothing: [
      { name: "New Arrivals", slug: "new-arrivals", subtitle: "Discover our latest fashion trends", showOnHome: 1, children: [] },
      { name: "Clothing Collection", slug: "clothing-collection", subtitle: "Stylish wear for every occasion", showOnHome: 1, children: [] },
      { name: "Featured Collection", slug: "featured-collection", subtitle: "Handpicked favourites just for you", showOnHome: 1, children: [] }
    ],
    electronics: [
      { name: "New Arrivals", slug: "new-arrivals", subtitle: "Latest gadgets and tech", showOnHome: 1, children: [] },
      { name: "Electronics Collection", slug: "electronics-collection", subtitle: "Top picks in electronics", showOnHome: 1, children: [] },
      { name: "Featured Collection", slug: "featured-collection", subtitle: "Our best selling products", showOnHome: 1, children: [] }
    ]
  };
  const categories = categoryTemplates[businessCategory] || categoryTemplates.jewellery;
  let order = 0;
  for (const cat of categories) {
    const parentId = generateId();
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, subtitle, show_on_home, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(parentId, siteId, cat.name, cat.slug, cat.subtitle || null, cat.showOnHome !== void 0 ? cat.showOnHome : 1, order++).run();
    for (const childName of cat.children || []) {
      const childSlug = `${cat.slug}-${childName.toLowerCase().replace(/\s+/g, "-")}`;
      await env.DB.prepare(
        `INSERT INTO categories (id, site_id, name, slug, parent_id, show_on_home, display_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(generateId(), siteId, childName, childSlug, parentId, 0, order++).run();
    }
  }
}
__name(createDefaultCategories, "createDefaultCategories");
async function createUserCategories(env, siteId, categories) {
  let order = 0;
  for (let cat of categories) {
    let categoryName = typeof cat === "string" ? cat : cat.name || cat.label;
    if (!categoryName)
      continue;
    const slug = categoryName.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
    const subtitle = typeof cat === "object" && cat.subtitle ? cat.subtitle : null;
    const showOnHome = typeof cat === "object" && cat.showOnHome !== void 0 ? cat.showOnHome ? 1 : 0 : 1;
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, subtitle, show_on_home, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), siteId, categoryName, slug, subtitle, showOnHome, order++).run();
  }
}
__name(createUserCategories, "createUserCategories");
async function updateSite(request, env, user, siteId) {
  if (!siteId) {
    return errorResponse("Site ID is required");
  }
  try {
    const site = await env.DB.prepare(
      "SELECT id FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (!site) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    const updates = await request.json();
    const allowedFields = ["brand_name", "logo_url", "favicon_url", "primary_color", "secondary_color", "phone", "email", "address", "social_links", "settings"];
    const setClause = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (allowedFields.includes(dbKey)) {
        if (dbKey === "settings" && typeof value === "object") {
          let existingSettings = {};
          try {
            const siteRow = await env.DB.prepare("SELECT settings FROM sites WHERE id = ?").bind(siteId).first();
            if (siteRow && siteRow.settings) {
              existingSettings = JSON.parse(siteRow.settings);
            }
          } catch (e) {
          }
          const mergedSettings = { ...existingSettings, ...value };
          setClause.push(`${dbKey} = ?`);
          values.push(JSON.stringify(mergedSettings));
        } else {
          setClause.push(`${dbKey} = ?`);
          values.push(typeof value === "object" ? JSON.stringify(value) : value);
        }
      }
    }
    if (setClause.length === 0) {
      return errorResponse("No valid fields to update");
    }
    setClause.push('updated_at = datetime("now")');
    values.push(siteId);
    await env.DB.prepare(
      `UPDATE sites SET ${setClause.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    return successResponse(null, "Site updated successfully");
  } catch (error) {
    console.error("Update site error:", error);
    return errorResponse("Failed to update site", 500);
  }
}
__name(updateSite, "updateSite");
async function updateSiteAsAdmin(request, env, siteId) {
  try {
    const updates = await request.json();
    const allowedFields = ["brand_name", "logo_url", "favicon_url", "primary_color", "secondary_color", "phone", "email", "address", "social_links", "settings"];
    const setClause = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (allowedFields.includes(dbKey)) {
        if (dbKey === "settings" && typeof value === "object") {
          let existingSettings = {};
          try {
            const site = await env.DB.prepare("SELECT settings FROM sites WHERE id = ?").bind(siteId).first();
            if (site && site.settings) {
              existingSettings = JSON.parse(site.settings);
            }
          } catch (e) {
          }
          const mergedSettings = { ...existingSettings, ...value };
          setClause.push(`${dbKey} = ?`);
          values.push(JSON.stringify(mergedSettings));
        } else {
          setClause.push(`${dbKey} = ?`);
          values.push(typeof value === "object" ? JSON.stringify(value) : value);
        }
      }
    }
    if (setClause.length === 0) {
      return errorResponse("No valid fields to update");
    }
    setClause.push('updated_at = datetime("now")');
    values.push(siteId);
    await env.DB.prepare(
      `UPDATE sites SET ${setClause.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    return successResponse(null, "Site updated successfully");
  } catch (error) {
    console.error("Update site as admin error:", error);
    return errorResponse("Failed to update site", 500);
  }
}
__name(updateSiteAsAdmin, "updateSiteAsAdmin");
async function deleteSite(env, user, siteId) {
  if (!siteId) {
    return errorResponse("Site ID is required");
  }
  try {
    const site = await env.DB.prepare(
      "SELECT id, subdomain FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (!site) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    await env.DB.prepare("DELETE FROM sites WHERE id = ?").bind(siteId).run();
    return successResponse({ subdomain: site.subdomain }, "Site deleted successfully");
  } catch (error) {
    console.error("Delete site error:", error);
    return errorResponse("Failed to delete site", 500);
  }
}
__name(deleteSite, "deleteSite");
async function handleSetCustomDomain(request, env, siteId) {
  try {
    const body = await request.json();
    let { domain } = body;
    if (!domain || typeof domain !== "string") {
      return errorResponse("Domain is required");
    }
    domain = domain.toLowerCase().trim();
    if (domain.startsWith("http://") || domain.startsWith("https://")) {
      domain = domain.replace(/^https?:\/\//, "");
    }
    domain = domain.replace(/\/+$/, "");
    const domainParts = domain.split(".");
    if (domainParts.length < 3 || domainParts[0] !== "www") {
      return errorResponse("Only www subdomains are supported (e.g. www.mystore.com). Root domains like mystore.com are not supported.", 400, "INVALID_DOMAIN");
    }
    const domainRegex = /^www\.[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return errorResponse("Invalid domain format. Please enter a valid domain like www.mystore.com", 400, "INVALID_DOMAIN");
    }
    const existing = await env.DB.prepare(
      "SELECT id FROM sites WHERE custom_domain = ? AND id != ?"
    ).bind(domain, siteId).first();
    if (existing) {
      return errorResponse("This domain is already connected to another site", 409, "DOMAIN_TAKEN");
    }
    const site = await env.DB.prepare(
      "SELECT id, custom_domain, domain_status, domain_verification_token FROM sites WHERE id = ?"
    ).bind(siteId).first();
    if (!site) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    if (site.custom_domain === domain && site.domain_verification_token) {
      return successResponse({
        custom_domain: domain,
        domain_status: site.domain_status || "pending",
        domain_verification_token: site.domain_verification_token
      }, "Domain already configured. Use the existing verification token.");
    }
    const token = generateId().replace(/-/g, "");
    await env.DB.prepare(
      `UPDATE sites SET custom_domain = ?, domain_status = 'pending', domain_verification_token = ?, cf_hostname_id = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(domain, token, siteId).run();
    return successResponse({
      custom_domain: domain,
      domain_status: "pending",
      domain_verification_token: token
    }, "Custom domain saved. Please add the DNS records and verify.");
  } catch (error) {
    console.error("Set custom domain error:", error);
    if (error.message && error.message.includes("UNIQUE constraint failed")) {
      return errorResponse("This domain is already connected to another site", 409, "DOMAIN_TAKEN");
    }
    return errorResponse("Failed to set custom domain: " + error.message, 500);
  }
}
__name(handleSetCustomDomain, "handleSetCustomDomain");
async function resolveDnsA(hostname) {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
    { headers: { "Accept": "application/dns-json" } }
  );
  const data = await res.json();
  return (data.Answer || []).filter((r) => r.type === 1).map((r) => r.data);
}
__name(resolveDnsA, "resolveDnsA");
async function handleVerifyDomain(env, siteId) {
  try {
    const site = await env.DB.prepare(
      "SELECT id, custom_domain, domain_verification_token FROM sites WHERE id = ?"
    ).bind(siteId).first();
    if (!site) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    if (!site.custom_domain) {
      return errorResponse("No custom domain configured for this site", 400);
    }
    const domain = site.custom_domain;
    const expectedToken = site.domain_verification_token;
    const errors = [];
    let txtVerified = false;
    try {
      const baseDomain = domain.replace(/^www\./, "");
      const txtHost = `_fluxe-verify.${baseDomain}`;
      const txtResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtHost)}&type=TXT`,
        { headers: { "Accept": "application/dns-json" } }
      );
      const txtData = await txtResponse.json();
      if (txtData.Answer && txtData.Answer.length > 0) {
        for (const answer of txtData.Answer) {
          const val = (answer.data || "").replace(/"/g, "").trim();
          if (val === expectedToken) {
            txtVerified = true;
            break;
          }
        }
      }
      if (!txtVerified) {
        errors.push(`TXT record _fluxe-verify.${baseDomain} not found or does not match the expected token.`);
      }
    } catch (e) {
      errors.push("Failed to check TXT record: " + (e.message || "DNS lookup error"));
    }
    let cnameVerified = false;
    try {
      const cnameResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
        { headers: { "Accept": "application/dns-json" } }
      );
      const cnameData = await cnameResponse.json();
      if (cnameData.Answer && cnameData.Answer.length > 0) {
        for (const answer of cnameData.Answer) {
          const target = (answer.data || "").replace(/\.$/, "").toLowerCase();
          if (target === "fluxe.in" || target.endsWith(".fluxe.in")) {
            cnameVerified = true;
            break;
          }
        }
      }
      if (!cnameVerified) {
        const [domainIPs, fluxeIPs] = await Promise.all([
          resolveDnsA(domain),
          resolveDnsA("fluxe.in")
        ]);
        if (domainIPs.length > 0 && fluxeIPs.length > 0) {
          cnameVerified = domainIPs.some((ip) => fluxeIPs.includes(ip));
        }
      }
      if (!cnameVerified) {
        errors.push(`${domain} does not appear to point to fluxe.in. Please add a CNAME record pointing to fluxe.in.`);
      }
    } catch (e) {
      errors.push("Failed to check DNS records: " + (e.message || "DNS lookup error"));
    }
    if (txtVerified && cnameVerified) {
      let cfHostnameId = null;
      try {
        const cfResult = await registerCustomHostname(env, domain);
        if (cfResult.success) {
          cfHostnameId = cfResult.cfHostnameId;
        } else if (cfResult.reason !== "not_configured") {
          console.warn("Cloudflare hostname registration warning:", cfResult.reason);
        }
      } catch (cfErr) {
        console.error("Cloudflare registration failed (non-fatal):", cfErr.message);
      }
      await env.DB.prepare(
        `UPDATE sites SET domain_status = 'verified', cf_hostname_id = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(cfHostnameId, siteId).run();
      return successResponse({
        domain_status: "verified",
        txt_verified: true,
        cname_verified: true
      }, "Domain verified successfully! Your custom domain is now active.");
    } else {
      await env.DB.prepare(
        `UPDATE sites SET domain_status = 'failed', updated_at = datetime('now') WHERE id = ?`
      ).bind(siteId).run();
      return successResponse({
        domain_status: "failed",
        txt_verified: txtVerified,
        cname_verified: cnameVerified,
        errors
      }, "Domain verification failed. Please check your DNS records.");
    }
  } catch (error) {
    console.error("Verify domain error:", error);
    return errorResponse("Failed to verify domain: " + error.message, 500);
  }
}
__name(handleVerifyDomain, "handleVerifyDomain");
async function handleRemoveCustomDomain(env, siteId) {
  try {
    const site = await env.DB.prepare(
      "SELECT id, cf_hostname_id FROM sites WHERE id = ?"
    ).bind(siteId).first();
    if (!site) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    if (site.cf_hostname_id) {
      try {
        await deleteCustomHostname(env, site.cf_hostname_id);
      } catch (cfErr) {
        console.error("Cloudflare hostname deletion failed (non-fatal):", cfErr.message);
      }
    }
    await env.DB.prepare(
      `UPDATE sites SET custom_domain = NULL, domain_status = NULL, domain_verification_token = NULL, cf_hostname_id = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(siteId).run();
    return successResponse(null, "Custom domain removed successfully.");
  } catch (error) {
    console.error("Remove custom domain error:", error);
    return errorResponse("Failed to remove custom domain: " + error.message, 500);
  }
}
__name(handleRemoveCustomDomain, "handleRemoveCustomDomain");

// workers/storefront/products-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
init_site_admin_worker();
async function handleProducts(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const productId = pathParts[2];
  if (method === "GET") {
    const siteId = url.searchParams.get("siteId");
    const subdomain = url.searchParams.get("subdomain");
    const category = url.searchParams.get("category");
    const categoryId = url.searchParams.get("categoryId");
    if (productId) {
      return getProduct(env, productId);
    }
    return getProducts(env, { siteId, subdomain, category, categoryId, url });
  }
  let user = await validateAuth(request, env);
  let adminSiteId = null;
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("SiteAdmin ")) {
      let siteId = url.searchParams.get("siteId");
      if (!siteId && method === "POST") {
        try {
          const cloned = request.clone();
          const body = await cloned.json();
          siteId = body.siteId;
        } catch (e) {
        }
      }
      if (!siteId && (method === "PUT" || method === "DELETE") && productId) {
        try {
          const prod = await env.DB.prepare("SELECT site_id FROM products WHERE id = ?").bind(productId).first();
          if (prod)
            siteId = prod.site_id;
        } catch (e) {
        }
      }
      if (siteId) {
        const admin = await validateSiteAdmin(request, env, siteId);
        if (admin) {
          adminSiteId = siteId;
          user = { id: admin.userId || "site-admin", _adminSiteId: siteId };
        }
      }
    }
  }
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  switch (method) {
    case "POST":
      return createProduct(request, env, user);
    case "PUT":
      return updateProduct(request, env, user, productId);
    case "DELETE":
      return deleteProduct(env, user, productId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleProducts, "handleProducts");
async function getProducts(env, { siteId, subdomain, category, categoryId, url }) {
  try {
    if (!siteId && !subdomain) {
      return errorResponse("siteId or subdomain is required to fetch products");
    }
    let query = "SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1";
    const bindings = [];
    if (siteId) {
      query += " AND p.site_id = ?";
      bindings.push(siteId);
    } else if (subdomain) {
      query = `SELECT p.*, c.name as category_name, c.slug as category_slug 
               FROM products p 
               LEFT JOIN categories c ON p.category_id = c.id
               JOIN sites s ON p.site_id = s.id 
               WHERE p.is_active = 1 AND LOWER(s.subdomain) = LOWER(?)`;
      bindings.push(subdomain);
    }
    if (categoryId) {
      query += " AND p.category_id = ?";
      bindings.push(categoryId);
    } else if (category) {
      query += " AND (c.slug = ? OR c.name = ?)";
      bindings.push(category, category);
    }
    const featured = url.searchParams.get("featured");
    if (featured === "true") {
      query += " AND p.is_featured = 1";
    }
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const offset = parseInt(url.searchParams.get("offset")) || 0;
    query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
    bindings.push(limit, offset);
    const products = await env.DB.prepare(query).bind(...bindings).all();
    const parsedProducts = products.results.map((product) => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : []
    }));
    return successResponse(parsedProducts);
  } catch (error) {
    console.error("Get products error:", error);
    return errorResponse("Failed to fetch products", 500);
  }
}
__name(getProducts, "getProducts");
async function getProduct(env, productId) {
  try {
    const product = await env.DB.prepare(
      `SELECT p.*, c.name as category_name, c.slug as category_slug, s.brand_name, s.subdomain
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id
       JOIN sites s ON p.site_id = s.id
       WHERE p.id = ?`
    ).bind(productId).first();
    if (!product) {
      return errorResponse("Product not found", 404, "NOT_FOUND");
    }
    let variantResults = [];
    try {
      const variants = await env.DB.prepare(
        "SELECT * FROM product_variants WHERE product_id = ?"
      ).bind(productId).all();
      variantResults = variants.results || [];
    } catch (_) {
    }
    const parsedProduct = {
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : [],
      variants: variantResults.map((v) => ({
        ...v,
        attributes: v.attributes ? JSON.parse(v.attributes) : {}
      }))
    };
    return successResponse(parsedProduct);
  } catch (error) {
    console.error("Get product error:", error);
    return errorResponse("Failed to fetch product", 500);
  }
}
__name(getProduct, "getProduct");
async function createProduct(request, env, user) {
  try {
    const data = await request.json();
    const { siteId, name, description, shortDescription, price, comparePrice, costPrice, sku, stock, categoryId, images, thumbnailUrl, tags, isFeatured, weight, dimensions } = data;
    if (!siteId || !name || price === void 0) {
      return errorResponse("Site ID, name and price are required");
    }
    let site;
    if (user._adminSiteId && user._adminSiteId === siteId) {
      site = await env.DB.prepare("SELECT id FROM sites WHERE id = ?").bind(siteId).first();
    } else {
      site = await env.DB.prepare(
        "SELECT id FROM sites WHERE id = ? AND user_id = ?"
      ).bind(siteId, user.id).first();
    }
    if (!site) {
      return errorResponse("Site not found or unauthorized", 404);
    }
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").substring(0, 100);
    const productId = generateId();
    await env.DB.prepare(
      `INSERT INTO products (id, site_id, category_id, name, slug, description, short_description, price, compare_price, cost_price, sku, stock, low_stock_threshold, weight, dimensions, images, thumbnail_url, tags, is_featured, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      productId,
      siteId,
      categoryId || null,
      sanitizeInput(name),
      slug,
      description || null,
      shortDescription || null,
      price,
      comparePrice || null,
      costPrice || null,
      sku || null,
      stock || 0,
      5,
      weight || null,
      dimensions ? JSON.stringify(dimensions) : null,
      images ? JSON.stringify(images) : "[]",
      thumbnailUrl || null,
      tags ? JSON.stringify(tags) : "[]",
      isFeatured ? 1 : 0
    ).run();
    return successResponse({ id: productId, slug }, "Product created successfully");
  } catch (error) {
    console.error("Create product error:", error);
    if (error.message && error.message.includes("UNIQUE constraint failed")) {
      return errorResponse("Product slug already exists", 400, "SLUG_EXISTS");
    }
    return errorResponse("Failed to create product", 500);
  }
}
__name(createProduct, "createProduct");
async function updateProduct(request, env, user, productId) {
  if (!productId) {
    return errorResponse("Product ID is required");
  }
  try {
    let product;
    if (user._adminSiteId) {
      product = await env.DB.prepare(
        "SELECT id, site_id FROM products WHERE id = ? AND site_id = ?"
      ).bind(productId, user._adminSiteId).first();
    } else {
      product = await env.DB.prepare(
        `SELECT p.id, p.site_id FROM products p 
         JOIN sites s ON p.site_id = s.id 
         WHERE p.id = ? AND s.user_id = ?`
      ).bind(productId, user.id).first();
    }
    if (!product) {
      return errorResponse("Product not found or unauthorized", 404);
    }
    const updates = await request.json();
    const allowedFields = ["name", "description", "short_description", "price", "compare_price", "cost_price", "sku", "stock", "low_stock_threshold", "category_id", "images", "thumbnail_url", "tags", "is_featured", "is_active", "weight", "dimensions"];
    const setClause = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = ?`);
        if (Array.isArray(value) || typeof value === "object") {
          values.push(JSON.stringify(value));
        } else if (typeof value === "boolean") {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    }
    if (setClause.length === 0) {
      return errorResponse("No valid fields to update");
    }
    setClause.push('updated_at = datetime("now")');
    values.push(productId);
    await env.DB.prepare(
      `UPDATE products SET ${setClause.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    return successResponse(null, "Product updated successfully");
  } catch (error) {
    console.error("Update product error:", error);
    return errorResponse("Failed to update product", 500);
  }
}
__name(updateProduct, "updateProduct");
async function deleteProduct(env, user, productId) {
  if (!productId) {
    return errorResponse("Product ID is required");
  }
  try {
    let product;
    if (user._adminSiteId) {
      product = await env.DB.prepare(
        "SELECT id FROM products WHERE id = ? AND site_id = ?"
      ).bind(productId, user._adminSiteId).first();
    } else {
      product = await env.DB.prepare(
        `SELECT p.id FROM products p 
         JOIN sites s ON p.site_id = s.id 
         WHERE p.id = ? AND s.user_id = ?`
      ).bind(productId, user.id).first();
    }
    if (!product) {
      return errorResponse("Product not found or unauthorized", 404);
    }
    await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(productId).run();
    return successResponse(null, "Product deleted successfully");
  } catch (error) {
    console.error("Delete product error:", error);
    return errorResponse("Failed to delete product", 500);
  }
}
__name(deleteProduct, "deleteProduct");
async function updateProductStock(env, productId, quantity, operation = "decrement") {
  try {
    if (operation === "decrement") {
      await env.DB.prepare(
        'UPDATE products SET stock = stock - ?, updated_at = datetime("now") WHERE id = ? AND stock >= ?'
      ).bind(quantity, productId, quantity).run();
    } else {
      await env.DB.prepare(
        'UPDATE products SET stock = stock + ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(quantity, productId).run();
    }
    return true;
  } catch (error) {
    console.error("Update stock error:", error);
    return false;
  }
}
__name(updateProductStock, "updateProductStock");

// workers/storefront/orders-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
async function handleOrders(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const orderId = pathParts[2];
  const action = pathParts[3];
  if (action === "guest") {
    return handleGuestOrder(request, env, method, orderId);
  }
  if (action === "track") {
    return trackOrder(env, orderId);
  }
  const user = await validateAnyAuth(request, env);
  switch (method) {
    case "GET":
      if (orderId) {
        return getOrder(env, user, orderId, request);
      }
      return getOrders(request, env, user);
    case "POST":
      return createOrder(request, env, user);
    case "PUT":
      return updateOrderStatus(request, env, user, orderId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleOrders, "handleOrders");
async function getOrders(request, env, user) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const offset = parseInt(url.searchParams.get("offset")) || 0;
    let query = "SELECT * FROM orders WHERE 1=1";
    const bindings = [];
    const authHeader = request.headers.get("Authorization");
    let isSiteAdmin = false;
    if (authHeader && authHeader.startsWith("SiteAdmin ") && siteId) {
      const { validateSiteAdmin: validateSiteAdmin2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
      const admin = await validateSiteAdmin2(request, env, siteId);
      if (admin) {
        isSiteAdmin = true;
      }
    }
    if (isSiteAdmin && siteId) {
      query += " AND site_id = ?";
      bindings.push(siteId);
    } else if (user) {
      if (siteId) {
        if (user.type === "owner") {
          const site = await env.DB.prepare(
            "SELECT id FROM sites WHERE id = ? AND user_id = ?"
          ).bind(siteId, user.id).first();
          if (site) {
            query += " AND site_id = ?";
            bindings.push(siteId);
          } else {
            query += " AND user_id = ? AND site_id = ?";
            bindings.push(user.id, siteId);
          }
        } else {
          query += " AND user_id = ? AND site_id = ?";
          bindings.push(user.id, siteId);
        }
      } else {
        query += " AND user_id = ?";
        bindings.push(user.id);
      }
    }
    if (status) {
      query += " AND status = ?";
      bindings.push(status);
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    bindings.push(limit, offset);
    const orders = await env.DB.prepare(query).bind(...bindings).all();
    const parsedOrders = orders.results.map((order) => ({
      ...order,
      items: JSON.parse(order.items),
      shipping_address: JSON.parse(order.shipping_address),
      billing_address: order.billing_address ? JSON.parse(order.billing_address) : null
    }));
    return successResponse(parsedOrders);
  } catch (error) {
    console.error("Get orders error:", error);
    return errorResponse("Failed to fetch orders", 500);
  }
}
__name(getOrders, "getOrders");
async function getOrder(env, user, orderId, request) {
  try {
    let query = "SELECT * FROM orders WHERE (id = ? OR order_number = ?)";
    const bindings = [orderId, orderId];
    const authHeader = request ? request.headers.get("Authorization") : null;
    if (authHeader && authHeader.startsWith("SiteAdmin ")) {
      const orderCheck = await env.DB.prepare(
        "SELECT site_id FROM orders WHERE id = ? OR order_number = ?"
      ).bind(orderId, orderId).first();
      if (orderCheck) {
        const { validateSiteAdmin: validateSiteAdmin2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
        const admin = await validateSiteAdmin2(request, env, orderCheck.site_id);
        if (admin) {
          query += " AND site_id = ?";
          bindings.push(orderCheck.site_id);
        } else {
          return errorResponse("Order not found or unauthorized", 404, "NOT_FOUND");
        }
      }
    } else if (user) {
      if (user.type === "customer") {
        query += " AND user_id = ?";
        bindings.push(user.id);
      } else {
        query += " AND (user_id = ? OR site_id IN (SELECT id FROM sites WHERE user_id = ?))";
        bindings.push(user.id, user.id);
      }
    } else {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }
    const order = await env.DB.prepare(query).bind(...bindings).first();
    if (!order) {
      return errorResponse("Order not found", 404, "NOT_FOUND");
    }
    return successResponse({
      ...order,
      items: JSON.parse(order.items),
      shipping_address: JSON.parse(order.shipping_address),
      billing_address: order.billing_address ? JSON.parse(order.billing_address) : null
    });
  } catch (error) {
    console.error("Get order error:", error);
    return errorResponse("Failed to fetch order", 500);
  }
}
__name(getOrder, "getOrder");
async function createOrder(request, env, user) {
  try {
    const data = await request.json();
    const { siteId, items, shippingAddress, billingAddress, customerName, customerEmail, customerPhone, paymentMethod, notes, couponCode } = data;
    const missingFields = [];
    if (!siteId)
      missingFields.push("siteId");
    if (!items || !items.length)
      missingFields.push("items");
    if (!shippingAddress)
      missingFields.push("shippingAddress");
    if (!customerName)
      missingFields.push("customerName");
    if (!customerPhone)
      missingFields.push("customerPhone");
    if (missingFields.length > 0) {
      console.error("Order missing fields:", missingFields.join(", "), "Received data keys:", Object.keys(data).join(", "));
      return errorResponse(`Missing required fields: ${missingFields.join(", ")}`);
    }
    let subtotal = 0;
    const processedItems = [];
    for (const item of items) {
      const itemProductId = item.productId || item.product_id;
      if (!itemProductId) {
        return errorResponse("Invalid item: missing product ID", 400);
      }
      const product = await env.DB.prepare(
        "SELECT id, name, price, stock, thumbnail_url FROM products WHERE id = ? AND site_id = ?"
      ).bind(itemProductId, siteId).first();
      if (!product) {
        return errorResponse(`Product not found: ${itemProductId}`, 400);
      }
      if (product.stock !== null && product.stock < item.quantity) {
        return errorResponse(`Insufficient stock for ${product.name}`, 400, "INSUFFICIENT_STOCK");
      }
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      processedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        thumbnail: product.thumbnail_url,
        variant: item.variant || null
      });
    }
    let discount = 0;
    if (couponCode) {
      let coupon = null;
      try {
        coupon = await env.DB.prepare(
          `SELECT * FROM coupons WHERE site_id = ? AND code = ? AND is_active = 1 
           AND (starts_at IS NULL OR starts_at <= datetime('now'))
           AND (expires_at IS NULL OR expires_at > datetime('now'))
           AND (usage_limit IS NULL OR used_count < usage_limit)`
        ).bind(siteId, couponCode.toUpperCase()).first();
      } catch (couponErr) {
        console.error("Coupon lookup error (table may not exist):", couponErr);
      }
      if (coupon && subtotal >= coupon.min_order_value) {
        if (coupon.type === "percentage") {
          discount = subtotal * coupon.value / 100;
          if (coupon.max_discount && discount > coupon.max_discount) {
            discount = coupon.max_discount;
          }
        } else {
          discount = coupon.value;
        }
        await env.DB.prepare(
          "UPDATE coupons SET used_count = used_count + 1 WHERE id = ?"
        ).bind(coupon.id).run();
      }
    }
    const shippingCost = 0;
    const tax = 0;
    const total = subtotal - discount + shippingCost + tax;
    const orderId = generateId();
    const orderNumber = generateOrderNumber();
    const isPendingPayment = paymentMethod === "razorpay";
    const orderStatus = isPendingPayment ? "pending_payment" : data.status || "pending";
    await env.DB.prepare(
      `INSERT INTO orders (id, site_id, user_id, order_number, items, subtotal, discount, shipping_cost, tax, total, payment_method, status, shipping_address, billing_address, customer_name, customer_email, customer_phone, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      orderId,
      siteId,
      user ? user.id : null,
      orderNumber,
      JSON.stringify(processedItems),
      subtotal,
      discount,
      shippingCost,
      tax,
      total,
      paymentMethod || "pending",
      orderStatus,
      JSON.stringify(shippingAddress),
      billingAddress ? JSON.stringify(billingAddress) : null,
      customerName,
      customerEmail || null,
      customerPhone,
      notes || null
    ).run();
    if (!isPendingPayment) {
      for (const item of processedItems) {
        await updateProductStock(env, item.productId, item.quantity, "decrement");
      }
      try {
        await sendOrderEmails(env, siteId, {
          orderNumber,
          processedItems,
          total,
          paymentMethod,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress
        });
      } catch (emailErr) {
        console.error("Order email notification error:", emailErr);
      }
    }
    return successResponse({
      id: orderId,
      orderNumber,
      total,
      items: processedItems
    }, "Order created successfully");
  } catch (error) {
    console.error("Create order error:", error.message || error, error.stack || "");
    return errorResponse("Failed to create order: " + (error.message || "Unknown error"), 500);
  }
}
__name(createOrder, "createOrder");
async function updateOrderStatus(request, env, user, orderId) {
  if (!orderId) {
    return errorResponse("Order ID is required");
  }
  try {
    let order;
    if (user && user.type === "customer") {
      return errorResponse("Customers cannot update order status", 403);
    }
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("SiteAdmin ")) {
      const { validateSiteAdmin: validateSiteAdmin2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
      const orderCheck = await env.DB.prepare("SELECT id, site_id FROM orders WHERE id = ?").bind(orderId).first();
      if (orderCheck) {
        const admin = await validateSiteAdmin2(request, env, orderCheck.site_id);
        if (admin) {
          order = orderCheck;
        }
      }
    }
    if (!order && user) {
      order = await env.DB.prepare(
        `SELECT o.id, o.site_id FROM orders o 
         JOIN sites s ON o.site_id = s.id 
         WHERE o.id = ? AND s.user_id = ?`
      ).bind(orderId, user.id).first();
    }
    if (!order) {
      return errorResponse("Order not found or unauthorized", 404);
    }
    const { status, trackingNumber, carrier, cancellationReason } = await request.json();
    const updates = [];
    const values = [];
    if (status) {
      updates.push("status = ?");
      values.push(status);
      if (status === "shipped") {
        updates.push('shipped_at = datetime("now")');
      } else if (status === "delivered") {
        updates.push('delivered_at = datetime("now")');
      } else if (status === "cancelled") {
        updates.push('cancelled_at = datetime("now")');
        if (cancellationReason) {
          try {
            await env.DB.prepare(
              `ALTER TABLE orders ADD COLUMN cancellation_reason TEXT`
            ).run();
          } catch {
          }
          updates.push("cancellation_reason = ?");
          values.push(cancellationReason);
        }
      }
    }
    if (trackingNumber) {
      updates.push("tracking_number = ?");
      values.push(trackingNumber);
    }
    if (carrier) {
      updates.push("carrier = ?");
      values.push(carrier);
    }
    if (updates.length === 0) {
      return errorResponse("No valid fields to update");
    }
    updates.push('updated_at = datetime("now")');
    values.push(orderId);
    await env.DB.prepare(
      `UPDATE orders SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    if (status === "cancelled" && cancellationReason) {
      try {
        const fullOrder = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
        if (fullOrder) {
          const site = await env.DB.prepare("SELECT brand_name, email, settings FROM sites WHERE id = ?").bind(fullOrder.site_id).first();
          const siteBrandName = site?.brand_name || "Store";
          const siteSettings = site?.settings ? JSON.parse(site.settings) : {};
          const ownerEmail = siteSettings.email || siteSettings.ownerEmail || site?.email;
          const emailOrder = {
            order_number: fullOrder.order_number,
            customer_name: fullOrder.customer_name,
            customer_email: fullOrder.customer_email,
            customer_phone: fullOrder.customer_phone,
            total: fullOrder.total,
            payment_method: fullOrder.payment_method
          };
          const emailJobs = [];
          if (fullOrder.customer_email) {
            const { html, text } = buildCancellationCustomerEmail(emailOrder, siteBrandName, cancellationReason, ownerEmail);
            emailJobs.push(sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been cancelled`, html, text).catch((e) => console.error("Cancellation customer email error:", e)));
          }
          if (ownerEmail) {
            const { html, text } = buildCancellationOwnerEmail(emailOrder, siteBrandName, cancellationReason);
            emailJobs.push(sendEmail(env, ownerEmail, `Order #${fullOrder.order_number} cancelled - ${siteBrandName}`, html, text).catch((e) => console.error("Cancellation owner email error:", e)));
          }
          await Promise.all(emailJobs);
        }
      } catch (emailErr) {
        console.error("Failed to send cancellation emails:", emailErr);
      }
    }
    if (status === "delivered") {
      try {
        const fullOrder = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
        if (fullOrder) {
          const site = await env.DB.prepare("SELECT brand_name, email, settings FROM sites WHERE id = ?").bind(fullOrder.site_id).first();
          const siteBrandName = site?.brand_name || "Store";
          const siteSettings = site?.settings ? JSON.parse(site.settings) : {};
          const ownerEmail = siteSettings.email || siteSettings.ownerEmail || site?.email;
          const emailOrder = {
            order_number: fullOrder.order_number,
            customer_name: fullOrder.customer_name,
            customer_email: fullOrder.customer_email,
            customer_phone: fullOrder.customer_phone,
            total: fullOrder.total,
            payment_method: fullOrder.payment_method,
            items: fullOrder.items
          };
          const emailJobs = [];
          if (fullOrder.customer_email) {
            try {
              const { html, text } = buildDeliveryCustomerEmail(emailOrder, siteBrandName, ownerEmail);
              emailJobs.push(sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been delivered! \u{1F4E6}`, html, text).catch((e) => console.error("Delivery customer email send error:", e)));
            } catch (buildErr) {
              console.error("Delivery customer email build error:", buildErr);
            }
          }
          if (ownerEmail) {
            try {
              const { html, text } = buildDeliveryOwnerEmail(emailOrder, siteBrandName);
              emailJobs.push(sendEmail(env, ownerEmail, `Order #${fullOrder.order_number} delivered - ${siteBrandName}`, html, text).catch((e) => console.error("Delivery owner email send error:", e)));
            } catch (buildErr) {
              console.error("Delivery owner email build error:", buildErr);
            }
          }
          await Promise.all(emailJobs);
        }
      } catch (emailErr) {
        console.error("Failed to send delivery emails:", emailErr);
      }
    }
    return successResponse(null, "Order updated successfully");
  } catch (error) {
    console.error("Update order error:", error);
    return errorResponse("Failed to update order", 500);
  }
}
__name(updateOrderStatus, "updateOrderStatus");
async function handleGuestOrder(request, env, method, orderId) {
  if (method === "POST") {
    return createGuestOrder(request, env);
  }
  if (method === "GET" && orderId) {
    return getGuestOrder(env, orderId);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handleGuestOrder, "handleGuestOrder");
async function createGuestOrder(request, env) {
  try {
    const data = await request.json();
    const { siteId, items, shippingAddress, customerName, customerEmail, customerPhone, paymentMethod } = data;
    const missingFields = [];
    if (!siteId)
      missingFields.push("siteId");
    if (!items || !items.length)
      missingFields.push("items");
    if (!shippingAddress)
      missingFields.push("shippingAddress");
    if (!customerName)
      missingFields.push("customerName");
    if (!customerPhone)
      missingFields.push("customerPhone");
    if (missingFields.length > 0) {
      console.error("Guest order missing fields:", missingFields.join(", "), "Received data keys:", Object.keys(data).join(", "));
      return errorResponse(`Missing required fields: ${missingFields.join(", ")}`);
    }
    let subtotal = 0;
    const processedItems = [];
    for (const item of items) {
      const itemProductId = item.productId || item.product_id;
      if (!itemProductId) {
        return errorResponse("Invalid item: missing product ID", 400);
      }
      const product = await env.DB.prepare(
        "SELECT id, name, price, stock, thumbnail_url FROM products WHERE id = ? AND site_id = ?"
      ).bind(itemProductId, siteId).first();
      if (!product) {
        return errorResponse(`Product not found: ${itemProductId}`, 400);
      }
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      processedItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        total: itemTotal,
        thumbnail: product.thumbnail_url
      });
    }
    const total = subtotal;
    const orderId = generateId();
    const orderNumber = generateOrderNumber();
    const isPendingPayment = paymentMethod === "razorpay";
    const guestOrderStatus = isPendingPayment ? "pending_payment" : "confirmed";
    await env.DB.prepare(
      `INSERT INTO guest_orders (id, site_id, order_number, items, subtotal, total, payment_method, status, shipping_address, customer_name, customer_email, customer_phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      orderId,
      siteId,
      orderNumber,
      JSON.stringify(processedItems),
      subtotal,
      total,
      paymentMethod || "cod",
      guestOrderStatus,
      JSON.stringify(shippingAddress),
      customerName,
      customerEmail || null,
      customerPhone
    ).run();
    if (!isPendingPayment) {
      for (const item of processedItems) {
        await updateProductStock(env, item.productId, item.quantity, "decrement");
      }
      try {
        await sendOrderEmails(env, siteId, {
          orderNumber,
          processedItems,
          total,
          paymentMethod,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress
        });
      } catch (emailErr) {
        console.error("Guest order email notification error:", emailErr);
      }
    }
    return successResponse({
      id: orderId,
      orderNumber,
      total
    }, "Guest order created successfully");
  } catch (error) {
    console.error("Create guest order error:", error.message || error, error.stack || "");
    return errorResponse("Failed to create order: " + (error.message || "Unknown error"), 500);
  }
}
__name(createGuestOrder, "createGuestOrder");
async function getGuestOrder(env, orderNumber) {
  try {
    const order = await env.DB.prepare(
      "SELECT * FROM guest_orders WHERE order_number = ? LIMIT 1"
    ).bind(orderNumber).first();
    if (!order) {
      return errorResponse("Order not found", 404);
    }
    return successResponse({
      ...order,
      items: JSON.parse(order.items),
      shipping_address: JSON.parse(order.shipping_address)
    });
  } catch (error) {
    console.error("Get guest order error:", error);
    return errorResponse("Failed to fetch order", 500);
  }
}
__name(getGuestOrder, "getGuestOrder");
async function sendOrderEmails(env, siteId, orderDetails) {
  const { orderNumber, processedItems, total, paymentMethod, customerName, customerEmail, customerPhone, shippingAddress } = orderDetails;
  const site = await env.DB.prepare("SELECT brand_name, email, settings FROM sites WHERE id = ?").bind(siteId).first();
  const siteBrandName = site?.brand_name || "Store";
  const siteSettings = site?.settings ? JSON.parse(site.settings) : {};
  const ownerEmail = siteSettings.email || siteSettings.ownerEmail || site?.email;
  console.log("Order email debug:", {
    customerEmail,
    ownerEmail,
    siteSettingsEmail: siteSettings.email,
    siteEmail: site?.email,
    hasResendKey: !!env.RESEND_API_KEY,
    hasSendGridKey: !!env.SENDGRID_API_KEY
  });
  const orderForEmail = {
    order_number: orderNumber,
    items: processedItems,
    total,
    payment_method: paymentMethod || "cod",
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    shipping_address: shippingAddress
  };
  const emailPromises = [];
  if (customerEmail) {
    const { html, text } = buildOrderConfirmationEmail(orderForEmail, siteBrandName, ownerEmail);
    emailPromises.push(
      sendEmail(env, customerEmail, `Order Confirmation - ${orderNumber}`, html, text).then((result) => {
        console.log("Customer email result:", result);
        if (result !== true)
          console.error("Customer email failed:", result);
      }).catch((e) => console.error("Customer email error:", e))
    );
  }
  if (ownerEmail) {
    const { html, text } = buildOwnerNotificationEmail(orderForEmail, siteBrandName);
    emailPromises.push(
      sendEmail(env, ownerEmail, `New Order #${orderNumber} - ${siteBrandName}`, html, text).then((result) => {
        console.log("Owner email result:", result);
        if (result !== true)
          console.error("Owner email failed:", result);
      }).catch((e) => console.error("Owner email error:", e))
    );
  }
  if (emailPromises.length > 0) {
    await Promise.all(emailPromises);
  }
}
__name(sendOrderEmails, "sendOrderEmails");
async function trackOrder(env, orderNumber) {
  try {
    let order = await env.DB.prepare(
      "SELECT order_number, status, tracking_number, carrier, shipped_at, delivered_at, created_at FROM orders WHERE order_number = ?"
    ).bind(orderNumber).first();
    if (!order) {
      order = await env.DB.prepare(
        "SELECT order_number, status, tracking_number, carrier, created_at FROM guest_orders WHERE order_number = ?"
      ).bind(orderNumber).first();
    }
    if (!order) {
      return errorResponse("Order not found", 404);
    }
    return successResponse(order);
  } catch (error) {
    console.error("Track order error:", error);
    return errorResponse("Failed to track order", 500);
  }
}
__name(trackOrder, "trackOrder");

// workers/storefront/cart-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
async function handleCart(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const url = new URL(request.url);
  const pathParts = path.split("/").filter(Boolean);
  const subAction = pathParts[2];
  if (subAction === "clear") {
    return handleClearCart(request, env, url);
  }
  if (subAction === "merge") {
    return handleMergeCarts(request, env);
  }
  const siteId = url.searchParams.get("siteId");
  if (!siteId) {
    return errorResponse("Site ID is required");
  }
  const user = await validateAnyAuth(request, env);
  const sessionId = request.headers.get("X-Session-ID") || url.searchParams.get("sessionId");
  if (!user && !sessionId) {
    return errorResponse("User authentication or session ID required");
  }
  switch (method) {
    case "GET":
      return getCart(env, siteId, user, sessionId);
    case "POST":
      return addToCart(request, env, siteId, user, sessionId);
    case "PUT":
      return updateCartItem(request, env, siteId, user, sessionId);
    case "DELETE":
      return removeFromCart(request, env, siteId, user, sessionId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleCart, "handleCart");
async function handleClearCart(request, env, url) {
  const user = await validateAnyAuth(request, env);
  const siteId = url.searchParams.get("siteId");
  const sessionId = url.searchParams.get("sessionId");
  if (!siteId)
    return errorResponse("Site ID is required");
  if (!user && !sessionId)
    return errorResponse("Authentication or session required");
  try {
    if (user) {
      await env.DB.prepare(
        `UPDATE carts SET items = '[]', subtotal = 0, updated_at = datetime('now') WHERE site_id = ? AND user_id = ?`
      ).bind(siteId, user.id).run();
    } else {
      await env.DB.prepare(
        `UPDATE carts SET items = '[]', subtotal = 0, updated_at = datetime('now') WHERE site_id = ? AND session_id = ?`
      ).bind(siteId, sessionId).run();
    }
    return successResponse(null, "Cart cleared");
  } catch (error) {
    console.error("Clear cart error:", error);
    return errorResponse("Failed to clear cart", 500);
  }
}
__name(handleClearCart, "handleClearCart");
async function handleMergeCarts(request, env) {
  const user = await validateAnyAuth(request, env);
  if (!user)
    return errorResponse("Authentication required", 401);
  try {
    const { siteId, sessionId } = await request.json();
    if (!siteId || !sessionId)
      return errorResponse("siteId and sessionId are required");
    await mergeCarts(env, siteId, user.id, sessionId);
    return successResponse(null, "Carts merged");
  } catch (error) {
    console.error("Merge carts error:", error);
    return errorResponse("Failed to merge carts", 500);
  }
}
__name(handleMergeCarts, "handleMergeCarts");
async function getOrCreateCart(env, siteId, user, sessionId) {
  let cart;
  if (user) {
    cart = await env.DB.prepare(
      "SELECT * FROM carts WHERE site_id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
  } else {
    cart = await env.DB.prepare(
      "SELECT * FROM carts WHERE site_id = ? AND session_id = ?"
    ).bind(siteId, sessionId).first();
  }
  if (!cart) {
    const cartId = generateId();
    await env.DB.prepare(
      `INSERT INTO carts (id, site_id, user_id, session_id, items, subtotal, created_at)
       VALUES (?, ?, ?, ?, '[]', 0, datetime('now'))`
    ).bind(cartId, siteId, user ? user.id : null, user ? null : sessionId).run();
    cart = { id: cartId, items: "[]", subtotal: 0 };
  }
  return cart;
}
__name(getOrCreateCart, "getOrCreateCart");
async function getCart(env, siteId, user, sessionId) {
  try {
    const cart = await getOrCreateCart(env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const enrichedItems = [];
    for (const item of items) {
      const product = await env.DB.prepare(
        "SELECT id, name, price, stock, thumbnail_url, images, is_active FROM products WHERE id = ? AND site_id = ?"
      ).bind(item.productId, siteId).first();
      if (product && product.is_active) {
        let imageUrl = product.thumbnail_url;
        if (!imageUrl && product.images) {
          try {
            const imgs = JSON.parse(product.images);
            if (Array.isArray(imgs) && imgs.length > 0)
              imageUrl = imgs[0];
          } catch {
          }
        }
        enrichedItems.push({
          ...item,
          name: product.name,
          price: product.price,
          thumbnail: imageUrl,
          inStock: product.stock >= item.quantity,
          availableStock: product.stock
        });
      }
    }
    const subtotal = enrichedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return successResponse({
      id: cart.id,
      items: enrichedItems,
      itemCount: enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal
    });
  } catch (error) {
    console.error("Get cart error:", error);
    return errorResponse("Failed to fetch cart", 500);
  }
}
__name(getCart, "getCart");
async function addToCart(request, env, siteId, user, sessionId) {
  try {
    const { productId, quantity, variant } = await request.json();
    if (!productId || !quantity || quantity < 1) {
      return errorResponse("Product ID and quantity are required");
    }
    const product = await env.DB.prepare(
      "SELECT id, stock, is_active FROM products WHERE id = ? AND site_id = ?"
    ).bind(productId, siteId).first();
    if (!product) {
      return errorResponse("Product not found", 404);
    }
    if (!product.is_active) {
      return errorResponse("Product is not available", 400);
    }
    if (product.stock < quantity) {
      return errorResponse("Insufficient stock", 400, "INSUFFICIENT_STOCK");
    }
    const cart = await getOrCreateCart(env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const existingIndex = items.findIndex(
      (item) => item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
    );
    if (existingIndex >= 0) {
      const newQuantity = items[existingIndex].quantity + quantity;
      if (newQuantity > product.stock) {
        return errorResponse("Insufficient stock", 400, "INSUFFICIENT_STOCK");
      }
      items[existingIndex].quantity = newQuantity;
    } else {
      items.push({
        productId,
        quantity,
        variant: variant || null,
        addedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    await env.DB.prepare(
      `UPDATE carts SET items = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(items), cart.id).run();
    return successResponse({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }, "Item added to cart");
  } catch (error) {
    console.error("Add to cart error:", error);
    return errorResponse("Failed to add item to cart", 500);
  }
}
__name(addToCart, "addToCart");
async function updateCartItem(request, env, siteId, user, sessionId) {
  try {
    const { productId, quantity, variant } = await request.json();
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    const cart = await getOrCreateCart(env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const existingIndex = items.findIndex(
      (item) => item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
    );
    if (existingIndex < 0) {
      return errorResponse("Item not found in cart", 404);
    }
    if (quantity <= 0) {
      items.splice(existingIndex, 1);
    } else {
      const product = await env.DB.prepare(
        "SELECT stock FROM products WHERE id = ? AND site_id = ?"
      ).bind(productId, siteId).first();
      if (product && quantity > product.stock) {
        return errorResponse("Insufficient stock", 400, "INSUFFICIENT_STOCK");
      }
      items[existingIndex].quantity = quantity;
    }
    await env.DB.prepare(
      `UPDATE carts SET items = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(items), cart.id).run();
    return successResponse({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }, "Cart updated");
  } catch (error) {
    console.error("Update cart error:", error);
    return errorResponse("Failed to update cart", 500);
  }
}
__name(updateCartItem, "updateCartItem");
async function removeFromCart(request, env, siteId, user, sessionId) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    const variant = url.searchParams.get("variant");
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    const cart = await getOrCreateCart(env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const parsedVariant = variant ? variant : null;
    const filteredItems = items.filter(
      (item) => !(item.productId === productId && JSON.stringify(item.variant ?? null) === JSON.stringify(parsedVariant))
    );
    await env.DB.prepare(
      `UPDATE carts SET items = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(filteredItems), cart.id).run();
    return successResponse({ itemCount: filteredItems.reduce((sum, i) => sum + i.quantity, 0) }, "Item removed from cart");
  } catch (error) {
    console.error("Remove from cart error:", error);
    return errorResponse("Failed to remove item from cart", 500);
  }
}
__name(removeFromCart, "removeFromCart");
async function mergeCarts(env, siteId, userId, sessionId) {
  try {
    const guestCart = await env.DB.prepare(
      "SELECT * FROM carts WHERE site_id = ? AND session_id = ?"
    ).bind(siteId, sessionId).first();
    if (!guestCart)
      return;
    const userCart = await env.DB.prepare(
      "SELECT * FROM carts WHERE site_id = ? AND user_id = ?"
    ).bind(siteId, userId).first();
    const guestItems = JSON.parse(guestCart.items);
    if (userCart) {
      const userItems = JSON.parse(userCart.items);
      for (const guestItem of guestItems) {
        const existingIndex = userItems.findIndex(
          (item) => item.productId === guestItem.productId && JSON.stringify(item.variant) === JSON.stringify(guestItem.variant)
        );
        if (existingIndex >= 0) {
          userItems[existingIndex].quantity += guestItem.quantity;
        } else {
          userItems.push(guestItem);
        }
      }
      await env.DB.prepare(
        `UPDATE carts SET items = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(JSON.stringify(userItems), userCart.id).run();
    } else {
      await env.DB.prepare(
        `UPDATE carts SET user_id = ?, session_id = NULL, updated_at = datetime('now') WHERE id = ?`
      ).bind(userId, guestCart.id).run();
      return;
    }
    await env.DB.prepare("DELETE FROM carts WHERE id = ?").bind(guestCart.id).run();
  } catch (error) {
    console.error("Merge carts error:", error);
  }
}
__name(mergeCarts, "mergeCarts");

// workers/storefront/wishlist-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
async function handleWishlist(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const pathParts = path.split("/").filter(Boolean);
  const subAction = pathParts[2];
  if (subAction === "check") {
    return checkWishlist(request, env);
  }
  const user = await validateAnyAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  const method = request.method;
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  if (!siteId) {
    return errorResponse("Site ID is required");
  }
  switch (method) {
    case "GET":
      return getWishlist(env, user, siteId);
    case "POST":
      return addToWishlist(request, env, user, siteId);
    case "DELETE":
      return removeFromWishlist(request, env, user, siteId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleWishlist, "handleWishlist");
async function checkWishlist(request, env) {
  const user = await validateAnyAuth(request, env);
  if (!user) {
    return successResponse({ inWishlist: false });
  }
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  const productId = url.searchParams.get("productId");
  if (!siteId || !productId) {
    return errorResponse("siteId and productId are required");
  }
  try {
    const existing = await env.DB.prepare(
      "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?"
    ).bind(user.id, productId, siteId).first();
    return successResponse({ inWishlist: !!existing });
  } catch (error) {
    console.error("Check wishlist error:", error);
    return successResponse({ inWishlist: false });
  }
}
__name(checkWishlist, "checkWishlist");
async function getWishlist(env, user, siteId) {
  try {
    const wishlistItems = await env.DB.prepare(
      `SELECT w.id, w.product_id, w.created_at,
              p.name, p.price, p.compare_price, p.thumbnail_url, p.images, p.stock, p.is_active
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ? AND w.site_id = ?
       ORDER BY w.created_at DESC`
    ).bind(user.id, siteId).all();
    const items = wishlistItems.results.map((item) => {
      let imageUrl = item.thumbnail_url;
      if (!imageUrl && item.images) {
        try {
          const imgs = JSON.parse(item.images);
          if (Array.isArray(imgs) && imgs.length > 0)
            imageUrl = imgs[0];
        } catch {
        }
      }
      return {
        id: item.id,
        productId: item.product_id,
        name: item.name,
        price: item.price,
        comparePrice: item.compare_price,
        thumbnail: imageUrl,
        inStock: item.stock > 0,
        isActive: !!item.is_active,
        addedAt: item.created_at
      };
    });
    return successResponse({
      items,
      count: items.length
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    return errorResponse("Failed to fetch wishlist", 500);
  }
}
__name(getWishlist, "getWishlist");
async function addToWishlist(request, env, user, siteId) {
  try {
    const { productId } = await request.json();
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    const product = await env.DB.prepare(
      "SELECT id FROM products WHERE id = ? AND site_id = ? AND is_active = 1"
    ).bind(productId, siteId).first();
    if (!product) {
      return errorResponse("Product not found", 404);
    }
    const existing = await env.DB.prepare(
      "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?"
    ).bind(user.id, productId, siteId).first();
    if (existing) {
      return errorResponse("Product already in wishlist", 400, "ALREADY_EXISTS");
    }
    const wishlistId = generateId();
    await env.DB.prepare(
      `INSERT INTO wishlists (id, site_id, user_id, product_id, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(wishlistId, siteId, user.id, productId).run();
    return successResponse({ id: wishlistId }, "Added to wishlist");
  } catch (error) {
    console.error("Add to wishlist error:", error);
    return errorResponse("Failed to add to wishlist", 500);
  }
}
__name(addToWishlist, "addToWishlist");
async function removeFromWishlist(request, env, user, siteId) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    await env.DB.prepare(
      "DELETE FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?"
    ).bind(user.id, productId, siteId).run();
    return successResponse(null, "Removed from wishlist");
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    return errorResponse("Failed to remove from wishlist", 500);
  }
}
__name(removeFromWishlist, "removeFromWishlist");

// workers/platform/payments-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
import crypto2 from "node:crypto";
async function handlePayments(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  switch (action) {
    case "create-order":
      return createRazorpayOrder(request, env);
    case "verify":
      return verifyPayment(request, env);
    case "subscription":
      return handleSubscription(request, env);
    default:
      return errorResponse("Not found", 404);
  }
}
__name(handlePayments, "handlePayments");
async function getRazorpayCredentials(env, siteId) {
  if (siteId) {
    try {
      const site = await env.DB.prepare("SELECT settings FROM sites WHERE id = ?").bind(siteId).first();
      if (site?.settings) {
        let settings = site.settings;
        if (typeof settings === "string") {
          try {
            settings = JSON.parse(settings);
          } catch {
          }
        }
        if (settings?.razorpayKeyId && settings?.razorpayKeySecret) {
          return { keyId: settings.razorpayKeyId, keySecret: settings.razorpayKeySecret, perSite: true };
        }
      }
    } catch (err) {
      console.error("Failed to load site Razorpay credentials:", err);
    }
  }
  return { keyId: env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET, perSite: false };
}
__name(getRazorpayCredentials, "getRazorpayCredentials");
async function ensurePaymentTablesExist(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id TEXT PRIMARY KEY,
        site_id TEXT,
        user_id TEXT,
        order_id TEXT,
        subscription_id TEXT,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        razorpay_signature TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        error_code TEXT,
        error_description TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
      )
    `).run();
  } catch (err) {
    console.error("Failed to ensure payment tables:", err);
  }
}
__name(ensurePaymentTablesExist, "ensurePaymentTablesExist");
async function createRazorpayOrder(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { amount, currency, receipt, notes, orderId, type, siteId } = await request.json();
    if (!amount) {
      return errorResponse("Amount is required");
    }
    const { keyId, keySecret } = await getRazorpayCredentials(env, siteId);
    if (!keyId || !keySecret) {
      return errorResponse("Razorpay credentials not configured. Please add Razorpay Key ID and Key Secret in your store settings.", 500);
    }
    const amountInPaise = Math.round(amount * 100);
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${keyId}:${keySecret}`),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: currency || "INR",
        receipt: receipt || `order_${Date.now()}`,
        notes: notes || {}
      })
    });
    if (!response.ok) {
      let errorDetail = "";
      try {
        const error = await response.json();
        console.error("Razorpay API error:", JSON.stringify(error));
        errorDetail = error?.error?.description || "Razorpay rejected the request";
      } catch {
        const errorText = await response.text();
        console.error("Razorpay error (non-JSON):", errorText);
        errorDetail = "Razorpay returned an unexpected response";
      }
      return errorResponse(`Failed to create payment order: ${errorDetail}`, 500);
    }
    const razorpayOrder = await response.json();
    await ensurePaymentTablesExist(env);
    try {
      await env.DB.prepare(
        `INSERT INTO payment_transactions (id, site_id, order_id, razorpay_order_id, amount, currency, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`
      ).bind(generateId(), siteId || null, orderId || null, razorpayOrder.id, amount, currency || "INR").run();
    } catch (dbErr) {
      console.error("Failed to log payment transaction (non-fatal):", dbErr);
    }
    return successResponse({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId
    });
  } catch (error) {
    console.error("Create payment order error:", error.message || error);
    return errorResponse("Failed to create payment order: " + (error.message || "Unknown error"), 500);
  }
}
__name(createRazorpayOrder, "createRazorpayOrder");
async function verifyPayment(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
            id TEXT PRIMARY KEY,
            site_id TEXT,
            user_id TEXT,
            order_id TEXT,
            subscription_id TEXT,
            razorpay_order_id TEXT,
            razorpay_payment_id TEXT,
            razorpay_signature TEXT,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'INR',
            status TEXT DEFAULT 'pending',
            payment_method TEXT,
            error_code TEXT,
            error_description TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
            FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
        )
    `).run();
    await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            plan TEXT NOT NULL,
            billing_cycle TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'INR',
            status TEXT DEFAULT 'active',
            razorpay_subscription_id TEXT,
            current_period_start TEXT,
            current_period_end TEXT,
            cancelled_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `).run();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, billingCycle, siteId, orderId } = await request.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse("Missing payment verification data");
    }
    const { keySecret } = await getRazorpayCredentials(env, siteId);
    if (!keySecret) {
      return errorResponse("Razorpay credentials not configured", 500);
    }
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const computedSignature = crypto2.createHmac("sha256", keySecret).update(body).digest("hex");
    console.log("VerifyPayment: signature match?", computedSignature === razorpay_signature);
    console.log("VerifyPayment: receivedSignature:", razorpay_signature);
    console.log("VerifyPayment: computedSignature:", computedSignature);
    if (computedSignature !== razorpay_signature) {
      return errorResponse("Invalid payment signature", 400, "INVALID_SIGNATURE");
    }
    const existingTx = await env.DB.prepare(
      `SELECT order_id, status FROM payment_transactions WHERE razorpay_order_id = ?`
    ).bind(razorpay_order_id).first();
    if (existingTx?.status === "completed") {
      console.log("Payment already verified, skipping duplicate:", razorpay_order_id);
      return successResponse({ verified: true, duplicate: true }, "Payment already verified");
    }
    await env.DB.prepare(
      `UPDATE payment_transactions 
       SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'completed', payment_method = 'razorpay'
       WHERE razorpay_order_id = ? AND status = 'pending'`
    ).bind(razorpay_payment_id, razorpay_signature, razorpay_order_id).run();
    const paymentTx = existingTx;
    const dbOrderId = paymentTx?.order_id || orderId || null;
    if (dbOrderId) {
      let order = null;
      order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(dbOrderId).first();
      if (order) {
        await env.DB.prepare(
          `UPDATE orders SET status = 'paid', payment_status = 'paid', payment_method = 'razorpay', razorpay_order_id = ?, razorpay_payment_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(razorpay_order_id, razorpay_payment_id, dbOrderId).run();
        console.log("Order status updated to paid:", dbOrderId);
        await processPostPaymentActions(env, order);
      } else {
        try {
          order = await env.DB.prepare("SELECT * FROM guest_orders WHERE id = ?").bind(dbOrderId).first();
          if (order) {
            await env.DB.prepare(
              `UPDATE guest_orders SET status = 'paid', payment_status = 'paid', payment_method = 'razorpay', razorpay_order_id = ?, razorpay_payment_id = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(razorpay_order_id, razorpay_payment_id, dbOrderId).run();
            console.log("Guest order status updated to paid:", dbOrderId);
            await processPostPaymentActions(env, order);
          }
        } catch (guestUpdateErr) {
          console.error("Failed to update guest order status:", guestUpdateErr);
        }
      }
    }
    if (planId && billingCycle) {
      const user = await validateAuth(request, env);
      if (user) {
        console.log(`Activating subscription: user=${user.id}, plan=${planId}, cycle=${billingCycle}`);
        const activated = await activateSubscription(env, user.id, planId, billingCycle, razorpay_payment_id);
        if (!activated) {
          console.error("Failed to activate subscription in verifyPayment");
        } else {
          console.log("Subscription activated successfully");
        }
      } else {
        console.error("User not authenticated during payment verification");
      }
    }
    return successResponse({ verified: true, planActivated: true }, "Payment verified and plan activated successfully");
  } catch (error) {
    console.error("Verify payment error:", error);
    return errorResponse("Payment verification failed", 500);
  }
}
__name(verifyPayment, "verifyPayment");
async function processPostPaymentActions(env, order) {
  try {
    const orderItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    for (const item of orderItems) {
      await updateProductStock(env, item.productId, item.quantity, "decrement");
    }
    console.log("Stock decremented after payment for order:", order.id);
  } catch (stockErr) {
    console.error("Failed to decrement stock after payment:", stockErr);
  }
  try {
    const orderItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    const shippingAddress = typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address;
    await sendOrderEmails(env, order.site_id, {
      orderNumber: order.order_number,
      processedItems: orderItems,
      total: order.total,
      paymentMethod: "razorpay",
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      shippingAddress
    });
    console.log("Order confirmation emails sent after payment for order:", order.id);
  } catch (emailErr) {
    console.error("Failed to send order emails after payment:", emailErr);
  }
}
__name(processPostPaymentActions, "processPostPaymentActions");
async function handleSubscription(request, env) {
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }
  if (request.method === "GET") {
    return getUserSubscription(env, user);
  }
  if (request.method === "POST") {
    return createSubscriptionOrder(request, env, user);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handleSubscription, "handleSubscription");
async function getUserSubscription(env, user) {
  try {
    const subscription = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(user.id).first();
    if (!subscription) {
      return successResponse({ plan: "free", status: "none" });
    }
    return successResponse({
      id: subscription.id,
      plan: subscription.plan,
      billingCycle: subscription.billing_cycle,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return errorResponse("Failed to fetch subscription", 500);
  }
}
__name(getUserSubscription, "getUserSubscription");
async function createSubscriptionOrder(request, env, user) {
  try {
    const { planId, billingCycle } = await request.json();
    const plans = {
      basic: { monthly: 99, "6months": 499, yearly: 899 },
      premium: { monthly: 299, "6months": 1499, yearly: 2499 },
      pro: { monthly: 999, "6months": 4999, yearly: 8999 }
    };
    if (!plans[planId] || !plans[planId][billingCycle]) {
      return errorResponse("Invalid plan or billing cycle");
    }
    const amount = plans[planId][billingCycle];
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: "INR",
        receipt: `sub_${user.id.slice(0, 8)}_${Date.now().toString(36)}`,
        notes: {
          userId: user.id,
          planId,
          billingCycle,
          type: "subscription"
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = errorText;
      }
      console.error("Razorpay Error Response:", errorData);
      const errorMessage = errorData && errorData.error && errorData.error.description ? `Razorpay error: ${errorData.error.description}` : "Failed to create subscription order";
      return errorResponse(errorMessage, 500);
    }
    const razorpayOrder = await response.json();
    return successResponse({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: env.RAZORPAY_KEY_ID,
      planId,
      billingCycle
    });
  } catch (error) {
    console.error("Create subscription order error:", error);
    return errorResponse("Failed to create subscription order", 500);
  }
}
__name(createSubscriptionOrder, "createSubscriptionOrder");
async function activateSubscription(env, userId, planId, billingCycle, razorpayPaymentId) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'active',
        razorpay_subscription_id TEXT,
        current_period_start TEXT,
        current_period_end TEXT,
        cancelled_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
    const userSub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY current_period_end DESC LIMIT 1`
    ).bind(userId).first();
    const periodMonths = billingCycle === "monthly" ? 1 : billingCycle === "6months" ? 6 : 12;
    let periodStart = /* @__PURE__ */ new Date();
    if (userSub && userSub.current_period_end) {
      const currentEnd = new Date(userSub.current_period_end);
      if (currentEnd > periodStart) {
        periodStart = currentEnd;
      }
    }
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + periodMonths);
    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now') WHERE user_id = ? AND status = 'active' AND id != ?`
    ).bind(userId, userSub?.id || "").run();
    const plans = {
      basic: { monthly: 99, "6months": 499, yearly: 899 },
      premium: { monthly: 299, "6months": 1499, yearly: 2499 },
      pro: { monthly: 999, "6months": 4999, yearly: 8999 }
    };
    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, billing_cycle, amount, status, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'))`
    ).bind(
      generateId(),
      userId,
      planId,
      billingCycle,
      plans[planId][billingCycle],
      periodStart.toISOString(),
      periodEnd.toISOString()
    ).run();
    console.log(`Inserted subscription record for user ${userId}`);
    await env.DB.prepare(
      `UPDATE users SET updated_at = datetime('now') WHERE id = ?`
    ).bind(userId).run();
    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`
    ).bind(planId, periodEnd.toISOString(), userId).run();
    console.log(`Updated sites table for user ${userId}`);
    return true;
  } catch (error) {
    console.error("Activate subscription error:", error);
    if (error.message)
      console.error("Error message:", error.message);
    return false;
  }
}
__name(activateSubscription, "activateSubscription");

// workers/storefront/categories-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
init_site_admin_worker();
async function handleCategories(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const url = new URL(request.url);
  const pathParts = path.split("/").filter(Boolean);
  const categoryId = pathParts[2];
  if (method === "GET") {
    const siteId = url.searchParams.get("siteId");
    const subdomain = url.searchParams.get("subdomain");
    const slug = url.searchParams.get("slug");
    if (categoryId) {
      return getCategory(env, categoryId);
    }
    return getCategories(env, { siteId, subdomain, slug });
  }
  let user = await validateAuth(request, env);
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("SiteAdmin ")) {
      let adminSiteId = url.searchParams.get("siteId");
      if (!adminSiteId && method === "POST") {
        try {
          const cloned = request.clone();
          const body = await cloned.json();
          adminSiteId = body.siteId;
        } catch (e) {
        }
      }
      if (!adminSiteId && (method === "PUT" || method === "DELETE") && categoryId) {
        try {
          const cat = await env.DB.prepare("SELECT site_id FROM categories WHERE id = ?").bind(categoryId).first();
          if (cat)
            adminSiteId = cat.site_id;
        } catch (e) {
        }
      }
      if (adminSiteId) {
        const admin = await validateSiteAdmin(request, env, adminSiteId);
        if (admin) {
          user = { id: admin.userId || "site-admin", _adminSiteId: adminSiteId };
        }
      }
    }
  }
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  switch (method) {
    case "POST":
      return createCategory(request, env, user);
    case "PUT":
      return updateCategory(request, env, user, categoryId);
    case "DELETE":
      return deleteCategory(env, user, categoryId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleCategories, "handleCategories");
async function getCategories(env, { siteId, subdomain, slug }) {
  try {
    let query = `SELECT c.*, 
                   (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
                 FROM categories c WHERE 1=1`;
    const bindings = [];
    if (siteId) {
      query += " AND c.site_id = ?";
      bindings.push(siteId);
    } else if (subdomain) {
      query = `SELECT c.*, 
                 (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
               FROM categories c 
               JOIN sites s ON c.site_id = s.id 
               WHERE LOWER(s.subdomain) = LOWER(?)`;
      bindings.push(subdomain);
    } else {
      query += " AND 1=0";
    }
    if (slug) {
      query += " AND c.slug = ?";
      bindings.push(slug);
    }
    query += " ORDER BY c.display_order, c.name";
    const categories = await env.DB.prepare(query).bind(...bindings).all();
    const parentCategories = categories.results.filter((c) => !c.parent_id);
    const result = parentCategories.map((parent) => ({
      ...parent,
      children: categories.results.filter((c) => c.parent_id === parent.id)
    }));
    return successResponse(result);
  } catch (error) {
    console.error("Get categories error:", error);
    return errorResponse("Failed to fetch categories", 500);
  }
}
__name(getCategories, "getCategories");
async function getCategory(env, categoryId) {
  try {
    const category = await env.DB.prepare(
      `SELECT c.*, s.subdomain, s.brand_name
       FROM categories c 
       JOIN sites s ON c.site_id = s.id 
       WHERE c.id = ?`
    ).bind(categoryId).first();
    if (!category) {
      return errorResponse("Category not found", 404, "NOT_FOUND");
    }
    const children = await env.DB.prepare(
      "SELECT * FROM categories WHERE parent_id = ? ORDER BY display_order"
    ).bind(categoryId).all();
    return successResponse({
      ...category,
      children: children.results
    });
  } catch (error) {
    console.error("Get category error:", error);
    return errorResponse("Failed to fetch category", 500);
  }
}
__name(getCategory, "getCategory");
async function createCategory(request, env, user) {
  try {
    const { siteId, name, description, parentId, imageUrl, displayOrder, subtitle, showOnHome } = await request.json();
    if (!siteId || !name) {
      return errorResponse("Site ID and name are required");
    }
    let site;
    if (user._adminSiteId && user._adminSiteId === siteId) {
      site = await env.DB.prepare("SELECT id FROM sites WHERE id = ?").bind(siteId).first();
    } else {
      site = await env.DB.prepare(
        "SELECT id FROM sites WHERE id = ? AND user_id = ?"
      ).bind(siteId, user.id).first();
    }
    if (!site) {
      return errorResponse("Site not found or unauthorized", 404);
    }
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
    const existing = await env.DB.prepare(
      "SELECT id FROM categories WHERE site_id = ? AND slug = ?"
    ).bind(siteId, slug).first();
    if (existing) {
      return errorResponse("Category with this name already exists", 400, "SLUG_EXISTS");
    }
    const categoryId = generateId();
    await env.DB.prepare(
      `INSERT INTO categories (id, site_id, name, slug, description, subtitle, show_on_home, parent_id, image_url, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      categoryId,
      siteId,
      sanitizeInput(name),
      slug,
      description || null,
      subtitle || null,
      showOnHome !== void 0 ? showOnHome ? 1 : 0 : 1,
      parentId || null,
      imageUrl || null,
      displayOrder || 0
    ).run();
    return successResponse({ id: categoryId, slug }, "Category created successfully");
  } catch (error) {
    console.error("Create category error:", error);
    return errorResponse("Failed to create category", 500);
  }
}
__name(createCategory, "createCategory");
async function updateCategory(request, env, user, categoryId) {
  if (!categoryId) {
    return errorResponse("Category ID is required");
  }
  try {
    let category;
    if (user._adminSiteId) {
      category = await env.DB.prepare(
        "SELECT id, site_id FROM categories WHERE id = ? AND site_id = ?"
      ).bind(categoryId, user._adminSiteId).first();
    } else {
      category = await env.DB.prepare(
        `SELECT c.id, c.site_id FROM categories c 
         JOIN sites s ON c.site_id = s.id 
         WHERE c.id = ? AND s.user_id = ?`
      ).bind(categoryId, user.id).first();
    }
    if (!category) {
      return errorResponse("Category not found or unauthorized", 404);
    }
    const updates = await request.json();
    const allowedFields = ["name", "description", "subtitle", "show_on_home", "parent_id", "image_url", "display_order", "is_active"];
    const setClause = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = ?`);
        if (typeof value === "boolean") {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    }
    if (updates.name) {
      const slug = updates.name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
      setClause.push("slug = ?");
      values.push(slug);
    }
    if (setClause.length === 0) {
      return errorResponse("No valid fields to update");
    }
    setClause.push('updated_at = datetime("now")');
    values.push(categoryId);
    await env.DB.prepare(
      `UPDATE categories SET ${setClause.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    return successResponse(null, "Category updated successfully");
  } catch (error) {
    console.error("Update category error:", error);
    return errorResponse("Failed to update category", 500);
  }
}
__name(updateCategory, "updateCategory");
async function deleteCategory(env, user, categoryId) {
  if (!categoryId) {
    return errorResponse("Category ID is required");
  }
  try {
    let category;
    if (user._adminSiteId) {
      category = await env.DB.prepare(
        "SELECT id FROM categories WHERE id = ? AND site_id = ?"
      ).bind(categoryId, user._adminSiteId).first();
    } else {
      category = await env.DB.prepare(
        `SELECT c.id FROM categories c 
         JOIN sites s ON c.site_id = s.id 
         WHERE c.id = ? AND s.user_id = ?`
      ).bind(categoryId, user.id).first();
    }
    if (!category) {
      return errorResponse("Category not found or unauthorized", 404);
    }
    await env.DB.prepare(
      "UPDATE categories SET parent_id = NULL WHERE parent_id = ?"
    ).bind(categoryId).run();
    await env.DB.prepare(
      "UPDATE products SET category_id = NULL WHERE category_id = ?"
    ).bind(categoryId).run();
    await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(categoryId).run();
    return successResponse(null, "Category deleted successfully");
  } catch (error) {
    console.error("Delete category error:", error);
    return errorResponse("Failed to delete category", 500);
  }
}
__name(deleteCategory, "deleteCategory");

// workers/platform/users-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
async function handleUsers(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  switch (action) {
    case "profile":
      return handleProfile(request, env, user);
    case "subscription":
      return handleSubscription2(request, env, user);
    default:
      return errorResponse("Not found", 404);
  }
}
__name(handleUsers, "handleUsers");
async function handleProfile(request, env, user) {
  if (request.method === "GET") {
    return getProfile(env, user);
  }
  if (request.method === "PUT" || request.method === "PATCH") {
    return updateProfile(request, env, user);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handleProfile, "handleProfile");
async function getProfile(env, user) {
  try {
    let profile = null;
    let subscription = null;
    profile = await env.DB.prepare(
      `SELECT id, email, name, phone, email_verified FROM users WHERE id = ?`
    ).bind(user.id).first();
    if (!profile) {
      return errorResponse("User not found", 404);
    }
    try {
      subscription = await env.DB.prepare(
        `SELECT plan, billing_cycle, status, current_period_start, current_period_end 
         FROM subscriptions 
         WHERE user_id = ? AND status = 'active' 
         ORDER BY created_at DESC 
         LIMIT 1`
      ).bind(user.id).first();
    } catch (subError) {
      console.error("Subscription query error (table may not exist):", subError);
    }
    return successResponse({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      emailVerified: !!profile.email_verified,
      plan: subscription?.plan || null,
      billingCycle: subscription?.billing_cycle || null,
      status: subscription?.status || "none",
      trialStartDate: subscription?.current_period_start || null,
      trialEndDate: subscription?.current_period_end || null
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return errorResponse("Failed to fetch profile", 500);
  }
}
__name(getProfile, "getProfile");
async function updateProfile(request, env, user) {
  try {
    const updates = await request.json();
    const { name, phone } = updates;
    await env.DB.prepare(
      `UPDATE users SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(name || null, phone || null, user.id).run();
    return successResponse(null, "Profile updated successfully");
  } catch (error) {
    console.error("Update profile error:", error);
    return errorResponse("Failed to update profile", 500);
  }
}
__name(updateProfile, "updateProfile");
async function handleSubscription2(request, env, user) {
  if (request.method === "GET") {
    return getSubscription(env, user);
  }
  if (request.method === "PATCH" || request.method === "PUT") {
    return updateSubscription(request, env, user);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handleSubscription2, "handleSubscription");
async function getSubscription(env, user) {
  try {
    let subscription = null;
    try {
      subscription = await env.DB.prepare(
        `SELECT * FROM subscriptions 
         WHERE user_id = ? AND status = 'active' 
         ORDER BY created_at DESC 
         LIMIT 1`
      ).bind(user.id).first();
    } catch (subError) {
      console.error("Subscription query error (table may not exist):", subError);
      return successResponse({
        plan: null,
        status: "none",
        billingCycle: null
      });
    }
    if (!subscription) {
      return successResponse({
        plan: null,
        status: "none",
        billingCycle: null
      });
    }
    return successResponse({
      id: subscription.id,
      plan: subscription.plan,
      billingCycle: subscription.billing_cycle,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return errorResponse("Failed to fetch subscription", 500);
  }
}
__name(getSubscription, "getSubscription");
async function ensureSubscriptionsTable(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'active',
        razorpay_subscription_id TEXT,
        current_period_start TEXT,
        current_period_end TEXT,
        cancelled_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();
    return true;
  } catch (error) {
    console.error("Failed to ensure subscriptions table:", error);
    return false;
  }
}
__name(ensureSubscriptionsTable, "ensureSubscriptionsTable");
async function updateSubscription(request, env, user) {
  try {
    const { plan, billingCycle, status } = await request.json();
    await ensureSubscriptionsTable(env);
    const subscriptionPlans = {
      trial: { monthly: 0, "6months": 0, yearly: 0, rank: 0 },
      basic: { monthly: 99, "6months": 499, yearly: 899, rank: 1 },
      premium: { monthly: 299, "6months": 1499, yearly: 2499, rank: 2 },
      pro: { monthly: 999, "6months": 4999, yearly: 8999, rank: 3 }
    };
    let existingSubscription = null;
    try {
      existingSubscription = await env.DB.prepare(
        `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'`
      ).bind(user.id).first();
    } catch (e) {
      console.error("Error checking existing subscription:", e);
    }
    if (existingSubscription) {
      if (status === "expired" || status === "cancelled") {
        await env.DB.prepare(
          `UPDATE subscriptions SET status = ?, cancelled_at = datetime('now') WHERE id = ?`
        ).bind(status, existingSubscription.id).run();
        return successResponse(null, "Subscription updated");
      }
      if (plan && subscriptionPlans[plan] && subscriptionPlans[existingSubscription.plan]) {
        const isDowngrade = subscriptionPlans[plan].rank < subscriptionPlans[existingSubscription.plan].rank;
        const isExpired2 = existingSubscription.current_period_end && new Date(existingSubscription.current_period_end) < /* @__PURE__ */ new Date();
        if (isDowngrade && !isExpired2) {
          return errorResponse("You can only downgrade after your current plan expires", 400);
        }
      }
      let periodEnd2 = existingSubscription.current_period_end;
      const newPlan = plan || existingSubscription.plan;
      const newCycle = billingCycle || existingSubscription.billing_cycle;
      if (plan || billingCycle) {
        let periodDays2 = 30;
        if (newCycle === "6months")
          periodDays2 = 180;
        if (newCycle === "yearly")
          periodDays2 = 365;
        if (newPlan === "trial")
          periodDays2 = 7;
        const date = /* @__PURE__ */ new Date();
        date.setDate(date.getDate() + periodDays2);
        periodEnd2 = date.toISOString();
      }
      const amount2 = newPlan === "trial" ? 0 : subscriptionPlans[newPlan]?.[newCycle] || 0;
      await env.DB.prepare(
        `UPDATE subscriptions SET 
          plan = COALESCE(?, plan),
          billing_cycle = COALESCE(?, billing_cycle),
          status = COALESCE(?, status),
          amount = ?,
          current_period_start = datetime('now'),
          current_period_end = ?,
          updated_at = datetime('now')
         WHERE id = ?`
      ).bind(plan || null, billingCycle || null, status || null, amount2, periodEnd2, existingSubscription.id).run();
      return successResponse(null, "Subscription updated");
    }
    let periodDays = 30;
    if (billingCycle === "6months")
      periodDays = 180;
    if (billingCycle === "yearly")
      periodDays = 365;
    if (plan === "trial")
      periodDays = 7;
    const periodEnd = /* @__PURE__ */ new Date();
    periodEnd.setDate(periodEnd.getDate() + periodDays);
    const amount = plan === "trial" ? 0 : subscriptionPlans[plan]?.[billingCycle] || 0;
    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, billing_cycle, amount, status, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))`
    ).bind(
      generateId(),
      user.id,
      plan,
      billingCycle || "monthly",
      amount,
      status || "active",
      periodEnd.toISOString()
    ).run();
    return successResponse(null, "Subscription created");
  } catch (error) {
    console.error("Update subscription error:", error);
    return errorResponse("Failed to update subscription", 500);
  }
}
__name(updateSubscription, "updateSubscription");

// workers/site-router.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
async function handleSiteRouting(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const hostParts = hostname.split(".");
  let subdomain = null;
  if (hostname.endsWith("fluxe.in")) {
    if (hostParts.length >= 3 && hostParts[0] !== "www") {
      subdomain = hostParts[0];
    }
  } else if (hostname.endsWith("pages.dev")) {
    if (hostParts.length >= 4) {
      subdomain = hostParts[0];
    }
  }
  const subdomainParam = url.searchParams.get("subdomain");
  if (subdomainParam) {
    subdomain = subdomainParam;
  }
  const path = url.pathname;
  if (path.startsWith("/api/")) {
    return null;
  }
  let site = null;
  if (subdomain) {
    try {
      site = await env.DB.prepare(
        `SELECT * FROM sites WHERE LOWER(subdomain) = LOWER(?) AND is_active = 1`
      ).bind(subdomain).first();
    } catch (error) {
      console.error("Site routing subdomain lookup error:", error);
    }
  }
  if (!site && !hostname.endsWith("fluxe.in") && !hostname.endsWith("pages.dev") && !hostname.includes("localhost") && !hostname.includes("workers.dev")) {
    try {
      site = await env.DB.prepare(
        `SELECT * FROM sites WHERE custom_domain = ? AND domain_status = 'verified' AND is_active = 1`
      ).bind(hostname.toLowerCase()).first();
    } catch (error) {
      console.error("Site routing custom domain lookup error:", error);
    }
  }
  if (!site) {
    if (!subdomain)
      return null;
    return new Response("Site not found", {
      status: 404,
      headers: corsHeaders()
    });
  }
  try {
    const isExpired2 = site.subscription_expires_at && new Date(site.subscription_expires_at) < /* @__PURE__ */ new Date();
    if (isExpired2) {
      return new Response(
        `<html>
          <head>
            <title>Site Disabled - Fluxe</title>
            <style>
              body { font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
              .container { text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 400px; }
              h1 { font-size: 1.5rem; margin-bottom: 1rem; color: #ef4444; }
              p { color: #64748b; line-height: 1.6; margin-bottom: 2rem; }
              .btn { background: #2563eb; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Site Disabled</h1>
              <p>The subscription for <strong>${site.brand_name || subdomain}</strong> has expired. Please contact the site owner or renew the plan to restore access.</p>
              <a href="https://fluxe.in" class="btn">Go to Fluxe</a>
            </div>
          </body>
        </html>`,
        {
          status: 402,
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() }
        }
      );
    }
    return serveStorefrontApp(request, env, path);
  } catch (error) {
    console.error("Site routing error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
__name(handleSiteRouting, "handleSiteRouting");
async function serveStorefrontApp(request, env, path) {
  const isAsset = path.startsWith("/assets/") || path.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|otf|map|json)$/i);
  if (isAsset) {
    const storefrontAssetPath = `/storefront${path}`;
    if (env.ASSETS) {
      try {
        const assetRequest = new Request(`https://placeholder.com${storefrontAssetPath}`);
        const response3 = await env.ASSETS.fetch(assetRequest);
        if (response3.ok) {
          const headers = new Headers(response3.headers);
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
          headers.set("Access-Control-Allow-Origin", "*");
          return new Response(response3.body, { status: 200, headers });
        }
      } catch (err) {
        console.error("[Storefront] ASSETS fetch error:", err);
      }
    }
    const domain2 = env.DOMAIN || "fluxe.in";
    const response2 = await fetch(`https://${domain2}${storefrontAssetPath}`);
    if (response2.ok) {
      const headers = new Headers(response2.headers);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Access-Control-Allow-Origin", "*");
      return new Response(response2.body, { status: 200, headers });
    }
    return new Response("Asset not found", { status: 404 });
  }
  const storefrontIndexPath = "/storefront/index.html";
  if (env.ASSETS) {
    try {
      const assetRequest = new Request(`https://placeholder.com${storefrontIndexPath}`);
      const response2 = await env.ASSETS.fetch(assetRequest);
      if (response2.ok) {
        return new Response(response2.body, {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache",
            "Content-Security-Policy": "frame-ancestors 'self' https://fluxe.in https://www.fluxe.in",
            ...corsHeaders()
          }
        });
      }
    } catch (err) {
      console.error("[Storefront] ASSETS index fetch error:", err);
    }
  }
  const domain = env.DOMAIN || "fluxe.in";
  const response = await fetch(`https://${domain}${storefrontIndexPath}`);
  if (!response.ok) {
    return new Response("Storefront not available", { status: 500 });
  }
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      "Content-Security-Policy": "frame-ancestors 'self' https://fluxe.in https://www.fluxe.in",
      ...corsHeaders()
    }
  });
}
__name(serveStorefrontApp, "serveStorefrontApp");

// workers/platform/admin-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
var OWNER_EMAIL = "admin@fluxe.in";
async function isOwner(user, env) {
  if (!user)
    return false;
  if (user.email === OWNER_EMAIL)
    return true;
  if (user.role === "admin" || user.role === "owner")
    return true;
  return false;
}
__name(isOwner, "isOwner");
async function handleAdmin(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }
  const owner = await isOwner(user, env);
  if (!owner) {
    return errorResponse("Forbidden: Admin access required", 403);
  }
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  switch (action) {
    case "stats":
      return getAdminStats(env);
    case "users":
      return handleUserAction(request, env, pathParts);
    default:
      return errorResponse("Admin endpoint not found", 404);
  }
}
__name(handleAdmin, "handleAdmin");
async function getAdminStats(env) {
  try {
    let users = [];
    try {
      const usersResult = await env.DB.prepare(
        `SELECT u.id, u.name, u.email, u.created_at, u.email_verified,
                s.plan, s.status as subscription_status
         FROM users u
         LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
         ORDER BY u.created_at DESC
         LIMIT 100`
      ).all();
      users = usersResult.results || [];
    } catch (e) {
      const usersResult = await env.DB.prepare(
        "SELECT id, name, email, created_at, email_verified FROM users ORDER BY created_at DESC LIMIT 100"
      ).all();
      users = (usersResult.results || []).map((u) => ({ ...u, plan: null }));
    }
    const sitesResult = await env.DB.prepare(
      "SELECT id, subdomain, brand_name, user_id, template_id, is_active, created_at FROM sites ORDER BY created_at DESC LIMIT 100"
    ).all();
    const sites = sitesResult.results || [];
    let totalOrders = 0;
    try {
      const ordersCount = await env.DB.prepare("SELECT COUNT(*) as count FROM orders").first();
      totalOrders = ordersCount?.count || 0;
    } catch (e) {
    }
    return successResponse({
      users,
      sites,
      totalUsers: users.length,
      totalSites: sites.length,
      totalOrders
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    return errorResponse("Failed to fetch admin stats", 500);
  }
}
__name(getAdminStats, "getAdminStats");
async function handleUserAction(request, env, pathParts) {
  const userId = pathParts[3];
  const action = pathParts[4];
  if (!userId) {
    return errorResponse("User ID is required");
  }
  if (action === "block" && request.method === "POST") {
    return blockUser(env, userId);
  }
  return errorResponse("Unknown user action", 404);
}
__name(handleUserAction, "handleUserAction");
async function blockUser(env, userId) {
  try {
    const user = await env.DB.prepare("SELECT id, email FROM users WHERE id = ?").bind(userId).first();
    if (!user) {
      return errorResponse("User not found", 404);
    }
    await env.DB.prepare(
      "UPDATE sites SET is_active = 0 WHERE user_id = ?"
    ).bind(userId).run();
    await env.DB.prepare(
      "DELETE FROM sessions WHERE user_id = ?"
    ).bind(userId).run();
    return successResponse(null, `User ${user.email} has been blocked`);
  } catch (error) {
    console.error("Block user error:", error);
    return errorResponse("Failed to block user", 500);
  }
}
__name(blockUser, "blockUser");

// workers/index.js
init_site_admin_worker();

// workers/storefront/customer-auth-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
async function handleCustomerAuth(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const segments = path.split("/").filter(Boolean);
  const action = segments[2] || "";
  if (action === "addresses") {
    const addressId = segments[3] || null;
    return handleAddresses(request, env, addressId);
  }
  switch (action) {
    case "signup":
      return handleSignup2(request, env);
    case "login":
      return handleLogin2(request, env);
    case "logout":
      return handleLogout2(request, env);
    case "me":
      return handleGetProfile(request, env);
    case "update-profile":
      return handleUpdateProfile2(request, env);
    default:
      return errorResponse("Not found", 404);
  }
}
__name(handleCustomerAuth, "handleCustomerAuth");
async function ensureCustomerTables(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_customers (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        UNIQUE(site_id, email)
      )
    `).run();
    await env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_site_customers_site ON site_customers(site_id)"
    ).run();
    await env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_site_customers_email ON site_customers(site_id, email)"
    ).run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_customer_sessions (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        site_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES site_customers(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `).run();
    await env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON site_customer_sessions(token)"
    ).run();
    await env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON site_customer_sessions(customer_id)"
    ).run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS customer_addresses (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        label TEXT DEFAULT 'Home',
        first_name TEXT NOT NULL,
        last_name TEXT,
        phone TEXT,
        house_number TEXT NOT NULL,
        road_name TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        pin_code TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES site_customers(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `).run();
    await env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id)"
    ).run();
    await env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_customer_addresses_site ON customer_addresses(site_id)"
    ).run();
  } catch (error) {
    console.error("Error ensuring customer tables:", error);
  }
}
__name(ensureCustomerTables, "ensureCustomerTables");
async function handleAddresses(request, env, addressId) {
  const customer = await validateCustomerAuth(request, env);
  if (!customer) {
    return errorResponse("Unauthorized", 401);
  }
  const method = request.method;
  if (method === "GET") {
    return getAddresses(env, customer);
  } else if (method === "POST") {
    return createAddress(request, env, customer);
  } else if (method === "PUT" && addressId) {
    return updateAddress(request, env, customer, addressId);
  } else if (method === "DELETE" && addressId) {
    return deleteAddress(env, customer, addressId);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handleAddresses, "handleAddresses");
async function getAddresses(env, customer) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM customer_addresses WHERE customer_id = ? AND site_id = ? ORDER BY is_default DESC, created_at DESC"
    ).bind(customer.id, customer.site_id).all();
    return successResponse(results || []);
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return errorResponse("Failed to fetch addresses", 500);
  }
}
__name(getAddresses, "getAddresses");
async function createAddress(request, env, customer) {
  try {
    const body = await request.json();
    const { label, firstName, lastName, phone, houseNumber, roadName, city, state, pinCode, isDefault } = body;
    if (!firstName || !houseNumber || !city || !state || !pinCode) {
      return errorResponse("First name, house number, city, state, and PIN code are required");
    }
    const id = generateId();
    if (isDefault) {
      await env.DB.prepare(
        "UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? AND site_id = ?"
      ).bind(customer.id, customer.site_id).run();
    }
    await env.DB.prepare(
      `INSERT INTO customer_addresses (id, site_id, customer_id, label, first_name, last_name, phone, house_number, road_name, city, state, pin_code, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      customer.site_id,
      customer.id,
      sanitizeInput(label || "Home"),
      sanitizeInput(firstName),
      lastName ? sanitizeInput(lastName) : null,
      phone || null,
      sanitizeInput(houseNumber),
      roadName ? sanitizeInput(roadName) : null,
      sanitizeInput(city),
      sanitizeInput(state),
      sanitizeInput(pinCode),
      isDefault ? 1 : 0
    ).run();
    const address = await env.DB.prepare(
      "SELECT * FROM customer_addresses WHERE id = ?"
    ).bind(id).first();
    return successResponse(address, "Address saved successfully");
  } catch (error) {
    console.error("Error creating address:", error);
    return errorResponse("Failed to save address", 500);
  }
}
__name(createAddress, "createAddress");
async function updateAddress(request, env, customer, addressId) {
  try {
    const existing = await env.DB.prepare(
      "SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ? AND site_id = ?"
    ).bind(addressId, customer.id, customer.site_id).first();
    if (!existing) {
      return errorResponse("Address not found", 404);
    }
    const body = await request.json();
    const { label, firstName, lastName, phone, houseNumber, roadName, city, state, pinCode, isDefault } = body;
    if (isDefault) {
      await env.DB.prepare(
        "UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? AND site_id = ?"
      ).bind(customer.id, customer.site_id).run();
    }
    await env.DB.prepare(
      `UPDATE customer_addresses SET
        label = COALESCE(?, label),
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        phone = COALESCE(?, phone),
        house_number = COALESCE(?, house_number),
        road_name = COALESCE(?, road_name),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        pin_code = COALESCE(?, pin_code),
        is_default = ?,
        updated_at = datetime('now')
       WHERE id = ? AND customer_id = ? AND site_id = ?`
    ).bind(
      label ? sanitizeInput(label) : null,
      firstName ? sanitizeInput(firstName) : null,
      lastName !== void 0 ? lastName ? sanitizeInput(lastName) : null : null,
      phone !== void 0 ? phone || null : null,
      houseNumber ? sanitizeInput(houseNumber) : null,
      roadName !== void 0 ? roadName ? sanitizeInput(roadName) : null : null,
      city ? sanitizeInput(city) : null,
      state ? sanitizeInput(state) : null,
      pinCode ? sanitizeInput(pinCode) : null,
      isDefault ? 1 : 0,
      addressId,
      customer.id,
      customer.site_id
    ).run();
    const updated = await env.DB.prepare(
      "SELECT * FROM customer_addresses WHERE id = ?"
    ).bind(addressId).first();
    return successResponse(updated, "Address updated successfully");
  } catch (error) {
    console.error("Error updating address:", error);
    return errorResponse("Failed to update address", 500);
  }
}
__name(updateAddress, "updateAddress");
async function deleteAddress(env, customer, addressId) {
  try {
    const existing = await env.DB.prepare(
      "SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ? AND site_id = ?"
    ).bind(addressId, customer.id, customer.site_id).first();
    if (!existing) {
      return errorResponse("Address not found", 404);
    }
    await env.DB.prepare(
      "DELETE FROM customer_addresses WHERE id = ? AND customer_id = ? AND site_id = ?"
    ).bind(addressId, customer.id, customer.site_id).run();
    return successResponse(null, "Address deleted successfully");
  } catch (error) {
    console.error("Error deleting address:", error);
    return errorResponse("Failed to delete address", 500);
  }
}
__name(deleteAddress, "deleteAddress");
async function handleSignup2(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    await ensureCustomerTables(env);
    const { siteId, name, email, password, phone } = await request.json();
    if (!siteId || !name || !email || !password) {
      return errorResponse("Site ID, name, email and password are required");
    }
    if (!validateEmail(email)) {
      return errorResponse("Invalid email format");
    }
    if (password.length < 8) {
      return errorResponse("Password must be at least 8 characters");
    }
    const site = await env.DB.prepare(
      "SELECT id, brand_name FROM sites WHERE id = ? AND is_active = 1"
    ).bind(siteId).first();
    if (!site) {
      return errorResponse("Store not found", 404);
    }
    const existing = await env.DB.prepare(
      "SELECT id FROM site_customers WHERE site_id = ? AND email = ?"
    ).bind(siteId, email.toLowerCase()).first();
    if (existing) {
      return errorResponse("An account with this email already exists for this store", 400, "EMAIL_EXISTS");
    }
    const customerId = generateId();
    const passwordHash = await hashPassword(password);
    await env.DB.prepare(
      `INSERT INTO site_customers (id, site_id, email, password_hash, name, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(customerId, siteId, email.toLowerCase(), passwordHash, sanitizeInput(name), phone || null).run();
    const token = generateToken(32);
    const expiresAt = getExpiryDate(24 * 7);
    const sessionId = generateId();
    await env.DB.prepare(
      `INSERT INTO site_customer_sessions (id, customer_id, site_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(sessionId, customerId, siteId, token, expiresAt).run();
    return successResponse({
      customer: {
        id: customerId,
        email: email.toLowerCase(),
        name: sanitizeInput(name)
      },
      token
    }, "Account created successfully");
  } catch (error) {
    console.error("Customer signup error:", error);
    return errorResponse("Failed to create account", 500);
  }
}
__name(handleSignup2, "handleSignup");
async function handleLogin2(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    await ensureCustomerTables(env);
    const { siteId, email, password } = await request.json();
    if (!siteId || !email || !password) {
      return errorResponse("Site ID, email and password are required");
    }
    const customer = await env.DB.prepare(
      "SELECT id, email, password_hash, name, phone FROM site_customers WHERE site_id = ? AND email = ?"
    ).bind(siteId, email.toLowerCase()).first();
    if (!customer) {
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    const isValid = await verifyPassword(password, customer.password_hash);
    if (!isValid) {
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    const token = generateToken(32);
    const expiresAt = getExpiryDate(24 * 7);
    const sessionId = generateId();
    await env.DB.prepare(
      `INSERT INTO site_customer_sessions (id, customer_id, site_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(sessionId, customer.id, siteId, token, expiresAt).run();
    return successResponse({
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone
      },
      token
    }, "Login successful");
  } catch (error) {
    console.error("Customer login error:", error);
    return errorResponse("Login failed", 500);
  }
}
__name(handleLogin2, "handleLogin");
async function handleLogout2(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const customer = await validateCustomerAuth(request, env);
    if (customer) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("SiteCustomer ")) {
        const token = authHeader.substring(13);
        await env.DB.prepare(
          "DELETE FROM site_customer_sessions WHERE token = ?"
        ).bind(token).run();
      }
    }
    return successResponse(null, "Logged out successfully");
  } catch (error) {
    return errorResponse("Logout failed", 500);
  }
}
__name(handleLogout2, "handleLogout");
async function handleGetProfile(request, env) {
  try {
    const customer = await validateCustomerAuth(request, env);
    if (!customer) {
      return errorResponse("Unauthorized", 401);
    }
    return successResponse({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone
    });
  } catch (error) {
    return errorResponse("Failed to get profile", 500);
  }
}
__name(handleGetProfile, "handleGetProfile");
async function handleUpdateProfile2(request, env) {
  if (request.method !== "PUT" && request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const customer = await validateCustomerAuth(request, env);
    if (!customer) {
      return errorResponse("Unauthorized", 401);
    }
    const { name, phone } = await request.json();
    await env.DB.prepare(
      `UPDATE site_customers SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(name ? sanitizeInput(name) : null, phone || null, customer.id).run();
    const updated = await env.DB.prepare(
      "SELECT id, email, name, phone FROM site_customers WHERE id = ?"
    ).bind(customer.id).first();
    return successResponse(updated, "Profile updated successfully");
  } catch (error) {
    return errorResponse("Failed to update profile", 500);
  }
}
__name(handleUpdateProfile2, "handleUpdateProfile");
async function validateCustomerAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("SiteCustomer ")) {
    return null;
  }
  const token = authHeader.substring(13);
  try {
    await ensureCustomerTables(env);
    const session = await env.DB.prepare(
      `SELECT cs.customer_id, cs.site_id FROM site_customer_sessions cs
       WHERE cs.token = ? AND cs.expires_at > datetime('now')`
    ).bind(token).first();
    if (!session) {
      return null;
    }
    const customer = await env.DB.prepare(
      "SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ?"
    ).bind(session.customer_id).first();
    return customer;
  } catch (error) {
    console.error("Customer auth validation error:", error);
    return null;
  }
}
__name(validateCustomerAuth, "validateCustomerAuth");

// workers/storefront/upload-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
init_site_admin_worker();
var MAX_FILE_SIZE = 10 * 1024 * 1024;
var MAX_VIDEO_SIZE = 100 * 1024 * 1024;
var ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
var ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
async function handleUpload(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  if (action === "image" && method === "GET") {
    const key = url.searchParams.get("key");
    if (!key)
      return errorResponse("Key is required", 400);
    return serveImage(env, key);
  }
  if (action === "image" && method === "POST") {
    return uploadImage(request, env, url);
  }
  if (action === "image" && method === "DELETE") {
    return deleteImage(request, env, url);
  }
  if (action === "video" && method === "GET") {
    const key = url.searchParams.get("key");
    if (!key)
      return errorResponse("Key is required", 400);
    return serveVideo(env, key);
  }
  if (action === "video" && method === "POST") {
    return uploadVideo(request, env, url);
  }
  if (action === "video" && method === "DELETE") {
    return deleteVideo(request, env, url);
  }
  return errorResponse("Upload endpoint not found", 404);
}
__name(handleUpload, "handleUpload");
async function authenticateAdmin(request, env, siteId) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("SiteAdmin ") && siteId) {
    const admin = await validateSiteAdmin(request, env, siteId);
    if (admin) {
      return { id: admin.userId || "site-admin", _adminSiteId: siteId };
    }
  }
  const user = await validateAuth(request, env);
  if (user) {
    const site = await env.DB.prepare(
      "SELECT id FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (site)
      return { ...user, _adminSiteId: siteId };
    return null;
  }
  return null;
}
__name(authenticateAdmin, "authenticateAdmin");
async function uploadImage(request, env, url) {
  const siteId = url.searchParams.get("siteId");
  if (!siteId)
    return errorResponse("siteId is required", 400);
  const user = await authenticateAdmin(request, env, siteId);
  if (!user)
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const files = formData.getAll("images");
      if (!files.length)
        return errorResponse("No images provided", 400);
      const results = [];
      for (const file of files) {
        if (!file || !file.size)
          continue;
        if (!ALLOWED_TYPES.includes(file.type)) {
          results.push({ error: `Invalid file type: ${file.type}` });
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          results.push({ error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 10MB)` });
          continue;
        }
        const ext2 = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
        const key2 = `sites/${siteId}/products/${generateId()}.${ext2}`;
        const arrayBuffer = await file.arrayBuffer();
        await env.STORAGE.put(key2, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
            cacheControl: "public, max-age=31536000"
          }
        });
        const imageUrl2 = `/api/upload/image?key=${encodeURIComponent(key2)}`;
        results.push({ url: imageUrl2, key: key2 });
      }
      return successResponse({ images: results }, "Images uploaded successfully");
    }
    const body = await request.json();
    const { imageData, fileName } = body;
    if (!imageData)
      return errorResponse("imageData is required", 400);
    let buffer;
    let mimeType;
    if (imageData.startsWith("data:")) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches)
        return errorResponse("Invalid base64 image data", 400);
      mimeType = matches[1];
      const base64 = matches[2];
      const binaryString = atob(base64);
      buffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        buffer[i] = binaryString.charCodeAt(i);
      }
    } else {
      return errorResponse("Image data must be a base64 data URL", 400);
    }
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return errorResponse(`Invalid image type: ${mimeType}`, 400);
    }
    if (buffer.length > MAX_FILE_SIZE) {
      return errorResponse("Image too large (max 10MB)", 400);
    }
    const ext = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
    const key = `sites/${siteId}/products/${generateId()}.${ext}`;
    await env.STORAGE.put(key, buffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: "public, max-age=31536000"
      }
    });
    const imageUrl = `/api/upload/image?key=${encodeURIComponent(key)}`;
    return successResponse({ url: imageUrl, key }, "Image uploaded successfully");
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse("Failed to upload image: " + error.message, 500);
  }
}
__name(uploadImage, "uploadImage");
async function serveImage(env, key) {
  try {
    const object = await env.STORAGE.get(key);
    if (!object) {
      return new Response("Image not found", { status: 404 });
    }
    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");
    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Serve image error:", error);
    return new Response("Failed to retrieve image", { status: 500 });
  }
}
__name(serveImage, "serveImage");
async function deleteImage(request, env, url) {
  const siteId = url.searchParams.get("siteId");
  const key = url.searchParams.get("key");
  if (!siteId)
    return errorResponse("siteId is required", 400);
  if (!key)
    return errorResponse("key is required", 400);
  const user = await authenticateAdmin(request, env, siteId);
  if (!user)
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  if (!key.startsWith(`sites/${siteId}/`)) {
    return errorResponse("Unauthorized: cannot delete images from another site", 403);
  }
  try {
    await env.STORAGE.delete(key);
    return successResponse(null, "Image deleted successfully");
  } catch (error) {
    console.error("Delete image error:", error);
    return errorResponse("Failed to delete image", 500);
  }
}
__name(deleteImage, "deleteImage");
async function uploadVideo(request, env, url) {
  const siteId = url.searchParams.get("siteId");
  if (!siteId)
    return errorResponse("siteId is required", 400);
  const user = await authenticateAdmin(request, env, siteId);
  if (!user)
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("video");
      if (!file || !file.size)
        return errorResponse("No video provided", 400);
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        return errorResponse(`Invalid video type: ${file.type}. Allowed: MP4, WebM, MOV`, 400);
      }
      if (file.size > MAX_VIDEO_SIZE) {
        return errorResponse(`Video too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 100MB)`, 400);
      }
      const ext = file.type === "video/quicktime" ? "mov" : file.type.split("/")[1];
      const key = `sites/${siteId}/videos/${generateId()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();
      await env.STORAGE.put(key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
          cacheControl: "public, max-age=31536000"
        }
      });
      const videoUrl = `/api/upload/video?key=${encodeURIComponent(key)}`;
      return successResponse({ url: videoUrl, key }, "Video uploaded successfully");
    }
    return errorResponse("Video upload requires multipart/form-data", 400);
  } catch (error) {
    console.error("Video upload error:", error);
    return errorResponse("Failed to upload video: " + error.message, 500);
  }
}
__name(uploadVideo, "uploadVideo");
async function serveVideo(env, key) {
  try {
    const object = await env.STORAGE.get(key);
    if (!object) {
      return new Response("Video not found", { status: 404 });
    }
    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "video/mp4");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Accept-Ranges", "bytes");
    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Serve video error:", error);
    return new Response("Failed to retrieve video", { status: 500 });
  }
}
__name(serveVideo, "serveVideo");
async function deleteVideo(request, env, url) {
  const siteId = url.searchParams.get("siteId");
  const key = url.searchParams.get("key");
  if (!siteId)
    return errorResponse("siteId is required", 400);
  if (!key)
    return errorResponse("key is required", 400);
  const user = await authenticateAdmin(request, env, siteId);
  if (!user)
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  if (!key.startsWith(`sites/${siteId}/`)) {
    return errorResponse("Unauthorized: cannot delete videos from another site", 403);
  }
  try {
    await env.STORAGE.delete(key);
    return successResponse(null, "Video deleted successfully");
  } catch (error) {
    console.error("Delete video error:", error);
    return errorResponse("Failed to delete video", 500);
  }
}
__name(deleteVideo, "deleteVideo");

// workers/index.js
init_helpers();

// utils/db-init.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var _initialized = false;
async function ensureTablesExist(env) {
  if (_initialized)
    return;
  try {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        email_verified INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS email_verifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subdomain TEXT UNIQUE NOT NULL,
        brand_name TEXT NOT NULL,
        category TEXT NOT NULL,
        template_id TEXT DEFAULT 'template1',
        logo_url TEXT,
        favicon_url TEXT,
        primary_color TEXT DEFAULT '#000000',
        secondary_color TEXT DEFAULT '#ffffff',
        phone TEXT,
        email TEXT,
        address TEXT,
        social_links TEXT,
        settings TEXT,
        is_active INTEGER DEFAULT 1,
        subscription_plan TEXT DEFAULT 'free',
        subscription_expires_at TEXT,
        custom_domain TEXT,
        domain_status TEXT,
        domain_verification_token TEXT,
        cf_hostname_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        parent_id TEXT,
        description TEXT,
        subtitle TEXT,
        show_on_home INTEGER DEFAULT 1,
        image_url TEXT,
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
        UNIQUE(site_id, slug)
      )`,
      `CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        category_id TEXT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        short_description TEXT,
        price REAL NOT NULL,
        compare_price REAL,
        cost_price REAL,
        sku TEXT,
        barcode TEXT,
        stock INTEGER DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 5,
        weight REAL,
        dimensions TEXT,
        images TEXT,
        thumbnail_url TEXT,
        tags TEXT,
        is_featured INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        UNIQUE(site_id, slug)
      )`,
      `CREATE TABLE IF NOT EXISTS product_variants (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sku TEXT,
        price REAL NOT NULL,
        compare_price REAL,
        stock INTEGER DEFAULT 0,
        attributes TEXT,
        image_url TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        line1 TEXT NOT NULL,
        line2 TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        pincode TEXT NOT NULL,
        country TEXT DEFAULT 'India',
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS carts (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        user_id TEXT,
        session_id TEXT,
        items TEXT NOT NULL DEFAULT '[]',
        subtotal REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS wishlists (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(site_id, user_id, product_id)
      )`,
      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        user_id TEXT,
        order_number TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        items TEXT NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        shipping_cost REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        total REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        payment_method TEXT,
        payment_status TEXT DEFAULT 'pending',
        payment_id TEXT,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        razorpay_signature TEXT,
        shipping_address TEXT NOT NULL,
        billing_address TEXT,
        customer_name TEXT NOT NULL,
        customer_email TEXT,
        customer_phone TEXT NOT NULL,
        notes TEXT,
        tracking_number TEXT,
        carrier TEXT,
        shipped_at TEXT,
        delivered_at TEXT,
        cancelled_at TEXT,
        cancellation_reason TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS guest_orders (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        order_number TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        items TEXT NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        shipping_cost REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        total REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        payment_method TEXT,
        payment_status TEXT DEFAULT 'pending',
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        shipping_address TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT,
        customer_phone TEXT NOT NULL,
        tracking_number TEXT,
        carrier TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS site_customers (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        UNIQUE(site_id, email)
      )`,
      `CREATE TABLE IF NOT EXISTS site_customer_sessions (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        site_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES site_customers(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS customer_addresses (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        label TEXT DEFAULT 'Home',
        first_name TEXT NOT NULL,
        last_name TEXT,
        phone TEXT,
        house_number TEXT NOT NULL,
        road_name TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        pin_code TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES site_customers(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'active',
        razorpay_subscription_id TEXT,
        current_period_start TEXT,
        current_period_end TEXT,
        cancelled_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS payment_transactions (
        id TEXT PRIMARY KEY,
        site_id TEXT,
        user_id TEXT,
        order_id TEXT,
        subscription_id TEXT,
        razorpay_order_id TEXT,
        razorpay_payment_id TEXT,
        razorpay_signature TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        error_code TEXT,
        error_description TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS coupons (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        code TEXT NOT NULL,
        type TEXT NOT NULL,
        value REAL NOT NULL,
        min_order_value REAL DEFAULT 0,
        max_discount REAL,
        usage_limit INTEGER,
        used_count INTEGER DEFAULT 0,
        starts_at TEXT,
        expires_at TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        UNIQUE(site_id, code)
      )`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        user_id TEXT,
        push_token TEXT NOT NULL,
        endpoint TEXT,
        p256dh TEXT,
        auth TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        user_id TEXT,
        customer_name TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        title TEXT,
        content TEXT,
        images TEXT,
        is_verified INTEGER DEFAULT 0,
        is_approved INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY,
        site_id TEXT,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`
    ];
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
      "CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token)",
      "CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)",
      "CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)",
      "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_sites_subdomain ON sites(subdomain)",
      "CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(site_id, slug)",
      "CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)",
      "CREATE INDEX IF NOT EXISTS idx_products_site ON products(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)",
      "CREATE INDEX IF NOT EXISTS idx_products_site_slug ON products(site_id, slug)",
      "CREATE INDEX IF NOT EXISTS idx_products_featured ON products(site_id, is_featured)",
      "CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id)",
      "CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id)",
      "CREATE INDEX IF NOT EXISTS idx_carts_site ON carts(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_wishlists_site ON wishlists(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_orders_site ON orders(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number)",
      "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(site_id, status)",
      "CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(site_id, created_at)",
      "CREATE INDEX IF NOT EXISTS idx_guest_orders_site ON guest_orders(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_guest_orders_number ON guest_orders(order_number)",
      "CREATE INDEX IF NOT EXISTS idx_site_customers_site ON site_customers(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_site_customers_email ON site_customers(site_id, email)",
      "CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON site_customer_sessions(token)",
      "CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON site_customer_sessions(customer_id)",
      "CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id)",
      "CREATE INDEX IF NOT EXISTS idx_customer_addresses_site ON customer_addresses(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)",
      "CREATE INDEX IF NOT EXISTS idx_transactions_order ON payment_transactions(order_id)",
      "CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_coupons_site ON coupons(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(site_id, code)",
      "CREATE INDEX IF NOT EXISTS idx_notifications_site ON notifications(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)",
      "CREATE INDEX IF NOT EXISTS idx_reviews_site ON reviews(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_activity_site ON activity_log(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at)",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_custom_domain ON sites(custom_domain) WHERE custom_domain IS NOT NULL"
    ];
    for (const sql of tables) {
      await env.DB.prepare(sql).run();
    }
    for (const sql of indexes) {
      try {
        await env.DB.prepare(sql).run();
      } catch (e) {
      }
    }
    const migrations = [
      { col: "subtitle", sql: "ALTER TABLE categories ADD COLUMN subtitle TEXT" },
      { col: "show_on_home", sql: "ALTER TABLE categories ADD COLUMN show_on_home INTEGER DEFAULT 1" },
      { col: "custom_domain", sql: "ALTER TABLE sites ADD COLUMN custom_domain TEXT" },
      { col: "domain_status", sql: "ALTER TABLE sites ADD COLUMN domain_status TEXT" },
      { col: "domain_verification_token", sql: "ALTER TABLE sites ADD COLUMN domain_verification_token TEXT" },
      { col: "cf_hostname_id", sql: "ALTER TABLE sites ADD COLUMN cf_hostname_id TEXT" }
    ];
    for (const m of migrations) {
      try {
        await env.DB.prepare(m.sql).run();
      } catch (e) {
      }
    }
    try {
      const wishlistDef = await env.DB.prepare(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name='wishlists'`
      ).first();
      if (wishlistDef && wishlistDef.sql && !wishlistDef.sql.includes("site_id, user_id, product_id")) {
        await env.DB.prepare(`ALTER TABLE wishlists RENAME TO wishlists_old`).run();
        await env.DB.prepare(`
          CREATE TABLE wishlists (
            id TEXT PRIMARY KEY,
            site_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            UNIQUE(site_id, user_id, product_id)
          )
        `).run();
        await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id)`).run();
        await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_wishlists_site ON wishlists(site_id)`).run();
        await env.DB.prepare(`INSERT INTO wishlists SELECT * FROM wishlists_old`).run();
        await env.DB.prepare(`DROP TABLE wishlists_old`).run();
        console.log("Wishlists table migrated: unique constraint now includes site_id");
      }
    } catch (e) {
      console.error("Wishlists migration failed (non-fatal):", e.message || e);
    }
    const fkMigrations = [
      {
        table: "carts",
        detect: `REFERENCES users`,
        create: `CREATE TABLE carts (
          id TEXT PRIMARY KEY, site_id TEXT NOT NULL, user_id TEXT,
          session_id TEXT, items TEXT NOT NULL DEFAULT '[]',
          subtotal REAL DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
        )`,
        indexes: [
          "CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id)",
          "CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id)",
          "CREATE INDEX IF NOT EXISTS idx_carts_site ON carts(site_id)"
        ]
      },
      {
        table: "orders",
        detect: `REFERENCES users`,
        create: `CREATE TABLE orders (
          id TEXT PRIMARY KEY, site_id TEXT NOT NULL, user_id TEXT,
          order_number TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'pending',
          items TEXT NOT NULL, subtotal REAL NOT NULL, discount REAL DEFAULT 0,
          shipping_cost REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL NOT NULL,
          currency TEXT DEFAULT 'INR', payment_method TEXT,
          payment_status TEXT DEFAULT 'pending', payment_id TEXT,
          razorpay_order_id TEXT, razorpay_payment_id TEXT, razorpay_signature TEXT,
          shipping_address TEXT NOT NULL, billing_address TEXT,
          customer_name TEXT NOT NULL, customer_email TEXT,
          customer_phone TEXT NOT NULL, notes TEXT,
          tracking_number TEXT, carrier TEXT,
          shipped_at TEXT, delivered_at TEXT, cancelled_at TEXT, cancellation_reason TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
        )`,
        indexes: [
          "CREATE INDEX IF NOT EXISTS idx_orders_site ON orders(site_id)",
          "CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)",
          "CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number)",
          "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(site_id, status)",
          "CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(site_id, created_at)"
        ]
      },
      {
        table: "reviews",
        detect: `REFERENCES users`,
        create: `CREATE TABLE reviews (
          id TEXT PRIMARY KEY, site_id TEXT NOT NULL, product_id TEXT NOT NULL,
          user_id TEXT, customer_name TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
          title TEXT, content TEXT, images TEXT,
          is_verified INTEGER DEFAULT 0, is_approved INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`,
        indexes: [
          "CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)",
          "CREATE INDEX IF NOT EXISTS idx_reviews_site ON reviews(site_id)"
        ]
      },
      {
        table: "payment_transactions",
        detect: `REFERENCES users`,
        create: `CREATE TABLE payment_transactions (
          id TEXT PRIMARY KEY, site_id TEXT, user_id TEXT,
          order_id TEXT, subscription_id TEXT,
          razorpay_order_id TEXT, razorpay_payment_id TEXT, razorpay_signature TEXT,
          amount REAL NOT NULL, currency TEXT DEFAULT 'INR',
          status TEXT DEFAULT 'pending', payment_method TEXT,
          error_code TEXT, error_description TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
          FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
        )`,
        indexes: [
          "CREATE INDEX IF NOT EXISTS idx_transactions_order ON payment_transactions(order_id)",
          "CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id)"
        ]
      },
      {
        table: "activity_log",
        detect: `REFERENCES users`,
        create: `CREATE TABLE activity_log (
          id TEXT PRIMARY KEY, site_id TEXT, user_id TEXT,
          action TEXT NOT NULL, entity_type TEXT, entity_id TEXT,
          details TEXT, ip_address TEXT, user_agent TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
        )`,
        indexes: [
          "CREATE INDEX IF NOT EXISTS idx_activity_site ON activity_log(site_id)",
          "CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id)",
          "CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at)"
        ]
      },
      {
        table: "notifications",
        detect: `REFERENCES users`,
        create: `CREATE TABLE notifications (
          id TEXT PRIMARY KEY, site_id TEXT NOT NULL, user_id TEXT,
          push_token TEXT NOT NULL, endpoint TEXT, p256dh TEXT, auth TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
        )`,
        indexes: [
          "CREATE INDEX IF NOT EXISTS idx_notifications_site ON notifications(site_id)",
          "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)"
        ]
      }
    ];
    for (const mig of fkMigrations) {
      try {
        const def = await env.DB.prepare(
          `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`
        ).bind(mig.table).first();
        if (def && def.sql && def.sql.includes(mig.detect)) {
          await env.DB.prepare(`ALTER TABLE ${mig.table} RENAME TO ${mig.table}_old`).run();
          await env.DB.prepare(mig.create).run();
          for (const idx of mig.indexes) {
            try {
              await env.DB.prepare(idx).run();
            } catch (_) {
            }
          }
          await env.DB.prepare(`INSERT INTO ${mig.table} SELECT * FROM ${mig.table}_old`).run();
          await env.DB.prepare(`DROP TABLE ${mig.table}_old`).run();
          console.log(`${mig.table} table migrated: removed incorrect user_id FK`);
        }
      } catch (e) {
        console.error(`${mig.table} FK migration failed (non-fatal):`, e.message || e);
      }
    }
    _initialized = true;
    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Database initialization FAILED:", error.message || error);
    throw error;
  }
}
__name(ensureTablesExist, "ensureTablesExist");

// workers/index.js
var workers_default = {
  async fetch(request, env, ctx) {
    const corsResponse = handleCORS(request);
    if (corsResponse)
      return corsResponse;
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      await ensureTablesExist(env);
      if (path.startsWith("/api/")) {
        return handleAPI(request, env, path);
      }
      const siteResponse = await handleSiteRouting(request, env);
      if (siteResponse) {
        return siteResponse;
      }
      const hostname = url.hostname;
      if (hostname === "www.fluxe.in" || hostname === "fluxe.in") {
        const pagesHostname = env.PAGES_HOSTNAME || "fluxe-8x1.pages.dev";
        const pagesUrl = new URL(request.url);
        pagesUrl.hostname = pagesHostname;
        const pagesRequest = new Request(pagesUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: "follow"
        });
        return fetch(pagesRequest);
      }
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("Worker error:", error);
      return errorResponse("Internal server error", 500);
    }
  }
};
async function handleAPI(request, env, path) {
  const pathParts = path.split("/").filter(Boolean);
  const apiVersion = pathParts[0];
  const resource = pathParts[1];
  if (apiVersion !== "api") {
    return errorResponse("Invalid API path", 400);
  }
  switch (resource) {
    case "auth":
      return handleAuth(request, env, path);
    case "sites":
      return handleSites(request, env, path);
    case "products":
      return handleProducts(request, env, path);
    case "orders":
      return handleOrders(request, env, path);
    case "cart":
      return handleCart(request, env, path);
    case "wishlist":
      return handleWishlist(request, env, path);
    case "payments":
      return handlePayments(request, env, path);
    case "email":
      return handleEmail(request, env, path);
    case "categories":
      return handleCategories(request, env, path);
    case "users":
      return handleUsers(request, env, path);
    case "admin":
      return handleAdmin(request, env, path);
    case "site-admin":
      return handleSiteAdmin(request, env, path);
    case "customer-auth":
      return handleCustomerAuth(request, env, path);
    case "upload":
      return handleUpload(request, env, path);
    case "health":
      return handleHealth(env);
    case "site":
      return handleSiteInfo(request, env);
    default:
      return errorResponse("API endpoint not found", 404);
  }
}
__name(handleAPI, "handleAPI");
async function handleHealth(env) {
  try {
    const dbCheck = await env.DB.prepare("SELECT 1 as ok").first();
    return jsonResponse({
      status: "healthy",
      database: dbCheck ? "connected" : "error",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    return jsonResponse({
      status: "unhealthy",
      database: "error",
      error: error.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }, 500);
  }
}
__name(handleHealth, "handleHealth");
async function handleSiteInfo(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const subdomain = url.searchParams.get("subdomain");
  let site = null;
  try {
    if (subdomain) {
      site = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.category, s.template_id, 
                s.logo_url, s.favicon_url, s.primary_color, s.secondary_color,
                s.phone, s.email, s.address, s.social_links, s.settings,
                s.custom_domain, s.domain_status, s.domain_verification_token
         FROM sites s 
         WHERE LOWER(s.subdomain) = LOWER(?) AND s.is_active = 1`
      ).bind(subdomain).first();
    } else if (!hostname.endsWith("fluxe.in") && !hostname.endsWith("pages.dev") && !hostname.includes("localhost") && !hostname.includes("workers.dev")) {
      site = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.category, s.template_id, 
                s.logo_url, s.favicon_url, s.primary_color, s.secondary_color,
                s.phone, s.email, s.address, s.social_links, s.settings,
                s.custom_domain, s.domain_status, s.domain_verification_token
         FROM sites s 
         WHERE s.custom_domain = ? AND s.domain_status = 'verified' AND s.is_active = 1`
      ).bind(hostname.toLowerCase()).first();
    }
    if (!site) {
      return errorResponse(subdomain ? "Site not found" : "Subdomain is required", subdomain ? 404 : 400);
    }
    let categoriesResult = [];
    try {
      const categories = await env.DB.prepare(
        "SELECT * FROM categories WHERE site_id = ? ORDER BY display_order"
      ).bind(site.id).all();
      categoriesResult = categories.results || [];
    } catch (catError) {
      console.error("Categories query failed, attempting to auto-create table:", catError);
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            site_id TEXT NOT NULL,
            name TEXT NOT NULL,
            slug TEXT NOT NULL,
            parent_id TEXT,
            description TEXT,
            image_url TEXT,
            display_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
            UNIQUE(site_id, slug)
          )
        `).run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id)").run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(site_id, slug)").run();
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)").run();
        console.log("Categories table auto-created successfully");
      } catch (createError) {
        console.error("Failed to auto-create categories table:", createError);
      }
    }
    let socialLinks = {};
    let settings = {};
    try {
      if (site.social_links)
        socialLinks = JSON.parse(site.social_links);
    } catch (e) {
    }
    try {
      if (site.settings)
        settings = JSON.parse(site.settings);
    } catch (e) {
    }
    if (settings.social) {
      const s = settings.social;
      const platforms = ["instagram", "facebook", "twitter", "youtube"];
      for (const p of platforms) {
        if (p in s) {
          if (s[p]) {
            socialLinks[p] = s[p];
          } else {
            delete socialLinks[p];
          }
        }
      }
    }
    const { razorpayKeySecret, adminVerificationCode, ...publicSettings } = settings;
    return jsonResponse({
      success: true,
      data: {
        ...site,
        socialLinks,
        settings: publicSettings,
        categories: categoriesResult
      }
    });
  } catch (error) {
    console.error("Get site info error:", error);
    return errorResponse("Failed to fetch site info: " + error.message, 500);
  }
}
__name(handleSiteInfo, "handleSiteInfo");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-k9n61Q/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = workers_default;

// node_modules/wrangler/templates/middleware/common.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-k9n61Q/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
