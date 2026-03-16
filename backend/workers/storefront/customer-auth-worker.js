import { generateId, generateToken, getExpiryDate, validateEmail, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { hashPassword, verifyPassword } from '../../utils/auth.js';

export async function handleCustomerAuth(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const segments = path.split('/').filter(Boolean);
  const action = segments[2] || '';

  if (action === 'addresses') {
    const addressId = segments[3] || null;
    return handleAddresses(request, env, addressId);
  }

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
      'CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id)'
    ).run();
    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_customer_addresses_site ON customer_addresses(site_id)'
    ).run();
  } catch (error) {
    console.error('Error ensuring customer tables:', error);
  }
}

async function handleAddresses(request, env, addressId) {
  const customer = await validateCustomerAuth(request, env);
  if (!customer) {
    return errorResponse('Unauthorized', 401);
  }

  const method = request.method;

  if (method === 'GET') {
    return getAddresses(env, customer);
  } else if (method === 'POST') {
    return createAddress(request, env, customer);
  } else if (method === 'PUT' && addressId) {
    return updateAddress(request, env, customer, addressId);
  } else if (method === 'DELETE' && addressId) {
    return deleteAddress(env, customer, addressId);
  }

  return errorResponse('Method not allowed', 405);
}

async function getAddresses(env, customer) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM customer_addresses WHERE customer_id = ? AND site_id = ? ORDER BY is_default DESC, created_at DESC'
    ).bind(customer.id, customer.site_id).all();

    return successResponse(results || []);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return errorResponse('Failed to fetch addresses', 500);
  }
}

async function createAddress(request, env, customer) {
  try {
    const body = await request.json();
    const { label, firstName, lastName, phone, houseNumber, roadName, city, state, pinCode, isDefault } = body;

    if (!firstName || !houseNumber || !city || !state || !pinCode) {
      return errorResponse('First name, house number, city, state, and PIN code are required');
    }

    const id = generateId();

    if (isDefault) {
      await env.DB.prepare(
        'UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? AND site_id = ?'
      ).bind(customer.id, customer.site_id).run();
    }

    await env.DB.prepare(
      `INSERT INTO customer_addresses (id, site_id, customer_id, label, first_name, last_name, phone, house_number, road_name, city, state, pin_code, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id, customer.site_id, customer.id,
      sanitizeInput(label || 'Home'),
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

    try {
      const { trackD1Usage, estimateRowBytes } = await import('../../utils/usage-tracker.js');
      trackD1Usage(env, customer.site_id, estimateRowBytes({ id, site_id: customer.site_id, customer_id: customer.id, label, firstName, lastName, phone, houseNumber, roadName, city, state, pinCode })).catch(() => {});
    } catch (_) {}

    const address = await env.DB.prepare(
      'SELECT * FROM customer_addresses WHERE id = ?'
    ).bind(id).first();

    return successResponse(address, 'Address saved successfully');
  } catch (error) {
    console.error('Error creating address:', error);
    return errorResponse('Failed to save address', 500);
  }
}

async function updateAddress(request, env, customer, addressId) {
  try {
    const existing = await env.DB.prepare(
      'SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ? AND site_id = ?'
    ).bind(addressId, customer.id, customer.site_id).first();

    if (!existing) {
      return errorResponse('Address not found', 404);
    }

    const body = await request.json();
    const { label, firstName, lastName, phone, houseNumber, roadName, city, state, pinCode, isDefault } = body;

    if (isDefault) {
      await env.DB.prepare(
        'UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? AND site_id = ?'
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
      lastName !== undefined ? (lastName ? sanitizeInput(lastName) : null) : null,
      phone !== undefined ? (phone || null) : null,
      houseNumber ? sanitizeInput(houseNumber) : null,
      roadName !== undefined ? (roadName ? sanitizeInput(roadName) : null) : null,
      city ? sanitizeInput(city) : null,
      state ? sanitizeInput(state) : null,
      pinCode ? sanitizeInput(pinCode) : null,
      isDefault ? 1 : 0,
      addressId,
      customer.id,
      customer.site_id
    ).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM customer_addresses WHERE id = ?'
    ).bind(addressId).first();

    return successResponse(updated, 'Address updated successfully');
  } catch (error) {
    console.error('Error updating address:', error);
    return errorResponse('Failed to update address', 500);
  }
}

async function deleteAddress(env, customer, addressId) {
  try {
    const existing = await env.DB.prepare(
      'SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ? AND site_id = ?'
    ).bind(addressId, customer.id, customer.site_id).first();

    if (!existing) {
      return errorResponse('Address not found', 404);
    }

    await env.DB.prepare(
      'DELETE FROM customer_addresses WHERE id = ? AND customer_id = ? AND site_id = ?'
    ).bind(addressId, customer.id, customer.site_id).run();

    try {
      const { trackD1Usage, estimateRowBytes } = await import('../../utils/usage-tracker.js');
      trackD1Usage(env, customer.site_id, -estimateRowBytes(existing)).catch(() => {});
    } catch (_) {}

    return successResponse(null, 'Address deleted successfully');
  } catch (error) {
    console.error('Error deleting address:', error);
    return errorResponse('Failed to delete address', 500);
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

    const { trackD1Usage, estimateRowBytes, checkUsageLimit } = await import('../../utils/usage-tracker.js');

    const rowData = { id: customerId, siteId, email, name, phone };
    const estimatedBytes = estimateRowBytes(rowData);

    const usageCheck = await checkUsageLimit(env, siteId, 'd1', estimatedBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, 'STORAGE_LIMIT');
    }

    await env.DB.prepare(
      `INSERT INTO site_customers (id, site_id, email, password_hash, name, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(customerId, siteId, email.toLowerCase(), passwordHash, sanitizeInput(name), phone || null).run();

    trackD1Usage(env, siteId, estimatedBytes).catch(() => {});

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
