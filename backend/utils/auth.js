import { generateId, generateToken, getExpiryDate, isExpired, errorResponse } from './helpers.js';

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
      const session = await env.DB.prepare(
        `SELECT cs.customer_id, cs.site_id FROM site_customer_sessions cs
         WHERE cs.token = ? AND cs.expires_at > datetime('now')`
      ).bind(token).first();

      if (session) {
        const customer = await env.DB.prepare(
          'SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ?'
        ).bind(session.customer_id).first();

        if (customer) {
          return { id: customer.id, email: customer.email, name: customer.name, type: 'customer', siteId: customer.site_id };
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
