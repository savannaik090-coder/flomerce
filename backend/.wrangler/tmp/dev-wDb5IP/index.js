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

// .wrangler/tmp/bundle-bbt0xo/checked-fetch.js
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
  ".wrangler/tmp/bundle-bbt0xo/checked-fetch.js"() {
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

// .wrangler/tmp/bundle-bbt0xo/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
var init_strip_cf_connecting_ip_header = __esm({
  ".wrangler/tmp/bundle-bbt0xo/strip-cf-connecting-ip-header.js"() {
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

// utils/site-db.js
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
var init_site_db = __esm({
  "utils/site-db.js"() {
    init_checked_fetch();
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
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
      standard: { d1Bytes: 1 * 1024 * 1024 * 1024, r2Bytes: 15 * 1024 * 1024 * 1024, allowOverage: false },
      pro: { d1Bytes: 2 * 1024 * 1024 * 1024, r2Bytes: 50 * 1024 * 1024 * 1024, allowOverage: false },
      enterprise: { d1Bytes: 2 * 1024 * 1024 * 1024, r2Bytes: 50 * 1024 * 1024 * 1024, allowOverage: false },
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
async function handleSiteAdmin(request, env, path) {
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
      return handleSEO(request, env, pathParts);
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
    const staff = await env.DB.prepare(
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
      await env.DB.prepare(
        "UPDATE site_staff SET failed_login_attempts = ?, locked_until = ? WHERE id = ?"
      ).bind(attempts, lockedUntil, staff.id).run();
      if (attempts >= 5) {
        return errorResponse("Too many failed login attempts. Account locked for 15 minutes.", 429);
      }
      return errorResponse("Invalid email or password", 401);
    }
    await env.DB.prepare(
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
      const staff = await env.DB.prepare(
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
async function handleSEO(request, env, pathParts) {
  const subResource = pathParts[3];
  const resourceId = pathParts[4];
  if (!subResource) {
    if (request.method === "GET")
      return getSiteSEO(request, env);
    if (request.method === "PUT")
      return saveSiteSEO(request, env);
  }
  if (subResource === "categories") {
    if (request.method === "GET")
      return getCategoriesSEO(request, env);
    if (request.method === "PUT" && resourceId)
      return saveCategorySEO(request, env, resourceId);
  }
  if (subResource === "products") {
    if (request.method === "GET")
      return getProductsSEO(request, env);
    if (request.method === "PUT" && resourceId)
      return saveProductSEO(request, env, resourceId);
  }
  if (subResource === "pages") {
    if (request.method === "GET")
      return getPagesSEO(request, env);
    if (request.method === "PUT" && resourceId)
      return savePageSEO(request, env, resourceId);
  }
  if (subResource === "social") {
    if (request.method === "GET")
      return getSocialTags(request, env);
    if (request.method === "PUT")
      return saveSocialTags(request, env);
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
      favicon_url: config.favicon_url || null
    } });
  } catch (err) {
    console.error("getSiteSEO error:", err);
    return errorResponse("Failed to fetch SEO settings", 500);
  }
}
async function saveSiteSEO(request, env) {
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
async function saveCategorySEO(request, env, categoryId) {
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
async function saveProductSEO(request, env, productId) {
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
async function savePageSEO(request, env, pageType) {
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
async function saveSocialTags(request, env) {
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
      const staff = await env.DB.prepare(
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
    const result = await env.DB.prepare(
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
    const staff = await env.DB.prepare(
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
    const existing = await env.DB.prepare(
      "SELECT id FROM site_staff WHERE site_id = ? AND LOWER(email) = LOWER(?)"
    ).bind(siteId, email.trim()).first();
    if (existing) {
      return errorResponse("A staff member with this email already exists for this site", 400);
    }
    const passwordHash = await hashPassword(password);
    const id = generateId();
    await env.DB.prepare(
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
    const existing = await env.DB.prepare(
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
      const emailConflict = await env.DB.prepare(
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
    await env.DB.prepare(
      `UPDATE site_staff SET ${setClauses.join(", ")} WHERE id = ? AND site_id = ?`
    ).bind(...values).run();
    if (updates.permissions !== void 0 || updates.is_active === false || updates.password) {
      await env.DB.prepare(
        "DELETE FROM site_admin_sessions WHERE staff_id = ? AND site_id = ?"
      ).bind(staffId, siteId).run();
    }
    const updated = await env.DB.prepare(
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
    const existing = await env.DB.prepare(
      "SELECT id FROM site_staff WHERE id = ? AND site_id = ?"
    ).bind(staffId, siteId).first();
    if (!existing)
      return errorResponse("Staff member not found", 404);
    await env.DB.prepare(
      "DELETE FROM site_admin_sessions WHERE staff_id = ? AND site_id = ?"
    ).bind(staffId, siteId).run();
    await env.DB.prepare(
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
    init_auth();
    init_site_db();
    init_usage_tracker();
    ALL_PERMISSIONS = ["dashboard", "products", "inventory", "orders", "customers", "analytics", "website", "seo", "notifications", "settings"];
    __name(handleSiteAdmin, "handleSiteAdmin");
    __name(staffLogin, "staffLogin");
    __name(validateSiteAdminToken, "validateSiteAdminToken");
    __name(autoLoginSiteAdmin, "autoLoginSiteAdmin");
    __name(staffLogout, "staffLogout");
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

// .wrangler/tmp/bundle-bbt0xo/middleware-loader.entry.ts
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// .wrangler/tmp/bundle-bbt0xo/middleware-insertion-facade.js
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
      const fromEmail = env.FROM_EMAIL || "noreply@fluxe.in";
      const fromField = fromEmail.includes("<") ? fromEmail : `Fluxe <${fromEmail}>`;
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromField,
          to: typeof to === "string" ? [to] : to,
          subject,
          html,
          text
        })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("Resend error:", JSON.stringify(body), "Status:", response.status);
        return body.message || body.error || "Resend API error";
      }
      console.log("Email sent via Resend to:", to, "Subject:", subject);
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
      console.log("Email sent via SendGrid to:", to, "Subject:", subject);
      return true;
    }
    console.warn("WARNING: No email provider configured (RESEND_API_KEY or SENDGRID_API_KEY missing). Email NOT sent to:", to, "Subject:", subject);
    return "No email provider configured";
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

          ${(() => {
    const sub = Number(order.subtotal || order.total || 0);
    const disc = Number(order.discount || 0);
    const tot = Number(order.total || 0);
    const coupon = order.coupon_code || "";
    if (disc > 0) {
      return `<div style="padding: 16px; background: #f8f9fa; border-radius: 8px; margin-top: 16px; text-align: right;">
                <div style="font-size: 14px; color: #555; margin-bottom: 4px;">Subtotal: <strong>&#8377;${sub.toFixed(2)}</strong></div>
                <div style="font-size: 14px; color: #16a34a; margin-bottom: 8px;">Coupon${coupon ? ` (${coupon})` : ""}: <strong>-&#8377;${disc.toFixed(2)}</strong></div>
                <div style="font-size: 18px; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0; padding-top: 8px;">Total: &#8377;${tot.toFixed(2)}</div>
              </div>`;
    }
    return `<div style="text-align: right; padding: 16px; background: #f8f9fa; border-radius: 8px; margin-top: 16px;">
              <span style="font-size: 18px; font-weight: 700; color: #0f172a;">Total: &#8377;${tot.toFixed(2)}</span>
            </div>`;
  })()}

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
  const _disc = Number(order.discount || 0);
  const _coupon = order.coupon_code || "";
  const discountLine = _disc > 0 ? `
Subtotal: Rs.${Number(order.subtotal || order.total).toFixed(2)}
Coupon${_coupon ? ` (${_coupon})` : ""}: -Rs.${_disc.toFixed(2)}` : "";
  const text = `Order Confirmation

Thank you for your order!
Order Number: ${order.order_number || order.orderNumber}${discountLine}
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
              ${Number(order.discount || 0) > 0 ? `<div style="font-size: 12px; color: #16a34a; margin-top: 4px;">Coupon${order.coupon_code ? ` (${order.coupon_code})` : ""}: -&#8377;${Number(order.discount).toFixed(2)} off</div>` : ""}
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
async function handleSites(request, env, path) {
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
            `SELECT plan, status, billing_cycle, current_period_start, current_period_end FROM subscriptions WHERE site_id = ? AND status != 'enterprise_override' ORDER BY created_at DESC LIMIT 1`
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
              periodEnd: sub.current_period_end
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
    const { brandName, categories, templateId, logoUrl, phone, email, address, primaryColor, secondaryColor } = body;
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
        const siteTables = [
          "site_config",
          "activity_log",
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
          "product_variants",
          "products",
          "categories",
          "site_media",
          "site_usage",
          "addresses"
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
          if (target.endsWith(".fluxe.in") || target.endsWith(".pages.dev")) {
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
        errors.push(`CNAME record not found. Add a CNAME record for ${domain} pointing to your .fluxe.in subdomain.`);
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

// workers/storefront/products-worker.js
init_checked_fetch();
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
init_helpers();
init_auth();
init_site_admin_worker();
init_usage_tracker();
init_site_db();
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
      return getProduct(env, productId, siteId, subdomain);
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
      return createProduct(request, env, user);
    case "PUT":
      if (adminPerms && !hasPermission(adminPerms, "products"))
        return errorResponse("You do not have permission to manage products", 403);
      return updateProduct(request, env, user, productId);
    case "DELETE":
      if (adminPerms && !hasPermission(adminPerms, "products"))
        return errorResponse("You do not have permission to manage products", 403);
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
    let query = "SELECT p.*, c.name as category_name, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1";
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
      tags: product.tags ? JSON.parse(product.tags) : []
    }));
    return successResponse(parsedProducts);
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
    let product = null;
    let productQuery = `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`;
    const productBindings = [productId];
    if (siteId) {
      productQuery += " AND p.site_id = ?";
      productBindings.push(siteId);
    }
    product = await db.prepare(productQuery).bind(...productBindings).first();
    if (!product) {
      let slugQuery = `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id
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
    const { siteId, name, description, shortDescription, price, comparePrice, costPrice, sku, stock, categoryId, images, thumbnailUrl, mainImageIndex, tags, isFeatured, weight, dimensions } = data;
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
    let resolvedThumbnail = thumbnailUrl || null;
    if (!resolvedThumbnail && Array.isArray(images) && images.length > 0) {
      const idx = typeof mainImageIndex === "number" ? mainImageIndex : 0;
      resolvedThumbnail = images[idx] || images[0] || null;
    }
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").substring(0, 100);
    const productId = generateId();
    const rowData = { id: productId, site_id: siteId, category_id: categoryId, name, slug, description, short_description: shortDescription, price, compare_price: comparePrice, cost_price: costPrice, sku, stock, images, thumbnail_url: resolvedThumbnail, tags, is_featured: isFeatured, weight, dimensions };
    const rowBytes = estimateRowBytes(rowData);
    const usageCheck = await checkUsageLimit(env, siteId, "d1", rowBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, "STORAGE_LIMIT");
    }
    await db.prepare(
      `INSERT INTO products (id, site_id, category_id, name, slug, description, short_description, price, compare_price, cost_price, sku, stock, low_stock_threshold, weight, dimensions, images, thumbnail_url, tags, is_featured, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
      resolvedThumbnail,
      tags ? JSON.stringify(tags) : "[]",
      isFeatured ? 1 : 0,
      rowBytes
    ).run();
    await trackD1Write(env, siteId, rowBytes);
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
    const updates = await request.json();
    const allowedFields = ["name", "description", "short_description", "price", "compare_price", "cost_price", "sku", "stock", "low_stock_threshold", "category_id", "images", "thumbnail_url", "tags", "is_featured", "is_active", "weight", "dimensions"];
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
    const oldBytes = product.row_size_bytes || 0;
    setClause.push('updated_at = datetime("now")');
    values.push(productId);
    await db.prepare(
      `UPDATE products SET ${setClause.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    const updatedProdRow = await db.prepare("SELECT * FROM products WHERE id = ?").bind(productId).first();
    const newBytes = updatedProdRow ? estimateRowBytes(updatedProdRow) : oldBytes;
    if (updatedProdRow) {
      await db.prepare("UPDATE products SET row_size_bytes = ? WHERE id = ?").bind(newBytes, productId).run();
    }
    await trackD1Update(env, resolvedSiteId, oldBytes, newBytes);
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
    const bytesToRemove = product.row_size_bytes || 0;
    await db.prepare("DELETE FROM products WHERE id = ?").bind(productId).run();
    if (bytesToRemove > 0) {
      await trackD1Delete(env, resolvedSiteId, bytesToRemove);
    }
    return successResponse(null, "Product deleted successfully");
  } catch (error) {
    console.error("Delete product error:", error);
    return errorResponse("Failed to delete product", 500);
  }
}
__name(deleteProduct, "deleteProduct");
async function updateProductStock(env, productId, quantity, operation = "decrement", siteId = null) {
  try {
    if (siteId && await checkMigrationLock(env, siteId)) {
      console.error("Stock update blocked: site migration in progress");
      return false;
    }
    const db = await resolveSiteDBById(env, siteId);
    const oldRow = await db.prepare("SELECT row_size_bytes FROM products WHERE id = ?").bind(productId).first();
    const oldBytes = oldRow?.row_size_bytes || 0;
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
init_usage_tracker();
init_site_db();
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
    return trackOrder(env, orderId, request);
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
      return createOrder(request, env, user);
    case "PUT":
      return updateOrderStatus(request, env, user, orderId);
    default:
      return errorResponse("Method not allowed", 405);
  }
}
__name(handleOrders, "handleOrders");
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
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, siteId);
    let subtotal = 0;
    const processedItems = [];
    for (const item of items) {
      const itemProductId = item.productId || item.product_id;
      if (!itemProductId) {
        return errorResponse("Invalid item: missing product ID", 400);
      }
      const product = await db.prepare(
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
    const shippingCost = 0;
    const tax = 0;
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
    await db.prepare(
      `INSERT INTO orders (id, site_id, user_id, order_number, items, subtotal, discount, shipping_cost, tax, total, payment_method, status, shipping_address, billing_address, customer_name, customer_email, customer_phone, coupon_code, notes, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
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
      appliedCouponCode || null,
      notes || null,
      rowBytes
    ).run();
    await trackD1Write(env, siteId, rowBytes);
    if (!isPendingPayment) {
      for (const item of processedItems) {
        await updateProductStock(env, item.productId, item.quantity, "decrement", siteId);
      }
      try {
        await sendOrderEmails(env, siteId, {
          orderNumber,
          processedItems,
          subtotal,
          discount,
          coupon_code: appliedCouponCode,
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
          const found = await sdb.prepare("SELECT id, site_id, row_size_bytes FROM orders WHERE id = ? AND site_id = ?").bind(orderId, adminSiteId).first();
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
        const found = await sdb.prepare(
          "SELECT id, site_id, row_size_bytes FROM orders WHERE id = ? AND site_id = ?"
        ).bind(orderId, s.id).first();
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
      if (status === "shipped") {
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
        const fullOrder = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
        if (fullOrder) {
          const deliveryConfig = await getSiteConfig(env, fullOrder.site_id);
          const siteBrandName = deliveryConfig.brand_name || "Store";
          let deliverySettings = {};
          try {
            if (deliveryConfig.settings)
              deliverySettings = typeof deliveryConfig.settings === "string" ? JSON.parse(deliveryConfig.settings) : deliveryConfig.settings;
          } catch (e) {
          }
          const ownerEmail = deliverySettings.email || deliverySettings.ownerEmail || deliveryConfig.email;
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
              emailJobs.push(sendEmail(env, fullOrder.customer_email, `Your order #${fullOrder.order_number} has been delivered!`, html, text).catch((e) => console.error("Delivery customer email send error:", e)));
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
    return getGuestOrder(env, orderId, request);
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
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const db = await resolveSiteDBById(env, siteId);
    let subtotal = 0;
    const processedItems = [];
    for (const item of items) {
      const itemProductId = item.productId || item.product_id;
      if (!itemProductId) {
        return errorResponse("Invalid item: missing product ID", 400);
      }
      const product = await db.prepare(
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
    const rowData = { id: orderId, site_id: siteId, order_number: orderNumber, items: processedItems, subtotal, total, shipping_address: shippingAddress, customer_name: customerName, customer_email: customerEmail, customer_phone: customerPhone };
    const rowBytes = estimateRowBytes(rowData);
    const usageCheck = await checkUsageLimit(env, siteId, "d1", rowBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, "STORAGE_LIMIT");
    }
    const isPendingPayment = paymentMethod === "razorpay";
    const orderStatus = isPendingPayment ? "pending_payment" : "pending";
    await db.prepare(
      `INSERT INTO guest_orders (id, site_id, order_number, items, subtotal, total, payment_method, status, shipping_address, customer_name, customer_email, customer_phone, row_size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      orderId,
      siteId,
      orderNumber,
      JSON.stringify(processedItems),
      subtotal,
      total,
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
        await updateProductStock(env, item.productId, item.quantity, "decrement", siteId);
      }
      try {
        await sendOrderEmails(env, siteId, {
          orderNumber,
          processedItems,
          subtotal,
          discount: 0,
          coupon_code: null,
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
    let query = "SELECT id, order_number, status, tracking_number, carrier, shipped_at, delivered_at, created_at FROM orders WHERE (id = ? OR order_number = ?)";
    const bindings = [orderId, orderId];
    if (siteId) {
      query += " AND site_id = ?";
      bindings.push(siteId);
    }
    order = await db.prepare(query).bind(...bindings).first();
    if (!order) {
      let guestQuery = "SELECT id, order_number, status, tracking_number, carrier, created_at FROM guest_orders WHERE (id = ? OR order_number = ?)";
      const guestBindings = [orderId, orderId];
      if (siteId) {
        guestQuery += " AND site_id = ?";
        guestBindings.push(siteId);
      }
      order = await db.prepare(guestQuery).bind(...guestBindings).first();
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
    const emailOrder = {
      order_number: orderData.orderNumber,
      items: orderData.processedItems,
      subtotal: orderData.subtotal,
      discount: orderData.discount || 0,
      coupon_code: orderData.coupon_code || null,
      total: orderData.total,
      payment_method: orderData.paymentMethod,
      customer_name: orderData.customerName,
      customer_email: orderData.customerEmail,
      customer_phone: orderData.customerPhone,
      shipping_address: orderData.shippingAddress
    };
    const emailJobs = [];
    if (orderData.customerEmail) {
      try {
        const { html, text } = buildOrderConfirmationEmail(emailOrder, siteBrandName, ownerEmail);
        emailJobs.push(
          sendEmail(env, orderData.customerEmail, `Order Confirmed #${orderData.orderNumber} - ${siteBrandName}`, html, text).catch((e) => console.error("Customer email send error:", e))
        );
      } catch (buildErr) {
        console.error("Customer email build error:", buildErr);
      }
    }
    if (ownerEmail) {
      try {
        const { html, text } = buildOwnerNotificationEmail(emailOrder, siteBrandName);
        emailJobs.push(
          sendEmail(env, ownerEmail, `New Order #${orderData.orderNumber} - ${siteBrandName}`, html, text).catch((e) => console.error("Owner email send error:", e))
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
    const cart = await getOrCreateCart(db, env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const enrichedItems = [];
    for (const item of items) {
      const product = await db.prepare(
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
    if (await checkMigrationLock(env, siteId)) {
      return errorResponse("Site is currently being migrated. Please try again shortly.", 423);
    }
    const { productId, quantity, variant } = await request.json();
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
    const { productId, quantity, variant } = await request.json();
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    const db = await resolveSiteDBById(env, siteId);
    const cart = await getOrCreateCart(db, env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const oldBytes = cart.row_size_bytes || 0;
    const existingIndex = items.findIndex(
      (item) => item.productId === productId && JSON.stringify(item.variant) === JSON.stringify(variant)
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
    if (!productId) {
      return errorResponse("Product ID is required");
    }
    const db = await resolveSiteDBById(env, siteId);
    const cart = await getOrCreateCart(db, env, siteId, user, sessionId);
    const items = JSON.parse(cart.items);
    const oldBytes = cart.row_size_bytes || 0;
    const parsedVariant = variant ? variant : null;
    const filteredItems = items.filter(
      (item) => !(item.productId === productId && JSON.stringify(item.variant ?? null) === JSON.stringify(parsedVariant))
    );
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
          (item) => item.productId === guestItem.productId && JSON.stringify(item.variant) === JSON.stringify(guestItem.variant)
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
        await processPostPaymentActions(env, order);
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
            await processPostPaymentActions(env, guestOrder);
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
async function processPostPaymentActions(env, order) {
  try {
    const orderItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    for (const item of orderItems) {
      await updateProductStock(env, item.productId, item.quantity, "decrement", order.site_id);
    }
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
          `UPDATE sites SET subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(newEnd.toISOString(), existingSub.site_id).run();
      } else {
        await env.DB.prepare(
          `UPDATE sites SET subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`
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
          `UPDATE sites SET subscription_plan = 'expired', subscription_expires_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        ).bind(sub.site_id).run();
      } else {
        await env.DB.prepare(
          `UPDATE sites SET subscription_plan = 'expired', subscription_expires_at = datetime('now'), updated_at = datetime('now') WHERE user_id = ?`
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
          `UPDATE sites SET subscription_plan = 'paused', subscription_expires_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        ).bind(sub.site_id).run();
      } else {
        await env.DB.prepare(
          `UPDATE sites SET subscription_plan = 'paused', subscription_expires_at = datetime('now'), updated_at = datetime('now') WHERE user_id = ?`
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
        `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(planName, periodEnd.toISOString(), siteId).run();
    } else {
      await env.DB.prepare(
        `UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`
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
init_auth();
init_site_admin_worker();
init_usage_tracker();
init_site_db();
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
      return createCategory(request, env, user);
    case "PUT":
      if (adminPerms && !hasPermission(adminPerms, "website"))
        return errorResponse("You do not have permission to manage categories", 403);
      return updateCategory(request, env, user, categoryId);
    case "DELETE":
      if (adminPerms && !hasPermission(adminPerms, "website"))
        return errorResponse("You do not have permission to manage categories", 403);
      return deleteCategory(env, user, categoryId);
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
    await db.prepare("DELETE FROM categories WHERE id = ?").bind(categoryId).run();
    if (bytesToRemove > 0) {
      await trackD1Delete(env, resolvedSiteId, bytesToRemove);
    }
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
    const activeSubscription = await env.DB.prepare(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`
    ).bind(userId).first();
    if (activeSubscription) {
      if (activeSubscription.current_period_end && new Date(activeSubscription.current_period_end) < /* @__PURE__ */ new Date()) {
        await env.DB.prepare(
          `UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE id = ?`
        ).bind(activeSubscription.id).run();
        if (activeSubscription.plan === "trial") {
          await env.DB.prepare(
            `UPDATE sites SET subscription_plan = 'expired', updated_at = datetime('now') WHERE user_id = ? AND subscription_plan = 'trial'`
          ).bind(userId).run();
        }
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
      `UPDATE sites SET subscription_plan = 'trial', subscription_expires_at = ?, updated_at = datetime('now') WHERE user_id = ?`
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
    lines.push(`  <meta property="og:image:width" content="1200">`);
    lines.push(`  <meta property="og:image:height" content="630">`);
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
function buildProductSchema(product, site, baseUrl) {
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
  const currency = site.currency || "INR";
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
  if (images.length > 0)
    schema.image = images;
  if (product.sku)
    schema.sku = product.sku;
  if (product.barcode)
    schema.gtin = product.barcode;
  if (product.compare_price && product.compare_price > product.price) {
    schema.offers.priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
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
var seo_config_default = {
  titleFormat: "{pageTitle} | {brandName}",
  fallbackTitle(site) {
    return `${site.brand_name} | Fluxe Store`;
  },
  fallbackDescription(site) {
    return `Shop at ${site.brand_name}. Browse our collection of products with fast delivery.`;
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
      `SELECT id, name, slug, description, short_description, price, stock,
              images, thumbnail_url, seo_title, seo_description, seo_og_image
       FROM products WHERE site_id = ? AND slug = ? AND is_active = 1`
    ).bind(site.id, slug).first();
  } catch {
    return null;
  }
}
__name(fetchProductSEO, "fetchProductSEO");
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
function buildTags({ pageInfo, site, siteSEO, pageData, templateConfig, baseUrl, canonicalUrl }) {
  const { type } = pageInfo;
  const structuredData = [];
  let title, description, ogImage, ogType, breadcrumbs;
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
      structuredData.push(buildProductSchema(pageData, site, baseUrl));
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
  function absUrl2(url) {
    if (!url)
      return url;
    if (url.startsWith("http"))
      return url;
    return baseUrl + (url.startsWith("/") ? url : "/" + url);
  }
  __name(absUrl2, "absUrl");
  const finalOgImage = absUrl2(ogImage || site.og_image);
  const finalTwImage = absUrl2(ogImage || site.twitter_image || site.og_image);
  return {
    title,
    description,
    ogTitle: site.og_title || title,
    ogDescription: site.og_description || description,
    ogImage: finalOgImage,
    ogType: site.og_type || ogType || "website",
    ogLocale: "en_US",
    siteName: site.brand_name,
    canonicalUrl,
    robots: siteSEO.seo_robots || "index, follow",
    favicon: site.favicon_url || null,
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
    if (pageInfo.type === "product") {
      pageData = await fetchProductSEO(db, site, pageInfo.slug);
    } else if (pageInfo.type === "category") {
      pageData = await fetchCategorySEO(db, site, pageInfo.slug);
    } else {
      pageData = await fetchPageSEO(db, site, pageInfo.type);
    }
    const siteWithCurrency = { ...site, currency: siteSEO.currency || site.currency || "INR" };
    const tags = buildTags({ pageInfo, site: siteWithCurrency, siteSEO, pageData, templateConfig, baseUrl, canonicalUrl });
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
  if (!siteRow && !hostname.endsWith("fluxe.in") && !hostname.endsWith("pages.dev") && !hostname.includes("localhost") && !hostname.includes("workers.dev")) {
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
    const domain = env.DOMAIN || "fluxe.in";
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
    const domain = env.DOMAIN || "fluxe.in";
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
      user_id TEXT,
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      title TEXT,
      content TEXT,
      images TEXT,
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
    "CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id)"
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
    "ALTER TABLE site_usage ADD COLUMN baseline_updated_at TEXT"
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
      shards.push({
        ...shard,
        sizeBytes,
        sizeMB,
        siteCount: siteCount?.count || 0,
        sizeAlertGB: (sizeBytes / (1024 * 1024 * 1024)).toFixed(3),
        isNearLimit: sizeBytes > 8 * 1024 * 1024 * 1024
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
    if (setActive !== false) {
      await env.DB.prepare("UPDATE shards SET is_active = 0").run();
    }
    await env.DB.prepare(
      `INSERT INTO shards (id, binding_name, database_id, database_name, is_active, correction_factor, created_at)
       VALUES (?, ?, ?, ?, ?, 1.0, datetime('now'))`
    ).bind(shardId, bindingName, databaseId, name, setActive !== false ? 1 : 0).run();
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
      isActive: setActive !== false,
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
var MIGRATION_TABLES = [
  "site_config",
  "categories",
  "products",
  "product_variants",
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
  "site_usage",
  "activity_log",
  "addresses"
];
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
    const migrationStats = {};
    let migrationError = null;
    try {
      for (const table of MIGRATION_TABLES) {
        let copied = 0;
        let offset = 0;
        const batchSize = 1e3;
        while (true) {
          let rows;
          try {
            const result = await sourceDB.prepare(
              `SELECT * FROM ${table} WHERE site_id = ? LIMIT ? OFFSET ?`
            ).bind(siteId, batchSize, offset).all();
            rows = result.results || [];
          } catch (e) {
            break;
          }
          if (rows.length === 0)
            break;
          for (const row of rows) {
            const columns = Object.keys(row);
            const placeholders = columns.map(() => "?").join(", ");
            const values = columns.map((c) => row[c]);
            try {
              await targetDB.prepare(
                `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
              ).bind(...values).run();
              copied++;
            } catch (insertErr) {
              console.error(`Migration insert error for ${table}:`, insertErr.message);
            }
          }
          offset += batchSize;
          if (rows.length < batchSize)
            break;
        }
        migrationStats[table] = copied;
      }
      for (const table of MIGRATION_TABLES) {
        let sourceCount = 0;
        let targetCount = 0;
        try {
          const sc = await sourceDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE site_id = ?`).bind(siteId).first();
          sourceCount = sc?.c || 0;
        } catch (e) {
        }
        try {
          const tc = await targetDB.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE site_id = ?`).bind(siteId).first();
          targetCount = tc?.c || 0;
        } catch (e) {
        }
        if (sourceCount > 0 && targetCount < sourceCount) {
          throw new Error(`Verification failed for ${table}: source=${sourceCount}, target=${targetCount}`);
        }
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
      for (const table of MIGRATION_TABLES) {
        try {
          await sourceDB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId).run();
        } catch (e) {
        }
      }
    } catch (err) {
      migrationError = err.message || "Unknown migration error";
      console.error("Migration failed, rolling back:", migrationError);
      for (const table of MIGRATION_TABLES) {
        try {
          await targetDB.prepare(`DELETE FROM ${table} WHERE site_id = ?`).bind(siteId).run();
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
      tables: migrationStats
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
    await env.DB.prepare(`
      INSERT INTO enterprise_sites (site_id, assigned_at, assigned_by, notes)
      VALUES (?, datetime('now'), ?, ?)
      ON CONFLICT(site_id) DO UPDATE SET assigned_by = ?, notes = ?, assigned_at = datetime('now')
    `).bind(siteId, user.email, notes || null, user.email, notes || null).run();
    await env.DB.prepare(
      `UPDATE sites SET subscription_plan = 'enterprise', subscription_expires_at = '2099-12-31T23:59:59', is_active = 1, updated_at = datetime('now') WHERE id = ?`
    ).bind(siteId).run();
    try {
      await env.DB.prepare(
        `UPDATE subscriptions SET status = 'enterprise_override', updated_at = datetime('now') WHERE site_id = ? AND status = 'active'`
      ).bind(siteId).run();
    } catch (e) {
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
    let restoredPlan = "free";
    try {
      const oldSub = await env.DB.prepare(
        `SELECT id, plan, current_period_end FROM subscriptions WHERE site_id = ? AND status = 'enterprise_override' ORDER BY created_at DESC LIMIT 1`
      ).bind(siteId).first();
      if (oldSub && oldSub.current_period_end && new Date(oldSub.current_period_end) > /* @__PURE__ */ new Date()) {
        await env.DB.prepare(`UPDATE subscriptions SET status = 'active', updated_at = datetime('now') WHERE id = ?`).bind(oldSub.id).run();
        await env.DB.prepare(`UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE site_id = ? AND status = 'enterprise_override' AND id != ?`).bind(siteId, oldSub.id).run();
        await env.DB.prepare(`UPDATE sites SET subscription_plan = ?, subscription_expires_at = ?, updated_at = datetime('now') WHERE id = ?`).bind(oldSub.plan, oldSub.current_period_end, siteId).run();
        restoredPlan = oldSub.plan;
      } else {
        await env.DB.prepare(`UPDATE subscriptions SET status = 'expired', updated_at = datetime('now') WHERE site_id = ? AND status = 'enterprise_override'`).bind(siteId).run();
        await env.DB.prepare(`UPDATE sites SET subscription_plan = 'free', subscription_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`).bind(siteId).run();
      }
    } catch (e) {
      await env.DB.prepare(`UPDATE sites SET subscription_plan = 'free', subscription_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`).bind(siteId).run();
    }
    return successResponse({ siteId, restoredPlan }, "Enterprise status removed");
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
    const { label, firstName, lastName, phone, houseNumber, roadName, city, state, pinCode, isDefault } = body;
    if (!firstName || !houseNumber || !city || !state || !pinCode) {
      return errorResponse("First name, house number, city, state, and PIN code are required");
    }
    const id = generateId();
    const db = await resolveSiteDBById(env, customer.site_id);
    if (isDefault) {
      await db.prepare(
        "UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? AND site_id = ?"
      ).bind(customer.id, customer.site_id).run();
    }
    const rowData = { id, site_id: customer.site_id, customer_id: customer.id, label, firstName, lastName, phone, houseNumber, roadName, city, state, pinCode };
    const rowBytes = estimateRowBytes(rowData);
    await db.prepare(
      `INSERT INTO customer_addresses (id, site_id, customer_id, label, first_name, last_name, phone, house_number, road_name, city, state, pin_code, is_default, row_size_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
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
    const { label, firstName, lastName, phone, houseNumber, roadName, city, state, pinCode, isDefault } = body;
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
        state = COALESCE(?, state),
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
  const domain = env.DOMAIN || "fluxe.in";
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

// workers/index.js
init_usage_tracker();
init_helpers();

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
      )`,
      `CREATE TABLE IF NOT EXISTS site_staff (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        permissions TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        UNIQUE(site_id, email)
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
      "CREATE INDEX IF NOT EXISTS idx_site_media_key ON site_media(storage_key)",
      "CREATE INDEX IF NOT EXISTS idx_site_staff_site ON site_staff(site_id)",
      "CREATE INDEX IF NOT EXISTS idx_site_staff_email ON site_staff(site_id, email)"
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
      { col: "permissions", table: "site_admin_sessions", sql: "ALTER TABLE site_admin_sessions ADD COLUMN permissions TEXT" },
      { col: "failed_login_attempts", table: "site_staff", sql: "ALTER TABLE site_staff ADD COLUMN failed_login_attempts INTEGER DEFAULT 0" },
      { col: "locked_until", table: "site_staff", sql: "ALTER TABLE site_staff ADD COLUMN locked_until TEXT" }
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
      if (path.startsWith("/auth/google/")) {
        return handleGoogleAuthFlow(request, env, path);
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
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(cleanupExpiredData(env));
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
    } else if (!hostname.endsWith("fluxe.in") && !hostname.endsWith("pages.dev") && !hostname.includes("localhost") && !hostname.includes("workers.dev")) {
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
      categoriesResult = categories.results || [];
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
    return jsonResponse({
      success: true,
      data: {
        ...site,
        socialLinks,
        settings: publicSettings,
        categories: categoriesResult,
        pageSEO,
        googleClientId
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
    const domain = env.DOMAIN || "fluxe.in";
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

// .wrangler/tmp/bundle-bbt0xo/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-bbt0xo/middleware-loader.entry.ts
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
