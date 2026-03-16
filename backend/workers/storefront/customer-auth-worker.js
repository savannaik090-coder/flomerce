import { generateId, generateToken, getExpiryDate, validateEmail, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { hashPassword, verifyPassword } from '../../utils/auth.js';
import { sendEmail } from '../../utils/email.js';

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
    case 'request-password-reset':
      return handleRequestPasswordReset(request, env);
    case 'reset-password':
      return handleResetPassword(request, env);
    case 'verify-email':
      return handleVerifyEmail(request, env);
    case 'resend-verification':
      return handleResendVerification(request, env);
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
        email_verified INTEGER DEFAULT 0,
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

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS customer_password_resets (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_customer_pw_reset_token ON customer_password_resets(token)'
    ).run();

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS customer_email_verifications (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    await env.DB.prepare(
      'CREATE INDEX IF NOT EXISTS idx_customer_email_verify_token ON customer_email_verifications(token)'
    ).run();

    try {
      await env.DB.prepare(
        'ALTER TABLE site_customers ADD COLUMN email_verified INTEGER DEFAULT 0'
      ).run();
    } catch (_) {}
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

    return successResponse(null, 'Address deleted successfully');
  } catch (error) {
    console.error('Error deleting address:', error);
    return errorResponse('Failed to delete address', 500);
  }
}

function getStorefrontUrl(env, site) {
  if (site.custom_domain && site.domain_status === 'verified') {
    return `https://${site.custom_domain}`;
  }
  const domain = env.DOMAIN || 'fluxe.in';
  return `https://${site.subdomain}.${domain}`;
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
      'SELECT id, brand_name, subdomain, custom_domain, domain_status FROM sites WHERE id = ? AND is_active = 1'
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

    const { checkUsageLimit } = await import('../../utils/usage-tracker.js');

    const usageCheck = await checkUsageLimit(env, siteId, 'd1', 0);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, 'STORAGE_LIMIT');
    }

    const skipVerification = env.SKIP_EMAIL_VERIFICATION === 'true';

    await env.DB.prepare(
      `INSERT INTO site_customers (id, site_id, email, password_hash, name, phone, email_verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(customerId, siteId, email.toLowerCase(), passwordHash, sanitizeInput(name), phone || null, skipVerification ? 1 : 0).run();

    if (!skipVerification) {
      const verifyToken = generateToken(32);
      const verifyExpiry = getExpiryDate(24);
      await env.DB.prepare(
        `INSERT INTO customer_email_verifications (id, site_id, customer_id, token, expires_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(generateId(), siteId, customerId, verifyToken, verifyExpiry).run();

      const baseUrl = getStorefrontUrl(env, site);
      const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email.toLowerCase())}`;
      const emailContent = buildVerificationEmail(site.brand_name, verifyUrl);
      const emailResult = await sendEmail(env, email.toLowerCase(), `Verify your email - ${site.brand_name}`, emailContent.html, emailContent.text);
      if (emailResult !== true) {
        console.error('Verification email send failed:', emailResult);
      }

      return successResponse({
        customer: {
          id: customerId,
          email: email.toLowerCase(),
          name: sanitizeInput(name),
        },
        requiresVerification: true,
      }, 'Account created. Please check your email to verify your account.');
    }

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
      'SELECT id, email, password_hash, name, phone, email_verified FROM site_customers WHERE site_id = ? AND email = ?'
    ).bind(siteId, email.toLowerCase()).first();

    if (!customer) {
      return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await verifyPassword(password, customer.password_hash);
    if (!isValid) {
      return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const skipVerification = env.SKIP_EMAIL_VERIFICATION === 'true';
    if (!skipVerification && !customer.email_verified) {
      return errorResponse('Please verify your email before logging in. Check your inbox for the verification link.', 403, 'EMAIL_NOT_VERIFIED');
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

async function handleRequestPasswordReset(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    await ensureCustomerTables(env);
    const { siteId, email } = await request.json();

    if (!siteId || !email) {
      return errorResponse('Site ID and email are required');
    }

    const customer = await env.DB.prepare(
      'SELECT id, name FROM site_customers WHERE site_id = ? AND email = ?'
    ).bind(siteId, email.toLowerCase()).first();

    if (!customer) {
      return successResponse(null, 'If an account with that email exists, a password reset link has been sent.');
    }

    const site = await env.DB.prepare(
      'SELECT id, brand_name, subdomain, custom_domain, domain_status FROM sites WHERE id = ?'
    ).bind(siteId).first();

    await env.DB.prepare(
      'UPDATE customer_password_resets SET used = 1 WHERE customer_id = ? AND site_id = ? AND used = 0'
    ).bind(customer.id, siteId).run();

    const resetToken = generateToken(32);
    const expiresAt = getExpiryDate(1);

    await env.DB.prepare(
      `INSERT INTO customer_password_resets (id, site_id, customer_id, token, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(generateId(), siteId, customer.id, resetToken, expiresAt).run();

    const baseUrl = getStorefrontUrl(env, site);
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email.toLowerCase())}`;
    const emailContent = buildPasswordResetEmail(site.brand_name, resetUrl, customer.name);
    const emailResult = await sendEmail(env, email.toLowerCase(), `Reset your password - ${site.brand_name}`, emailContent.html, emailContent.text);
    if (emailResult !== true) {
      console.error('Password reset email send failed:', emailResult);
    }

    return successResponse(null, 'If an account with that email exists, a password reset link has been sent.');
  } catch (error) {
    console.error('Request password reset error:', error);
    return errorResponse('Failed to process password reset request', 500);
  }
}

async function handleResetPassword(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    await ensureCustomerTables(env);
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return errorResponse('Token, email and new password are required');
    }

    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters');
    }

    const resetRecord = await env.DB.prepare(
      `SELECT pr.*, sc.email as customer_email FROM customer_password_resets pr
       JOIN site_customers sc ON sc.id = pr.customer_id
       WHERE pr.token = ? AND pr.used = 0 AND pr.expires_at > datetime('now')`
    ).bind(token).first();

    if (!resetRecord) {
      return errorResponse('Invalid or expired reset link. Please request a new password reset.', 400, 'INVALID_TOKEN');
    }

    if (resetRecord.customer_email.toLowerCase() !== email.toLowerCase()) {
      return errorResponse('Invalid reset link.', 400, 'INVALID_TOKEN');
    }

    const passwordHash = await hashPassword(password);

    await env.DB.prepare(
      'UPDATE site_customers SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(passwordHash, resetRecord.customer_id).run();

    await env.DB.prepare(
      'UPDATE customer_password_resets SET used = 1 WHERE id = ?'
    ).bind(resetRecord.id).run();

    await env.DB.prepare(
      'DELETE FROM site_customer_sessions WHERE customer_id = ?'
    ).bind(resetRecord.customer_id).run();

    return successResponse(null, 'Password reset successfully. You can now log in with your new password.');
  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse('Failed to reset password', 500);
  }
}

async function handleVerifyEmail(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    await ensureCustomerTables(env);
    const { token, email } = await request.json();

    if (!token) {
      return errorResponse('Verification token is required');
    }

    const verifyRecord = await env.DB.prepare(
      `SELECT ev.*, sc.email as customer_email FROM customer_email_verifications ev
       JOIN site_customers sc ON sc.id = ev.customer_id
       WHERE ev.token = ? AND ev.used = 0 AND ev.expires_at > datetime('now')`
    ).bind(token).first();

    if (!verifyRecord) {
      return errorResponse('Invalid or expired verification link. Please request a new verification email.', 400, 'INVALID_TOKEN');
    }

    if (email && verifyRecord.customer_email.toLowerCase() !== email.toLowerCase()) {
      return errorResponse('Invalid verification link.', 400, 'INVALID_TOKEN');
    }

    await env.DB.prepare(
      'UPDATE site_customers SET email_verified = 1, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(verifyRecord.customer_id).run();

    await env.DB.prepare(
      'UPDATE customer_email_verifications SET used = 1 WHERE id = ?'
    ).bind(verifyRecord.id).run();

    return successResponse(null, 'Email verified successfully. You can now log in.');
  } catch (error) {
    console.error('Verify email error:', error);
    return errorResponse('Failed to verify email', 500);
  }
}

async function handleResendVerification(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    await ensureCustomerTables(env);
    const { siteId, email } = await request.json();

    if (!siteId || !email) {
      return errorResponse('Site ID and email are required');
    }

    const customer = await env.DB.prepare(
      'SELECT id, name, email_verified FROM site_customers WHERE site_id = ? AND email = ?'
    ).bind(siteId, email.toLowerCase()).first();

    if (!customer) {
      return successResponse(null, 'If an account with that email exists, a verification email has been sent.');
    }

    if (customer.email_verified) {
      return successResponse(null, 'Your email is already verified. You can log in.');
    }

    const site = await env.DB.prepare(
      'SELECT id, brand_name, subdomain, custom_domain, domain_status FROM sites WHERE id = ?'
    ).bind(siteId).first();

    await env.DB.prepare(
      'UPDATE customer_email_verifications SET used = 1 WHERE customer_id = ? AND site_id = ? AND used = 0'
    ).bind(customer.id, siteId).run();

    const verifyToken = generateToken(32);
    const verifyExpiry = getExpiryDate(24);

    await env.DB.prepare(
      `INSERT INTO customer_email_verifications (id, site_id, customer_id, token, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(generateId(), siteId, customer.id, verifyToken, verifyExpiry).run();

    const baseUrl = getStorefrontUrl(env, site);
    const verifyUrl = `${baseUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email.toLowerCase())}`;
    const emailContent = buildVerificationEmail(site.brand_name, verifyUrl);
    const emailResult = await sendEmail(env, email.toLowerCase(), `Verify your email - ${site.brand_name}`, emailContent.html, emailContent.text);
    if (emailResult !== true) {
      console.error('Resend verification email send failed:', emailResult);
    }

    return successResponse(null, 'If an account with that email exists, a verification email has been sent.');
  } catch (error) {
    console.error('Resend verification error:', error);
    return errorResponse('Failed to resend verification email', 500);
  }
}

function buildPasswordResetEmail(brandName, resetUrl, customerName) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || 'Your Store'}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="margin: 0 0 16px; font-size: 22px; color: #0f172a;">Reset Your Password</h2>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">Hi ${customerName || 'there'},</p>
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
          <p style="margin: 0;">${brandName || 'Your Store'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Reset Your Password\n\nHi ${customerName || 'there'},\n\nWe received a request to reset your password. Visit this link to create a new password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can ignore this email.`;
  return { html, text };
}

function buildVerificationEmail(brandName, verifyUrl) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${brandName || 'Your Store'}</h1>
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
          <p style="margin: 0;">${brandName || 'Your Store'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `Verify Your Email\n\nWelcome! Please verify your email address by visiting this link:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, you can ignore this email.`;
  return { html, text };
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
