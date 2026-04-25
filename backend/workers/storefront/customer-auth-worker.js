import { generateId, generateToken, getExpiryDate, validateEmail, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../../utils/helpers.js';
import { hashPassword, verifyPassword } from '../../utils/auth.js';
import { sendEmail } from '../../utils/email.js';
import { translateLabels, translateString } from '../../utils/email-i18n.js';
import { estimateRowBytes, trackD1Write, trackD1Update, trackD1Delete } from '../../utils/usage-tracker.js';
import { resolveSiteDBById, checkMigrationLock, ensureAddressCountryColumn, getSiteConfig } from '../../utils/site-db.js';
import { PLATFORM_DOMAIN } from '../../config.js';

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
    case 'google-login':
      return handleCustomerGoogleLogin(request, env);
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
    const db = await resolveSiteDBById(env, customer.site_id);
    await ensureAddressCountryColumn(db, customer.site_id);
    const { results } = await db.prepare(
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
    if (await checkMigrationLock(env, customer.site_id)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423, 'SITE_MIGRATING');
    }

    const body = await request.json();
    const { label, firstName, lastName, phone, houseNumber, roadName, city, country, state, pinCode, isDefault } = body;

    if (!firstName || !houseNumber || !city || !pinCode) {
      return errorResponse('First name, house number, city, and postal code are required', 400, 'ADDRESS_FIELDS_REQUIRED');
    }

    const id = generateId();
    const db = await resolveSiteDBById(env, customer.site_id);
    await ensureAddressCountryColumn(db, customer.site_id);

    if (isDefault) {
      await db.prepare(
        'UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? AND site_id = ?'
      ).bind(customer.id, customer.site_id).run();
    }

    const rowData = { id, site_id: customer.site_id, customer_id: customer.id, label, firstName, lastName, phone, houseNumber, roadName, city, country, state, pinCode };
    const rowBytes = estimateRowBytes(rowData);

    await db.prepare(
      `INSERT INTO customer_addresses (id, site_id, customer_id, label, first_name, last_name, phone, house_number, road_name, city, country, state, pin_code, is_default, row_size_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      id, customer.site_id, customer.id,
      sanitizeInput(label || 'Home'),
      sanitizeInput(firstName),
      lastName ? sanitizeInput(lastName) : null,
      phone || null,
      sanitizeInput(houseNumber),
      roadName ? sanitizeInput(roadName) : null,
      sanitizeInput(city),
      sanitizeInput(country || 'IN'),
      state ? sanitizeInput(state) : null,
      sanitizeInput(pinCode),
      isDefault ? 1 : 0,
      rowBytes
    ).run();

    await trackD1Write(env, customer.site_id, rowBytes);

    const address = await db.prepare(
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
    if (await checkMigrationLock(env, customer.site_id)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423, 'SITE_MIGRATING');
    }

    const db = await resolveSiteDBById(env, customer.site_id);

    const existing = await db.prepare(
      'SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ? AND site_id = ?'
    ).bind(addressId, customer.id, customer.site_id).first();

    if (!existing) {
      return errorResponse('Address not found', 404, 'ADDRESS_NOT_FOUND');
    }

    const body = await request.json();
    const { label, firstName, lastName, phone, houseNumber, roadName, city, country, state, pinCode, isDefault } = body;

    await ensureAddressCountryColumn(db, customer.site_id);

    if (isDefault) {
      await db.prepare(
        'UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ? AND site_id = ?'
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
      lastName !== undefined ? (lastName ? sanitizeInput(lastName) : null) : null,
      phone !== undefined ? (phone || null) : null,
      houseNumber ? sanitizeInput(houseNumber) : null,
      roadName !== undefined ? (roadName ? sanitizeInput(roadName) : null) : null,
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
    const db = await resolveSiteDBById(env, customer.site_id);

    const existing = await db.prepare(
      'SELECT * FROM customer_addresses WHERE id = ? AND customer_id = ? AND site_id = ?'
    ).bind(addressId, customer.id, customer.site_id).first();

    if (!existing) {
      return errorResponse('Address not found', 404, 'ADDRESS_NOT_FOUND');
    }

    const bytesToRemove = existing.row_size_bytes || 0;

    await db.prepare(
      'DELETE FROM customer_addresses WHERE id = ? AND customer_id = ? AND site_id = ?'
    ).bind(addressId, customer.id, customer.site_id).run();

    if (bytesToRemove > 0) {
      await trackD1Delete(env, customer.site_id, bytesToRemove);
    }

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
  const domain = env.DOMAIN || PLATFORM_DOMAIN;
  return `https://${site.subdomain}.${domain}`;
}

async function handleSignup(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const reqBody = await request.json();
    const { siteId, name, email, password, phone } = reqBody;
    const signupLang = (reqBody.lang || '').trim() || null;

    if (!siteId || !name || !email || !password) {
      return errorResponse('Site ID, name, email and password are required', 400, 'SIGNUP_FIELDS_REQUIRED');
    }

    if (!validateEmail(email)) {
      return errorResponse('Invalid email format', 400, 'INVALID_EMAIL_FORMAT');
    }

    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters', 400, 'PASSWORD_TOO_SHORT');
    }

    const site = await env.DB.prepare(
      'SELECT id, brand_name, subdomain, custom_domain, domain_status FROM sites WHERE id = ? AND is_active = 1'
    ).bind(siteId).first();

    if (!site) {
      return errorResponse('Store not found', 404, 'STORE_NOT_FOUND');
    }

    const db = await resolveSiteDBById(env, siteId);

    const existing = await db.prepare(
      'SELECT id FROM site_customers WHERE site_id = ? AND email = ?'
    ).bind(siteId, email.toLowerCase()).first();

    if (existing) {
      return errorResponse('An account with this email already exists for this store', 400, 'EMAIL_EXISTS');
    }

    const customerId = generateId();
    const passwordHash = await hashPassword(password);

    const { checkUsageLimit } = await import('../../utils/usage-tracker.js');

    if (await checkMigrationLock(env, siteId)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423, 'SITE_MIGRATING');
    }

    const rowData = { id: customerId, site_id: siteId, email: email.toLowerCase(), name, phone };
    const rowBytes = estimateRowBytes(rowData);

    const usageCheck = await checkUsageLimit(env, siteId, 'd1', rowBytes);
    if (!usageCheck.allowed) {
      return errorResponse(usageCheck.reason, 403, 'STORAGE_LIMIT');
    }

    const skipVerification = env.SKIP_EMAIL_VERIFICATION === 'true';

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
      const emailContent = await buildVerificationEmail(site.brand_name, verifyUrl, env, siteId, signupLang);
      let signupOwnerEmail = '';
      try {
        const sCfg = await getSiteConfig(env, siteId);
        let sSet = {};
        try { if (sCfg?.settings) sSet = typeof sCfg.settings === 'string' ? JSON.parse(sCfg.settings) : sCfg.settings; } catch (e) {}
        signupOwnerEmail = sSet.email || sSet.ownerEmail || sCfg?.email || '';
      } catch (e) {}
      const verifySubject = await translateString(env, siteId, signupLang, `Verify your email - ${site.brand_name}`);
      const emailResult = await sendEmail(env, email.toLowerCase(), verifySubject, emailContent.html, emailContent.text, { senderName: site.brand_name, replyTo: signupOwnerEmail || undefined });
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
    const { siteId, email, password } = await request.json();

    if (!siteId || !email || !password) {
      return errorResponse('Site ID, email and password are required', 400, 'LOGIN_FIELDS_REQUIRED');
    }

    const db = await resolveSiteDBById(env, siteId);

    const customer = await db.prepare(
      'SELECT id, email, password_hash, name, phone, email_verified FROM site_customers WHERE site_id = ? AND email = ?'
    ).bind(siteId, email.toLowerCase()).first();

    if (!customer) {
      return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!customer.password_hash) {
      return errorResponse('This account uses Google sign-in. Please log in with Google.', 401, 'USE_GOOGLE_LOGIN');
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
        phone: customer.phone,
      },
      token,
    }, 'Login successful');
  } catch (error) {
    console.error('Customer login error:', error);
    return errorResponse('Login failed', 500);
  }
}

async function handleCustomerGoogleLogin(request, env) {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);

  try {
    const { siteId, credential } = await request.json();
    if (!siteId || !credential) return errorResponse('Site ID and credential are required', 400, 'GOOGLE_FIELDS_REQUIRED');

    const clientId = env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('GOOGLE_CLIENT_ID not set in environment');
      return errorResponse('Google Sign-In is not configured', 500);
    }

    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await googleRes.json();

    if (!googleRes.ok) {
      console.error('Google token validation failed:', payload);
      return errorResponse(payload.error_description || 'Invalid Google token', 401);
    }

    if (payload.aud !== clientId) {
      console.error('Audience mismatch. Expected:', clientId, 'Got:', payload.aud);
      return errorResponse('Invalid client ID', 401);
    }

    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      console.error('Invalid issuer:', payload.iss);
      return errorResponse('Invalid token issuer', 401);
    }

    if (!payload.email || payload.email_verified !== 'true') {
      console.error('Google email not verified or missing');
      return errorResponse('Google account email is not verified', 401);
    }

    const site = await env.DB.prepare(
      'SELECT id, brand_name, subdomain FROM sites WHERE id = ? AND is_active = 1'
    ).bind(siteId).first();
    if (!site) return errorResponse('Store not found', 404, 'STORE_NOT_FOUND');

    const db = await resolveSiteDBById(env, siteId);
    const email = payload.email.toLowerCase();
    const googleName = payload.name || email.split('@')[0];

    let customer = await db.prepare(
      'SELECT id, email, name, phone, email_verified, password_hash FROM site_customers WHERE site_id = ? AND email = ?'
    ).bind(siteId, email).first();

    if (!customer) {
      if (await checkMigrationLock(env, siteId)) {
        return errorResponse('Site is currently being migrated. Please try again shortly.', 423, 'SITE_MIGRATING');
      }

      const { checkUsageLimit } = await import('../../utils/usage-tracker.js');
      const customerId = generateId();
      const rowData = { id: customerId, site_id: siteId, email, name: googleName };
      const rowBytes = estimateRowBytes(rowData);

      const usageCheck = await checkUsageLimit(env, siteId, 'd1', rowBytes);
      if (!usageCheck.allowed) {
        return errorResponse(usageCheck.reason, 403, 'STORAGE_LIMIT');
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
          'UPDATE site_customers SET email_verified = 1, updated_at = datetime(\'now\') WHERE id = ?'
        ).bind(customer.id).run();
        const updatedCust = await db.prepare('SELECT * FROM site_customers WHERE id = ?').bind(customer.id).first();
        if (updatedCust) {
          const newBytes = estimateRowBytes(updatedCust);
          await db.prepare('UPDATE site_customers SET row_size_bytes = ? WHERE id = ?').bind(newBytes, customer.id).run();
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
        phone: customer.phone || null,
      },
      token,
    }, 'Google login successful');
  } catch (error) {
    console.error('Customer Google login error:', error);
    return errorResponse(error.message || 'Google login failed', 500);
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
        const db = await resolveSiteDBById(env, customer.site_id);
        const sess = await db.prepare(
          'SELECT row_size_bytes, site_id FROM site_customer_sessions WHERE token = ?'
        ).bind(token).first();
        await db.prepare(
          'DELETE FROM site_customer_sessions WHERE token = ?'
        ).bind(token).run();
        if (sess && sess.site_id) {
          await trackD1Delete(env, sess.site_id, sess.row_size_bytes || 0);
        }
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

    if (await checkMigrationLock(env, customer.site_id)) {
      return errorResponse('Site is currently being migrated. Please try again shortly.', 423, 'SITE_MIGRATING');
    }

    const { name, phone } = await request.json();

    const db = await resolveSiteDBById(env, customer.site_id);

    const oldRow = await db.prepare(
      'SELECT row_size_bytes FROM site_customers WHERE id = ?'
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
      'SELECT id, email, name, phone FROM site_customers WHERE id = ?'
    ).bind(customer.id).first();

    const newBytes = estimateRowBytes(updated || {});
    if (oldBytes !== newBytes) {
      await db.prepare(
        'UPDATE site_customers SET row_size_bytes = ? WHERE id = ?'
      ).bind(newBytes, customer.id).run();
      await trackD1Update(env, customer.site_id, oldBytes, newBytes);
    }

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
    const _resetReq = await request.json();
    const { siteId, email } = _resetReq;
    const resetLang = (_resetReq.lang || '').trim() || null;

    if (!siteId || !email) {
      return errorResponse('Site ID and email are required');
    }

    const db = await resolveSiteDBById(env, siteId);

    const customer = await db.prepare(
      'SELECT id, name FROM site_customers WHERE site_id = ? AND email = ?'
    ).bind(siteId, email.toLowerCase()).first();

    if (!customer) {
      return successResponse(null, 'If an account with that email exists, a password reset link has been sent.');
    }

    const site = await env.DB.prepare(
      'SELECT id, brand_name, subdomain, custom_domain, domain_status FROM sites WHERE id = ?'
    ).bind(siteId).first();

    const oldResets = await db.prepare(
      'SELECT id, row_size_bytes FROM customer_password_resets WHERE customer_id = ? AND site_id = ? AND used = 0'
    ).bind(customer.id, siteId).all();
    if ((oldResets.results || []).length > 0) {
      await db.prepare(
        'UPDATE customer_password_resets SET used = 1 WHERE customer_id = ? AND site_id = ? AND used = 0'
      ).bind(customer.id, siteId).run();
      for (const oldReset of (oldResets.results || [])) {
        const oldResetBytes = oldReset.row_size_bytes || 0;
        const updatedResetRow = await db.prepare('SELECT * FROM customer_password_resets WHERE id = ?').bind(oldReset.id).first();
        if (updatedResetRow) {
          const newResetBytes = estimateRowBytes(updatedResetRow);
          await db.prepare('UPDATE customer_password_resets SET row_size_bytes = ? WHERE id = ?').bind(newResetBytes, oldReset.id).run();
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
    const emailContent = await buildPasswordResetEmail(site.brand_name, resetUrl, customer.name, env, siteId, resetLang);
    let resetOwnerEmail = '';
    try {
      const rCfg = await getSiteConfig(env, siteId);
      let rSet = {};
      try { if (rCfg?.settings) rSet = typeof rCfg.settings === 'string' ? JSON.parse(rCfg.settings) : rCfg.settings; } catch (e) {}
      resetOwnerEmail = rSet.email || rSet.ownerEmail || rCfg?.email || '';
    } catch (e) {}
    const resetSubject = await translateString(env, siteId, resetLang, `Reset your password - ${site.brand_name}`);
    const emailResult = await sendEmail(env, email.toLowerCase(), resetSubject, emailContent.html, emailContent.text, { senderName: site.brand_name, replyTo: resetOwnerEmail || undefined });
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
    const { token, email, password, siteId } = await request.json();

    if (!token || !email || !password) {
      return errorResponse('Token, email and new password are required');
    }

    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters', 400, 'PASSWORD_TOO_SHORT');
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
      const allSites = await env.DB.prepare('SELECT id FROM sites').all();
      for (const s of (allSites.results || [])) {
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
      return errorResponse('Invalid or expired reset link. Please request a new password reset.', 400, 'INVALID_TOKEN');
    }

    if (resetRecord.customer_email.toLowerCase() !== email.toLowerCase()) {
      return errorResponse('Invalid reset link.', 400, 'INVALID_TOKEN');
    }

    const passwordHash = await hashPassword(password);

    const custRow = await db.prepare(
      'SELECT row_size_bytes, site_id FROM site_customers WHERE id = ?'
    ).bind(resetRecord.customer_id).first();
    const custOldBytes = custRow?.row_size_bytes || 0;

    await db.prepare(
      'UPDATE site_customers SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(passwordHash, resetRecord.customer_id).run();

    const custUpdated = await db.prepare('SELECT * FROM site_customers WHERE id = ?').bind(resetRecord.customer_id).first();
    if (custUpdated) {
      const custNewBytes = estimateRowBytes(custUpdated);
      await db.prepare('UPDATE site_customers SET row_size_bytes = ? WHERE id = ?').bind(custNewBytes, resetRecord.customer_id).run();
      if (custRow?.site_id) await trackD1Update(env, custRow.site_id, custOldBytes, custNewBytes);
    }

    const resetOldBytes = resetRecord.row_size_bytes || 0;
    await db.prepare(
      'UPDATE customer_password_resets SET used = 1 WHERE id = ?'
    ).bind(resetRecord.id).run();
    const updatedResetRecord = await db.prepare('SELECT * FROM customer_password_resets WHERE id = ?').bind(resetRecord.id).first();
    if (updatedResetRecord && custRow?.site_id) {
      const resetNewBytes = estimateRowBytes(updatedResetRecord);
      await db.prepare('UPDATE customer_password_resets SET row_size_bytes = ? WHERE id = ?').bind(resetNewBytes, resetRecord.id).run();
      await trackD1Update(env, custRow.site_id, resetOldBytes, resetNewBytes);
    }

    const sessionsToDelete = await db.prepare(
      'SELECT id, row_size_bytes, site_id FROM site_customer_sessions WHERE customer_id = ?'
    ).bind(resetRecord.customer_id).all();
    await db.prepare(
      'DELETE FROM site_customer_sessions WHERE customer_id = ?'
    ).bind(resetRecord.customer_id).run();
    const totalSessBytes = (sessionsToDelete.results || []).reduce((sum, s) => sum + (s.row_size_bytes || 0), 0);
    if (totalSessBytes > 0 && custRow?.site_id) {
      await trackD1Delete(env, custRow.site_id, totalSessBytes);
    }

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
    const { token, email, siteId } = await request.json();

    if (!token) {
      return errorResponse('Verification token is required');
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
      const allSites = await env.DB.prepare('SELECT id FROM sites').all();
      for (const s of (allSites.results || [])) {
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
      return errorResponse('Invalid or expired verification link. Please request a new verification email.', 400, 'INVALID_TOKEN');
    }

    if (email && verifyRecord.customer_email.toLowerCase() !== email.toLowerCase()) {
      return errorResponse('Invalid verification link.', 400, 'INVALID_TOKEN');
    }

    const verifyCustRow = await db.prepare(
      'SELECT row_size_bytes, site_id FROM site_customers WHERE id = ?'
    ).bind(verifyRecord.customer_id).first();
    const verifyCustOldBytes = verifyCustRow?.row_size_bytes || 0;

    await db.prepare(
      'UPDATE site_customers SET email_verified = 1, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(verifyRecord.customer_id).run();

    const verifyCustUpdated = await db.prepare('SELECT * FROM site_customers WHERE id = ?').bind(verifyRecord.customer_id).first();
    if (verifyCustUpdated) {
      const verifyCustNewBytes = estimateRowBytes(verifyCustUpdated);
      await db.prepare('UPDATE site_customers SET row_size_bytes = ? WHERE id = ?').bind(verifyCustNewBytes, verifyRecord.customer_id).run();
      if (verifyCustRow?.site_id) await trackD1Update(env, verifyCustRow.site_id, verifyCustOldBytes, verifyCustNewBytes);
    }

    const verifyOldBytes = verifyRecord.row_size_bytes || 0;
    await db.prepare(
      'UPDATE customer_email_verifications SET used = 1 WHERE id = ?'
    ).bind(verifyRecord.id).run();
    const updatedVerifyRecord = await db.prepare('SELECT * FROM customer_email_verifications WHERE id = ?').bind(verifyRecord.id).first();
    if (updatedVerifyRecord && verifyCustRow?.site_id) {
      const verifyNewBytes = estimateRowBytes(updatedVerifyRecord);
      await db.prepare('UPDATE customer_email_verifications SET row_size_bytes = ? WHERE id = ?').bind(verifyNewBytes, verifyRecord.id).run();
      await trackD1Update(env, verifyCustRow.site_id, verifyOldBytes, verifyNewBytes);
    }

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
    const _resendReq = await request.json();
    const { siteId, email } = _resendReq;
    const resendLang = (_resendReq.lang || '').trim() || null;

    if (!siteId || !email) {
      return errorResponse('Site ID and email are required');
    }

    const db = await resolveSiteDBById(env, siteId);

    const customer = await db.prepare(
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

    const oldVerifications = await db.prepare(
      'SELECT id, row_size_bytes FROM customer_email_verifications WHERE customer_id = ? AND site_id = ? AND used = 0'
    ).bind(customer.id, siteId).all();
    if ((oldVerifications.results || []).length > 0) {
      await db.prepare(
        'UPDATE customer_email_verifications SET used = 1 WHERE customer_id = ? AND site_id = ? AND used = 0'
      ).bind(customer.id, siteId).run();
      for (const oldVerif of (oldVerifications.results || [])) {
        const oldVerifBytes = oldVerif.row_size_bytes || 0;
        const updatedVerifRow = await db.prepare('SELECT * FROM customer_email_verifications WHERE id = ?').bind(oldVerif.id).first();
        if (updatedVerifRow) {
          const newVerifBytes = estimateRowBytes(updatedVerifRow);
          await db.prepare('UPDATE customer_email_verifications SET row_size_bytes = ? WHERE id = ?').bind(newVerifBytes, oldVerif.id).run();
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
    const emailContent = await buildVerificationEmail(site.brand_name, verifyUrl, env, siteId, resendLang);
    let resendOwnerEmail = '';
    try {
      const rvCfg = await getSiteConfig(env, siteId);
      let rvSet = {};
      try { if (rvCfg?.settings) rvSet = typeof rvCfg.settings === 'string' ? JSON.parse(rvCfg.settings) : rvCfg.settings; } catch (e) {}
      resendOwnerEmail = rvSet.email || rvSet.ownerEmail || rvCfg?.email || '';
    } catch (e) {}
    const resendSubject = await translateString(env, siteId, resendLang, `Verify your email - ${site.brand_name}`);
    const emailResult = await sendEmail(env, email.toLowerCase(), resendSubject, emailContent.html, emailContent.text, { senderName: site.brand_name, replyTo: resendOwnerEmail || undefined });
    if (emailResult !== true) {
      console.error('Resend verification email send failed:', emailResult);
    }

    return successResponse(null, 'If an account with that email exists, a verification email has been sent.');
  } catch (error) {
    console.error('Resend verification error:', error);
    return errorResponse('Failed to resend verification email', 500);
  }
}

async function buildPasswordResetEmail(brandName, resetUrl, customerName, env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    HEADING: 'Reset Your Password',
    GREETING: `Hi ${customerName || 'there'},`,
    INTRO: 'We received a request to reset your password. Click the button below to create a new password:',
    BUTTON: 'Reset Password',
    EXPIRY: "This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.",
    LINK_FALLBACK_LABEL: 'Link not working?',
    LINK_FALLBACK_BODY: 'Copy and paste this URL into your browser:',
    DEFAULT_STORE: 'Your Store',
  });
  const safeBrand = brandName || t.DEFAULT_STORE;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${safeBrand}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="margin: 0 0 16px; font-size: 22px; color: #0f172a;">${t.HEADING}</h2>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">${t.GREETING}</p>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">${t.INTRO}</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #c8a97e; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px;">${t.BUTTON}</a>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.6;">${t.EXPIRY}</p>
          <div style="margin-top: 24px; padding: 12px; background: #f8f9fa; border-radius: 6px; font-size: 12px; color: #888; word-break: break-all;">
            <strong>${t.LINK_FALLBACK_LABEL}</strong> ${t.LINK_FALLBACK_BODY}<br>${resetUrl}
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">${safeBrand}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `${t.HEADING}\n\n${t.GREETING}\n\n${t.INTRO}\n${resetUrl}\n\n${t.EXPIRY}`;
  return { html, text };
}

async function buildVerificationEmail(brandName, verifyUrl, env = null, siteId = null, targetLang = null) {
  const t = await translateLabels(env, siteId, targetLang, {
    HEADING: 'Verify Your Email',
    INTRO: 'Welcome! Please verify your email address to activate your account and start shopping.',
    BUTTON: 'Verify Email',
    EXPIRY: "This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.",
    LINK_FALLBACK_LABEL: 'Link not working?',
    LINK_FALLBACK_BODY: 'Copy and paste this URL into your browser:',
    DEFAULT_STORE: 'Your Store',
  });
  const safeBrand = brandName || t.DEFAULT_STORE;
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 32px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">${safeBrand}</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="margin: 0 0 16px; font-size: 22px; color: #0f172a;">${t.HEADING}</h2>
          <p style="color: #333; font-size: 15px; line-height: 1.6;">${t.INTRO}</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="display: inline-block; background: #28a745; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px;">${t.BUTTON}</a>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.6;">${t.EXPIRY}</p>
          <div style="margin-top: 24px; padding: 12px; background: #f8f9fa; border-radius: 6px; font-size: 12px; color: #888; word-break: break-all;">
            <strong>${t.LINK_FALLBACK_LABEL}</strong> ${t.LINK_FALLBACK_BODY}<br>${verifyUrl}
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">${safeBrand}</p>
        </div>
      </div>
    </body>
    </html>
  `;
  const text = `${t.HEADING}\n\n${t.INTRO}\n${verifyUrl}\n\n${t.EXPIRY}`;
  return { html, text };
}

export async function validateCustomerAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('SiteCustomer ')) {
    return null;
  }

  const token = authHeader.substring(13);

  try {
    const url = new URL(request.url);
    const directSiteId = url.searchParams.get('siteId');

    if (directSiteId) {
      const db = await resolveSiteDBById(env, directSiteId);
      const session = await db.prepare(
        `SELECT cs.customer_id, cs.site_id FROM site_customer_sessions cs
         WHERE cs.token = ? AND cs.site_id = ? AND cs.expires_at > datetime('now')`
      ).bind(token, directSiteId).first();

      if (session) {
        const customer = await db.prepare(
          'SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ? AND site_id = ?'
        ).bind(session.customer_id, directSiteId).first();
        if (customer) return customer;
      }
    }

    const allSites = await env.DB.prepare('SELECT id FROM sites').all();
    const siteIds = (allSites.results || []).map(s => s.id);
    const checkedShards = new Set();

    for (const siteId of siteIds) {
      if (siteId === directSiteId) continue;
      const db = await resolveSiteDBById(env, siteId);
      const shardKey = db._binding || siteId;

      if (checkedShards.has(shardKey)) {
        const session = await db.prepare(
          `SELECT cs.customer_id, cs.site_id FROM site_customer_sessions cs
           WHERE cs.token = ? AND cs.site_id = ? AND cs.expires_at > datetime('now')`
        ).bind(token, siteId).first();
        if (session) {
          const customer = await db.prepare(
            'SELECT id, site_id, email, name, phone FROM site_customers WHERE id = ? AND site_id = ?'
          ).bind(session.customer_id, siteId).first();
          if (customer) return customer;
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
          if (customer) return customer;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Customer auth validation error:', error);
    return null;
  }
}
