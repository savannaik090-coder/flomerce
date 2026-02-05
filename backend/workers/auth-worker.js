import { handleEmail } from './email-worker.js';
import { generateId, generateToken, getExpiryDate, validateEmail, sanitizeInput, jsonResponse, errorResponse, successResponse, handleCORS } from '../utils/helpers.js';
import { hashPassword, verifyPassword, generateJWT, validateAuth } from '../utils/auth.js';

export async function handleAuth(request, env, path) {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const method = request.method;
  const action = path.split('/').pop();

  switch (action) {
    case 'signup':
      return handleSignup(request, env);
    case 'login':
      return handleLogin(request, env);
    case 'google':
      return handleGoogleLogin(request, env);
    case 'resend-verification':
      return handleResendVerification(request, env);
    case 'logout':
      return handleLogout(request, env);
    case 'verify-email':
      return handleVerifyEmail(request, env);
    case 'send-verification':
      return handleSendVerification(request, env);
    case 'reset-password':
      return handleResetPassword(request, env);
    case 'request-reset':
      return handleRequestReset(request, env);
    case 'me':
      return handleGetCurrentUser(request, env);
    case 'update-profile':
      return handleUpdateProfile(request, env);
    default:
      return errorResponse('Not found', 404);
  }
}

async function handleSignup(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    await ensureAuthTables(env);
    const { name, email, password, phone } = await request.json();

    if (!name || !email || !password) {
      return errorResponse('Name, email and password are required');
    }

    if (!validateEmail(email)) {
      return errorResponse('Invalid email format');
    }

    if (password.length < 8) {
      return errorResponse('Password must be at least 8 characters');
    }

    const existingUser = await env.DB.prepare(
      'SELECT id, password_hash FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (existingUser) {
      if (!existingUser.password_hash) {
        return errorResponse('This email is already registered via Google sign-in. Please log in with Google.', 400, 'USE_GOOGLE_LOGIN');
      }
      return errorResponse('Email already registered', 400, 'EMAIL_EXISTS');
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

    // Send verification email via email-worker using relative path
    const emailResponse = await handleEmail(new Request(`${env.APP_URL || ''}/api/email/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.toLowerCase(),
        token: verificationToken,
        name: sanitizeInput(name),
        verifyUrl: `${env.APP_URL}${env.VERIFY_PATH || '/src/pages/verify-email.html'}?token=${verificationToken}`
      })
    }), env, '/api/email/verification');

    const emailBody = await emailResponse.json().catch(() => ({}));

    if (!emailResponse.ok || emailBody.success === false) {
      return jsonResponse({
        success: false,
        error: emailBody.error || 'Verification email failed',
        code: 'EMAIL_SEND_FAILED',
        details: emailBody
      }, 500, request);
    }

    return successResponse({
      user: {
        id: userId,
        email: email.toLowerCase(),
        name: sanitizeInput(name),
        emailVerified: false,
      }
    }, 'Account created. Please verify your email.');
  } catch (error) {
    console.error('Signup error:', error);
    return errorResponse('Failed to create account', 500);
  }
}

async function ensureAuthTables(env) {
  try {
    // Sessions table
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

    // Email verifications table
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

    // Password resets table
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

    console.log('Auth tables verified/created');
  } catch (error) {
    console.error('Error ensuring auth tables:', error);
  }
}

async function handleLogin(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    await ensureAuthTables(env);
    const { email, password } = await request.json();

    if (!email || !password) {
      return errorResponse('Email and password are required');
    }

    const user = await env.DB.prepare(
      'SELECT id, email, password_hash, name, email_verified FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (!user) {
      console.error('Login: User not found:', email.toLowerCase());
      return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.password_hash) {
      return errorResponse('This account uses Google sign-in. Please log in with Google.', 401, 'USE_GOOGLE_LOGIN');
    }

    const isValid = await verifyPassword(password, user.password_hash);

    if (!isValid) {
      console.error('Login: Invalid password for:', email.toLowerCase());
      return errorResponse('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.email_verified) {
       return errorResponse('Please verify your email', 401, 'EMAIL_NOT_VERIFIED');
    }

    const token = await generateJWT({ userId: user.id, email: user.email }, env.JWT_SECRET || 'your-secret-key');

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
        emailVerified: !!user.email_verified,
      },
      token,
    }, 'Login successful');

    response.headers.set('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Login failed', 500);
  }
}

async function handleLogout(request, env) {
  try {
    const user = await validateAuth(request, env);

    if (user) {
      await env.DB.prepare(
        'DELETE FROM sessions WHERE user_id = ?'
      ).bind(user.id).run();
    }

    const response = successResponse(null, 'Logged out successfully');
    response.headers.set('Set-Cookie', 'auth_token=; Path=/; HttpOnly; Max-Age=0');

    return response;
  } catch (error) {
    return errorResponse('Logout failed', 500);
  }
}

async function handleVerifyEmail(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { token } = await request.json();

    if (!token) {
      return errorResponse('Verification token is required');
    }

    const verification = await env.DB.prepare(
      `SELECT user_id, expires_at FROM email_verifications WHERE token = ?`
    ).bind(token).first();

    if (!verification) {
      return errorResponse('Invalid verification token', 400, 'INVALID_TOKEN');
    }

    if (new Date(verification.expires_at) < new Date()) {
      return errorResponse('Verification token has expired', 400, 'TOKEN_EXPIRED');
    }

    await env.DB.prepare(
      'UPDATE users SET email_verified = 1, updated_at = datetime("now") WHERE id = ?'
    ).bind(verification.user_id).run();

    await env.DB.prepare(
      'DELETE FROM email_verifications WHERE user_id = ?'
    ).bind(verification.user_id).run();

    return successResponse(null, 'Email verified successfully');
  } catch (error) {
    console.error('Verify email error:', error);
    return errorResponse('Verification failed', 500);
  }
}

async function handleSendVerification(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const user = await validateAuth(request, env);

    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    if (user.email_verified) {
      return errorResponse('Email already verified', 400);
    }

    await env.DB.prepare(
      'DELETE FROM email_verifications WHERE user_id = ?'
    ).bind(user.id).run();

    const verificationToken = generateToken();

    await env.DB.prepare(
      `INSERT INTO email_verifications (id, user_id, token, expires_at)
       VALUES (?, ?, ?, ?)`
    ).bind(generateId(), user.id, verificationToken, getExpiryDate(24)).run();

    return successResponse({ verificationToken }, 'Verification email sent');
  } catch (error) {
    console.error('Send verification error:', error);
    return errorResponse('Failed to send verification', 500);
  }
}

async function handleRequestReset(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    await ensureAuthTables(env);
    const { email } = await request.json();

    if (!email) {
      return errorResponse('Email is required');
    }

    const user = await env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (!user) {
      return successResponse(null, 'If email exists, reset link will be sent');
    }

    await env.DB.prepare(
      'DELETE FROM password_resets WHERE user_id = ?'
    ).bind(user.id).run();

    const resetToken = generateToken();

    await env.DB.prepare(
      `INSERT INTO password_resets (id, user_id, token, expires_at)
       VALUES (?, ?, ?, ?)`
    ).bind(generateId(), user.id, resetToken, getExpiryDate(1)).run();

    // Send password reset email using relative path
    const emailResponse = await handleEmail(new Request(`${env.APP_URL || ''}/api/email/password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.toLowerCase(),
        token: resetToken,
        resetUrl: `${env.APP_URL}${env.RESET_PATH || '/src/pages/reset-password.html'}?token=${resetToken}`
      })
    }), env, '/api/email/password-reset');

    const emailBody = await emailResponse.json().catch(() => ({}));

    if (!emailResponse.ok || emailBody.success === false) {
      return jsonResponse({
        success: false,
        error: emailBody.error || 'Password reset email failed',
        code: 'EMAIL_SEND_FAILED',
        details: emailBody
      }, 500, request);
    }

    return successResponse({ resetToken }, 'Password reset link sent');
  } catch (error) {
    console.error('Request reset error:', error);
    return errorResponse('Failed to process reset request', 500);
  }
}

async function handleResetPassword(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return errorResponse('Token and new password are required');
    }

    if (newPassword.length < 8) {
      return errorResponse('Password must be at least 8 characters');
    }

    const reset = await env.DB.prepare(
      `SELECT user_id, expires_at, used FROM password_resets WHERE token = ?`
    ).bind(token).first();

    if (!reset) {
      return errorResponse('Invalid reset token', 400, 'INVALID_TOKEN');
    }

    if (reset.used) {
      return errorResponse('Reset token already used', 400, 'TOKEN_USED');
    }

    if (new Date(reset.expires_at) < new Date()) {
      return errorResponse('Reset token has expired', 400, 'TOKEN_EXPIRED');
    }

    const passwordHash = await hashPassword(newPassword);

    await env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(passwordHash, reset.user_id).run();

    await env.DB.prepare(
      'UPDATE password_resets SET used = 1 WHERE token = ?'
    ).bind(token).run();

    await env.DB.prepare(
      'DELETE FROM sessions WHERE user_id = ?'
    ).bind(reset.user_id).run();

    return successResponse(null, 'Password reset successfully');
  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse('Failed to reset password', 500);
  }
}

async function handleGetCurrentUser(request, env) {
  try {
    const user = await validateAuth(request, env);

    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: !!user.email_verified,
    });
  } catch (error) {
    return errorResponse('Failed to get user', 500);
  }
}

async function handleResendVerification(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { email } = await request.json();
    if (!email) return errorResponse('Email is required');

    const user = await env.DB.prepare(
      'SELECT id, name, email_verified FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (!user) return successResponse(null, 'If account exists, verification email sent');
    if (user.email_verified) return errorResponse('Email already verified');

    await env.DB.prepare('DELETE FROM email_verifications WHERE user_id = ?').bind(user.id).run();
    const token = generateToken();
    await env.DB.prepare(
      `INSERT INTO email_verifications (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`
    ).bind(generateId(), user.id, token, getExpiryDate(24)).run();

    const emailResponse = await handleEmail(new Request(`${env.APP_URL || ''}/api/email/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.toLowerCase(),
        token,
        name: user.name,
        verifyUrl: `${env.APP_URL}${env.VERIFY_PATH || '/src/pages/verify-email.html'}?token=${token}`
      })
    }), env, '/api/email/verification');

    const emailBody = await emailResponse.json().catch(() => ({}));

    if (!emailResponse.ok || emailBody.success === false) {
      return jsonResponse({
        success: false,
        error: emailBody.error || 'Verification email failed',
        code: 'EMAIL_SEND_FAILED',
        details: emailBody
      }, 500, request);
    }

    return successResponse(null, 'Verification email sent');
  } catch (error) {
    return errorResponse('Failed to resend verification', 500);
  }
}

async function handleGoogleLogin(request, env) {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405);
  try {
    const { credential } = await request.json();
    if (!credential) return errorResponse('Credential is required', 400);

    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await googleRes.json();
    
    if (!googleRes.ok) {
      console.error('Google token validation failed:', payload);
      return errorResponse(payload.error_description || 'Invalid Google token', 401);
    }
    
    // Validate audience (client ID)
    const clientId = env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('GOOGLE_CLIENT_ID not set in environment');
      return errorResponse('Server configuration error', 500);
    }

    if (payload.aud !== clientId) {
      console.error('Audience mismatch. Expected:', clientId, 'Got:', payload.aud);
      return errorResponse('Invalid client ID', 401);
    }

    const email = payload.email.toLowerCase();
    let user = await env.DB.prepare('SELECT id, email, name FROM users WHERE email = ?').bind(email).first();

    if (!user) {
      const userId = generateId();
      await env.DB.prepare(
        'INSERT INTO users (id, email, password_hash, name, email_verified, created_at) VALUES (?, ?, ?, ?, 1, datetime("now"))'
      ).bind(userId, email, null, payload.name).run();
      user = { id: userId, email, name: payload.name };
    }

    const token = await generateJWT({ userId: user.id, email: user.email }, env.JWT_SECRET);
    const sessionId = generateId();
    await env.DB.prepare(
      'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
    ).bind(sessionId, user.id, token, getExpiryDate(24 * 7)).run();

    const response = successResponse({ user, token }, 'Google login successful');
    response.headers.set('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`);
    return response;
  } catch (error) {
    console.error('Google login error:', error);
    return errorResponse(error.message || 'Google login failed', 500);
  }
}

async function handleUpdateProfile(request, env) {
  if (request.method !== 'PUT' && request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const user = await validateAuth(request, env);

    if (!user) {
      return errorResponse('Unauthorized', 401);
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
      'SELECT id, email, name, phone, email_verified FROM users WHERE id = ?'
    ).bind(user.id).first();

    return successResponse(updatedUser, 'Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    return errorResponse('Failed to update profile', 500);
  }
}
