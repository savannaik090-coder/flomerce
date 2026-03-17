import { generateId, generateToken, getExpiryDate, isExpired, errorResponse } from './helpers.js';
import { resolveSiteDBById } from './site-db.js';

const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt, byte => byte.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
  
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password, storedHash) {
  const [saltHex, hashHex] = storedHash.split(':');
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(derivedBits);
  const computedHashHex = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
  
  return computedHashHex === hashHex;
}

export async function generateJWT(payload, secret, expiresInHours = 24) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + (expiresInHours * 60 * 60),
  };
  
  const base64Header = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const base64Payload = btoa(JSON.stringify(tokenPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${base64Header}.${base64Payload}`)
  );
  
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${base64Header}.${base64Payload}.${base64Signature}`;
}

export async function verifyJWT(token, secret) {
  try {
    const [base64Header, base64Payload, base64Signature] = token.split('.');
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const signatureBytes = Uint8Array.from(
      atob(base64Signature.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(`${base64Header}.${base64Payload}`)
    );
    
    if (!isValid) {
      return null;
    }
    
    const payload = JSON.parse(atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/')));
    
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (e) {
    return null;
  }
}

export async function validateAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  const cookie = request.headers.get('Cookie');
  
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (cookie) {
    const cookies = cookie.split(';').reduce((acc, c) => {
      const [key, value] = c.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    token = cookies['auth_token'];
  }
  
  if (!token) {
    return null;
  }
  
  const payload = await verifyJWT(token, env.JWT_SECRET || 'your-secret-key');
  
  if (!payload) {
    return null;
  }
  
  const user = await env.DB.prepare(
    'SELECT id, email, name, email_verified FROM users WHERE id = ?'
  ).bind(payload.userId).first();
  
  return user;
}

export async function requireAuth(request, env) {
  const user = await validateAuth(request, env);
  
  if (!user) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  return user;
}

export async function validateAnyAuth(request, env) {
  const authHeader = request.headers.get('Authorization');

  if (authHeader && authHeader.startsWith('SiteCustomer ')) {
    const token = authHeader.substring(13);
    try {
      const url = new URL(request.url);
      const siteId = url.searchParams.get('siteId');

      if (siteId) {
        const db = await resolveSiteDBById(env, siteId);
        const session = await db.prepare(
          `SELECT cs.customer_id, cs.site_id FROM site_customer_sessions cs
           WHERE cs.token = ? AND cs.site_id = ? AND cs.expires_at > datetime('now')`
        ).bind(token, siteId).first();

        if (session) {
          const customer = await db.prepare(
            'SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ? AND site_id = ?'
          ).bind(session.customer_id, siteId).first();

          if (customer) {
            return { id: customer.id, email: customer.email, name: customer.name, type: 'customer', siteId: customer.site_id };
          }
        }
      } else {
        const allSites = await env.DB.prepare('SELECT id FROM sites').all();
        const siteIds = (allSites.results || []).map(s => s.id);
        const checkedShards = new Set();

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
                  'SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ? AND site_id = ?'
                ).bind(session.customer_id, sid).first();

                if (customer) {
                  return { id: customer.id, email: customer.email, name: customer.name, type: 'customer', siteId: customer.site_id };
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
                  'SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ? AND site_id = ?'
                ).bind(session.customer_id, session.site_id).first();

                if (customer) {
                  return { id: customer.id, email: customer.email, name: customer.name, type: 'customer', siteId: customer.site_id };
                }
              }
            }
          } catch (err) {
            console.error(`Customer auth check failed for site ${sid}:`, err);
          }
        }
      }
    } catch (error) {
      console.error('Customer auth validation error:', error);
    }
    return null;
  }

  const user = await validateAuth(request, env);
  if (user) {
    return { ...user, type: 'owner' };
  }

  return null;
}

let _customerTablesEnsured = false;
async function ensureCustomerTablesExist(env) {
  if (_customerTablesEnsured) return;
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
    console.error('Error ensuring customer tables:', error);
  }
}
