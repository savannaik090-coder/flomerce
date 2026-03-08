import { generateId, generateToken, getExpiryDate, validateEmail, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { hashPassword, verifyPassword } from '../../utils/auth.js';

export async function handleCustomerAuth(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const action = path.split('/').pop();

  switch (action) {
    case 'signup':
      return handleSignup(request, env);
    case 'login':
      return handleLogin(request, env);
    case 'logout':
      return handleLogout(request, env);
    case 'me':
      return handleGetProfile(request, env);
    case 'update-profile':
      return handleUpdateProfile(request, env);
    default:
      return errorResponse('Not found', 404);
  }
}

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
      'CREATE INDEX IF NOT EXISTS idx_site_customers_site ON site_customers(site_id)'
    ).run();
    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_site_customers_email ON site_customers(site_id, email)'
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
      'CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON site_customer_sessions(token)'
    ).run();
    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON site_customer_sessions(customer_id)'
    ).run();
  } catch (error) {
    console.error('Error ensuring customer tables:', error);
  }
}

async function handleSignup(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    await ensureCustomerTables(env);
    const { siteId, name, email, password, phone } = await request.json();

    if (!siteId || !name || !email || !password) {
      return errorResponse('Site ID, name, email and password are required');
    }

    if (!validateEmail(email)) {
      return errorResponse('Invalid email format');
    }

    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters');
    }

    const site = await env.DB.prepare(
      'SELECT id, brand_name FROM sites WHERE id = ? AND is_active = 1'
    ).bind(siteId).first();

    if (!site) {
      return errorResponse('Store not found', 404);
    }

    const existing = await env.DB.prepare(
      'SELECT id FROM site_customers WHERE site_id = ? AND email = ?'
    ).bind(siteId, email.toLowerCase()).first();

    if (existing) {
      return errorResponse('An account with this email already exists for this store', 400, 'EMAIL_EXISTS');
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
        name: sanitizeInput(name),
      },
      token,
    }, 'Account created successfully');
  } catch (error) {
    console.error('Customer signup error:', error);
    return errorResponse('Failed to create account', 500);
  }
}

async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    await ensureCustomerTables(env);
    const { siteId, email, password } = await request.json();

    if (!siteId || !email || !password) {
      return errorResponse('Site ID, email and password are required');
    }

    const customer = await env.DB.prepare(
      'SELECT id, email, password_hash, name, phone FROM site_customers WHERE site_id = ? AND email = ?'
    ).bind(siteId, email.toLowerCase()).first();

    if (!customer) {
      return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await verifyPassword(password, customer.password_hash);
    if (!isValid) {
      return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
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
        phone: customer.phone,
      },
      token,
    }, 'Login successful');
  } catch (error) {
    console.error('Customer login error:', error);
    return errorResponse('Login failed', 500);
  }
}

async function handleLogout(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const customer = await validateCustomerAuth(request, env);
    if (customer) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('SiteCustomer ')) {
        const token = authHeader.substring(13);
        await env.DB.prepare(
          'DELETE FROM site_customer_sessions WHERE token = ?'
        ).bind(token).run();
      }
    }
    return successResponse(null, 'Logged out successfully');
  } catch (error) {
    return errorResponse('Logout failed', 500);
  }
}

async function handleGetProfile(request, env) {
  try {
    const customer = await validateCustomerAuth(request, env);
    if (!customer) {
      return errorResponse('Unauthorized', 401);
    }

    return successResponse({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
    });
  } catch (error) {
    return errorResponse('Failed to get profile', 500);
  }
}

async function handleUpdateProfile(request, env) {
  if (request.method !== 'PUT' && request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const customer = await validateCustomerAuth(request, env);
    if (!customer) {
      return errorResponse('Unauthorized', 401);
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
      'SELECT id, email, name, phone FROM site_customers WHERE id = ?'
    ).bind(customer.id).first();

    return successResponse(updated, 'Profile updated successfully');
  } catch (error) {
    return errorResponse('Failed to update profile', 500);
  }
}

export async function validateCustomerAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('SiteCustomer ')) {
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
      'SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ?'
    ).bind(session.customer_id).first();

    return customer;
  } catch (error) {
    console.error('Customer auth validation error:', error);
    return null;
  }
}
