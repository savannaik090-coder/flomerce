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

// .wrangler/tmp/bundle-KKL3BZ/checked-fetch.js
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
  ".wrangler/tmp/bundle-KKL3BZ/checked-fetch.js"() {
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

// .wrangler/tmp/bundle-KKL3BZ/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
var init_strip_cf_connecting_ip_header = __esm({
  ".wrangler/tmp/bundle-KKL3BZ/strip-cf-connecting-ip-header.js"() {
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

// config.js
var PLATFORM_DOMAIN, PLATFORM_URL, SUPPORT_EMAIL, FROM_EMAIL, VAPID_SUBJECT;
var init_config = __esm({
  "config.js"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    PLATFORM_DOMAIN = "fluxe.in";
    PLATFORM_URL = `https://${PLATFORM_DOMAIN}`;
    SUPPORT_EMAIL = `support@${PLATFORM_DOMAIN}`;
    FROM_EMAIL = `noreply@${PLATFORM_DOMAIN}`;
    VAPID_SUBJECT = `mailto:noreply@${PLATFORM_DOMAIN}`;
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
  if (origin === PLATFORM_URL)
    return origin;
  if (origin.endsWith(`.${PLATFORM_DOMAIN}`) && origin.startsWith("https://"))
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
    init_config();
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

// utils/site-db.js
async function ensureProductOptionsColumn(db, cacheKey) {
  const key = cacheKey || "default";
  if (_migratedDBs.has(key))
    return;
  try {
    const cols = await db.prepare("PRAGMA table_info(products)").all();
    const hasOptions = cols.results?.some((c) => c.name === "options");
    if (!hasOptions) {
      await db.prepare("ALTER TABLE products ADD COLUMN options TEXT").run();
    }
    _migratedDBs.add(key);
  } catch (e) {
    console.error("ensureProductOptionsColumn error:", e.message || e);
  }
}
async function ensureProductSubcategoryColumn(db, cacheKey) {
  const key = cacheKey || "default";
  if (_subcatMigratedDBs.has(key))
    return;
  try {
    const cols = await db.prepare("PRAGMA table_info(products)").all();
    const hasSubcat = cols.results?.some((c) => c.name === "subcategory_id");
    if (!hasSubcat) {
      await db.prepare("ALTER TABLE products ADD COLUMN subcategory_id TEXT REFERENCES categories(id) ON DELETE SET NULL").run();
    }
    _subcatMigratedDBs.add(key);
  } catch (e) {
    console.error("ensureProductSubcategoryColumn error:", e.message || e);
  }
}
async function ensureAddressCountryColumn(db, cacheKey) {
  const key = cacheKey || "default";
  if (_addrCountryMigratedDBs.has(key))
    return;
  try {
    const cols = await db.prepare("PRAGMA table_info(customer_addresses)").all();
    const hasCountry = cols.results?.some((c) => c.name === "country");
    if (!hasCountry) {
      await db.prepare("ALTER TABLE customer_addresses ADD COLUMN country TEXT DEFAULT 'IN'").run();
    }
    _addrCountryMigratedDBs.add(key);
  } catch (e) {
    console.error("ensureAddressCountryColumn error:", e.message || e);
  }
}
async function resolveSiteDBById(env, siteId) {
  if (!siteId) {
    throw new Error("resolveSiteDBById: siteId is required");
  }
  try {
    const site = await env.DB.prepare(
      `SELECT s.shard_id, s.d1_binding_name, sh.binding_name as shard_binding
       FROM sites s
       LEFT JOIN shards sh ON s.shard_id = sh.id
       WHERE s.id = ?`
    ).bind(siteId).first();
    if (site) {
      if (site.shard_binding && env[site.shard_binding]) {
        return env[site.shard_binding];
      }
      if (site.d1_binding_name && env[site.d1_binding_name]) {
        return env[site.d1_binding_name];
      }
    }
  } catch (e) {
    console.error("resolveSiteDBById error:", e.message || e);
  }
  throw new Error(`resolveSiteDBById: No shard assigned for site ${siteId}. Every site must have a shard_id.`);
}
async function checkMigrationLock(env, siteId) {
  if (!siteId)
    return false;
  try {
    const site = await env.DB.prepare(
      "SELECT migration_locked FROM sites WHERE id = ?"
    ).bind(siteId).first();
    return !!(site && site.migration_locked);
  } catch (e) {
    return false;
  }
}
async function getSiteConfig(env, siteId) {
  if (!siteId)
    return {};
  try {
    const siteDB = await resolveSiteDBById(env, siteId);
    const config = await siteDB.prepare(
      "SELECT * FROM site_config WHERE site_id = ?"
    ).bind(siteId).first();
    return config || {};
  } catch (e) {
    console.error("getSiteConfig error:", e.message || e);
    return {};
  }
}
async function getSiteWithConfig(env, siteRow) {
  if (!siteRow || !siteRow.id)
    return siteRow;
  const config = await getSiteConfig(env, siteRow.id);
  const { site_id, ...configData } = config;
  return { ...siteRow, ...configData };
}
async function resolveSiteDBBySubdomain(env, subdomain) {
  if (!subdomain) {
    throw new Error("resolveSiteDBBySubdomain: subdomain is required");
  }
  try {
    const site = await env.DB.prepare(
      `SELECT s.id, s.shard_id, s.d1_binding_name, sh.binding_name as shard_binding
       FROM sites s
       LEFT JOIN shards sh ON s.shard_id = sh.id
       WHERE LOWER(s.subdomain) = LOWER(?)`
    ).bind(subdomain).first();
    if (site) {
      if (site.shard_binding && env[site.shard_binding]) {
        return env[site.shard_binding];
      }
      if (site.d1_binding_name && env[site.d1_binding_name]) {
        return env[site.d1_binding_name];
      }
    }
  } catch (e) {
    console.error("resolveSiteDBBySubdomain error:", e.message || e);
  }
  throw new Error(`resolveSiteDBBySubdomain: No shard assigned for subdomain "${subdomain}". Every site must have a shard_id.`);
}
var _migratedDBs, _subcatMigratedDBs, _addrCountryMigratedDBs;
var init_site_db = __esm({
  "utils/site-db.js"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    _migratedDBs = /* @__PURE__ */ new Set();
    _subcatMigratedDBs = /* @__PURE__ */ new Set();
    _addrCountryMigratedDBs = /* @__PURE__ */ new Set();
    __name(ensureProductOptionsColumn, "ensureProductOptionsColumn");
    __name(ensureProductSubcategoryColumn, "ensureProductSubcategoryColumn");
    __name(ensureAddressCountryColumn, "ensureAddressCountryColumn");
    __name(resolveSiteDBById, "resolveSiteDBById");
    __name(checkMigrationLock, "checkMigrationLock");
    __name(getSiteConfig, "getSiteConfig");
    __name(getSiteWithConfig, "getSiteWithConfig");
    __name(resolveSiteDBBySubdomain, "resolveSiteDBBySubdomain");
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
async function validateAnyAuth(request, env, { siteId: providedSiteId, db: providedDb } = {}) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("SiteCustomer ")) {
    const token = authHeader.substring(13);
    try {
      const siteId = providedSiteId || new URL(request.url).searchParams.get("siteId");
      if (siteId) {
        const db = providedDb || await resolveSiteDBById(env, siteId);
        const session = await db.prepare(
          `SELECT cs.customer_id, cs.site_id FROM site_customer_sessions cs
           WHERE cs.token = ? AND cs.site_id = ? AND cs.expires_at > datetime('now')`
        ).bind(token, siteId).first();
        if (session) {
          const customer = await db.prepare(
            "SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ? AND site_id = ?"
          ).bind(session.customer_id, siteId).first();
          if (customer) {
            return { id: customer.id, email: customer.email, name: customer.name, type: "customer", siteId: customer.site_id };
          }
        }
      } else {
        const allSites = await env.DB.prepare("SELECT id FROM sites").all();
        const siteIds = (allSites.results || []).map((s) => s.id);
        const checkedShards = /* @__PURE__ */ new Set();
        for (const sid of siteIds) {
          try {
            const db = await resolveSiteDBById(env, sid);
            const shardKey = db._binding || sid;
            if (checkedShards.has(shardKey)) {
              const session = await db.prepare(
                `SELECT cs.customer_id, cs.site_id FROM site_customer_sessions cs
                 WHERE cs.token = ? AND cs.site_id = ? AND cs.expires_at > datetime('now')`
              ).bind(token, sid).first();
              if (session) {
                const customer = await db.prepare(
                  "SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ? AND site_id = ?"
                ).bind(session.customer_id, sid).first();
                if (customer) {
                  return { id: customer.id, email: customer.email, name: customer.name, type: "customer", siteId: customer.site_id };
                }
              }
            } else {
              checkedShards.add(shardKey);
              const session = await db.prepare(
                `SELECT cs.customer_id, cs.site_id FROM site_customer_sessions cs
                 WHERE cs.token = ? AND cs.expires_at > datetime('now')`
              ).bind(token).first();
              if (session) {
                const customer = await db.prepare(
                  "SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ? AND site_id = ?"
                ).bind(session.customer_id, session.site_id).first();
                if (customer) {
                  return { id: customer.id, email: customer.email, name: customer.name, type: "customer", siteId: customer.site_id };
                }
              }
            }
          } catch (err) {
            console.error(`Customer auth check failed for site ${sid}:`, err);
          }
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
var init_auth = __esm({
  "utils/auth.js"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_helpers();
    init_site_db();
    __name(hashPassword, "hashPassword");
    __name(verifyPassword, "verifyPassword");
    __name(generateJWT, "generateJWT");
    __name(verifyJWT, "verifyJWT");
    __name(validateAuth, "validateAuth");
    __name(validateAnyAuth, "validateAnyAuth");
  }
});

// utils/cache.js
function cachedJsonResponse(data, status = 200, request = null) {
  const response = jsonResponse(data, status, request);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${CACHE_TTL}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`);
  headers.set("CDN-Cache-Control", `public, max-age=${CACHE_TTL}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`);
  headers.set("Vary", "Accept-Encoding");
  return new Response(response.body, { status: response.status, headers });
}
async function purgeStorefrontCache(env, siteId, types = [], resourceIds = {}) {
  try {
    const site = await env.DB.prepare(
      "SELECT subdomain, custom_domain, domain_status FROM sites WHERE id = ?"
    ).bind(siteId).first();
    if (!site)
      return;
    const domains = [];
    const rootDomain = env.DOMAIN || PLATFORM_DOMAIN;
    if (site.subdomain)
      domains.push(`${site.subdomain}.${rootDomain}`);
    if (site.custom_domain && site.domain_status === "verified")
      domains.push(site.custom_domain);
    domains.push(rootDomain);
    const cache = caches.default;
    const urls2 = [];
    for (const type of types) {
      switch (type) {
        case "site":
          for (const domain of domains) {
            urls2.push(`https://${domain}/api/site?subdomain=${site.subdomain}`);
          }
          break;
        case "products":
          for (const domain of domains) {
            urls2.push(`https://${domain}/api/products?siteId=${siteId}`);
            urls2.push(`https://${domain}/api/products?subdomain=${site.subdomain}`);
          }
          if (resourceIds.productId) {
            for (const domain of domains) {
              urls2.push(`https://${domain}/api/products/${resourceIds.productId}?siteId=${siteId}`);
              urls2.push(`https://${domain}/api/products/${resourceIds.productId}?subdomain=${site.subdomain}`);
            }
          }
          break;
        case "categories":
          for (const domain of domains) {
            urls2.push(`https://${domain}/api/categories?siteId=${siteId}`);
            urls2.push(`https://${domain}/api/categories?subdomain=${site.subdomain}`);
          }
          if (resourceIds.categoryId) {
            for (const domain of domains) {
              urls2.push(`https://${domain}/api/categories/${resourceIds.categoryId}?siteId=${siteId}`);
              urls2.push(`https://${domain}/api/categories/${resourceIds.categoryId}?subdomain=${site.subdomain}`);
            }
          }
          break;
        case "blog":
          for (const domain of domains) {
            urls2.push(`https://${domain}/api/blog/posts?siteId=${siteId}`);
          }
          if (resourceIds.postSlug) {
            for (const domain of domains) {
              urls2.push(`https://${domain}/api/blog/post/${resourceIds.postSlug}?siteId=${siteId}`);
            }
          }
          break;
        case "reviews":
          if (resourceIds.productId) {
            for (const domain of domains) {
              urls2.push(`https://${domain}/api/reviews/product/${resourceIds.productId}?siteId=${siteId}`);
            }
          }
          break;
      }
    }
    const purgePromises = urls2.map(
      (url) => cache.delete(new Request(url)).catch(
        (e) => console.error(`[Cache] Failed to purge ${url}:`, e.message)
      )
    );
    await Promise.allSettled(purgePromises);
    console.log(`[Cache] Purged ${purgePromises.length} URLs for site ${siteId} (types: ${types.join(", ")})`);
  } catch (e) {
    console.error("[Cache] Purge error:", e.message);
  }
}
var CACHE_TTL, STALE_WHILE_REVALIDATE;
var init_cache = __esm({
  "utils/cache.js"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_helpers();
    init_config();
    CACHE_TTL = 604800;
    STALE_WHILE_REVALIDATE = 1209600;
    __name(cachedJsonResponse, "cachedJsonResponse");
    __name(purgeStorefrontCache, "purgeStorefrontCache");
  }
});

// utils/d1-manager.js
var d1_manager_exports = {};
__export(d1_manager_exports, {
  addBindingAndRedeploy: () => addBindingAndRedeploy,
  createDatabase: () => createDatabase,
  deleteDatabase: () => deleteDatabase,
  getDatabaseSize: () => getDatabaseSize,
  listAllSiteDatabases: () => listAllSiteDatabases,
  runSchemaOnDB: () => runSchemaOnDB
});
function getCredentials(env) {
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (!apiToken || !accountId) {
    throw new Error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required");
  }
  return { apiToken, accountId };
}
function cfHeaders(apiToken) {
  return {
    "Authorization": `Bearer ${apiToken}`,
    "Content-Type": "application/json"
  };
}
async function createDatabase(env, name) {
  const { apiToken, accountId } = getCredentials(env);
  const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database`, {
    method: "POST",
    headers: cfHeaders(apiToken),
    body: JSON.stringify({ name })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Failed to create D1 database: ${JSON.stringify(data.errors)}`);
  }
  return {
    id: data.result.uuid,
    name: data.result.name,
    created_at: data.result.created_at
  };
}
async function deleteDatabase(env, databaseId) {
  const { apiToken, accountId } = getCredentials(env);
  const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database/${databaseId}`, {
    method: "DELETE",
    headers: cfHeaders(apiToken)
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Failed to delete D1 database: ${JSON.stringify(data.errors)}`);
  }
  return true;
}
async function getDatabaseSize(env, databaseId) {
  const { apiToken, accountId } = getCredentials(env);
  const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database/${databaseId}`, {
    method: "GET",
    headers: cfHeaders(apiToken)
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Failed to get D1 database info: ${JSON.stringify(data.errors)}`);
  }
  return data.result.file_size || 0;
}
async function runSchemaOnDB(env, databaseId, sqlStatements) {
  const { apiToken, accountId } = getCredentials(env);
  const coreStatements = [];
  const alterStatements = [];
  for (const sql of sqlStatements) {
    if (sql.trim().toUpperCase().startsWith("ALTER TABLE")) {
      alterStatements.push(sql);
    } else {
      coreStatements.push(sql);
    }
  }
  const BATCH_SIZE = 15;
  for (let i = 0; i < coreStatements.length; i += BATCH_SIZE) {
    const batch = coreStatements.slice(i, i + BATCH_SIZE);
    const combinedSql = batch.join(";\n");
    const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database/${databaseId}/query`, {
      method: "POST",
      headers: cfHeaders(apiToken),
      body: JSON.stringify({ sql: combinedSql })
    });
    const data = await res.json();
    if (!data.success) {
      console.error(`Schema batch failed (statements ${i}-${i + batch.length}):`, data.errors);
      throw new Error(`Failed to run schema SQL batch: ${JSON.stringify(data.errors)}`);
    }
  }
  const ALTER_BATCH = 10;
  for (let i = 0; i < alterStatements.length; i += ALTER_BATCH) {
    const batch = alterStatements.slice(i, i + ALTER_BATCH);
    for (const sql of batch) {
      try {
        const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database/${databaseId}/query`, {
          method: "POST",
          headers: cfHeaders(apiToken),
          body: JSON.stringify({ sql })
        });
        const data = await res.json();
        if (!data.success) {
          const errStr = JSON.stringify(data.errors || []);
          if (errStr.includes("duplicate column") || errStr.includes("already exists")) {
            continue;
          }
          console.error(`ALTER failed: ${sql.substring(0, 80)}`, data.errors);
        }
      } catch (e) {
        console.error(`ALTER error: ${sql.substring(0, 80)}`, e.message);
      }
    }
  }
  return true;
}
async function addBindingAndRedeploy(env, siteId, databaseId, bindingName) {
  const { apiToken, accountId } = getCredentials(env);
  const workerName = "saas-platform";
  const getRes = await fetch(`${CF_API_BASE}/accounts/${accountId}/workers/scripts/${workerName}/settings`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${apiToken}` }
  });
  const getData = await getRes.json();
  if (!getData.success) {
    throw new Error(`Failed to get worker settings: ${JSON.stringify(getData.errors)}`);
  }
  const currentBindings = getData.result?.bindings || [];
  const existingBinding = currentBindings.find((b) => b.name === bindingName);
  if (existingBinding && existingBinding.id === databaseId) {
    console.log(`Binding ${bindingName} already exists with correct DB ID, skipping redeploy`);
    return true;
  }
  let updatedBindings;
  if (existingBinding) {
    updatedBindings = currentBindings.map(
      (b) => b.name === bindingName ? { ...b, id: databaseId, database_id: databaseId } : b
    );
    console.log(`Updating binding ${bindingName} from ${existingBinding.id} to ${databaseId}`);
  } else {
    updatedBindings = [...currentBindings, { type: "d1", name: bindingName, id: databaseId }];
  }
  const settingsPayload = JSON.stringify({ bindings: updatedBindings });
  const formData = new FormData();
  formData.append("settings", new Blob([settingsPayload], { type: "application/json" }), "blob");
  const patchRes = await fetch(`${CF_API_BASE}/accounts/${accountId}/workers/scripts/${workerName}/settings`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${apiToken}` },
    body: formData
  });
  const patchData = await patchRes.json();
  if (!patchData.success) {
    throw new Error(`Failed to add binding and redeploy: ${JSON.stringify(patchData.errors)}`);
  }
  console.log(`Successfully added D1 binding ${bindingName} for site ${siteId} and redeployed worker`);
  return true;
}
async function listAllSiteDatabases(env) {
  const { apiToken, accountId } = getCredentials(env);
  const databases = [];
  let cursor = null;
  do {
    const params = new URLSearchParams({ per_page: "50" });
    if (cursor)
      params.set("cursor", cursor);
    const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/d1/database?${params}`, {
      method: "GET",
      headers: cfHeaders(apiToken)
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(`Failed to list D1 databases: ${JSON.stringify(data.errors)}`);
    }
    databases.push(...data.result || []);
    cursor = data.result_info?.cursor || null;
  } while (cursor);
  return databases.filter((db) => db.name.startsWith("site-"));
}
var CF_API_BASE;
var init_d1_manager = __esm({
  "utils/d1-manager.js"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    CF_API_BASE = "https://api.cloudflare.com/client/v4";
    __name(getCredentials, "getCredentials");
    __name(cfHeaders, "cfHeaders");
    __name(createDatabase, "createDatabase");
    __name(deleteDatabase, "deleteDatabase");
    __name(getDatabaseSize, "getDatabaseSize");
    __name(runSchemaOnDB, "runSchemaOnDB");
    __name(addBindingAndRedeploy, "addBindingAndRedeploy");
    __name(listAllSiteDatabases, "listAllSiteDatabases");
  }
});

// utils/usage-tracker.js
var usage_tracker_exports = {};
__export(usage_tracker_exports, {
  checkUsageLimit: () => checkUsageLimit,
  estimateRowBytes: () => estimateRowBytes,
  getShardCorrectionFactor: () => getShardCorrectionFactor,
  getSiteUsage: () => getSiteUsage,
  handleUsageAPI: () => handleUsageAPI,
  reconcileShard: () => reconcileShard,
  recordMediaFile: () => recordMediaFile,
  removeMediaFile: () => removeMediaFile,
  trackD1Delete: () => trackD1Delete,
  trackD1Update: () => trackD1Update,
  trackD1Usage: () => trackD1Usage,
  trackD1Write: () => trackD1Write,
  trackR2Usage: () => trackR2Usage
});
async function getOverageRates(env) {
  try {
    const result = await env.DB.prepare(
      `SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('overage_rate_d1_per_gb', 'overage_rate_r2_per_gb')`
    ).all();
    const rates = { ...DEFAULT_OVERAGE_RATES };
    for (const row of result.results || []) {
      if (row.setting_key === "overage_rate_d1_per_gb") {
        const v = parseFloat(row.setting_value);
        if (!isNaN(v) && v >= 0)
          rates.d1PerGB = v;
      }
      if (row.setting_key === "overage_rate_r2_per_gb") {
        const v = parseFloat(row.setting_value);
        if (!isNaN(v) && v >= 0)
          rates.r2PerGB = v;
      }
    }
    return rates;
  } catch (e) {
    return { ...DEFAULT_OVERAGE_RATES };
  }
}
function estimateRowBytes(data) {
  return Math.ceil(JSON.stringify(data).length * 1.2);
}
async function trackD1Write(env, siteId, bytesAdded) {
  if (!siteId || !bytesAdded || bytesAdded <= 0)
    return;
  try {
    await env.DB.prepare(`
      INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
      VALUES (?, ?, 0, 0, datetime('now'))
      ON CONFLICT(site_id) DO UPDATE SET
        d1_bytes_used = d1_bytes_used + ?,
        last_updated = datetime('now')
    `).bind(siteId, bytesAdded, bytesAdded).run();
  } catch (e) {
    console.error("trackD1Write error (non-fatal):", e.message || e);
  }
}
async function trackD1Delete(env, siteId, bytesRemoved) {
  if (!siteId || !bytesRemoved || bytesRemoved <= 0)
    return;
  try {
    await env.DB.prepare(`
      INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
      VALUES (?, 0, 0, 0, datetime('now'))
      ON CONFLICT(site_id) DO UPDATE SET
        d1_bytes_used = MAX(0, d1_bytes_used - ?),
        last_updated = datetime('now')
    `).bind(siteId, bytesRemoved).run();
  } catch (e) {
    console.error("trackD1Delete error (non-fatal):", e.message || e);
  }
}
async function trackD1Update(env, siteId, oldBytes, newBytes) {
  if (!siteId)
    return;
  const delta = newBytes - oldBytes;
  if (delta === 0)
    return;
  try {
    await env.DB.prepare(`
      INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
      VALUES (?, MAX(0, ?), 0, 0, datetime('now'))
      ON CONFLICT(site_id) DO UPDATE SET
        d1_bytes_used = MAX(0, d1_bytes_used + ?),
        last_updated = datetime('now')
    `).bind(siteId, Math.max(0, delta), delta).run();
  } catch (e) {
    console.error("trackD1Update error (non-fatal):", e.message || e);
  }
}
async function trackD1Usage(env, siteId, byteDelta) {
  if (!siteId || byteDelta === 0)
    return;
  if (byteDelta > 0) {
    await trackD1Write(env, siteId, byteDelta);
  } else {
    await trackD1Delete(env, siteId, Math.abs(byteDelta));
  }
}
async function trackR2Usage(env, siteId, byteDelta) {
  if (!siteId || byteDelta === 0)
    return;
  try {
    await env.DB.prepare(`
      INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
      VALUES (?, 0, MAX(0, ?), 0, datetime('now'))
      ON CONFLICT(site_id) DO UPDATE SET
        r2_bytes_used = MAX(0, r2_bytes_used + ?),
        last_updated = datetime('now')
    `).bind(siteId, Math.max(0, byteDelta), byteDelta).run();
  } catch (e) {
    console.error("trackR2Usage error (non-fatal):", e.message || e);
  }
}
async function recordMediaFile(env, siteId, storageKey, sizeBytes, mediaType = "image") {
  if (!siteId || !storageKey)
    return;
  try {
    const result = await env.DB.prepare(`
      INSERT OR IGNORE INTO site_media (site_id, storage_key, size_bytes, media_type, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(siteId, storageKey, sizeBytes, mediaType).run();
    if (result?.meta?.changes > 0) {
      await trackR2Usage(env, siteId, sizeBytes);
    }
  } catch (e) {
    console.error("recordMediaFile error (non-fatal):", e.message || e);
  }
}
async function removeMediaFile(env, siteId, storageKey) {
  if (!storageKey)
    return;
  try {
    const record = await env.DB.prepare(
      "SELECT size_bytes, site_id FROM site_media WHERE storage_key = ?"
    ).bind(storageKey).first();
    if (record) {
      const resolvedSiteId = siteId || record.site_id;
      await env.DB.prepare("DELETE FROM site_media WHERE storage_key = ?").bind(storageKey).run();
      await trackR2Usage(env, resolvedSiteId, -record.size_bytes);
    }
  } catch (e) {
    console.error("removeMediaFile error (non-fatal):", e.message || e);
  }
}
async function getShardCorrectionFactor(env, siteId) {
  try {
    const result = await env.DB.prepare(
      `SELECT sh.correction_factor
       FROM sites s
       JOIN shards sh ON s.shard_id = sh.id
       WHERE s.id = ?`
    ).bind(siteId).first();
    return result?.correction_factor || 1;
  } catch (e) {
    return 1;
  }
}
async function getSiteUsage(env, siteId) {
  try {
    const usage = await env.DB.prepare(
      "SELECT d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated FROM site_usage WHERE site_id = ?"
    ).bind(siteId).first();
    const rawD1 = usage?.d1_bytes_used || 0;
    const baseline = usage?.baseline_bytes || 0;
    const r2BytesUsed = usage?.r2_bytes_used || 0;
    const correctionFactor = await getShardCorrectionFactor(env, siteId);
    const displayD1 = Math.ceil((baseline + rawD1) * correctionFactor);
    return {
      d1BytesUsed: displayD1,
      d1BytesRaw: rawD1,
      baselineBytes: baseline,
      correctionFactor,
      r2BytesUsed,
      lastUpdated: usage?.last_updated || (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (e) {
    console.error("getSiteUsage error:", e.message || e);
    return { d1BytesUsed: 0, d1BytesRaw: 0, baselineBytes: 0, correctionFactor: 1, r2BytesUsed: 0, lastUpdated: null };
  }
}
function getSitePlan(site) {
  const plan = (site.subscription_plan || "free").toLowerCase();
  if (plan.includes("enterprise"))
    return "enterprise";
  if (plan.includes("pro"))
    return "pro";
  if (plan.includes("standard"))
    return "standard";
  if (plan.includes("basic"))
    return "basic";
  if (plan === "trial")
    return "trial";
  return "free";
}
async function checkUsageLimit(env, siteId, resourceType = "d1", additionalBytes = 0) {
  try {
    const site = await env.DB.prepare(
      "SELECT subscription_plan FROM sites WHERE id = ?"
    ).bind(siteId).first();
    if (!site)
      return { allowed: true, reason: null };
    const planKey = getSitePlan(site);
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
    const usage = await getSiteUsage(env, siteId);
    const currentBytes = resourceType === "d1" ? usage.d1BytesUsed : usage.r2BytesUsed;
    const limitBytes = resourceType === "d1" ? limits.d1Bytes : limits.r2Bytes;
    const newTotal = currentBytes + additionalBytes;
    if (newTotal <= limitBytes) {
      return { allowed: true, reason: null };
    }
    let isEnterpriseSite = false;
    try {
      const entCheck = await env.DB.prepare("SELECT site_id FROM enterprise_sites WHERE site_id = ?").bind(siteId).first();
      isEnterpriseSite = !!entCheck;
    } catch (_) {
    }
    if (isEnterpriseSite) {
      const overageBytes = Math.max(0, newTotal - limitBytes);
      const overageGB = overageBytes / (1024 * 1024 * 1024);
      const rates = await getOverageRates(env);
      const rate = resourceType === "d1" ? rates.d1PerGB : rates.r2PerGB;
      const overageCost = overageGB * rate;
      return { allowed: true, overage: true, overageBytes, overageCostINR: overageCost, reason: null };
    }
    const limitMB = (limitBytes / (1024 * 1024)).toFixed(0);
    const usedMB = (currentBytes / (1024 * 1024)).toFixed(1);
    return {
      allowed: false,
      reason: `Storage limit reached. ${resourceType.toUpperCase()} usage: ${usedMB}MB / ${limitMB}MB. Upgrade your plan for more storage.`
    };
  } catch (e) {
    console.error("checkUsageLimit error (non-fatal):", e.message || e);
    return { allowed: true, reason: null };
  }
}
async function reconcileShard(env, shardId) {
  try {
    const shard = await env.DB.prepare(
      "SELECT id, database_id, binding_name FROM shards WHERE id = ?"
    ).bind(shardId).first();
    if (!shard)
      return null;
    const { getDatabaseSize: getDatabaseSize2 } = await Promise.resolve().then(() => (init_d1_manager(), d1_manager_exports));
    const actualSize = await getDatabaseSize2(env, shard.database_id);
    const sitesResult = await env.DB.prepare(
      "SELECT site_id, d1_bytes_used, baseline_bytes FROM site_usage WHERE site_id IN (SELECT id FROM sites WHERE shard_id = ?)"
    ).bind(shardId).all();
    let totalEstimated = 0;
    for (const s of sitesResult.results || []) {
      totalEstimated += (s.d1_bytes_used || 0) + (s.baseline_bytes || 0);
    }
    let correctionFactor = 1;
    if (totalEstimated >= ONE_MB) {
      correctionFactor = actualSize / totalEstimated;
      correctionFactor = Math.min(Math.max(correctionFactor, 0.8), 1.5);
    }
    await env.DB.prepare(
      `UPDATE shards SET correction_factor = ?, last_reconciled_at = datetime('now') WHERE id = ?`
    ).bind(correctionFactor, shardId).run();
    return {
      shardId,
      actualSizeBytes: actualSize,
      totalEstimatedBytes: totalEstimated,
      correctionFactor,
      siteCount: (sitesResult.results || []).length
    };
  } catch (e) {
    console.error("reconcileShard error:", e.message || e);
    return null;
  }
}
async function handleUsageAPI(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401);
  }
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  if (!siteId) {
    return errorResponse("siteId is required", 400);
  }
  if (request.method === "POST") {
    const action = url.searchParams.get("action");
    if (action === "reconcile") {
      return handleReconcile(env, user, siteId);
    }
    return handleOverageToggle(request, env, user, siteId);
  }
  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const site = await env.DB.prepare(
      "SELECT id, subscription_plan FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (!site) {
      return errorResponse("Site not found or unauthorized", 404);
    }
    const usage = await getSiteUsage(env, siteId);
    if (usage.r2BytesUsed === 0) {
      try {
        const mediaTotal = await env.DB.prepare(
          "SELECT SUM(size_bytes) as total FROM site_media WHERE site_id = ?"
        ).bind(siteId).first();
        const r2FromMedia = mediaTotal?.total || 0;
        if (r2FromMedia > 0) {
          await env.DB.prepare(`
            INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
            VALUES (?, 0, ?, 0, datetime('now'))
            ON CONFLICT(site_id) DO UPDATE SET
              r2_bytes_used = ?,
              last_updated = datetime('now')
          `).bind(siteId, r2FromMedia, r2FromMedia).run();
          usage.r2BytesUsed = r2FromMedia;
        }
      } catch (_) {
      }
    }
    const planKey = getSitePlan(site);
    const limits = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
    const d1OverageBytes = Math.max(0, usage.d1BytesUsed - limits.d1Bytes);
    const r2OverageBytes = Math.max(0, usage.r2BytesUsed - limits.r2Bytes);
    const d1OverageGB = d1OverageBytes / (1024 * 1024 * 1024);
    const r2OverageGB = r2OverageBytes / (1024 * 1024 * 1024);
    const rates = await getOverageRates(env);
    let isEnterprise = false;
    let enterpriseInvoices = [];
    try {
      const entCheck = await env.DB.prepare("SELECT site_id FROM enterprise_sites WHERE site_id = ?").bind(siteId).first();
      isEnterprise = !!entCheck;
      if (isEnterprise) {
        const invResult = await env.DB.prepare(
          "SELECT year_month, d1_overage_bytes, r2_overage_bytes, d1_cost_inr, r2_cost_inr, total_cost_inr, status, paid_at, snapshot_at FROM enterprise_usage_monthly WHERE site_id = ? ORDER BY year_month DESC LIMIT 12"
        ).bind(siteId).all();
        enterpriseInvoices = invResult.results || [];
      }
    } catch (_) {
    }
    let overageCostINR = 0;
    let d1CostINR = 0;
    let r2CostINR = 0;
    if (isEnterprise) {
      d1CostINR = d1OverageGB * rates.d1PerGB;
      r2CostINR = r2OverageGB * rates.r2PerGB;
      overageCostINR = d1CostINR + r2CostINR;
    }
    return successResponse({
      plan: planKey,
      isEnterprise,
      d1: {
        used: usage.d1BytesUsed,
        raw: usage.d1BytesRaw,
        baseline: usage.baselineBytes,
        correctionFactor: usage.correctionFactor,
        limit: limits.d1Bytes,
        percentage: limits.d1Bytes > 0 ? Math.min(100, usage.d1BytesUsed / limits.d1Bytes * 100) : 0,
        overageBytes: d1OverageBytes,
        overageCostINR: isEnterprise ? Math.round(d1CostINR * 100) / 100 : 0
      },
      r2: {
        used: usage.r2BytesUsed,
        limit: limits.r2Bytes,
        percentage: limits.r2Bytes > 0 ? Math.min(100, usage.r2BytesUsed / limits.r2Bytes * 100) : 0,
        overageBytes: r2OverageBytes,
        overageCostINR: isEnterprise ? Math.round(r2CostINR * 100) / 100 : 0
      },
      allowOverage: false,
      overageEnabled: false,
      overageCostINR: Math.round(overageCostINR * 100) / 100,
      overageRates: rates,
      enterpriseInvoices,
      lastUpdated: usage.lastUpdated
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return errorResponse("Failed to fetch usage data", 500);
  }
}
async function handleOverageToggle(request, env, user, siteId) {
  return errorResponse("Overage toggle is not available. Enterprise overage is managed by the platform admin.", 403);
}
async function handleReconcile(env, user, siteId) {
  try {
    const site = await env.DB.prepare(
      "SELECT id, shard_id FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (!site) {
      return errorResponse("Site not found or unauthorized", 404);
    }
    if (!site.shard_id) {
      return errorResponse("Site is not on a shard", 400);
    }
    const reconciled = await reconcileShard(env, site.shard_id);
    if (!reconciled) {
      return errorResponse("Failed to reconcile usage", 500);
    }
    const usage = await getSiteUsage(env, siteId);
    return successResponse({
      d1BytesUsed: usage.d1BytesUsed,
      r2BytesUsed: usage.r2BytesUsed,
      correctionFactor: reconciled.correctionFactor,
      shardActualSize: reconciled.actualSizeBytes
    }, "Usage reconciled successfully");
  } catch (error) {
    console.error("Reconcile error:", error);
    return errorResponse("Failed to reconcile usage", 500);
  }
}
var PLAN_LIMITS, DEFAULT_OVERAGE_RATES, ONE_MB;
var init_usage_tracker = __esm({
  "utils/usage-tracker.js"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_helpers();
    init_auth();
    PLAN_LIMITS = {
      basic: { d1Bytes: 500 * 1024 * 1024, r2Bytes: 5 * 1024 * 1024 * 1024, allowOverage: false },
      standard: { d1Bytes: 1 * 1024 * 1024 * 1024, r2Bytes: 50 * 1024 * 1024 * 1024, allowOverage: false },
      pro: { d1Bytes: 2 * 1024 * 1024 * 1024, r2Bytes: 100 * 1024 * 1024 * 1024, allowOverage: false },
      enterprise: { d1Bytes: 2 * 1024 * 1024 * 1024, r2Bytes: 100 * 1024 * 1024 * 1024, allowOverage: false },
      trial: { d1Bytes: 500 * 1024 * 1024, r2Bytes: 5 * 1024 * 1024 * 1024, allowOverage: false },
      free: { d1Bytes: 500 * 1024 * 1024, r2Bytes: 5 * 1024 * 1024 * 1024, allowOverage: false }
    };
    DEFAULT_OVERAGE_RATES = {
      d1PerGB: 0.75,
      r2PerGB: 0.015
    };
    __name(getOverageRates, "getOverageRates");
    ONE_MB = 1024 * 1024;
    __name(estimateRowBytes, "estimateRowBytes");
    __name(trackD1Write, "trackD1Write");
    __name(trackD1Delete, "trackD1Delete");
    __name(trackD1Update, "trackD1Update");
    __name(trackD1Usage, "trackD1Usage");
    __name(trackR2Usage, "trackR2Usage");
    __name(recordMediaFile, "recordMediaFile");
    __name(removeMediaFile, "removeMediaFile");
    __name(getShardCorrectionFactor, "getShardCorrectionFactor");
    __name(getSiteUsage, "getSiteUsage");
    __name(getSitePlan, "getSitePlan");
    __name(checkUsageLimit, "checkUsageLimit");
    __name(reconcileShard, "reconcileShard");
    __name(handleUsageAPI, "handleUsageAPI");
    __name(handleOverageToggle, "handleOverageToggle");
    __name(handleReconcile, "handleReconcile");
  }
});

// workers/storefront/site-admin-worker.js
var site_admin_worker_exports = {};
__export(site_admin_worker_exports, {
  handleSiteAdmin: () => handleSiteAdmin,
  handleStaffCRUD: () => handleStaffCRUD,
  hasPermission: () => hasPermission,
  validateSiteAdmin: () => validateSiteAdmin
});
async function handleSiteAdmin(request, env, path, ctx2) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  switch (action) {
    case "staff-login":
      return staffLogin(request, env);
    case "validate":
      return validateSiteAdminToken(request, env);
    case "auto-login":
      return autoLoginSiteAdmin(request, env);
    case "staff-logout":
      return staffLogout(request, env);
    case "seo":
      return handleSEO(request, env, pathParts, ctx2);
    default:
      return errorResponse("Site admin endpoint not found", 404);
  }
}
async function staffLogin(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { siteId, subdomain, email, password } = await request.json();
    if (!email || !password) {
      return errorResponse("Email and password are required");
    }
    if (!siteId && !subdomain) {
      return errorResponse("Site ID or subdomain is required");
    }
    let site;
    if (siteId) {
      site = await env.DB.prepare(
        "SELECT id, subdomain, brand_name FROM sites WHERE id = ? AND is_active = 1"
      ).bind(siteId).first();
    } else {
      site = await env.DB.prepare(
        "SELECT id, subdomain, brand_name FROM sites WHERE LOWER(subdomain) = LOWER(?) AND is_active = 1"
      ).bind(subdomain).first();
    }
    if (!site) {
      return errorResponse("Site not found", 404);
    }
    const siteDB = await resolveSiteDBById(env, site.id);
    await ensureSiteStaffTable(siteDB);
    const staff = await siteDB.prepare(
      "SELECT id, site_id, email, password_hash, name, permissions, is_active, failed_login_attempts, locked_until FROM site_staff WHERE site_id = ? AND LOWER(email) = LOWER(?)"
    ).bind(site.id, email.trim()).first();
    if (!staff) {
      return errorResponse("Invalid email or password", 401);
    }
    if (!staff.is_active) {
      return errorResponse("Your account has been deactivated. Contact the store owner.", 403);
    }
    if (staff.locked_until && new Date(staff.locked_until) > /* @__PURE__ */ new Date()) {
      const remainingMs = new Date(staff.locked_until) - /* @__PURE__ */ new Date();
      const remainingMins = Math.ceil(remainingMs / 6e4);
      return errorResponse(`Too many failed login attempts. Account locked for ${remainingMins} more minute(s).`, 429);
    }
    const passwordValid = await verifyPassword(password, staff.password_hash);
    if (!passwordValid) {
      const attempts = (staff.failed_login_attempts || 0) + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1e3).toISOString() : null;
      await siteDB.prepare(
        "UPDATE site_staff SET failed_login_attempts = ?, locked_until = ? WHERE id = ?"
      ).bind(attempts, lockedUntil, staff.id).run();
      if (attempts >= 5) {
        return errorResponse("Too many failed login attempts. Account locked for 15 minutes.", 429);
      }
      return errorResponse("Invalid email or password", 401);
    }
    await siteDB.prepare(
      "UPDATE site_staff SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?"
    ).bind(staff.id).run();
    let permissions = [];
    try {
      permissions = typeof staff.permissions === "string" ? JSON.parse(staff.permissions) : staff.permissions || [];
    } catch (e) {
      permissions = [];
    }
    const adminToken = generateToken(32);
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    await env.DB.prepare(
      `INSERT INTO site_admin_sessions (id, site_id, token, staff_id, permissions, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), site.id, adminToken, staff.id, JSON.stringify(permissions), expiresAt.toISOString()).run();
    const config = await getSiteConfig(env, site.id);
    return successResponse({
      token: adminToken,
      siteId: site.id,
      subdomain: site.subdomain,
      brandName: config.brand_name || site.brand_name,
      expiresAt: expiresAt.toISOString(),
      permissions,
      staffName: staff.name
    }, "Staff login successful");
  } catch (error) {
    console.error("Staff login error:", error);
    return errorResponse("Login failed", 500);
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
    const session = await env.DB.prepare(
      `SELECT id, site_id, staff_id, expires_at FROM site_admin_sessions 
       WHERE token = ? AND site_id = ? AND expires_at > datetime('now')`
    ).bind(token, siteId).first();
    if (!session) {
      return errorResponse("Invalid or expired admin token", 401);
    }
    const isOwner2 = !session.staff_id;
    let permissions = null;
    if (!isOwner2) {
      const siteDB = await resolveSiteDBById(env, siteId);
      await ensureSiteStaffTable(siteDB);
      const staff = await siteDB.prepare(
        "SELECT is_active, permissions FROM site_staff WHERE id = ? AND site_id = ?"
      ).bind(session.staff_id, siteId).first();
      if (!staff || !staff.is_active) {
        await env.DB.prepare("DELETE FROM site_admin_sessions WHERE id = ?").bind(session.id).run();
        return errorResponse("Your account has been deactivated. Contact the store owner.", 403);
      }
      try {
        permissions = typeof staff.permissions === "string" ? JSON.parse(staff.permissions) : staff.permissions || [];
      } catch (e) {
        permissions = [];
      }
    }
    return successResponse({
      valid: true,
      siteId: session.site_id,
      permissions,
      isOwner: isOwner2
    }, "Token is valid");
  } catch (error) {
    console.error("Validate site admin token error:", error);
    return errorResponse("Validation failed", 500);
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
    const config = await getSiteConfig(env, site.id);
    const adminToken = generateToken(32);
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    await ensureSiteAdminSessionsTable(env);
    await env.DB.prepare(
      `INSERT INTO site_admin_sessions (id, site_id, token, staff_id, permissions, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(generateId(), site.id, adminToken, null, null, expiresAt.toISOString()).run();
    return successResponse({
      token: adminToken,
      siteId: site.id,
      subdomain: site.subdomain,
      brandName: config.brand_name || site.brand_name,
      expiresAt: expiresAt.toISOString(),
      permissions: null,
      isOwner: true
    }, "Auto-login token generated");
  } catch (error) {
    console.error("Auto-login site admin error:", error);
    return errorResponse("Auto-login failed", 500);
  }
}
async function staffLogout(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const authHeader = request.headers.get("Authorization") || "";
    if (!authHeader.startsWith("SiteAdmin ")) {
      return successResponse(null, "Logged out");
    }
    const token = authHeader.substring(10);
    await env.DB.prepare("DELETE FROM site_admin_sessions WHERE token = ?").bind(token).run();
    return successResponse(null, "Logged out successfully");
  } catch (error) {
    console.error("Staff logout error:", error);
    return successResponse(null, "Logged out");
  }
}
async function ensureSiteStaffTable(siteDB) {
  try {
    await siteDB.prepare(`
      CREATE TABLE IF NOT EXISTS site_staff (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        permissions TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 1,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TEXT,
        row_size_bytes INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(site_id, email)
      )
    `).run();
    await siteDB.prepare("CREATE INDEX IF NOT EXISTS idx_site_staff_site ON site_staff(site_id)").run();
    await siteDB.prepare("CREATE INDEX IF NOT EXISTS idx_site_staff_email ON site_staff(site_id, email)").run();
  } catch (e) {
  }
}
async function ensureSiteAdminSessionsTable(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS site_admin_sessions (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        token TEXT NOT NULL,
        staff_id TEXT,
        permissions TEXT,
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
async function handleSEO(request, env, pathParts, ctx2) {
  const subResource = pathParts[3];
  const resourceId = pathParts[4];
  if (!subResource) {
    if (request.method === "GET")
      return getSiteSEO(request, env);
    if (request.method === "PUT")
      return saveSiteSEO(request, env, ctx2);
  }
  if (subResource === "categories") {
    if (request.method === "GET")
      return getCategoriesSEO(request, env);
    if (request.method === "PUT" && resourceId)
      return saveCategorySEO(request, env, resourceId, ctx2);
  }
  if (subResource === "products") {
    if (request.method === "GET")
      return getProductsSEO(request, env);
    if (request.method === "PUT" && resourceId)
      return saveProductSEO(request, env, resourceId, ctx2);
  }
  if (subResource === "pages") {
    if (request.method === "GET")
      return getPagesSEO(request, env);
    if (request.method === "PUT" && resourceId)
      return savePageSEO(request, env, resourceId, ctx2);
  }
  if (subResource === "social") {
    if (request.method === "GET")
      return getSocialTags(request, env);
    if (request.method === "PUT")
      return saveSocialTags(request, env, ctx2);
  }
  return errorResponse("SEO endpoint not found", 404);
}
async function getSiteSEO(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required");
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!hasPermission(admin, "seo"))
      return errorResponse("You do not have permission to access SEO settings", 403);
    const config = await getSiteConfig(env, siteId);
    return jsonResponse({ success: true, data: {
      seo_title: config.seo_title || null,
      seo_description: config.seo_description || null,
      seo_og_image: config.seo_og_image || null,
      seo_robots: config.seo_robots || "index, follow",
      google_verification: config.google_verification || null,
      favicon_url: config.favicon_url || null,
      brand_name: config.brand_name || null,
      category: config.category || "general"
    } });
  } catch (err) {
    console.error("getSiteSEO error:", err);
    return errorResponse("Failed to fetch SEO settings", 500);
  }
}
async function saveSiteSEO(request, env, ctx2) {
  try {
    const { siteId, seo_title, seo_description, seo_og_image, seo_robots, google_verification, favicon_url } = await request.json();
    if (!siteId)
      return errorResponse("siteId is required");
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!hasPermission(admin, "seo"))
      return errorResponse("You do not have permission to modify SEO settings", 403);
    const siteDB = await resolveSiteDBById(env, siteId);
    const existingConfig = await siteDB.prepare(
      "SELECT row_size_bytes FROM site_config WHERE site_id = ?"
    ).bind(siteId).first();
    const oldBytes = existingConfig?.row_size_bytes || 0;
    await siteDB.prepare(
      `UPDATE site_config SET
        seo_title = ?, seo_description = ?, seo_og_image = ?,
        seo_robots = ?, google_verification = ?, favicon_url = ?,
        updated_at = datetime('now')
       WHERE site_id = ?`
    ).bind(
      seo_title || null,
      seo_description || null,
      seo_og_image || null,
      seo_robots || "index, follow",
      google_verification || null,
      favicon_url || null,
      siteId
    ).run();
    const updatedConfig = await siteDB.prepare(
      "SELECT * FROM site_config WHERE site_id = ?"
    ).bind(siteId).first();
    if (updatedConfig) {
      const newBytes = estimateRowBytes(updatedConfig);
      await siteDB.prepare("UPDATE site_config SET row_size_bytes = ? WHERE site_id = ?").bind(newBytes, siteId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["site"]));
    return jsonResponse({ success: true, message: "SEO settings saved" });
  } catch (err) {
    console.error("saveSiteSEO error:", err);
    return errorResponse("Failed to save SEO settings", 500);
  }
}
async function getCategoriesSEO(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required");
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!hasPermission(admin, "seo"))
      return errorResponse("You do not have permission to access SEO settings", 403);
    const db = await resolveSiteDBById(env, siteId);
    const result = await db.prepare(
      `SELECT id, name, slug, description, image_url, seo_title, seo_description, seo_og_image
       FROM categories WHERE site_id = ? AND is_active = 1 ORDER BY display_order ASC`
    ).bind(siteId).all();
    return jsonResponse({ success: true, data: result.results || [] });
  } catch (err) {
    console.error("getCategoriesSEO error:", err);
    return errorResponse("Failed to fetch categories", 500);
  }
}
async function saveCategorySEO(request, env, categoryId, ctx2) {
  try {
    const { siteId, seo_title, seo_description, seo_og_image } = await request.json();
    if (!siteId)
      return errorResponse("siteId is required");
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!hasPermission(admin, "seo"))
      return errorResponse("You do not have permission to modify SEO settings", 403);
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, siteId);
    const oldRow = await db.prepare(
      "SELECT row_size_bytes FROM categories WHERE id = ? AND site_id = ?"
    ).bind(categoryId, siteId).first();
    const oldBytes = oldRow?.row_size_bytes || 0;
    await db.prepare(
      `UPDATE categories SET
        seo_title = ?, seo_description = ?, seo_og_image = ?,
        updated_at = datetime('now')
       WHERE id = ? AND site_id = ?`
    ).bind(seo_title || null, seo_description || null, seo_og_image || null, categoryId, siteId).run();
    const updatedRow = await db.prepare(
      "SELECT * FROM categories WHERE id = ? AND site_id = ?"
    ).bind(categoryId, siteId).first();
    if (updatedRow) {
      const newBytes = estimateRowBytes(updatedRow);
      await db.prepare("UPDATE categories SET row_size_bytes = ? WHERE id = ?").bind(newBytes, categoryId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["categories", "site"]));
    return jsonResponse({ success: true, message: "Category SEO saved" });
  } catch (err) {
    console.error("saveCategorySEO error:", err);
    return errorResponse("Failed to save category SEO", 500);
  }
}
async function getProductsSEO(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required");
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!hasPermission(admin, "seo"))
      return errorResponse("You do not have permission to access SEO settings", 403);
    const db = await resolveSiteDBById(env, siteId);
    const result = await db.prepare(
      `SELECT id, name, slug, short_description, description, thumbnail_url, images, price, seo_title, seo_description, seo_og_image
       FROM products WHERE site_id = ? AND is_active = 1 ORDER BY created_at DESC`
    ).bind(siteId).all();
    const products = (result.results || []).map((p) => {
      if (!p.thumbnail_url && p.images) {
        try {
          const imgs = JSON.parse(p.images);
          if (Array.isArray(imgs) && imgs.length > 0) {
            p.thumbnail_url = imgs[0];
          }
        } catch {
        }
      }
      return p;
    });
    return jsonResponse({ success: true, data: products });
  } catch (err) {
    console.error("getProductsSEO error:", err);
    return errorResponse("Failed to fetch products", 500);
  }
}
async function saveProductSEO(request, env, productId, ctx2) {
  try {
    const { siteId, seo_title, seo_description, seo_og_image } = await request.json();
    if (!siteId)
      return errorResponse("siteId is required");
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!hasPermission(admin, "seo"))
      return errorResponse("You do not have permission to modify SEO settings", 403);
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, siteId);
    const oldRow = await db.prepare(
      "SELECT row_size_bytes FROM products WHERE id = ? AND site_id = ?"
    ).bind(productId, siteId).first();
    const oldBytes = oldRow?.row_size_bytes || 0;
    await db.prepare(
      `UPDATE products SET
        seo_title = ?, seo_description = ?, seo_og_image = ?,
        updated_at = datetime('now')
       WHERE id = ? AND site_id = ?`
    ).bind(seo_title || null, seo_description || null, seo_og_image || null, productId, siteId).run();
    const updatedRow = await db.prepare(
      "SELECT * FROM products WHERE id = ? AND site_id = ?"
    ).bind(productId, siteId).first();
    if (updatedRow) {
      const newBytes = estimateRowBytes(updatedRow);
      await db.prepare("UPDATE products SET row_size_bytes = ? WHERE id = ?").bind(newBytes, productId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["products"]));
    return jsonResponse({ success: true, message: "Product SEO saved" });
  } catch (err) {
    console.error("saveProductSEO error:", err);
    return errorResponse("Failed to save product SEO", 500);
  }
}
async function getPagesSEO(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required");
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!hasPermission(admin, "seo"))
      return errorResponse("You do not have permission to access SEO settings", 403);
    const db = await resolveSiteDBById(env, siteId);
    const result = await db.prepare(
      `SELECT id, page_type, seo_title, seo_description, seo_og_image
       FROM page_seo WHERE site_id = ? ORDER BY page_type ASC`
    ).bind(siteId).all();
    const existing = result.results || [];
    const pages = PAGE_TYPES.map((pt) => {
      const found = existing.find((e) => e.page_type === pt);
      return found || { id: null, page_type: pt, seo_title: "", seo_description: "", seo_og_image: "" };
    });
    return jsonResponse({ success: true, data: pages });
  } catch (err) {
    console.error("getPagesSEO error:", err);
    return errorResponse("Failed to fetch page SEO", 500);
  }
}
async function savePageSEO(request, env, pageType, ctx2) {
  try {
    const { siteId, seo_title, seo_description, seo_og_image } = await request.json();
    if (!siteId)
      return errorResponse("siteId is required");
    if (!PAGE_TYPES.includes(pageType))
      return errorResponse("Invalid page type");
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!hasPermission(admin, "seo"))
      return errorResponse("You do not have permission to modify SEO settings", 403);
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, siteId);
    const existing = await db.prepare(
      `SELECT id, row_size_bytes FROM page_seo WHERE site_id = ? AND page_type = ?`
    ).bind(siteId, pageType).first();
    if (existing) {
      const oldBytes = existing.row_size_bytes || 0;
      const newData = { id: existing.id, site_id: siteId, page_type: pageType, seo_title, seo_description, seo_og_image };
      const newBytes = estimateRowBytes(newData);
      await db.prepare(
        `UPDATE page_seo SET
          seo_title = ?, seo_description = ?, seo_og_image = ?,
          row_size_bytes = ?,
          updated_at = datetime('now')
         WHERE id = ?`
      ).bind(seo_title || null, seo_description || null, seo_og_image || null, newBytes, existing.id).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    } else {
      const id = crypto.randomUUID();
      const rowData = { id, site_id: siteId, page_type: pageType, seo_title, seo_description, seo_og_image };
      const rowBytes = estimateRowBytes(rowData);
      await db.prepare(
        `INSERT INTO page_seo (id, site_id, page_type, seo_title, seo_description, seo_og_image, row_size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, siteId, pageType, seo_title || null, seo_description || null, seo_og_image || null, rowBytes).run();
      await trackD1Write(env, siteId, rowBytes);
    }
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["site"]));
    return jsonResponse({ success: true, message: "Page SEO saved" });
  } catch (err) {
    console.error("savePageSEO error:", err);
    return errorResponse("Failed to save page SEO", 500);
  }
}
async function getSocialTags(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required");
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!hasPermission(admin, "seo"))
      return errorResponse("You do not have permission to access SEO settings", 403);
    const config = await getSiteConfig(env, siteId);
    const data = {
      og_title: config.og_title || "",
      og_description: config.og_description || "",
      og_image: config.og_image || "",
      og_type: config.og_type || "website",
      twitter_card: config.twitter_card || "summary_large_image",
      twitter_title: config.twitter_title || "",
      twitter_description: config.twitter_description || "",
      twitter_image: config.twitter_image || "",
      twitter_site: config.twitter_site || "",
      defaults: {
        title: config.seo_title || "",
        description: config.seo_description || "",
        image: config.seo_og_image || ""
      }
    };
    return jsonResponse({ success: true, data });
  } catch (err) {
    console.error("getSocialTags error:", err);
    return errorResponse("Failed to fetch social tags", 500);
  }
}
async function saveSocialTags(request, env, ctx2) {
  try {
    const {
      siteId,
      og_title,
      og_description,
      og_image,
      og_type,
      twitter_card,
      twitter_title,
      twitter_description,
      twitter_image,
      twitter_site
    } = await request.json();
    if (!siteId)
      return errorResponse("siteId is required");
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!hasPermission(admin, "seo"))
      return errorResponse("You do not have permission to modify SEO settings", 403);
    const siteDB = await resolveSiteDBById(env, siteId);
    const existingConfig = await siteDB.prepare(
      "SELECT row_size_bytes FROM site_config WHERE site_id = ?"
    ).bind(siteId).first();
    const oldBytes = existingConfig?.row_size_bytes || 0;
    await siteDB.prepare(
      `UPDATE site_config SET
        og_title = ?, og_description = ?, og_image = ?, og_type = ?,
        twitter_card = ?, twitter_title = ?, twitter_description = ?, twitter_image = ?, twitter_site = ?,
        updated_at = datetime('now')
       WHERE site_id = ?`
    ).bind(
      og_title || null,
      og_description || null,
      og_image || null,
      og_type || "website",
      twitter_card || "summary_large_image",
      twitter_title || null,
      twitter_description || null,
      twitter_image || null,
      twitter_site || null,
      siteId
    ).run();
    const updatedConfig = await siteDB.prepare(
      "SELECT * FROM site_config WHERE site_id = ?"
    ).bind(siteId).first();
    if (updatedConfig) {
      const newBytes = estimateRowBytes(updatedConfig);
      await siteDB.prepare("UPDATE site_config SET row_size_bytes = ? WHERE site_id = ?").bind(newBytes, siteId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["site"]));
    return jsonResponse({ success: true, message: "Social tags saved" });
  } catch (err) {
    console.error("saveSocialTags error:", err);
    return errorResponse("Failed to save social tags", 500);
  }
}
function hasPermission(admin, section) {
  if (!admin)
    return false;
  if (admin.isOwner)
    return true;
  if (!admin.permissions)
    return false;
  return admin.permissions.includes(section);
}
async function validateSiteAdmin(request, env, siteId) {
  if (!siteId)
    return null;
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("SiteAdmin "))
    return null;
  const token = authHeader.substring(10);
  try {
    const session = await env.DB.prepare(
      `SELECT id, site_id, staff_id, expires_at FROM site_admin_sessions 
       WHERE token = ? AND site_id = ? AND expires_at > datetime('now')`
    ).bind(token, siteId).first();
    if (!session)
      return null;
    const isOwner2 = !session.staff_id;
    let permissions = null;
    if (!isOwner2) {
      const siteDB = await resolveSiteDBById(env, siteId);
      await ensureSiteStaffTable(siteDB);
      const staff = await siteDB.prepare(
        "SELECT is_active, permissions FROM site_staff WHERE id = ? AND site_id = ?"
      ).bind(session.staff_id, siteId).first();
      if (!staff || !staff.is_active) {
        await env.DB.prepare("DELETE FROM site_admin_sessions WHERE id = ?").bind(session.id).run();
        return null;
      }
      try {
        permissions = typeof staff.permissions === "string" ? JSON.parse(staff.permissions) : staff.permissions || [];
      } catch (e) {
        permissions = [];
      }
    }
    return { siteId: session.site_id, staffId: session.staff_id || null, isOwner: isOwner2, permissions };
  } catch (error) {
    console.error("Validate site admin error:", error);
    return null;
  }
}
async function handleStaffCRUD(request, env, siteId, staffAction, staffId) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const user = await validateAuth(request, env);
  if (!user)
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  const site = await env.DB.prepare(
    "SELECT id FROM sites WHERE id = ? AND user_id = ?"
  ).bind(siteId, user.id).first();
  if (!site)
    return errorResponse("Site not found or unauthorized", 404);
  const method = request.method;
  if (method === "GET" && !staffId) {
    return listStaff(env, siteId);
  }
  if (method === "GET" && staffId) {
    return getStaffMember(env, siteId, staffId);
  }
  if (method === "POST" && !staffId) {
    return addStaff(request, env, siteId);
  }
  if (method === "PUT" && staffId) {
    return updateStaff(request, env, siteId, staffId);
  }
  if (method === "DELETE" && staffId) {
    return deleteStaff(env, siteId, staffId);
  }
  return errorResponse("Method not allowed", 405);
}
async function listStaff(env, siteId) {
  try {
    const siteDB = await resolveSiteDBById(env, siteId);
    await ensureSiteStaffTable(siteDB);
    const result = await siteDB.prepare(
      "SELECT id, site_id, email, name, permissions, is_active, created_at, updated_at FROM site_staff WHERE site_id = ? ORDER BY created_at DESC"
    ).bind(siteId).all();
    const staff = (result.results || []).map((s) => ({
      ...s,
      is_active: s.is_active === 1 || s.is_active === true,
      permissions: (() => {
        try {
          return typeof s.permissions === "string" ? JSON.parse(s.permissions) : s.permissions || [];
        } catch {
          return [];
        }
      })()
    }));
    return successResponse(staff);
  } catch (error) {
    console.error("List staff error:", error);
    return errorResponse("Failed to list staff", 500);
  }
}
async function getStaffMember(env, siteId, staffId) {
  try {
    const siteDB = await resolveSiteDBById(env, siteId);
    await ensureSiteStaffTable(siteDB);
    const staff = await siteDB.prepare(
      "SELECT id, site_id, email, name, permissions, is_active, created_at, updated_at FROM site_staff WHERE id = ? AND site_id = ?"
    ).bind(staffId, siteId).first();
    if (!staff)
      return errorResponse("Staff member not found", 404);
    let permissions = [];
    try {
      permissions = typeof staff.permissions === "string" ? JSON.parse(staff.permissions) : staff.permissions || [];
    } catch {
    }
    return successResponse({ ...staff, is_active: staff.is_active === 1 || staff.is_active === true, permissions });
  } catch (error) {
    console.error("Get staff error:", error);
    return errorResponse("Failed to get staff member", 500);
  }
}
async function addStaff(request, env, siteId) {
  try {
    const { email, name, password, permissions } = await request.json();
    if (!email || !name || !password) {
      return errorResponse("Email, name, and password are required");
    }
    if (password.length < 6) {
      return errorResponse("Password must be at least 6 characters");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse("Invalid email address");
    }
    const validPerms = (permissions || []).filter((p) => ALL_PERMISSIONS.includes(p));
    if (validPerms.length === 0) {
      return errorResponse("At least one permission must be selected");
    }
    const siteDB = await resolveSiteDBById(env, siteId);
    await ensureSiteStaffTable(siteDB);
    const existing = await siteDB.prepare(
      "SELECT id FROM site_staff WHERE site_id = ? AND LOWER(email) = LOWER(?)"
    ).bind(siteId, email.trim()).first();
    if (existing) {
      return errorResponse("A staff member with this email already exists for this site", 400);
    }
    const passwordHash = await hashPassword(password);
    const id = generateId();
    await siteDB.prepare(
      `INSERT INTO site_staff (id, site_id, email, password_hash, name, permissions, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    ).bind(id, siteId, email.trim().toLowerCase(), passwordHash, name.trim(), JSON.stringify(validPerms)).run();
    return successResponse({
      id,
      site_id: siteId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      permissions: validPerms,
      is_active: 1
    }, "Staff member added successfully");
  } catch (error) {
    console.error("Add staff error:", error);
    if (error.message && error.message.includes("UNIQUE constraint")) {
      return errorResponse("A staff member with this email already exists", 400);
    }
    return errorResponse("Failed to add staff member", 500);
  }
}
async function updateStaff(request, env, siteId, staffId) {
  try {
    const siteDB = await resolveSiteDBById(env, siteId);
    await ensureSiteStaffTable(siteDB);
    const existing = await siteDB.prepare(
      "SELECT id FROM site_staff WHERE id = ? AND site_id = ?"
    ).bind(staffId, siteId).first();
    if (!existing)
      return errorResponse("Staff member not found", 404);
    const updates = await request.json();
    const setClauses = [];
    const values = [];
    if (updates.name !== void 0) {
      setClauses.push("name = ?");
      values.push(updates.name.trim());
    }
    if (updates.email !== void 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return errorResponse("Invalid email address");
      }
      const emailConflict = await siteDB.prepare(
        "SELECT id FROM site_staff WHERE site_id = ? AND LOWER(email) = LOWER(?) AND id != ?"
      ).bind(siteId, updates.email.trim(), staffId).first();
      if (emailConflict) {
        return errorResponse("Another staff member with this email already exists", 400);
      }
      setClauses.push("email = ?");
      values.push(updates.email.trim().toLowerCase());
    }
    if (updates.password !== void 0 && updates.password.length > 0) {
      if (updates.password.length < 6) {
        return errorResponse("Password must be at least 6 characters");
      }
      const passwordHash = await hashPassword(updates.password);
      setClauses.push("password_hash = ?");
      values.push(passwordHash);
    }
    if (updates.permissions !== void 0) {
      const validPerms = (updates.permissions || []).filter((p) => ALL_PERMISSIONS.includes(p));
      if (validPerms.length === 0) {
        return errorResponse("At least one permission must be selected");
      }
      setClauses.push("permissions = ?");
      values.push(JSON.stringify(validPerms));
    }
    if (updates.is_active !== void 0) {
      setClauses.push("is_active = ?");
      values.push(updates.is_active ? 1 : 0);
    }
    if (setClauses.length === 0) {
      return errorResponse("No valid fields to update");
    }
    setClauses.push('updated_at = datetime("now")');
    values.push(staffId, siteId);
    await siteDB.prepare(
      `UPDATE site_staff SET ${setClauses.join(", ")} WHERE id = ? AND site_id = ?`
    ).bind(...values).run();
    if (updates.permissions !== void 0 || updates.is_active === false || updates.password) {
      await env.DB.prepare(
        "DELETE FROM site_admin_sessions WHERE staff_id = ? AND site_id = ?"
      ).bind(staffId, siteId).run();
    }
    const updated = await siteDB.prepare(
      "SELECT id, site_id, email, name, permissions, is_active, created_at, updated_at FROM site_staff WHERE id = ? AND site_id = ?"
    ).bind(staffId, siteId).first();
    let permissions = [];
    try {
      permissions = typeof updated.permissions === "string" ? JSON.parse(updated.permissions) : updated.permissions || [];
    } catch {
    }
    return successResponse({ ...updated, permissions }, "Staff member updated successfully");
  } catch (error) {
    console.error("Update staff error:", error);
    return errorResponse("Failed to update staff member", 500);
  }
}
async function deleteStaff(env, siteId, staffId) {
  try {
    const siteDB = await resolveSiteDBById(env, siteId);
    await ensureSiteStaffTable(siteDB);
    const existing = await siteDB.prepare(
      "SELECT id FROM site_staff WHERE id = ? AND site_id = ?"
    ).bind(staffId, siteId).first();
    if (!existing)
      return errorResponse("Staff member not found", 404);
    await env.DB.prepare(
      "DELETE FROM site_admin_sessions WHERE staff_id = ? AND site_id = ?"
    ).bind(staffId, siteId).run();
    await siteDB.prepare(
      "DELETE FROM site_staff WHERE id = ? AND site_id = ?"
    ).bind(staffId, siteId).run();
    return successResponse(null, "Staff member removed successfully");
  } catch (error) {
    console.error("Delete staff error:", error);
    return errorResponse("Failed to remove staff member", 500);
  }
}
var ALL_PERMISSIONS, PAGE_TYPES;
var init_site_admin_worker = __esm({
  "workers/storefront/site-admin-worker.js"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_helpers();
    init_cache();
    init_auth();
    init_site_db();
    init_usage_tracker();
    ALL_PERMISSIONS = ["dashboard", "products", "inventory", "orders", "customers", "analytics", "website", "seo", "notifications", "faq", "settings"];
    __name(handleSiteAdmin, "handleSiteAdmin");
    __name(staffLogin, "staffLogin");
    __name(validateSiteAdminToken, "validateSiteAdminToken");
    __name(autoLoginSiteAdmin, "autoLoginSiteAdmin");
    __name(staffLogout, "staffLogout");
    __name(ensureSiteStaffTable, "ensureSiteStaffTable");
    __name(ensureSiteAdminSessionsTable, "ensureSiteAdminSessionsTable");
    __name(handleSEO, "handleSEO");
    __name(getSiteSEO, "getSiteSEO");
    __name(saveSiteSEO, "saveSiteSEO");
    __name(getCategoriesSEO, "getCategoriesSEO");
    __name(saveCategorySEO, "saveCategorySEO");
    __name(getProductsSEO, "getProductsSEO");
    __name(saveProductSEO, "saveProductSEO");
    PAGE_TYPES = ["home", "about", "contact", "privacy", "terms"];
    __name(getPagesSEO, "getPagesSEO");
    __name(savePageSEO, "savePageSEO");
    __name(getSocialTags, "getSocialTags");
    __name(saveSocialTags, "saveSocialTags");
    __name(hasPermission, "hasPermission");
    __name(validateSiteAdmin, "validateSiteAdmin");
    __name(handleStaffCRUD, "handleStaffCRUD");
    __name(listStaff, "listStaff");
    __name(getStaffMember, "getStaffMember");
    __name(addStaff, "addStaff");
    __name(updateStaff, "updateStaff");
    __name(deleteStaff, "deleteStaff");
  }
});

// .wrangler/tmp/bundle-KKL3BZ/middleware-loader.entry.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// .wrangler/tmp/bundle-KKL3BZ/middleware-insertion-facade.js
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
init_config();
var CURRENCY_SYMBOLS = {
  INR: "\u20B9",
  USD: "$",
  EUR: "\u20AC",
  GBP: "\xA3",
  AED: "\u062F.\u0625",
  CAD: "CA$",
  AUD: "A$",
  SAR: "\uFDFC"
};
function formatOrderDate(dateStr, timezone) {
  if (!dateStr)
    return "";
  let s = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s.replace(" ", "T") + "Z";
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s + "Z";
  }
  const d = new Date(s);
  if (isNaN(d.getTime()))
    return "";
  const opts = { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true };
  if (timezone)
    opts.timeZone = timezone;
  try {
    return d.toLocaleString("en-IN", opts);
  } catch (e) {
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  }
}
__name(formatOrderDate, "formatOrderDate");
function formatCurrency(amount, currency = "INR") {
  const sym = CURRENCY_SYMBOLS[currency] || currency + " ";
  const num = Number(amount || 0);
  if (currency === "INR") {
    return `${sym}${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${sym}${num.toFixed(2)}`;
}
__name(formatCurrency, "formatCurrency");
function formatCurrencyHtml(amount, currency = "INR") {
  if (currency === "INR") {
    const num = Number(amount || 0);
    return `&#8377;${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return formatCurrency(amount, currency);
}
__name(formatCurrencyHtml, "formatCurrencyHtml");
async function sendEmail(env, to, subject, html, text) {
  try {
    const apiKey = (env.BREVO_API_KEY || "").trim();
    if (!apiKey) {
      console.error("EMAIL FAILED: BREVO_API_KEY is not set. Email NOT sent to:", to, "Subject:", subject);
      return "No email provider configured";
    }
    const fromEmail = env.FROM_EMAIL || FROM_EMAIL;
    const recipients = typeof to === "string" ? [{ email: to }] : Array.isArray(to) ? to.map((e) => typeof e === "string" ? { email: e } : e) : [to];
    const toPayload = recipients.map((r) => {
      const entry = { email: r.email };
      if (r.name)
        entry.name = r.name;
      return entry;
    });
    const payload = {
      sender: { email: fromEmail, name: "Fluxe" },
      to: toPayload,
      subject,
      htmlContent: html
    };
    if (text)
      payload.textContent = text;
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Brevo API error:", JSON.stringify(body), "Status:", response.status, "To:", recipients.map((r) => r.email).join(", "));
      return body.message || "Brevo API error";
    }
    console.log("Email sent via Brevo to:", recipients.map((r) => r.email).join(", "), "Subject:", subject, "MessageId:", body.messageId || "");
    return true;
  } catch (error) {
    console.error("Send email error:", error.message || error);
    return error.message || "Unknown email sending error";
  }
}
__name(sendEmail, "sendEmail");
function formatSelectedOptions(selectedOptions, currency = "INR") {
  if (!selectedOptions)
    return "";
  const parts = [];
  if (selectedOptions.color)
    parts.push(`Color: ${selectedOptions.color}`);
  if (selectedOptions.customOptions) {
    for (const [label, value] of Object.entries(selectedOptions.customOptions)) {
      parts.push(`${label}: ${value}`);
    }
  }
  if (selectedOptions.pricedOptions) {
    for (const [label, val] of Object.entries(selectedOptions.pricedOptions)) {
      const priceSuffix = Number(val.price || 0) > 0 ? ` (${formatCurrencyHtml(val.price, currency)})` : "";
      parts.push(`${label}: ${val.name}${priceSuffix}`);
    }
  }
  return parts.length > 0 ? `<div style="font-size: 12px; color: #888; margin-top: 2px;">${parts.join(" &bull; ")}</div>` : "";
}
__name(formatSelectedOptions, "formatSelectedOptions");
function buildOrderConfirmationEmail(order, brandName, ownerEmail, currency = "INR", options = {}, timezone = "") {
  const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
  const fmtH = /* @__PURE__ */ __name((amt) => formatCurrencyHtml(amt, currency), "fmtH");
  const fmt = /* @__PURE__ */ __name((amt) => formatCurrency(amt, currency), "fmt");
  const itemsHtml = items.map((item) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name}${formatSelectedOptions(item.selectedOptions, currency)}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">${fmtH(item.price)}</td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">${fmtH(Number(item.price) * Number(item.quantity))}</td>
    </tr>
  `).join("");
  const shippingAddress = typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address || order.shippingAddress;
  const addressHtml = shippingAddress ? `
    <div style="margin-top: 24px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Address</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #333;">
        ${shippingAddress.name || order.customer_name || ""}<br>
        ${shippingAddress.address || ""}<br>
        ${shippingAddress.city || ""}${shippingAddress.state ? `, ${shippingAddress.state}` : ""} ${shippingAddress.pinCode || shippingAddress.pin_code || ""}<br>
        ${shippingAddress.country ? `${shippingAddress.country}<br>` : ""}
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
            <h2 style="margin: 0 0 4px; font-size: 22px; color: #0f172a;">Order Confirmed!</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || order.orderNumber || ""}</p>
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Placed on ${formatOrderDate(order.created_at, timezone)}</p>` : ""}
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

          ${(() => {
    const sub = Number(order.subtotal || order.total || 0);
    const disc = Number(order.discount || 0);
    const ship = Number(order.shipping_cost || 0);
    const tot = Number(order.total || 0);
    const coupon = order.coupon_code || "";
    return `<div style="padding: 16px; background: #f8f9fa; border-radius: 8px; margin-top: 16px; text-align: right;">
              <div style="font-size: 14px; color: #555; margin-bottom: 4px;">Subtotal: <strong>${fmtH(sub)}</strong></div>
              ${disc > 0 ? `<div style="font-size: 14px; color: #16a34a; margin-bottom: 4px;">Coupon${coupon ? ` (${coupon})` : ""}: <strong>-${fmtH(disc)}</strong></div>` : ""}
              <div style="font-size: 14px; color: #555; margin-bottom: 8px;">Shipping: <strong>${ship > 0 ? fmtH(ship) : "Free"}</strong></div>
              <div style="font-size: 18px; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 8px;">Total: ${fmtH(tot)}</div>
            </div>`;
  })()}

          <div style="margin-top: 16px; padding: 12px 16px; background: #eff6ff; border-radius: 8px; font-size: 14px; color: #1e40af;">
            Payment Method: <strong>${order.payment_method === "cod" || order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}</strong>
          </div>

          ${addressHtml}

          ${options.trackingUrl ? `
          <div style="margin: 24px 0; text-align: center;">
            <a href="${options.trackingUrl}" style="display: inline-block; padding: 14px 32px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">Track Your Order</a>
          </div>
          ` : ""}

          ${options.helpUrl ? `
          <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #334155;">Need help with your order?</p>
            <p style="margin: 0 0 12px; font-size: 13px; color: #64748b; line-height: 1.5;">For cancellations, changes, or any other queries about this order \u2014 we're here to help.</p>
            <a href="${options.helpUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Get Help With This Order</a>
          </div>
          ` : ""}

          ${options.invoiceUrl ? `
          <div style="margin-top: 16px; padding: 14px 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 10px; font-size: 13px; color: #0369a1;">Need a GST invoice for this order?</p>
            <a href="${options.invoiceUrl}" style="display:inline-block;background:#0369a1;color:#fff;padding:9px 22px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Download Invoice</a>
          </div>
          ` : ""}

          <p style="margin-top: 24px; color: #64748b; font-size: 14px; line-height: 1.6;">Your order has been confirmed and is now being prepared. We'll update you once it's packed and on its way. For any queries, reach out to us at ${ownerEmail ? `<a href="mailto:${ownerEmail}" style="color:#0f172a;">${ownerEmail}</a>` : brandName || "the store"}.</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || "us"}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const _disc = Number(order.discount || 0);
  const _coupon = order.coupon_code || "";
  const discountLine = _disc > 0 ? `
Subtotal: ${fmt(Number(order.subtotal || order.total))}
Coupon${_coupon ? ` (${_coupon})` : ""}: -${fmt(_disc)}` : "";
  const text = `Order Confirmation

Thank you for your order!
Order Number: ${order.order_number || order.orderNumber}${discountLine}
Total: ${fmt(order.total)}
Payment: ${order.payment_method === "cod" || order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}

Your order is now being prepared.`;
  return { html, text };
}
__name(buildOrderConfirmationEmail, "buildOrderConfirmationEmail");
function buildCancellationCustomerEmail(order, brandName, reason, ownerEmail, currency = "INR", timezone = "", customerInitiated = false) {
  const contactLine = ownerEmail ? `For any questions or to request a refund, please contact us at <a href="mailto:${ownerEmail}" style="color:#c0392b;">${ownerEmail}</a>.` : "For any questions or to request a refund, please reply to this email.";
  const heading = customerInitiated ? "Cancellation Request Approved" : "Order Cancelled";
  const message = customerInitiated ? "Your cancellation request has been approved and your order has been cancelled." : "We're sorry to inform you that your order has been cancelled.";
  const reasonLabel = customerInitiated ? "Your Reason" : "Cancellation Reason";
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
            <h2 style="margin: 0 0 4px; font-size: 22px; color: #0f172a;">${heading}</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || order.orderNumber || ""}</p>
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Placed on ${formatOrderDate(order.created_at, timezone)}</p>` : ""}
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || "Customer"},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">${message}</p>
          <div style="margin: 24px 0; padding: 16px; background: #fff5f5; border-left: 4px solid #c0392b; border-radius: 4px;">
            <div style="font-size: 13px; color: #888; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">${reasonLabel}</div>
            <div style="font-size: 15px; color: #333;">${reason || "No reason provided"}</div>
          </div>
          <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555;">
            <strong>Order Total:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
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
  const textHeading = customerInitiated ? "Cancellation Request Approved" : "Order Cancelled";
  const text = `${textHeading}

Your order #${order.order_number || order.orderNumber} has been cancelled.
Reason: ${reason || "No reason provided"}
Total: ${formatCurrency(order.total, currency)}

${ownerEmail ? "Contact us at: " + ownerEmail : "Please reply to this email for any queries."}`;
  return { html, text };
}
__name(buildCancellationCustomerEmail, "buildCancellationCustomerEmail");
function buildDeliveryCustomerEmail(order, brandName, ownerEmail, currency = "INR", options = {}, timezone = "") {
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
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name}${formatSelectedOptions(item.selectedOptions, currency)}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px; font-weight: 600;">${formatCurrencyHtml(Number(item.price) * Number(item.quantity), currency)}</td>
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
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Placed on ${formatOrderDate(order.created_at, timezone)}</p>` : ""}
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
            Total Paid: ${formatCurrencyHtml(order.total, currency)}
          </div>` : ""}
          ${options.reviewUrl ? `
          <div style="margin: 24px 0; padding: 24px; background: #f0fdf4; border-radius: 10px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 20px;">\u2B50</p>
            <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #166534;">How was your experience?</p>
            <p style="margin: 0 0 16px; font-size: 14px; color: #555; line-height: 1.6;">Your feedback helps other shoppers and helps us improve.</p>
            ${options.reviewItems && options.reviewItems.length > 0 ? `
            <div style="margin: 0 0 16px; display: inline-block;">
              ${options.reviewItems.map((item) => `
              <div style="display: inline-block; margin: 0 8px 8px; text-align: center; vertical-align: top; max-width: 120px;">
                ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;" />` : `<div style="width: 64px; height: 64px; background: #e2e8f0; border-radius: 8px; display: inline-block;"></div>`}
                <p style="margin: 6px 0 0; font-size: 12px; color: #475569; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</p>
              </div>
              `).join("")}
            </div>
            ` : ""}
            <div>
              <a href="${options.reviewUrl}" style="display:inline-block;background:#166534;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Write a Review</a>
            </div>
          </div>
          ` : `
          <div style="margin: 24px 0; padding: 20px; background: #f0fdf4; border-radius: 10px; text-align: center;">
            <p style="margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #166534;">Enjoying your purchase?</p>
            <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">We'd love to hear from you! Share your experience and leave a review \u2014 your feedback helps us serve you better and helps other shoppers make great choices.</p>
          </div>
          `}
          ${options.helpUrl ? `
          <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
            <p style="margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #334155;">Need help with your order?</p>
            <p style="margin: 0 0 12px; font-size: 13px; color: #64748b; line-height: 1.5;">For returns, refunds, or any other queries about your order \u2014 we're here to help.</p>
            <a href="${options.helpUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Get Help With This Order</a>
          </div>
          ` : ""}
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

We hope you love your purchase.${options.reviewUrl ? "\n\nLeave a review: " + options.reviewUrl : " We'd love to hear your feedback \u2014 please leave a review!"}

Total Paid: ${formatCurrency(order.total, currency)}

${ownerEmail ? "For any issues, contact: " + ownerEmail : ""}`;
  return { html, text };
}
__name(buildDeliveryCustomerEmail, "buildDeliveryCustomerEmail");
function buildDeliveryOwnerEmail(order, brandName, currency = "INR", timezone = "") {
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
            <strong>Total:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
            <strong>Payment:</strong> ${order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}
            ${order.created_at ? `<br><strong>Ordered on:</strong> ${formatOrderDate(order.created_at, timezone)}` : ""}
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
Total: ${formatCurrency(order.total, currency)}`;
  return { html, text };
}
__name(buildDeliveryOwnerEmail, "buildDeliveryOwnerEmail");
function buildCancellationOwnerEmail(order, brandName, reason, currency = "INR", timezone = "") {
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
            <strong>Total:</strong> ${formatCurrencyHtml(order.total, currency)}
            ${order.created_at ? `<br><strong>Ordered on:</strong> ${formatOrderDate(order.created_at, timezone)}` : ""}
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
Total: ${formatCurrency(order.total, currency)}`;
  return { html, text };
}
__name(buildCancellationOwnerEmail, "buildCancellationOwnerEmail");
function buildNewOrderReviewEmail(order, brandName, currency = "INR", timezone = "") {
  const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
  const itemsHtml = items.map((item) => `
    <tr>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${item.name}${formatSelectedOptions(item.selectedOptions, currency)}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: center; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 10px 16px; border-bottom: 1px solid #f0f0f0; text-align: right; font-size: 14px;">${formatCurrencyHtml(Number(item.price) * Number(item.quantity), currency)}</td>
    </tr>
  `).join("");
  const shippingAddress = typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address || order.shippingAddress;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #f59e0b; color: #ffffff; padding: 24px 32px;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700;">New Order - Review Required</h1>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${brandName || "Your Store"} - Order #${order.order_number || order.orderNumber || ""}</p>
          ${order.created_at ? `<p style="margin: 4px 0 0; opacity: 0.8; font-size: 13px;">${formatOrderDate(order.created_at, timezone)}</p>` : ""}
        </div>
        <div style="padding: 24px 32px;">
          <div style="padding: 14px 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">This order is pending your review. Please confirm or cancel it from your admin panel.</p>
          </div>

          <div style="padding: 12px 16px; background: #f0fdf4; border-radius: 8px; margin-bottom: 20px;">
            <div style="font-size: 12px; color: #059669; text-transform: uppercase; font-weight: 600;">Total Amount</div>
            <div style="font-size: 22px; font-weight: 700; color: #0f172a;">${formatCurrencyHtml(order.total, currency)}</div>
            ${Number(order.discount || 0) > 0 ? `<div style="font-size: 12px; color: #16a34a; margin-top: 4px;">Coupon${order.coupon_code ? ` (${order.coupon_code})` : ""}: -${formatCurrencyHtml(order.discount, currency)} off</div>` : ""}
            <div style="font-size: 12px; color: #555; margin-top: 4px;">Shipping: ${Number(order.shipping_cost || 0) > 0 ? formatCurrencyHtml(order.shipping_cost, currency) : "Free"}</div>
          </div>

          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Customer Details</h3>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.8;">
            <strong>Name:</strong> ${order.customer_name || shippingAddress && shippingAddress.name || "N/A"}<br>
            <strong>Email:</strong> ${order.customer_email || "N/A"}<br>
            <strong>Phone:</strong> ${order.customer_phone || shippingAddress && shippingAddress.phone || "N/A"}<br>
            <strong>Payment:</strong> ${order.payment_method === "cod" || order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment"}
          </div>

          ${shippingAddress ? `
          <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 8px;">Shipping Address</h3>
          <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; line-height: 1.6;">
            ${shippingAddress.address || ""}<br>
            ${shippingAddress.city || ""}${shippingAddress.state ? `, ${shippingAddress.state}` : ""} ${shippingAddress.pinCode || shippingAddress.pin_code || ""}
            ${shippingAddress.country ? `<br>${shippingAddress.country}` : ""}
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
  const text = `New Order - Review Required

Order #${order.order_number || order.orderNumber}
Total: ${formatCurrency(order.total, currency)}
Customer: ${order.customer_name || ""}
Phone: ${order.customer_phone || ""}
Payment: ${order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}

Please review and confirm this order from your admin panel.`;
  return { html, text };
}
__name(buildNewOrderReviewEmail, "buildNewOrderReviewEmail");
function buildOrderPackedEmail(order, brandName, ownerEmail, currency = "INR", options = {}, timezone = "") {
  const contactLine = ownerEmail ? `For any queries, contact us at <a href="mailto:${ownerEmail}" style="color:#7c3aed;">${ownerEmail}</a>.` : "For any queries, please reply to this email.";
  const trackingHtml = options.trackingUrl ? `
    <div style="margin: 24px 0; text-align: center;">
      <a href="${options.trackingUrl}" style="display: inline-block; padding: 14px 32px; background: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">Track Your Order</a>
    </div>
  ` : "";
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #7c3aed; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || "Your Store"}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 52px; margin-bottom: 12px;">\u{1F4E6}</div>
            <h2 style="margin: 0 0 6px; font-size: 24px; color: #0f172a;">Your Order Has Been Packed!</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || ""}</p>
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Placed on ${formatOrderDate(order.created_at, timezone)}</p>` : ""}
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || "Customer"},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Great news! Your order has been packed and is getting ready to be shipped. We'll notify you once it's on the way.</p>
          <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555; margin: 20px 0;">
            <strong>Order Total:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
            <strong>Payment Method:</strong> ${order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}
          </div>
          ${trackingHtml}
          <p style="margin-top: 20px; color: #64748b; font-size: 14px; line-height: 1.6;">${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || "us"}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Your Order Has Been Packed!

Order #${order.order_number}
Your order has been packed and is getting ready to be shipped.
Total: ${formatCurrency(order.total, currency)}

${ownerEmail ? "Contact: " + ownerEmail : ""}`;
  return { html, text };
}
__name(buildOrderPackedEmail, "buildOrderPackedEmail");
function buildOrderShippedEmail(order, brandName, ownerEmail, currency = "INR", options = {}, timezone = "") {
  const contactLine = ownerEmail ? `For any queries, contact us at <a href="mailto:${ownerEmail}" style="color:#0284c7;">${ownerEmail}</a>.` : "For any queries, please reply to this email.";
  const trackingDetails = options.trackingNumber || options.carrier ? `
    <div style="margin: 20px 0; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;">
      <h3 style="margin: 0 0 8px; font-size: 14px; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">Shipping Details</h3>
      ${options.carrier ? `<p style="margin: 0 0 4px; font-size: 14px; color: #333;"><strong>Carrier:</strong> ${options.carrier}</p>` : ""}
      ${options.trackingNumber ? `<p style="margin: 0; font-size: 14px; color: #333;"><strong>Tracking Number:</strong> ${options.trackingNumber}</p>` : ""}
    </div>
  ` : "";
  const trackingHtml = options.trackingUrl ? `
    <div style="margin: 24px 0; text-align: center;">
      <a href="${options.trackingUrl}" style="display: inline-block; padding: 14px 32px; background: #0284c7; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">Track Your Order</a>
    </div>
  ` : "";
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0284c7; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || "Your Store"}</h1>
        </div>
        <div style="padding: 32px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <div style="font-size: 52px; margin-bottom: 12px;">\u{1F69A}</div>
            <h2 style="margin: 0 0 6px; font-size: 24px; color: #0f172a;">Your Order Is On The Way!</h2>
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order #${order.order_number || ""}</p>
            ${order.created_at ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Placed on ${formatOrderDate(order.created_at, timezone)}</p>` : ""}
          </div>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${order.customer_name || "Customer"},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Your order has been shipped and is on its way to you!</p>
          ${trackingDetails}
          <div style="padding: 16px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #555; margin: 20px 0;">
            <strong>Order Total:</strong> ${formatCurrencyHtml(order.total, currency)}<br>
            <strong>Payment Method:</strong> ${order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"}
          </div>
          ${trackingHtml}
          <p style="margin-top: 20px; color: #64748b; font-size: 14px; line-height: 1.6;">${contactLine}</p>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">Thank you for shopping with ${brandName || "us"}!</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Your Order Is On The Way!

Order #${order.order_number}
Your order has been shipped.${options.carrier ? "\nCarrier: " + options.carrier : ""}${options.trackingNumber ? "\nTracking: " + options.trackingNumber : ""}
Total: ${formatCurrency(order.total, currency)}

${ownerEmail ? "Contact: " + ownerEmail : ""}`;
  return { html, text };
}
__name(buildOrderShippedEmail, "buildOrderShippedEmail");
function buildCancellationRequestNotifyEmail(order, brandName, reason, reasonDetail) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#ef4444;">New Cancellation Request</h2>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:14px;"><strong>Order:</strong> #${order.order_number}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Customer:</strong> ${order.customer_name || "N/A"}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Email:</strong> ${order.customer_email || "N/A"}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Reason:</strong> ${reason}</p>
          ${reasonDetail ? `<p style="margin:0;font-size:14px;"><strong>Details:</strong> ${reasonDetail}</p>` : ""}
        </div>
        <p style="color:#64748b;font-size:14px;">Please review this cancellation request in your admin panel. You can approve or reject it from the Orders > Cancellations tab.</p>
      </div>
    </div>
  </body></html>`;
  const text = `New Cancellation Request
Order: #${order.order_number}
Customer: ${order.customer_name}
Reason: ${reason}${reasonDetail ? "\nDetails: " + reasonDetail : ""}`;
  return { html, text };
}
__name(buildCancellationRequestNotifyEmail, "buildCancellationRequestNotifyEmail");
function buildCancellationStatusEmail(request, brandName, status, adminNote) {
  const statusLabels = { approved: "Approved", rejected: "Rejected" };
  const statusColors = { approved: "#22c55e", rejected: "#ef4444" };
  const label = statusLabels[status] || status;
  const color = statusColors[status] || "#64748b";
  const approvedMsg = status === "approved" ? '<p style="color:#333;font-size:14px;line-height:1.6;margin-top:16px;">Your order has been cancelled. If you paid online, your refund will be processed within 5-7 business days.</p>' : '<p style="color:#333;font-size:14px;line-height:1.6;margin-top:16px;">Your cancellation request has been reviewed and was not approved. If you have questions, please contact us.</p>';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Cancellation Request Update</h2>
        <p style="color:#64748b;font-size:14px;margin-bottom:20px;">Your cancellation request for order <strong>#${request.order_number}</strong> has been updated.</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;background:${color};color:#fff;padding:8px 24px;border-radius:20px;font-weight:600;font-size:16px;">${label}</span>
        </div>
        ${approvedMsg}
        ${adminNote ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:16px;"><p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">Note from store:</p><p style="margin:0;font-size:14px;color:#334155;">${adminNote}</p></div>` : ""}
      </div>
    </div>
  </body></html>`;
  const text = `Cancellation Request Update
Order: #${request.order_number}
Status: ${label}${adminNote ? "\nNote: " + adminNote : ""}`;
  return { html, text };
}
__name(buildCancellationStatusEmail, "buildCancellationStatusEmail");

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
  if (sent !== true)
    return errorResponse(typeof sent === "string" ? sent : "Failed to send test email", 500);
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
    if (sent !== true) {
      return errorResponse(typeof sent === "string" ? sent : "Failed to send email", 500);
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
    if (sent !== true) {
      return errorResponse(typeof sent === "string" ? sent : "Failed to send email", 500);
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
    const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
    if (!validIssuers.includes(payload.iss)) {
      console.error("Invalid issuer:", payload.iss);
      return errorResponse("Invalid token issuer", 401);
    }
    if (!payload.email || payload.email_verified !== "true") {
      console.error("Google email not verified or missing");
      return errorResponse("Google account email is not verified", 401);
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
init_config();
init_cache();
init_auth();
init_site_admin_worker();

// utils/cloudflare.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var CF_API_BASE2 = "https://api.cloudflare.com/client/v4";
function cfHeaders2(apiToken) {
  return {
    "Authorization": `Bearer ${apiToken}`,
    "Content-Type": "application/json"
  };
}
__name(cfHeaders2, "cfHeaders");
async function registerCustomHostname(env, hostname) {
  const token = env.CF_API_TOKEN;
  const zoneId = env.CF_ZONE_ID;
  if (!token || !zoneId) {
    console.warn("CF_API_TOKEN or CF_ZONE_ID not configured \u2014 skipping Cloudflare hostname registration");
    return { success: false, reason: "not_configured" };
  }
  const res = await fetch(`${CF_API_BASE2}/zones/${zoneId}/custom_hostnames`, {
    method: "POST",
    headers: cfHeaders2(token),
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
    `${CF_API_BASE2}/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
    { headers: cfHeaders2(token) }
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
    `${CF_API_BASE2}/zones/${zoneId}/custom_hostnames/${cfHostnameId}`,
    { method: "DELETE", headers: cfHeaders2(token) }
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
init_site_db();
init_usage_tracker();
async function handleSites(request, env, path, ctx2) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const siteId = pathParts[2];
  const subResource = pathParts[3];
  if (siteId && subResource === "staff") {
    const staffId = pathParts[4] || null;
    return handleStaffCRUD(request, env, siteId, subResource, staffId);
  }
  if (siteId && subResource === "convert-currency" && method === "POST") {
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
    return handleConvertCurrency(request, env, siteId);
  }
  if (siteId && (subResource === "custom-domain" || subResource === "verify-domain" || subResource === "rename-subdomain")) {
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
    if (subResource === "rename-subdomain") {
      if (method === "PUT")
        return handleRenameSubdomain(request, env, siteId);
      return errorResponse("Method not allowed", 405);
    }
  }
  if (method === "PUT" && siteId) {
    const user2 = await validateAuth(request, env);
    if (user2) {
      return updateSite(request, env, user2, siteId, ctx2);
    }
    const siteAdmin = await validateSiteAdmin(request, env, siteId);
    if (siteAdmin) {
      return updateSiteAsAdmin(request, env, siteId, ctx2);
    }
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  const user = await validateAuth(request, env);
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  if (method === "GET" && siteId === "check-subdomain") {
    const url = new URL(request.url);
    const sub = url.searchParams.get("subdomain");
    return checkSubdomainAvailability(env, sub);
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
async function checkSubdomainAvailability(env, subdomain) {
  if (!subdomain || subdomain.length < 3) {
    return jsonResponse({ available: false, reason: "Subdomain must be at least 3 characters" });
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain) && subdomain.length > 1) {
    return jsonResponse({ available: false, reason: "Only lowercase letters, numbers, and hyphens allowed" });
  }
  try {
    const existing = await env.DB.prepare(
      "SELECT id FROM sites WHERE LOWER(subdomain) = ?"
    ).bind(subdomain.toLowerCase()).first();
    if (existing) {
      return jsonResponse({ available: false, reason: "This subdomain is already taken" });
    }
    return jsonResponse({ available: true });
  } catch (error) {
    console.error("Check subdomain error:", error);
    return errorResponse("Failed to check subdomain", 500);
  }
}
__name(checkSubdomainAvailability, "checkSubdomainAvailability");
async function getUserSites(env, user) {
  try {
    const sites = await env.DB.prepare(
      `SELECT id, subdomain, brand_name, template_id,
              is_active, subscription_plan, subscription_expires_at, created_at,
              custom_domain, domain_status
       FROM sites 
       WHERE user_id = ? 
       ORDER BY created_at DESC`
    ).bind(user.id).all();
    const enrichedSites = [];
    for (const site of sites.results) {
      const config = await getSiteConfig(env, site.id);
      let subscription = { plan: site.subscription_plan || null, status: "none", billingCycle: null, periodStart: null, periodEnd: null };
      try {
        if (site.subscription_plan === "enterprise") {
          subscription = {
            plan: "enterprise",
            status: "active",
            billingCycle: null,
            periodStart: null,
            periodEnd: site.subscription_expires_at || "2099-12-31T23:59:59"
          };
        } else {
          const sub = await env.DB.prepare(
            `SELECT plan, status, billing_cycle, current_period_start, current_period_end, razorpay_subscription_id FROM subscriptions WHERE site_id = ? AND status != 'enterprise_override' ORDER BY created_at DESC LIMIT 1`
          ).bind(site.id).first();
          if (sub) {
            let subStatus = sub.status;
            if (subStatus === "active" && sub.current_period_end && new Date(sub.current_period_end) < /* @__PURE__ */ new Date()) {
              subStatus = "expired";
            }
            subscription = {
              plan: sub.plan,
              status: subStatus,
              billingCycle: sub.billing_cycle,
              periodStart: sub.current_period_start,
              periodEnd: sub.current_period_end,
              hasRazorpay: !!sub.razorpay_subscription_id
            };
          } else if (site.subscription_plan && site.subscription_expires_at) {
            const isExpired2 = new Date(site.subscription_expires_at) < /* @__PURE__ */ new Date();
            subscription = {
              plan: site.subscription_plan,
              status: isExpired2 ? "expired" : "active",
              billingCycle: null,
              periodStart: null,
              periodEnd: site.subscription_expires_at
            };
          }
        }
      } catch (e) {
      }
      enrichedSites.push({
        ...site,
        brand_name: config.brand_name || site.brand_name,
        category: config.category || null,
        logo_url: config.logo_url || null,
        primary_color: config.primary_color || "#000000",
        subscription
      });
    }
    return successResponse(enrichedSites);
  } catch (error) {
    console.error("Get sites error:", error);
    return errorResponse("Failed to fetch sites", 500);
  }
}
__name(getUserSites, "getUserSites");
async function getSite(env, user, siteId) {
  try {
    const siteRow = await env.DB.prepare(
      `SELECT * FROM sites WHERE id = ? AND user_id = ?`
    ).bind(siteId, user.id).first();
    if (!siteRow) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    const site = await getSiteWithConfig(env, siteRow);
    const siteDB = await resolveSiteDBById(env, siteId);
    const categories = await siteDB.prepare(
      `SELECT * FROM categories WHERE site_id = ? ORDER BY display_order`
    ).bind(siteId).all();
    return successResponse({ ...site, categories: categories.results });
  } catch (error) {
    console.error("Get site error:", error);
    return errorResponse("Failed to fetch site", 500);
  }
}
__name(getSite, "getSite");
async function createSite(request, env, user) {
  let siteId = null;
  let finalSubdomain = null;
  try {
    const body = await request.json();
    const { brandName, categories, templateId, phone, email, address, primaryColor, secondaryColor } = body;
    let logoUrl = body.logoUrl || null;
    const logoBase64 = body.logo || null;
    const category = body.category || "general";
    const subdomain = (body.subdomain || generateSubdomain(brandName)).toLowerCase().trim();
    if (!brandName) {
      return errorResponse("Brand name is required");
    }
    if (subdomain.length < 3) {
      return errorResponse("Subdomain must be at least 3 characters", 400, "INVALID_SUBDOMAIN");
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain)) {
      return errorResponse("Subdomain can only contain lowercase letters, numbers, and hyphens (not at start/end)", 400, "INVALID_SUBDOMAIN");
    }
    const existingSubdomain = await env.DB.prepare(
      "SELECT id FROM sites WHERE LOWER(subdomain) = ?"
    ).bind(subdomain).first();
    if (existingSubdomain) {
      return errorResponse("This subdomain is already taken. Please choose a different brand name.", 400, "SUBDOMAIN_TAKEN");
    }
    const activeShard = await env.DB.prepare(
      "SELECT id FROM shards WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1"
    ).first();
    if (!activeShard) {
      return errorResponse("No active shard available. Please contact support.", 500);
    }
    finalSubdomain = subdomain;
    siteId = generateId();
    await env.DB.prepare(
      `INSERT INTO sites (id, user_id, subdomain, brand_name, category, template_id, shard_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    ).bind(
      siteId,
      user.id,
      finalSubdomain,
      sanitizeInput(brandName),
      category,
      templateId || "storefront",
      activeShard.id
    ).run();
    const siteDB = await resolveSiteDBById(env, siteId);
    if (logoBase64 && !logoUrl && logoBase64.startsWith("data:")) {
      try {
        const matches = logoBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
          const mimeToExt = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg" };
          if (allowedTypes.includes(mimeType)) {
            const binaryString = atob(base64Data);
            const buffer = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              buffer[i] = binaryString.charCodeAt(i);
            }
            const ext = mimeToExt[mimeType] || "png";
            const key = `sites/${siteId}/images/${generateId()}.${ext}`;
            await env.STORAGE.put(key, buffer, {
              httpMetadata: { contentType: mimeType, cacheControl: "public, max-age=31536000" }
            });
            logoUrl = `/api/upload/image?key=${encodeURIComponent(key)}`;
          }
        }
      } catch (e) {
        console.error("Failed to upload logo during site creation:", e);
      }
    }
    const configData = {
      site_id: siteId,
      brand_name: sanitizeInput(brandName),
      category,
      logo_url: logoUrl || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      primary_color: primaryColor || "#000000",
      secondary_color: secondaryColor || "#ffffff"
    };
    const configBytes = estimateRowBytes(configData);
    await siteDB.prepare(
      `INSERT INTO site_config (site_id, brand_name, category, logo_url, phone, email, address, primary_color, secondary_color, settings, row_size_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, datetime('now'), datetime('now'))`
    ).bind(
      siteId,
      sanitizeInput(brandName),
      category,
      logoUrl || null,
      phone || null,
      email || null,
      address || null,
      primaryColor || "#000000",
      secondaryColor || "#ffffff",
      configBytes
    ).run();
    await trackD1Write(env, siteId, configBytes);
    try {
      await env.DB.prepare(`
        INSERT INTO site_usage (site_id, d1_bytes_used, r2_bytes_used, baseline_bytes, last_updated)
        VALUES (?, 0, 0, 0, datetime('now'))
        ON CONFLICT(site_id) DO NOTHING
      `).bind(siteId).run();
    } catch (usageErr) {
      console.error("Usage init failed (non-fatal):", usageErr.message || usageErr);
    }
    try {
      if (categories && categories.length > 0) {
        await createUserCategories(env, siteDB, siteId, categories);
      } else if (category) {
        await createDefaultCategories(env, siteDB, siteId, category);
      }
    } catch (catError) {
      console.error("Category creation failed (non-fatal):", catError.message || catError);
    }
    try {
      const activeSub = await env.DB.prepare(
        `SELECT plan, status, current_period_end FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
      ).bind(user.id).first();
      if (activeSub && activeSub.plan === "trial" && activeSub.current_period_end && new Date(activeSub.current_period_end) > /* @__PURE__ */ new Date()) {
        await env.DB.prepare(
          `UPDATE sites SET subscription_plan = 'trial', subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(activeSub.current_period_end, siteId).run();
      }
    } catch (subErr) {
      console.error("Check subscription for new site failed (non-fatal):", subErr);
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
async function createDefaultCategories(env, db, siteId, businessCategory) {
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
    beauty: [
      { name: "New Arrivals", slug: "new-arrivals", subtitle: "Discover our latest beauty essentials", showOnHome: 1, children: [] },
      { name: "Skincare", slug: "skincare", subtitle: "Nourish and glow with our skincare range", showOnHome: 1, children: [] },
      { name: "Makeup", slug: "makeup", subtitle: "Premium makeup for every look", showOnHome: 1, children: [] }
    ],
    general: [
      { name: "New Arrivals", slug: "new-arrivals", subtitle: "Check out what just landed", showOnHome: 1, children: [] },
      { name: "Our Collection", slug: "our-collection", subtitle: "Browse our complete product range", showOnHome: 1, children: [] },
      { name: "Featured Products", slug: "featured-products", subtitle: "Handpicked favourites just for you", showOnHome: 1, children: [] }
    ]
  };
  const categories = categoryTemplates[businessCategory] || categoryTemplates.general;
  let order = 0;
  for (const cat of categories) {
    const parentId = generateId();
    const parentData = { id: parentId, site_id: siteId, name: cat.name, slug: cat.slug, subtitle: cat.subtitle || null };
    const parentBytes = estimateRowBytes(parentData);
    await db.prepare(
      `INSERT INTO categories (id, site_id, name, slug, subtitle, show_on_home, display_order, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(parentId, siteId, cat.name, cat.slug, cat.subtitle || null, cat.showOnHome !== void 0 ? cat.showOnHome : 1, order++, parentBytes).run();
    await trackD1Write(env, siteId, parentBytes);
    for (const childName of cat.children || []) {
      const childId = generateId();
      const childSlug = `${cat.slug}-${childName.toLowerCase().replace(/\s+/g, "-")}`;
      const childData = { id: childId, site_id: siteId, name: childName, slug: childSlug, parent_id: parentId };
      const childBytes = estimateRowBytes(childData);
      await db.prepare(
        `INSERT INTO categories (id, site_id, name, slug, parent_id, show_on_home, display_order, row_size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(childId, siteId, childName, childSlug, parentId, 0, order++, childBytes).run();
      await trackD1Write(env, siteId, childBytes);
    }
  }
}
__name(createDefaultCategories, "createDefaultCategories");
async function createUserCategories(env, db, siteId, categories) {
  let order = 0;
  for (let cat of categories) {
    let categoryName = typeof cat === "string" ? cat : cat.name || cat.label;
    if (!categoryName)
      continue;
    const slug = categoryName.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
    const subtitle = typeof cat === "object" && cat.subtitle ? cat.subtitle : null;
    const showOnHome = typeof cat === "object" && cat.showOnHome !== void 0 ? cat.showOnHome ? 1 : 0 : 1;
    const catId = generateId();
    const catData = { id: catId, site_id: siteId, name: categoryName, slug, subtitle };
    const catBytes = estimateRowBytes(catData);
    await db.prepare(
      `INSERT INTO categories (id, site_id, name, slug, subtitle, show_on_home, display_order, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(catId, siteId, categoryName, slug, subtitle, showOnHome, order++, catBytes).run();
    await trackD1Write(env, siteId, catBytes);
  }
}
__name(createUserCategories, "createUserCategories");
var CONFIG_FIELDS = ["brand_name", "logo_url", "favicon_url", "primary_color", "secondary_color", "phone", "email", "address", "social_links", "settings", "currency"];
async function updateSite(request, env, user, siteId, ctx2) {
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
    const siteDB = await resolveSiteDBById(env, siteId);
    const existingConfig = await siteDB.prepare(
      "SELECT * FROM site_config WHERE site_id = ?"
    ).bind(siteId).first();
    const setClause = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (CONFIG_FIELDS.includes(dbKey)) {
        if (dbKey === "settings" && typeof value === "object") {
          let existingSettings = {};
          try {
            if (existingConfig && existingConfig.settings) {
              existingSettings = JSON.parse(existingConfig.settings);
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
    const oldBytes = existingConfig?.row_size_bytes || 0;
    await siteDB.prepare(
      `UPDATE site_config SET ${setClause.join(", ")} WHERE site_id = ?`
    ).bind(...values).run();
    const updatedConfig = await siteDB.prepare(
      "SELECT * FROM site_config WHERE site_id = ?"
    ).bind(siteId).first();
    if (updatedConfig) {
      const newBytes = estimateRowBytes(updatedConfig);
      await siteDB.prepare("UPDATE site_config SET row_size_bytes = ? WHERE site_id = ?").bind(newBytes, siteId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }
    const brandNameUpdate = Object.entries(updates).find(([key]) => {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      return dbKey === "brand_name";
    });
    if (brandNameUpdate) {
      await env.DB.prepare(
        'UPDATE sites SET brand_name = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(brandNameUpdate[1], siteId).run();
    }
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["site"]));
    return successResponse(null, "Site updated successfully");
  } catch (error) {
    console.error("Update site error:", error);
    return errorResponse("Failed to update site", 500);
  }
}
__name(updateSite, "updateSite");
async function updateSiteAsAdmin(request, env, siteId, ctx2) {
  try {
    const updates = await request.json();
    const siteDB = await resolveSiteDBById(env, siteId);
    const existingConfig = await siteDB.prepare(
      "SELECT * FROM site_config WHERE site_id = ?"
    ).bind(siteId).first();
    const setClause = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (CONFIG_FIELDS.includes(dbKey)) {
        if (dbKey === "settings" && typeof value === "object") {
          let existingSettings = {};
          try {
            if (existingConfig && existingConfig.settings) {
              existingSettings = JSON.parse(existingConfig.settings);
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
    const oldBytes = existingConfig?.row_size_bytes || 0;
    await siteDB.prepare(
      `UPDATE site_config SET ${setClause.join(", ")} WHERE site_id = ?`
    ).bind(...values).run();
    const updatedConfig = await siteDB.prepare(
      "SELECT * FROM site_config WHERE site_id = ?"
    ).bind(siteId).first();
    if (updatedConfig) {
      const newBytes = estimateRowBytes(updatedConfig);
      await siteDB.prepare("UPDATE site_config SET row_size_bytes = ? WHERE site_id = ?").bind(newBytes, siteId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }
    const brandNameUpdate = Object.entries(updates).find(([key]) => {
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      return dbKey === "brand_name";
    });
    if (brandNameUpdate) {
      await env.DB.prepare(
        'UPDATE sites SET brand_name = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(brandNameUpdate[1], siteId).run();
    }
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["site"]));
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
      "SELECT id, subdomain, shard_id, d1_database_id FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (!site) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    if (site.shard_id) {
      try {
        const shardDB = await resolveSiteDBById(env, siteId);
        const fkCleanups = [
          { table: "product_variants", fk: "product_id", resolveFrom: "products" },
          { table: "addresses", fk: "user_id", resolveFrom: "site_customers" }
        ];
        for (const { table, fk, resolveFrom } of fkCleanups) {
          try {
            const parentResult = await shardDB.prepare(`SELECT id FROM ${resolveFrom} WHERE site_id = ?`).bind(siteId).all();
            const parentIds = (parentResult.results || []).map((r) => r.id);
            if (parentIds.length > 0) {
              const ID_BATCH = 50;
              for (let i = 0; i < parentIds.length; i += ID_BATCH) {
                const batch = parentIds.slice(i, i + ID_BATCH);
                const ph = batch.map(() => "?").join(", ");
                try {
                  await shardDB.prepare(`DELETE FROM ${table} WHERE ${fk} IN (${ph})`).bind(...batch).run();
                } catch (e) {
                }
              }
            }
          } catch (e) {
          }
        }
        const siteTables = [
          "site_config",
          "activity_log",
          "page_views",
          "page_seo",
          "reviews",
          "notifications",
          "coupons",
          "customer_email_verifications",
          "customer_password_resets",
          "customer_addresses",
          "site_customer_sessions",
          "site_customers",
          "wishlists",
          "carts",
          "guest_orders",
          "orders",
          "products",
          "categories",
          "site_media",
          "site_usage",
          "site_staff",
          "cancellation_requests",
          "return_requests"
        ];
        for (const table of siteTables) {
          try {
            await shardDB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId).run();
          } catch (e) {
          }
        }
        console.log(`Cleaned site data from shard for site ${siteId}`);
      } catch (shardErr) {
        console.error("Shard cleanup failed (non-fatal):", shardErr.message || shardErr);
      }
    }
    try {
      await env.DB.prepare("DELETE FROM site_usage WHERE site_id = ?").bind(siteId).run();
      await env.DB.prepare("DELETE FROM site_media WHERE site_id = ?").bind(siteId).run();
    } catch (e) {
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
        for (const record of txtData.Answer) {
          const value = (record.data || "").replace(/"/g, "").trim();
          if (value === expectedToken) {
            txtVerified = true;
            break;
          }
        }
      }
      if (!txtVerified) {
        errors.push(`TXT record not found. Add a TXT record for _fluxe-verify.${baseDomain} with value: ${expectedToken}`);
      }
    } catch (dnsErr) {
      errors.push("Could not verify TXT record: " + dnsErr.message);
    }
    let cnameVerified = false;
    try {
      const cnameResponse = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=CNAME`,
        { headers: { "Accept": "application/dns-json" } }
      );
      const cnameData = await cnameResponse.json();
      if (cnameData.Answer && cnameData.Answer.length > 0) {
        for (const record of cnameData.Answer) {
          const target = (record.data || "").replace(/\.$/, "").toLowerCase();
          if (target.endsWith(`.${env.DOMAIN || PLATFORM_DOMAIN}`) || target.endsWith(".pages.dev")) {
            cnameVerified = true;
            break;
          }
        }
      }
      if (!cnameVerified) {
        const aRecords = await resolveDnsA(domain);
        if (aRecords.length > 0) {
          cnameVerified = true;
        }
      }
      if (!cnameVerified) {
        errors.push(`CNAME record not found. Add a CNAME record for ${domain} pointing to your .${env.DOMAIN || PLATFORM_DOMAIN} subdomain.`);
      }
    } catch (dnsErr) {
      errors.push("Could not verify CNAME record: " + dnsErr.message);
    }
    if (txtVerified && cnameVerified) {
      try {
        const cfResult = await registerCustomHostname(env, domain);
        if (cfResult && cfResult.id) {
          await env.DB.prepare(
            `UPDATE sites SET domain_status = 'verified', cf_hostname_id = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(cfResult.id, siteId).run();
        } else {
          await env.DB.prepare(
            `UPDATE sites SET domain_status = 'verified', updated_at = datetime('now') WHERE id = ?`
          ).bind(siteId).run();
        }
      } catch (cfErr) {
        console.error("CF hostname registration error:", cfErr);
        const existingHostname = await findCustomHostname(env, domain);
        if (existingHostname) {
          await env.DB.prepare(
            `UPDATE sites SET domain_status = 'verified', cf_hostname_id = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(existingHostname.id, siteId).run();
        } else {
          await env.DB.prepare(
            `UPDATE sites SET domain_status = 'verified', updated_at = datetime('now') WHERE id = ?`
          ).bind(siteId).run();
        }
      }
      return successResponse({
        custom_domain: domain,
        domain_status: "verified",
        verified: true
      }, "Domain verified and activated successfully!");
    }
    return successResponse({
      custom_domain: domain,
      domain_status: "pending",
      verified: false,
      errors,
      checks: { txt: txtVerified, cname: cnameVerified }
    }, "Domain verification incomplete. Please check the errors below.");
  } catch (error) {
    console.error("Verify domain error:", error);
    return errorResponse("Failed to verify domain: " + error.message, 500);
  }
}
__name(handleVerifyDomain, "handleVerifyDomain");
async function handleRemoveCustomDomain(env, siteId) {
  try {
    const site = await env.DB.prepare(
      "SELECT id, custom_domain, cf_hostname_id FROM sites WHERE id = ?"
    ).bind(siteId).first();
    if (!site) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    if (!site.custom_domain) {
      return errorResponse("No custom domain configured for this site", 400);
    }
    if (site.cf_hostname_id) {
      try {
        await deleteCustomHostname(env, site.cf_hostname_id);
      } catch (cfErr) {
        console.error("Failed to delete CF hostname (non-fatal):", cfErr);
      }
    }
    await env.DB.prepare(
      `UPDATE sites SET custom_domain = NULL, domain_status = NULL, domain_verification_token = NULL, cf_hostname_id = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(siteId).run();
    return successResponse(null, "Custom domain removed successfully");
  } catch (error) {
    console.error("Remove custom domain error:", error);
    return errorResponse("Failed to remove custom domain", 500);
  }
}
__name(handleRemoveCustomDomain, "handleRemoveCustomDomain");
async function handleRenameSubdomain(request, env, siteId) {
  try {
    const { subdomain } = await request.json();
    if (!subdomain) {
      return errorResponse("Subdomain is required", 400);
    }
    const newSubdomain = subdomain.toLowerCase().trim();
    if (newSubdomain.length < 3) {
      return errorResponse("Subdomain must be at least 3 characters", 400);
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(newSubdomain) && newSubdomain.length > 1) {
      return errorResponse("Only lowercase letters, numbers, and hyphens allowed. Must start and end with a letter or number.", 400);
    }
    const site = await env.DB.prepare(
      "SELECT id, subdomain FROM sites WHERE id = ?"
    ).bind(siteId).first();
    if (!site) {
      return errorResponse("Site not found", 404, "NOT_FOUND");
    }
    if (site.subdomain === newSubdomain) {
      return errorResponse("New subdomain is the same as current one", 400);
    }
    const existing = await env.DB.prepare(
      "SELECT id FROM sites WHERE LOWER(subdomain) = ? AND id != ?"
    ).bind(newSubdomain, siteId).first();
    if (existing) {
      return errorResponse("This subdomain is already taken", 400, "SUBDOMAIN_TAKEN");
    }
    await env.DB.prepare(
      `UPDATE sites SET subdomain = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newSubdomain, siteId).run();
    return successResponse({ subdomain: newSubdomain }, "Subdomain renamed successfully");
  } catch (error) {
    console.error("Rename subdomain error:", error);
    return errorResponse("Failed to rename subdomain", 500);
  }
}
__name(handleRenameSubdomain, "handleRenameSubdomain");
async function handleConvertCurrency(request, env, siteId) {
  try {
    const { fromCurrency, toCurrency, exchangeRate } = await request.json();
    if (!fromCurrency || !toCurrency || !exchangeRate) {
      return errorResponse("fromCurrency, toCurrency, and exchangeRate are required");
    }
    if (fromCurrency === toCurrency) {
      return errorResponse("Source and target currencies are the same");
    }
    if (typeof exchangeRate !== "number" || exchangeRate <= 0) {
      return errorResponse("exchangeRate must be a positive number");
    }
    const siteDB = await resolveSiteDBById(env, siteId);
    const existingConfig = await siteDB.prepare(
      "SELECT settings FROM site_config WHERE site_id = ?"
    ).bind(siteId).first();
    let currentSettings = {};
    try {
      if (existingConfig && existingConfig.settings) {
        currentSettings = JSON.parse(existingConfig.settings);
      }
    } catch (e) {
    }
    const currentCurrency = currentSettings.defaultCurrency || "INR";
    if (currentCurrency !== fromCurrency) {
      return errorResponse(`Currency mismatch: store is currently set to ${currentCurrency}, but conversion requested from ${fromCurrency}. Please refresh and try again.`);
    }
    const converted = { products: 0, coupons: 0 };
    const products = await siteDB.prepare(
      "SELECT id, price, compare_price, cost_price, row_size_bytes FROM products WHERE site_id = ?"
    ).bind(siteId).all();
    if (products.results && products.results.length > 0) {
      for (const product of products.results) {
        const newPrice = product.price != null ? Math.round(product.price * exchangeRate * 100) / 100 : null;
        const newComparePrice = product.compare_price != null ? Math.round(product.compare_price * exchangeRate * 100) / 100 : null;
        const newCostPrice = product.cost_price != null ? Math.round(product.cost_price * exchangeRate * 100) / 100 : null;
        const oldBytes = product.row_size_bytes || 0;
        await siteDB.prepare(
          `UPDATE products SET price = ?, compare_price = ?, cost_price = ?, updated_at = datetime('now') WHERE id = ? AND site_id = ?`
        ).bind(newPrice, newComparePrice, newCostPrice, product.id, siteId).run();
        const updatedRow = await siteDB.prepare("SELECT * FROM products WHERE id = ? AND site_id = ?").bind(product.id, siteId).first();
        if (updatedRow) {
          const newBytes = estimateRowBytes(updatedRow);
          await siteDB.prepare("UPDATE products SET row_size_bytes = ? WHERE id = ? AND site_id = ?").bind(newBytes, product.id, siteId).run();
          await trackD1Update(env, siteId, oldBytes, newBytes);
        }
        converted.products++;
      }
    }
    const coupons = await siteDB.prepare(
      "SELECT id, type, value, min_order_value, max_discount, row_size_bytes FROM coupons WHERE site_id = ?"
    ).bind(siteId).all();
    if (coupons.results && coupons.results.length > 0) {
      for (const coupon of coupons.results) {
        const newValue = coupon.type === "fixed" && coupon.value != null ? Math.round(coupon.value * exchangeRate * 100) / 100 : coupon.value;
        const newMinOrder = coupon.min_order_value != null ? Math.round(coupon.min_order_value * exchangeRate * 100) / 100 : null;
        const newMaxDiscount = coupon.max_discount != null ? Math.round(coupon.max_discount * exchangeRate * 100) / 100 : null;
        const oldBytes = coupon.row_size_bytes || 0;
        await siteDB.prepare(
          `UPDATE coupons SET value = ?, min_order_value = ?, max_discount = ? WHERE id = ? AND site_id = ?`
        ).bind(newValue, newMinOrder, newMaxDiscount, coupon.id, siteId).run();
        const updatedRow = await siteDB.prepare("SELECT * FROM coupons WHERE id = ? AND site_id = ?").bind(coupon.id, siteId).first();
        if (updatedRow) {
          const newBytes = estimateRowBytes(updatedRow);
          await siteDB.prepare("UPDATE coupons SET row_size_bytes = ? WHERE id = ? AND site_id = ?").bind(newBytes, coupon.id, siteId).run();
          await trackD1Update(env, siteId, oldBytes, newBytes);
        }
        converted.coupons++;
      }
    }
    currentSettings.defaultCurrency = toCurrency;
    const oldConfigBytes = existingConfig?.row_size_bytes || 0;
    await siteDB.prepare(
      `UPDATE site_config SET settings = ?, updated_at = datetime('now') WHERE site_id = ?`
    ).bind(JSON.stringify(currentSettings), siteId).run();
    const updatedConfig = await siteDB.prepare("SELECT * FROM site_config WHERE site_id = ?").bind(siteId).first();
    if (updatedConfig) {
      const newConfigBytes = estimateRowBytes(updatedConfig);
      await siteDB.prepare("UPDATE site_config SET row_size_bytes = ? WHERE site_id = ?").bind(newConfigBytes, siteId).run();
      await trackD1Update(env, siteId, oldConfigBytes, newConfigBytes);
    }
    return successResponse({ converted, exchangeRate, fromCurrency, toCurrency }, "Currency conversion completed successfully");
  } catch (error) {
    console.error("Currency conversion error:", error);
    return errorResponse("Failed to convert currency: " + error.message, 500);
  }
}
__name(handleConvertCurrency, "handleConvertCurrency");

// workers/storefront/products-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_cache();
init_auth();
init_site_admin_worker();
init_usage_tracker();
init_site_db();

// workers/storefront/notifications-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_site_db();
init_helpers();
init_site_admin_worker();

// utils/web-push.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
function derToRaw(derSig) {
  if (derSig[0] !== 48)
    return derSig;
  let offset = 2;
  if (derSig[1] & 128)
    offset += derSig[1] & 127;
  function readInt(pos) {
    if (derSig[pos] !== 2)
      return { val: new Uint8Array(32), next: pos };
    const len = derSig[pos + 1];
    let start = pos + 2;
    let intBytes = derSig.slice(start, start + len);
    while (intBytes.length < 32)
      intBytes = concat(new Uint8Array([0]), intBytes);
    if (intBytes.length > 32)
      intBytes = intBytes.slice(intBytes.length - 32);
    return { val: intBytes, next: start + len };
  }
  __name(readInt, "readInt");
  const r = readInt(offset);
  const s = readInt(r.next);
  return concat(r.val, s.val);
}
__name(derToRaw, "derToRaw");
function base64urlDecode(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - b64.length % 4);
  return Uint8Array.from(atob(b64 + pad), (c) => c.charCodeAt(0));
}
__name(base64urlDecode, "base64urlDecode");
function base64urlEncode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = "";
  for (const b of bytes)
    str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
__name(base64urlEncode, "base64urlEncode");
function concat(...arrays) {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}
__name(concat, "concat");
async function hmacSha256(keyBytes, data) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return new Uint8Array(sig);
}
__name(hmacSha256, "hmacSha256");
async function hkdfExtract(salt, ikm) {
  return hmacSha256(salt, ikm);
}
__name(hkdfExtract, "hkdfExtract");
async function hkdfExpand(prk, info, length) {
  const infoBytes = typeof info === "string" ? new TextEncoder().encode(info) : info;
  const t = new Uint8Array(0);
  let okm = new Uint8Array(0);
  let prev = t;
  let counter = 1;
  while (okm.length < length) {
    const input = concat(prev, infoBytes, new Uint8Array([counter++]));
    prev = await hmacSha256(prk, input);
    okm = concat(okm, prev);
  }
  return okm.slice(0, length);
}
__name(hkdfExpand, "hkdfExpand");
async function encryptPayload(plaintext, p256dhBase64, authBase64) {
  const receiverPublicKeyRaw = base64urlDecode(p256dhBase64);
  const authSecret = base64urlDecode(authBase64);
  const receiverPublicKey = await crypto.subtle.importKey(
    "raw",
    receiverPublicKeyRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const senderKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const senderPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", senderKeyPair.publicKey));
  const ecdhSharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverPublicKey },
    senderKeyPair.privateKey,
    256
  );
  const ecdhShared = new Uint8Array(ecdhSharedBits);
  const enc = new TextEncoder();
  const keyInfo = concat(
    enc.encode("WebPush: info\0"),
    receiverPublicKeyRaw,
    senderPublicKeyRaw
  );
  const prkKey = await hkdfExtract(authSecret, ecdhShared);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdfExtract(salt, ikm);
  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const cek = await hkdfExpand(prk, cekInfo, 16);
  const nonce = await hkdfExpand(prk, nonceInfo, 12);
  const plaintextBytes = typeof plaintext === "string" ? enc.encode(plaintext) : plaintext;
  const paddedPlaintext = concat(plaintextBytes, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    aesKey,
    paddedPlaintext
  );
  const recordSize = new DataView(new ArrayBuffer(4));
  recordSize.setUint32(0, 4096, false);
  const header = concat(
    salt,
    new Uint8Array(recordSize.buffer),
    new Uint8Array([senderPublicKeyRaw.length]),
    senderPublicKeyRaw
  );
  return concat(header, new Uint8Array(ciphertext));
}
__name(encryptPayload, "encryptPayload");
async function buildVapidHeaders(endpoint, subject, publicKeyBase64, privateKeyJWK) {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1e3) + 12 * 3600;
  const enc = new TextEncoder();
  const headerObj = { typ: "JWT", alg: "ES256" };
  const payloadObj = { aud: audience, exp: expiration, sub: subject };
  const headerB64 = base64urlEncode(enc.encode(JSON.stringify(headerObj)));
  const payloadB64 = base64urlEncode(enc.encode(JSON.stringify(payloadObj)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const jwk = typeof privateKeyJWK === "string" ? JSON.parse(privateKeyJWK) : privateKeyJWK;
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const rawSignature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    enc.encode(signingInput)
  );
  const sigBytes = new Uint8Array(rawSignature);
  const finalSig = sigBytes.length !== 64 ? derToRaw(sigBytes) : sigBytes;
  const jwt = `${signingInput}.${base64urlEncode(finalSig)}`;
  return {
    Authorization: `vapid t=${jwt},k=${publicKeyBase64}`,
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    TTL: "86400"
  };
}
__name(buildVapidHeaders, "buildVapidHeaders");
async function sendWebPush(subscription, payload, vapidPublicKey, vapidPrivateKeyJWK, vapidSubject) {
  const { endpoint, p256dh, auth } = subscription;
  const payloadStr = typeof payload === "object" ? JSON.stringify(payload) : payload;
  const encryptedBody = await encryptPayload(payloadStr, p256dh, auth);
  const vapidHeaders = await buildVapidHeaders(endpoint, vapidSubject, vapidPublicKey, vapidPrivateKeyJWK);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: vapidHeaders,
    body: encryptedBody
  });
  return response;
}
__name(sendWebPush, "sendWebPush");

// workers/storefront/notifications-worker.js
init_usage_tracker();
init_config();
async function getSiteIcon(env, siteId) {
  try {
    const db = await resolveSiteDBById(env, siteId);
    const config = await db.prepare("SELECT favicon_url, logo_url FROM site_config WHERE site_id = ?").bind(siteId).first();
    if (config?.favicon_url)
      return config.favicon_url;
    if (config?.logo_url)
      return config.logo_url;
  } catch (e) {
  }
  try {
    const site = await env.DB.prepare("SELECT favicon_url, logo_url FROM sites WHERE id = ?").bind(siteId).first();
    if (site?.favicon_url)
      return site.favicon_url;
    if (site?.logo_url)
      return site.logo_url;
  } catch (e) {
  }
  return null;
}
__name(getSiteIcon, "getSiteIcon");
async function handleNotifications(request, env, path) {
  const url = new URL(request.url);
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  switch (action) {
    case "subscribe":
      if (request.method === "POST")
        return handleSubscribe(request, env);
      break;
    case "unsubscribe":
      if (request.method === "POST" || request.method === "DELETE")
        return handleUnsubscribe(request, env);
      break;
    case "stats":
      if (request.method === "GET")
        return handleStats(request, env);
      break;
    case "send":
      if (request.method === "POST")
        return handleSend(request, env);
      break;
    case "settings":
      if (request.method === "GET")
        return handleGetSettings(request, env);
      if (request.method === "POST")
        return handleSaveSettings(request, env);
      break;
  }
  return errorResponse("Notifications endpoint not found", 404);
}
__name(handleNotifications, "handleNotifications");
async function handleSubscribe(request, env) {
  try {
    const body = await request.json();
    const { siteId, endpoint, p256dh, auth, userId } = body;
    if (!siteId || !endpoint || !p256dh || !auth) {
      return errorResponse("siteId, endpoint, p256dh, and auth are required", 400);
    }
    const db = await resolveSiteDBById(env, siteId);
    const existing = await db.prepare(
      "SELECT id FROM notifications WHERE site_id = ? AND endpoint = ?"
    ).bind(siteId, endpoint).first();
    if (existing) {
      await db.prepare(
        `UPDATE notifications SET p256dh = ?, auth = ?, user_id = ?, is_active = 1
         WHERE site_id = ? AND endpoint = ?`
      ).bind(p256dh, auth, userId || null, siteId, endpoint).run();
      return jsonResponse({ success: true, message: "Subscription updated" });
    }
    const id = crypto.randomUUID();
    const rowBytes = 200 + endpoint.length + p256dh.length + auth.length;
    await db.prepare(
      `INSERT INTO notifications (id, site_id, user_id, push_token, endpoint, p256dh, auth, is_active, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))`
    ).bind(id, siteId, userId || null, "", endpoint, p256dh, auth, rowBytes).run();
    await trackD1Write(env, siteId, rowBytes);
    return jsonResponse({ success: true, message: "Subscribed successfully" });
  } catch (err) {
    console.error("[Notifications] Subscribe error:", err);
    return errorResponse("Failed to subscribe: " + err.message, 500);
  }
}
__name(handleSubscribe, "handleSubscribe");
async function handleUnsubscribe(request, env) {
  try {
    const body = await request.json();
    const { siteId, endpoint } = body;
    if (!siteId || !endpoint) {
      return errorResponse("siteId and endpoint are required", 400);
    }
    const db = await resolveSiteDBById(env, siteId);
    const existing = await db.prepare(
      "SELECT id, row_size_bytes FROM notifications WHERE site_id = ? AND endpoint = ?"
    ).bind(siteId, endpoint).first();
    if (existing) {
      await db.prepare(
        "DELETE FROM notifications WHERE site_id = ? AND endpoint = ?"
      ).bind(siteId, endpoint).run();
      await trackD1Delete(env, siteId, existing.row_size_bytes || 200);
    }
    return jsonResponse({ success: true, message: "Unsubscribed successfully" });
  } catch (err) {
    console.error("[Notifications] Unsubscribe error:", err);
    return errorResponse("Failed to unsubscribe: " + err.message, 500);
  }
}
__name(handleUnsubscribe, "handleUnsubscribe");
async function handleStats(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Admin authentication required", 401);
    const db = await resolveSiteDBById(env, siteId);
    const totalResult = await db.prepare(
      "SELECT COUNT(*) as count FROM notifications WHERE site_id = ? AND is_active = 1"
    ).bind(siteId).first();
    const loggedInResult = await db.prepare(
      "SELECT COUNT(*) as count FROM notifications WHERE site_id = ? AND is_active = 1 AND user_id IS NOT NULL"
    ).bind(siteId).first();
    const total = totalResult?.count || 0;
    const loggedIn = loggedInResult?.count || 0;
    const guests = total - loggedIn;
    return jsonResponse({ success: true, data: { total, loggedIn, guests } });
  } catch (err) {
    console.error("[Notifications] Stats error:", err);
    return errorResponse("Failed to fetch stats: " + err.message, 500);
  }
}
__name(handleStats, "handleStats");
async function handleSend(request, env) {
  try {
    let toAbsoluteUrl = function(url) {
      if (!url)
        return null;
      url = url.trim();
      if (/^https?:\/\//i.test(url))
        return url;
      if (url.startsWith("//"))
        return "https:" + url;
      return siteOrigin + (url.startsWith("/") ? url : "/" + url);
    };
    __name(toAbsoluteUrl, "toAbsoluteUrl");
    const body = await request.json();
    const { siteId, title, message, imageUrl, link, target, buttonLabel, buttonLink } = body;
    if (!siteId || !title || !message) {
      return errorResponse("siteId, title, and message are required", 400);
    }
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Admin authentication required", 401);
    const vapidPublicKey = env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
    const vapidSubject = env.VAPID_SUBJECT || VAPID_SUBJECT;
    if (!vapidPrivateKey) {
      return errorResponse("Push notifications not configured (VAPID_PRIVATE_KEY missing)", 500);
    }
    const db = await resolveSiteDBById(env, siteId);
    const siteIcon = await getSiteIcon(env, siteId);
    const site = await env.DB.prepare("SELECT subdomain, custom_domain FROM sites WHERE id = ?").bind(siteId).first();
    const domain = env.DOMAIN || PLATFORM_DOMAIN;
    const siteOrigin = site?.custom_domain ? `https://${site.custom_domain}` : `https://${site?.subdomain || "store"}.${domain}`;
    let query = "SELECT endpoint, p256dh, auth FROM notifications WHERE site_id = ? AND is_active = 1";
    const params = [siteId];
    if (target === "loggedin") {
      query += " AND user_id IS NOT NULL";
    } else if (target === "guests") {
      query += " AND user_id IS NULL";
    }
    const subscriptionsResult = await db.prepare(query).bind(...params).all();
    const subscriptions = subscriptionsResult.results || [];
    if (subscriptions.length === 0) {
      return jsonResponse({ success: true, data: { sent: 0, failed: 0, message: "No subscribers found" } });
    }
    const iconUrl = toAbsoluteUrl(siteIcon) || toAbsoluteUrl("/icon-192.png");
    const payload = { title, body: message, icon: iconUrl };
    if (imageUrl)
      payload.image = toAbsoluteUrl(imageUrl);
    if (link)
      payload.data = { url: link };
    if (buttonLabel && buttonLink) {
      payload.actions = [{ action: "cta", title: buttonLabel }];
      payload.data = payload.data || {};
      payload.data.actionUrls = { cta: buttonLink };
      if (!payload.data.url)
        payload.data.url = buttonLink;
    }
    let sent = 0;
    let failed = 0;
    const expiredEndpoints = [];
    const batchSize = 50;
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (sub) => {
          try {
            const res = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject);
            if (res.status === 201 || res.status === 200) {
              sent++;
            } else if (res.status === 410 || res.status === 404) {
              expiredEndpoints.push(sub.endpoint);
              failed++;
            } else {
              const errBody = await res.text().catch(() => "");
              console.warn("[Notifications] Push failed:", res.status, errBody.substring(0, 200), "endpoint:", sub.endpoint.substring(0, 60));
              failed++;
            }
          } catch (e) {
            console.error("[Notifications] Push send error:", e.message);
            failed++;
          }
        })
      );
    }
    if (expiredEndpoints.length > 0) {
      for (const ep of expiredEndpoints) {
        try {
          await db.prepare("DELETE FROM notifications WHERE site_id = ? AND endpoint = ?").bind(siteId, ep).run();
        } catch (e) {
        }
      }
    }
    return jsonResponse({
      success: true,
      data: { sent, failed, total: subscriptions.length, message: `Notification sent to ${sent} subscriber${sent !== 1 ? "s" : ""}` }
    });
  } catch (err) {
    console.error("[Notifications] Send error:", err);
    return errorResponse("Failed to send notifications: " + err.message, 500);
  }
}
__name(handleSend, "handleSend");
async function handleGetSettings(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Admin authentication required", 401);
    const db = await resolveSiteDBById(env, siteId);
    let config = null;
    try {
      config = await db.prepare("SELECT settings FROM site_config WHERE site_id = ?").bind(siteId).first();
    } catch (e) {
    }
    let settings = {};
    try {
      if (config?.settings)
        settings = JSON.parse(config.settings);
    } catch (e) {
    }
    const notifSettings = settings.pushNotifications || {
      newProducts: true,
      priceDrops: true,
      backInStock: true
    };
    return jsonResponse({ success: true, data: notifSettings });
  } catch (err) {
    console.error("[Notifications] Get settings error:", err);
    return errorResponse("Failed to get settings: " + err.message, 500);
  }
}
__name(handleGetSettings, "handleGetSettings");
async function handleSaveSettings(request, env) {
  try {
    const body = await request.json();
    const { siteId, newProducts, priceDrops, backInStock, lowStock } = body;
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Admin authentication required", 401);
    const db = await resolveSiteDBById(env, siteId);
    let config = null;
    try {
      config = await db.prepare("SELECT settings FROM site_config WHERE site_id = ?").bind(siteId).first();
    } catch (e) {
    }
    let settings = {};
    try {
      if (config?.settings)
        settings = JSON.parse(config.settings);
    } catch (e) {
    }
    settings.pushNotifications = { newProducts: !!newProducts, priceDrops: !!priceDrops, backInStock: !!backInStock, lowStock: lowStock !== void 0 ? !!lowStock : true };
    await db.prepare(
      `INSERT INTO site_config (site_id, settings) VALUES (?, ?)
       ON CONFLICT(site_id) DO UPDATE SET settings = excluded.settings`
    ).bind(siteId, JSON.stringify(settings)).run();
    return jsonResponse({ success: true, message: "Settings saved" });
  } catch (err) {
    console.error("[Notifications] Save settings error:", err);
    return errorResponse("Failed to save settings: " + err.message, 500);
  }
}
__name(handleSaveSettings, "handleSaveSettings");
async function triggerAutoNotification(env, siteId, type, payload) {
  try {
    let toAbsoluteUrl = function(url) {
      if (!url)
        return null;
      url = url.trim();
      if (/^https?:\/\//i.test(url))
        return url;
      if (url.startsWith("//"))
        return "https:" + url;
      return siteOrigin + (url.startsWith("/") ? url : "/" + url);
    };
    __name(toAbsoluteUrl, "toAbsoluteUrl");
    const db = await resolveSiteDBById(env, siteId);
    let config = null;
    try {
      config = await db.prepare("SELECT settings FROM site_config WHERE site_id = ?").bind(siteId).first();
    } catch (e) {
    }
    let settings = {};
    try {
      if (config?.settings)
        settings = JSON.parse(config.settings);
    } catch (e) {
    }
    const notifSettings = settings.pushNotifications || { newProducts: true, priceDrops: true, backInStock: true, lowStock: true };
    const enabledMap = { newProduct: notifSettings.newProducts, priceDrop: notifSettings.priceDrops, backInStock: notifSettings.backInStock, lowStock: notifSettings.lowStock !== false };
    if (!enabledMap[type])
      return;
    const site = await env.DB.prepare("SELECT subdomain, custom_domain FROM sites WHERE id = ?").bind(siteId).first();
    const domain = env.DOMAIN || PLATFORM_DOMAIN;
    const siteOrigin = site?.custom_domain ? `https://${site.custom_domain}` : `https://${site?.subdomain || "store"}.${domain}`;
    const siteIcon = await getSiteIcon(env, siteId);
    const iconUrl = toAbsoluteUrl(siteIcon) || toAbsoluteUrl("/icon-192.png");
    if (payload.image) {
      payload.image = toAbsoluteUrl(payload.image);
    }
    payload.icon = iconUrl;
    if (payload.data?.url) {
      payload.data.url = toAbsoluteUrl(payload.data.url);
    }
    const vapidPublicKey = env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
    const vapidSubject = env.VAPID_SUBJECT || VAPID_SUBJECT;
    if (!vapidPrivateKey)
      return;
    const subscriptionsResult = await db.prepare(
      "SELECT endpoint, p256dh, auth FROM notifications WHERE site_id = ? AND is_active = 1"
    ).bind(siteId).all();
    const subscriptions = subscriptionsResult.results || [];
    if (subscriptions.length === 0)
      return;
    const expiredEndpoints = [];
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const res = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject);
          if (res.status === 410 || res.status === 404)
            expiredEndpoints.push(sub.endpoint);
        } catch (e) {
        }
      })
    );
    for (const ep of expiredEndpoints) {
      try {
        await db.prepare("DELETE FROM notifications WHERE site_id = ? AND endpoint = ?").bind(siteId, ep).run();
      } catch (e) {
      }
    }
  } catch (err) {
    console.error("[Notifications] Auto-trigger error:", err);
  }
}
__name(triggerAutoNotification, "triggerAutoNotification");

// workers/storefront/products-worker.js
async function handleProducts(request, env, path, ctx2) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const productId = pathParts[2];
  if (productId === "options-template") {
    if (method === "GET") {
      return getOptionsTemplate(request, env, url);
    }
    if (method === "PUT") {
      return saveOptionsTemplate(request, env);
    }
  }
  if (method === "GET") {
    const siteId = url.searchParams.get("siteId");
    const subdomain = url.searchParams.get("subdomain");
    const category = url.searchParams.get("category");
    const categoryId = url.searchParams.get("categoryId");
    const subcategoryId = url.searchParams.get("subcategoryId");
    if (productId) {
      return getProduct(env, productId, siteId, subdomain);
    }
    return getProducts(env, { siteId, subdomain, category, categoryId, subcategoryId, url });
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
      if (!siteId && method === "PUT" && productId) {
        try {
          const cloned = request.clone();
          const body = await cloned.json();
          siteId = body.siteId;
        } catch (e) {
        }
      }
      if (siteId) {
        const admin = await validateSiteAdmin(request, env, siteId);
        if (admin) {
          adminSiteId = siteId;
          user = { id: admin.staffId || "site-admin", _adminSiteId: siteId, _adminPermissions: admin };
        }
      }
    }
  }
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  const adminPerms = user._adminPermissions;
  switch (method) {
    case "POST":
      if (adminPerms && !hasPermission(adminPerms, "products"))
        return errorResponse("You do not have permission to manage products", 403);
      return createProduct(request, env, user, ctx2);
    case "PUT":
      if (adminPerms && !hasPermission(adminPerms, "products"))
        return errorResponse("You do not have permission to manage products", 403);
      return updateProduct(request, env, user, productId, ctx2);
    case "DELETE":
      if (adminPerms && !hasPermission(adminPerms, "products"))
        return errorResponse("You do not have permission to manage products", 403);
      return deleteProduct(env, user, productId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleProducts, "handleProducts");
async function getProducts(env, { siteId, subdomain, category, categoryId, subcategoryId, url }) {
  try {
    if (!siteId && !subdomain) {
      return errorResponse("siteId or subdomain is required to fetch products");
    }
    let db;
    if (siteId) {
      db = await resolveSiteDBById(env, siteId);
    } else if (subdomain) {
      const site = await env.DB.prepare(
        "SELECT id FROM sites WHERE LOWER(subdomain) = LOWER(?)"
      ).bind(subdomain).first();
      if (site) {
        siteId = site.id;
      }
      db = await resolveSiteDBBySubdomain(env, subdomain);
    }
    await ensureProductSubcategoryColumn(db, siteId);
    let query = "SELECT p.*, c.name as category_name, c.slug as category_slug, sc.name as subcategory_name, sc.slug as subcategory_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN categories sc ON p.subcategory_id = sc.id WHERE p.is_active = 1";
    const bindings = [];
    if (siteId) {
      query += " AND p.site_id = ?";
      bindings.push(siteId);
    }
    if (categoryId) {
      query += " AND p.category_id = ?";
      bindings.push(categoryId);
    } else if (category) {
      query += " AND (c.slug = ? OR c.name = ?)";
      bindings.push(category, category);
    }
    if (subcategoryId) {
      query += " AND p.subcategory_id = ?";
      bindings.push(subcategoryId);
    }
    const featured = url.searchParams.get("featured");
    if (featured === "true") {
      query += " AND p.is_featured = 1";
    }
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const offset = parseInt(url.searchParams.get("offset")) || 0;
    query += " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
    bindings.push(limit, offset);
    const products = await db.prepare(query).bind(...bindings).all();
    const parsedProducts = products.results.map((product) => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : [],
      options: product.options ? JSON.parse(product.options) : null
    }));
    return cachedJsonResponse({ success: true, message: "Success", data: parsedProducts });
  } catch (error) {
    console.error("Get products error:", error);
    return errorResponse("Failed to fetch products", 500);
  }
}
__name(getProducts, "getProducts");
async function getProduct(env, productId, siteId, subdomain) {
  try {
    if (!siteId && subdomain) {
      const site = await env.DB.prepare(
        "SELECT id FROM sites WHERE LOWER(subdomain) = LOWER(?)"
      ).bind(subdomain).first();
      if (site)
        siteId = site.id;
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureProductSubcategoryColumn(db, siteId);
    let product = null;
    let productQuery = `SELECT p.*, c.name as category_name, c.slug as category_slug, sc.name as subcategory_name, sc.slug as subcategory_slug
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN categories sc ON p.subcategory_id = sc.id
       WHERE p.id = ?`;
    const productBindings = [productId];
    if (siteId) {
      productQuery += " AND p.site_id = ?";
      productBindings.push(siteId);
    }
    product = await db.prepare(productQuery).bind(...productBindings).first();
    if (!product) {
      let slugQuery = `SELECT p.*, c.name as category_name, c.slug as category_slug, sc.name as subcategory_name, sc.slug as subcategory_slug
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id
         LEFT JOIN categories sc ON p.subcategory_id = sc.id
         WHERE p.slug = ?`;
      const slugBindings = [productId];
      if (siteId) {
        slugQuery += " AND p.site_id = ?";
        slugBindings.push(siteId);
      }
      product = await db.prepare(slugQuery).bind(...slugBindings).first();
    }
    if (!product) {
      return errorResponse("Product not found", 404, "NOT_FOUND");
    }
    const siteInfo = await env.DB.prepare(
      "SELECT brand_name, subdomain FROM sites WHERE id = ?"
    ).bind(product.site_id).first();
    if (siteInfo) {
      product.brand_name = siteInfo.brand_name;
      product.subdomain = siteInfo.subdomain;
    }
    let variantResults = [];
    try {
      const variants = await db.prepare(
        "SELECT * FROM product_variants WHERE product_id = ?"
      ).bind(product.id).all();
      variantResults = variants.results || [];
    } catch (_) {
    }
    const parsedProduct = {
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      tags: product.tags ? JSON.parse(product.tags) : [],
      options: product.options ? JSON.parse(product.options) : null,
      variants: variantResults.map((v) => ({
        ...v,
        attributes: v.attributes ? JSON.parse(v.attributes) : {}
      }))
    };
    return cachedJsonResponse({ success: true, message: "Success", data: parsedProduct });
  } catch (error) {
    console.error("Get product error:", error);
    return errorResponse("Failed to fetch product", 500);
  }
}
__name(getProduct, "getProduct");
async function createProduct(request, env, user, ctx2) {
  try {
    const data = await request.json();
    const { siteId, name, description, shortDescription, price, comparePrice, costPrice, sku, stock, categoryId, subcategoryId, images, thumbnailUrl, mainImageIndex, tags, isFeatured, weight, dimensions, options, hsnCode, gstRate } = data;
    if (!siteId || !name || price === void 0) {
      return errorResponse("Site ID, name and price are required");
    }
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
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
    const db = await resolveSiteDBById(env, siteId);
    await ensureProductOptionsColumn(db, siteId);
    await ensureProductSubcategoryColumn(db, siteId);
    let resolvedThumbnail = thumbnailUrl || null;
    if (!resolvedThumbnail && Array.isArray(images) && images.length > 0) {
      const idx = typeof mainImageIndex === "number" ? mainImageIndex : 0;
      resolvedThumbnail = images[idx] || images[0] || null;
    }
    let slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").substring(0, 100);
    const existingSlug = await db.prepare(
      "SELECT id FROM products WHERE site_id = ? AND slug = ?"
    ).bind(siteId, slug).first();
    if (existingSlug) {
      slug = slug.substring(0, 90) + "-" + Date.now().toString(36);
    }
    const productId = generateId();
    const optionsStr = options ? JSON.stringify(options) : null;
    const rowData = { id: productId, site_id: siteId, category_id: categoryId, subcategory_id: subcategoryId, name, slug, description, short_description: shortDescription, price, compare_price: comparePrice, cost_price: costPrice, sku, stock, images, thumbnail_url: resolvedThumbnail, tags, is_featured: isFeatured, weight, dimensions, options: optionsStr, hsn_code: hsnCode, gst_rate: gstRate };
    const rowBytes = estimateRowBytes(rowData);
    const usageCheck = await checkUsageLimit(env, siteId, "d1", rowBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, "STORAGE_LIMIT");
    }
    const runInsert = /* @__PURE__ */ __name(() => db.prepare(
      `INSERT INTO products (id, site_id, category_id, subcategory_id, name, slug, description, short_description, price, compare_price, cost_price, sku, stock, low_stock_threshold, weight, dimensions, images, thumbnail_url, tags, is_featured, options, hsn_code, gst_rate, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      productId,
      siteId,
      categoryId || null,
      subcategoryId || null,
      sanitizeInput(name),
      slug,
      description || null,
      shortDescription || null,
      price,
      comparePrice || null,
      costPrice || null,
      sku || null,
      stock || 0,
      3,
      weight || null,
      dimensions ? JSON.stringify(dimensions) : null,
      images ? JSON.stringify(images) : "[]",
      resolvedThumbnail,
      tags ? JSON.stringify(tags) : "[]",
      isFeatured ? 1 : 0,
      optionsStr,
      hsnCode || null,
      gstRate != null ? gstRate : 0,
      rowBytes
    ).run(), "runInsert");
    try {
      await runInsert();
    } catch (insertErr) {
      if (insertErr.message && (insertErr.message.includes("options") || insertErr.message.includes("hsn_code") || insertErr.message.includes("gst_rate"))) {
        if (insertErr.message.includes("options")) {
          await ensureProductOptionsColumn(db, siteId);
        }
        if (insertErr.message.includes("hsn_code") || insertErr.message.includes("gst_rate")) {
          try {
            await db.prepare("ALTER TABLE products ADD COLUMN hsn_code TEXT").run();
          } catch (e) {
          }
          try {
            await db.prepare("ALTER TABLE products ADD COLUMN gst_rate REAL DEFAULT 0").run();
          } catch (e) {
          }
        }
        await runInsert();
      } else {
        throw insertErr;
      }
    }
    await trackD1Write(env, siteId, rowBytes);
    if (ctx2) {
      ctx2.waitUntil(
        triggerAutoNotification(env, siteId, "newProduct", {
          title: "New Arrival!",
          body: `Check out our new product: ${sanitizeInput(name)}`,
          icon: "/icon-192.png",
          image: resolvedThumbnail || null,
          data: { url: `/product/${productId}` }
        }).catch((err) => console.error("[Notifications] newProduct auto-trigger failed:", err))
      );
    }
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["products"], { productId }));
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
async function updateProduct(request, env, user, productId, ctx2) {
  if (!productId) {
    return errorResponse("Product ID is required");
  }
  try {
    let product;
    let siteId = user._adminSiteId || null;
    if (user._adminSiteId) {
      const db2 = await resolveSiteDBById(env, user._adminSiteId);
      product = await db2.prepare(
        "SELECT id, site_id, row_size_bytes FROM products WHERE id = ? AND site_id = ?"
      ).bind(productId, user._adminSiteId).first();
    } else {
      const userSites = await env.DB.prepare(
        "SELECT id FROM sites WHERE user_id = ?"
      ).bind(user.id).all();
      for (const s of userSites.results || []) {
        const db2 = await resolveSiteDBById(env, s.id);
        product = await db2.prepare(
          "SELECT id, site_id, row_size_bytes FROM products WHERE id = ? AND site_id = ?"
        ).bind(productId, s.id).first();
        if (product) {
          siteId = s.id;
          break;
        }
      }
    }
    if (!product) {
      return errorResponse("Product not found or unauthorized", 404);
    }
    const resolvedSiteId = siteId || product.site_id;
    if (await checkMigrationLock(env, resolvedSiteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, resolvedSiteId);
    await ensureProductSubcategoryColumn(db, resolvedSiteId);
    const updates = await request.json();
    const allowedFields = ["name", "description", "short_description", "price", "compare_price", "cost_price", "sku", "stock", "low_stock_threshold", "category_id", "subcategory_id", "images", "thumbnail_url", "tags", "is_featured", "is_active", "weight", "dimensions", "options", "hsn_code", "gst_rate"];
    let oldProductData = null;
    const needsOldData = updates.price !== void 0 || updates.stock !== void 0;
    if (needsOldData) {
      try {
        oldProductData = await db.prepare("SELECT name, price, stock, thumbnail_url, low_stock_threshold FROM products WHERE id = ?").bind(productId).first();
      } catch (e) {
      }
    }
    if (updates.images && !updates.thumbnailUrl && !updates.thumbnail_url) {
      const imgs = Array.isArray(updates.images) ? updates.images : [];
      const idx = typeof updates.mainImageIndex === "number" ? updates.mainImageIndex : 0;
      const thumb = imgs[idx] || imgs[0] || null;
      if (thumb)
        updates.thumbnailUrl = thumb;
    }
    const setClause = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key === "mainImageIndex" || key === "siteId")
        continue;
      const dbKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = ?`);
        if (value === null || value === void 0) {
          values.push(null);
        } else if (Array.isArray(value) || typeof value === "object") {
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
    const oldBytes = product.row_size_bytes || 0;
    setClause.push('updated_at = datetime("now")');
    values.push(productId);
    const runUpdate = /* @__PURE__ */ __name(() => db.prepare(
      `UPDATE products SET ${setClause.join(", ")} WHERE id = ?`
    ).bind(...values).run(), "runUpdate");
    try {
      await runUpdate();
    } catch (updateErr) {
      if (updateErr.message && (updateErr.message.includes("options") || updateErr.message.includes("hsn_code") || updateErr.message.includes("gst_rate"))) {
        if (updateErr.message.includes("options")) {
          await ensureProductOptionsColumn(db, resolvedSiteId);
        }
        if (updateErr.message.includes("hsn_code") || updateErr.message.includes("gst_rate")) {
          try {
            await db.prepare("ALTER TABLE products ADD COLUMN hsn_code TEXT").run();
          } catch (e) {
          }
          try {
            await db.prepare("ALTER TABLE products ADD COLUMN gst_rate REAL DEFAULT 0").run();
          } catch (e) {
          }
        }
        await runUpdate();
      } else {
        throw updateErr;
      }
    }
    const updatedProdRow = await db.prepare("SELECT * FROM products WHERE id = ?").bind(productId).first();
    const newBytes = updatedProdRow ? estimateRowBytes(updatedProdRow) : oldBytes;
    if (updatedProdRow) {
      await db.prepare("UPDATE products SET row_size_bytes = ? WHERE id = ?").bind(newBytes, productId).run();
    }
    await trackD1Update(env, resolvedSiteId, oldBytes, newBytes);
    if (oldProductData && updatedProdRow) {
      const prodName = updatedProdRow.name || oldProductData.name || "Product";
      const prodThumb = updatedProdRow.thumbnail_url || oldProductData.thumbnail_url || "/icon-192.png";
      const prodLink = `/product/${productId}`;
      if (updates.price !== void 0 && typeof oldProductData.price === "number" && typeof updatedProdRow.price === "number" && updatedProdRow.price < oldProductData.price) {
        if (ctx2) {
          ctx2.waitUntil(
            triggerAutoNotification(env, resolvedSiteId, "priceDrop", {
              title: "Price Drop!",
              body: `Great news! ${prodName} just got a price drop. Don't miss out!`,
              icon: "/icon-192.png",
              image: prodThumb !== "/icon-192.png" ? prodThumb : null,
              data: { url: prodLink }
            }).catch((err) => console.error("[Notifications] priceDrop auto-trigger failed:", err))
          );
        }
      }
      if (updates.stock !== void 0 && (oldProductData.stock === 0 || oldProductData.stock === null) && updatedProdRow.stock > 0) {
        if (ctx2) {
          ctx2.waitUntil(
            triggerAutoNotification(env, resolvedSiteId, "backInStock", {
              title: "Back in Stock!",
              body: `${prodName} is available again. Grab it before it sells out!`,
              icon: "/icon-192.png",
              image: prodThumb !== "/icon-192.png" ? prodThumb : null,
              data: { url: prodLink }
            }).catch((err) => console.error("[Notifications] backInStock auto-trigger failed:", err))
          );
        }
      }
      if (updates.stock !== void 0) {
        const oldStk = oldProductData.stock;
        const newStk = updatedProdRow.stock;
        if (newStk > 0 && newStk <= 3 && (oldStk === null || oldStk > 3)) {
          if (ctx2) {
            ctx2.waitUntil(
              triggerAutoNotification(env, resolvedSiteId, "lowStock", {
                title: "Selling Out Fast!",
                body: `Only ${newStk} left in stock for ${prodName}. Hurry up!`,
                icon: "/icon-192.png",
                image: prodThumb !== "/icon-192.png" ? prodThumb : null,
                data: { url: prodLink }
              }).catch((err) => console.error("[Notifications] lowStock auto-trigger failed:", err))
            );
          }
        }
      }
    }
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, resolvedSiteId, ["products"], { productId }));
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
    let siteId = user._adminSiteId || null;
    if (user._adminSiteId) {
      const db2 = await resolveSiteDBById(env, user._adminSiteId);
      product = await db2.prepare(
        "SELECT id, site_id, images, thumbnail_url, row_size_bytes FROM products WHERE id = ? AND site_id = ?"
      ).bind(productId, user._adminSiteId).first();
    } else {
      const userSites = await env.DB.prepare(
        "SELECT id FROM sites WHERE user_id = ?"
      ).bind(user.id).all();
      for (const s of userSites.results || []) {
        const db2 = await resolveSiteDBById(env, s.id);
        product = await db2.prepare(
          "SELECT id, site_id, images, thumbnail_url, row_size_bytes FROM products WHERE id = ? AND site_id = ?"
        ).bind(productId, s.id).first();
        if (product) {
          siteId = s.id;
          break;
        }
      }
    }
    if (!product) {
      return errorResponse("Product not found or unauthorized", 404);
    }
    const resolvedSiteId = siteId || product.site_id;
    if (await checkMigrationLock(env, resolvedSiteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, resolvedSiteId);
    const bytesToRemove = product.row_size_bytes || 0;
    await db.prepare("DELETE FROM products WHERE id = ?").bind(productId).run();
    if (bytesToRemove > 0) {
      await trackD1Delete(env, resolvedSiteId, bytesToRemove);
    }
    const imageUrls = [];
    if (product.images) {
      try {
        const parsed = JSON.parse(product.images);
        if (Array.isArray(parsed))
          imageUrls.push(...parsed);
      } catch {
      }
    }
    if (product.thumbnail_url)
      imageUrls.push(product.thumbnail_url);
    for (const imgUrl of imageUrls) {
      try {
        const keyMatch = imgUrl.match(/[?&]key=([^&]+)/);
        if (keyMatch) {
          const key = decodeURIComponent(keyMatch[1]);
          if (key.startsWith(`sites/${resolvedSiteId}/`)) {
            await env.STORAGE.delete(key);
            await removeMediaFile(env, resolvedSiteId, key);
          }
        }
      } catch (e) {
        console.error("Failed to delete product image from R2:", e);
      }
    }
    purgeStorefrontCache(env, resolvedSiteId, ["products"], { productId }).catch(() => {
    });
    return successResponse(null, "Product deleted successfully");
  } catch (error) {
    console.error("Delete product error:", error);
    return errorResponse("Failed to delete product", 500);
  }
}
__name(deleteProduct, "deleteProduct");
async function updateProductStock(env, productId, quantity, operation = "decrement", siteId = null, ctx2 = null) {
  try {
    if (siteId && await checkMigrationLock(env, siteId)) {
      console.error("Stock update blocked: site migration in progress");
      return false;
    }
    const db = await resolveSiteDBById(env, siteId);
    const oldRow = await db.prepare("SELECT row_size_bytes, stock FROM products WHERE id = ?").bind(productId).first();
    const oldBytes = oldRow?.row_size_bytes || 0;
    const oldStock = oldRow?.stock ?? null;
    if (operation === "decrement") {
      await db.prepare(
        'UPDATE products SET stock = stock - ?, updated_at = datetime("now") WHERE id = ? AND stock >= ?'
      ).bind(quantity, productId, quantity).run();
    } else {
      await db.prepare(
        'UPDATE products SET stock = stock + ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(quantity, productId).run();
    }
    const updatedRow = await db.prepare("SELECT * FROM products WHERE id = ?").bind(productId).first();
    if (updatedRow && siteId) {
      const newBytes = estimateRowBytes(updatedRow);
      await db.prepare("UPDATE products SET row_size_bytes = ? WHERE id = ?").bind(newBytes, productId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
      if (operation === "decrement" && updatedRow.stock > 0 && updatedRow.stock <= 3 && (oldStock === null || oldStock > 3)) {
        const prodThumb = updatedRow.thumbnail_url || null;
        const notifPromise = triggerAutoNotification(env, siteId, "lowStock", {
          title: "Selling Out Fast!",
          body: `Only ${updatedRow.stock} left in stock for ${updatedRow.name}. Hurry up!`,
          icon: "/icon-192.png",
          image: prodThumb,
          data: { url: `/product/${productId}` }
        }).catch((err) => console.error("[Notifications] lowStock auto-trigger failed:", err));
        if (ctx2) {
          ctx2.waitUntil(notifPromise);
        }
      }
    }
    return true;
  } catch (error) {
    console.error("Update stock error:", error);
    return false;
  }
}
__name(updateProductStock, "updateProductStock");
async function getOptionsTemplate(request, env, url) {
  try {
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required");
    const user = await validateAuth(request, env);
    const authHeader = request.headers.get("Authorization");
    let authorized = !!user;
    if (!authorized && authHeader && authHeader.startsWith("SiteAdmin ")) {
      const admin = await validateSiteAdmin(request, env, siteId);
      authorized = !!admin;
    }
    if (!authorized)
      return errorResponse("Unauthorized", 401);
    const db = await resolveSiteDBById(env, siteId);
    const config = await db.prepare("SELECT settings FROM site_config WHERE site_id = ?").bind(siteId).first();
    let settings = {};
    if (config?.settings) {
      try {
        settings = JSON.parse(config.settings);
      } catch {
      }
    }
    return successResponse({ template: settings.productOptionsTemplate || null });
  } catch (error) {
    console.error("Get options template error:", error);
    return errorResponse("Failed to load options template", 500);
  }
}
__name(getOptionsTemplate, "getOptionsTemplate");
async function saveOptionsTemplate(request, env) {
  try {
    const { siteId, template } = await request.json();
    if (!siteId)
      return errorResponse("siteId is required");
    const user = await validateAuth(request, env);
    const authHeader = request.headers.get("Authorization");
    let authorized = !!user;
    if (!authorized && authHeader && authHeader.startsWith("SiteAdmin ")) {
      const admin = await validateSiteAdmin(request, env, siteId);
      authorized = !!admin;
    }
    if (!authorized)
      return errorResponse("Unauthorized", 401);
    const db = await resolveSiteDBById(env, siteId);
    const config = await db.prepare("SELECT settings FROM site_config WHERE site_id = ?").bind(siteId).first();
    let settings = {};
    if (config?.settings) {
      try {
        settings = JSON.parse(config.settings);
      } catch {
      }
    }
    settings.productOptionsTemplate = template || null;
    await db.prepare('UPDATE site_config SET settings = ?, updated_at = datetime("now") WHERE site_id = ?').bind(JSON.stringify(settings), siteId).run();
    return successResponse(null, "Options template saved");
  } catch (error) {
    console.error("Save options template error:", error);
    return errorResponse("Failed to save options template", 500);
  }
}
__name(saveOptionsTemplate, "saveOptionsTemplate");

// workers/storefront/orders-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
init_usage_tracker();
init_site_db();
init_config();
async function handleOrders(request, env, path, ctx2) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const orderId = pathParts[2];
  const action = pathParts[3];
  if (orderId === "returns" && !action) {
    return handleReturnsList(request, env);
  }
  if (orderId === "returns" && action) {
    return handleReturnUpdate(request, env, action);
  }
  if (orderId === "cancellations" && !action) {
    return handleCancellationsList(request, env);
  }
  if (orderId === "cancellations" && action) {
    return handleCancellationUpdate(request, env, action);
  }
  if (orderId === "validate-stock" && method === "POST") {
    return validateStock(request, env);
  }
  if (action === "guest") {
    return handleGuestOrder(request, env, method, orderId, ctx2);
  }
  if (action === "track") {
    return trackOrder(env, orderId, request);
  }
  if (action === "cancel" && method === "POST") {
    return createCancellationRequest(request, env, orderId);
  }
  if (action === "cancel" && method === "GET") {
    return getCancelStatus(request, env, orderId);
  }
  if (action === "cancel-link" && method === "POST") {
    return resendCancelLink(request, env, orderId);
  }
  if (action === "return" && method === "POST") {
    return createReturnRequest(request, env, orderId);
  }
  if (action === "return" && method === "GET") {
    return getReturnStatus(request, env, orderId);
  }
  if (action === "return-link" && method === "POST") {
    return resendReturnLink(request, env, orderId);
  }
  if (action === "invoice" && method === "GET") {
    return getInvoiceData(request, env, orderId);
  }
  if (orderId === "public-invoice" && method === "GET") {
    return getPublicInvoice(request, env);
  }
  if (orderId === "analytics" && method === "GET") {
    return getAnalytics(request, env);
  }
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  let db = null;
  if (siteId) {
    db = await resolveSiteDBById(env, siteId);
  }
  const user = await validateAnyAuth(request, env, { siteId, db });
  switch (method) {
    case "GET":
      if (orderId) {
        return getOrder(env, user, orderId, request, db);
      }
      return getOrders(request, env, user, db);
    case "POST":
      return createOrder(request, env, user, ctx2);
    case "PUT":
      return updateOrderStatus(request, env, user, orderId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleOrders, "handleOrders");
async function validateStock(request, env) {
  try {
    const { siteId, items } = await request.json();
    if (!siteId || !items || !items.length) {
      return errorResponse("siteId and items are required", 400);
    }
    const db = await resolveSiteDBById(env, siteId);
    const outOfStockItems = [];
    for (const item of items) {
      const productId = item.productId || item.product_id || item.id;
      if (!productId)
        continue;
      const product = await db.prepare(
        "SELECT id, name, stock FROM products WHERE id = ? AND site_id = ?"
      ).bind(productId, siteId).first();
      if (!product) {
        outOfStockItems.push({ productId, name: item.name || "Unknown product", reason: "not_found" });
        continue;
      }
      if (product.stock !== null && product.stock <= 0) {
        outOfStockItems.push({ productId, name: product.name, reason: "out_of_stock", available: 0 });
      } else if (product.stock !== null && product.stock < (item.quantity || 1)) {
        outOfStockItems.push({ productId, name: product.name, reason: "insufficient_stock", available: product.stock, requested: item.quantity || 1 });
      }
    }
    if (outOfStockItems.length > 0) {
      const names = outOfStockItems.map((i) => {
        if (i.reason === "out_of_stock" || i.reason === "not_found")
          return `${i.name} is out of stock`;
        return `${i.name} \u2014 only ${i.available} left (you requested ${i.requested})`;
      });
      return jsonResponse({ success: false, error: names.join("; "), code: "STOCK_VALIDATION_FAILED", outOfStockItems }, 400);
    }
    return successResponse({ valid: true }, "All items are in stock");
  } catch (error) {
    console.error("Validate stock error:", error);
    return errorResponse("Failed to validate stock", 500);
  }
}
__name(validateStock, "validateStock");
async function getOrders(request, env, user, preResolvedDb) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const offset = parseInt(url.searchParams.get("offset")) || 0;
    const db = preResolvedDb || await resolveSiteDBById(env, siteId);
    let query = "SELECT * FROM orders WHERE 1=1";
    const bindings = [];
    const authHeader = request.headers.get("Authorization");
    let isSiteAdmin = false;
    if (authHeader && authHeader.startsWith("SiteAdmin ") && siteId) {
      const { validateSiteAdmin: validateSiteAdmin2, hasPermission: hasPermission2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
      const admin = await validateSiteAdmin2(request, env, siteId);
      if (admin) {
        if (!hasPermission2(admin, "orders")) {
          return errorResponse("You do not have permission to access orders", 403);
        }
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
    const orders = await db.prepare(query).bind(...bindings).all();
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
async function getOrder(env, user, orderId, request, preResolvedDb) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    const db = preResolvedDb || await resolveSiteDBById(env, siteId);
    let query = "SELECT * FROM orders WHERE (id = ? OR order_number = ?)";
    const bindings = [orderId, orderId];
    if (siteId) {
      query += " AND site_id = ?";
      bindings.push(siteId);
    }
    const authHeader = request ? request.headers.get("Authorization") : null;
    if (authHeader && authHeader.startsWith("SiteAdmin ")) {
      const orderCheckQuery = siteId ? "SELECT site_id FROM orders WHERE (id = ? OR order_number = ?) AND site_id = ?" : "SELECT site_id FROM orders WHERE id = ? OR order_number = ?";
      const orderCheckBindings = siteId ? [orderId, orderId, siteId] : [orderId, orderId];
      const orderCheck = await db.prepare(orderCheckQuery).bind(...orderCheckBindings).first();
      if (orderCheck) {
        const { validateSiteAdmin: validateSiteAdmin2, hasPermission: hasPermission2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
        const admin = await validateSiteAdmin2(request, env, orderCheck.site_id);
        if (admin && hasPermission2(admin, "orders")) {
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
        const userSiteIds = await env.DB.prepare(
          "SELECT id FROM sites WHERE user_id = ?"
        ).bind(user.id).all();
        const siteIds = (userSiteIds.results || []).map((s) => s.id);
        if (siteIds.length > 0) {
          const placeholders = siteIds.map(() => "?").join(",");
          query += ` AND (user_id = ? OR site_id IN (${placeholders}))`;
          bindings.push(user.id, ...siteIds);
        } else {
          query += " AND user_id = ?";
          bindings.push(user.id);
        }
      }
    } else {
      return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
    }
    const order = await db.prepare(query).bind(...bindings).first();
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
async function createOrder(request, env, user, ctx2) {
  try {
    const data = await request.json();
    const { siteId, items, shippingAddress, billingAddress, customerName, customerEmail, customerPhone, paymentMethod, notes, couponCode, currency: orderCurrency } = data;
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
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureProductOptionsColumn(db, siteId);
    let siteDefaultCurrency = "INR";
    try {
      const siteConf = await getSiteConfig(env, siteId);
      if (siteConf?.settings) {
        const s = typeof siteConf.settings === "string" ? JSON.parse(siteConf.settings) : siteConf.settings;
        if (s.defaultCurrency)
          siteDefaultCurrency = s.defaultCurrency;
      }
    } catch (e) {
    }
    let subtotal = 0;
    const processedItems = [];
    for (const item of items) {
      const itemProductId = item.productId || item.product_id;
      if (!itemProductId) {
        return errorResponse("Invalid item: missing product ID", 400);
      }
      const product = await db.prepare(
        "SELECT id, name, price, stock, thumbnail_url, options, gst_rate, hsn_code FROM products WHERE id = ? AND site_id = ?"
      ).bind(itemProductId, siteId).first();
      if (!product) {
        return errorResponse(`Product not found: ${itemProductId}`, 400);
      }
      if (product.stock !== null && product.stock < item.quantity) {
        return errorResponse(`Insufficient stock for ${product.name}`, 400, "INSUFFICIENT_STOCK");
      }
      let effectivePrice = product.price;
      const productOptions = product.options ? JSON.parse(product.options) : null;
      const validatedSelectedOptions = item.selectedOptions ? { ...item.selectedOptions } : null;
      if (validatedSelectedOptions?.pricedOptions && productOptions?.pricedOptions) {
        const validatedPriced = {};
        const pricedEntries = Object.entries(validatedSelectedOptions.pricedOptions);
        for (const [label, clientVal] of pricedEntries) {
          const optGroup = productOptions.pricedOptions.find((o) => o.label === label);
          if (optGroup) {
            const dbVal = optGroup.values.find((v) => v.name === clientVal.name);
            if (dbVal) {
              const serverPrice = Number(dbVal.price || 0);
              validatedPriced[label] = { name: dbVal.name, price: serverPrice };
            }
          }
        }
        validatedSelectedOptions.pricedOptions = validatedPriced;
        const lastEntry = pricedEntries[pricedEntries.length - 1];
        if (lastEntry) {
          const [label] = lastEntry;
          if (validatedPriced[label] && Number(validatedPriced[label].price) > 0) {
            effectivePrice = Number(validatedPriced[label].price);
          }
        }
      }
      const itemTotal = effectivePrice * item.quantity;
      subtotal += itemTotal;
      processedItems.push({
        productId: product.id,
        name: product.name,
        price: effectivePrice,
        basePrice: product.price,
        quantity: item.quantity,
        total: itemTotal,
        thumbnail: product.thumbnail_url,
        variant: item.variant || null,
        selectedOptions: validatedSelectedOptions,
        gst_rate: product.gst_rate || 0,
        hsn_code: product.hsn_code || ""
      });
    }
    let discount = 0;
    let appliedCouponCode = null;
    if (couponCode) {
      let coupon = null;
      try {
        coupon = await db.prepare(
          `SELECT * FROM coupons WHERE site_id = ? AND code = ? AND is_active = 1 
           AND (starts_at IS NULL OR starts_at <= datetime('now'))
           AND (expires_at IS NULL OR expires_at > datetime('now'))
           AND (usage_limit IS NULL OR used_count < usage_limit)`
        ).bind(siteId, couponCode.toUpperCase()).first();
      } catch (couponErr) {
        console.error("Coupon lookup error (table may not exist):", couponErr);
      }
      if (coupon && subtotal >= (coupon.min_order_value || 0)) {
        if (coupon.type === "percentage") {
          discount = subtotal * coupon.value / 100;
          if (coupon.max_discount && discount > coupon.max_discount) {
            discount = coupon.max_discount;
          }
        } else {
          discount = coupon.value;
        }
        appliedCouponCode = couponCode.toUpperCase();
        const oldCouponRow = await db.prepare("SELECT row_size_bytes FROM coupons WHERE id = ?").bind(coupon.id).first();
        const oldCouponBytes = oldCouponRow?.row_size_bytes || 0;
        await db.prepare(
          "UPDATE coupons SET used_count = used_count + 1 WHERE id = ?"
        ).bind(coupon.id).run();
        const updatedCoupon = await db.prepare("SELECT * FROM coupons WHERE id = ?").bind(coupon.id).first();
        if (updatedCoupon) {
          const newCouponBytes = estimateRowBytes(updatedCoupon);
          await db.prepare("UPDATE coupons SET row_size_bytes = ? WHERE id = ?").bind(newCouponBytes, coupon.id).run();
          await trackD1Update(env, siteId, oldCouponBytes, newCouponBytes);
        }
      } else {
        try {
          const siteConfig = await getSiteConfig(env, siteId);
          if (siteConfig.settings) {
            let siteSettings = siteConfig.settings;
            if (typeof siteSettings === "string")
              siteSettings = JSON.parse(siteSettings);
            const settingsCoupons = Array.isArray(siteSettings.coupons) ? siteSettings.coupons : [];
            const sc = settingsCoupons.find((c) => c.active && c.code.toUpperCase() === couponCode.toUpperCase());
            if (sc) {
              const minOrder = parseFloat(sc.minOrder) || 0;
              const expOk = !sc.expiryDate || new Date(sc.expiryDate) >= /* @__PURE__ */ new Date();
              if (subtotal >= minOrder && expOk) {
                if (sc.type === "percent") {
                  discount = subtotal * parseFloat(sc.value) / 100;
                } else {
                  discount = parseFloat(sc.value) || 0;
                }
                discount = Math.min(discount, subtotal);
                appliedCouponCode = couponCode.toUpperCase();
              }
            }
          }
        } catch (settingsCouponErr) {
          console.error("Settings coupon lookup error:", settingsCouponErr);
        }
      }
    }
    let shippingCost = 0;
    try {
      const siteConf = await getSiteConfig(env, siteId);
      let s = {};
      if (siteConf?.settings) {
        s = typeof siteConf.settings === "string" ? JSON.parse(siteConf.settings) : siteConf.settings;
      }
      const dc = s.deliveryConfig || {};
      if (dc.enabled) {
        const orderSubtotalAfterDiscount = Math.max(0, subtotal - discount);
        if (dc.freeAboveEnabled && dc.freeAbove > 0 && orderSubtotalAfterDiscount >= dc.freeAbove) {
          shippingCost = 0;
        } else {
          let matched = false;
          if (shippingAddress && Array.isArray(dc.regionRates)) {
            const customerCountry = shippingAddress.country || "";
            const customerState = shippingAddress.state || "";
            if (customerCountry && customerState) {
              const csMatch = dc.regionRates.find((r) => r.country === customerCountry && r.state === customerState);
              if (csMatch && csMatch.rate !== "" && csMatch.rate != null) {
                shippingCost = Number(csMatch.rate) || 0;
                matched = true;
              }
            }
            if (!matched && customerCountry) {
              const cMatch = dc.regionRates.find((r) => r.country === customerCountry && (!r.state || r.state === ""));
              if (cMatch && cMatch.rate !== "" && cMatch.rate != null) {
                shippingCost = Number(cMatch.rate) || 0;
                matched = true;
              }
            }
            if (!matched && customerState) {
              const legacyMatch = dc.regionRates.find((r) => !r.country && r.state === customerState);
              if (legacyMatch && legacyMatch.rate !== "" && legacyMatch.rate != null) {
                shippingCost = Number(legacyMatch.rate) || 0;
                matched = true;
              }
            }
          }
          if (!matched) {
            shippingCost = Number(dc.flatRate) || 0;
          }
        }
      }
    } catch (e) {
      console.error("Shipping config error:", e);
    }
    let tax = 0;
    for (const pi of processedItems) {
      const rate = Number(pi.gst_rate) || 0;
      if (rate > 0) {
        tax += pi.total * rate / 100;
      }
    }
    tax = Math.round(tax * 100) / 100;
    const total = subtotal - discount + shippingCost + tax;
    const orderId = generateId();
    const orderNumber = generateOrderNumber();
    const isPendingPayment = paymentMethod === "razorpay";
    const orderStatus = isPendingPayment ? "pending_payment" : data.status || "pending";
    const rowData = { id: orderId, site_id: siteId, order_number: orderNumber, items: processedItems, subtotal, discount, total, payment_method: paymentMethod, shipping_address: shippingAddress, billing_address: billingAddress, customer_name: customerName, customer_email: customerEmail, customer_phone: customerPhone, coupon_code: appliedCouponCode, notes };
    const rowBytes = estimateRowBytes(rowData);
    const usageCheck = await checkUsageLimit(env, siteId, "d1", rowBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, "STORAGE_LIMIT");
    }
    const resolvedCurrency = orderCurrency || siteDefaultCurrency;
    await db.prepare(
      `INSERT INTO orders (id, site_id, user_id, order_number, items, subtotal, discount, shipping_cost, tax, total, currency, payment_method, status, shipping_address, billing_address, customer_name, customer_email, customer_phone, coupon_code, notes, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
      resolvedCurrency,
      paymentMethod || "pending",
      orderStatus,
      JSON.stringify(shippingAddress),
      billingAddress ? JSON.stringify(billingAddress) : null,
      customerName,
      customerEmail || null,
      customerPhone,
      appliedCouponCode || null,
      notes || null,
      rowBytes
    ).run();
    await trackD1Write(env, siteId, rowBytes);
    if (!isPendingPayment) {
      for (const item of processedItems) {
        await updateProductStock(env, item.productId, item.quantity, "decrement", siteId, ctx2);
      }
      try {
        await sendOrderEmails(env, siteId, {
          orderId,
          orderNumber,
          processedItems,
          subtotal,
          discount,
          coupon_code: appliedCouponCode,
          shippingCost,
          total,
          paymentMethod,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress,
          isGuest: false,
          currency: resolvedCurrency,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
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
    let siteId = null;
    if (user && user.type === "customer") {
      return errorResponse("Customers cannot update order status", 403);
    }
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("SiteAdmin ")) {
      const { validateSiteAdmin: validateSiteAdmin2, hasPermission: hasPermission2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
      const url = new URL(request.url);
      let adminSiteId = url.searchParams.get("siteId");
      if (!adminSiteId) {
        try {
          const cloned = request.clone();
          const body = await cloned.json();
          adminSiteId = body.siteId;
        } catch (e) {
        }
      }
      if (adminSiteId) {
        const admin = await validateSiteAdmin2(request, env, adminSiteId);
        if (admin && hasPermission2(admin, "orders")) {
          const sdb = await resolveSiteDBById(env, adminSiteId);
          let found = await sdb.prepare("SELECT id, site_id, row_size_bytes FROM orders WHERE id = ? AND site_id = ?").bind(orderId, adminSiteId).first();
          if (!found) {
            found = await sdb.prepare("SELECT id, site_id, row_size_bytes FROM guest_orders WHERE id = ? AND site_id = ?").bind(orderId, adminSiteId).first();
          }
          if (found) {
            order = found;
            siteId = adminSiteId;
          }
        }
      }
    }
    if (!order && user) {
      const userSites = await env.DB.prepare(
        "SELECT id FROM sites WHERE user_id = ?"
      ).bind(user.id).all();
      for (const s of userSites.results || []) {
        const sdb = await resolveSiteDBById(env, s.id);
        let found = await sdb.prepare(
          "SELECT id, site_id, row_size_bytes FROM orders WHERE id = ? AND site_id = ?"
        ).bind(orderId, s.id).first();
        if (!found) {
          found = await sdb.prepare(
            "SELECT id, site_id, row_size_bytes FROM guest_orders WHERE id = ? AND site_id = ?"
          ).bind(orderId, s.id).first();
        }
        if (found) {
          order = found;
          siteId = s.id;
          break;
        }
      }
    }
    if (!order) {
      return errorResponse("Order not found or unauthorized", 404);
    }
    const resolvedSiteId = siteId || order.site_id;
    if (await checkMigrationLock(env, resolvedSiteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, resolvedSiteId);
    const { status, trackingNumber, carrier, cancellationReason } = await request.json();
    const updates = [];
    const values = [];
    if (status) {
      updates.push("status = ?");
      values.push(status);
      if (status === "confirmed") {
        updates.push('confirmed_at = datetime("now")');
        try {
          await db.prepare(`ALTER TABLE orders ADD COLUMN confirmed_at TEXT`).run();
        } catch {
        }
      } else if (status === "packed") {
        updates.push('packed_at = datetime("now")');
        try {
          await db.prepare(`ALTER TABLE orders ADD COLUMN packed_at TEXT`).run();
        } catch {
        }
      } else if (status === "shipped") {
        updates.push('shipped_at = datetime("now")');
      } else if (status === "delivered") {
        updates.push('delivered_at = datetime("now")');
      } else if (status === "cancelled") {
        updates.push('cancelled_at = datetime("now")');
        if (cancellationReason) {
          try {
            await db.prepare(
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
    const oldBytes = order.row_size_bytes || 0;
    updates.push('updated_at = datetime("now")');
    values.push(orderId);
    await db.prepare(
      `UPDATE orders SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    const updatedOrderRow = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
    const newBytes = updatedOrderRow ? estimateRowBytes(updatedOrderRow) : oldBytes;
    if (updatedOrderRow) {
      await db.prepare("UPDATE orders SET row_size_bytes = ? WHERE id = ?").bind(newBytes, orderId).run();
    }
    await trackD1Update(env, resolvedSiteId, oldBytes, newBytes);
    if (status === "cancelled" && cancellationReason) {
      try {
        const fullOrder = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
        if (fullOrder) {
          const cancelConfig = await getSiteConfig(env, fullOrder.site_id);
          const siteBrandName = cancelConfig.brand_name || "Store";
          let cancelSettings = {};
          try {
            if (cancelConfig.settings)
              cancelSettings = typeof cancelConfig.settings === "string" ? JSON.parse(cancelConfig.settings) : cancelConfig.settings;
          } catch (e) {
          }
          const ownerEmail = cancelSettings.email || cancelSettings.ownerEmail || cancelConfig.email;
          const cancelCurrency = fullOrder.currency || cancelSettings.defaultCurrency || "INR";
          const storeTz = cancelSettings.timezone || "";
          const emailOrder = {
            order_number: fullOrder.order_number,
            customer_name: fullOrder.customer_name,
            customer_email: fullOrder.customer_email,
            customer_phone: fullOrder.customer_phone,
            total: fullOrder.total,
            payment_method: fullOrder.payment_method,
            created_at: fullOrder.created_at
          };
          const emailJobs = [];
          if (fullOrder.customer_email) {
            const { html, text } = buildCancellationCustomerEmail(emailOrder, siteBrandName, cancellationReason, ownerEmail, cancelCurrency, storeTz);
            emailJobs.push(sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been cancelled`, html, text).catch((e) => console.error("Cancellation customer email error:", e)));
          }
          if (ownerEmail) {
            const { html, text } = buildCancellationOwnerEmail(emailOrder, siteBrandName, cancellationReason, cancelCurrency, storeTz);
            emailJobs.push(sendEmail(env, ownerEmail, `Order #${fullOrder.order_number} cancelled - ${siteBrandName}`, html, text).catch((e) => console.error("Cancellation owner email error:", e)));
          }
          await Promise.all(emailJobs);
        }
      } catch (emailErr) {
        console.error("Failed to send cancellation emails:", emailErr);
      }
    }
    if (status === "confirmed" || status === "packed" || status === "shipped") {
      try {
        const fullOrder = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
        if (fullOrder && fullOrder.customer_email) {
          const statusConfig = await getSiteConfig(env, fullOrder.site_id);
          const siteBrandName = statusConfig.brand_name || "Store";
          let statusSettings = {};
          try {
            if (statusConfig.settings)
              statusSettings = typeof statusConfig.settings === "string" ? JSON.parse(statusConfig.settings) : statusConfig.settings;
          } catch (e) {
          }
          const ownerEmail = statusSettings.email || statusSettings.ownerEmail || statusConfig.email;
          const statusCurrency = fullOrder.currency || statusSettings.defaultCurrency || "INR";
          const site = await env.DB.prepare("SELECT subdomain, custom_domain FROM sites WHERE id = ?").bind(fullOrder.site_id).first();
          const domain = site?.custom_domain || `${site?.subdomain || "store"}.${env.DOMAIN || PLATFORM_DOMAIN}`;
          const trackingUrl = `https://${domain}/order-track?orderId=${fullOrder.order_number}`;
          const storeTz = statusSettings.timezone || "";
          const emailOrder = {
            order_number: fullOrder.order_number,
            customer_name: fullOrder.customer_name,
            customer_email: fullOrder.customer_email,
            customer_phone: fullOrder.customer_phone,
            total: fullOrder.total,
            payment_method: fullOrder.payment_method,
            items: fullOrder.items,
            shipping_address: fullOrder.shipping_address,
            subtotal: fullOrder.subtotal,
            discount: fullOrder.discount,
            shipping_cost: fullOrder.shipping_cost || 0,
            coupon_code: fullOrder.coupon_code,
            created_at: fullOrder.created_at
          };
          let emailOptions = { trackingUrl };
          if (status === "confirmed" && statusSettings.cancellationEnabled && fullOrder.customer_email) {
            try {
              const cancelToken = generateReturnToken();
              try {
                await db.prepare(`ALTER TABLE orders ADD COLUMN cancel_token TEXT`).run();
              } catch (e) {
              }
              await db.prepare(`UPDATE orders SET cancel_token = ? WHERE id = ?`).bind(cancelToken, orderId).run();
              emailOptions.helpUrl = `https://${domain}/order-help/${fullOrder.order_number}?cancelToken=${cancelToken}`;
            } catch (e) {
              console.error("Cancel token generation error:", e);
            }
          }
          if (status === "confirmed" && statusSettings.gstInvoiceEmailEnabled && fullOrder.customer_email) {
            try {
              const invoiceToken = generateReturnToken();
              try {
                await db.prepare(`ALTER TABLE orders ADD COLUMN invoice_token TEXT`).run();
              } catch (e) {
              }
              try {
                await db.prepare(`ALTER TABLE guest_orders ADD COLUMN invoice_token TEXT`).run();
              } catch (e) {
              }
              const orderTable = await db.prepare("SELECT id FROM orders WHERE id = ?").bind(orderId).first() ? "orders" : "guest_orders";
              await db.prepare(`UPDATE ${orderTable} SET invoice_token = ? WHERE id = ?`).bind(invoiceToken, orderId).run();
              emailOptions.invoiceUrl = `https://${domain}/invoice?order=${fullOrder.order_number}&t=${invoiceToken}&subdomain=${encodeURIComponent(site?.subdomain || "")}`;
            } catch (e) {
              console.error("Invoice token generation error:", e);
            }
          }
          if (status === "confirmed") {
            const { html, text } = buildOrderConfirmationEmail(emailOrder, siteBrandName, ownerEmail, statusCurrency, emailOptions, storeTz);
            await sendEmail(env, fullOrder.customer_email, `Order Confirmed #${fullOrder.order_number} - ${siteBrandName}`, html, text).catch((e) => console.error("Confirmation email error:", e));
          } else if (status === "packed") {
            const { html, text } = buildOrderPackedEmail(emailOrder, siteBrandName, ownerEmail, statusCurrency, { trackingUrl }, storeTz);
            await sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been packed! - ${siteBrandName}`, html, text).catch((e) => console.error("Packed email error:", e));
          } else if (status === "shipped") {
            const shipOptions = { trackingUrl, trackingNumber: fullOrder.tracking_number || trackingNumber, carrier: fullOrder.carrier || carrier };
            const { html, text } = buildOrderShippedEmail(emailOrder, siteBrandName, ownerEmail, statusCurrency, shipOptions, storeTz);
            await sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been shipped! - ${siteBrandName}`, html, text).catch((e) => console.error("Shipped email error:", e));
          }
        }
      } catch (emailErr) {
        console.error("Failed to send status update email:", emailErr);
      }
    }
    if (status === "delivered") {
      try {
        let fullOrder = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
        let isGuestOrder = false;
        if (!fullOrder) {
          fullOrder = await db.prepare("SELECT * FROM guest_orders WHERE id = ?").bind(orderId).first();
          isGuestOrder = true;
        }
        if (fullOrder) {
          const orderTable = isGuestOrder ? "guest_orders" : "orders";
          const deliveryConfig = await getSiteConfig(env, fullOrder.site_id);
          const siteBrandName = deliveryConfig.brand_name || "Store";
          let deliverySettings = {};
          try {
            if (deliveryConfig.settings)
              deliverySettings = typeof deliveryConfig.settings === "string" ? JSON.parse(deliveryConfig.settings) : deliveryConfig.settings;
          } catch (e) {
          }
          const ownerEmail = deliverySettings.email || deliverySettings.ownerEmail || deliveryConfig.email;
          const deliveryCurrency = fullOrder.currency || deliverySettings.defaultCurrency || "INR";
          const storeTz = deliverySettings.timezone || "";
          const emailOrder = {
            order_number: fullOrder.order_number,
            customer_name: fullOrder.customer_name,
            customer_email: fullOrder.customer_email,
            customer_phone: fullOrder.customer_phone,
            total: fullOrder.total,
            payment_method: fullOrder.payment_method,
            items: fullOrder.items,
            created_at: fullOrder.created_at
          };
          let deliveryEmailOptions = {};
          const site = await env.DB.prepare("SELECT subdomain, custom_domain FROM sites WHERE id = ?").bind(fullOrder.site_id).first();
          const delivDomain = site?.custom_domain || `${site?.subdomain || "store"}.${env.DOMAIN || PLATFORM_DOMAIN}`;
          if (deliverySettings.returnsEnabled && fullOrder.customer_email) {
            try {
              const returnToken = generateReturnToken();
              try {
                await db.prepare(`ALTER TABLE ${orderTable} ADD COLUMN return_token TEXT`).run();
              } catch (e) {
              }
              await db.prepare(`UPDATE ${orderTable} SET return_token = ? WHERE id = ?`).bind(returnToken, orderId).run();
              deliveryEmailOptions.helpUrl = `https://${delivDomain}/order-help/${fullOrder.order_number}?returnToken=${returnToken}`;
            } catch (e) {
              console.error("Return token generation error:", e);
            }
          }
          if (deliverySettings.reviewsEnabled !== false && fullOrder.customer_email) {
            try {
              const reviewToken = generateReturnToken();
              try {
                await db.prepare(`ALTER TABLE ${orderTable} ADD COLUMN review_token TEXT`).run();
              } catch (e) {
              }
              await db.prepare(`UPDATE ${orderTable} SET review_token = ? WHERE id = ?`).bind(reviewToken, orderId).run();
              let orderItems = [];
              try {
                orderItems = typeof fullOrder.items === "string" ? JSON.parse(fullOrder.items) : fullOrder.items || [];
              } catch (e) {
              }
              deliveryEmailOptions.reviewUrl = `https://${delivDomain}/review/${fullOrder.id}?token=${reviewToken}`;
              deliveryEmailOptions.reviewItems = orderItems.slice(0, 3).map((item) => ({
                name: item.name,
                image: item.image || item.thumbnail_url || "",
                slug: item.slug || ""
              }));
              deliveryEmailOptions.storeDomain = `https://${delivDomain}`;
            } catch (e) {
              console.error("Review token generation error:", e);
            }
          }
          const emailJobs = [];
          if (fullOrder.customer_email) {
            try {
              const { html, text } = buildDeliveryCustomerEmail(emailOrder, siteBrandName, ownerEmail, deliveryCurrency, deliveryEmailOptions, storeTz);
              emailJobs.push(sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been delivered!`, html, text).catch((e) => console.error("Delivery customer email send error:", e)));
            } catch (buildErr) {
              console.error("Delivery customer email build error:", buildErr);
            }
          }
          if (ownerEmail) {
            try {
              const { html, text } = buildDeliveryOwnerEmail(emailOrder, siteBrandName, deliveryCurrency, storeTz);
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
async function handleGuestOrder(request, env, method, orderId, ctx2) {
  if (method === "POST") {
    return createGuestOrder(request, env, ctx2);
  }
  if (method === "GET" && orderId) {
    return getGuestOrder(env, orderId, request);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handleGuestOrder, "handleGuestOrder");
async function createGuestOrder(request, env, ctx2) {
  try {
    const data = await request.json();
    const { siteId, items, shippingAddress, customerName, customerEmail, customerPhone, paymentMethod, currency: guestOrderCurrency } = data;
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
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureProductOptionsColumn(db, siteId);
    let guestSiteDefaultCurrency = "INR";
    try {
      const siteConf = await getSiteConfig(env, siteId);
      if (siteConf?.settings) {
        const s = typeof siteConf.settings === "string" ? JSON.parse(siteConf.settings) : siteConf.settings;
        if (s.defaultCurrency)
          guestSiteDefaultCurrency = s.defaultCurrency;
      }
    } catch (e) {
    }
    let subtotal = 0;
    const processedItems = [];
    for (const item of items) {
      const itemProductId = item.productId || item.product_id;
      if (!itemProductId) {
        return errorResponse("Invalid item: missing product ID", 400);
      }
      const product = await db.prepare(
        "SELECT id, name, price, stock, thumbnail_url, options, gst_rate, hsn_code FROM products WHERE id = ? AND site_id = ?"
      ).bind(itemProductId, siteId).first();
      if (!product) {
        return errorResponse(`Product not found: ${itemProductId}`, 400);
      }
      let effectivePrice = product.price;
      const productOptions = product.options ? JSON.parse(product.options) : null;
      const validatedSelectedOptions = item.selectedOptions ? { ...item.selectedOptions } : null;
      if (validatedSelectedOptions?.pricedOptions && productOptions?.pricedOptions) {
        const validatedPriced = {};
        const pricedEntries = Object.entries(validatedSelectedOptions.pricedOptions);
        for (const [label, clientVal] of pricedEntries) {
          const optGroup = productOptions.pricedOptions.find((o) => o.label === label);
          if (optGroup) {
            const dbVal = optGroup.values.find((v) => v.name === clientVal.name);
            if (dbVal) {
              const serverPrice = Number(dbVal.price || 0);
              validatedPriced[label] = { name: dbVal.name, price: serverPrice };
            }
          }
        }
        validatedSelectedOptions.pricedOptions = validatedPriced;
        const lastEntry = pricedEntries[pricedEntries.length - 1];
        if (lastEntry) {
          const [label] = lastEntry;
          if (validatedPriced[label] && Number(validatedPriced[label].price) > 0) {
            effectivePrice = Number(validatedPriced[label].price);
          }
        }
      }
      const itemTotal = effectivePrice * item.quantity;
      subtotal += itemTotal;
      processedItems.push({
        productId: product.id,
        name: product.name,
        price: effectivePrice,
        basePrice: product.price,
        quantity: item.quantity,
        total: itemTotal,
        thumbnail: product.thumbnail_url,
        selectedOptions: validatedSelectedOptions,
        gst_rate: product.gst_rate || 0,
        hsn_code: product.hsn_code || ""
      });
    }
    let guestShippingCost = 0;
    try {
      const siteConf2 = await getSiteConfig(env, siteId);
      let s2 = {};
      if (siteConf2?.settings) {
        s2 = typeof siteConf2.settings === "string" ? JSON.parse(siteConf2.settings) : siteConf2.settings;
      }
      const dc2 = s2.deliveryConfig || {};
      if (dc2.enabled) {
        if (dc2.freeAboveEnabled && dc2.freeAbove > 0 && subtotal >= dc2.freeAbove) {
          guestShippingCost = 0;
        } else {
          let matched2 = false;
          if (shippingAddress && Array.isArray(dc2.regionRates)) {
            const customerCountry2 = shippingAddress.country || "";
            const customerState2 = shippingAddress.state || "";
            if (customerCountry2 && customerState2) {
              const csMatch2 = dc2.regionRates.find((r) => r.country === customerCountry2 && r.state === customerState2);
              if (csMatch2 && csMatch2.rate !== "" && csMatch2.rate != null) {
                guestShippingCost = Number(csMatch2.rate) || 0;
                matched2 = true;
              }
            }
            if (!matched2 && customerCountry2) {
              const cMatch2 = dc2.regionRates.find((r) => r.country === customerCountry2 && (!r.state || r.state === ""));
              if (cMatch2 && cMatch2.rate !== "" && cMatch2.rate != null) {
                guestShippingCost = Number(cMatch2.rate) || 0;
                matched2 = true;
              }
            }
            if (!matched2 && customerState2) {
              const legacyMatch2 = dc2.regionRates.find((r) => !r.country && r.state === customerState2);
              if (legacyMatch2 && legacyMatch2.rate !== "" && legacyMatch2.rate != null) {
                guestShippingCost = Number(legacyMatch2.rate) || 0;
                matched2 = true;
              }
            }
          }
          if (!matched2) {
            guestShippingCost = Number(dc2.flatRate) || 0;
          }
        }
      }
    } catch (e) {
      console.error("Guest shipping config error:", e);
    }
    let guestTax = 0;
    for (const pi of processedItems) {
      const rate = Number(pi.gst_rate) || 0;
      if (rate > 0) {
        guestTax += pi.total * rate / 100;
      }
    }
    guestTax = Math.round(guestTax * 100) / 100;
    const total = subtotal + guestShippingCost + guestTax;
    const orderId = generateId();
    const orderNumber = generateOrderNumber();
    const rowData = { id: orderId, site_id: siteId, order_number: orderNumber, items: processedItems, subtotal, total, shipping_address: shippingAddress, customer_name: customerName, customer_email: customerEmail, customer_phone: customerPhone };
    const rowBytes = estimateRowBytes(rowData);
    const usageCheck = await checkUsageLimit(env, siteId, "d1", rowBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, "STORAGE_LIMIT");
    }
    const isPendingPayment = paymentMethod === "razorpay";
    const orderStatus = isPendingPayment ? "pending_payment" : "pending";
    const resolvedGuestCurrency = guestOrderCurrency || guestSiteDefaultCurrency;
    await db.prepare(
      `INSERT INTO guest_orders (id, site_id, order_number, items, subtotal, shipping_cost, tax, total, currency, payment_method, status, shipping_address, customer_name, customer_email, customer_phone, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      orderId,
      siteId,
      orderNumber,
      JSON.stringify(processedItems),
      subtotal,
      guestShippingCost,
      guestTax,
      total,
      resolvedGuestCurrency,
      paymentMethod || "cod",
      orderStatus,
      JSON.stringify(shippingAddress),
      customerName,
      customerEmail || null,
      customerPhone,
      rowBytes
    ).run();
    await trackD1Write(env, siteId, rowBytes);
    if (!isPendingPayment) {
      for (const item of processedItems) {
        await updateProductStock(env, item.productId, item.quantity, "decrement", siteId, ctx2);
      }
      try {
        await sendOrderEmails(env, siteId, {
          orderId,
          orderNumber,
          processedItems,
          subtotal,
          discount: 0,
          coupon_code: null,
          shippingCost: guestShippingCost,
          total,
          paymentMethod,
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress,
          isGuest: true,
          currency: resolvedGuestCurrency,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (emailErr) {
        console.error("Guest order email notification error:", emailErr);
      }
    }
    return successResponse({
      id: orderId,
      orderNumber,
      total,
      items: processedItems
    }, "Guest order created successfully");
  } catch (error) {
    console.error("Create guest order error:", error.message || error, error.stack || "");
    return errorResponse("Failed to create guest order: " + (error.message || "Unknown error"), 500);
  }
}
__name(createGuestOrder, "createGuestOrder");
async function getGuestOrder(env, orderId, request) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    const db = await resolveSiteDBById(env, siteId);
    let query = "SELECT * FROM guest_orders WHERE (id = ? OR order_number = ?)";
    const bindings = [orderId, orderId];
    if (siteId) {
      query += " AND site_id = ?";
      bindings.push(siteId);
    }
    const order = await db.prepare(query).bind(...bindings).first();
    if (!order) {
      return errorResponse("Order not found", 404, "NOT_FOUND");
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
async function trackOrder(env, orderId, request) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    const db = await resolveSiteDBById(env, siteId);
    let order = null;
    const siteClause = siteId ? " AND site_id = ?" : "";
    for (const table of ["orders", "guest_orders"]) {
      if (order)
        break;
      const binds = siteId ? [orderId, orderId, siteId] : [orderId, orderId];
      try {
        order = await db.prepare(
          `SELECT id, order_number, status, tracking_number, carrier, confirmed_at, packed_at, shipped_at, delivered_at, created_at FROM ${table} WHERE (id = ? OR order_number = ?)${siteClause}`
        ).bind(...binds).first();
      } catch (colErr) {
        order = await db.prepare(
          `SELECT id, order_number, status, tracking_number, carrier, shipped_at, delivered_at, created_at FROM ${table} WHERE (id = ? OR order_number = ?)${siteClause}`
        ).bind(...binds).first();
      }
    }
    if (!order) {
      return errorResponse("Order not found", 404, "NOT_FOUND");
    }
    return successResponse(order);
  } catch (error) {
    console.error("Track order error:", error);
    return errorResponse("Failed to track order", 500);
  }
}
__name(trackOrder, "trackOrder");
async function ensureReturnRequestsTable(db) {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS return_requests (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      order_number TEXT,
      items TEXT,
      reason TEXT NOT NULL,
      reason_detail TEXT,
      photos TEXT,
      resolution TEXT,
      status TEXT DEFAULT 'requested',
      admin_note TEXT,
      refund_amount REAL,
      refund_id TEXT,
      return_token TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`).run();
    try {
      await db.prepare(`ALTER TABLE return_requests ADD COLUMN resolution TEXT`).run();
    } catch (e) {
    }
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_return_requests_site ON return_requests(site_id)").run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id)").run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_return_requests_token ON return_requests(return_token)").run();
  } catch (e) {
  }
}
__name(ensureReturnRequestsTable, "ensureReturnRequestsTable");
function generateReturnToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
__name(generateReturnToken, "generateReturnToken");
async function createReturnRequest(request, env, orderId) {
  try {
    const data = await request.json();
    const { siteId, items, reason, reasonDetail, photos, resolution, returnToken } = data;
    if (!siteId || !orderId)
      return errorResponse("siteId and orderId are required");
    if (!reason)
      return errorResponse("Reason is required");
    const db = await resolveSiteDBById(env, siteId);
    await ensureReturnRequestsTable(db);
    const config = await getSiteConfig(env, siteId);
    let settings = {};
    try {
      if (config.settings)
        settings = typeof config.settings === "string" ? JSON.parse(config.settings) : config.settings;
    } catch (e) {
    }
    if (!settings.returnsEnabled)
      return errorResponse("Returns are not enabled for this store", 403);
    let order = await db.prepare("SELECT * FROM orders WHERE (id = ? OR order_number = ?) AND site_id = ?").bind(orderId, orderId, siteId).first();
    let isGuest = false;
    if (!order) {
      order = await db.prepare("SELECT * FROM guest_orders WHERE (id = ? OR order_number = ?) AND site_id = ?").bind(orderId, orderId, siteId).first();
      isGuest = true;
    }
    if (!order)
      return errorResponse("Order not found", 404);
    if ((order.status || "").toLowerCase() !== "delivered") {
      return errorResponse("Only delivered orders can be returned", 400);
    }
    const returnWindowDays = settings.returnWindowDays || 7;
    const deliveredAt = order.delivered_at || order.updated_at || order.created_at;
    if (deliveredAt) {
      const deliveryDate = new Date(deliveredAt);
      const now = /* @__PURE__ */ new Date();
      const daysSinceDelivery = (now - deliveryDate) / (1e3 * 60 * 60 * 24);
      if (daysSinceDelivery > returnWindowDays) {
        return errorResponse(`Return window of ${returnWindowDays} days has expired`, 400);
      }
    }
    if (isGuest) {
      if (!returnToken)
        return errorResponse("Return token is required for guest orders", 403);
      const storedToken = order.return_token;
      if (!storedToken || storedToken !== returnToken) {
        return errorResponse("Invalid return token", 403);
      }
    } else {
      if (returnToken) {
        const storedToken = order.return_token;
        if (!storedToken || storedToken !== returnToken) {
          return errorResponse("Invalid return token", 403);
        }
      } else {
        const user = await validateAnyAuth(request, env, { siteId, db });
        if (!user)
          return errorResponse("Authentication required", 401);
        if (order.user_id && order.user_id !== user.id) {
          return errorResponse("You can only return your own orders", 403);
        }
      }
    }
    const existing = await db.prepare("SELECT id FROM return_requests WHERE order_id = ? AND site_id = ?").bind(order.id, siteId).first();
    if (existing)
      return errorResponse("A return request already exists for this order", 409);
    const returnId = generateId();
    await db.prepare(
      `INSERT INTO return_requests (id, site_id, order_id, order_number, items, reason, reason_detail, photos, resolution, status, return_token, customer_name, customer_email, customer_phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      returnId,
      siteId,
      order.id,
      order.order_number,
      items ? JSON.stringify(items) : order.items,
      reason,
      reasonDetail || null,
      photos ? JSON.stringify(photos) : null,
      resolution || null,
      order.return_token || null,
      order.customer_name,
      order.customer_email || null,
      order.customer_phone || null
    ).run();
    try {
      const brandName = config.brand_name || "Store";
      const ownerEmail = settings.email || settings.ownerEmail || config.email;
      if (ownerEmail) {
        const { html, text } = buildReturnRequestEmail(order, brandName, reason, reasonDetail);
        await sendEmail(env, ownerEmail, `Return Request #${order.order_number} - ${brandName}`, html, text).catch(() => {
        });
      }
    } catch (e) {
    }
    return successResponse({ id: returnId, status: "requested" }, "Return request submitted successfully");
  } catch (error) {
    console.error("Create return request error:", error);
    return errorResponse("Failed to create return request: " + error.message, 500);
  }
}
__name(createReturnRequest, "createReturnRequest");
async function getReturnStatus(request, env, orderId) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    const returnToken = url.searchParams.get("token");
    if (!siteId)
      return errorResponse("siteId is required");
    const db = await resolveSiteDBById(env, siteId);
    await ensureReturnRequestsTable(db);
    const ret = await db.prepare(
      "SELECT * FROM return_requests WHERE (order_id = ? OR order_number = ?) AND site_id = ?"
    ).bind(orderId, orderId, siteId).first();
    if (!ret)
      return successResponse(null, "No return request found");
    if (returnToken) {
      if (!ret.return_token || ret.return_token !== returnToken) {
        return errorResponse("Invalid token", 403);
      }
    }
    const safeRet = { id: ret.id, order_id: ret.order_id, order_number: ret.order_number, status: ret.status, admin_note: ret.admin_note, refund_amount: ret.refund_amount, reason: ret.reason, reason_detail: ret.reason_detail, resolution: ret.resolution, created_at: ret.created_at, updated_at: ret.updated_at };
    return successResponse(safeRet);
  } catch (error) {
    console.error("Get return status error:", error);
    return errorResponse("Failed to get return status", 500);
  }
}
__name(getReturnStatus, "getReturnStatus");
async function handleReturnsList(request, env) {
  if (request.method !== "GET")
    return errorResponse("Method not allowed", 405);
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required");
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("SiteAdmin ")) {
      const user = await validateAnyAuth(request, env, { siteId });
      if (!user)
        return errorResponse("Authentication required", 401);
      const site = await env.DB.prepare("SELECT id FROM sites WHERE id = ? AND user_id = ?").bind(siteId, user.id).first();
      if (!site)
        return errorResponse("Unauthorized", 403);
    } else {
      const { validateSiteAdmin: validateSiteAdmin2, hasPermission: hasPermission2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
      const admin = await validateSiteAdmin2(request, env, siteId);
      if (!admin || !hasPermission2(admin, "orders"))
        return errorResponse("Unauthorized", 403);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureReturnRequestsTable(db);
    const result = await db.prepare(
      "SELECT * FROM return_requests WHERE site_id = ? ORDER BY created_at DESC"
    ).bind(siteId).all();
    return successResponse(result.results || []);
  } catch (error) {
    console.error("List returns error:", error);
    return errorResponse("Failed to list returns", 500);
  }
}
__name(handleReturnsList, "handleReturnsList");
async function handleReturnUpdate(request, env, returnId) {
  if (request.method !== "PUT")
    return errorResponse("Method not allowed", 405);
  try {
    const data = await request.json();
    const { siteId, status, adminNote, refundAmount, refundId } = data;
    if (!siteId || !returnId)
      return errorResponse("siteId and returnId are required");
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("SiteAdmin ")) {
      const user = await validateAnyAuth(request, env, { siteId });
      if (!user)
        return errorResponse("Authentication required", 401);
      const site = await env.DB.prepare("SELECT id FROM sites WHERE id = ? AND user_id = ?").bind(siteId, user.id).first();
      if (!site)
        return errorResponse("Unauthorized", 403);
    } else {
      const { validateSiteAdmin: validateSiteAdmin2, hasPermission: hasPermission2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
      const admin = await validateSiteAdmin2(request, env, siteId);
      if (!admin || !hasPermission2(admin, "orders"))
        return errorResponse("Unauthorized", 403);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureReturnRequestsTable(db);
    const ret = await db.prepare("SELECT * FROM return_requests WHERE id = ? AND site_id = ?").bind(returnId, siteId).first();
    if (!ret)
      return errorResponse("Return request not found", 404);
    const allowedStatuses = ["requested", "approved", "rejected", "refunded", "replaced"];
    if (status && !allowedStatuses.includes(status)) {
      return errorResponse("Invalid status. Allowed: " + allowedStatuses.join(", "), 400);
    }
    const updates = ['updated_at = datetime("now")'];
    const values = [];
    if (status) {
      updates.push("status = ?");
      values.push(status);
    }
    if (adminNote !== void 0) {
      updates.push("admin_note = ?");
      values.push(adminNote);
    }
    if (refundAmount !== void 0) {
      updates.push("refund_amount = ?");
      values.push(refundAmount);
    }
    if (refundId) {
      updates.push("refund_id = ?");
      values.push(refundId);
    }
    values.push(returnId);
    await db.prepare(`UPDATE return_requests SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
    if (status && ret.customer_email) {
      try {
        const config = await getSiteConfig(env, siteId);
        const brandName = config.brand_name || "Store";
        const updatedRet = { ...ret, status, admin_note: adminNote !== void 0 ? adminNote : ret.admin_note, refund_amount: refundAmount !== void 0 ? refundAmount : ret.refund_amount };
        const { html, text } = buildReturnStatusEmail(updatedRet, brandName, status, adminNote);
        await sendEmail(env, ret.customer_email, `Return Update #${ret.order_number} - ${brandName}`, html, text).catch(() => {
        });
      } catch (e) {
      }
    }
    return successResponse(null, "Return request updated");
  } catch (error) {
    console.error("Update return error:", error);
    return errorResponse("Failed to update return request", 500);
  }
}
__name(handleReturnUpdate, "handleReturnUpdate");
async function resendReturnLink(request, env, orderId) {
  try {
    const data = await request.json();
    const { siteId, email } = data;
    if (!siteId || !orderId || !email)
      return errorResponse("siteId, orderId and email are required");
    const db = await resolveSiteDBById(env, siteId);
    let order = await db.prepare("SELECT * FROM orders WHERE (id = ? OR order_number = ?) AND site_id = ? AND customer_email = ?").bind(orderId, orderId, siteId, email).first();
    let isGuest = false;
    if (!order) {
      order = await db.prepare("SELECT * FROM guest_orders WHERE (id = ? OR order_number = ?) AND site_id = ? AND customer_email = ?").bind(orderId, orderId, siteId, email).first();
      isGuest = true;
    }
    if (!order)
      return errorResponse("Order not found or email does not match", 404);
    let returnToken = order.return_token;
    if (!returnToken) {
      returnToken = generateReturnToken();
      const table = isGuest ? "guest_orders" : "orders";
      try {
        await db.prepare(`ALTER TABLE ${table} ADD COLUMN return_token TEXT`).run();
      } catch (e) {
      }
      await db.prepare(`UPDATE ${table} SET return_token = ? WHERE id = ?`).bind(returnToken, order.id).run();
    }
    const site = await env.DB.prepare("SELECT subdomain, custom_domain FROM sites WHERE id = ?").bind(siteId).first();
    const domain = site?.custom_domain || `${site?.subdomain || "store"}.${env.DOMAIN || PLATFORM_DOMAIN}`;
    const returnUrl = `https://${domain}/return/${order.order_number || order.id}?token=${returnToken}`;
    const config = await getSiteConfig(env, siteId);
    const brandName = config.brand_name || "Store";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
      <div style="max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
          <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Your Return Link</h2>
          <p style="color:#64748b;font-size:14px;line-height:1.6;">Use the link below to submit a return request for order <strong>#${order.order_number}</strong>:</p>
          <div style="margin:24px 0;text-align:center;">
            <a href="${returnUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Request Return</a>
          </div>
          <p style="color:#94a3b8;font-size:12px;">If the button doesn't work, copy this link: ${returnUrl}</p>
        </div>
      </div>
    </body></html>`;
    const text = `Your return link for order #${order.order_number}: ${returnUrl}`;
    await sendEmail(env, email, `Return Link for Order #${order.order_number} - ${brandName}`, html, text);
    return successResponse(null, "Return link sent to your email");
  } catch (error) {
    console.error("Resend return link error:", error);
    return errorResponse("Failed to send return link", 500);
  }
}
__name(resendReturnLink, "resendReturnLink");
function buildReturnRequestEmail(order, brandName, reason, reasonDetail) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#ef4444;">New Return Request</h2>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:14px;"><strong>Order:</strong> #${order.order_number}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Customer:</strong> ${order.customer_name || "N/A"}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Email:</strong> ${order.customer_email || "N/A"}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Reason:</strong> ${reason}</p>
          ${reasonDetail ? `<p style="margin:0;font-size:14px;"><strong>Details:</strong> ${reasonDetail}</p>` : ""}
        </div>
        <p style="color:#64748b;font-size:14px;">Please review this return request in your admin panel.</p>
      </div>
    </div>
  </body></html>`;
  const text = `New Return Request
Order: #${order.order_number}
Customer: ${order.customer_name}
Reason: ${reason}${reasonDetail ? "\nDetails: " + reasonDetail : ""}`;
  return { html, text };
}
__name(buildReturnRequestEmail, "buildReturnRequestEmail");
function buildReturnStatusEmail(ret, brandName, status, adminNote) {
  const statusLabels = { approved: "Approved", rejected: "Rejected", refunded: "Refunded" };
  const statusColors = { approved: "#22c55e", rejected: "#ef4444", refunded: "#2563eb" };
  const label = statusLabels[status] || status;
  const color = statusColors[status] || "#64748b";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
        <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
      </div>
      <div style="padding:32px;">
        <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Return Request Update</h2>
        <p style="color:#64748b;font-size:14px;margin-bottom:20px;">Your return request for order <strong>#${ret.order_number}</strong> has been updated.</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="display:inline-block;background:${color};color:#fff;padding:8px 24px;border-radius:20px;font-weight:600;font-size:16px;">${label}</span>
        </div>
        ${adminNote ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-top:16px;"><p style="margin:0 0 4px;font-size:12px;color:#64748b;font-weight:600;">Note from store:</p><p style="margin:0;font-size:14px;color:#334155;">${adminNote}</p></div>` : ""}
        ${status === "refunded" && ret.refund_amount ? `<p style="margin-top:16px;font-size:14px;color:#334155;">Refund amount: <strong>${ret.refund_amount}</strong></p>` : ""}
      </div>
    </div>
  </body></html>`;
  const text = `Return Request Update
Order: #${ret.order_number}
Status: ${label}${adminNote ? "\nNote: " + adminNote : ""}`;
  return { html, text };
}
__name(buildReturnStatusEmail, "buildReturnStatusEmail");
async function sendOrderEmails(env, siteId, orderData) {
  try {
    const config = await getSiteConfig(env, siteId);
    if (!config.site_id)
      return;
    const siteBrandName = config.brand_name || "Store";
    let siteSettings = {};
    try {
      if (config.settings)
        siteSettings = typeof config.settings === "string" ? JSON.parse(config.settings) : config.settings;
    } catch (e) {
    }
    const ownerEmail = siteSettings.email || siteSettings.ownerEmail || config.email;
    const currency = orderData.currency || siteSettings.defaultCurrency || "INR";
    const storeTz = siteSettings.timezone || "";
    const emailOrder = {
      order_number: orderData.orderNumber,
      items: orderData.processedItems,
      subtotal: orderData.subtotal,
      discount: orderData.discount || 0,
      coupon_code: orderData.coupon_code || null,
      shipping_cost: orderData.shippingCost || 0,
      total: orderData.total,
      payment_method: orderData.paymentMethod,
      customer_name: orderData.customerName,
      customer_email: orderData.customerEmail,
      customer_phone: orderData.customerPhone,
      shipping_address: orderData.shippingAddress,
      created_at: orderData.created_at
    };
    const emailJobs = [];
    if (ownerEmail) {
      try {
        const { html, text } = buildNewOrderReviewEmail(emailOrder, siteBrandName, currency, storeTz);
        emailJobs.push(
          sendEmail(env, ownerEmail, `New Order #${orderData.orderNumber} - Review Required - ${siteBrandName}`, html, text).catch((e) => console.error("Owner email send error:", e))
        );
      } catch (buildErr) {
        console.error("Owner email build error:", buildErr);
      }
    }
    await Promise.all(emailJobs);
  } catch (error) {
    console.error("Send order emails error:", error);
  }
}
__name(sendOrderEmails, "sendOrderEmails");
async function ensureCancellationRequestsTable(db) {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS cancellation_requests (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      order_number TEXT,
      order_type TEXT DEFAULT 'order',
      reason TEXT NOT NULL,
      reason_detail TEXT,
      status TEXT DEFAULT 'requested',
      admin_note TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      cancel_token TEXT,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`).run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_cancel_requests_site ON cancellation_requests(site_id)").run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_cancel_requests_order ON cancellation_requests(order_id)").run();
  } catch (e) {
  }
}
__name(ensureCancellationRequestsTable, "ensureCancellationRequestsTable");
async function createCancellationRequest(request, env, orderId) {
  try {
    const data = await request.json();
    const { siteId, reason, reasonDetail, cancelToken } = data;
    if (!siteId || !orderId)
      return errorResponse("siteId and orderId are required");
    if (!reason)
      return errorResponse("Reason is required");
    const db = await resolveSiteDBById(env, siteId);
    await ensureCancellationRequestsTable(db);
    const config = await getSiteConfig(env, siteId);
    let settings = {};
    try {
      if (config.settings)
        settings = typeof config.settings === "string" ? JSON.parse(config.settings) : config.settings;
    } catch (e) {
    }
    if (!settings.cancellationEnabled)
      return errorResponse("Cancellation is not available for this store", 403);
    let order = await db.prepare("SELECT * FROM orders WHERE (id = ? OR order_number = ?) AND site_id = ?").bind(orderId, orderId, siteId).first();
    let orderType = "order";
    if (!order) {
      order = await db.prepare("SELECT * FROM guest_orders WHERE (id = ? OR order_number = ?) AND site_id = ?").bind(orderId, orderId, siteId).first();
      orderType = "guest_order";
    }
    if (!order)
      return errorResponse("Order not found", 404);
    const statusLower = (order.status || "").toLowerCase();
    if (!["pending", "confirmed"].includes(statusLower)) {
      return errorResponse("Only pending or confirmed orders can be cancelled", 400);
    }
    const windowHours = settings.cancellationWindowHours || 24;
    const orderCreated = new Date(order.created_at || order.createdAt);
    const hoursSinceOrder = (Date.now() - orderCreated.getTime()) / (1e3 * 60 * 60);
    if (hoursSinceOrder > windowHours) {
      return errorResponse(`Cancellation window has expired. Orders can only be cancelled within ${windowHours} hours of placing the order.`, 400);
    }
    if (orderType === "guest_order") {
      if (!cancelToken)
        return errorResponse("Cancel token is required for guest orders", 403);
      let storedToken = null;
      try {
        storedToken = order.cancel_token;
      } catch (e) {
      }
      if (!storedToken || storedToken !== cancelToken) {
        return errorResponse("Invalid cancel token", 403);
      }
    } else {
      if (cancelToken) {
        let storedToken = null;
        try {
          storedToken = order.cancel_token;
        } catch (e) {
        }
        if (!storedToken || storedToken !== cancelToken) {
          return errorResponse("Invalid cancel token", 403);
        }
      } else {
        const user = await validateAnyAuth(request, env, { siteId, db });
        if (!user)
          return errorResponse("Authentication required", 401);
        if (!order.user_id || order.user_id !== user.id) {
          return errorResponse("You can only cancel your own orders", 403);
        }
      }
    }
    const existing = await db.prepare("SELECT id FROM cancellation_requests WHERE order_id = ? AND site_id = ?").bind(order.id, siteId).first();
    if (existing)
      return errorResponse("A cancellation request already exists for this order", 409);
    const cancelId = generateId();
    await db.prepare(
      `INSERT INTO cancellation_requests (id, site_id, order_id, order_number, order_type, reason, reason_detail, status, cancel_token, customer_name, customer_email, customer_phone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      cancelId,
      siteId,
      order.id,
      order.order_number,
      orderType,
      reason,
      reasonDetail || null,
      order.cancel_token || null,
      order.customer_name,
      order.customer_email || null,
      order.customer_phone || null
    ).run();
    try {
      const brandName = config.brand_name || "Store";
      const ownerEmail = settings.email || settings.ownerEmail || config.email;
      if (ownerEmail) {
        const { html, text } = buildCancellationRequestNotifyEmail(order, brandName, reason, reasonDetail);
        await sendEmail(env, ownerEmail, `Cancellation Request #${order.order_number} - ${brandName}`, html, text).catch(() => {
        });
      }
    } catch (e) {
    }
    return successResponse({ id: cancelId, status: "requested" }, "Cancellation request submitted successfully");
  } catch (error) {
    console.error("Create cancellation request error:", error);
    return errorResponse("Failed to create cancellation request: " + error.message, 500);
  }
}
__name(createCancellationRequest, "createCancellationRequest");
async function getCancelStatus(request, env, orderId) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    const cancelToken = url.searchParams.get("token");
    if (!siteId)
      return errorResponse("siteId is required");
    const db = await resolveSiteDBById(env, siteId);
    await ensureCancellationRequestsTable(db);
    const req = await db.prepare(
      "SELECT * FROM cancellation_requests WHERE (order_id = ? OR order_number = ?) AND site_id = ?"
    ).bind(orderId, orderId, siteId).first();
    if (!req)
      return successResponse(null, "No cancellation request found");
    if (cancelToken) {
      if (!req.cancel_token || req.cancel_token !== cancelToken) {
        return errorResponse("Invalid token", 403);
      }
    }
    const safeReq = { id: req.id, order_id: req.order_id, order_number: req.order_number, status: req.status, admin_note: req.admin_note, reason: req.reason, reason_detail: req.reason_detail, created_at: req.created_at, updated_at: req.updated_at };
    return successResponse(safeReq);
  } catch (error) {
    console.error("Get cancel status error:", error);
    return errorResponse("Failed to get cancellation status", 500);
  }
}
__name(getCancelStatus, "getCancelStatus");
async function handleCancellationsList(request, env) {
  if (request.method !== "GET")
    return errorResponse("Method not allowed", 405);
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required");
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("SiteAdmin ")) {
      const user = await validateAnyAuth(request, env, { siteId });
      if (!user)
        return errorResponse("Authentication required", 401);
      const site = await env.DB.prepare("SELECT id FROM sites WHERE id = ? AND user_id = ?").bind(siteId, user.id).first();
      if (!site)
        return errorResponse("Unauthorized", 403);
    } else {
      const { validateSiteAdmin: validateSiteAdmin2, hasPermission: hasPermission2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
      const admin = await validateSiteAdmin2(request, env, siteId);
      if (!admin || !hasPermission2(admin, "orders"))
        return errorResponse("Unauthorized", 403);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureCancellationRequestsTable(db);
    const result = await db.prepare(
      "SELECT * FROM cancellation_requests WHERE site_id = ? ORDER BY created_at DESC"
    ).bind(siteId).all();
    return successResponse(result.results || []);
  } catch (error) {
    console.error("List cancellations error:", error);
    return errorResponse("Failed to list cancellations", 500);
  }
}
__name(handleCancellationsList, "handleCancellationsList");
async function handleCancellationUpdate(request, env, cancelId) {
  if (request.method !== "PUT")
    return errorResponse("Method not allowed", 405);
  try {
    const data = await request.json();
    const { siteId, status, adminNote } = data;
    if (!siteId || !cancelId)
      return errorResponse("siteId and cancelId are required");
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("SiteAdmin ")) {
      const user = await validateAnyAuth(request, env, { siteId });
      if (!user)
        return errorResponse("Authentication required", 401);
      const site = await env.DB.prepare("SELECT id FROM sites WHERE id = ? AND user_id = ?").bind(siteId, user.id).first();
      if (!site)
        return errorResponse("Unauthorized", 403);
    } else {
      const { validateSiteAdmin: validateSiteAdmin2, hasPermission: hasPermission2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
      const admin = await validateSiteAdmin2(request, env, siteId);
      if (!admin || !hasPermission2(admin, "orders"))
        return errorResponse("Unauthorized", 403);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureCancellationRequestsTable(db);
    const req = await db.prepare("SELECT * FROM cancellation_requests WHERE id = ? AND site_id = ?").bind(cancelId, siteId).first();
    if (!req)
      return errorResponse("Cancellation request not found", 404);
    const allowedStatuses = ["requested", "approved", "rejected"];
    if (status && !allowedStatuses.includes(status)) {
      return errorResponse("Invalid status. Allowed: " + allowedStatuses.join(", "), 400);
    }
    if (status && req.status !== "requested") {
      return errorResponse(`Cannot change status from '${req.status}'. Only 'requested' cancellations can be approved or rejected.`, 400);
    }
    const updates = ['updated_at = datetime("now")'];
    const values = [];
    if (status) {
      updates.push("status = ?");
      values.push(status);
    }
    if (adminNote !== void 0) {
      updates.push("admin_note = ?");
      values.push(adminNote);
    }
    values.push(cancelId);
    await db.prepare(`UPDATE cancellation_requests SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
    if (status === "approved") {
      try {
        const table = req.order_type === "guest_order" ? "guest_orders" : "orders";
        const order = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(req.order_id).first();
        if (order) {
          const reason = req.reason || adminNote || "Cancellation approved";
          try {
            await db.prepare(`ALTER TABLE ${table} ADD COLUMN cancellation_reason TEXT`).run();
          } catch (e) {
          }
          await db.prepare(`UPDATE ${table} SET status = 'cancelled', cancellation_reason = ? WHERE id = ?`).bind(reason, req.order_id).run();
          let items = [];
          try {
            items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
          } catch (e) {
          }
          for (const item of items) {
            const pid = item.productId || item.product_id;
            if (pid) {
              try {
                await updateProductStock(db, pid, item.quantity, "increment", siteId);
              } catch (e) {
              }
            }
          }
          const config = await getSiteConfig(env, siteId);
          const brandName = config.brand_name || "Store";
          let settings = {};
          try {
            if (config.settings)
              settings = typeof config.settings === "string" ? JSON.parse(config.settings) : config.settings;
          } catch (e) {
          }
          const ownerEmail = settings.email || settings.ownerEmail || config.email;
          const currency = order.currency || settings.defaultCurrency || "INR";
          const storeTz = settings.timezone || "";
          if (order.customer_email) {
            const emailOrder = { order_number: order.order_number, customer_name: order.customer_name, customer_email: order.customer_email, total: order.total, payment_method: order.payment_method, created_at: order.created_at };
            const { html, text } = buildCancellationCustomerEmail(emailOrder, brandName, reason, ownerEmail, currency, storeTz, true);
            await sendEmail(env, order.customer_email, `Cancellation approved - Order #${order.order_number} - ${brandName}`, html, text).catch(() => {
            });
          }
        }
      } catch (e) {
        console.error("Cancellation approval processing error:", e);
      }
    }
    if (status === "rejected" && req.customer_email) {
      try {
        const config = await getSiteConfig(env, siteId);
        const brandName = config.brand_name || "Store";
        const updatedReq = { ...req, status, admin_note: adminNote !== void 0 ? adminNote : req.admin_note };
        const { html, text } = buildCancellationStatusEmail(updatedReq, brandName, status, adminNote);
        await sendEmail(env, req.customer_email, `Cancellation Update #${req.order_number} - ${brandName}`, html, text).catch(() => {
        });
      } catch (e) {
      }
    }
    return successResponse(null, "Cancellation request updated");
  } catch (error) {
    console.error("Update cancellation error:", error);
    return errorResponse("Failed to update cancellation request", 500);
  }
}
__name(handleCancellationUpdate, "handleCancellationUpdate");
async function resendCancelLink(request, env, orderId) {
  try {
    const data = await request.json();
    const { siteId, email } = data;
    if (!siteId || !orderId || !email)
      return errorResponse("siteId, orderId and email are required");
    const db = await resolveSiteDBById(env, siteId);
    let order = await db.prepare("SELECT * FROM orders WHERE (id = ? OR order_number = ?) AND site_id = ? AND customer_email = ?").bind(orderId, orderId, siteId, email).first();
    let isGuest = false;
    if (!order) {
      order = await db.prepare("SELECT * FROM guest_orders WHERE (id = ? OR order_number = ?) AND site_id = ? AND customer_email = ?").bind(orderId, orderId, siteId, email).first();
      isGuest = true;
    }
    if (!order)
      return errorResponse("Order not found or email does not match", 404);
    const statusLower = (order.status || "").toLowerCase();
    if (!["pending", "confirmed"].includes(statusLower)) {
      return errorResponse("This order can no longer be cancelled", 400);
    }
    let cancelToken = null;
    try {
      cancelToken = order.cancel_token;
    } catch (e) {
    }
    if (!cancelToken) {
      cancelToken = generateReturnToken();
      const table = isGuest ? "guest_orders" : "orders";
      try {
        await db.prepare(`ALTER TABLE ${table} ADD COLUMN cancel_token TEXT`).run();
      } catch (e) {
      }
      await db.prepare(`UPDATE ${table} SET cancel_token = ? WHERE id = ?`).bind(cancelToken, order.id).run();
    }
    const site = await env.DB.prepare("SELECT subdomain, custom_domain FROM sites WHERE id = ?").bind(siteId).first();
    const domain = site?.custom_domain || `${site?.subdomain || "store"}.${env.DOMAIN || PLATFORM_DOMAIN}`;
    const cancelUrl = `https://${domain}/cancel/${order.order_number || order.id}?token=${cancelToken}`;
    const config = await getSiteConfig(env, siteId);
    const brandName = config.brand_name || "Store";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
      <div style="max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#0f172a;color:#fff;padding:32px;text-align:center;">
          <h1 style="margin:0;font-size:24px;font-weight:700;">${brandName}</h1>
        </div>
        <div style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#0f172a;">Your Cancellation Link</h2>
          <p style="color:#64748b;font-size:14px;line-height:1.6;">Use the link below to submit a cancellation request for order <strong>#${order.order_number}</strong>:</p>
          <div style="margin:24px 0;text-align:center;">
            <a href="${cancelUrl}" style="display:inline-block;background:#e53935;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Cancel Order</a>
          </div>
          <p style="color:#94a3b8;font-size:12px;">If the button doesn't work, copy this link: ${cancelUrl}</p>
        </div>
      </div>
    </body></html>`;
    const text = `Your cancellation link for order #${order.order_number}: ${cancelUrl}`;
    await sendEmail(env, email, `Cancellation Link for Order #${order.order_number} - ${brandName}`, html, text);
    return successResponse(null, "Cancellation link sent to your email");
  } catch (error) {
    console.error("Resend cancel link error:", error);
    return errorResponse("Failed to send cancellation link", 500);
  }
}
__name(resendCancelLink, "resendCancelLink");
async function getInvoiceData(request, env, orderId) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId || !orderId)
      return errorResponse("siteId and orderId are required", 400);
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("SiteAdmin ")) {
      return errorResponse("Unauthorized", 401);
    }
    const { validateSiteAdmin: validateSiteAdmin2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
    const admin = await validateSiteAdmin2(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    const db = await resolveSiteDBById(env, siteId);
    let order = await db.prepare("SELECT * FROM orders WHERE id = ? AND site_id = ?").bind(orderId, siteId).first();
    let isGuest = false;
    if (!order) {
      order = await db.prepare("SELECT * FROM guest_orders WHERE id = ? AND site_id = ?").bind(orderId, siteId).first();
      isGuest = true;
    }
    if (!order)
      return errorResponse("Order not found", 404);
    let items = [];
    try {
      items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
    } catch (e) {
    }
    const enrichedItems = await Promise.all(items.map(async (item) => {
      let hsnCode = null;
      let gstRate = 0;
      try {
        if (item.productId || item.product_id || item.id) {
          const pid = item.productId || item.product_id || item.id;
          const prod = await db.prepare("SELECT hsn_code, gst_rate FROM products WHERE id = ? AND site_id = ?").bind(pid, siteId).first();
          if (prod) {
            hsnCode = prod.hsn_code;
            gstRate = prod.gst_rate || 0;
          }
        }
      } catch (e) {
      }
      return { ...item, hsnCode, gstRate };
    }));
    const config = await getSiteConfig(env, siteId);
    let settings = {};
    try {
      settings = typeof config.settings === "string" ? JSON.parse(config.settings) : config.settings || {};
    } catch (e) {
    }
    const gstConfig = {
      gstin: settings.gstin || null,
      legalName: settings.gstLegalName || config.brand_name || "",
      state: settings.gstState || null,
      address: settings.gstAddress || config.address || "",
      brandName: config.brand_name || "Store"
    };
    let shippingAddress = order.shipping_address;
    try {
      if (typeof shippingAddress === "string")
        shippingAddress = JSON.parse(shippingAddress);
    } catch (e) {
    }
    return successResponse({
      order: {
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        status: order.status,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        customer_gstin: order.customer_gstin || null,
        shipping_address: shippingAddress,
        subtotal: order.subtotal,
        discount: order.discount || 0,
        shipping_cost: order.shipping_cost || 0,
        tax: order.tax || 0,
        total: order.total,
        currency: order.currency || "INR",
        payment_method: order.payment_method,
        coupon_code: order.coupon_code || null,
        items: enrichedItems,
        isGuest
      },
      gstConfig
    });
  } catch (error) {
    console.error("Get invoice data error:", error);
    return errorResponse("Failed to fetch invoice data", 500);
  }
}
__name(getInvoiceData, "getInvoiceData");
async function getPublicInvoice(request, env) {
  try {
    const url = new URL(request.url);
    const orderNumber = url.searchParams.get("orderNumber");
    const token = url.searchParams.get("t");
    const subdomain = url.searchParams.get("subdomain");
    if (!orderNumber || !token)
      return errorResponse("orderNumber and token are required", 400);
    let db = null;
    let siteId = null;
    if (subdomain) {
      const site = await env.DB.prepare("SELECT id FROM sites WHERE subdomain = ?").bind(subdomain).first();
      if (site) {
        siteId = site.id;
        db = await resolveSiteDBById(env, siteId);
      }
    }
    if (!db)
      return errorResponse("Store not found", 404);
    let order = await db.prepare("SELECT * FROM orders WHERE order_number = ? AND site_id = ? AND invoice_token = ?").bind(orderNumber, siteId, token).first();
    let isGuest = false;
    if (!order) {
      order = await db.prepare("SELECT * FROM guest_orders WHERE order_number = ? AND site_id = ? AND invoice_token = ?").bind(orderNumber, siteId, token).first();
      isGuest = true;
    }
    if (!order)
      return errorResponse("Invoice not found or invalid token", 404);
    let items = [];
    try {
      items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
    } catch (e) {
    }
    const enrichedItems = await Promise.all(items.map(async (item) => {
      let hsnCode = null;
      let gstRate = 0;
      try {
        const pid = item.productId || item.product_id || item.id;
        if (pid) {
          const prod = await db.prepare("SELECT hsn_code, gst_rate FROM products WHERE id = ? AND site_id = ?").bind(pid, siteId).first();
          if (prod) {
            hsnCode = prod.hsn_code;
            gstRate = prod.gst_rate || 0;
          }
        }
      } catch (e) {
      }
      return { ...item, hsnCode, gstRate };
    }));
    const config = await getSiteConfig(env, siteId);
    let settings = {};
    try {
      settings = typeof config.settings === "string" ? JSON.parse(config.settings) : config.settings || {};
    } catch (e) {
    }
    const gstConfig = {
      gstin: settings.gstin || null,
      legalName: settings.gstLegalName || config.brand_name || "",
      state: settings.gstState || null,
      address: settings.gstAddress || config.address || "",
      brandName: config.brand_name || "Store"
    };
    let shippingAddress = order.shipping_address;
    try {
      if (typeof shippingAddress === "string")
        shippingAddress = JSON.parse(shippingAddress);
    } catch (e) {
    }
    return successResponse({
      order: {
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        status: order.status,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        customer_gstin: order.customer_gstin || null,
        shipping_address: shippingAddress,
        subtotal: order.subtotal,
        discount: order.discount || 0,
        shipping_cost: order.shipping_cost || 0,
        tax: order.tax || 0,
        total: order.total,
        currency: order.currency || "INR",
        payment_method: order.payment_method,
        coupon_code: order.coupon_code || null,
        items: enrichedItems,
        isGuest
      },
      gstConfig
    });
  } catch (error) {
    console.error("Get public invoice error:", error);
    return errorResponse("Failed to fetch invoice", 500);
  }
}
__name(getPublicInvoice, "getPublicInvoice");
async function getAnalytics(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("SiteAdmin ")) {
      return errorResponse("Unauthorized", 401);
    }
    const { validateSiteAdmin: validateSiteAdmin2, hasPermission: hasPermission2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
    const admin = await validateSiteAdmin2(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!hasPermission2(admin, "analytics") && !hasPermission2(admin, "orders")) {
      return errorResponse("No permission", 403);
    }
    const db = await resolveSiteDBById(env, siteId);
    if (!db)
      return errorResponse("Site database not found", 404);
    const dateFilter = [];
    const dateBindings = [];
    if (from) {
      dateFilter.push("created_at >= ?");
      dateBindings.push(from);
    }
    if (to) {
      dateFilter.push("created_at <= ?");
      dateBindings.push(to + " 23:59:59");
    }
    const dateWhere = dateFilter.length ? " AND " + dateFilter.join(" AND ") : "";
    const revenueStatuses = "('confirmed','packed','shipped','delivered')";
    const summaryQuery = `
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status IN ${revenueStatuses} THEN total ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status IN ${revenueStatuses} THEN tax ELSE 0 END), 0) as total_tax,
        COALESCE(SUM(CASE WHEN status IN ${revenueStatuses} THEN shipping_cost ELSE 0 END), 0) as total_shipping,
        COALESCE(SUM(CASE WHEN status IN ${revenueStatuses} THEN discount ELSE 0 END), 0) as total_discount
      FROM (
        SELECT total, tax, shipping_cost, discount, status, created_at FROM orders WHERE site_id = ?${dateWhere}
        UNION ALL
        SELECT total, tax, shipping_cost, discount, status, created_at FROM guest_orders WHERE site_id = ?${dateWhere}
      )
    `;
    const summaryBindings = [siteId, ...dateBindings, siteId, ...dateBindings];
    const summary = await db.prepare(summaryQuery).bind(...summaryBindings).first();
    const revenueCount = summary.total_orders > 0 ? (await db.prepare(`
        SELECT COUNT(*) as c FROM (
          SELECT id FROM orders WHERE site_id = ? AND status IN ${revenueStatuses}${dateWhere}
          UNION ALL
          SELECT id FROM guest_orders WHERE site_id = ? AND status IN ${revenueStatuses}${dateWhere}
        )
      `).bind(siteId, ...dateBindings, siteId, ...dateBindings).first()).c : 0;
    const avgOrderValue = revenueCount > 0 ? Math.round(summary.total_revenue / revenueCount * 100) / 100 : 0;
    const dailyQuery = `
      SELECT date(created_at) as day,
        SUM(CASE WHEN status IN ${revenueStatuses} THEN total ELSE 0 END) as revenue,
        COUNT(*) as orders
      FROM (
        SELECT total, status, created_at FROM orders WHERE site_id = ?${dateWhere}
        UNION ALL
        SELECT total, status, created_at FROM guest_orders WHERE site_id = ?${dateWhere}
      )
      GROUP BY date(created_at)
      ORDER BY day ASC
    `;
    const dailyResult = await db.prepare(dailyQuery).bind(siteId, ...dateBindings, siteId, ...dateBindings).all();
    const paymentQuery = `
      SELECT payment_method,
        COUNT(*) as order_count,
        COALESCE(SUM(CASE WHEN status IN ${revenueStatuses} THEN total ELSE 0 END), 0) as revenue
      FROM (
        SELECT payment_method, total, status, created_at FROM orders WHERE site_id = ?${dateWhere}
        UNION ALL
        SELECT payment_method, total, status, created_at FROM guest_orders WHERE site_id = ?${dateWhere}
      )
      GROUP BY payment_method
    `;
    const paymentResult = await db.prepare(paymentQuery).bind(siteId, ...dateBindings, siteId, ...dateBindings).all();
    const statusQuery = `
      SELECT status, COUNT(*) as count FROM (
        SELECT status, created_at FROM orders WHERE site_id = ?${dateWhere}
        UNION ALL
        SELECT status, created_at FROM guest_orders WHERE site_id = ?${dateWhere}
      )
      GROUP BY status
    `;
    const statusResult = await db.prepare(statusQuery).bind(siteId, ...dateBindings, siteId, ...dateBindings).all();
    const topProductsQuery = `
      SELECT items, status, created_at, shipping_address FROM orders WHERE site_id = ? AND status IN ${revenueStatuses}${dateWhere}
      UNION ALL
      SELECT items, status, created_at, shipping_address FROM guest_orders WHERE site_id = ? AND status IN ${revenueStatuses}${dateWhere}
    `;
    const itemsResult = await db.prepare(topProductsQuery).bind(siteId, ...dateBindings, siteId, ...dateBindings).all();
    let gstState = "";
    try {
      const siteConfGst = await getSiteConfig(env, siteId);
      if (siteConfGst?.settings) {
        const sg = typeof siteConfGst.settings === "string" ? JSON.parse(siteConfGst.settings) : siteConfGst.settings;
        gstState = (sg.gstState || "").toLowerCase().trim();
      }
    } catch (e) {
    }
    const productMap = {};
    let totalCGST = 0, totalSGST = 0, totalIGST = 0;
    for (const row of itemsResult.results) {
      let items = [];
      try {
        items = JSON.parse(row.items);
      } catch {
      }
      let customerState = "";
      try {
        const addr = typeof row.shipping_address === "string" ? JSON.parse(row.shipping_address) : row.shipping_address;
        customerState = (addr?.state || "").toLowerCase().trim();
      } catch {
      }
      const isIntraState = gstState && customerState && gstState === customerState;
      for (const item of items) {
        const key = item.productId || item.product_id || item.name || item.title;
        if (!productMap[key]) {
          productMap[key] = { name: item.name || item.title || "Unknown", quantity: 0, revenue: 0, image: item.thumbnail || item.image || item.images?.[0] || null };
        }
        const qty = item.quantity || 1;
        const price = (item.price || 0) * qty;
        productMap[key].quantity += qty;
        productMap[key].revenue += price;
        const gstRate = Number(item.gst_rate) || 0;
        if (gstRate > 0) {
          const gstAmount = price * gstRate / 100;
          if (isIntraState) {
            totalCGST += gstAmount / 2;
            totalSGST += gstAmount / 2;
          } else {
            totalIGST += gstAmount;
          }
        }
      }
    }
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    return successResponse({
      summary: {
        totalRevenue: summary.total_revenue,
        totalOrders: summary.total_orders,
        revenueOrders: revenueCount,
        avgOrderValue,
        totalTax: Math.round((totalCGST + totalSGST + totalIGST) * 100) / 100 || summary.total_tax,
        totalShipping: summary.total_shipping,
        totalDiscount: summary.total_discount
      },
      dailyRevenue: dailyResult.results,
      paymentMethodSplit: paymentResult.results,
      statusBreakdown: statusResult.results,
      topProducts,
      gstBreakdown: {
        cgst: Math.round(totalCGST * 100) / 100,
        sgst: Math.round(totalSGST * 100) / 100,
        igst: Math.round(totalIGST * 100) / 100,
        total: Math.round((totalCGST + totalSGST + totalIGST) * 100) / 100
      }
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return errorResponse("Failed to fetch analytics", 500);
  }
}
__name(getAnalytics, "getAnalytics");

// workers/storefront/cart-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
init_site_db();
init_usage_tracker();
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
  const db = await resolveSiteDBById(env, siteId);
  const user = await validateAnyAuth(request, env, { siteId, db });
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
  const siteId = url.searchParams.get("siteId");
  const sessionId = url.searchParams.get("sessionId");
  if (!siteId)
    return errorResponse("Site ID is required");
  const db = await resolveSiteDBById(env, siteId);
  const user = await validateAnyAuth(request, env, { siteId, db });
  if (!user && !sessionId)
    return errorResponse("Authentication or session required");
  try {
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    let cart = null;
    if (user) {
      cart = await db.prepare(
        "SELECT id, row_size_bytes FROM carts WHERE site_id = ? AND user_id = ?"
      ).bind(siteId, user.id).first();
    } else {
      cart = await db.prepare(
        "SELECT id, row_size_bytes FROM carts WHERE site_id = ? AND session_id = ?"
      ).bind(siteId, sessionId).first();
    }
    if (cart) {
      const oldBytes = cart.row_size_bytes || 0;
      const emptyCartData = { id: cart.id, site_id: siteId, items: "[]", subtotal: 0 };
      const newBytes = estimateRowBytes(emptyCartData);
      await db.prepare(
        `UPDATE carts SET items = '[]', subtotal = 0, row_size_bytes = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(newBytes, cart.id).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    }
    return successResponse(null, "Cart cleared");
  } catch (error) {
    console.error("Clear cart error:", error);
    return errorResponse("Failed to clear cart", 500);
  }
}
__name(handleClearCart, "handleClearCart");
async function handleMergeCarts(request, env) {
  const url = new URL(request.url);
  const urlSiteId = url.searchParams.get("siteId");
  const clonedRequest = request.clone();
  const body = await clonedRequest.json();
  const siteId = urlSiteId || body.siteId;
  const sessionId = body.sessionId;
  if (!siteId || !sessionId)
    return errorResponse("siteId and sessionId are required");
  const db = await resolveSiteDBById(env, siteId);
  const user = await validateAnyAuth(request, env, { siteId, db });
  if (!user)
    return errorResponse("Authentication required", 401);
  try {
    await mergeCarts(env, siteId, user.id, sessionId);
    return successResponse(null, "Carts merged");
  } catch (error) {
    console.error("Merge carts error:", error);
    return errorResponse("Failed to merge carts", 500);
  }
}
__name(handleMergeCarts, "handleMergeCarts");
async function getOrCreateCart(db, env, siteId, user, sessionId) {
  let cart;
  if (user) {
    cart = await db.prepare(
      "SELECT * FROM carts WHERE site_id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
  } else {
    cart = await db.prepare(
      "SELECT * FROM carts WHERE site_id = ? AND session_id = ?"
    ).bind(siteId, sessionId).first();
  }
  if (!cart) {
    const cartId = generateId();
    const rowData = { id: cartId, site_id: siteId, user_id: user ? user.id : null, session_id: user ? null : sessionId, items: "[]" };
    const rowBytes = estimateRowBytes(rowData);
    await db.prepare(
      `INSERT INTO carts (id, site_id, user_id, session_id, items, subtotal, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, '[]', 0, ?, datetime('now'))`
    ).bind(cartId, siteId, user ? user.id : null, user ? null : sessionId, rowBytes).run();
    await trackD1Write(env, siteId, rowBytes);
    cart = { id: cartId, items: "[]", subtotal: 0, row_size_bytes: rowBytes };
  }
  return cart;
}
__name(getOrCreateCart, "getOrCreateCart");
async function getCart(env, siteId, user, sessionId) {
  try {
    const db = await resolveSiteDBById(env, siteId);
    await ensureProductOptionsColumn(db, siteId);
    const cart = await getOrCreateCart(db, env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const enrichedItems = [];
    for (const item of items) {
      const product = await db.prepare(
        "SELECT id, name, slug, price, stock, thumbnail_url, images, is_active, options FROM products WHERE id = ? AND site_id = ?"
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
        let effectivePrice = product.price;
        const productOptions = product.options ? JSON.parse(product.options) : null;
        if (item.selectedOptions?.pricedOptions && productOptions?.pricedOptions) {
          const pricedEntries = Object.entries(item.selectedOptions.pricedOptions);
          const lastEntry = pricedEntries[pricedEntries.length - 1];
          if (lastEntry) {
            const [label, clientVal] = lastEntry;
            const optGroup = productOptions.pricedOptions.find((o) => o.label === label);
            if (optGroup) {
              const dbVal = optGroup.values.find((v) => v.name === clientVal.name);
              if (dbVal && Number(dbVal.price) > 0)
                effectivePrice = Number(dbVal.price);
            }
          }
        }
        enrichedItems.push({
          ...item,
          name: product.name,
          slug: product.slug || null,
          price: effectivePrice,
          basePrice: product.price,
          thumbnail: imageUrl,
          inStock: product.stock >= item.quantity,
          availableStock: product.stock,
          selectedOptions: item.selectedOptions || null
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
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const { productId, quantity, variant, selectedOptions } = await request.json();
    if (!productId || !quantity || quantity < 1) {
      return errorResponse("Product ID and quantity are required");
    }
    const db = await resolveSiteDBById(env, siteId);
    const product = await db.prepare(
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
    const cart = await getOrCreateCart(db, env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const oldBytes = cart.row_size_bytes || 0;
    const optionsKey = selectedOptions ? JSON.stringify(selectedOptions) : null;
    const existingIndex = items.findIndex(
      (item) => item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant) && JSON.stringify(item.selectedOptions || null) === optionsKey
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
        selectedOptions: selectedOptions || null,
        addedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    const newItemsStr = JSON.stringify(items);
    const newBytes = estimateRowBytes({ items: newItemsStr, cart_id: cart.id });
    await db.prepare(
      `UPDATE carts SET items = ?, row_size_bytes = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newItemsStr, newBytes, cart.id).run();
    await trackD1Update(env, siteId, oldBytes, newBytes);
    return successResponse({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }, "Item added to cart");
  } catch (error) {
    console.error("Add to cart error:", error);
    return errorResponse("Failed to add item to cart", 500);
  }
}
__name(addToCart, "addToCart");
async function updateCartItem(request, env, siteId, user, sessionId) {
  try {
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const { productId, quantity, variant, selectedOptions } = await request.json();
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    const db = await resolveSiteDBById(env, siteId);
    const cart = await getOrCreateCart(db, env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const oldBytes = cart.row_size_bytes || 0;
    const optionsKey = selectedOptions ? JSON.stringify(selectedOptions) : null;
    const existingIndex = items.findIndex(
      (item) => item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant) && JSON.stringify(item.selectedOptions || null) === optionsKey
    );
    if (existingIndex < 0) {
      return errorResponse("Item not found in cart", 404);
    }
    if (quantity <= 0) {
      items.splice(existingIndex, 1);
    } else {
      const product = await db.prepare(
        "SELECT stock FROM products WHERE id = ? AND site_id = ?"
      ).bind(productId, siteId).first();
      if (product && quantity > product.stock) {
        return errorResponse("Insufficient stock", 400, "INSUFFICIENT_STOCK");
      }
      items[existingIndex].quantity = quantity;
    }
    const newItemsStr = JSON.stringify(items);
    const newBytes = estimateRowBytes({ items: newItemsStr, cart_id: cart.id });
    await db.prepare(
      `UPDATE carts SET items = ?, row_size_bytes = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newItemsStr, newBytes, cart.id).run();
    await trackD1Update(env, siteId, oldBytes, newBytes);
    return successResponse({ itemCount: items.reduce((sum, i) => sum + i.quantity, 0) }, "Cart updated");
  } catch (error) {
    console.error("Update cart error:", error);
    return errorResponse("Failed to update cart", 500);
  }
}
__name(updateCartItem, "updateCartItem");
async function removeFromCart(request, env, siteId, user, sessionId) {
  try {
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    const variant = url.searchParams.get("variant");
    const optionsParam = url.searchParams.get("selectedOptions");
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    const db = await resolveSiteDBById(env, siteId);
    const cart = await getOrCreateCart(db, env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const oldBytes = cart.row_size_bytes || 0;
    const parsedVariant = variant ? variant : null;
    const parsedOptions = optionsParam ? optionsParam : null;
    const filteredItems = items.filter((item) => {
      if (item.productId !== productId)
        return true;
      if (JSON.stringify(item.variant ?? null) !== JSON.stringify(parsedVariant))
        return true;
      if (parsedOptions && JSON.stringify(item.selectedOptions || null) !== parsedOptions)
        return true;
      return false;
    });
    const newItemsStr = JSON.stringify(filteredItems);
    const newBytes = estimateRowBytes({ items: newItemsStr, cart_id: cart.id });
    await db.prepare(
      `UPDATE carts SET items = ?, row_size_bytes = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(newItemsStr, newBytes, cart.id).run();
    await trackD1Update(env, siteId, oldBytes, newBytes);
    return successResponse({ itemCount: filteredItems.reduce((sum, i) => sum + i.quantity, 0) }, "Item removed from cart");
  } catch (error) {
    console.error("Remove from cart error:", error);
    return errorResponse("Failed to remove item from cart", 500);
  }
}
__name(removeFromCart, "removeFromCart");
async function mergeCarts(env, siteId, userId, sessionId) {
  try {
    const db = await resolveSiteDBById(env, siteId);
    const guestCart = await db.prepare(
      "SELECT * FROM carts WHERE site_id = ? AND session_id = ?"
    ).bind(siteId, sessionId).first();
    if (!guestCart)
      return;
    const userCart = await db.prepare(
      "SELECT * FROM carts WHERE site_id = ? AND user_id = ?"
    ).bind(siteId, userId).first();
    const guestItems = JSON.parse(guestCart.items);
    if (userCart) {
      const userItems = JSON.parse(userCart.items);
      const oldBytes = userCart.row_size_bytes || 0;
      for (const guestItem of guestItems) {
        const existingIndex = userItems.findIndex(
          (item) => item.productId === guestItem.productId && JSON.stringify(item.variant) === JSON.stringify(guestItem.variant) && JSON.stringify(item.selectedOptions || null) === JSON.stringify(guestItem.selectedOptions || null)
        );
        if (existingIndex >= 0) {
          userItems[existingIndex].quantity += guestItem.quantity;
        } else {
          userItems.push(guestItem);
        }
      }
      const newItemsStr = JSON.stringify(userItems);
      const newBytes = estimateRowBytes({ items: newItemsStr, cart_id: userCart.id });
      await db.prepare(
        `UPDATE carts SET items = ?, row_size_bytes = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(newItemsStr, newBytes, userCart.id).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    } else {
      await db.prepare(
        `UPDATE carts SET user_id = ?, session_id = NULL, updated_at = datetime('now') WHERE id = ?`
      ).bind(userId, guestCart.id).run();
      return;
    }
    const guestBytes = guestCart.row_size_bytes || 0;
    await db.prepare("DELETE FROM carts WHERE id = ?").bind(guestCart.id).run();
    if (guestBytes > 0) {
      await trackD1Delete(env, siteId, guestBytes);
    }
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
init_site_db();
init_usage_tracker();
async function handleWishlist(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const pathParts = path.split("/").filter(Boolean);
  const subAction = pathParts[2];
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId");
  if (subAction === "check") {
    return checkWishlist(request, env, siteId);
  }
  if (!siteId) {
    return errorResponse("Site ID is required");
  }
  const db = await resolveSiteDBById(env, siteId);
  const user = await validateAnyAuth(request, env, { siteId, db });
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  const method = request.method;
  switch (method) {
    case "GET":
      return getWishlist(env, user, siteId, db);
    case "POST":
      return addToWishlist(request, env, user, siteId, db);
    case "DELETE":
      return removeFromWishlist(request, env, user, siteId, db);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleWishlist, "handleWishlist");
async function checkWishlist(request, env, siteId) {
  const url = new URL(request.url);
  if (!siteId)
    siteId = url.searchParams.get("siteId");
  const productId = url.searchParams.get("productId");
  if (!siteId || !productId) {
    return errorResponse("siteId and productId are required");
  }
  const db = await resolveSiteDBById(env, siteId);
  const user = await validateAnyAuth(request, env, { siteId, db });
  if (!user) {
    return successResponse({ inWishlist: false });
  }
  try {
    const existing = await db.prepare(
      "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?"
    ).bind(user.id, productId, siteId).first();
    return successResponse({ inWishlist: !!existing });
  } catch (error) {
    console.error("Check wishlist error:", error);
    return successResponse({ inWishlist: false });
  }
}
__name(checkWishlist, "checkWishlist");
async function getWishlist(env, user, siteId, db) {
  try {
    const wishlistItems = await db.prepare(
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
async function addToWishlist(request, env, user, siteId, db) {
  try {
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const { productId } = await request.json();
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    const product = await db.prepare(
      "SELECT id FROM products WHERE id = ? AND site_id = ? AND is_active = 1"
    ).bind(productId, siteId).first();
    if (!product) {
      return errorResponse("Product not found", 404);
    }
    const existing = await db.prepare(
      "SELECT id FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?"
    ).bind(user.id, productId, siteId).first();
    if (existing) {
      return errorResponse("Product already in wishlist", 400, "ALREADY_EXISTS");
    }
    const wishlistId = generateId();
    const rowData = { id: wishlistId, site_id: siteId, user_id: user.id, product_id: productId };
    const rowBytes = estimateRowBytes(rowData);
    await db.prepare(
      `INSERT INTO wishlists (id, site_id, user_id, product_id, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(wishlistId, siteId, user.id, productId, rowBytes).run();
    await trackD1Write(env, siteId, rowBytes);
    return successResponse({ id: wishlistId }, "Added to wishlist");
  } catch (error) {
    console.error("Add to wishlist error:", error);
    return errorResponse("Failed to add to wishlist", 500);
  }
}
__name(addToWishlist, "addToWishlist");
async function removeFromWishlist(request, env, user, siteId, db) {
  try {
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    const existing = await db.prepare(
      "SELECT id, row_size_bytes FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?"
    ).bind(user.id, productId, siteId).first();
    if (existing) {
      await db.prepare(
        "DELETE FROM wishlists WHERE user_id = ? AND product_id = ? AND site_id = ?"
      ).bind(user.id, productId, siteId).run();
      const bytesToRemove = existing.row_size_bytes || 0;
      if (bytesToRemove > 0) {
        await trackD1Delete(env, siteId, bytesToRemove);
      }
    }
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
init_site_db();
init_usage_tracker();
import crypto2 from "node:crypto";
async function handlePayments(request, env, path, ctx2) {
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
    case "cancel-subscription":
      return handleCancelSubscription(request, env);
    case "plans":
      return getPublicPlans(request, env);
    case "webhook":
      return handleRazorpayWebhook(request, env);
    default:
      return errorResponse("Not found", 404);
  }
}
__name(handlePayments, "handlePayments");
async function getRazorpayCredentials(env, siteId) {
  if (siteId) {
    try {
      const config = await getSiteConfig(env, siteId);
      if (config.settings) {
        let settings = config.settings;
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
  const platformKeyId = await getPlatformRazorpayKeyId(env);
  return { keyId: platformKeyId || env.RAZORPAY_KEY_ID, keySecret: env.RAZORPAY_KEY_SECRET, perSite: false };
}
__name(getRazorpayCredentials, "getRazorpayCredentials");
async function getPlatformRazorpayKeyId(env) {
  try {
    const setting = await env.DB.prepare(
      `SELECT setting_value FROM platform_settings WHERE setting_key = 'razorpay_key_id'`
    ).first();
    return setting?.setting_value || null;
  } catch {
    return null;
  }
}
__name(getPlatformRazorpayKeyId, "getPlatformRazorpayKeyId");
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
    await ensurePaymentTablesExist(env);
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, razorpay_subscription_id, planId, billingCycle, siteId, orderId } = await request.json();
    if (razorpay_subscription_id) {
      return verifySubscriptionPayment(request, env, { razorpay_subscription_id, razorpay_payment_id, razorpay_signature, planId, billingCycle });
    }
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse("Missing payment verification data");
    }
    const { keySecret } = await getRazorpayCredentials(env, siteId);
    if (!keySecret) {
      return errorResponse("Razorpay credentials not configured", 500);
    }
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const computedSignature = crypto2.createHmac("sha256", keySecret).update(body).digest("hex");
    if (computedSignature !== razorpay_signature) {
      return errorResponse("Invalid payment signature", 400, "INVALID_SIGNATURE");
    }
    const existingTx = await env.DB.prepare(
      `SELECT order_id, status FROM payment_transactions WHERE razorpay_order_id = ?`
    ).bind(razorpay_order_id).first();
    if (existingTx?.status === "completed") {
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
      let orderDb = null;
      let orderSiteId = siteId || null;
      if (orderSiteId) {
        orderDb = await resolveSiteDBById(env, orderSiteId);
        order = await orderDb.prepare("SELECT * FROM orders WHERE id = ?").bind(dbOrderId).first();
      }
      if (!order) {
        const allSites = await env.DB.prepare("SELECT id FROM sites").all();
        for (const s of allSites.results || []) {
          const sdb = await resolveSiteDBById(env, s.id);
          const found = await sdb.prepare("SELECT * FROM orders WHERE id = ?").bind(dbOrderId).first();
          if (found) {
            order = found;
            orderDb = sdb;
            orderSiteId = s.id;
            break;
          }
        }
      }
      if (order && orderDb) {
        const oldOrderBytes = order.row_size_bytes || 0;
        await orderDb.prepare(
          `UPDATE orders SET status = 'paid', payment_status = 'paid', payment_method = 'razorpay', razorpay_order_id = ?, razorpay_payment_id = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(razorpay_order_id, razorpay_payment_id, dbOrderId).run();
        const updatedOrder = await orderDb.prepare("SELECT * FROM orders WHERE id = ?").bind(dbOrderId).first();
        if (updatedOrder && orderSiteId) {
          const newOrderBytes = estimateRowBytes(updatedOrder);
          await orderDb.prepare("UPDATE orders SET row_size_bytes = ? WHERE id = ?").bind(newOrderBytes, dbOrderId).run();
          await trackD1Update(env, orderSiteId, oldOrderBytes, newOrderBytes);
        }
        await processPostPaymentActions(env, order, ctx);
      } else {
        if (orderSiteId) {
          orderDb = orderDb || await resolveSiteDBById(env, orderSiteId);
        }
        try {
          let guestOrder = null;
          let guestDb = null;
          if (orderSiteId && orderDb) {
            guestOrder = await orderDb.prepare("SELECT * FROM guest_orders WHERE id = ?").bind(dbOrderId).first();
            if (guestOrder)
              guestDb = orderDb;
          }
          if (!guestOrder) {
            const allSites = await env.DB.prepare("SELECT id FROM sites").all();
            for (const s of allSites.results || []) {
              const sdb = await resolveSiteDBById(env, s.id);
              const found = await sdb.prepare("SELECT * FROM guest_orders WHERE id = ?").bind(dbOrderId).first();
              if (found) {
                guestOrder = found;
                guestDb = sdb;
                break;
              }
            }
          }
          if (guestOrder && guestDb) {
            const oldGuestBytes = guestOrder.row_size_bytes || 0;
            await guestDb.prepare(
              `UPDATE guest_orders SET status = 'paid', payment_status = 'paid', payment_method = 'razorpay', razorpay_order_id = ?, razorpay_payment_id = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(razorpay_order_id, razorpay_payment_id, dbOrderId).run();
            const updatedGuestOrder = await guestDb.prepare("SELECT * FROM guest_orders WHERE id = ?").bind(dbOrderId).first();
            if (updatedGuestOrder) {
              const newGuestBytes = estimateRowBytes(updatedGuestOrder);
              await guestDb.prepare("UPDATE guest_orders SET row_size_bytes = ? WHERE id = ?").bind(newGuestBytes, dbOrderId).run();
              const guestSiteId = guestOrder.site_id || updatedGuestOrder.site_id;
              if (guestSiteId) {
                await trackD1Update(env, guestSiteId, oldGuestBytes, newGuestBytes);
              }
            }
            await processPostPaymentActions(env, guestOrder, ctx);
          }
        } catch (guestUpdateErr) {
          console.error("Failed to update guest order status:", guestUpdateErr);
        }
      }
    }
    return successResponse({ verified: true }, "Payment verified successfully");
  } catch (error) {
    console.error("Verify payment error:", error);
    return errorResponse("Payment verification failed", 500);
  }
}
__name(verifyPayment, "verifyPayment");
async function verifySubscriptionPayment(request, env, { razorpay_subscription_id, razorpay_payment_id, razorpay_signature }) {
  try {
    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return errorResponse("Razorpay credentials not configured", 500);
    }
    const body = razorpay_payment_id + "|" + razorpay_subscription_id;
    const computedSignature = crypto2.createHmac("sha256", keySecret).update(body).digest("hex");
    if (computedSignature !== razorpay_signature) {
      return errorResponse("Invalid subscription payment signature", 400, "INVALID_SIGNATURE");
    }
    const user = await validateAuth(request, env);
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }
    const pending = await env.DB.prepare(
      `SELECT ps.*, sp.plan_name, sp.billing_cycle, sp.display_price
       FROM pending_subscriptions ps
       JOIN subscription_plans sp ON ps.plan_id = sp.id
       WHERE ps.razorpay_subscription_id = ? AND ps.user_id = ?`
    ).bind(razorpay_subscription_id, user.id).first();
    if (!pending) {
      return errorResponse("No matching pending subscription found. Payment may have been tampered with.", 400);
    }
    const existingActive = await env.DB.prepare(
      `SELECT id FROM subscriptions WHERE razorpay_subscription_id = ? AND status = 'active'`
    ).bind(razorpay_subscription_id).first();
    if (existingActive) {
      return successResponse({ verified: true, planActivated: true, duplicate: true }, "Subscription already activated");
    }
    const activated = await activateSubscription(env, user.id, pending.plan_name, pending.billing_cycle, razorpay_payment_id, razorpay_subscription_id, pending.display_price, pending.site_id || null);
    if (!activated) {
      return errorResponse("Failed to activate subscription", 500);
    }
    try {
      await env.DB.prepare(`DELETE FROM pending_subscriptions WHERE razorpay_subscription_id = ?`).bind(razorpay_subscription_id).run();
    } catch {
    }
    return successResponse({ verified: true, planActivated: true }, "Subscription payment verified and plan activated");
  } catch (error) {
    console.error("Verify subscription payment error:", error);
    return errorResponse("Subscription payment verification failed", 500);
  }
}
__name(verifySubscriptionPayment, "verifySubscriptionPayment");
async function processPostPaymentActions(env, order, ctx2) {
  try {
    const orderItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    for (const item of orderItems) {
      await updateProductStock(env, item.productId, item.quantity, "decrement", order.site_id, ctx2);
    }
  } catch (stockErr) {
    console.error("Failed to decrement stock after payment:", stockErr);
  }
  try {
    const orderItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    const shippingAddress = typeof order.shipping_address === "string" ? JSON.parse(order.shipping_address) : order.shipping_address;
    await sendOrderEmails(env, order.site_id, {
      orderId: order.id,
      orderNumber: order.order_number,
      processedItems: orderItems,
      total: order.total,
      paymentMethod: "razorpay",
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      shippingAddress,
      isGuest: !!order.is_guest,
      currency: order.currency
    });
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
    return createRazorpaySubscription(request, env, user);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handleSubscription, "handleSubscription");
async function handleCancelSubscription(request, env) {
  if (request.method !== "POST")
    return errorResponse("Method not allowed", 405);
  const user = await validateAuth(request, env);
  if (!user)
    return errorResponse("Unauthorized", 401);
  try {
    const { siteId } = await request.json();
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const site = await env.DB.prepare(
      `SELECT id FROM sites WHERE id = ? AND user_id = ?`
    ).bind(siteId, user.id).first();
    if (!site)
      return errorResponse("Site not found or you do not own this site", 403);
    const activeSub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE site_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(siteId).first();
    if (!activeSub)
      return errorResponse("No active subscription found for this site", 404);
    if (activeSub.plan === "trial")
      return errorResponse("Trial subscriptions cannot be cancelled", 400);
    if (activeSub.razorpay_subscription_id) {
      const cancelled = await cancelRazorpaySubscription(env, activeSub.razorpay_subscription_id);
      if (!cancelled) {
        return errorResponse("Failed to cancel subscription with payment provider. Please try again.", 500);
      }
    }
    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
    ).bind(activeSub.id).run();
    return successResponse({
      siteId,
      plan: activeSub.plan,
      periodEnd: activeSub.current_period_end
    }, "Subscription cancelled. You can continue using your plan until " + (activeSub.current_period_end ? new Date(activeSub.current_period_end).toLocaleDateString() : "the end of your billing period") + ".");
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return errorResponse("Failed to cancel subscription", 500);
  }
}
__name(handleCancelSubscription, "handleCancelSubscription");
async function cancelRazorpaySubscription(env, razorpaySubscriptionId) {
  try {
    const platformKeyId = await getPlatformRazorpayKeyId(env);
    const keyId = platformKeyId || env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      console.error("Razorpay credentials not configured for cancellation");
      return false;
    }
    const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${razorpaySubscriptionId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${keyId}:${keySecret}`),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cancel_at_cycle_end: 1 })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Razorpay cancel error:", errorText);
      const errorData = (() => {
        try {
          return JSON.parse(errorText);
        } catch {
          return null;
        }
      })();
      if (errorData?.error?.code === "BAD_REQUEST_ERROR" && errorText.includes("already cancelled")) {
        return true;
      }
      return false;
    }
    console.log("Razorpay subscription cancelled:", razorpaySubscriptionId);
    return true;
  } catch (error) {
    console.error("cancelRazorpaySubscription error:", error);
    return false;
  }
}
__name(cancelRazorpaySubscription, "cancelRazorpaySubscription");
async function getUserSubscription(env, user) {
  try {
    const subscription = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(user.id).first();
    if (subscription) {
      if (subscription.current_period_end && new Date(subscription.current_period_end) < /* @__PURE__ */ new Date()) {
        await env.DB.prepare(
          `UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE id = ?`
        ).bind(subscription.id).run();
        return successResponse({
          id: subscription.id,
          plan: subscription.plan,
          billingCycle: subscription.billing_cycle,
          status: "expired",
          currentPeriodEnd: subscription.current_period_end,
          razorpaySubscriptionId: subscription.razorpay_subscription_id
        });
      }
      return successResponse({
        id: subscription.id,
        plan: subscription.plan,
        billingCycle: subscription.billing_cycle,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        razorpaySubscriptionId: subscription.razorpay_subscription_id
      });
    }
    const latestSub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
    ).bind(user.id).first();
    if (latestSub) {
      return successResponse({
        id: latestSub.id,
        plan: latestSub.plan,
        billingCycle: latestSub.billing_cycle,
        status: latestSub.status,
        currentPeriodEnd: latestSub.current_period_end,
        razorpaySubscriptionId: latestSub.razorpay_subscription_id
      });
    }
    return successResponse({ plan: null, status: "none" });
  } catch (error) {
    console.error("Get subscription error:", error);
    return errorResponse("Failed to fetch subscription", 500);
  }
}
__name(getUserSubscription, "getUserSubscription");
async function createRazorpaySubscription(request, env, user) {
  try {
    const { planId, siteId } = await request.json();
    if (!planId) {
      return errorResponse("Plan ID is required");
    }
    const plan = await env.DB.prepare(
      `SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1`
    ).bind(planId).first();
    if (!plan) {
      return errorResponse("Plan not found or inactive");
    }
    if (!plan.razorpay_plan_id) {
      return errorResponse("This plan is not configured for payments yet");
    }
    if (siteId) {
      const site = await env.DB.prepare(
        `SELECT id FROM sites WHERE id = ? AND user_id = ?`
      ).bind(siteId, user.id).first();
      if (!site) {
        return errorResponse("Site not found or you do not own this site.", 403);
      }
    }
    const platformKeyId = await getPlatformRazorpayKeyId(env);
    const keyId = platformKeyId || env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return errorResponse("Razorpay credentials not configured", 500);
    }
    const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${keyId}:${keySecret}`),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        plan_id: plan.razorpay_plan_id,
        total_count: plan.billing_cycle === "3months" ? 100 : plan.billing_cycle === "6months" ? 50 : plan.billing_cycle === "yearly" ? 25 : 10,
        quantity: 1,
        notes: {
          userId: user.id,
          planId: plan.id,
          planName: plan.plan_name,
          billingCycle: plan.billing_cycle,
          siteId: siteId || ""
        }
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = errorText;
      }
      console.error("Razorpay Subscription Error:", errorData);
      const errorMessage = errorData?.error?.description || "Failed to create subscription";
      return errorResponse(`Razorpay error: ${errorMessage}`, 500);
    }
    const razorpaySub = await response.json();
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS pending_subscriptions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          site_id TEXT,
          plan_id TEXT NOT NULL,
          razorpay_subscription_id TEXT NOT NULL UNIQUE,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `).run();
      try {
        await env.DB.prepare(`ALTER TABLE pending_subscriptions ADD COLUMN site_id TEXT`).run();
      } catch (e) {
      }
      await env.DB.prepare(
        `INSERT INTO pending_subscriptions (id, user_id, site_id, plan_id, razorpay_subscription_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`
      ).bind(generateId(), user.id, siteId || null, plan.id, razorpaySub.id).run();
    } catch (dbErr) {
      console.error("Failed to store pending subscription (non-fatal):", dbErr);
    }
    return successResponse({
      subscriptionId: razorpaySub.id,
      razorpayPlanId: plan.razorpay_plan_id,
      keyId,
      planId: plan.id,
      planName: plan.plan_name,
      billingCycle: plan.billing_cycle,
      amount: plan.display_price
    });
  } catch (error) {
    console.error("Create subscription error:", error);
    return errorResponse("Failed to create subscription", 500);
  }
}
__name(createRazorpaySubscription, "createRazorpaySubscription");
async function getPublicPlans(request, env) {
  if (request.method !== "GET") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const plansResult = await env.DB.prepare(
      `SELECT id, plan_name, billing_cycle, display_price, original_price, features, is_popular, display_order, plan_tier 
       FROM subscription_plans WHERE is_active = 1 ORDER BY display_order ASC, plan_name ASC`
    ).all();
    const plans = (plansResult.results || []).map((p) => ({
      ...p,
      features: (() => {
        try {
          return JSON.parse(p.features);
        } catch {
          return [];
        }
      })()
    }));
    const platformKeyId = await getPlatformRazorpayKeyId(env);
    let enterpriseConfig = { enabled: false, message: "", email: "" };
    try {
      const settingsResult = await env.DB.prepare(
        `SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('enterprise_enabled', 'enterprise_message', 'enterprise_email')`
      ).all();
      for (const row of settingsResult.results || []) {
        if (row.setting_key === "enterprise_enabled")
          enterpriseConfig.enabled = row.setting_value === "true";
        if (row.setting_key === "enterprise_message")
          enterpriseConfig.message = row.setting_value;
        if (row.setting_key === "enterprise_email")
          enterpriseConfig.email = row.setting_value;
      }
    } catch (e) {
    }
    return successResponse({
      plans,
      razorpayKeyId: platformKeyId || env.RAZORPAY_KEY_ID || null,
      enterpriseConfig
    });
  } catch (error) {
    console.error("Get public plans error:", error);
    return errorResponse("Failed to fetch plans", 500);
  }
}
__name(getPublicPlans, "getPublicPlans");
async function handleRazorpayWebhook(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
    const body = await request.text();
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured - rejecting webhook");
      return errorResponse("Webhook not configured", 500);
    }
    const signature = request.headers.get("x-razorpay-signature");
    if (!signature) {
      console.error("Missing x-razorpay-signature header");
      return errorResponse("Missing signature", 401);
    }
    const expectedSignature = crypto2.createHmac("sha256", webhookSecret).update(body).digest("hex");
    if (expectedSignature !== signature) {
      console.error("Webhook signature mismatch");
      return errorResponse("Invalid webhook signature", 401);
    }
    const payload = JSON.parse(body);
    const event = payload.event;
    const entity = payload.payload?.subscription?.entity || payload.payload?.payment?.entity;
    console.log("Razorpay webhook event:", event);
    switch (event) {
      case "subscription.activated":
        await handleSubscriptionActivated(env, entity);
        break;
      case "subscription.charged":
        await handleSubscriptionCharged(env, entity, payload.payload?.payment?.entity);
        break;
      case "subscription.cancelled":
      case "subscription.completed":
        await handleSubscriptionCancelled(env, entity);
        break;
      case "subscription.paused":
        await handleSubscriptionPaused(env, entity);
        break;
      default:
        console.log("Unhandled webhook event:", event);
    }
    return jsonResponse({ status: "ok" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return errorResponse("Webhook processing failed", 500);
  }
}
__name(handleRazorpayWebhook, "handleRazorpayWebhook");
async function handleSubscriptionActivated(env, entity) {
  if (!entity)
    return;
  const subId = entity.id;
  try {
    const existingActive = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE razorpay_subscription_id = ? AND status = 'active'`
    ).bind(subId).first();
    if (existingActive) {
      console.log("Subscription already activated:", subId);
      return;
    }
    const pending = await env.DB.prepare(
      `SELECT ps.*, sp.plan_name, sp.billing_cycle, sp.display_price
       FROM pending_subscriptions ps
       JOIN subscription_plans sp ON ps.plan_id = sp.id
       WHERE ps.razorpay_subscription_id = ?`
    ).bind(subId).first();
    if (pending) {
      await activateSubscription(env, pending.user_id, pending.plan_name, pending.billing_cycle, null, subId, pending.display_price, pending.site_id || null, entity);
      try {
        await env.DB.prepare(`DELETE FROM pending_subscriptions WHERE razorpay_subscription_id = ?`).bind(subId).run();
      } catch {
      }
    } else {
      const notes = entity.notes || {};
      if (notes.userId && notes.planName) {
        await activateSubscription(env, notes.userId, notes.planName, notes.billingCycle || "3months", null, subId, null, notes.siteId || null, entity);
      } else {
        console.error("No pending subscription or notes found for:", subId);
      }
    }
  } catch (err) {
    console.error("handleSubscriptionActivated error:", err);
  }
}
__name(handleSubscriptionActivated, "handleSubscriptionActivated");
async function handleSubscriptionCharged(env, subEntity, paymentEntity) {
  if (!subEntity)
    return;
  const subId = subEntity.id;
  try {
    const existingSub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE razorpay_subscription_id = ? AND status = 'active'`
    ).bind(subId).first();
    if (existingSub) {
      let newEnd;
      if (subEntity.current_end) {
        newEnd = new Date(subEntity.current_end * 1e3);
      } else {
        const periodMonths = existingSub.billing_cycle === "3months" ? 3 : existingSub.billing_cycle === "6months" ? 6 : existingSub.billing_cycle === "yearly" ? 12 : 36;
        newEnd = /* @__PURE__ */ new Date();
        newEnd.setMonth(newEnd.getMonth() + periodMonths);
      }
      let newStart;
      if (subEntity.current_start) {
        newStart = new Date(subEntity.current_start * 1e3);
      }
      await env.DB.prepare(
        `UPDATE subscriptions SET current_period_start = COALESCE(?, current_period_start), current_period_end = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(newStart ? newStart.toISOString() : null, newEnd.toISOString(), existingSub.id).run();
      if (existingSub.site_id) {
        await env.DB.prepare(
          `UPDATE sites SET subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
        ).bind(newEnd.toISOString(), existingSub.site_id).run();
      } else {
        await env.DB.prepare(
          `UPDATE sites SET subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
        ).bind(newEnd.toISOString(), existingSub.user_id).run();
      }
      console.log("Subscription renewed:", subId);
    }
  } catch (err) {
    console.error("handleSubscriptionCharged error:", err);
  }
}
__name(handleSubscriptionCharged, "handleSubscriptionCharged");
async function handleSubscriptionCancelled(env, entity) {
  if (!entity)
    return;
  const subId = entity.id;
  try {
    const sub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE razorpay_subscription_id = ? AND status = 'active'`
    ).bind(subId).first();
    if (sub) {
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).bind(sub.id).run();
      if (sub.site_id) {
        await env.DB.prepare(
          `UPDATE sites SET subscription_expires_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
        ).bind(sub.site_id).run();
      } else {
        await env.DB.prepare(
          `UPDATE sites SET subscription_expires_at = datetime('now'), updated_at = datetime('now') WHERE user_id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
        ).bind(sub.user_id).run();
      }
    }
    console.log("Subscription cancelled:", subId);
  } catch (err) {
    console.error("handleSubscriptionCancelled error:", err);
  }
}
__name(handleSubscriptionCancelled, "handleSubscriptionCancelled");
async function handleSubscriptionPaused(env, entity) {
  if (!entity)
    return;
  const subId = entity.id;
  try {
    const sub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE razorpay_subscription_id = ? AND status = 'active'`
    ).bind(subId).first();
    if (sub) {
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'paused', updated_at = datetime('now') WHERE id = ?`
      ).bind(sub.id).run();
      if (sub.site_id) {
        await env.DB.prepare(
          `UPDATE sites SET subscription_expires_at = datetime('now'), updated_at = datetime('now') WHERE id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
        ).bind(sub.site_id).run();
      } else {
        await env.DB.prepare(
          `UPDATE sites SET subscription_expires_at = datetime('now'), updated_at = datetime('now') WHERE user_id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
        ).bind(sub.user_id).run();
      }
    }
    console.log("Subscription paused:", subId);
  } catch (err) {
    console.error("handleSubscriptionPaused error:", err);
  }
}
__name(handleSubscriptionPaused, "handleSubscriptionPaused");
async function activateSubscription(env, userId, planName, billingCycle, razorpayPaymentId, razorpaySubscriptionId, amount, siteId, razorpayEntity) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        site_id TEXT,
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `).run();
    try {
      await env.DB.prepare(`ALTER TABLE subscriptions ADD COLUMN site_id TEXT REFERENCES sites(id) ON DELETE CASCADE`).run();
    } catch (e) {
    }
    let periodStart, periodEnd;
    if (razorpayEntity?.current_start && razorpayEntity?.current_end) {
      periodStart = new Date(razorpayEntity.current_start * 1e3);
      periodEnd = new Date(razorpayEntity.current_end * 1e3);
    } else {
      const periodMonths = billingCycle === "3months" ? 3 : billingCycle === "6months" ? 6 : billingCycle === "yearly" ? 12 : 36;
      periodStart = /* @__PURE__ */ new Date();
      periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + periodMonths);
    }
    const oldSubs = siteId ? (await env.DB.prepare(`SELECT id, razorpay_subscription_id FROM subscriptions WHERE site_id = ? AND status = 'active'`).bind(siteId).all()).results || [] : (await env.DB.prepare(`SELECT id, razorpay_subscription_id FROM subscriptions WHERE user_id = ? AND status = 'active'`).bind(userId).all()).results || [];
    for (const oldSub of oldSubs) {
      if (oldSub.razorpay_subscription_id && oldSub.razorpay_subscription_id !== razorpaySubscriptionId) {
        const cancelled = await cancelRazorpaySubscription(env, oldSub.razorpay_subscription_id);
        if (!cancelled) {
          console.error(`Failed to cancel old Razorpay subscription ${oldSub.razorpay_subscription_id} during plan upgrade to ${planName}. Aborting activation.`);
          return false;
        }
      }
    }
    if (siteId) {
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now') WHERE site_id = ? AND status = 'active'`
      ).bind(siteId).run();
    } else {
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'cancelled', cancelled_at = datetime('now') WHERE user_id = ? AND status = 'active'`
      ).bind(userId).run();
    }
    const resolvedAmount = amount || 0;
    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, site_id, plan, billing_cycle, amount, status, razorpay_subscription_id, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, datetime('now'))`
    ).bind(
      generateId(),
      userId,
      siteId || null,
      planName,
      billingCycle,
      resolvedAmount,
      razorpaySubscriptionId || null,
      periodStart.toISOString(),
      periodEnd.toISOString()
    ).run();
    await env.DB.prepare(
      `UPDATE users SET updated_at = datetime('now') WHERE id = ?`
    ).bind(userId).run();
    if (siteId) {
      await env.DB.prepare(
        `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
      ).bind(planName, periodEnd.toISOString(), siteId).run();
    } else {
      await env.DB.prepare(
        `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
      ).bind(planName, periodEnd.toISOString(), userId).run();
    }
    console.log(`Subscription activated: user=${userId}, site=${siteId || "all"}, plan=${planName}, cycle=${billingCycle}`);
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
init_cache();
init_auth();
init_site_admin_worker();
init_usage_tracker();
init_site_db();
async function handleCategories(request, env, path, ctx2) {
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
      return getCategory(env, categoryId, siteId, subdomain);
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
      if (!adminSiteId && method === "PUT" && categoryId) {
        try {
          const cloned = request.clone();
          const body = await cloned.json();
          adminSiteId = body.siteId;
        } catch (e) {
        }
      }
      if (adminSiteId) {
        const admin = await validateSiteAdmin(request, env, adminSiteId);
        if (admin) {
          user = { id: admin.staffId || "site-admin", _adminSiteId: adminSiteId, _adminPermissions: admin };
        }
      }
    }
  }
  if (!user) {
    return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
  }
  const adminPerms = user._adminPermissions;
  switch (method) {
    case "POST":
      if (adminPerms && !hasPermission(adminPerms, "website"))
        return errorResponse("You do not have permission to manage categories", 403);
      return createCategory(request, env, user, ctx2);
    case "PUT":
      if (adminPerms && !hasPermission(adminPerms, "website"))
        return errorResponse("You do not have permission to manage categories", 403);
      return updateCategory(request, env, user, categoryId, ctx2);
    case "DELETE":
      if (adminPerms && !hasPermission(adminPerms, "website"))
        return errorResponse("You do not have permission to manage categories", 403);
      return deleteCategory(env, user, categoryId, ctx2);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleCategories, "handleCategories");
async function getCategories(env, { siteId, subdomain, slug }) {
  try {
    let db;
    let resolvedSiteId = siteId;
    if (siteId) {
      db = await resolveSiteDBById(env, siteId);
    } else if (subdomain) {
      db = await resolveSiteDBBySubdomain(env, subdomain);
      const site = await env.DB.prepare(
        "SELECT id FROM sites WHERE LOWER(subdomain) = LOWER(?)"
      ).bind(subdomain).first();
      if (site)
        resolvedSiteId = site.id;
    } else {
      db = env.DB;
    }
    let query = `SELECT c.*, 
                   (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
                 FROM categories c WHERE 1=1`;
    const bindings = [];
    if (resolvedSiteId) {
      query += " AND c.site_id = ?";
      bindings.push(resolvedSiteId);
    } else if (!siteId && !subdomain) {
      query += " AND 1=0";
    }
    if (slug) {
      query += " AND c.slug = ?";
      bindings.push(slug);
    }
    query += " ORDER BY c.display_order, c.name";
    const categories = await db.prepare(query).bind(...bindings).all();
    const parentCategories = categories.results.filter((c) => !c.parent_id);
    let childIds = parentCategories.map((p) => p.id);
    let allChildren = [];
    if (childIds.length > 0) {
      const childQuery = `SELECT * FROM categories WHERE parent_id IN (${childIds.map(() => "?").join(",")}) ORDER BY display_order, name`;
      const childResult = await db.prepare(childQuery).bind(...childIds).all();
      allChildren = childResult.results || [];
    }
    let grandchildIds = allChildren.map((c) => c.id);
    let allGrandchildren = [];
    if (grandchildIds.length > 0) {
      const gcQuery = `SELECT * FROM categories WHERE parent_id IN (${grandchildIds.map(() => "?").join(",")}) ORDER BY display_order, name`;
      const gcResult = await db.prepare(gcQuery).bind(...grandchildIds).all();
      allGrandchildren = gcResult.results || [];
    }
    const result = parentCategories.map((parent) => ({
      ...parent,
      children: allChildren.filter((c) => c.parent_id === parent.id).map((child) => ({
        ...child,
        children: allGrandchildren.filter((gc) => gc.parent_id === child.id)
      }))
    }));
    return cachedJsonResponse({ success: true, message: "Success", data: result });
  } catch (error) {
    console.error("Get categories error:", error);
    return errorResponse("Failed to fetch categories", 500);
  }
}
__name(getCategories, "getCategories");
async function getCategory(env, categoryId, siteId, subdomain) {
  try {
    if (!siteId && subdomain) {
      const site = await env.DB.prepare(
        "SELECT id FROM sites WHERE LOWER(subdomain) = LOWER(?)"
      ).bind(subdomain).first();
      if (site)
        siteId = site.id;
    }
    const db = await resolveSiteDBById(env, siteId);
    let catQuery = "SELECT * FROM categories WHERE id = ?";
    const catBindings = [categoryId];
    if (siteId) {
      catQuery += " AND site_id = ?";
      catBindings.push(siteId);
    }
    const category = await db.prepare(catQuery).bind(...catBindings).first();
    if (!category) {
      return errorResponse("Category not found", 404, "NOT_FOUND");
    }
    const siteInfo = await env.DB.prepare(
      "SELECT subdomain, brand_name FROM sites WHERE id = ?"
    ).bind(category.site_id).first();
    if (siteInfo) {
      category.subdomain = siteInfo.subdomain;
      category.brand_name = siteInfo.brand_name;
    }
    const children = await db.prepare(
      "SELECT * FROM categories WHERE parent_id = ? ORDER BY display_order"
    ).bind(categoryId).all();
    return cachedJsonResponse({ success: true, message: "Success", data: {
      ...category,
      children: children.results
    } });
  } catch (error) {
    console.error("Get category error:", error);
    return errorResponse("Failed to fetch category", 500);
  }
}
__name(getCategory, "getCategory");
async function createCategory(request, env, user, ctx2) {
  try {
    const { siteId, name, description, parentId, imageUrl, displayOrder, subtitle, showOnHome } = await request.json();
    if (!siteId || !name) {
      return errorResponse("Site ID and name are required");
    }
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
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
    const db = await resolveSiteDBById(env, siteId);
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-");
    const existing = await db.prepare(
      "SELECT id FROM categories WHERE site_id = ? AND slug = ?"
    ).bind(siteId, slug).first();
    if (existing) {
      return errorResponse("Category with this name already exists", 400, "SLUG_EXISTS");
    }
    const categoryId = generateId();
    const rowData = { id: categoryId, site_id: siteId, name, slug, description, subtitle, parent_id: parentId, image_url: imageUrl, display_order: displayOrder };
    const rowBytes = estimateRowBytes(rowData);
    const usageCheck = await checkUsageLimit(env, siteId, "d1", rowBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, "STORAGE_LIMIT");
    }
    await db.prepare(
      `INSERT INTO categories (id, site_id, name, slug, description, subtitle, show_on_home, parent_id, image_url, display_order, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
      displayOrder || 0,
      rowBytes
    ).run();
    await trackD1Write(env, siteId, rowBytes);
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["categories", "site"], { categoryId }));
    return successResponse({ id: categoryId, slug }, "Category created successfully");
  } catch (error) {
    console.error("Create category error:", error);
    return errorResponse("Failed to create category", 500);
  }
}
__name(createCategory, "createCategory");
async function updateCategory(request, env, user, categoryId, ctx2) {
  if (!categoryId) {
    return errorResponse("Category ID is required");
  }
  try {
    let siteId = user._adminSiteId || null;
    let category;
    if (user._adminSiteId) {
      const db2 = await resolveSiteDBById(env, user._adminSiteId);
      category = await db2.prepare(
        "SELECT id, site_id, row_size_bytes FROM categories WHERE id = ? AND site_id = ?"
      ).bind(categoryId, user._adminSiteId).first();
    } else {
      const userSites = await env.DB.prepare(
        "SELECT id FROM sites WHERE user_id = ?"
      ).bind(user.id).all();
      for (const s of userSites.results || []) {
        const db2 = await resolveSiteDBById(env, s.id);
        category = await db2.prepare(
          "SELECT id, site_id, row_size_bytes FROM categories WHERE id = ? AND site_id = ?"
        ).bind(categoryId, s.id).first();
        if (category) {
          siteId = s.id;
          break;
        }
      }
    }
    if (!category) {
      return errorResponse("Category not found or unauthorized", 404);
    }
    const resolvedSiteId = siteId || category.site_id;
    if (await checkMigrationLock(env, resolvedSiteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, resolvedSiteId);
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
    const oldBytes = category.row_size_bytes || 0;
    setClause.push('updated_at = datetime("now")');
    values.push(categoryId);
    await db.prepare(
      `UPDATE categories SET ${setClause.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    const updatedCatRow = await db.prepare("SELECT * FROM categories WHERE id = ?").bind(categoryId).first();
    const newBytes = updatedCatRow ? estimateRowBytes(updatedCatRow) : oldBytes;
    if (updatedCatRow) {
      await db.prepare("UPDATE categories SET row_size_bytes = ? WHERE id = ?").bind(newBytes, categoryId).run();
    }
    await trackD1Update(env, resolvedSiteId, oldBytes, newBytes);
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, resolvedSiteId, ["categories", "site"], { categoryId }));
    return successResponse(null, "Category updated successfully");
  } catch (error) {
    console.error("Update category error:", error);
    return errorResponse("Failed to update category", 500);
  }
}
__name(updateCategory, "updateCategory");
async function deleteCategory(env, user, categoryId, ctx2) {
  if (!categoryId) {
    return errorResponse("Category ID is required");
  }
  try {
    let siteId = user._adminSiteId || null;
    let category;
    if (user._adminSiteId) {
      const db2 = await resolveSiteDBById(env, user._adminSiteId);
      category = await db2.prepare(
        "SELECT id, site_id, row_size_bytes FROM categories WHERE id = ? AND site_id = ?"
      ).bind(categoryId, user._adminSiteId).first();
    } else {
      const userSites = await env.DB.prepare(
        "SELECT id FROM sites WHERE user_id = ?"
      ).bind(user.id).all();
      for (const s of userSites.results || []) {
        const db2 = await resolveSiteDBById(env, s.id);
        category = await db2.prepare(
          "SELECT id, site_id, row_size_bytes FROM categories WHERE id = ? AND site_id = ?"
        ).bind(categoryId, s.id).first();
        if (category) {
          siteId = s.id;
          break;
        }
      }
    }
    if (!category) {
      return errorResponse("Category not found or unauthorized", 404);
    }
    const resolvedSiteId = siteId || category.site_id;
    if (await checkMigrationLock(env, resolvedSiteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, resolvedSiteId);
    const bytesToRemove = category.row_size_bytes || 0;
    await db.prepare(
      "UPDATE categories SET parent_id = NULL WHERE parent_id = ?"
    ).bind(categoryId).run();
    await db.prepare(
      "UPDATE products SET category_id = NULL WHERE category_id = ?"
    ).bind(categoryId).run();
    await db.prepare(
      "UPDATE products SET subcategory_id = NULL WHERE subcategory_id = ?"
    ).bind(categoryId).run();
    await db.prepare("DELETE FROM categories WHERE id = ?").bind(categoryId).run();
    if (bytesToRemove > 0) {
      await trackD1Delete(env, resolvedSiteId, bytesToRemove);
    }
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, resolvedSiteId, ["categories", "site"], { categoryId }));
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
async function checkAndExpireSubscription(env, userId) {
  try {
    const trialSub = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND plan = 'trial' AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(userId).first();
    if (trialSub) {
      if (trialSub.current_period_end && new Date(trialSub.current_period_end) < /* @__PURE__ */ new Date()) {
        await env.DB.prepare(
          `UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE id = ?`
        ).bind(trialSub.id).run();
        await env.DB.prepare(
          `UPDATE sites SET subscription_plan = 'expired', updated_at = datetime('now') WHERE user_id = ? AND subscription_plan = 'trial' AND COALESCE(subscription_plan, '') != 'enterprise'`
        ).bind(userId).run();
        return { ...trialSub, status: "expired" };
      }
      return trialSub;
    }
    const activeSubscription = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(userId).first();
    if (activeSubscription) {
      if (activeSubscription.current_period_end && new Date(activeSubscription.current_period_end) < /* @__PURE__ */ new Date()) {
        await env.DB.prepare(
          `UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE id = ?`
        ).bind(activeSubscription.id).run();
        return { ...activeSubscription, status: "expired" };
      }
      return activeSubscription;
    }
    const latestSubscription = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
    ).bind(userId).first();
    return latestSubscription || null;
  } catch (e) {
    console.error("Check/expire subscription error:", e);
    return null;
  }
}
__name(checkAndExpireSubscription, "checkAndExpireSubscription");
async function hasEverHadSubscription(env, userId) {
  try {
    const result = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ?`
    ).bind(userId).first();
    return (result?.count || 0) > 0;
  } catch (e) {
    return false;
  }
}
__name(hasEverHadSubscription, "hasEverHadSubscription");
async function getProfile(env, user) {
  try {
    let profile = null;
    profile = await env.DB.prepare(
      `SELECT id, email, name, phone, email_verified FROM users WHERE id = ?`
    ).bind(user.id).first();
    if (!profile) {
      return errorResponse("User not found", 404);
    }
    let subscription = null;
    try {
      subscription = await checkAndExpireSubscription(env, user.id);
    } catch (subError) {
      console.error("Subscription query error (table may not exist):", subError);
    }
    const hadSubscription = await hasEverHadSubscription(env, user.id);
    return successResponse({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      emailVerified: !!profile.email_verified,
      plan: subscription?.plan || null,
      billingCycle: subscription?.billing_cycle || null,
      status: subscription?.status || (hadSubscription ? "expired" : "none"),
      trialStartDate: subscription?.current_period_start || null,
      trialEndDate: subscription?.current_period_end || null,
      hadSubscription
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
      subscription = await checkAndExpireSubscription(env, user.id);
    } catch (subError) {
      console.error("Subscription query error (table may not exist):", subError);
      return successResponse({
        plan: null,
        status: "none",
        billingCycle: null
      });
    }
    if (!subscription) {
      const hadSubscription = await hasEverHadSubscription(env, user.id);
      return successResponse({
        plan: null,
        status: hadSubscription ? "expired" : "none",
        billingCycle: null,
        hadSubscription
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
        site_id TEXT,
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `).run();
    try {
      await env.DB.prepare(`ALTER TABLE subscriptions ADD COLUMN site_id TEXT REFERENCES sites(id) ON DELETE CASCADE`).run();
    } catch (e) {
    }
    return true;
  } catch (error) {
    console.error("Failed to ensure subscriptions table:", error);
    return false;
  }
}
__name(ensureSubscriptionsTable, "ensureSubscriptionsTable");
async function updateSubscription(request, env, user) {
  try {
    const { plan } = await request.json();
    if (plan !== "trial") {
      return errorResponse("Only trial activation is allowed through this endpoint. Use Razorpay for paid plans.", 403);
    }
    await ensureSubscriptionsTable(env);
    let existingActive = null;
    try {
      existingActive = await env.DB.prepare(
        `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active'`
      ).bind(user.id).first();
    } catch (e) {
    }
    if (existingActive) {
      return errorResponse("You already have an active subscription.", 400);
    }
    const hadTrial = await hasEverHadSubscription(env, user.id);
    if (hadTrial) {
      let hadTrialBefore = false;
      try {
        const trialCheck = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM subscriptions WHERE user_id = ? AND plan = 'trial'`
        ).bind(user.id).first();
        hadTrialBefore = (trialCheck?.count || 0) > 0;
      } catch (e) {
      }
      if (hadTrialBefore) {
        return errorResponse("You have already used your free trial. Please subscribe to a paid plan.", 400);
      }
    }
    const periodEnd = /* @__PURE__ */ new Date();
    periodEnd.setDate(periodEnd.getDate() + 7);
    await env.DB.prepare(
      `INSERT INTO subscriptions (id, user_id, site_id, plan, billing_cycle, amount, status, current_period_start, current_period_end, created_at)
       VALUES (?, ?, NULL, 'trial', 'monthly', 0, 'active', datetime('now'), ?, datetime('now'))`
    ).bind(
      generateId(),
      user.id,
      periodEnd.toISOString()
    ).run();
    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = 'trial', subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ? AND COALESCE(subscription_plan, '') != 'enterprise'`
    ).bind(periodEnd.toISOString(), user.id).run();
    return successResponse(null, "Your 7-day free trial has started!");
  } catch (error) {
    console.error("Update subscription error:", error);
    return errorResponse("Failed to start trial", 500);
  }
}
__name(updateSubscription, "updateSubscription");

// workers/site-router.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_config();

// workers/seo/index.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// workers/seo/meta-injector.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
function injectSEOTags(html, tags) {
  let result = html;
  result = result.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(tags.title)}</title>`);
  result = result.replace(/<link\s+rel=["']icon["'][^>]*>/gi, "");
  result = result.replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+name=["']description["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+name=["']viewport["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+name=["']robots["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+name=["']author["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+name=["']keywords["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+property=["']og:[^"']*["'][^>]*>/gi, "");
  result = result.replace(/<meta\s+name=["']twitter:[^"']*["'][^>]*>/gi, "");
  result = result.replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[^<]*<\/script>/gi, "");
  const metaTags = buildMetaTagsString(tags);
  result = result.replace("</head>", `${metaTags}
</head>`);
  return result;
}
__name(injectSEOTags, "injectSEOTags");
function buildMetaTagsString(tags) {
  const lines = [];
  if (tags.description) {
    lines.push(`  <meta name="description" content="${escapeAttr(tags.description)}">`);
  }
  if (tags.keywords) {
    lines.push(`  <meta name="keywords" content="${escapeAttr(tags.keywords)}">`);
  }
  if (tags.author) {
    lines.push(`  <meta name="author" content="${escapeAttr(tags.author)}">`);
  }
  lines.push(`  <meta name="robots" content="${escapeAttr(tags.robots || "index, follow")}">`);
  lines.push(`  <meta name="viewport" content="width=device-width, initial-scale=1.0">`);
  if (tags.canonicalUrl) {
    lines.push(`  <link rel="canonical" href="${escapeAttr(tags.canonicalUrl)}">`);
  }
  if (tags.favicon) {
    lines.push(`  <link rel="icon" type="image/png" href="${escapeAttr(tags.favicon)}">`);
  }
  if (tags.ogLocale) {
    lines.push(`  <meta property="og:locale" content="${escapeAttr(tags.ogLocale)}">`);
  }
  lines.push(`  <meta property="og:type" content="${escapeAttr(tags.ogType || "website")}">`);
  lines.push(`  <meta property="og:site_name" content="${escapeAttr(tags.siteName || "")}">`);
  if (tags.title) {
    lines.push(`  <meta property="og:title" content="${escapeAttr(tags.ogTitle || tags.title)}">`);
  }
  if (tags.description) {
    lines.push(`  <meta property="og:description" content="${escapeAttr(tags.ogDescription || tags.description)}">`);
  }
  if (tags.ogImage) {
    lines.push(`  <meta property="og:image" content="${escapeAttr(tags.ogImage)}">`);
    if (tags.ogImage.startsWith("https://")) {
      lines.push(`  <meta property="og:image:secure_url" content="${escapeAttr(tags.ogImage)}">`);
    }
    lines.push(`  <meta property="og:image:alt" content="${escapeAttr(tags.ogTitle || tags.title || "")}">`);
    lines.push(`  <meta property="og:image:width" content="1200">`);
    lines.push(`  <meta property="og:image:height" content="630">`);
    const imgLower = (tags.ogImage || "").toLowerCase();
    if (imgLower.endsWith(".png")) {
      lines.push(`  <meta property="og:image:type" content="image/png">`);
    } else if (imgLower.endsWith(".webp")) {
      lines.push(`  <meta property="og:image:type" content="image/webp">`);
    } else {
      lines.push(`  <meta property="og:image:type" content="image/jpeg">`);
    }
  }
  if (tags.canonicalUrl) {
    lines.push(`  <meta property="og:url" content="${escapeAttr(tags.canonicalUrl)}">`);
  }
  lines.push(`  <meta name="twitter:card" content="${escapeAttr(tags.twitterCard || "summary_large_image")}">`);
  if (tags.twitterSite) {
    lines.push(`  <meta name="twitter:site" content="${escapeAttr(tags.twitterSite)}">`);
  }
  if (tags.twitterTitle || tags.title) {
    lines.push(`  <meta name="twitter:title" content="${escapeAttr(tags.twitterTitle || tags.ogTitle || tags.title)}">`);
  }
  if (tags.twitterDescription || tags.description) {
    lines.push(`  <meta name="twitter:description" content="${escapeAttr(tags.twitterDescription || tags.ogDescription || tags.description)}">`);
  }
  if (tags.twitterImage || tags.ogImage) {
    lines.push(`  <meta name="twitter:image" content="${escapeAttr(tags.twitterImage || tags.ogImage)}">`);
  }
  if (tags.googleVerification) {
    lines.push(`  <meta name="google-site-verification" content="${escapeAttr(tags.googleVerification)}">`);
  }
  if (tags.structuredData && tags.structuredData.length > 0) {
    for (const schema of tags.structuredData) {
      lines.push(`  <script type="application/ld+json">${schema}<\/script>`);
    }
  }
  return lines.join("\n");
}
__name(buildMetaTagsString, "buildMetaTagsString");
function escapeHtml(str) {
  if (!str)
    return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
__name(escapeHtml, "escapeHtml");
function escapeAttr(str) {
  if (!str)
    return "";
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
__name(escapeAttr, "escapeAttr");

// workers/seo/sitemap-generator.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_site_db();
async function generateSitemap(env, site, baseUrl) {
  const urls2 = [];
  urls2.push({
    loc: `${baseUrl}/`,
    changefreq: "daily",
    priority: "1.0"
  });
  urls2.push({
    loc: `${baseUrl}/about`,
    changefreq: "monthly",
    priority: "0.5"
  });
  urls2.push({
    loc: `${baseUrl}/contact`,
    changefreq: "monthly",
    priority: "0.5"
  });
  const db = await resolveSiteDBById(env, site.id);
  try {
    const categories = await db.prepare(
      `SELECT slug, updated_at FROM categories WHERE site_id = ? AND is_active = 1 ORDER BY display_order ASC`
    ).bind(site.id).all();
    for (const cat of categories.results || []) {
      urls2.push({
        loc: `${baseUrl}/category/${cat.slug}`,
        lastmod: formatDate(cat.updated_at),
        changefreq: "weekly",
        priority: "0.7"
      });
    }
  } catch {
  }
  try {
    const products = await db.prepare(
      `SELECT slug, updated_at FROM products WHERE site_id = ? AND is_active = 1 ORDER BY created_at DESC`
    ).bind(site.id).all();
    for (const product of products.results || []) {
      urls2.push({
        loc: `${baseUrl}/product/${product.slug}`,
        lastmod: formatDate(product.updated_at),
        changefreq: "weekly",
        priority: "0.8"
      });
    }
  } catch {
  }
  try {
    const blogPosts = await db.prepare(
      `SELECT slug, updated_at FROM blog_posts WHERE site_id = ? AND status = 'published' ORDER BY published_at DESC`
    ).bind(site.id).all();
    for (const post of blogPosts.results || []) {
      urls2.push({
        loc: `${baseUrl}/blog/${post.slug}`,
        lastmod: formatDate(post.updated_at),
        changefreq: "monthly",
        priority: "0.6"
      });
    }
  } catch {
  }
  const urlEntries = urls2.map((u) => {
    let entry = `  <url>
    <loc>${u.loc}</loc>`;
    if (u.lastmod)
      entry += `
    <lastmod>${u.lastmod}</lastmod>`;
    if (u.changefreq)
      entry += `
    <changefreq>${u.changefreq}</changefreq>`;
    if (u.priority)
      entry += `
    <priority>${u.priority}</priority>`;
    entry += `
  </url>`;
    return entry;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;
}
__name(generateSitemap, "generateSitemap");
function formatDate(dateStr) {
  if (!dateStr)
    return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  }
}
__name(formatDate, "formatDate");

// workers/seo/robots-generator.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
function generateRobots(site, baseUrl) {
  const robots = site.seo_robots || "index, follow";
  const isBlocked = robots.includes("noindex");
  if (isBlocked) {
    return `User-agent: *
Disallow: /
`;
  }
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /cart
Disallow: /checkout
Disallow: /profile
Disallow: /orders

Sitemap: ${baseUrl}/sitemap.xml
`;
}
__name(generateRobots, "generateRobots");

// workers/seo/structured-data.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
function absUrl(url, baseUrl) {
  if (!url)
    return url;
  if (url.startsWith("http"))
    return url;
  return baseUrl + (url.startsWith("/") ? url : "/" + url);
}
__name(absUrl, "absUrl");
function buildOrganizationSchema(site, baseUrl) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.brand_name,
    url: baseUrl
  };
  if (site.logo_url)
    schema.logo = absUrl(site.logo_url, baseUrl);
  if (site.email)
    schema.email = site.email;
  if (site.phone)
    schema.telephone = site.phone;
  if (site.address)
    schema.address = { "@type": "PostalAddress", streetAddress: site.address };
  let socialLinks = [];
  try {
    if (site.social_links) {
      const links = typeof site.social_links === "string" ? JSON.parse(site.social_links) : site.social_links;
      socialLinks = Object.values(links).filter(Boolean);
    }
  } catch {
  }
  if (socialLinks.length > 0)
    schema.sameAs = socialLinks;
  return JSON.stringify(schema);
}
__name(buildOrganizationSchema, "buildOrganizationSchema");
function buildProductSchema(product, site, baseUrl, reviewData) {
  let images = [];
  try {
    if (product.images) {
      images = typeof product.images === "string" ? JSON.parse(product.images) : product.images;
    }
  } catch {
  }
  if (product.thumbnail_url && !images.includes(product.thumbnail_url)) {
    images.unshift(product.thumbnail_url);
  }
  images = images.map((img) => absUrl(img, baseUrl)).filter(Boolean);
  if (images.length === 0) {
    const fallbackImg = absUrl(site.og_image || site.logo_url, baseUrl);
    if (fallbackImg)
      images.push(fallbackImg);
  }
  const currency = site.currency || "INR";
  const brandName = site.brand_name || site.name || "";
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.short_description || "",
    url: `${baseUrl}/product/${product.slug}`,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: currency,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${baseUrl}/product/${product.slug}`
    }
  };
  if (brandName) {
    schema.brand = { "@type": "Brand", name: brandName };
    schema.offers.seller = { "@type": "Organization", name: brandName };
  }
  if (images.length > 0)
    schema.image = images;
  if (product.sku)
    schema.sku = product.sku;
  if (product.barcode)
    schema.gtin = product.barcode;
  schema.offers.priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
  schema.offers.hasMerchantReturnPolicy = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: site.country_code || "IN",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 7,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/FreeReturn"
  };
  schema.offers.shippingDetails = {
    "@type": "OfferShippingDetails",
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: site.country_code || "IN"
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 1,
        maxValue: 3,
        unitCode: "DAY"
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: 3,
        maxValue: 7,
        unitCode: "DAY"
      }
    }
  };
  if (reviewData && reviewData.total > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: reviewData.avgRating,
      reviewCount: reviewData.total,
      bestRating: 5,
      worstRating: 1
    };
    if (reviewData.reviews && reviewData.reviews.length > 0) {
      schema.review = reviewData.reviews.slice(0, 5).map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.customer_name || "Customer" },
        reviewRating: {
          "@type": "Rating",
          ratingValue: r.rating,
          bestRating: 5,
          worstRating: 1
        },
        datePublished: r.created_at ? r.created_at.split("T")[0] || r.created_at.split(" ")[0] : void 0,
        reviewBody: r.content || r.title || void 0,
        name: r.title || void 0
      }));
    }
  }
  return JSON.stringify(schema);
}
__name(buildProductSchema, "buildProductSchema");
function buildCategorySchema(category, products, site, baseUrl) {
  const items = (products || []).slice(0, 10).map((p, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${baseUrl}/product/${p.slug}`,
    name: p.name
  }));
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: category.name,
    description: category.description || "",
    url: `${baseUrl}/category/${category.slug}`,
    numberOfItems: items.length,
    itemListElement: items
  };
  return JSON.stringify(schema);
}
__name(buildCategorySchema, "buildCategorySchema");
function buildBreadcrumbSchema(items, baseUrl) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`
    }))
  };
  return JSON.stringify(schema);
}
__name(buildBreadcrumbSchema, "buildBreadcrumbSchema");
function buildWebsiteSchema(site, baseUrl) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.brand_name,
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  });
}
__name(buildWebsiteSchema, "buildWebsiteSchema");

// workers/seo/templates/storefront/seo-config.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var categoryDescriptions = {
  jewellery: (name) => `Shop exquisite jewellery at ${name}. Explore rings, necklaces, earrings, bracelets & more. Secure payments & nationwide delivery.`,
  clothing: (name) => `Discover the latest fashion at ${name}. Shop clothing, accessories & more with easy returns & fast shipping.`,
  beauty: (name) => `Shop premium beauty & cosmetics at ${name}. Skincare, makeup & more with secure checkout & fast delivery.`,
  general: (name) => `Shop online at ${name}. Explore our curated collection with secure checkout, easy returns & fast delivery.`
};
function getDefaultTitle(brandName) {
  return `${brandName} - Online Store`;
}
__name(getDefaultTitle, "getDefaultTitle");
function getDefaultDescription(brandName, category) {
  const gen = categoryDescriptions[category] || categoryDescriptions.general;
  return gen(brandName);
}
__name(getDefaultDescription, "getDefaultDescription");
var seo_config_default = {
  titleFormat: "{pageTitle} | {brandName}",
  fallbackTitle(site) {
    return getDefaultTitle(site.brand_name);
  },
  fallbackDescription(site) {
    const category = site.category || "general";
    return getDefaultDescription(site.brand_name, category);
  },
  includeOrganizationSchema: true,
  includeProductSchema: true,
  includeCategorySchema: true,
  includeBreadcrumbs: true
};

// workers/seo/index.js
init_site_db();
var TEMPLATE_CONFIGS = {
  storefront: seo_config_default,
  template1: seo_config_default
};
function loadTemplateConfig(templateId) {
  return TEMPLATE_CONFIGS[templateId] || TEMPLATE_CONFIGS["storefront"];
}
__name(loadTemplateConfig, "loadTemplateConfig");
function detectPageType(pathname) {
  if (pathname.startsWith("/product/"))
    return { type: "product", slug: pathname.split("/product/")[1]?.split("?")[0] };
  if (pathname.startsWith("/category/"))
    return { type: "category", slug: pathname.split("/category/")[1]?.split("?")[0] };
  if (pathname.startsWith("/blog/"))
    return { type: "blog", slug: pathname.split("/blog/")[1]?.split("?")[0] };
  if (pathname === "/blog")
    return { type: "blogList" };
  if (pathname === "/about" || pathname === "/about-us")
    return { type: "about" };
  if (pathname === "/contact" || pathname === "/contact-us")
    return { type: "contact" };
  if (pathname === "/privacy-policy" || pathname === "/privacy")
    return { type: "privacy" };
  if (pathname === "/terms" || pathname === "/terms-and-conditions")
    return { type: "terms" };
  return { type: "home" };
}
__name(detectPageType, "detectPageType");
function buildBaseUrl(request, site) {
  const url = new URL(request.url);
  const proto = url.protocol;
  const hostname = url.hostname;
  return `${proto}//${hostname}`;
}
__name(buildBaseUrl, "buildBaseUrl");
async function fetchSiteSEO(env, site) {
  return {
    seo_title: site.seo_title || null,
    seo_description: site.seo_description || null,
    seo_og_image: site.seo_og_image || null,
    seo_robots: site.seo_robots || "index, follow",
    google_verification: site.google_verification || null,
    currency: site.currency || "INR"
  };
}
__name(fetchSiteSEO, "fetchSiteSEO");
async function fetchProductSEO(db, site, slug) {
  try {
    return await db.prepare(
      `SELECT id, name, slug, description, short_description, price, compare_price, stock,
              images, thumbnail_url, sku, barcode, seo_title, seo_description, seo_og_image
       FROM products WHERE site_id = ? AND slug = ? AND is_active = 1`
    ).bind(site.id, slug).first();
  } catch {
    return null;
  }
}
__name(fetchProductSEO, "fetchProductSEO");
async function fetchProductReviewData(db, site, productId) {
  try {
    const stats = await db.prepare(
      `SELECT COUNT(*) as total, AVG(rating) as avg_rating
       FROM reviews WHERE site_id = ? AND product_id = ? AND status = 'approved' AND is_approved = 1`
    ).bind(site.id, productId).first();
    if (!stats || !stats.total || stats.total === 0)
      return null;
    const recentReviews = await db.prepare(
      `SELECT customer_name, rating, title, content, created_at
       FROM reviews WHERE site_id = ? AND product_id = ? AND status = 'approved' AND is_approved = 1
       ORDER BY created_at DESC LIMIT 5`
    ).bind(site.id, productId).all();
    return {
      total: stats.total,
      avgRating: stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0,
      reviews: recentReviews.results || []
    };
  } catch {
    return null;
  }
}
__name(fetchProductReviewData, "fetchProductReviewData");
async function fetchCategorySEO(db, site, slug) {
  try {
    const category = await db.prepare(
      `SELECT id, name, slug, description, image_url, seo_title, seo_description, seo_og_image
       FROM categories WHERE site_id = ? AND slug = ? AND is_active = 1`
    ).bind(site.id, slug).first();
    if (!category)
      return { category: null, products: [] };
    const products = await db.prepare(
      `SELECT name, slug, thumbnail_url FROM products
       WHERE site_id = ? AND category_id = ? AND is_active = 1
       ORDER BY is_featured DESC, created_at DESC LIMIT 10`
    ).bind(site.id, category.id).all();
    return { category, products: products.results || [] };
  } catch {
    return { category: null, products: [] };
  }
}
__name(fetchCategorySEO, "fetchCategorySEO");
async function fetchBlogPostSEO(db, site, slug) {
  try {
    return await db.prepare(
      `SELECT id, title, slug, excerpt, content, featured_image, seo_title, seo_description, published_at, author_name
       FROM blog_posts WHERE site_id = ? AND slug = ? AND status = 'published'`
    ).bind(site.id, slug).first();
  } catch {
    return null;
  }
}
__name(fetchBlogPostSEO, "fetchBlogPostSEO");
async function fetchPageSEO(db, site, pageType) {
  try {
    return await db.prepare(
      `SELECT seo_title, seo_description, seo_og_image
       FROM page_seo WHERE site_id = ? AND page_type = ?`
    ).bind(site.id, pageType).first();
  } catch {
    return null;
  }
}
__name(fetchPageSEO, "fetchPageSEO");
function buildTags({ pageInfo, site, siteSEO, pageData, templateConfig, baseUrl, canonicalUrl, reviewData }) {
  const { type } = pageInfo;
  const structuredData = [];
  let title, description, ogImage, ogType, breadcrumbs;
  function absUrl2(url) {
    if (!url)
      return url;
    if (url.startsWith("http"))
      return url;
    return baseUrl + (url.startsWith("/") ? url : "/" + url);
  }
  __name(absUrl2, "absUrl");
  if (templateConfig.includeOrganizationSchema) {
    structuredData.push(buildOrganizationSchema(site, baseUrl));
  }
  structuredData.push(buildWebsiteSchema(site, baseUrl));
  if (type === "product" && pageData) {
    title = pageData.seo_title || templateConfig.titleFormat.replace("{pageTitle}", pageData.name).replace("{brandName}", site.brand_name);
    description = pageData.seo_description || pageData.short_description || pageData.description || templateConfig.fallbackDescription(site);
    ogImage = pageData.seo_og_image || pageData.thumbnail_url || siteSEO.seo_og_image;
    ogType = "product";
    if (templateConfig.includeProductSchema) {
      structuredData.push(buildProductSchema(pageData, site, baseUrl, reviewData));
    }
    if (templateConfig.includeBreadcrumbs) {
      structuredData.push(buildBreadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Products", url: "/products" },
        { name: pageData.name, url: `/product/${pageData.slug}` }
      ], baseUrl));
    }
  } else if (type === "category" && pageData?.category) {
    const cat = pageData.category;
    title = cat.seo_title || templateConfig.titleFormat.replace("{pageTitle}", cat.name).replace("{brandName}", site.brand_name);
    description = cat.seo_description || cat.description || templateConfig.fallbackDescription(site);
    ogImage = cat.seo_og_image || cat.image_url || siteSEO.seo_og_image;
    if (templateConfig.includeCategorySchema) {
      structuredData.push(buildCategorySchema(cat, pageData.products, site, baseUrl));
    }
    if (templateConfig.includeBreadcrumbs) {
      structuredData.push(buildBreadcrumbSchema([
        { name: "Home", url: "/" },
        { name: cat.name, url: `/category/${cat.slug}` }
      ], baseUrl));
    }
  } else if (type === "blog" && pageData) {
    title = pageData.seo_title || templateConfig.titleFormat.replace("{pageTitle}", pageData.title).replace("{brandName}", site.brand_name);
    description = pageData.seo_description || pageData.excerpt || (pageData.content ? pageData.content.replace(/<[^>]*>/g, "").substring(0, 160).trim() : "") || templateConfig.fallbackDescription(site);
    ogImage = pageData.featured_image || siteSEO.seo_og_image;
    ogType = "article";
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: pageData.title,
      description: pageData.excerpt || "",
      url: `${baseUrl}/blog/${pageData.slug}`,
      datePublished: pageData.published_at || void 0,
      author: { "@type": "Person", name: pageData.author_name || site.brand_name },
      publisher: { "@type": "Organization", name: site.brand_name }
    };
    if (pageData.featured_image) {
      articleSchema.image = absUrl2(pageData.featured_image);
    }
    structuredData.push(JSON.stringify(articleSchema));
    if (templateConfig.includeBreadcrumbs) {
      structuredData.push(buildBreadcrumbSchema([
        { name: "Home", url: "/" },
        { name: "Blog", url: "/blog" },
        { name: pageData.title, url: `/blog/${pageData.slug}` }
      ], baseUrl));
    }
  } else if (type === "blogList") {
    title = templateConfig.titleFormat.replace("{pageTitle}", "Blog").replace("{brandName}", site.brand_name);
    description = siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = siteSEO.seo_og_image;
  } else if (type === "about") {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || templateConfig.titleFormat.replace("{pageTitle}", "About Us").replace("{brandName}", site.brand_name);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;
  } else if (type === "contact") {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || templateConfig.titleFormat.replace("{pageTitle}", "Contact Us").replace("{brandName}", site.brand_name);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;
  } else if (type === "privacy") {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || templateConfig.titleFormat.replace("{pageTitle}", "Privacy Policy").replace("{brandName}", site.brand_name);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;
  } else if (type === "terms") {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || templateConfig.titleFormat.replace("{pageTitle}", "Terms & Conditions").replace("{brandName}", site.brand_name);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;
  } else {
    const pageSEO = pageData;
    title = pageSEO?.seo_title || siteSEO.seo_title || templateConfig.fallbackTitle(site);
    description = pageSEO?.seo_description || siteSEO.seo_description || templateConfig.fallbackDescription(site);
    ogImage = pageSEO?.seo_og_image || siteSEO.seo_og_image;
  }
  const resolvedOgImage = ogImage || site.og_image || site.logo_url || null;
  const finalOgImage = absUrl2(resolvedOgImage);
  const finalTwImage = absUrl2(ogImage || site.twitter_image || site.og_image || site.logo_url || null);
  return {
    title,
    description,
    ogTitle: site.og_title || title,
    ogDescription: site.og_description || description,
    ogImage: finalOgImage,
    ogType: ogType || site.og_type || "website",
    ogLocale: "en_US",
    siteName: site.brand_name,
    canonicalUrl,
    robots: siteSEO.seo_robots || "index, follow",
    favicon: site.favicon_url || site.logo_url || null,
    author: site.brand_name,
    googleVerification: siteSEO.google_verification || null,
    twitterCard: site.twitter_card || "summary_large_image",
    twitterTitle: site.twitter_title || site.og_title || title,
    twitterDescription: site.twitter_description || site.og_description || description,
    twitterImage: finalTwImage,
    twitterSite: site.twitter_site || null,
    structuredData
  };
}
__name(buildTags, "buildTags");
async function applySEO(request, env, site, rawHTML) {
  try {
    const url = new URL(request.url);
    const baseUrl = buildBaseUrl(request, site);
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
    const canonicalUrl = `${baseUrl}${pathname}`;
    const pageInfo = detectPageType(pathname);
    const templateConfig = loadTemplateConfig(site.template_id);
    const siteSEO = await fetchSiteSEO(env, site);
    const db = await resolveSiteDBById(env, site.id);
    let pageData = null;
    let reviewData = null;
    if (pageInfo.type === "product") {
      pageData = await fetchProductSEO(db, site, pageInfo.slug);
      if (pageData?.id) {
        reviewData = await fetchProductReviewData(db, site, pageData.id);
      }
    } else if (pageInfo.type === "category") {
      pageData = await fetchCategorySEO(db, site, pageInfo.slug);
    } else if (pageInfo.type === "blog") {
      pageData = await fetchBlogPostSEO(db, site, pageInfo.slug);
    } else {
      pageData = await fetchPageSEO(db, site, pageInfo.type);
    }
    const siteWithCurrency = { ...site, currency: siteSEO.currency || site.currency || "INR" };
    const tags = buildTags({ pageInfo, site: siteWithCurrency, siteSEO, pageData, templateConfig, baseUrl, canonicalUrl, reviewData });
    return injectSEOTags(rawHTML, tags);
  } catch (err) {
    console.error("[SEO] applySEO error:", err);
    return rawHTML;
  }
}
__name(applySEO, "applySEO");

// workers/site-router.js
init_site_db();
async function handleSiteRouting(request, env) {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const hostParts = hostname.split(".");
  let subdomain = null;
  const platformDomain = env.DOMAIN || PLATFORM_DOMAIN;
  if (hostname.endsWith(platformDomain)) {
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
  let siteRow = null;
  if (subdomain) {
    try {
      siteRow = await env.DB.prepare(
        `SELECT * FROM sites WHERE LOWER(subdomain) = LOWER(?) AND is_active = 1`
      ).bind(subdomain).first();
    } catch (error) {
      console.error("Site routing subdomain lookup error:", error);
    }
  }
  if (!siteRow && !hostname.endsWith(platformDomain) && !hostname.endsWith("pages.dev") && !hostname.includes("localhost") && !hostname.includes("workers.dev")) {
    try {
      siteRow = await env.DB.prepare(
        `SELECT * FROM sites WHERE custom_domain = ? AND domain_status = 'verified' AND is_active = 1`
      ).bind(hostname.toLowerCase()).first();
    } catch (error) {
      console.error("Site routing custom domain lookup error:", error);
    }
  }
  let site = null;
  if (siteRow) {
    try {
      site = await getSiteWithConfig(env, siteRow);
    } catch (e) {
      console.error("Failed to load site config:", e);
      site = siteRow;
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
    const hasNoPlan = !site.subscription_plan || !site.subscription_expires_at;
    const isPlanExpired = site.subscription_expires_at && new Date(site.subscription_expires_at) < /* @__PURE__ */ new Date();
    if (hasNoPlan || isPlanExpired) {
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
              <h1>Site Unavailable</h1>
              <p>${isPlanExpired ? `The subscription for <strong>${site.brand_name || subdomain}</strong> has expired. Please contact the site owner to renew the plan and restore access.` : `<strong>${site.brand_name || subdomain}</strong> is not currently available. Please contact the site owner for more information.`}</p>
              <a href="https://${platformDomain}" class="btn">Go to Fluxe</a>
            </div>
          </body>
        </html>`,
        {
          status: 402,
          headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders() }
        }
      );
    }
    if (path === "/sitemap.xml") {
      return handleSitemap(request, env, site);
    }
    if (path === "/robots.txt") {
      return handleRobots(request, env, site);
    }
    return serveStorefrontApp(request, env, path, site);
  } catch (error) {
    console.error("Site routing error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
__name(handleSiteRouting, "handleSiteRouting");
async function handleSitemap(request, env, site) {
  try {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.hostname}`;
    const xml = await generateSitemap(env, site, baseUrl);
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        ...corsHeaders()
      }
    });
  } catch (err) {
    console.error("[SEO] Sitemap error:", err);
    return new Response("Failed to generate sitemap", { status: 500 });
  }
}
__name(handleSitemap, "handleSitemap");
async function handleRobots(request, env, site) {
  try {
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.hostname}`;
    const txt = generateRobots(site, baseUrl);
    return new Response(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        ...corsHeaders()
      }
    });
  } catch (err) {
    console.error("[SEO] Robots error:", err);
    return new Response("User-agent: *\nAllow: /\n", { status: 200 });
  }
}
__name(handleRobots, "handleRobots");
async function serveStorefrontApp(request, env, path, site) {
  const platformDomain = env.DOMAIN || PLATFORM_DOMAIN;
  const isAsset = path.startsWith("/assets/") || path.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|otf|map|json)$/i);
  if (isAsset) {
    const storefrontAssetPath = `/storefront${path}`;
    if (env.ASSETS) {
      try {
        const assetRequest = new Request(`https://placeholder.com${storefrontAssetPath}`);
        const response2 = await env.ASSETS.fetch(assetRequest);
        if (response2.ok) {
          const headers = new Headers(response2.headers);
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
          headers.set("Access-Control-Allow-Origin", "*");
          return new Response(response2.body, { status: 200, headers });
        }
      } catch (err) {
        console.error("[Storefront] ASSETS fetch error:", err);
      }
    }
    const domain = env.DOMAIN || PLATFORM_DOMAIN;
    const response = await fetch(`https://${domain}${storefrontAssetPath}`);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      headers.set("Access-Control-Allow-Origin", "*");
      return new Response(response.body, { status: 200, headers });
    }
    return new Response("Asset not found", { status: 404 });
  }
  const storefrontIndexPath = "/storefront/index.html";
  let rawHTML = null;
  if (env.ASSETS) {
    try {
      const assetRequest = new Request(`https://placeholder.com${storefrontIndexPath}`);
      const response = await env.ASSETS.fetch(assetRequest);
      if (response.ok) {
        rawHTML = await response.text();
      }
    } catch (err) {
      console.error("[Storefront] ASSETS index fetch error:", err);
    }
  }
  if (!rawHTML) {
    const domain = env.DOMAIN || PLATFORM_DOMAIN;
    const response = await fetch(`https://${domain}${storefrontIndexPath}`);
    if (!response.ok) {
      return new Response("Storefront not available", { status: 500 });
    }
    rawHTML = await response.text();
  }
  const isAdminPath = path.startsWith("/admin");
  const seoHTML = isAdminPath ? rawHTML : await applySEO(request, env, site, rawHTML);
  return new Response(seoHTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      "Content-Security-Policy": `frame-ancestors 'self' https://${platformDomain} https://www.${platformDomain}`,
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
init_d1_manager();

// utils/site-schema.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
function getSiteSchemaStatements() {
  const tables = [
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
      seo_title TEXT,
      seo_description TEXT,
      seo_og_image TEXT,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(site_id, slug)
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      category_id TEXT,
      subcategory_id TEXT,
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
      low_stock_threshold INTEGER DEFAULT 3,
      weight REAL,
      dimensions TEXT,
      images TEXT,
      thumbnail_url TEXT,
      tags TEXT,
      options TEXT,
      is_featured INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      seo_title TEXT,
      seo_description TEXT,
      seo_og_image TEXT,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
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
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
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
      coupon_code TEXT,
      notes TEXT,
      tracking_number TEXT,
      carrier TEXT,
      shipped_at TEXT,
      delivered_at TEXT,
      cancelled_at TEXT,
      cancellation_reason TEXT,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
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
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      user_id TEXT,
      session_id TEXT,
      items TEXT NOT NULL DEFAULT '[]',
      subtotal REAL DEFAULT 0,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(site_id, user_id, product_id)
    )`,
    `CREATE TABLE IF NOT EXISTS site_customers (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      email_verified INTEGER DEFAULT 0,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(site_id, email)
    )`,
    `CREATE TABLE IF NOT EXISTS site_customer_sessions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      site_id TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
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
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS customer_password_resets (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS customer_email_verifications (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
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
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
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
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      order_id TEXT,
      user_id TEXT,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      title TEXT,
      content TEXT,
      images TEXT,
      status TEXT DEFAULT 'pending',
      is_verified INTEGER DEFAULT 0,
      is_approved INTEGER DEFAULT 0,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS page_seo (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      page_type TEXT NOT NULL,
      seo_title TEXT,
      seo_description TEXT,
      seo_og_image TEXT,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(site_id, page_type)
    )`,
    `CREATE TABLE IF NOT EXISTS site_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT NOT NULL,
      storage_key TEXT NOT NULL UNIQUE,
      size_bytes INTEGER NOT NULL,
      media_type TEXT DEFAULT 'image',
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS site_usage (
      site_id TEXT PRIMARY KEY,
      d1_bytes_used INTEGER DEFAULT 0,
      r2_bytes_used INTEGER DEFAULT 0,
      baseline_bytes INTEGER DEFAULT 0,
      baseline_updated_at TEXT,
      last_updated TEXT DEFAULT (datetime('now'))
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
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
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
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT NOT NULL,
      page_path TEXT NOT NULL,
      referrer TEXT,
      country TEXT,
      device_type TEXT,
      browser TEXT,
      visitor_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS cancellation_requests (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      order_number TEXT,
      order_type TEXT DEFAULT 'order',
      reason TEXT NOT NULL,
      reason_detail TEXT,
      status TEXT DEFAULT 'requested',
      admin_note TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      cancel_token TEXT,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS return_requests (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      order_number TEXT,
      items TEXT,
      reason TEXT NOT NULL,
      reason_detail TEXT,
      photos TEXT,
      resolution TEXT,
      status TEXT DEFAULT 'requested',
      admin_note TEXT,
      refund_amount REAL,
      refund_id TEXT,
      return_token TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS site_staff (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      permissions TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(site_id, email)
    )`,
    `CREATE TABLE IF NOT EXISTS site_config (
      site_id TEXT PRIMARY KEY,
      brand_name TEXT,
      category TEXT,
      logo_url TEXT,
      favicon_url TEXT,
      primary_color TEXT DEFAULT '#000000',
      secondary_color TEXT DEFAULT '#ffffff',
      phone TEXT,
      email TEXT,
      address TEXT,
      social_links TEXT,
      settings TEXT DEFAULT '{}',
      currency TEXT DEFAULT 'INR',
      seo_title TEXT,
      seo_description TEXT,
      seo_og_image TEXT,
      seo_robots TEXT DEFAULT 'index, follow',
      google_verification TEXT,
      og_title TEXT,
      og_description TEXT,
      og_image TEXT,
      og_type TEXT DEFAULT 'website',
      twitter_card TEXT DEFAULT 'summary_large_image',
      twitter_title TEXT,
      twitter_description TEXT,
      twitter_image TEXT,
      twitter_site TEXT,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      excerpt TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      author TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      meta_title TEXT DEFAULT '',
      meta_description TEXT DEFAULT '',
      published_at TEXT,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(site_id, slug)
    )`
  ];
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(site_id, slug)",
    "CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)",
    "CREATE INDEX IF NOT EXISTS idx_products_site ON products(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)",
    "CREATE INDEX IF NOT EXISTS idx_products_site_slug ON products(site_id, slug)",
    "CREATE INDEX IF NOT EXISTS idx_products_featured ON products(site_id, is_featured)",
    "CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_site ON orders(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number)",
    "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(site_id, status)",
    "CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(site_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_guest_orders_site ON guest_orders(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_guest_orders_number ON guest_orders(order_number)",
    "CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id)",
    "CREATE INDEX IF NOT EXISTS idx_carts_site ON carts(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_wishlists_site ON wishlists(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_site_customers_site ON site_customers(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_site_customers_email ON site_customers(site_id, email)",
    "CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON site_customer_sessions(token)",
    "CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON site_customer_sessions(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_customer_addresses_site ON customer_addresses(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_customer_pw_reset_token ON customer_password_resets(token)",
    "CREATE INDEX IF NOT EXISTS idx_customer_email_verify_token ON customer_email_verifications(token)",
    "CREATE INDEX IF NOT EXISTS idx_coupons_site ON coupons(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(site_id, code)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_site ON notifications(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)",
    "CREATE INDEX IF NOT EXISTS idx_reviews_site ON reviews(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_activity_site ON activity_log(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_site_media_site ON site_media(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_site_media_key ON site_media(storage_key)",
    "CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_site_staff_site ON site_staff(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_site_staff_email ON site_staff(site_id, email)",
    "CREATE INDEX IF NOT EXISTS idx_cancel_requests_site ON cancellation_requests(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_cancel_requests_order ON cancellation_requests(order_id)",
    "CREATE INDEX IF NOT EXISTS idx_return_requests_site ON return_requests(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id)",
    "CREATE INDEX IF NOT EXISTS idx_return_requests_token ON return_requests(return_token)",
    "CREATE INDEX IF NOT EXISTS idx_page_views_site ON page_views(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(site_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(site_id, visitor_id)",
    "CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(site_id, page_path)",
    "CREATE INDEX IF NOT EXISTS idx_blog_posts_site ON blog_posts(site_id)",
    "CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(site_id, slug)",
    "CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(site_id, status)",
    "CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(site_id, published_at)"
  ];
  const addColumnMigrations = [
    "ALTER TABLE categories ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE products ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE product_variants ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE guest_orders ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE carts ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE wishlists ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE site_customers ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE site_customer_sessions ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE customer_addresses ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE customer_password_resets ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE customer_email_verifications ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE coupons ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE notifications ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE reviews ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE page_seo ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE site_media ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE activity_log ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE addresses ADD COLUMN row_size_bytes INTEGER DEFAULT 0",
    "ALTER TABLE site_usage ADD COLUMN baseline_bytes INTEGER DEFAULT 0",
    "ALTER TABLE site_usage ADD COLUMN baseline_updated_at TEXT",
    "ALTER TABLE products ADD COLUMN options TEXT",
    "ALTER TABLE orders ADD COLUMN confirmed_at TEXT",
    "ALTER TABLE orders ADD COLUMN packed_at TEXT",
    "ALTER TABLE orders ADD COLUMN cancel_token TEXT",
    "ALTER TABLE orders ADD COLUMN return_token TEXT",
    "ALTER TABLE guest_orders ADD COLUMN cancel_token TEXT",
    "ALTER TABLE guest_orders ADD COLUMN return_token TEXT",
    "ALTER TABLE guest_orders ADD COLUMN cancellation_reason TEXT",
    "ALTER TABLE orders ADD COLUMN shipping_cost REAL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN tax REAL DEFAULT 0",
    "ALTER TABLE guest_orders ADD COLUMN shipping_cost REAL DEFAULT 0",
    "ALTER TABLE products ADD COLUMN hsn_code TEXT",
    "ALTER TABLE products ADD COLUMN gst_rate REAL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN invoice_token TEXT",
    "ALTER TABLE orders ADD COLUMN customer_gstin TEXT",
    "ALTER TABLE guest_orders ADD COLUMN invoice_token TEXT",
    "ALTER TABLE guest_orders ADD COLUMN customer_gstin TEXT"
  ];
  return [...tables, ...indexes, ...addColumnMigrations];
}
__name(getSiteSchemaStatements, "getSiteSchemaStatements");

// workers/platform/admin-worker.js
init_usage_tracker();
init_site_db();
var ADMIN_EMAILS = [
  "savannaik090@gmail.com",
  "xiyohe3598@indevgo.com"
];
async function isOwner(user, env) {
  if (!user)
    return false;
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === user.email?.toLowerCase());
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
    case "transfer-ownership":
      return handleTransferOwnership(request, env, user);
    case "plans":
      return handlePlansManagement(request, env, pathParts);
    case "settings":
      return handleSettingsManagement(request, env);
    case "databases":
      return handleDatabaseManagement(request, env, pathParts);
    case "shards":
      return handleShardManagement(request, env, pathParts);
    case "enterprise":
      return handleEnterpriseManagement(request, env, pathParts, user);
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
      for (const s of sites) {
        try {
          const sdb = await resolveSiteDBById(env, s.id);
          const ordersCount = await sdb.prepare("SELECT COUNT(*) as count FROM orders WHERE site_id = ?").bind(s.id).first();
          totalOrders += ordersCount?.count || 0;
        } catch (e) {
        }
      }
    } catch (e) {
    }
    const ownerUser = users.find((u) => ADMIN_EMAILS.some((e) => e.toLowerCase() === u.email?.toLowerCase())) || null;
    return successResponse({
      users,
      sites,
      totalUsers: users.length,
      totalSites: sites.length,
      totalOrders,
      currentOwner: ownerUser ? { id: ownerUser.id, email: ownerUser.email, name: ownerUser.name } : { email: ADMIN_EMAILS[0] }
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
async function handleTransferOwnership(request, env, currentUser) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    if (currentUser.email.toLowerCase() !== ADMIN_EMAILS[0].toLowerCase()) {
      return errorResponse("Only the primary owner can transfer ownership", 403);
    }
    const { newOwnerEmail } = await request.json();
    if (!newOwnerEmail) {
      return errorResponse("New owner email is required");
    }
    if (!validateEmail(newOwnerEmail)) {
      return errorResponse("Invalid email format");
    }
    const newOwner = await env.DB.prepare(
      "SELECT id, email, name FROM users WHERE email = ?"
    ).bind(newOwnerEmail.toLowerCase()).first();
    if (!newOwner) {
      return errorResponse("No user found with that email. They must register first.", 404);
    }
    if (newOwner.id === currentUser.id) {
      return errorResponse("You are already the owner");
    }
    return successResponse(
      { newOwner: { id: newOwner.id, email: newOwner.email, name: newOwner.name } },
      `To transfer ownership, update the ADMIN_EMAILS array in admin-worker.js to include ${newOwner.email}`
    );
  } catch (error) {
    console.error("Transfer ownership error:", error);
    return errorResponse("Failed to transfer ownership", 500);
  }
}
__name(handleTransferOwnership, "handleTransferOwnership");
async function ensurePlansTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      plan_name TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      display_price REAL NOT NULL,
      razorpay_plan_id TEXT NOT NULL,
      features TEXT DEFAULT '[]',
      is_popular INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      plan_tier INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
  try {
    await env.DB.prepare(`ALTER TABLE subscription_plans ADD COLUMN plan_tier INTEGER DEFAULT 1`).run();
  } catch (e) {
  }
  try {
    await env.DB.prepare(`ALTER TABLE subscription_plans ADD COLUMN original_price REAL DEFAULT NULL`).run();
  } catch (e) {
  }
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
}
__name(ensurePlansTables, "ensurePlansTables");
async function handlePlansManagement(request, env, pathParts) {
  await ensurePlansTables(env);
  const planId = pathParts[3];
  if (request.method === "GET") {
    return getPlans(env);
  }
  if (request.method === "POST" && planId === "bulk") {
    return bulkSavePlan(request, env);
  }
  if (request.method === "DELETE" && planId === "bulk") {
    return bulkDeletePlan(request, env);
  }
  if (request.method === "POST") {
    return createPlan(request, env);
  }
  if (request.method === "PUT" && planId) {
    return updatePlan(request, env, planId);
  }
  if (request.method === "DELETE" && planId) {
    return deletePlan(env, planId);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handlePlansManagement, "handlePlansManagement");
async function getPlans(env) {
  try {
    const result = await env.DB.prepare(
      `SELECT * FROM subscription_plans ORDER BY display_order ASC, plan_name ASC`
    ).all();
    const plans = (result.results || []).map((p) => ({
      ...p,
      features: (() => {
        try {
          return JSON.parse(p.features);
        } catch {
          return [];
        }
      })()
    }));
    return successResponse(plans);
  } catch (error) {
    console.error("Get plans error:", error);
    return errorResponse("Failed to fetch plans", 500);
  }
}
__name(getPlans, "getPlans");
async function createPlan(request, env) {
  try {
    const { plan_name, billing_cycle, display_price, original_price, razorpay_plan_id, features, is_popular, display_order, plan_tier } = await request.json();
    if (!plan_name || !billing_cycle || display_price === void 0 || !razorpay_plan_id) {
      return errorResponse("Plan name, billing cycle, display price, and Razorpay Plan ID are required");
    }
    if (!plan_tier || plan_tier < 1 || plan_tier > 10) {
      return errorResponse("Plan tier is required (1-10)");
    }
    const validCycles = ["3months", "6months", "yearly", "3years"];
    if (!validCycles.includes(billing_cycle)) {
      return errorResponse("Billing cycle must be 3months, 6months, yearly, or 3years");
    }
    if (original_price != null && original_price !== "" && original_price !== 0) {
      const op = parseFloat(original_price);
      if (!isFinite(op) || op <= 0)
        return errorResponse("Original price must be a positive number");
      if (op <= parseFloat(display_price))
        return errorResponse("Original price must be greater than the display (discounted) price");
    }
    const id = generateId();
    await env.DB.prepare(
      `INSERT INTO subscription_plans (id, plan_name, billing_cycle, display_price, original_price, razorpay_plan_id, features, is_popular, display_order, plan_tier, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id,
      plan_name,
      billing_cycle,
      display_price,
      original_price || null,
      razorpay_plan_id,
      JSON.stringify(features || []),
      is_popular ? 1 : 0,
      display_order || 0,
      plan_tier
    ).run();
    return successResponse({ id }, "Plan created successfully");
  } catch (error) {
    console.error("Create plan error:", error);
    return errorResponse("Failed to create plan", 500);
  }
}
__name(createPlan, "createPlan");
async function updatePlan(request, env, planId) {
  try {
    const existing = await env.DB.prepare("SELECT * FROM subscription_plans WHERE id = ?").bind(planId).first();
    if (!existing) {
      return errorResponse("Plan not found", 404);
    }
    const updates = await request.json();
    const { plan_name, billing_cycle, display_price, original_price, razorpay_plan_id, features, is_popular, is_active, display_order, plan_tier } = updates;
    const effectiveOriginal = original_price !== void 0 ? original_price : existing.original_price;
    const effectiveDisplay = display_price ?? existing.display_price;
    if (effectiveOriginal != null && effectiveOriginal !== "" && effectiveOriginal !== 0) {
      const op = parseFloat(effectiveOriginal);
      if (!isFinite(op) || op <= 0)
        return errorResponse("Original price must be a positive number");
      if (op <= parseFloat(effectiveDisplay))
        return errorResponse("Original price must be greater than the display (discounted) price");
    }
    await env.DB.prepare(
      `UPDATE subscription_plans SET
        plan_name = ?,
        billing_cycle = ?,
        display_price = ?,
        original_price = ?,
        razorpay_plan_id = ?,
        features = ?,
        is_popular = ?,
        is_active = ?,
        display_order = ?,
        plan_tier = ?,
        updated_at = datetime('now')
      WHERE id = ?`
    ).bind(
      plan_name ?? existing.plan_name,
      billing_cycle ?? existing.billing_cycle,
      display_price ?? existing.display_price,
      original_price !== void 0 ? original_price || null : existing.original_price ?? null,
      razorpay_plan_id ?? existing.razorpay_plan_id,
      features ? JSON.stringify(features) : existing.features,
      is_popular !== void 0 ? is_popular ? 1 : 0 : existing.is_popular,
      is_active !== void 0 ? is_active ? 1 : 0 : existing.is_active,
      display_order ?? existing.display_order,
      plan_tier != null && plan_tier >= 1 && plan_tier <= 10 ? plan_tier : existing.plan_tier ?? 1,
      planId
    ).run();
    return successResponse(null, "Plan updated successfully");
  } catch (error) {
    console.error("Update plan error:", error);
    return errorResponse("Failed to update plan", 500);
  }
}
__name(updatePlan, "updatePlan");
async function bulkSavePlan(request, env) {
  try {
    const { plan_name, plan_tier, features, is_popular, display_order, cycles } = await request.json();
    if (!plan_name || !plan_tier || !cycles || !Array.isArray(cycles) || cycles.length === 0) {
      return errorResponse("Plan name, tier, and at least one billing cycle are required");
    }
    if (plan_tier < 1 || plan_tier > 10) {
      return errorResponse("Plan tier must be between 1 and 10");
    }
    const validCycles = ["3months", "6months", "yearly", "3years"];
    const featuresJson = JSON.stringify(features || []);
    const existingResult = await env.DB.prepare(
      `SELECT * FROM subscription_plans WHERE plan_name = ?`
    ).bind(plan_name).all();
    const existingByName = existingResult.results || [];
    const existingMap = {};
    for (const row of existingByName) {
      existingMap[row.billing_cycle] = row;
    }
    const activeCycleKeys = [];
    const errors = [];
    for (const cycle of cycles) {
      if (!cycle.billing_cycle || !validCycles.includes(cycle.billing_cycle)) {
        errors.push(`Invalid billing cycle: ${cycle.billing_cycle}`);
        continue;
      }
      if (!cycle.display_price || !cycle.razorpay_plan_id) {
        errors.push(`${cycle.billing_cycle}: price and Razorpay Plan ID are required`);
        continue;
      }
      const dp = parseFloat(cycle.display_price);
      if (!isFinite(dp) || dp <= 0) {
        errors.push(`${cycle.billing_cycle}: display price must be a positive number`);
        continue;
      }
      const op = cycle.original_price ? parseFloat(cycle.original_price) : null;
      if (op != null && (!isFinite(op) || op <= 0 || op <= dp)) {
        errors.push(`${cycle.billing_cycle}: original price must be greater than display price`);
        continue;
      }
      activeCycleKeys.push({ key: cycle.billing_cycle, dp, op, razorpay_plan_id: cycle.razorpay_plan_id });
    }
    if (errors.length > 0) {
      return errorResponse("Validation failed: " + errors.join("; "), 400);
    }
    if (activeCycleKeys.length === 0) {
      return errorResponse("At least one valid billing cycle is required", 400);
    }
    const statements = [];
    const activeCycleNames = activeCycleKeys.map((c) => c.key);
    for (const cycle of activeCycleKeys) {
      const existing = existingMap[cycle.key];
      if (existing) {
        statements.push(env.DB.prepare(
          `UPDATE subscription_plans SET
            plan_name = ?, plan_tier = ?, display_price = ?, original_price = ?,
            razorpay_plan_id = ?, features = ?, is_popular = ?, display_order = ?,
            is_active = 1, updated_at = datetime('now')
          WHERE id = ?`
        ).bind(
          plan_name,
          plan_tier,
          cycle.dp,
          cycle.op,
          cycle.razorpay_plan_id,
          featuresJson,
          is_popular ? 1 : 0,
          display_order || 0,
          existing.id
        ));
      } else {
        const id = generateId();
        statements.push(env.DB.prepare(
          `INSERT INTO subscription_plans (id, plan_name, billing_cycle, display_price, original_price, razorpay_plan_id, features, is_popular, display_order, plan_tier, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(
          id,
          plan_name,
          cycle.key,
          cycle.dp,
          cycle.op,
          cycle.razorpay_plan_id,
          featuresJson,
          is_popular ? 1 : 0,
          display_order || 0,
          plan_tier
        ));
      }
    }
    for (const [cycleKey, row] of Object.entries(existingMap)) {
      if (!activeCycleNames.includes(cycleKey)) {
        statements.push(env.DB.prepare(
          `UPDATE subscription_plans SET is_active = 0, updated_at = datetime('now') WHERE id = ?`
        ).bind(row.id));
      }
    }
    await env.DB.batch(statements);
    return successResponse(null, "Plan saved successfully across all billing cycles");
  } catch (error) {
    console.error("Bulk save plan error:", error);
    return errorResponse("Failed to save plan", 500);
  }
}
__name(bulkSavePlan, "bulkSavePlan");
async function bulkDeletePlan(request, env) {
  try {
    const { plan_name } = await request.json();
    if (!plan_name)
      return errorResponse("Plan name is required");
    await env.DB.prepare("DELETE FROM subscription_plans WHERE plan_name = ?").bind(plan_name).run();
    return successResponse(null, `All cycles of "${plan_name}" deleted successfully`);
  } catch (error) {
    console.error("Bulk delete plan error:", error);
    return errorResponse("Failed to delete plan", 500);
  }
}
__name(bulkDeletePlan, "bulkDeletePlan");
async function deletePlan(env, planId) {
  try {
    const existing = await env.DB.prepare("SELECT * FROM subscription_plans WHERE id = ?").bind(planId).first();
    if (!existing) {
      return errorResponse("Plan not found", 404);
    }
    await env.DB.prepare("DELETE FROM subscription_plans WHERE id = ?").bind(planId).run();
    return successResponse(null, "Plan deleted successfully");
  } catch (error) {
    console.error("Delete plan error:", error);
    return errorResponse("Failed to delete plan", 500);
  }
}
__name(deletePlan, "deletePlan");
async function handleSettingsManagement(request, env) {
  await ensurePlansTables(env);
  if (request.method === "GET") {
    return getSettings(env);
  }
  if (request.method === "PUT") {
    return updateSettings(request, env);
  }
  return errorResponse("Method not allowed", 405);
}
__name(handleSettingsManagement, "handleSettingsManagement");
async function getSettings(env) {
  try {
    const result = await env.DB.prepare(
      `SELECT setting_key, setting_value FROM platform_settings`
    ).all();
    const settings = {};
    for (const row of result.results || []) {
      settings[row.setting_key] = row.setting_value;
    }
    return successResponse(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    return errorResponse("Failed to fetch settings", 500);
  }
}
__name(getSettings, "getSettings");
async function updateSettings(request, env) {
  try {
    const updates = await request.json();
    const allowedKeys = ["razorpay_key_id", "enterprise_enabled", "enterprise_message", "enterprise_email"];
    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key))
        continue;
      await env.DB.prepare(
        `INSERT INTO platform_settings (setting_key, setting_value, updated_at) 
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = datetime('now')`
      ).bind(key, value, value).run();
    }
    return successResponse(null, "Settings updated successfully");
  } catch (error) {
    console.error("Update settings error:", error);
    return errorResponse("Failed to update settings", 500);
  }
}
__name(updateSettings, "updateSettings");
async function handleDatabaseManagement(request, env, pathParts) {
  const subAction = pathParts[3];
  const method = request.method;
  if (method === "GET" && !subAction) {
    return listSiteDatabases(env);
  }
  if (method === "GET" && subAction === "sizes") {
    return getSiteDatabaseSizes(env);
  }
  return errorResponse("Database endpoint not found", 404);
}
__name(handleDatabaseManagement, "handleDatabaseManagement");
async function listSiteDatabases(env) {
  try {
    const sites = await env.DB.prepare(
      `SELECT s.id, s.subdomain, s.brand_name, s.shard_id, s.d1_database_id, s.d1_binding_name, s.created_at,
              sh.binding_name as shard_binding, sh.database_name as shard_name
       FROM sites s
       LEFT JOIN shards sh ON s.shard_id = sh.id
       WHERE s.is_active = 1 ORDER BY s.created_at DESC`
    ).all();
    const siteList = (sites.results || []).map((s) => ({
      siteId: s.id,
      subdomain: s.subdomain,
      brandName: s.brand_name,
      shardId: s.shard_id,
      shardBinding: s.shard_binding,
      shardName: s.shard_name,
      d1DatabaseId: s.d1_database_id,
      d1BindingName: s.d1_binding_name,
      hasShardDB: !!s.shard_id,
      hasPerSiteDB: !!s.d1_database_id,
      createdAt: s.created_at
    }));
    return successResponse({
      sites: siteList,
      totalSites: siteList.length,
      sitesOnShards: siteList.filter((s) => s.hasShardDB).length,
      sitesOnPlatformDB: siteList.filter((s) => !s.hasShardDB && !s.hasPerSiteDB).length
    });
  } catch (error) {
    console.error("List site databases error:", error);
    return errorResponse("Failed to list databases", 500);
  }
}
__name(listSiteDatabases, "listSiteDatabases");
async function getSiteDatabaseSizes(env) {
  try {
    const shards = await env.DB.prepare("SELECT id, database_id, database_name, binding_name FROM shards").all();
    const sizeResults = [];
    for (const shard of shards.results || []) {
      try {
        const size = await getDatabaseSize(env, shard.database_id);
        sizeResults.push({
          shardId: shard.id,
          databaseName: shard.database_name,
          bindingName: shard.binding_name,
          sizeBytes: size,
          sizeMB: (size / (1024 * 1024)).toFixed(2)
        });
      } catch (e) {
        sizeResults.push({
          shardId: shard.id,
          databaseName: shard.database_name,
          error: e.message || "Failed to fetch size"
        });
      }
    }
    return successResponse(sizeResults);
  } catch (error) {
    console.error("Get database sizes error:", error);
    return errorResponse("Failed to get database sizes", 500);
  }
}
__name(getSiteDatabaseSizes, "getSiteDatabaseSizes");
async function handleShardManagement(request, env, pathParts) {
  const method = request.method;
  const shardId = pathParts[3];
  const subAction = pathParts[4];
  if (method === "GET" && !shardId) {
    return listShards(env);
  }
  if (method === "GET" && shardId === "sites" && !subAction) {
    return errorResponse("Shard ID required", 400);
  }
  if (method === "GET" && shardId && subAction === "sites") {
    return listShardSites(env, shardId);
  }
  if (method === "POST" && !shardId) {
    return createShard(request, env);
  }
  if (method === "POST" && shardId === "move-site") {
    return moveSiteBetweenShards(request, env);
  }
  if (method === "POST" && shardId && subAction === "reconcile") {
    return reconcileShardEndpoint(env, shardId);
  }
  if (method === "POST" && shardId && subAction === "set-active") {
    return setShardActive(request, env, shardId);
  }
  if (method === "DELETE" && shardId) {
    return deleteShardEndpoint(env, shardId);
  }
  return errorResponse("Shard endpoint not found", 404);
}
__name(handleShardManagement, "handleShardManagement");
async function listShards(env) {
  try {
    const result = await env.DB.prepare(
      "SELECT * FROM shards ORDER BY created_at ASC"
    ).all();
    const shards = [];
    for (const shard of result.results || []) {
      let sizeBytes = 0;
      let sizeMB = "0.00";
      try {
        sizeBytes = await getDatabaseSize(env, shard.database_id);
        sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
      } catch (e) {
      }
      const siteCount = await env.DB.prepare(
        "SELECT COUNT(*) as count FROM sites WHERE shard_id = ?"
      ).bind(shard.id).first();
      let bindingAvailable = false;
      try {
        const db = env[shard.binding_name];
        if (db) {
          await db.prepare("SELECT 1").first();
          bindingAvailable = true;
        }
      } catch (e) {
      }
      shards.push({
        ...shard,
        sizeBytes,
        sizeMB,
        siteCount: siteCount?.count || 0,
        sizeAlertGB: (sizeBytes / (1024 * 1024 * 1024)).toFixed(3),
        isNearLimit: sizeBytes > 8 * 1024 * 1024 * 1024,
        bindingAvailable
      });
    }
    return successResponse(shards);
  } catch (error) {
    console.error("List shards error:", error);
    return errorResponse("Failed to list shards", 500);
  }
}
__name(listShards, "listShards");
async function listShardSites(env, shardId) {
  try {
    const sites = await env.DB.prepare(
      `SELECT s.id, s.subdomain, s.brand_name, s.template_id, s.is_active, s.migration_locked, s.created_at,
              u.d1_bytes_used, u.r2_bytes_used, u.baseline_bytes
       FROM sites s
       LEFT JOIN site_usage u ON s.id = u.site_id
       WHERE s.shard_id = ?
       ORDER BY s.created_at DESC`
    ).bind(shardId).all();
    const shard = await env.DB.prepare("SELECT correction_factor FROM shards WHERE id = ?").bind(shardId).first();
    const factor = shard?.correction_factor || 1;
    const siteList = (sites.results || []).map((s) => {
      const raw = s.d1_bytes_used || 0;
      const baseline = s.baseline_bytes || 0;
      const displayed = Math.ceil((baseline + raw) * factor);
      return {
        siteId: s.id,
        subdomain: s.subdomain,
        brandName: s.brand_name,
        templateId: s.template_id,
        isActive: s.is_active,
        migrationLocked: s.migration_locked,
        d1BytesRaw: raw,
        baselineBytes: baseline,
        d1BytesDisplayed: displayed,
        r2BytesUsed: s.r2_bytes_used || 0,
        createdAt: s.created_at
      };
    });
    return successResponse({ sites: siteList, correctionFactor: factor });
  } catch (error) {
    console.error("List shard sites error:", error);
    return errorResponse("Failed to list shard sites", 500);
  }
}
__name(listShardSites, "listShardSites");
async function createShard(request, env) {
  try {
    const { name, setActive } = await request.json();
    if (!name) {
      return errorResponse("Database name is required");
    }
    const existingCount = await env.DB.prepare("SELECT COUNT(*) as count FROM shards").first();
    const shardNumber = (existingCount?.count || 0) + 1;
    const bindingName = `SHARD_${shardNumber}`;
    const dbResult = await createDatabase(env, name);
    const databaseId = dbResult.id;
    console.log(`Created shard D1 database: ${name} (${databaseId})`);
    const schemaStatements = getSiteSchemaStatements();
    await runSchemaOnDB(env, databaseId, schemaStatements);
    console.log(`Schema applied to shard DB: ${name}`);
    const shardId = generateId();
    if (setActive === true) {
      await env.DB.prepare("UPDATE shards SET is_active = 0").run();
    }
    await env.DB.prepare(
      `INSERT INTO shards (id, binding_name, database_id, database_name, is_active, correction_factor, created_at)
       VALUES (?, ?, ?, ?, ?, 1.0, datetime('now'))`
    ).bind(shardId, bindingName, databaseId, name, setActive === true ? 1 : 0).run();
    let bindingAdded = false;
    try {
      await addBindingAndRedeploy(env, shardId, databaseId, bindingName);
      bindingAdded = true;
      console.log(`Worker redeployed with shard binding ${bindingName}`);
    } catch (redeployErr) {
      console.error("Worker redeploy warning:", redeployErr.message || redeployErr);
    }
    return successResponse({
      shardId,
      bindingName,
      databaseId,
      databaseName: name,
      isActive: setActive === true,
      bindingAdded,
      note: bindingAdded ? void 0 : `Shard created but binding not auto-added. Add to wrangler.toml: [[d1_databases]] binding="${bindingName}" database_name="${name}" database_id="${databaseId}"`
    }, `Shard "${name}" created successfully with binding ${bindingName}`);
  } catch (error) {
    console.error("Create shard error:", error);
    return errorResponse("Failed to create shard: " + (error.message || "Unknown error"), 500);
  }
}
__name(createShard, "createShard");
async function setShardActive(request, env, shardId) {
  try {
    const shard = await env.DB.prepare("SELECT id FROM shards WHERE id = ?").bind(shardId).first();
    if (!shard)
      return errorResponse("Shard not found", 404);
    await env.DB.prepare("UPDATE shards SET is_active = 0").run();
    await env.DB.prepare("UPDATE shards SET is_active = 1 WHERE id = ?").bind(shardId).run();
    return successResponse({ shardId }, "Shard set as active");
  } catch (error) {
    console.error("Set shard active error:", error);
    return errorResponse("Failed to set shard active", 500);
  }
}
__name(setShardActive, "setShardActive");
async function reconcileShardEndpoint(env, shardId) {
  try {
    const result = await reconcileShard(env, shardId);
    if (!result) {
      return errorResponse("Failed to reconcile shard", 500);
    }
    return successResponse(result, "Shard reconciled successfully");
  } catch (error) {
    console.error("Reconcile shard error:", error);
    return errorResponse("Failed to reconcile shard", 500);
  }
}
__name(reconcileShardEndpoint, "reconcileShardEndpoint");
var MIGRATION_TABLES_SITE_ID = [
  "site_config",
  "categories",
  "products",
  "orders",
  "guest_orders",
  "carts",
  "wishlists",
  "site_customers",
  "site_customer_sessions",
  "customer_addresses",
  "customer_password_resets",
  "customer_email_verifications",
  "coupons",
  "notifications",
  "reviews",
  "page_seo",
  "site_media",
  "site_staff",
  "cancellation_requests",
  "return_requests",
  "site_usage",
  "activity_log",
  "page_views"
];
var MIGRATION_TABLES_FK = [
  { table: "product_variants", fk: "product_id", resolveFrom: "products", resolveKey: "site_id" },
  { table: "addresses", fk: "user_id", resolveFrom: "site_customers", resolveKey: "site_id" }
];
async function batchInsertRows(targetDB, table, rows) {
  const BATCH_SIZE = 25;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const stmts = batch.map((row) => {
      const columns = Object.keys(row);
      const placeholders = columns.map(() => "?").join(", ");
      const values = columns.map((c) => row[c]);
      return targetDB.prepare(
        `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
      ).bind(...values);
    });
    try {
      await targetDB.batch(stmts);
      inserted += batch.length;
    } catch (batchErr) {
      for (const row of batch) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => "?").join(", ");
        const values = columns.map((c) => row[c]);
        try {
          await targetDB.prepare(
            `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
          ).bind(...values).run();
          inserted++;
        } catch (insertErr) {
          console.error(`Migration insert error for ${table}:`, insertErr.message);
        }
      }
    }
  }
  return inserted;
}
__name(batchInsertRows, "batchInsertRows");
var AUTOINCREMENT_TABLES = /* @__PURE__ */ new Set(["page_views", "site_media"]);
async function migrateTableBySiteId(sourceDB, targetDB, table, siteId) {
  let copied = 0;
  let offset = 0;
  const batchSize = 1e3;
  const stripId = AUTOINCREMENT_TABLES.has(table);
  while (true) {
    const result = await sourceDB.prepare(
      `SELECT * FROM ${table} WHERE site_id = ? LIMIT ? OFFSET ?`
    ).bind(siteId, batchSize, offset).all();
    const rows = result.results || [];
    if (rows.length === 0)
      break;
    const processedRows = stripId ? rows.map((row) => {
      const { id, ...rest } = row;
      return rest;
    }) : rows;
    copied += await batchInsertRows(targetDB, table, processedRows);
    offset += batchSize;
    if (rows.length < batchSize)
      break;
  }
  return copied;
}
__name(migrateTableBySiteId, "migrateTableBySiteId");
async function moveSiteBetweenShards(request, env) {
  try {
    const { siteId, targetShardId } = await request.json();
    if (!siteId || !targetShardId) {
      return errorResponse("siteId and targetShardId are required");
    }
    const site = await env.DB.prepare(
      "SELECT id, subdomain, shard_id, migration_locked FROM sites WHERE id = ?"
    ).bind(siteId).first();
    if (!site)
      return errorResponse("Site not found", 404);
    if (site.migration_locked)
      return errorResponse("Site is currently being migrated", 423);
    if (site.shard_id === targetShardId)
      return errorResponse("Site is already on this shard", 400);
    const targetShard = await env.DB.prepare(
      "SELECT id, binding_name, database_id FROM shards WHERE id = ?"
    ).bind(targetShardId).first();
    if (!targetShard)
      return errorResponse("Target shard not found", 404);
    const sourceShardId = site.shard_id;
    if (!sourceShardId)
      return errorResponse("Site is not on any shard (still on platform DB). Cannot migrate.", 400);
    const sourceShard = await env.DB.prepare(
      "SELECT id, binding_name FROM shards WHERE id = ?"
    ).bind(sourceShardId).first();
    if (!sourceShard)
      return errorResponse("Source shard not found", 404);
    const sourceDB = env[sourceShard.binding_name];
    const targetDB = env[targetShard.binding_name];
    if (!sourceDB)
      return errorResponse(`Source shard binding ${sourceShard.binding_name} not found in env`, 500);
    if (!targetDB)
      return errorResponse(`Target shard binding ${targetShard.binding_name} not found in env`, 500);
    await env.DB.prepare(
      "UPDATE sites SET migration_locked = 1, updated_at = datetime('now') WHERE id = ?"
    ).bind(siteId).run();
    const schemaStatements = getSiteSchemaStatements();
    for (const sql of schemaStatements) {
      try {
        await targetDB.prepare(sql).run();
      } catch (e) {
      }
    }
    const migrationStats = {};
    const skippedTables = [];
    let migrationError = null;
    const allMigratedTables = [];
    try {
      for (const table of MIGRATION_TABLES_SITE_ID) {
        let tableExists = false;
        try {
          await sourceDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE site_id = ?`).bind(siteId).first();
          tableExists = true;
        } catch (e) {
          const msg = (e.message || "").toLowerCase();
          if (msg.includes("no such table") || msg.includes("does not exist")) {
            skippedTables.push(table);
            continue;
          }
          throw new Error(`Failed to read table ${table} on source shard: ${e.message}`);
        }
        const copied = await migrateTableBySiteId(sourceDB, targetDB, table, siteId);
        migrationStats[table] = copied;
        allMigratedTables.push({ table, keyCol: "site_id" });
      }
      for (const { table, fk, resolveFrom, resolveKey } of MIGRATION_TABLES_FK) {
        try {
          await sourceDB.prepare(`SELECT COUNT(*) as c FROM ${table} LIMIT 1`).first();
        } catch (e) {
          const msg = (e.message || "").toLowerCase();
          if (msg.includes("no such table") || msg.includes("does not exist")) {
            skippedTables.push(table);
            continue;
          }
          throw new Error(`Failed to read table ${table} on source shard: ${e.message}`);
        }
        const parentIdsResult = await sourceDB.prepare(
          `SELECT id FROM ${resolveFrom} WHERE ${resolveKey} = ?`
        ).bind(siteId).all();
        const parentIds = (parentIdsResult.results || []).map((r) => r.id);
        if (parentIds.length === 0) {
          migrationStats[table] = 0;
          allMigratedTables.push({ table, keyCol: fk, parentIds: [] });
          continue;
        }
        let copied = 0;
        const ID_BATCH = 50;
        for (let i = 0; i < parentIds.length; i += ID_BATCH) {
          const idBatch = parentIds.slice(i, i + ID_BATCH);
          const placeholders = idBatch.map(() => "?").join(", ");
          const result = await sourceDB.prepare(
            `SELECT * FROM ${table} WHERE ${fk} IN (${placeholders})`
          ).bind(...idBatch).all();
          const rows = result.results || [];
          if (rows.length > 0) {
            copied += await batchInsertRows(targetDB, table, rows);
          }
        }
        migrationStats[table] = copied;
        allMigratedTables.push({ table, keyCol: fk, parentIds });
      }
      const verificationErrors = [];
      for (const { table, keyCol, parentIds } of allMigratedTables) {
        let sourceCount = 0;
        let targetCount = 0;
        if (keyCol === "site_id") {
          const sc = await sourceDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE site_id = ?`).bind(siteId).first();
          sourceCount = sc?.c || 0;
          const tc = await targetDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE site_id = ?`).bind(siteId).first();
          targetCount = tc?.c || 0;
        } else if (parentIds && parentIds.length > 0) {
          const ID_BATCH = 50;
          for (let i = 0; i < parentIds.length; i += ID_BATCH) {
            const idBatch = parentIds.slice(i, i + ID_BATCH);
            const placeholders = idBatch.map(() => "?").join(", ");
            const sc = await sourceDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE ${keyCol} IN (${placeholders})`).bind(...idBatch).first();
            sourceCount += sc?.c || 0;
            const tc = await targetDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE ${keyCol} IN (${placeholders})`).bind(...idBatch).first();
            targetCount += tc?.c || 0;
          }
        }
        if (sourceCount > 0 && targetCount < sourceCount) {
          verificationErrors.push(`${table}: source=${sourceCount}, target=${targetCount}`);
        }
      }
      if (verificationErrors.length > 0) {
        throw new Error(`Verification failed: ${verificationErrors.join("; ")}`);
      }
      const usage = await env.DB.prepare(
        "SELECT d1_bytes_used, baseline_bytes FROM site_usage WHERE site_id = ?"
      ).bind(siteId).first();
      const oldBaseline = usage?.baseline_bytes || 0;
      const oldTracked = usage?.d1_bytes_used || 0;
      const newBaseline = oldBaseline + oldTracked;
      await env.DB.prepare(
        `UPDATE site_usage SET baseline_bytes = ?, d1_bytes_used = 0, baseline_updated_at = datetime('now'), last_updated = datetime('now') WHERE site_id = ?`
      ).bind(newBaseline, siteId).run();
      await env.DB.prepare(
        "UPDATE sites SET shard_id = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(targetShardId, siteId).run();
      for (const { table, keyCol, parentIds } of allMigratedTables) {
        try {
          if (keyCol === "site_id") {
            await sourceDB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId).run();
          } else if (parentIds && parentIds.length > 0) {
            const ID_BATCH = 50;
            for (let i = 0; i < parentIds.length; i += ID_BATCH) {
              const idBatch = parentIds.slice(i, i + ID_BATCH);
              const placeholders = idBatch.map(() => "?").join(", ");
              await sourceDB.prepare(`DELETE FROM ${table} WHERE ${keyCol} IN (${placeholders})`).bind(...idBatch).run();
            }
          }
        } catch (e) {
          console.error(`Source cleanup error for ${table}:`, e.message);
        }
      }
    } catch (err) {
      migrationError = err.message || "Unknown migration error";
      console.error("Migration failed, rolling back:", migrationError);
      for (const { table, keyCol, parentIds } of allMigratedTables) {
        try {
          if (keyCol === "site_id") {
            await targetDB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId).run();
          } else if (parentIds && parentIds.length > 0) {
            const ID_BATCH = 50;
            for (let i = 0; i < parentIds.length; i += ID_BATCH) {
              const idBatch = parentIds.slice(i, i + ID_BATCH);
              const placeholders = idBatch.map(() => "?").join(", ");
              await targetDB.prepare(`DELETE FROM ${table} WHERE ${keyCol} IN (${placeholders})`).bind(...idBatch).run();
            }
          }
        } catch (e) {
        }
      }
    }
    await env.DB.prepare(
      "UPDATE sites SET migration_locked = 0, updated_at = datetime('now') WHERE id = ?"
    ).bind(siteId).run();
    if (migrationError) {
      return errorResponse(`Migration failed and was rolled back: ${migrationError}`, 500);
    }
    return successResponse({
      siteId,
      fromShard: sourceShardId,
      toShard: targetShardId,
      tables: migrationStats,
      skippedTables: skippedTables.length > 0 ? skippedTables : void 0
    }, `Site ${site.subdomain} migrated successfully`);
  } catch (error) {
    console.error("Move site error:", error);
    try {
      const { siteId } = await request.clone().json();
      if (siteId) {
        await env.DB.prepare("UPDATE sites SET migration_locked = 0 WHERE id = ?").bind(siteId).run();
      }
    } catch (e) {
    }
    return errorResponse("Failed to move site: " + (error.message || "Unknown error"), 500);
  }
}
__name(moveSiteBetweenShards, "moveSiteBetweenShards");
async function ensureEnterpriseTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS enterprise_sites (
      site_id TEXT PRIMARY KEY,
      assigned_at TEXT DEFAULT (datetime('now')),
      assigned_by TEXT,
      notes TEXT,
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS enterprise_usage_monthly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT NOT NULL,
      year_month TEXT NOT NULL,
      d1_overage_bytes INTEGER DEFAULT 0,
      r2_overage_bytes INTEGER DEFAULT 0,
      d1_cost_inr REAL DEFAULT 0,
      r2_cost_inr REAL DEFAULT 0,
      total_cost_inr REAL DEFAULT 0,
      status TEXT DEFAULT 'unpaid',
      paid_at TEXT,
      notes TEXT,
      snapshot_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
      UNIQUE(site_id, year_month)
    )
  `).run();
}
__name(ensureEnterpriseTables, "ensureEnterpriseTables");
async function handleEnterpriseManagement(request, env, pathParts, user) {
  await ensureEnterpriseTables(env);
  const subAction = pathParts[3];
  const method = request.method;
  if (method === "GET" && !subAction) {
    return listEnterpriseSites(env);
  }
  if (method === "GET" && subAction === "rates") {
    return getOverageRates2(env);
  }
  if (method === "PUT" && subAction === "rates") {
    return updateOverageRates(request, env);
  }
  if (method === "GET" && subAction === "usage") {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId required", 400);
    return getEnterpriseSiteUsage(env, siteId);
  }
  if (method === "GET" && subAction === "invoices") {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    return getEnterpriseInvoices(env, siteId);
  }
  if (method === "POST" && subAction === "assign") {
    return assignEnterpriseSite(request, env, user);
  }
  if (method === "POST" && subAction === "remove") {
    return removeEnterpriseSite(request, env);
  }
  if (method === "POST" && subAction === "snapshot") {
    return snapshotEnterpriseUsage(request, env);
  }
  if (method === "POST" && subAction === "mark-paid") {
    return markInvoicePaid(request, env);
  }
  if (method === "GET" && subAction === "search") {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    if (!q || q.length < 2)
      return errorResponse("Search query must be at least 2 characters", 400);
    return searchSitesForEnterprise(env, q);
  }
  return errorResponse("Enterprise endpoint not found", 404);
}
__name(handleEnterpriseManagement, "handleEnterpriseManagement");
async function getOverageRates2(env) {
  try {
    const result = await env.DB.prepare(
      `SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('overage_rate_d1_per_gb', 'overage_rate_r2_per_gb')`
    ).all();
    const rates = { d1PerGB: 0.75, r2PerGB: 0.015 };
    for (const row of result.results || []) {
      if (row.setting_key === "overage_rate_d1_per_gb") {
        const v = parseFloat(row.setting_value);
        if (!isNaN(v) && v >= 0)
          rates.d1PerGB = v;
      }
      if (row.setting_key === "overage_rate_r2_per_gb") {
        const v = parseFloat(row.setting_value);
        if (!isNaN(v) && v >= 0)
          rates.r2PerGB = v;
      }
    }
    return successResponse(rates);
  } catch (e) {
    return successResponse({ d1PerGB: 0.75, r2PerGB: 0.015 });
  }
}
__name(getOverageRates2, "getOverageRates");
async function updateOverageRates(request, env) {
  try {
    const { d1PerGB, r2PerGB } = await request.json();
    await ensurePlansTables(env);
    if (d1PerGB !== void 0 && (isNaN(parseFloat(d1PerGB)) || parseFloat(d1PerGB) < 0)) {
      return errorResponse("d1PerGB must be a non-negative number", 400);
    }
    if (r2PerGB !== void 0 && (isNaN(parseFloat(r2PerGB)) || parseFloat(r2PerGB) < 0)) {
      return errorResponse("r2PerGB must be a non-negative number", 400);
    }
    if (d1PerGB !== void 0) {
      await env.DB.prepare(
        `INSERT INTO platform_settings (setting_key, setting_value, updated_at) VALUES ('overage_rate_d1_per_gb', ?, datetime('now'))
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = datetime('now')`
      ).bind(String(d1PerGB), String(d1PerGB)).run();
    }
    if (r2PerGB !== void 0) {
      await env.DB.prepare(
        `INSERT INTO platform_settings (setting_key, setting_value, updated_at) VALUES ('overage_rate_r2_per_gb', ?, datetime('now'))
         ON CONFLICT(setting_key) DO UPDATE SET setting_value = ?, updated_at = datetime('now')`
      ).bind(String(r2PerGB), String(r2PerGB)).run();
    }
    return successResponse(null, "Overage rates updated");
  } catch (error) {
    return errorResponse("Failed to update rates: " + error.message, 500);
  }
}
__name(updateOverageRates, "updateOverageRates");
async function listEnterpriseSites(env) {
  try {
    const result = await env.DB.prepare(`
      SELECT es.site_id, es.assigned_at, es.assigned_by, es.notes,
             s.subdomain, s.brand_name, s.user_id,
             u.name as user_name, u.email as user_email,
             su.d1_bytes_used, su.r2_bytes_used, su.last_updated as usage_updated
      FROM enterprise_sites es
      JOIN sites s ON es.site_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN site_usage su ON es.site_id = su.site_id
      ORDER BY es.assigned_at DESC
    `).all();
    const ratesResult = await env.DB.prepare(
      `SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('overage_rate_d1_per_gb', 'overage_rate_r2_per_gb')`
    ).all();
    const rates = { d1PerGB: 0.75, r2PerGB: 0.015 };
    for (const row of ratesResult.results || []) {
      if (row.setting_key === "overage_rate_d1_per_gb") {
        const v = parseFloat(row.setting_value);
        if (!isNaN(v) && v >= 0)
          rates.d1PerGB = v;
      }
      if (row.setting_key === "overage_rate_r2_per_gb") {
        const v = parseFloat(row.setting_value);
        if (!isNaN(v) && v >= 0)
          rates.r2PerGB = v;
      }
    }
    const d1LimitBytes = 2 * 1024 * 1024 * 1024;
    const r2LimitBytes = 50 * 1024 * 1024 * 1024;
    const sites = await Promise.all((result.results || []).map(async (row) => {
      const usage = await getSiteUsage(env, row.site_id);
      const d1Used = usage.d1BytesUsed;
      const r2Used = usage.r2BytesUsed;
      const d1Overage = Math.max(0, d1Used - d1LimitBytes);
      const r2Overage = Math.max(0, r2Used - r2LimitBytes);
      const d1Cost = d1Overage / (1024 * 1024 * 1024) * rates.d1PerGB;
      const r2Cost = r2Overage / (1024 * 1024 * 1024) * rates.r2PerGB;
      return {
        siteId: row.site_id,
        subdomain: row.subdomain,
        brandName: row.brand_name,
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        assignedAt: row.assigned_at,
        assignedBy: row.assigned_by,
        notes: row.notes,
        d1Used,
        r2Used,
        d1Limit: d1LimitBytes,
        r2Limit: r2LimitBytes,
        d1Overage,
        r2Overage,
        currentMonthCost: Math.round((d1Cost + r2Cost) * 100) / 100,
        d1CostINR: Math.round(d1Cost * 100) / 100,
        r2CostINR: Math.round(r2Cost * 100) / 100,
        usageUpdated: row.usage_updated
      };
    }));
    return successResponse({ sites, rates });
  } catch (error) {
    console.error("List enterprise sites error:", error);
    return errorResponse("Failed to list enterprise sites", 500);
  }
}
__name(listEnterpriseSites, "listEnterpriseSites");
async function assignEnterpriseSite(request, env, user) {
  try {
    const { siteId, notes } = await request.json();
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const site = await env.DB.prepare("SELECT id, subdomain, brand_name FROM sites WHERE id = ?").bind(siteId).first();
    if (!site)
      return errorResponse("Site not found", 404);
    const activeSub = await env.DB.prepare(
      `SELECT id, razorpay_subscription_id FROM subscriptions WHERE site_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(siteId).first();
    if (activeSub?.razorpay_subscription_id) {
      const razorpayCancelled = await cancelRazorpaySubscription(env, activeSub.razorpay_subscription_id);
      if (!razorpayCancelled) {
        return errorResponse("Failed to cancel existing Razorpay subscription. Cannot assign enterprise until recurring billing is stopped. Please try again or cancel the subscription manually in the Razorpay dashboard first.", 500);
      }
    }
    await env.DB.prepare(`
      INSERT INTO enterprise_sites (site_id, assigned_at, assigned_by, notes)
      VALUES (?, datetime('now'), ?, ?)
      ON CONFLICT(site_id) DO UPDATE SET assigned_by = ?, notes = ?, assigned_at = datetime('now')
    `).bind(siteId, user.email, notes || null, user.email, notes || null).run();
    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = 'enterprise', subscription_expires_at = '2099-12-31T23:59:59', is_active = 1, updated_at = datetime('now') WHERE id = ?`
    ).bind(siteId).run();
    if (activeSub) {
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'enterprise_override', updated_at = datetime('now') WHERE site_id = ? AND status = 'active'`
      ).bind(siteId).run();
    }
    return successResponse({ siteId, subdomain: site.subdomain }, "Site assigned as enterprise");
  } catch (error) {
    console.error("Assign enterprise error:", error);
    return errorResponse("Failed to assign enterprise: " + error.message, 500);
  }
}
__name(assignEnterpriseSite, "assignEnterpriseSite");
async function removeEnterpriseSite(request, env) {
  try {
    const { siteId } = await request.json();
    if (!siteId)
      return errorResponse("siteId is required", 400);
    await env.DB.prepare("DELETE FROM enterprise_sites WHERE site_id = ?").bind(siteId).run();
    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE site_id = ? AND status = 'enterprise_override'`
    ).bind(siteId).run();
    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = NULL, subscription_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`
    ).bind(siteId).run();
    return successResponse({ siteId }, "Enterprise status removed. The site has no active plan \u2014 the user will need to subscribe to a new plan.");
  } catch (error) {
    return errorResponse("Failed to remove enterprise: " + error.message, 500);
  }
}
__name(removeEnterpriseSite, "removeEnterpriseSite");
async function getEnterpriseSiteUsage(env, siteId) {
  try {
    const site = await env.DB.prepare(`
      SELECT es.site_id, s.subdomain, s.brand_name
      FROM enterprise_sites es
      JOIN sites s ON es.site_id = s.id
      WHERE es.site_id = ?
    `).bind(siteId).first();
    if (!site)
      return errorResponse("Enterprise site not found", 404);
    const usage = await getSiteUsage(env, siteId);
    const ratesResult = await env.DB.prepare(
      `SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('overage_rate_d1_per_gb', 'overage_rate_r2_per_gb')`
    ).all();
    const rates = { d1PerGB: 0.75, r2PerGB: 0.015 };
    for (const row of ratesResult.results || []) {
      if (row.setting_key === "overage_rate_d1_per_gb") {
        const v = parseFloat(row.setting_value);
        if (!isNaN(v) && v >= 0)
          rates.d1PerGB = v;
      }
      if (row.setting_key === "overage_rate_r2_per_gb") {
        const v = parseFloat(row.setting_value);
        if (!isNaN(v) && v >= 0)
          rates.r2PerGB = v;
      }
    }
    const d1LimitBytes = 2 * 1024 * 1024 * 1024;
    const r2LimitBytes = 50 * 1024 * 1024 * 1024;
    const d1Used = usage.d1BytesUsed;
    const r2Used = usage.r2BytesUsed;
    const d1Overage = Math.max(0, d1Used - d1LimitBytes);
    const r2Overage = Math.max(0, r2Used - r2LimitBytes);
    const d1Cost = d1Overage / (1024 * 1024 * 1024) * rates.d1PerGB;
    const r2Cost = r2Overage / (1024 * 1024 * 1024) * rates.r2PerGB;
    const invoices = await env.DB.prepare(
      `SELECT * FROM enterprise_usage_monthly WHERE site_id = ? ORDER BY year_month DESC LIMIT 24`
    ).bind(siteId).all();
    return successResponse({
      siteId,
      subdomain: site.subdomain,
      brandName: site.brand_name,
      d1Used,
      r2Used,
      d1Limit: d1LimitBytes,
      r2Limit: r2LimitBytes,
      d1Overage,
      r2Overage,
      currentMonthCost: Math.round((d1Cost + r2Cost) * 100) / 100,
      d1CostINR: Math.round(d1Cost * 100) / 100,
      r2CostINR: Math.round(r2Cost * 100) / 100,
      rates,
      invoices: invoices.results || [],
      usageUpdated: usage.lastUpdated
    });
  } catch (error) {
    console.error("Get enterprise usage error:", error);
    return errorResponse("Failed to get enterprise usage", 500);
  }
}
__name(getEnterpriseSiteUsage, "getEnterpriseSiteUsage");
async function getEnterpriseInvoices(env, siteId) {
  try {
    let query = `SELECT eum.*, s.subdomain, s.brand_name
                 FROM enterprise_usage_monthly eum
                 JOIN sites s ON eum.site_id = s.id`;
    const bindings = [];
    if (siteId) {
      query += " WHERE eum.site_id = ?";
      bindings.push(siteId);
    }
    query += " ORDER BY eum.year_month DESC LIMIT 100";
    const stmt = bindings.length > 0 ? env.DB.prepare(query).bind(...bindings) : env.DB.prepare(query);
    const result = await stmt.all();
    return successResponse({ invoices: result.results || [] });
  } catch (error) {
    return errorResponse("Failed to get invoices", 500);
  }
}
__name(getEnterpriseInvoices, "getEnterpriseInvoices");
async function snapshotEnterpriseUsage(request, env) {
  try {
    const { siteId, yearMonth } = await request.json();
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const now = /* @__PURE__ */ new Date();
    const month = yearMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const entCheck = await env.DB.prepare("SELECT site_id FROM enterprise_sites WHERE site_id = ?").bind(siteId).first();
    if (!entCheck)
      return errorResponse("Enterprise site not found", 404);
    const usage = await getSiteUsage(env, siteId);
    const ratesResult = await env.DB.prepare(
      `SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('overage_rate_d1_per_gb', 'overage_rate_r2_per_gb')`
    ).all();
    const rates = { d1PerGB: 0.75, r2PerGB: 0.015 };
    for (const row of ratesResult.results || []) {
      if (row.setting_key === "overage_rate_d1_per_gb") {
        const v = parseFloat(row.setting_value);
        if (!isNaN(v) && v >= 0)
          rates.d1PerGB = v;
      }
      if (row.setting_key === "overage_rate_r2_per_gb") {
        const v = parseFloat(row.setting_value);
        if (!isNaN(v) && v >= 0)
          rates.r2PerGB = v;
      }
    }
    const d1LimitBytes = 2 * 1024 * 1024 * 1024;
    const r2LimitBytes = 50 * 1024 * 1024 * 1024;
    const d1Used = usage.d1BytesUsed;
    const r2Used = usage.r2BytesUsed;
    const d1Overage = Math.max(0, d1Used - d1LimitBytes);
    const r2Overage = Math.max(0, r2Used - r2LimitBytes);
    const d1Cost = d1Overage / (1024 * 1024 * 1024) * rates.d1PerGB;
    const r2Cost = r2Overage / (1024 * 1024 * 1024) * rates.r2PerGB;
    const totalCost = Math.round((d1Cost + r2Cost) * 100) / 100;
    await env.DB.prepare(`
      INSERT INTO enterprise_usage_monthly (site_id, year_month, d1_overage_bytes, r2_overage_bytes, d1_cost_inr, r2_cost_inr, total_cost_inr, status, snapshot_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'unpaid', datetime('now'))
      ON CONFLICT(site_id, year_month) DO UPDATE SET
        d1_overage_bytes = ?, r2_overage_bytes = ?,
        d1_cost_inr = ?, r2_cost_inr = ?, total_cost_inr = ?,
        snapshot_at = datetime('now')
    `).bind(
      siteId,
      month,
      d1Overage,
      r2Overage,
      Math.round(d1Cost * 100) / 100,
      Math.round(r2Cost * 100) / 100,
      totalCost,
      d1Overage,
      r2Overage,
      Math.round(d1Cost * 100) / 100,
      Math.round(r2Cost * 100) / 100,
      totalCost
    ).run();
    return successResponse({ siteId, yearMonth: month, totalCost }, "Usage snapshot saved");
  } catch (error) {
    console.error("Snapshot error:", error);
    return errorResponse("Failed to snapshot usage: " + error.message, 500);
  }
}
__name(snapshotEnterpriseUsage, "snapshotEnterpriseUsage");
async function markInvoicePaid(request, env) {
  try {
    const { siteId, yearMonth, notes } = await request.json();
    if (!siteId || !yearMonth)
      return errorResponse("siteId and yearMonth required", 400);
    const invoice = await env.DB.prepare(
      "SELECT * FROM enterprise_usage_monthly WHERE site_id = ? AND year_month = ?"
    ).bind(siteId, yearMonth).first();
    if (!invoice)
      return errorResponse("Invoice not found", 404);
    await env.DB.prepare(
      `UPDATE enterprise_usage_monthly SET status = 'paid', paid_at = datetime('now'), notes = ? WHERE site_id = ? AND year_month = ?`
    ).bind(notes || null, siteId, yearMonth).run();
    return successResponse({ siteId, yearMonth }, "Invoice marked as paid");
  } catch (error) {
    return errorResponse("Failed to mark paid: " + error.message, 500);
  }
}
__name(markInvoicePaid, "markInvoicePaid");
async function searchSitesForEnterprise(env, query) {
  try {
    const searchPattern = `%${query}%`;
    const result = await env.DB.prepare(`
      SELECT s.id, s.subdomain, s.brand_name, s.subscription_plan, s.is_active,
             u.name as user_name, u.email as user_email,
             CASE WHEN es.site_id IS NOT NULL THEN 1 ELSE 0 END as is_enterprise
      FROM sites s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN enterprise_sites es ON s.id = es.site_id
      WHERE s.subdomain LIKE ? OR s.brand_name LIKE ?
      ORDER BY s.brand_name ASC
      LIMIT 20
    `).bind(searchPattern, searchPattern).all();
    return successResponse({ sites: result.results || [] });
  } catch (error) {
    console.error("Search sites error:", error);
    return errorResponse("Failed to search sites", 500);
  }
}
__name(searchSitesForEnterprise, "searchSitesForEnterprise");
async function deleteShardEndpoint(env, shardId) {
  try {
    const shard = await env.DB.prepare("SELECT * FROM shards WHERE id = ?").bind(shardId).first();
    if (!shard)
      return errorResponse("Shard not found", 404);
    const siteCount = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM sites WHERE shard_id = ?"
    ).bind(shardId).first();
    if (siteCount?.count > 0) {
      return errorResponse(`Cannot delete shard with ${siteCount.count} sites. Move all sites first.`, 400);
    }
    await deleteDatabase(env, shard.database_id);
    await env.DB.prepare("DELETE FROM shards WHERE id = ?").bind(shardId).run();
    return successResponse({ shardId }, "Shard deleted successfully");
  } catch (error) {
    console.error("Delete shard error:", error);
    return errorResponse("Failed to delete shard: " + (error.message || "Unknown error"), 500);
  }
}
__name(deleteShardEndpoint, "deleteShardEndpoint");

// workers/index.js
init_site_admin_worker();

// workers/storefront/customer-auth-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
init_usage_tracker();
init_site_db();
init_config();
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
    case "google-login":
      return handleCustomerGoogleLogin(request, env);
    case "logout":
      return handleLogout2(request, env);
    case "me":
      return handleGetProfile(request, env);
    case "update-profile":
      return handleUpdateProfile2(request, env);
    case "request-password-reset":
      return handleRequestPasswordReset(request, env);
    case "reset-password":
      return handleResetPassword2(request, env);
    case "verify-email":
      return handleVerifyEmail2(request, env);
    case "resend-verification":
      return handleResendVerification2(request, env);
    default:
      return errorResponse("Not found", 404);
  }
}
__name(handleCustomerAuth, "handleCustomerAuth");
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
    const db = await resolveSiteDBById(env, customer.site_id);
    await ensureAddressCountryColumn(db, customer.site_id);
    const { results } = await db.prepare(
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
    if (await checkMigrationLock(env, customer.site_id)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const body = await request.json();
    const { label, firstName, lastName, phone, houseNumber, roadName, city, country, state, pinCode, isDefault } = body;
    if (!firstName || !houseNumber || !city || !pinCode) {
      return errorResponse("First name, house number, city, and postal code are required");
    }
    const id = generateId();
    const db = await resolveSiteDBById(env, customer.site_id);
    await ensureAddressCountryColumn(db, customer.site_id);
    if (isDefault) {
      await db.prepare(
        "UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? AND site_id = ?"
      ).bind(customer.id, customer.site_id).run();
    }
    const rowData = { id, site_id: customer.site_id, customer_id: customer.id, label, firstName, lastName, phone, houseNumber, roadName, city, country, state, pinCode };
    const rowBytes = estimateRowBytes(rowData);
    await db.prepare(
      `INSERT INTO customer_addresses (id, site_id, customer_id, label, first_name, last_name, phone, house_number, road_name, city, country, state, pin_code, is_default, row_size_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
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
      sanitizeInput(country || "IN"),
      state ? sanitizeInput(state) : null,
      sanitizeInput(pinCode),
      isDefault ? 1 : 0,
      rowBytes
    ).run();
    await trackD1Write(env, customer.site_id, rowBytes);
    const address = await db.prepare(
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
    if (await checkMigrationLock(env, customer.site_id)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, customer.site_id);
    const existing = await db.prepare(
      "SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ? AND site_id = ?"
    ).bind(addressId, customer.id, customer.site_id).first();
    if (!existing) {
      return errorResponse("Address not found", 404);
    }
    const body = await request.json();
    const { label, firstName, lastName, phone, houseNumber, roadName, city, country, state, pinCode, isDefault } = body;
    await ensureAddressCountryColumn(db, customer.site_id);
    if (isDefault) {
      await db.prepare(
        "UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? AND site_id = ?"
      ).bind(customer.id, customer.site_id).run();
    }
    const oldBytes = existing.row_size_bytes || 0;
    const newBytes = estimateRowBytes(body);
    await db.prepare(
      `UPDATE customer_addresses SET
        label = COALESCE(?, label),
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        phone = COALESCE(?, phone),
        house_number = COALESCE(?, house_number),
        road_name = COALESCE(?, road_name),
        city = COALESCE(?, city),
        country = COALESCE(?, country),
        state = ?,
        pin_code = COALESCE(?, pin_code),
        is_default = ?,
        row_size_bytes = ?,
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
      country ? sanitizeInput(country) : null,
      state ? sanitizeInput(state) : null,
      pinCode ? sanitizeInput(pinCode) : null,
      isDefault ? 1 : 0,
      newBytes,
      addressId,
      customer.id,
      customer.site_id
    ).run();
    await trackD1Update(env, customer.site_id, oldBytes, newBytes);
    const updated = await db.prepare(
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
    const db = await resolveSiteDBById(env, customer.site_id);
    const existing = await db.prepare(
      "SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ? AND site_id = ?"
    ).bind(addressId, customer.id, customer.site_id).first();
    if (!existing) {
      return errorResponse("Address not found", 404);
    }
    const bytesToRemove = existing.row_size_bytes || 0;
    await db.prepare(
      "DELETE FROM customer_addresses WHERE id = ? AND customer_id = ? AND site_id = ?"
    ).bind(addressId, customer.id, customer.site_id).run();
    if (bytesToRemove > 0) {
      await trackD1Delete(env, customer.site_id, bytesToRemove);
    }
    return successResponse(null, "Address deleted successfully");
  } catch (error) {
    console.error("Error deleting address:", error);
    return errorResponse("Failed to delete address", 500);
  }
}
__name(deleteAddress, "deleteAddress");
function getStorefrontUrl(env, site) {
  if (site.custom_domain && site.domain_status === "verified") {
    return `https://${site.custom_domain}`;
  }
  const domain = env.DOMAIN || PLATFORM_DOMAIN;
  return `https://${site.subdomain}.${domain}`;
}
__name(getStorefrontUrl, "getStorefrontUrl");
async function handleSignup2(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
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
      "SELECT id, brand_name, subdomain, custom_domain, domain_status FROM sites WHERE id = ? AND is_active = 1"
    ).bind(siteId).first();
    if (!site) {
      return errorResponse("Store not found", 404);
    }
    const db = await resolveSiteDBById(env, siteId);
    const existing = await db.prepare(
      "SELECT id FROM site_customers WHERE site_id = ? AND email = ?"
    ).bind(siteId, email.toLowerCase()).first();
    if (existing) {
      return errorResponse("An account with this email already exists for this store", 400, "EMAIL_EXISTS");
    }
    const customerId = generateId();
    const passwordHash = await hashPassword(password);
    const { checkUsageLimit: checkUsageLimit2 } = await Promise.resolve().then(() => (init_usage_tracker(), usage_tracker_exports));
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const rowData = { id: customerId, site_id: siteId, email: email.toLowerCase(), name, phone };
    const rowBytes = estimateRowBytes(rowData);
    const usageCheck = await checkUsageLimit2(env, siteId, "d1", rowBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, "STORAGE_LIMIT");
    }
    const skipVerification = env.SKIP_EMAIL_VERIFICATION === "true";
    await db.prepare(
      `INSERT INTO site_customers (id, site_id, email, password_hash, name, phone, email_verified, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(customerId, siteId, email.toLowerCase(), passwordHash, sanitizeInput(name), phone || null, skipVerification ? 1 : 0, rowBytes).run();
    await trackD1Write(env, siteId, rowBytes);
    if (!skipVerification) {
      const verifyToken = generateToken(32);
      const verifyExpiry = getExpiryDate(24);
      const verifyId = generateId();
      const verifyRowData = { id: verifyId, site_id: siteId, customer_id: customerId, token: verifyToken, expires_at: verifyExpiry };
      const verifyRowBytes = estimateRowBytes(verifyRowData);
      await db.prepare(
        `INSERT INTO customer_email_verifications (id, site_id, customer_id, token, expires_at, row_size_bytes)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(verifyId, siteId, customerId, verifyToken, verifyExpiry, verifyRowBytes).run();
      await trackD1Write(env, siteId, verifyRowBytes);
      const baseUrl = getStorefrontUrl(env, site);
      const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email.toLowerCase())}`;
      const emailContent = buildVerificationEmail(site.brand_name, verifyUrl);
      const emailResult = await sendEmail(env, email.toLowerCase(), `Verify your email - ${site.brand_name}`, emailContent.html, emailContent.text);
      if (emailResult !== true) {
        console.error("Verification email send failed:", emailResult);
      }
      return successResponse({
        customer: {
          id: customerId,
          email: email.toLowerCase(),
          name: sanitizeInput(name)
        },
        requiresVerification: true
      }, "Account created. Please check your email to verify your account.");
    }
    const token = generateToken(32);
    const expiresAt = getExpiryDate(24 * 7);
    const sessionId = generateId();
    const sessRowData = { id: sessionId, customer_id: customerId, site_id: siteId, token, expires_at: expiresAt };
    const sessRowBytes = estimateRowBytes(sessRowData);
    await db.prepare(
      `INSERT INTO site_customer_sessions (id, customer_id, site_id, token, expires_at, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(sessionId, customerId, siteId, token, expiresAt, sessRowBytes).run();
    await trackD1Write(env, siteId, sessRowBytes);
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
    const { siteId, email, password } = await request.json();
    if (!siteId || !email || !password) {
      return errorResponse("Site ID, email and password are required");
    }
    const db = await resolveSiteDBById(env, siteId);
    const customer = await db.prepare(
      "SELECT id, email, password_hash, name, phone, email_verified FROM site_customers WHERE site_id = ? AND email = ?"
    ).bind(siteId, email.toLowerCase()).first();
    if (!customer) {
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    if (!customer.password_hash) {
      return errorResponse("This account uses Google sign-in. Please log in with Google.", 401, "USE_GOOGLE_LOGIN");
    }
    const isValid = await verifyPassword(password, customer.password_hash);
    if (!isValid) {
      return errorResponse("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }
    const skipVerification = env.SKIP_EMAIL_VERIFICATION === "true";
    if (!skipVerification && !customer.email_verified) {
      return errorResponse("Please verify your email before logging in. Check your inbox for the verification link.", 403, "EMAIL_NOT_VERIFIED");
    }
    const token = generateToken(32);
    const expiresAt = getExpiryDate(24 * 7);
    const sessionId = generateId();
    const loginSessData = { id: sessionId, customer_id: customer.id, site_id: siteId, token, expires_at: expiresAt };
    const loginSessBytes = estimateRowBytes(loginSessData);
    await db.prepare(
      `INSERT INTO site_customer_sessions (id, customer_id, site_id, token, expires_at, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(sessionId, customer.id, siteId, token, expiresAt, loginSessBytes).run();
    await trackD1Write(env, siteId, loginSessBytes);
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
async function handleCustomerGoogleLogin(request, env) {
  if (request.method !== "POST")
    return errorResponse("Method not allowed", 405);
  try {
    const { siteId, credential } = await request.json();
    if (!siteId || !credential)
      return errorResponse("Site ID and credential are required", 400);
    const clientId = env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("GOOGLE_CLIENT_ID not set in environment");
      return errorResponse("Google Sign-In is not configured", 500);
    }
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await googleRes.json();
    if (!googleRes.ok) {
      console.error("Google token validation failed:", payload);
      return errorResponse(payload.error_description || "Invalid Google token", 401);
    }
    if (payload.aud !== clientId) {
      console.error("Audience mismatch. Expected:", clientId, "Got:", payload.aud);
      return errorResponse("Invalid client ID", 401);
    }
    const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
    if (!validIssuers.includes(payload.iss)) {
      console.error("Invalid issuer:", payload.iss);
      return errorResponse("Invalid token issuer", 401);
    }
    if (!payload.email || payload.email_verified !== "true") {
      console.error("Google email not verified or missing");
      return errorResponse("Google account email is not verified", 401);
    }
    const site = await env.DB.prepare(
      "SELECT id, brand_name, subdomain FROM sites WHERE id = ? AND is_active = 1"
    ).bind(siteId).first();
    if (!site)
      return errorResponse("Store not found", 404);
    const db = await resolveSiteDBById(env, siteId);
    const email = payload.email.toLowerCase();
    const googleName = payload.name || email.split("@")[0];
    let customer = await db.prepare(
      "SELECT id, email, name, phone, email_verified, password_hash FROM site_customers WHERE site_id = ? AND email = ?"
    ).bind(siteId, email).first();
    if (!customer) {
      if (await checkMigrationLock(env, siteId)) {
        return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
      }
      const { checkUsageLimit: checkUsageLimit2 } = await Promise.resolve().then(() => (init_usage_tracker(), usage_tracker_exports));
      const customerId = generateId();
      const rowData = { id: customerId, site_id: siteId, email, name: googleName };
      const rowBytes = estimateRowBytes(rowData);
      const usageCheck = await checkUsageLimit2(env, siteId, "d1", rowBytes);
      if (!usageCheck.allowed) {
        return errorResponse(usageCheck.reason, 403, "STORAGE_LIMIT");
      }
      await db.prepare(
        `INSERT INTO site_customers (id, site_id, email, password_hash, name, email_verified, row_size_bytes, created_at)
         VALUES (?, ?, ?, '', ?, 1, ?, datetime('now'))`
      ).bind(customerId, siteId, email, sanitizeInput(googleName), rowBytes).run();
      await trackD1Write(env, siteId, rowBytes);
      customer = { id: customerId, email, name: googleName, phone: null, email_verified: 1 };
    } else {
      if (!customer.email_verified) {
        const oldBytes = customer.row_size_bytes || 0;
        await db.prepare(
          "UPDATE site_customers SET email_verified = 1, updated_at = datetime('now') WHERE id = ?"
        ).bind(customer.id).run();
        const updatedCust = await db.prepare("SELECT * FROM site_customers WHERE id = ?").bind(customer.id).first();
        if (updatedCust) {
          const newBytes = estimateRowBytes(updatedCust);
          await db.prepare("UPDATE site_customers SET row_size_bytes = ? WHERE id = ?").bind(newBytes, customer.id).run();
          await trackD1Update(env, siteId, oldBytes, newBytes);
        }
        customer.email_verified = 1;
      }
    }
    const token = generateToken(32);
    const expiresAt = getExpiryDate(24 * 7);
    const sessionId = generateId();
    const sessData = { id: sessionId, customer_id: customer.id, site_id: siteId, token, expires_at: expiresAt };
    const sessBytes = estimateRowBytes(sessData);
    await db.prepare(
      `INSERT INTO site_customer_sessions (id, customer_id, site_id, token, expires_at, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(sessionId, customer.id, siteId, token, expiresAt, sessBytes).run();
    await trackD1Write(env, siteId, sessBytes);
    return successResponse({
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone || null
      },
      token
    }, "Google login successful");
  } catch (error) {
    console.error("Customer Google login error:", error);
    return errorResponse(error.message || "Google login failed", 500);
  }
}
__name(handleCustomerGoogleLogin, "handleCustomerGoogleLogin");
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
        const db = await resolveSiteDBById(env, customer.site_id);
        const sess = await db.prepare(
          "SELECT row_size_bytes, site_id FROM site_customer_sessions WHERE token = ?"
        ).bind(token).first();
        await db.prepare(
          "DELETE FROM site_customer_sessions WHERE token = ?"
        ).bind(token).run();
        if (sess && sess.site_id) {
          await trackD1Delete(env, sess.site_id, sess.row_size_bytes || 0);
        }
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
    if (await checkMigrationLock(env, customer.site_id)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const { name, phone } = await request.json();
    const db = await resolveSiteDBById(env, customer.site_id);
    const oldRow = await db.prepare(
      "SELECT row_size_bytes FROM site_customers WHERE id = ?"
    ).bind(customer.id).first();
    const oldBytes = oldRow?.row_size_bytes || 0;
    await db.prepare(
      `UPDATE site_customers SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        updated_at = datetime('now')
       WHERE id = ?`
    ).bind(name ? sanitizeInput(name) : null, phone || null, customer.id).run();
    const updated = await db.prepare(
      "SELECT id, email, name, phone FROM site_customers WHERE id = ?"
    ).bind(customer.id).first();
    const newBytes = estimateRowBytes(updated || {});
    if (oldBytes !== newBytes) {
      await db.prepare(
        "UPDATE site_customers SET row_size_bytes = ? WHERE id = ?"
      ).bind(newBytes, customer.id).run();
      await trackD1Update(env, customer.site_id, oldBytes, newBytes);
    }
    return successResponse(updated, "Profile updated successfully");
  } catch (error) {
    return errorResponse("Failed to update profile", 500);
  }
}
__name(handleUpdateProfile2, "handleUpdateProfile");
async function handleRequestPasswordReset(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { siteId, email } = await request.json();
    if (!siteId || !email) {
      return errorResponse("Site ID and email are required");
    }
    const db = await resolveSiteDBById(env, siteId);
    const customer = await db.prepare(
      "SELECT id, name FROM site_customers WHERE site_id = ? AND email = ?"
    ).bind(siteId, email.toLowerCase()).first();
    if (!customer) {
      return successResponse(null, "If an account with that email exists, a password reset link has been sent.");
    }
    const site = await env.DB.prepare(
      "SELECT id, brand_name, subdomain, custom_domain, domain_status FROM sites WHERE id = ?"
    ).bind(siteId).first();
    const oldResets = await db.prepare(
      "SELECT id, row_size_bytes FROM customer_password_resets WHERE customer_id = ? AND site_id = ? AND used = 0"
    ).bind(customer.id, siteId).all();
    if ((oldResets.results || []).length > 0) {
      await db.prepare(
        "UPDATE customer_password_resets SET used = 1 WHERE customer_id = ? AND site_id = ? AND used = 0"
      ).bind(customer.id, siteId).run();
      for (const oldReset of oldResets.results || []) {
        const oldResetBytes = oldReset.row_size_bytes || 0;
        const updatedResetRow = await db.prepare("SELECT * FROM customer_password_resets WHERE id = ?").bind(oldReset.id).first();
        if (updatedResetRow) {
          const newResetBytes = estimateRowBytes(updatedResetRow);
          await db.prepare("UPDATE customer_password_resets SET row_size_bytes = ? WHERE id = ?").bind(newResetBytes, oldReset.id).run();
          await trackD1Update(env, siteId, oldResetBytes, newResetBytes);
        }
      }
    }
    const resetToken = generateToken(32);
    const expiresAt = getExpiryDate(1);
    const resetId = generateId();
    const resetRowData = { id: resetId, site_id: siteId, customer_id: customer.id, token: resetToken, expires_at: expiresAt };
    const resetRowBytes = estimateRowBytes(resetRowData);
    await db.prepare(
      `INSERT INTO customer_password_resets (id, site_id, customer_id, token, expires_at, row_size_bytes)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(resetId, siteId, customer.id, resetToken, expiresAt, resetRowBytes).run();
    await trackD1Write(env, siteId, resetRowBytes);
    const baseUrl = getStorefrontUrl(env, site);
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email.toLowerCase())}`;
    const emailContent = buildPasswordResetEmail(site.brand_name, resetUrl, customer.name);
    const emailResult = await sendEmail(env, email.toLowerCase(), `Reset your password - ${site.brand_name}`, emailContent.html, emailContent.text);
    if (emailResult !== true) {
      console.error("Password reset email send failed:", emailResult);
    }
    return successResponse(null, "If an account with that email exists, a password reset link has been sent.");
  } catch (error) {
    console.error("Request password reset error:", error);
    return errorResponse("Failed to process password reset request", 500);
  }
}
__name(handleRequestPasswordReset, "handleRequestPasswordReset");
async function handleResetPassword2(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { token, email, password, siteId } = await request.json();
    if (!token || !email || !password) {
      return errorResponse("Token, email and new password are required");
    }
    if (password.length < 8) {
      return errorResponse("Password must be at least 8 characters");
    }
    let db = null;
    let resetRecord = null;
    if (siteId) {
      db = await resolveSiteDBById(env, siteId);
      resetRecord = await db.prepare(
        `SELECT pr.*, sc.email as customer_email FROM customer_password_resets pr
         JOIN site_customers sc ON sc.id = pr.customer_id
         WHERE pr.token = ? AND pr.used = 0 AND pr.expires_at > datetime('now')`
      ).bind(token).first();
    }
    if (!resetRecord) {
      const allSites = await env.DB.prepare("SELECT id FROM sites").all();
      for (const s of allSites.results || []) {
        const sdb = await resolveSiteDBById(env, s.id);
        const found = await sdb.prepare(
          `SELECT pr.*, sc.email as customer_email FROM customer_password_resets pr
           JOIN site_customers sc ON sc.id = pr.customer_id
           WHERE pr.token = ? AND pr.used = 0 AND pr.expires_at > datetime('now')`
        ).bind(token).first();
        if (found) {
          resetRecord = found;
          db = sdb;
          break;
        }
      }
    }
    if (!resetRecord) {
      return errorResponse("Invalid or expired reset link. Please request a new password reset.", 400, "INVALID_TOKEN");
    }
    if (resetRecord.customer_email.toLowerCase() !== email.toLowerCase()) {
      return errorResponse("Invalid reset link.", 400, "INVALID_TOKEN");
    }
    const passwordHash = await hashPassword(password);
    const custRow = await db.prepare(
      "SELECT row_size_bytes, site_id FROM site_customers WHERE id = ?"
    ).bind(resetRecord.customer_id).first();
    const custOldBytes = custRow?.row_size_bytes || 0;
    await db.prepare(
      "UPDATE site_customers SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(passwordHash, resetRecord.customer_id).run();
    const custUpdated = await db.prepare("SELECT * FROM site_customers WHERE id = ?").bind(resetRecord.customer_id).first();
    if (custUpdated) {
      const custNewBytes = estimateRowBytes(custUpdated);
      await db.prepare("UPDATE site_customers SET row_size_bytes = ? WHERE id = ?").bind(custNewBytes, resetRecord.customer_id).run();
      if (custRow?.site_id)
        await trackD1Update(env, custRow.site_id, custOldBytes, custNewBytes);
    }
    const resetOldBytes = resetRecord.row_size_bytes || 0;
    await db.prepare(
      "UPDATE customer_password_resets SET used = 1 WHERE id = ?"
    ).bind(resetRecord.id).run();
    const updatedResetRecord = await db.prepare("SELECT * FROM customer_password_resets WHERE id = ?").bind(resetRecord.id).first();
    if (updatedResetRecord && custRow?.site_id) {
      const resetNewBytes = estimateRowBytes(updatedResetRecord);
      await db.prepare("UPDATE customer_password_resets SET row_size_bytes = ? WHERE id = ?").bind(resetNewBytes, resetRecord.id).run();
      await trackD1Update(env, custRow.site_id, resetOldBytes, resetNewBytes);
    }
    const sessionsToDelete = await db.prepare(
      "SELECT id, row_size_bytes, site_id FROM site_customer_sessions WHERE customer_id = ?"
    ).bind(resetRecord.customer_id).all();
    await db.prepare(
      "DELETE FROM site_customer_sessions WHERE customer_id = ?"
    ).bind(resetRecord.customer_id).run();
    const totalSessBytes = (sessionsToDelete.results || []).reduce((sum, s) => sum + (s.row_size_bytes || 0), 0);
    if (totalSessBytes > 0 && custRow?.site_id) {
      await trackD1Delete(env, custRow.site_id, totalSessBytes);
    }
    return successResponse(null, "Password reset successfully. You can now log in with your new password.");
  } catch (error) {
    console.error("Reset password error:", error);
    return errorResponse("Failed to reset password", 500);
  }
}
__name(handleResetPassword2, "handleResetPassword");
async function handleVerifyEmail2(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { token, email, siteId } = await request.json();
    if (!token) {
      return errorResponse("Verification token is required");
    }
    let db = null;
    let verifyRecord = null;
    if (siteId) {
      db = await resolveSiteDBById(env, siteId);
      verifyRecord = await db.prepare(
        `SELECT ev.*, sc.email as customer_email FROM customer_email_verifications ev
         JOIN site_customers sc ON sc.id = ev.customer_id
         WHERE ev.token = ? AND ev.used = 0 AND ev.expires_at > datetime('now')`
      ).bind(token).first();
    }
    if (!verifyRecord) {
      const allSites = await env.DB.prepare("SELECT id FROM sites").all();
      for (const s of allSites.results || []) {
        const sdb = await resolveSiteDBById(env, s.id);
        const found = await sdb.prepare(
          `SELECT ev.*, sc.email as customer_email FROM customer_email_verifications ev
           JOIN site_customers sc ON sc.id = ev.customer_id
           WHERE ev.token = ? AND ev.used = 0 AND ev.expires_at > datetime('now')`
        ).bind(token).first();
        if (found) {
          verifyRecord = found;
          db = sdb;
          break;
        }
      }
    }
    if (!verifyRecord) {
      return errorResponse("Invalid or expired verification link. Please request a new verification email.", 400, "INVALID_TOKEN");
    }
    if (email && verifyRecord.customer_email.toLowerCase() !== email.toLowerCase()) {
      return errorResponse("Invalid verification link.", 400, "INVALID_TOKEN");
    }
    const verifyCustRow = await db.prepare(
      "SELECT row_size_bytes, site_id FROM site_customers WHERE id = ?"
    ).bind(verifyRecord.customer_id).first();
    const verifyCustOldBytes = verifyCustRow?.row_size_bytes || 0;
    await db.prepare(
      "UPDATE site_customers SET email_verified = 1, updated_at = datetime('now') WHERE id = ?"
    ).bind(verifyRecord.customer_id).run();
    const verifyCustUpdated = await db.prepare("SELECT * FROM site_customers WHERE id = ?").bind(verifyRecord.customer_id).first();
    if (verifyCustUpdated) {
      const verifyCustNewBytes = estimateRowBytes(verifyCustUpdated);
      await db.prepare("UPDATE site_customers SET row_size_bytes = ? WHERE id = ?").bind(verifyCustNewBytes, verifyRecord.customer_id).run();
      if (verifyCustRow?.site_id)
        await trackD1Update(env, verifyCustRow.site_id, verifyCustOldBytes, verifyCustNewBytes);
    }
    const verifyOldBytes = verifyRecord.row_size_bytes || 0;
    await db.prepare(
      "UPDATE customer_email_verifications SET used = 1 WHERE id = ?"
    ).bind(verifyRecord.id).run();
    const updatedVerifyRecord = await db.prepare("SELECT * FROM customer_email_verifications WHERE id = ?").bind(verifyRecord.id).first();
    if (updatedVerifyRecord && verifyCustRow?.site_id) {
      const verifyNewBytes = estimateRowBytes(updatedVerifyRecord);
      await db.prepare("UPDATE customer_email_verifications SET row_size_bytes = ? WHERE id = ?").bind(verifyNewBytes, verifyRecord.id).run();
      await trackD1Update(env, verifyCustRow.site_id, verifyOldBytes, verifyNewBytes);
    }
    return successResponse(null, "Email verified successfully. You can now log in.");
  } catch (error) {
    console.error("Verify email error:", error);
    return errorResponse("Failed to verify email", 500);
  }
}
__name(handleVerifyEmail2, "handleVerifyEmail");
async function handleResendVerification2(request, env) {
  if (request.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }
  try {
    const { siteId, email } = await request.json();
    if (!siteId || !email) {
      return errorResponse("Site ID and email are required");
    }
    const db = await resolveSiteDBById(env, siteId);
    const customer = await db.prepare(
      "SELECT id, name, email_verified FROM site_customers WHERE site_id = ? AND email = ?"
    ).bind(siteId, email.toLowerCase()).first();
    if (!customer) {
      return successResponse(null, "If an account with that email exists, a verification email has been sent.");
    }
    if (customer.email_verified) {
      return successResponse(null, "Your email is already verified. You can log in.");
    }
    const site = await env.DB.prepare(
      "SELECT id, brand_name, subdomain, custom_domain, domain_status FROM sites WHERE id = ?"
    ).bind(siteId).first();
    const oldVerifications = await db.prepare(
      "SELECT id, row_size_bytes FROM customer_email_verifications WHERE customer_id = ? AND site_id = ? AND used = 0"
    ).bind(customer.id, siteId).all();
    if ((oldVerifications.results || []).length > 0) {
      await db.prepare(
        "UPDATE customer_email_verifications SET used = 1 WHERE customer_id = ? AND site_id = ? AND used = 0"
      ).bind(customer.id, siteId).run();
      for (const oldVerif of oldVerifications.results || []) {
        const oldVerifBytes = oldVerif.row_size_bytes || 0;
        const updatedVerifRow = await db.prepare("SELECT * FROM customer_email_verifications WHERE id = ?").bind(oldVerif.id).first();
        if (updatedVerifRow) {
          const newVerifBytes = estimateRowBytes(updatedVerifRow);
          await db.prepare("UPDATE customer_email_verifications SET row_size_bytes = ? WHERE id = ?").bind(newVerifBytes, oldVerif.id).run();
          await trackD1Update(env, siteId, oldVerifBytes, newVerifBytes);
        }
      }
    }
    const verifyToken = generateToken(32);
    const verifyExpiry = getExpiryDate(24);
    const resendVerifyId = generateId();
    const resendVerifyData = { id: resendVerifyId, site_id: siteId, customer_id: customer.id, token: verifyToken, expires_at: verifyExpiry };
    const resendVerifyBytes = estimateRowBytes(resendVerifyData);
    await db.prepare(
      `INSERT INTO customer_email_verifications (id, site_id, customer_id, token, expires_at, row_size_bytes)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(resendVerifyId, siteId, customer.id, verifyToken, verifyExpiry, resendVerifyBytes).run();
    await trackD1Write(env, siteId, resendVerifyBytes);
    const baseUrl = getStorefrontUrl(env, site);
    const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email.toLowerCase())}`;
    const emailContent = buildVerificationEmail(site.brand_name, verifyUrl);
    const emailResult = await sendEmail(env, email.toLowerCase(), `Verify your email - ${site.brand_name}`, emailContent.html, emailContent.text);
    if (emailResult !== true) {
      console.error("Resend verification email send failed:", emailResult);
    }
    return successResponse(null, "If an account with that email exists, a verification email has been sent.");
  } catch (error) {
    console.error("Resend verification error:", error);
    return errorResponse("Failed to resend verification email", 500);
  }
}
__name(handleResendVerification2, "handleResendVerification");
function buildPasswordResetEmail(brandName, resetUrl, customerName) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || "Your Store"}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="margin: 0 0 16px; font-size: 22px; color: #0f172a;">Reset Your Password</h2>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${customerName || "there"},</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #c8a97e; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.6;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
          <div style="margin-top: 24px; padding: 12px; background: #f8f9fa; border-radius: 6px; font-size: 12px; color: #888; word-break: break-all;">
            <strong>Link not working?</strong> Copy and paste this URL into your browser:<br>${resetUrl}
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">${brandName || "Your Store"}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Reset Your Password

Hi ${customerName || "there"},

We received a request to reset your password. Visit this link to create a new password:
${resetUrl}

This link expires in 1 hour.

If you didn't request this, you can ignore this email.`;
  return { html, text };
}
__name(buildPasswordResetEmail, "buildPasswordResetEmail");
function buildVerificationEmail(brandName, verifyUrl) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || "Your Store"}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="margin: 0 0 16px; font-size: 22px; color: #0f172a;">Verify Your Email</h2>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Welcome! Please verify your email address to activate your account and start shopping.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="display: inline-block; background: #28a745; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px;">Verify Email</a>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.6;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
          <div style="margin-top: 24px; padding: 12px; background: #f8f9fa; border-radius: 6px; font-size: 12px; color: #888; word-break: break-all;">
            <strong>Link not working?</strong> Copy and paste this URL into your browser:<br>${verifyUrl}
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">${brandName || "Your Store"}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Verify Your Email

Welcome! Please verify your email address by visiting this link:
${verifyUrl}

This link expires in 24 hours.

If you didn't create an account, you can ignore this email.`;
  return { html, text };
}
__name(buildVerificationEmail, "buildVerificationEmail");
async function validateCustomerAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("SiteCustomer ")) {
    return null;
  }
  const token = authHeader.substring(13);
  try {
    const allSites = await env.DB.prepare("SELECT id FROM sites").all();
    const siteIds = (allSites.results || []).map((s) => s.id);
    for (const siteId of siteIds) {
      const db = await resolveSiteDBById(env, siteId);
      const session = await db.prepare(
        `SELECT cs.customer_id, cs.site_id FROM site_customer_sessions cs
         WHERE cs.token = ? AND cs.expires_at > datetime('now')`
      ).bind(token).first();
      if (session) {
        const customer = await db.prepare(
          "SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ?"
        ).bind(session.customer_id).first();
        return customer;
      }
    }
    return null;
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
init_usage_tracker();
var MAX_FILE_SIZE = 10 * 1024 * 1024;
var MAX_VIDEO_SIZE = 100 * 1024 * 1024;
var ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"];
var ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
var MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "image/svg+xml": "svg"
};
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
  if (action === "return-photo" && method === "POST") {
    return uploadReturnPhoto(request, env, url);
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
      return { id: admin.staffId || "site-admin", _adminSiteId: siteId, _adminPermissions: admin };
    }
  }
  const user = await validateAuth(request, env);
  if (user) {
    const site = await env.DB.prepare(
      "SELECT id FROM sites WHERE id = ? AND user_id = ?"
    ).bind(siteId, user.id).first();
    if (site)
      return { ...user, _adminSiteId: siteId, _adminPermissions: { isOwner: true } };
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
        const usageCheck2 = await checkUsageLimit(env, siteId, "r2", file.size);
        if (!usageCheck2.allowed) {
          results.push({ error: usageCheck2.reason });
          continue;
        }
        const ext2 = MIME_TO_EXT[file.type] || file.type.split("/")[1];
        const key2 = `sites/${siteId}/images/${generateId()}.${ext2}`;
        const arrayBuffer = await file.arrayBuffer();
        await env.STORAGE.put(key2, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
            cacheControl: "public, max-age=31536000"
          }
        });
        await recordMediaFile(env, siteId, key2, file.size, "image");
        const imageUrl2 = `/api/upload/image?key=${encodeURIComponent(key2)}`;
        results.push({ url: imageUrl2, key: key2 });
      }
      const urls2 = results.filter((r) => r.url).map((r) => r.url);
      return successResponse({ images: results, urls: urls2 }, "Images uploaded successfully");
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
    const usageCheck = await checkUsageLimit(env, siteId, "r2", buffer.length);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, "STORAGE_LIMIT");
    }
    const ext = MIME_TO_EXT[mimeType] || mimeType.split("/")[1];
    const key = `sites/${siteId}/images/${generateId()}.${ext}`;
    await env.STORAGE.put(key, buffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: "public, max-age=31536000"
      }
    });
    await recordMediaFile(env, siteId, key, buffer.length, "image");
    const imageUrl = `/api/upload/image?key=${encodeURIComponent(key)}`;
    return successResponse({ url: imageUrl, key }, "Image uploaded successfully");
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse("Failed to upload image: " + error.message, 500);
  }
}
__name(uploadImage, "uploadImage");
var RETURN_PHOTO_MAX_SIZE = 5 * 1024 * 1024;
var RETURN_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
async function uploadReturnPhoto(request, env, url) {
  const siteId = url.searchParams.get("siteId");
  if (!siteId)
    return errorResponse("siteId is required", 400);
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return errorResponse("multipart/form-data required", 400);
    }
    const formData = await request.formData();
    const file = formData.get("photo");
    if (!file || !file.size)
      return errorResponse("No photo provided", 400);
    if (!RETURN_PHOTO_TYPES.includes(file.type)) {
      return errorResponse(`Invalid file type: ${file.type}. Only JPEG, PNG, and WebP allowed.`, 400);
    }
    if (file.size > RETURN_PHOTO_MAX_SIZE) {
      return errorResponse(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 5MB)`, 400);
    }
    const usageCheck = await checkUsageLimit(env, siteId, "r2", file.size);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, "STORAGE_LIMIT");
    }
    const ext = MIME_TO_EXT[file.type] || "jpg";
    const key = `sites/${siteId}/returns/${generateId()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    await env.STORAGE.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000"
      }
    });
    await recordMediaFile(env, siteId, key, file.size, "image");
    const imageUrl = `/api/upload/image?key=${encodeURIComponent(key)}`;
    return successResponse({ url: imageUrl, key }, "Return photo uploaded");
  } catch (error) {
    console.error("Return photo upload error:", error);
    return errorResponse("Failed to upload photo: " + error.message, 500);
  }
}
__name(uploadReturnPhoto, "uploadReturnPhoto");
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
    await removeMediaFile(env, siteId, key);
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
      const usageCheck = await checkUsageLimit(env, siteId, "r2", file.size);
      if (!usageCheck.allowed) {
        return errorResponse(usageCheck.reason, 403, "STORAGE_LIMIT");
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
      await recordMediaFile(env, siteId, key, file.size, "video");
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
    await removeMediaFile(env, siteId, key);
    return successResponse(null, "Video deleted successfully");
  } catch (error) {
    console.error("Delete video error:", error);
    return errorResponse("Failed to delete video", 500);
  }
}
__name(deleteVideo, "deleteVideo");

// workers/storefront/analytics-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_site_db();
init_helpers();
function parseUserAgent(ua) {
  if (!ua)
    return { device: "unknown", browser: "unknown" };
  let device = "desktop";
  if (/tablet|ipad/i.test(ua))
    device = "tablet";
  else if (/mobile|android|iphone|ipod/i.test(ua))
    device = "mobile";
  let browser = "other";
  if (/edg\//i.test(ua))
    browser = "Edge";
  else if (/chrome|crios/i.test(ua))
    browser = "Chrome";
  else if (/firefox|fxios/i.test(ua))
    browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome/i.test(ua))
    browser = "Safari";
  else if (/opera|opr/i.test(ua))
    browser = "Opera";
  return { device, browser };
}
__name(parseUserAgent, "parseUserAgent");
function parseReferrerSource(referrer) {
  if (!referrer)
    return "direct";
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (/google\./i.test(host))
      return "Google";
    if (/bing\./i.test(host))
      return "Bing";
    if (/yahoo\./i.test(host))
      return "Yahoo";
    if (/instagram\.com/i.test(host))
      return "Instagram";
    if (/facebook\.com|fb\.com/i.test(host))
      return "Facebook";
    if (/twitter\.com|x\.com/i.test(host))
      return "Twitter";
    if (/youtube\.com/i.test(host))
      return "YouTube";
    if (/whatsapp/i.test(host))
      return "WhatsApp";
    if (/pinterest/i.test(host))
      return "Pinterest";
    if (/linkedin/i.test(host))
      return "LinkedIn";
    if (/t\.co/i.test(host))
      return "Twitter";
    return host;
  } catch {
    return "direct";
  }
}
__name(parseReferrerSource, "parseReferrerSource");
async function ensurePageViewsTable(db) {
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT NOT NULL,
      page_path TEXT NOT NULL,
      referrer TEXT,
      country TEXT,
      device_type TEXT,
      browser TEXT,
      visitor_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_page_views_site ON page_views(site_id)").run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(site_id, created_at)").run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(site_id, visitor_id)").run();
  } catch (e) {
  }
}
__name(ensurePageViewsTable, "ensurePageViewsTable");
async function handleAnalytics(request, env, path) {
  const url = new URL(request.url);
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  if (action === "track" && request.method === "POST") {
    return handleTrack(request, env);
  }
  if (action === "stats" && request.method === "GET") {
    return handleStats2(request, env, url);
  }
  return errorResponse("Not found", 404);
}
__name(handleAnalytics, "handleAnalytics");
async function handleTrack(request, env) {
  try {
    const body = await request.json();
    const { siteId, pagePath, referrer, visitorId } = body;
    if (!siteId || !pagePath) {
      return jsonResponse({ ok: true });
    }
    const ua = request.headers.get("user-agent") || "";
    const { device, browser } = parseUserAgent(ua);
    const country = request.headers.get("cf-ipcountry") || request.headers.get("CF-IPCountry") || "";
    const db = await resolveSiteDBById(env, siteId);
    await ensurePageViewsTable(db);
    await db.prepare(
      `INSERT INTO page_views (site_id, page_path, referrer, country, device_type, browser, visitor_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(siteId, pagePath, referrer || "", country, device, browser, visitorId || "").run();
    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("Analytics track error:", e.message || e);
    return jsonResponse({ ok: true });
  }
}
__name(handleTrack, "handleTrack");
async function handleStats2(request, env, url) {
  const siteId = url.searchParams.get("siteId");
  const period = url.searchParams.get("period") || "7days";
  if (!siteId) {
    return errorResponse("siteId required", 400);
  }
  try {
    const db = await resolveSiteDBById(env, siteId);
    await ensurePageViewsTable(db);
    let dateFilter;
    if (period === "7days") {
      dateFilter = "datetime('now', '-7 days')";
    } else if (period === "30days") {
      dateFilter = "datetime('now', '-30 days')";
    } else {
      dateFilter = "datetime('now', '-365 days')";
    }
    const totalViews = await db.prepare(
      `SELECT COUNT(*) as count FROM page_views WHERE site_id = ? AND created_at >= ${dateFilter}`
    ).bind(siteId).first();
    const uniqueVisitors = await db.prepare(
      `SELECT COUNT(DISTINCT visitor_id) as count FROM page_views WHERE site_id = ? AND visitor_id != '' AND created_at >= ${dateFilter}`
    ).bind(siteId).first();
    const bounceQuery = await db.prepare(
      `SELECT 
        COUNT(DISTINCT visitor_id) as total_sessions,
        SUM(CASE WHEN page_count = 1 THEN 1 ELSE 0 END) as single_page_sessions
       FROM (
         SELECT visitor_id, COUNT(*) as page_count 
         FROM page_views 
         WHERE site_id = ? AND visitor_id != '' AND created_at >= ${dateFilter}
         GROUP BY visitor_id
       )`
    ).bind(siteId).first();
    const totalSessions = bounceQuery?.total_sessions || 0;
    const singlePageSessions = bounceQuery?.single_page_sessions || 0;
    const bounceRate = totalSessions > 0 ? Math.round(singlePageSessions / totalSessions * 100) : 0;
    let trendQuery;
    if (period === "7days") {
      trendQuery = await db.prepare(
        `SELECT DATE(created_at) as date_label, COUNT(*) as views, COUNT(DISTINCT visitor_id) as visitors
         FROM page_views WHERE site_id = ? AND created_at >= ${dateFilter}
         GROUP BY DATE(created_at) ORDER BY date_label`
      ).bind(siteId).all();
    } else if (period === "30days") {
      trendQuery = await db.prepare(
        `SELECT DATE(created_at) as date_label, COUNT(*) as views, COUNT(DISTINCT visitor_id) as visitors
         FROM page_views WHERE site_id = ? AND created_at >= ${dateFilter}
         GROUP BY DATE(created_at) ORDER BY date_label`
      ).bind(siteId).all();
    } else {
      trendQuery = await db.prepare(
        `SELECT strftime('%Y-%m', created_at) as date_label, COUNT(*) as views, COUNT(DISTINCT visitor_id) as visitors
         FROM page_views WHERE site_id = ? AND created_at >= ${dateFilter}
         GROUP BY strftime('%Y-%m', created_at) ORDER BY date_label`
      ).bind(siteId).all();
    }
    const sourcesQuery = await db.prepare(
      `SELECT referrer, COUNT(*) as count FROM page_views 
       WHERE site_id = ? AND created_at >= ${dateFilter}
       GROUP BY referrer ORDER BY count DESC LIMIT 10`
    ).bind(siteId).all();
    const sources = (sourcesQuery.results || []).map((r) => ({
      name: parseReferrerSource(r.referrer),
      count: r.count
    }));
    const mergedSources = {};
    for (const s of sources) {
      if (mergedSources[s.name]) {
        mergedSources[s.name] += s.count;
      } else {
        mergedSources[s.name] = s.count;
      }
    }
    const totalSourceCount = Object.values(mergedSources).reduce((a, b) => a + b, 0) || 1;
    const sourcesList = Object.entries(mergedSources).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({
      name: name === "direct" ? "Direct" : name,
      count,
      pct: Math.round(count / totalSourceCount * 100)
    }));
    const devicesQuery = await db.prepare(
      `SELECT device_type, COUNT(*) as count FROM page_views 
       WHERE site_id = ? AND created_at >= ${dateFilter}
       GROUP BY device_type ORDER BY count DESC`
    ).bind(siteId).all();
    const totalDevices = (devicesQuery.results || []).reduce((a, r) => a + r.count, 0) || 1;
    const devicesList = (devicesQuery.results || []).map((r) => ({
      name: (r.device_type || "unknown").charAt(0).toUpperCase() + (r.device_type || "unknown").slice(1),
      count: r.count,
      pct: Math.round(r.count / totalDevices * 100)
    }));
    const countriesQuery = await db.prepare(
      `SELECT country, COUNT(*) as count, COUNT(DISTINCT visitor_id) as visitors 
       FROM page_views 
       WHERE site_id = ? AND country != '' AND created_at >= ${dateFilter}
       GROUP BY country ORDER BY count DESC LIMIT 10`
    ).bind(siteId).all();
    const totalCountryVisitors = (countriesQuery.results || []).reduce((a, r) => a + r.visitors, 0) || 1;
    const countriesList = (countriesQuery.results || []).map((r) => ({
      code: r.country,
      visitors: r.visitors,
      pct: Math.round(r.visitors / totalCountryVisitors * 100)
    }));
    const topPagesQuery = await db.prepare(
      `SELECT page_path, COUNT(*) as views, COUNT(DISTINCT visitor_id) as visitors
       FROM page_views WHERE site_id = ? AND created_at >= ${dateFilter}
       GROUP BY page_path ORDER BY views DESC LIMIT 10`
    ).bind(siteId).all();
    return jsonResponse({
      stats: {
        pageViews: totalViews?.count || 0,
        visitors: uniqueVisitors?.count || 0,
        bounceRate
      },
      trends: trendQuery.results || [],
      sources: sourcesList,
      devices: devicesList,
      countries: countriesList,
      topPages: topPagesQuery.results || []
    });
  } catch (e) {
    console.error("Analytics stats error:", e.message || e);
    return jsonResponse({
      stats: { pageViews: 0, visitors: 0, bounceRate: 0 },
      trends: [],
      sources: [],
      devices: [],
      countries: [],
      topPages: []
    });
  }
}
__name(handleStats2, "handleStats");

// workers/storefront/reviews-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_cache();
init_auth();
init_site_db();
init_usage_tracker();
async function ensureReviewColumns(db) {
  try {
    await db.prepare(`ALTER TABLE reviews ADD COLUMN order_id TEXT`).run();
  } catch (e) {
  }
  try {
    await db.prepare(`ALTER TABLE reviews ADD COLUMN status TEXT DEFAULT 'pending'`).run();
  } catch (e) {
  }
  try {
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id)").run();
  } catch (e) {
  }
  try {
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)").run();
  } catch (e) {
  }
}
__name(ensureReviewColumns, "ensureReviewColumns");
async function ensureReviewTokenColumn(db, table) {
  try {
    await db.prepare(`ALTER TABLE ${table} ADD COLUMN review_token TEXT`).run();
  } catch (e) {
  }
}
__name(ensureReviewTokenColumn, "ensureReviewTokenColumn");
async function handleReviews(request, env, path, ctx2) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  const subAction = pathParts[3];
  if (action === "product" && subAction && method === "GET") {
    return getProductReviews(request, env, subAction);
  }
  if (action === "eligibility" && method === "GET") {
    return checkReviewEligibility(request, env);
  }
  if (action === "submit" && method === "POST") {
    return submitReview(request, env);
  }
  if (action === "guest-submit" && method === "POST") {
    return submitGuestReview(request, env);
  }
  if (action === "admin" && method === "GET") {
    return getAdminReviews(request, env);
  }
  if (action === "admin" && subAction && method === "PUT") {
    return updateReviewStatus(request, env, subAction, ctx2);
  }
  if (action === "summary" && method === "GET") {
    return getReviewSummary(request, env);
  }
  return errorResponse("Not found", 404);
}
__name(handleReviews, "handleReviews");
async function getProductReviews(request, env, productId) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);
    const sort = url.searchParams.get("sort") || "recent";
    let orderClause = "ORDER BY created_at DESC";
    if (sort === "highest")
      orderClause = "ORDER BY rating DESC, created_at DESC";
    if (sort === "lowest")
      orderClause = "ORDER BY rating ASC, created_at DESC";
    const reviews = await db.prepare(
      `SELECT id, product_id, customer_name, rating, title, content, images, is_verified, created_at
       FROM reviews WHERE site_id = ? AND product_id = ? AND status = 'approved' AND is_approved = 1
       ${orderClause} LIMIT 50`
    ).bind(siteId, productId).all();
    const stats = await db.prepare(
      `SELECT COUNT(*) as total, AVG(rating) as avg_rating,
              SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five,
              SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four,
              SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three,
              SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two,
              SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one
       FROM reviews WHERE site_id = ? AND product_id = ? AND status = 'approved' AND is_approved = 1`
    ).bind(siteId, productId).first();
    const reviewsData = (reviews.results || []).map((r) => ({
      ...r,
      images: parseJsonSafe(r.images)
    }));
    return cachedJsonResponse({
      success: true,
      data: {
        reviews: reviewsData,
        stats: {
          total: stats?.total || 0,
          avgRating: stats?.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0,
          breakdown: {
            5: stats?.five || 0,
            4: stats?.four || 0,
            3: stats?.three || 0,
            2: stats?.two || 0,
            1: stats?.one || 0
          }
        }
      }
    });
  } catch (error) {
    console.error("Get product reviews error:", error);
    return errorResponse("Failed to fetch reviews", 500);
  }
}
__name(getProductReviews, "getProductReviews");
async function checkReviewEligibility(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    const mode = url.searchParams.get("mode");
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);
    if (mode === "guest") {
      const orderId = url.searchParams.get("orderId");
      const token = url.searchParams.get("token");
      if (!orderId || !token)
        return errorResponse("orderId and token are required for guest mode", 400);
      await ensureReviewTokenColumn(db, "guest_orders");
      await ensureReviewTokenColumn(db, "orders");
      let order = null;
      try {
        order = await db.prepare(
          `SELECT id, order_number, customer_name, items FROM guest_orders WHERE id = ? AND site_id = ? AND review_token = ? AND status = 'delivered'`
        ).bind(orderId, siteId, token).first();
      } catch (e) {
      }
      if (!order) {
        try {
          order = await db.prepare(
            `SELECT id, order_number, customer_name, items FROM orders WHERE id = ? AND site_id = ? AND review_token = ? AND status = 'delivered'`
          ).bind(orderId, siteId, token).first();
        } catch (e) {
        }
      }
      if (!order)
        return errorResponse("Invalid or expired review link", 403);
      const items = parseJsonSafe(order.items);
      const reviewedItems = {};
      for (const item of items) {
        const pid = item.productId || item.product_id || item.id;
        const existing = await db.prepare(
          `SELECT id FROM reviews WHERE site_id = ? AND product_id = ? AND order_id = ? LIMIT 1`
        ).bind(siteId, pid, orderId).first();
        if (existing)
          reviewedItems[pid] = true;
      }
      return jsonResponse({
        success: true,
        data: {
          order: { id: order.id, order_number: order.order_number, customer_name: order.customer_name },
          items: items.map((item) => ({
            productId: item.productId || item.product_id || item.id,
            name: item.name,
            image: item.image || item.thumbnail_url || "",
            slug: item.slug || ""
          })),
          reviewedItems
        }
      });
    }
    const productId = url.searchParams.get("productId");
    if (!productId)
      return errorResponse("productId is required", 400);
    const user = await validateAnyAuth(request, env, { siteId, db });
    if (!user)
      return jsonResponse({ success: true, data: { eligible: false, reason: "not_logged_in" } });
    const userId = user.id;
    const existingReview = await db.prepare(
      `SELECT id FROM reviews WHERE site_id = ? AND product_id = ? AND user_id = ? LIMIT 1`
    ).bind(siteId, productId, userId).first();
    if (existingReview) {
      return jsonResponse({ success: true, data: { eligible: false, reason: "already_reviewed" } });
    }
    const deliveredOrder = await db.prepare(
      `SELECT id, items FROM orders WHERE site_id = ? AND user_id = ? AND status = 'delivered' ORDER BY created_at DESC`
    ).bind(siteId, userId).all();
    const eligibleOrders = [];
    for (const order of deliveredOrder.results || []) {
      let items = parseJsonSafe(order.items);
      const hasProduct = items.some((item) => {
        const itemProductId = item.productId || item.product_id || item.id;
        return itemProductId === productId;
      });
      if (hasProduct) {
        eligibleOrders.push(order.id);
      }
    }
    if (eligibleOrders.length === 0) {
      return jsonResponse({ success: true, data: { eligible: false, reason: "no_purchase" } });
    }
    return jsonResponse({ success: true, data: { eligible: true, orderId: eligibleOrders[0] } });
  } catch (error) {
    console.error("Check review eligibility error:", error);
    return errorResponse("Failed to check eligibility", 500);
  }
}
__name(checkReviewEligibility, "checkReviewEligibility");
async function submitReview(request, env) {
  try {
    const data = await request.json();
    const { siteId, productId, orderId, rating, title, content, images } = data;
    if (!siteId || !productId || !rating)
      return errorResponse("siteId, productId and rating are required", 400);
    if (rating < 1 || rating > 5)
      return errorResponse("Rating must be between 1 and 5", 400);
    const locked = await checkMigrationLock(env, siteId);
    if (locked)
      return errorResponse("Site is under maintenance", 503);
    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);
    const user = await validateAnyAuth(request, env, { siteId, db });
    if (!user)
      return errorResponse("Authentication required", 401);
    const existingReview = await db.prepare(
      `SELECT id FROM reviews WHERE site_id = ? AND product_id = ? AND user_id = ? LIMIT 1`
    ).bind(siteId, productId, user.id).first();
    if (existingReview)
      return errorResponse("You have already reviewed this product", 400);
    let isVerified = 0;
    if (orderId) {
      const order = await db.prepare(
        `SELECT id, items FROM orders WHERE id = ? AND site_id = ? AND user_id = ? AND status = 'delivered'`
      ).bind(orderId, siteId, user.id).first();
      if (order) {
        const orderItems = parseJsonSafe(order.items);
        if (orderItems.some((item) => (item.productId || item.product_id || item.id) === productId)) {
          isVerified = 1;
        }
      }
    } else {
      const deliveredOrder = await db.prepare(
        `SELECT id, items FROM orders WHERE site_id = ? AND user_id = ? AND status = 'delivered'`
      ).bind(siteId, user.id).all();
      for (const order of deliveredOrder.results || []) {
        const items = parseJsonSafe(order.items);
        if (items.some((item) => (item.productId || item.product_id || item.id) === productId)) {
          isVerified = 1;
          break;
        }
      }
    }
    const siteConfig = await getSiteConfig(env, siteId);
    let settings = {};
    try {
      settings = typeof siteConfig.settings === "string" ? JSON.parse(siteConfig.settings) : siteConfig.settings || {};
    } catch (e) {
    }
    const autoApprove = settings.reviewsAutoApprove === true;
    const reviewId = generateId();
    const customerName = user.name || user.email?.split("@")[0] || "Customer";
    const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null;
    const status = autoApprove ? "approved" : "pending";
    const isApproved = autoApprove ? 1 : 0;
    const rowBytes = estimateRowBytes({ id: reviewId, site_id: siteId, product_id: productId, order_id: orderId, user_id: user.id, customer_name: customerName, rating, title, content, images: imagesJson, status, is_verified: isVerified, is_approved: isApproved });
    await db.prepare(
      `INSERT INTO reviews (id, site_id, product_id, order_id, user_id, customer_name, rating, title, content, images, status, is_verified, is_approved, row_size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(reviewId, siteId, productId, orderId || null, user.id, customerName, rating, title || null, content || null, imagesJson, status, isVerified, isApproved, rowBytes).run();
    await trackD1Write(env, siteId, rowBytes);
    return successResponse({ id: reviewId, status }, autoApprove ? "Review published successfully!" : "Review submitted and pending approval.");
  } catch (error) {
    console.error("Submit review error:", error);
    return errorResponse("Failed to submit review", 500);
  }
}
__name(submitReview, "submitReview");
async function submitGuestReview(request, env) {
  try {
    const data = await request.json();
    const { siteId, orderId, reviewToken, productId, rating, title, content, images, customerName } = data;
    if (!siteId || !orderId || !reviewToken || !productId || !rating) {
      return errorResponse("siteId, orderId, reviewToken, productId, and rating are required", 400);
    }
    if (rating < 1 || rating > 5)
      return errorResponse("Rating must be between 1 and 5", 400);
    const locked = await checkMigrationLock(env, siteId);
    if (locked)
      return errorResponse("Site is under maintenance", 503);
    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);
    await ensureReviewTokenColumn(db, "guest_orders");
    let order = await db.prepare(
      `SELECT id, order_number, customer_name, items FROM guest_orders WHERE id = ? AND site_id = ? AND review_token = ? AND status = 'delivered'`
    ).bind(orderId, siteId, reviewToken).first();
    if (!order) {
      await ensureReviewTokenColumn(db, "orders");
      order = await db.prepare(
        `SELECT id, order_number, customer_name, items FROM orders WHERE id = ? AND site_id = ? AND review_token = ? AND status = 'delivered'`
      ).bind(orderId, siteId, reviewToken).first();
      if (!order)
        return errorResponse("Invalid or expired review link", 403);
    }
    const items = parseJsonSafe(order.items);
    const hasProduct = items.some((item) => (item.productId || item.product_id || item.id) === productId);
    if (!hasProduct)
      return errorResponse("This product was not part of the order", 400);
    const existingReview = await db.prepare(
      `SELECT id FROM reviews WHERE site_id = ? AND product_id = ? AND order_id = ? LIMIT 1`
    ).bind(siteId, productId, orderId).first();
    if (existingReview)
      return errorResponse("This product has already been reviewed for this order", 400);
    const siteConfig = await getSiteConfig(env, siteId);
    let settings = {};
    try {
      settings = typeof siteConfig.settings === "string" ? JSON.parse(siteConfig.settings) : siteConfig.settings || {};
    } catch (e) {
    }
    const autoApprove = settings.reviewsAutoApprove === true;
    const reviewId = generateId();
    const name = customerName || order.customer_name || "Customer";
    const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null;
    const status = autoApprove ? "approved" : "pending";
    const isApproved = autoApprove ? 1 : 0;
    const rowBytes = estimateRowBytes({ id: reviewId, site_id: siteId, product_id: productId, order_id: orderId, customer_name: name, rating, title, content, images: imagesJson, status, is_verified: 1, is_approved: isApproved });
    await db.prepare(
      `INSERT INTO reviews (id, site_id, product_id, order_id, user_id, customer_name, rating, title, content, images, status, is_verified, is_approved, row_size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(reviewId, siteId, productId, orderId, null, name, rating, title || null, content || null, imagesJson, status, 1, isApproved, rowBytes).run();
    await trackD1Write(env, siteId, rowBytes);
    return successResponse({ id: reviewId, status }, autoApprove ? "Review published successfully!" : "Review submitted and pending approval.");
  } catch (error) {
    console.error("Submit guest review error:", error);
    return errorResponse("Failed to submit review", 500);
  }
}
__name(submitGuestReview, "submitGuestReview");
async function getAdminReviews(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const authHeader = request.headers.get("Authorization");
    let isAdmin = false;
    if (authHeader && authHeader.startsWith("SiteAdmin ")) {
      const { validateSiteAdmin: validateSiteAdmin2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
      const admin = await validateSiteAdmin2(request, env, siteId);
      if (admin)
        isAdmin = true;
    }
    if (!isAdmin) {
      const user = await validateAnyAuth(request, env, { siteId });
      if (!user)
        return errorResponse("Authentication required", 401);
      const site = await env.DB.prepare("SELECT id FROM sites WHERE id = ? AND user_id = ?").bind(siteId, user.id).first();
      if (!site)
        return errorResponse("Unauthorized", 403);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);
    const statusFilter = url.searchParams.get("status") || "all";
    let query = `SELECT r.*, p.name as product_name, p.thumbnail_url as product_image, p.slug as product_slug
                 FROM reviews r LEFT JOIN products p ON r.product_id = p.id AND p.site_id = r.site_id
                 WHERE r.site_id = ?`;
    const bindings = [siteId];
    if (statusFilter !== "all") {
      query += ` AND r.status = ?`;
      bindings.push(statusFilter);
    }
    query += ` ORDER BY r.created_at DESC LIMIT 200`;
    const reviews = await db.prepare(query).bind(...bindings).all();
    const stats = await db.prepare(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
              SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
              AVG(CASE WHEN status = 'approved' THEN rating ELSE NULL END) as avg_rating
       FROM reviews WHERE site_id = ?`
    ).bind(siteId).first();
    return jsonResponse({
      success: true,
      data: {
        reviews: (reviews.results || []).map((r) => ({ ...r, images: parseJsonSafe(r.images) })),
        stats: {
          total: stats?.total || 0,
          pending: stats?.pending || 0,
          approved: stats?.approved || 0,
          rejected: stats?.rejected || 0,
          avgRating: stats?.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0
        }
      }
    });
  } catch (error) {
    console.error("Get admin reviews error:", error);
    return errorResponse("Failed to fetch reviews", 500);
  }
}
__name(getAdminReviews, "getAdminReviews");
async function updateReviewStatus(request, env, reviewId, ctx2) {
  try {
    const data = await request.json();
    const { siteId, status } = data;
    if (!siteId || !status)
      return errorResponse("siteId and status are required", 400);
    if (!["approved", "rejected"].includes(status))
      return errorResponse("Status must be approved or rejected", 400);
    const authHeader = request.headers.get("Authorization");
    let isAdmin = false;
    if (authHeader && authHeader.startsWith("SiteAdmin ")) {
      const { validateSiteAdmin: validateSiteAdmin2 } = await Promise.resolve().then(() => (init_site_admin_worker(), site_admin_worker_exports));
      const admin = await validateSiteAdmin2(request, env, siteId);
      if (admin)
        isAdmin = true;
    }
    if (!isAdmin) {
      const user = await validateAnyAuth(request, env, { siteId });
      if (!user)
        return errorResponse("Authentication required", 401);
      const site = await env.DB.prepare("SELECT id FROM sites WHERE id = ? AND user_id = ?").bind(siteId, user.id).first();
      if (!site)
        return errorResponse("Unauthorized", 403);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);
    const review = await db.prepare(
      "SELECT product_id FROM reviews WHERE id = ? AND site_id = ?"
    ).bind(reviewId, siteId).first();
    const isApproved = status === "approved" ? 1 : 0;
    await db.prepare(
      `UPDATE reviews SET status = ?, is_approved = ? WHERE id = ? AND site_id = ?`
    ).bind(status, isApproved, reviewId, siteId).run();
    if (ctx2 && review) {
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["reviews"], { productId: review.product_id }));
    }
    return successResponse(null, `Review ${status} successfully`);
  } catch (error) {
    console.error("Update review status error:", error);
    return errorResponse("Failed to update review", 500);
  }
}
__name(updateReviewStatus, "updateReviewStatus");
async function getReviewSummary(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    const productId = url.searchParams.get("productId");
    if (!siteId || !productId)
      return errorResponse("siteId and productId are required", 400);
    const db = await resolveSiteDBById(env, siteId);
    await ensureReviewColumns(db);
    const stats = await db.prepare(
      `SELECT COUNT(*) as total, AVG(rating) as avg_rating
       FROM reviews WHERE site_id = ? AND product_id = ? AND status = 'approved' AND is_approved = 1`
    ).bind(siteId, productId).first();
    return jsonResponse({
      success: true,
      data: {
        total: stats?.total || 0,
        avgRating: stats?.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0
      }
    });
  } catch (error) {
    console.error("Get review summary error:", error);
    return errorResponse("Failed to fetch review summary", 500);
  }
}
__name(getReviewSummary, "getReviewSummary");
function parseJsonSafe(val) {
  if (!val)
    return [];
  if (Array.isArray(val))
    return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
__name(parseJsonSafe, "parseJsonSafe");

// workers/storefront/blog-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_cache();
init_site_db();
init_site_admin_worker();
init_usage_tracker();
var _tableReady = /* @__PURE__ */ new Set();
async function ensureBlogTable(db, siteId) {
  const cacheKey = siteId;
  if (_tableReady.has(cacheKey))
    return;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      excerpt TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      author TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      meta_title TEXT DEFAULT '',
      meta_description TEXT DEFAULT '',
      published_at TEXT,
      row_size_bytes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(site_id, slug)
    )`).run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_blog_posts_site ON blog_posts(site_id)").run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(site_id, slug)").run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(site_id, status)").run();
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(site_id, published_at)").run();
    _tableReady.add(cacheKey);
  } catch (e) {
    if (!e.message?.includes("already exists")) {
      console.error("Failed to create blog_posts table:", e);
    }
    _tableReady.add(cacheKey);
  }
}
__name(ensureBlogTable, "ensureBlogTable");
function slugify(text) {
  return text.toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
}
__name(slugify, "slugify");
async function handleBlog(request, env, path, ctx2) {
  const corsResponse = handleCORS(request);
  if (corsResponse)
    return corsResponse;
  const method = request.method;
  const pathParts = path.split("/").filter(Boolean);
  const action = pathParts[2];
  const subAction = pathParts[3];
  if (action === "posts" && method === "GET" && !subAction) {
    return listPosts(request, env);
  }
  if (action === "post" && subAction && method === "GET") {
    return getPost(request, env, subAction);
  }
  if (action === "admin" && method === "GET" && !subAction) {
    return adminListPosts(request, env);
  }
  if (action === "admin" && subAction && method === "GET") {
    return adminGetPost(request, env, subAction);
  }
  if (action === "admin" && method === "POST" && !subAction) {
    return createPost(request, env, ctx2);
  }
  if (action === "admin" && subAction && method === "PUT") {
    return updatePost(request, env, subAction, ctx2);
  }
  if (action === "admin" && subAction && method === "DELETE") {
    return deletePost(request, env, subAction, ctx2);
  }
  return errorResponse("Not found", 404);
}
__name(handleBlog, "handleBlog");
async function isBlogEnabled(db, siteId) {
  try {
    const site = await db.prepare("SELECT settings FROM site_config WHERE id = ?").bind(siteId).first();
    if (!site)
      return true;
    let settings = site.settings || "{}";
    if (typeof settings === "string") {
      try {
        settings = JSON.parse(settings);
      } catch (e) {
        return true;
      }
    }
    return settings.showBlog !== false;
  } catch (e) {
    return true;
  }
}
__name(isBlogEnabled, "isBlogEnabled");
async function listPosts(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const db = await resolveSiteDBById(env, siteId);
    await ensureBlogTable(db, siteId);
    if (!await isBlogEnabled(db, siteId)) {
      return successResponse({ posts: [], total: 0, page: 1, totalPages: 0 });
    }
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "12") || 12));
    const offset = (page - 1) * limit;
    const posts = await db.prepare(
      `SELECT id, title, slug, excerpt, cover_image, author, tags, published_at, created_at
       FROM blog_posts WHERE site_id = ? AND status = 'published'
       ORDER BY published_at DESC LIMIT ? OFFSET ?`
    ).bind(siteId, limit, offset).all();
    const countResult = await db.prepare(
      `SELECT COUNT(*) as total FROM blog_posts WHERE site_id = ? AND status = 'published'`
    ).bind(siteId).first();
    return cachedJsonResponse({ success: true, message: "Success", data: {
      posts: posts.results || [],
      total: countResult?.total || 0,
      page,
      totalPages: Math.ceil((countResult?.total || 0) / limit)
    } });
  } catch (error) {
    console.error("List blog posts error:", error);
    return errorResponse("Failed to fetch blog posts", 500);
  }
}
__name(listPosts, "listPosts");
async function getPost(request, env, slug) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const db = await resolveSiteDBById(env, siteId);
    await ensureBlogTable(db, siteId);
    if (!await isBlogEnabled(db, siteId)) {
      return errorResponse("Blog post not found", 404);
    }
    const post = await db.prepare(
      `SELECT id, title, slug, content, excerpt, cover_image, author, tags,
              meta_title, meta_description, published_at, created_at, updated_at
       FROM blog_posts WHERE site_id = ? AND slug = ? AND status = 'published'`
    ).bind(siteId, slug).first();
    if (!post)
      return errorResponse("Blog post not found", 404);
    return cachedJsonResponse({ success: true, message: "Success", data: post });
  } catch (error) {
    console.error("Get blog post error:", error);
    return errorResponse("Failed to fetch blog post", 500);
  }
}
__name(getPost, "getPost");
async function adminListPosts(request, env) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!admin.isOwner && admin.permissions && !admin.permissions.includes("website")) {
      return errorResponse("Permission denied", 403);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureBlogTable(db, siteId);
    const posts = await db.prepare(
      `SELECT id, title, slug, excerpt, cover_image, status, author, tags, published_at, created_at, updated_at
       FROM blog_posts WHERE site_id = ? ORDER BY created_at DESC`
    ).bind(siteId).all();
    return successResponse(posts.results || []);
  } catch (error) {
    console.error("Admin list blog posts error:", error);
    return errorResponse("Failed to fetch blog posts", 500);
  }
}
__name(adminListPosts, "adminListPosts");
async function adminGetPost(request, env, postId) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!admin.isOwner && admin.permissions && !admin.permissions.includes("website")) {
      return errorResponse("Permission denied", 403);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureBlogTable(db, siteId);
    const post = await db.prepare(
      `SELECT id, title, slug, content, excerpt, cover_image, status, author, tags,
              meta_title, meta_description, published_at, created_at, updated_at
       FROM blog_posts WHERE id = ? AND site_id = ?`
    ).bind(postId, siteId).first();
    if (!post)
      return errorResponse("Blog post not found", 404);
    return successResponse(post);
  } catch (error) {
    console.error("Admin get blog post error:", error);
    return errorResponse("Failed to fetch blog post", 500);
  }
}
__name(adminGetPost, "adminGetPost");
async function createPost(request, env, ctx2) {
  try {
    const body = await request.json();
    const { siteId, title, content, excerpt, coverImage, status, author, tags, metaTitle, metaDescription } = body;
    if (!siteId)
      return errorResponse("siteId is required", 400);
    if (!title || !title.trim())
      return errorResponse("Title is required", 400);
    const validStatuses = ["draft", "published"];
    const postStatus = validStatuses.includes(status) ? status : "draft";
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!admin.isOwner && admin.permissions && !admin.permissions.includes("website")) {
      return errorResponse("Permission denied", 403);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureBlogTable(db, siteId);
    const id = generateId();
    let slug = slugify(title);
    const existing = await db.prepare(
      "SELECT id FROM blog_posts WHERE site_id = ? AND slug = ?"
    ).bind(siteId, slug).first();
    if (existing) {
      slug = slug + "-" + Date.now().toString(36);
    }
    const publishedAt = postStatus === "published" ? (/* @__PURE__ */ new Date()).toISOString() : null;
    const tagsJson = JSON.stringify(tags || []);
    await db.prepare(
      `INSERT INTO blog_posts (id, site_id, title, slug, content, excerpt, cover_image, status, author, tags, meta_title, meta_description, published_at, row_size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).bind(
      id,
      siteId,
      title.trim(),
      slug,
      content || "",
      excerpt || "",
      coverImage || "",
      postStatus,
      author || "",
      tagsJson,
      metaTitle || "",
      metaDescription || "",
      publishedAt
    ).run();
    const rowData = { id, site_id: siteId, title, slug, content: content || "", excerpt: excerpt || "", cover_image: coverImage || "", status: postStatus, author: author || "", tags: tagsJson, meta_title: metaTitle || "", meta_description: metaDescription || "" };
    const rowBytes = estimateRowBytes(rowData);
    try {
      await db.prepare("UPDATE blog_posts SET row_size_bytes = ? WHERE id = ?").bind(rowBytes, id).run();
      await trackD1Write(env, siteId, rowBytes);
    } catch (e) {
    }
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["blog"], { postSlug: slug }));
    return successResponse({ id, slug }, "Blog post created");
  } catch (error) {
    console.error("Create blog post error:", error);
    return errorResponse("Failed to create blog post", 500);
  }
}
__name(createPost, "createPost");
async function updatePost(request, env, postId, ctx2) {
  try {
    const body = await request.json();
    const { siteId, title, content, excerpt, coverImage, status, author, tags, metaTitle, metaDescription, slug: newSlug } = body;
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!admin.isOwner && admin.permissions && !admin.permissions.includes("website")) {
      return errorResponse("Permission denied", 403);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureBlogTable(db, siteId);
    const existing = await db.prepare(
      "SELECT id, status, published_at, row_size_bytes FROM blog_posts WHERE id = ? AND site_id = ?"
    ).bind(postId, siteId).first();
    if (!existing)
      return errorResponse("Blog post not found", 404);
    const setClauses = [];
    const values = [];
    if (title !== void 0) {
      setClauses.push("title = ?");
      values.push(title.trim());
    }
    if (content !== void 0) {
      setClauses.push("content = ?");
      values.push(content);
    }
    if (excerpt !== void 0) {
      setClauses.push("excerpt = ?");
      values.push(excerpt);
    }
    if (coverImage !== void 0) {
      setClauses.push("cover_image = ?");
      values.push(coverImage);
    }
    if (author !== void 0) {
      setClauses.push("author = ?");
      values.push(author);
    }
    if (tags !== void 0) {
      setClauses.push("tags = ?");
      values.push(JSON.stringify(tags));
    }
    if (metaTitle !== void 0) {
      setClauses.push("meta_title = ?");
      values.push(metaTitle);
    }
    if (metaDescription !== void 0) {
      setClauses.push("meta_description = ?");
      values.push(metaDescription);
    }
    if (newSlug !== void 0) {
      const slugToUse = slugify(newSlug);
      const slugConflict = await db.prepare(
        "SELECT id FROM blog_posts WHERE site_id = ? AND slug = ? AND id != ?"
      ).bind(siteId, slugToUse, postId).first();
      if (slugConflict)
        return errorResponse("A post with this URL slug already exists", 400);
      setClauses.push("slug = ?");
      values.push(slugToUse);
    }
    if (status !== void 0) {
      const validStatuses = ["draft", "published"];
      if (!validStatuses.includes(status))
        return errorResponse("Invalid status", 400);
      setClauses.push("status = ?");
      values.push(status);
      if (status === "published" && !existing.published_at) {
        setClauses.push("published_at = ?");
        values.push((/* @__PURE__ */ new Date()).toISOString());
      }
    }
    if (setClauses.length === 0)
      return errorResponse("No fields to update", 400);
    setClauses.push("updated_at = datetime('now')");
    values.push(postId, siteId);
    const oldBytes = existing.row_size_bytes || 0;
    await db.prepare(
      `UPDATE blog_posts SET ${setClauses.join(", ")} WHERE id = ? AND site_id = ?`
    ).bind(...values).run();
    try {
      const updatedRow = await db.prepare("SELECT * FROM blog_posts WHERE id = ?").bind(postId).first();
      const newBytes = updatedRow ? estimateRowBytes(updatedRow) : oldBytes;
      await db.prepare("UPDATE blog_posts SET row_size_bytes = ? WHERE id = ?").bind(newBytes, postId).run();
      await trackD1Update(env, siteId, oldBytes, newBytes);
    } catch (e) {
    }
    const updatedPost = await db.prepare("SELECT slug FROM blog_posts WHERE id = ? AND site_id = ?").bind(postId, siteId).first();
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["blog"], { postSlug: updatedPost?.slug }));
    return successResponse({ id: postId }, "Blog post updated");
  } catch (error) {
    console.error("Update blog post error:", error);
    return errorResponse("Failed to update blog post", 500);
  }
}
__name(updatePost, "updatePost");
async function deletePost(request, env, postId, ctx2) {
  try {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId)
      return errorResponse("siteId is required", 400);
    const admin = await validateSiteAdmin(request, env, siteId);
    if (!admin)
      return errorResponse("Unauthorized", 401);
    if (!admin.isOwner && admin.permissions && !admin.permissions.includes("website")) {
      return errorResponse("Permission denied", 403);
    }
    const db = await resolveSiteDBById(env, siteId);
    await ensureBlogTable(db, siteId);
    const postToDelete = await db.prepare("SELECT slug FROM blog_posts WHERE id = ? AND site_id = ?").bind(postId, siteId).first();
    await db.prepare(
      "DELETE FROM blog_posts WHERE id = ? AND site_id = ?"
    ).bind(postId, siteId).run();
    if (ctx2)
      ctx2.waitUntil(purgeStorefrontCache(env, siteId, ["blog"], { postSlug: postToDelete?.slug }));
    return successResponse(null, "Blog post deleted");
  } catch (error) {
    console.error("Delete blog post error:", error);
    return errorResponse("Failed to delete blog post", 500);
  }
}
__name(deletePost, "deletePost");

// workers/index.js
init_usage_tracker();
init_helpers();
init_config();
init_cache();

// utils/db-init.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var _initialized = false;
async function migrateSitesTable(env) {
  try {
    const done = await env.DB.prepare(
      "SELECT setting_value FROM platform_settings WHERE setting_key = 'sites_table_migrated_v2'"
    ).first();
    if (done)
      return;
  } catch (e) {
  }
  try {
    const colCheck = await env.DB.prepare("PRAGMA table_info(sites)").all();
    const columns = (colCheck.results || []).map((c) => c.name);
    if (!columns.includes("logo_url") && !columns.includes("settings")) {
      try {
        await env.DB.prepare(
          "INSERT INTO platform_settings (setting_key, setting_value) VALUES ('sites_table_migrated_v2', '1') ON CONFLICT(setting_key) DO UPDATE SET setting_value = '1'"
        ).run();
      } catch (e) {
      }
      return;
    }
    const keepCols = [
      "id",
      "user_id",
      "subdomain",
      "brand_name",
      "category",
      "template_id",
      "is_active",
      "subscription_plan",
      "subscription_expires_at",
      "custom_domain",
      "domain_status",
      "domain_verification_token",
      "cf_hostname_id",
      "shard_id",
      "migration_locked",
      "d1_database_id",
      "d1_binding_name",
      "created_at",
      "updated_at"
    ];
    const existingKeep = keepCols.filter((c) => columns.includes(c));
    const colList = existingKeep.join(", ");
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sites_clean (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subdomain TEXT UNIQUE NOT NULL,
      brand_name TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      template_id TEXT DEFAULT 'storefront',
      is_active INTEGER DEFAULT 1,
      subscription_plan TEXT DEFAULT 'free',
      subscription_expires_at TEXT,
      custom_domain TEXT,
      domain_status TEXT,
      domain_verification_token TEXT,
      cf_hostname_id TEXT,
      shard_id TEXT,
      migration_locked INTEGER DEFAULT 0,
      d1_database_id TEXT,
      d1_binding_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`).run();
    await env.DB.prepare(`INSERT INTO sites_clean (${colList}) SELECT ${colList} FROM sites`).run();
    await env.DB.prepare("DROP TABLE sites").run();
    await env.DB.prepare("ALTER TABLE sites_clean RENAME TO sites").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_sites_subdomain ON sites(subdomain)").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(user_id)").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_sites_custom_domain ON sites(custom_domain)").run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_sites_shard ON sites(shard_id)").run();
    await env.DB.prepare(
      "INSERT INTO platform_settings (setting_key, setting_value) VALUES ('sites_table_migrated_v2', '1') ON CONFLICT(setting_key) DO UPDATE SET setting_value = '1'"
    ).run();
    console.log("Sites table migrated: removed unused config columns");
  } catch (e) {
    console.error("Sites table migration error:", e.message || e);
  }
}
__name(migrateSitesTable, "migrateSitesTable");
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
        role TEXT DEFAULT 'user',
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
        category TEXT DEFAULT 'general',
        template_id TEXT DEFAULT 'storefront',
        is_active INTEGER DEFAULT 1,
        subscription_plan TEXT DEFAULT 'free',
        subscription_expires_at TEXT,
        custom_domain TEXT,
        domain_status TEXT,
        domain_verification_token TEXT,
        cf_hostname_id TEXT,
        shard_id TEXT,
        migration_locked INTEGER DEFAULT 0,
        d1_database_id TEXT,
        d1_binding_name TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        plan_name TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        display_price REAL NOT NULL,
        original_price REAL DEFAULT NULL,
        razorpay_plan_id TEXT NOT NULL,
        features TEXT DEFAULT '[]',
        is_popular INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        display_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS platform_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS pending_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        razorpay_subscription_id TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS site_usage (
        site_id TEXT PRIMARY KEY,
        d1_bytes_used INTEGER DEFAULT 0,
        r2_bytes_used INTEGER DEFAULT 0,
        last_updated TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS site_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT NOT NULL,
        storage_key TEXT NOT NULL UNIQUE,
        size_bytes INTEGER NOT NULL,
        media_type TEXT DEFAULT 'image',
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
      "CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)",
      "CREATE INDEX IF NOT EXISTS idx_transactions_order ON payment_transactions(order_id)",
      "CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id)",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_custom_domain ON sites(custom_domain) WHERE custom_domain IS NOT NULL",
      "CREATE INDEX IF NOT EXISTS idx_site_media_site ON site_media(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_site_media_key ON site_media(storage_key)"
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
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS shards (
        id TEXT PRIMARY KEY,
        binding_name TEXT UNIQUE NOT NULL,
        database_id TEXT UNIQUE NOT NULL,
        database_name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        correction_factor REAL DEFAULT 1.0,
        last_reconciled_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS enterprise_sites (
        site_id TEXT PRIMARY KEY,
        assigned_at TEXT DEFAULT (datetime('now')),
        assigned_by TEXT,
        notes TEXT,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `).run();
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS enterprise_usage_monthly (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT NOT NULL,
        year_month TEXT NOT NULL,
        d1_overage_bytes INTEGER DEFAULT 0,
        r2_overage_bytes INTEGER DEFAULT 0,
        d1_cost_inr REAL DEFAULT 0,
        r2_cost_inr REAL DEFAULT 0,
        total_cost_inr REAL DEFAULT 0,
        status TEXT DEFAULT 'unpaid',
        paid_at TEXT,
        notes TEXT,
        snapshot_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        UNIQUE(site_id, year_month)
      )
    `).run();
    const migrations = [
      { col: "role", table: "users", sql: "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'" },
      { col: "baseline_bytes", table: "site_usage", sql: "ALTER TABLE site_usage ADD COLUMN baseline_bytes INTEGER DEFAULT 0" },
      { col: "baseline_updated_at", table: "site_usage", sql: "ALTER TABLE site_usage ADD COLUMN baseline_updated_at TEXT" },
      { col: "row_size_bytes", table: "site_media", sql: "ALTER TABLE site_media ADD COLUMN row_size_bytes INTEGER DEFAULT 0" },
      { col: "site_id", table: "subscriptions", sql: "ALTER TABLE subscriptions ADD COLUMN site_id TEXT" },
      { col: "plan_tier", table: "subscription_plans", sql: "ALTER TABLE subscription_plans ADD COLUMN plan_tier INTEGER DEFAULT 0" },
      { col: "original_price", table: "subscription_plans", sql: "ALTER TABLE subscription_plans ADD COLUMN original_price REAL DEFAULT NULL" },
      { col: "staff_id", table: "site_admin_sessions", sql: "ALTER TABLE site_admin_sessions ADD COLUMN staff_id TEXT" },
      { col: "permissions", table: "site_admin_sessions", sql: "ALTER TABLE site_admin_sessions ADD COLUMN permissions TEXT" }
    ];
    for (const m of migrations) {
      try {
        await env.DB.prepare(m.sql).run();
      } catch (e) {
      }
    }
    try {
      await env.DB.prepare(`UPDATE sites SET template_id = 'storefront' WHERE template_id = 'template1'`).run();
    } catch (e) {
    }
    await migrateSitesTable(env);
    try {
      const shards = await env.DB.prepare("SELECT id, binding_name FROM shards WHERE is_active = 1").all();
      for (const shard of shards.results || []) {
        const shardDB = env[shard.binding_name];
        if (shardDB) {
          try {
            await shardDB.prepare(`CREATE TABLE IF NOT EXISTS site_config (
              site_id TEXT PRIMARY KEY,
              brand_name TEXT,
              category TEXT,
              logo_url TEXT,
              favicon_url TEXT,
              primary_color TEXT DEFAULT '#000000',
              secondary_color TEXT DEFAULT '#ffffff',
              phone TEXT,
              email TEXT,
              address TEXT,
              social_links TEXT,
              settings TEXT DEFAULT '{}',
              currency TEXT DEFAULT 'INR',
              seo_title TEXT,
              seo_description TEXT,
              seo_og_image TEXT,
              seo_robots TEXT DEFAULT 'index, follow',
              google_verification TEXT,
              og_title TEXT,
              og_description TEXT,
              og_image TEXT,
              og_type TEXT DEFAULT 'website',
              twitter_card TEXT DEFAULT 'summary_large_image',
              twitter_title TEXT,
              twitter_description TEXT,
              twitter_image TEXT,
              twitter_site TEXT,
              row_size_bytes INTEGER DEFAULT 0,
              created_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now'))
            )`).run();
          } catch (e) {
            console.error(`Failed to ensure site_config on shard ${shard.binding_name}:`, e.message || e);
          }
        }
      }
    } catch (e) {
      console.error("Shard site_config migration error (non-fatal):", e.message || e);
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
init_site_db();
var workers_default = {
  async fetch(request, env, ctx2) {
    const corsResponse = handleCORS(request);
    if (corsResponse)
      return corsResponse;
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      await ensureTablesExist(env);
      if (path.startsWith("/api/")) {
        return handleAPI(request, env, path, ctx2);
      }
      if (path.startsWith("/auth/google/")) {
        return handleGoogleAuthFlow(request, env, path);
      }
      const siteResponse = await handleSiteRouting(request, env);
      if (siteResponse) {
        return siteResponse;
      }
      const hostname = url.hostname;
      const platformDomain = env.DOMAIN || PLATFORM_DOMAIN;
      if (hostname === `www.${platformDomain}` || hostname === platformDomain) {
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
  },
  async scheduled(event, env, ctx2) {
    ctx2.waitUntil(cleanupExpiredData(env));
  }
};
async function handleAPI(request, env, path, ctx2) {
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
      return handleSites(request, env, path, ctx2);
    case "products":
      return handleProducts(request, env, path, ctx2);
    case "orders":
      return handleOrders(request, env, path, ctx2);
    case "cart":
      return handleCart(request, env, path);
    case "wishlist":
      return handleWishlist(request, env, path);
    case "payments":
      return handlePayments(request, env, path, ctx2);
    case "email":
      return handleEmail(request, env, path);
    case "categories":
      return handleCategories(request, env, path, ctx2);
    case "users":
      return handleUsers(request, env, path);
    case "admin":
      return handleAdmin(request, env, path);
    case "site-admin":
      return handleSiteAdmin(request, env, path, ctx2);
    case "customer-auth":
      return handleCustomerAuth(request, env, path);
    case "upload":
      return handleUpload(request, env, path);
    case "analytics":
      return handleAnalytics(request, env, path);
    case "notifications":
      return handleNotifications(request, env, path);
    case "reviews":
      return handleReviews(request, env, path, ctx2);
    case "blog":
      return handleBlog(request, env, path, ctx2);
    case "usage":
      return handleUsageAPI(request, env, path);
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
  let siteRow = null;
  try {
    if (subdomain) {
      siteRow = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.template_id,
                s.custom_domain, s.domain_status, s.domain_verification_token
         FROM sites s 
         WHERE LOWER(s.subdomain) = LOWER(?) AND s.is_active = 1`
      ).bind(subdomain).first();
    } else if (!hostname.endsWith(env.DOMAIN || PLATFORM_DOMAIN) && !hostname.endsWith("pages.dev") && !hostname.includes("localhost") && !hostname.includes("workers.dev")) {
      siteRow = await env.DB.prepare(
        `SELECT s.id, s.subdomain, s.brand_name, s.template_id,
                s.custom_domain, s.domain_status, s.domain_verification_token
         FROM sites s 
         WHERE s.custom_domain = ? AND s.domain_status = 'verified' AND s.is_active = 1`
      ).bind(hostname.toLowerCase()).first();
    }
    if (!siteRow) {
      return errorResponse(subdomain ? "Site not found" : "Subdomain is required", subdomain ? 404 : 400);
    }
    const siteDB = await resolveSiteDBById(env, siteRow.id);
    const config = await siteDB.prepare(
      "SELECT * FROM site_config WHERE site_id = ?"
    ).bind(siteRow.id).first();
    const { site_id: _sid, row_size_bytes: _rb, ...configData } = config || {};
    const site = { ...siteRow, ...configData };
    let categoriesResult = [];
    try {
      const categories = await siteDB.prepare(
        "SELECT * FROM categories WHERE site_id = ? ORDER BY display_order"
      ).bind(site.id).all();
      const allCats = categories.results || [];
      const parents = allCats.filter((c) => !c.parent_id);
      categoriesResult = parents.map((parent) => {
        const directChildren = allCats.filter((c) => c.parent_id === parent.id);
        return {
          ...parent,
          children: directChildren.map((child) => ({
            ...child,
            children: allCats.filter((gc) => gc.parent_id === child.id)
          }))
        };
      });
    } catch (catError) {
      console.error("Categories query failed:", catError);
    }
    let socialLinks = {};
    let settings = {};
    try {
      if (site.social_links)
        socialLinks = typeof site.social_links === "string" ? JSON.parse(site.social_links) : site.social_links;
    } catch (e) {
    }
    try {
      if (site.settings)
        settings = typeof site.settings === "string" ? JSON.parse(site.settings) : site.settings;
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
    const googleClientId = env.GOOGLE_CLIENT_ID || null;
    const vapidPublicKey = env.VAPID_PUBLIC_KEY || null;
    let pageSEOResult = [];
    try {
      const psResult = await siteDB.prepare(
        "SELECT page_type, seo_title, seo_description, seo_og_image FROM page_seo WHERE site_id = ?"
      ).bind(site.id).all();
      pageSEOResult = psResult.results || [];
    } catch {
    }
    const pageSEO = {};
    for (const ps of pageSEOResult) {
      pageSEO[ps.page_type] = {
        seo_title: ps.seo_title,
        seo_description: ps.seo_description,
        seo_og_image: ps.seo_og_image
      };
    }
    return cachedJsonResponse({
      success: true,
      data: {
        ...site,
        socialLinks,
        settings: publicSettings,
        categories: categoriesResult,
        pageSEO,
        googleClientId,
        vapidPublicKey
      }
    });
  } catch (error) {
    console.error("Get site info error:", error);
    return errorResponse("Failed to fetch site info: " + error.message, 500);
  }
}
__name(handleSiteInfo, "handleSiteInfo");
async function handleGoogleAuthFlow(request, env, path) {
  const url = new URL(request.url);
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response("Google Sign-In is not configured", { status: 500, headers: { "Content-Type": "text/plain" } });
  }
  if (path === "/auth/google/start") {
    const siteId = url.searchParams.get("siteId") || "";
    const returnUrl = url.searchParams.get("returnUrl") || "";
    const mode = url.searchParams.get("mode") || "login";
    const domain = env.DOMAIN || PLATFORM_DOMAIN;
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Sign in with Google - Fluxe</title>
<style>
body{margin:0;font-family:'Lato',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fa}
.container{text-align:center;background:#fff;padding:40px;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,0.1);max-width:400px;width:90%}
h2{font-family:'Playfair Display',serif;color:#333;margin-bottom:8px}
p{color:#777;margin-bottom:24px}
.error{color:#e74c3c;background:rgba(231,76,60,0.1);border:1px solid #e74c3c;padding:12px;border-radius:6px;margin-top:16px;display:none}
.loading{color:#666;margin-top:16px;display:none}
#google-btn{min-height:44px;display:flex;justify-content:center}
</style>
<script src="https://accounts.google.com/gsi/client" async defer><\/script>
</head><body>
<div class="container">
<h2>${mode === "signup" ? "Sign Up" : "Sign In"} with Google</h2>
<p>Choose your Google account to continue</p>
<div id="google-btn"></div>
<div class="loading" id="loading">Signing you in...</div>
<div class="error" id="error"></div>
</div>
<script>
const siteId="${siteId.replace(/"/g, "")}";
const returnUrl="${returnUrl.replace(/"/g, "")}";
const domain="${domain}";
function onCredential(r){
  document.getElementById('loading').style.display='block';
  document.getElementById('error').style.display='none';
  fetch('/api/customer-auth/google-login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({siteId:siteId,credential:r.credential})
  }).then(function(res){return res.json()}).then(function(data){
    if(data.success&&data.data){
      var d=data.data;
      var token=d.token;
      var customer=d.customer;
      var sep=returnUrl.indexOf('?')>=0?'&':'?';
      var dest=returnUrl+sep+'google_auth_token='+encodeURIComponent(token)+'&google_auth_customer='+encodeURIComponent(JSON.stringify(customer));
      window.location.href=dest;
    }else{
      showError(data.message||data.error||'Sign-in failed');
    }
  }).catch(function(e){showError('Network error. Please try again.')});
}
function showError(msg){
  document.getElementById('loading').style.display='none';
  var el=document.getElementById('error');el.textContent=msg;el.style.display='block';
}
window.onload=function(){
  if(window.google&&window.google.accounts){
    google.accounts.id.initialize({client_id:"${clientId}",callback:onCredential,auto_select:false});
    google.accounts.id.renderButton(document.getElementById('google-btn'),{type:'standard',theme:'outline',size:'large',text:'${mode === "signup" ? "signup_with" : "signin_with"}',width:340});
  }else{showError('Failed to load Google Sign-In. Please try again.')}
};
<\/script></body></html>`;
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store",
        ...corsHeaders()
      }
    });
  }
  return new Response("Not found", { status: 404 });
}
__name(handleGoogleAuthFlow, "handleGoogleAuthFlow");
async function cleanupExpiredData(env) {
  try {
    try {
      await env.DB.prepare(
        `DELETE FROM sessions WHERE expires_at < datetime('now')`
      ).run();
    } catch (e) {
      console.error("[Cleanup] platform sessions:", e.message || e);
    }
    try {
      await env.DB.prepare(
        `DELETE FROM email_verifications WHERE (used = 1 OR expires_at < datetime('now'))`
      ).run();
    } catch (e) {
      console.error("[Cleanup] platform email_verifications:", e.message || e);
    }
    try {
      await env.DB.prepare(
        `DELETE FROM password_resets WHERE (used = 1 OR expires_at < datetime('now'))`
      ).run();
    } catch (e) {
      console.error("[Cleanup] platform password_resets:", e.message || e);
    }
    const allSites = await env.DB.prepare("SELECT id FROM sites").all();
    for (const site of allSites.results || []) {
      try {
        const db = await resolveSiteDBById(env, site.id);
        await db.prepare(
          `DELETE FROM site_customer_sessions WHERE expires_at < datetime('now')`
        ).run();
        await db.prepare(
          `DELETE FROM customer_password_resets WHERE (used = 1 OR expires_at < datetime('now'))`
        ).run();
        await db.prepare(
          `DELETE FROM customer_email_verifications WHERE (used = 1 OR expires_at < datetime('now'))`
        ).run();
      } catch (e) {
        console.error(`[Cleanup] shard for site ${site.id}:`, e.message || e);
      }
    }
    console.log("[Cleanup] Expired sessions and tokens cleaned up successfully");
  } catch (error) {
    console.error("[Cleanup] Error during cleanup:", error);
  }
}
__name(cleanupExpiredData, "cleanupExpiredData");

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

// .wrangler/tmp/bundle-KKL3BZ/middleware-insertion-facade.js
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
function __facade_invokeChain__(request, env, ctx2, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx2, dispatch, tail);
    }
  };
  return head(request, env, ctx2, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx2, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx2, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-KKL3BZ/middleware-loader.entry.ts
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
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx2) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx2);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx2) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx2);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx2, dispatcher, fetchDispatcher);
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
    #fetchDispatcher = (request, env, ctx2) => {
      this.env = env;
      this.ctx = ctx2;
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
