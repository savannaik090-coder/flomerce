import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
}));
app.use(express.json());

const dbPath = path.join(__dirname, 'backend', 'data', 'database.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const schemaPath = path.join(__dirname, 'backend', 'schema', 'd1-schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
const statements = schema.split(';').filter(s => s.trim());
for (const stmt of statements) {
  try {
    if (stmt.trim()) {
      db.exec(stmt);
    }
  } catch (e) {
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

function generateId() {
  return uuidv4();
}

function generateSubdomain(brandName) {
  return brandName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 30);
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return salt.toString('hex') + ':' + hash.toString('hex');
}

async function verifyPassword(password, storedHash) {
  const [saltHex, hashHex] = storedHash.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return hash.toString('hex') === hashHex;
}

function generateJWT(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, iat: now, exp: now + (24 * 60 * 60) };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  
  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

function verifyJWT(token) {
  try {
    const [base64Header, base64Payload, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
      .update(`${base64Header}.${base64Payload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) return null;
    
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    
    return payload;
  } catch (e) {
    return null;
  }
}

function validateAuth(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  const payload = verifyJWT(token);
  if (!payload) return null;
  
  const user = db.prepare('SELECT id, email, name, email_verified FROM users WHERE id = ?').get(payload.userId);
  return user;
}

function successResponse(res, data, message = 'Success') {
  res.json({ success: true, message, data });
}

function errorResponse(res, message, status = 400, code = 'ERROR') {
  res.status(status).json({ success: false, error: message, code });
}

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return errorResponse(res, 'Name, email, and password are required');
    }
    
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return errorResponse(res, 'Email already registered', 400, 'EMAIL_EXISTS');
    }
    
    const passwordHash = await hashPassword(password);
    const userId = generateId();
    
    db.prepare(
      'INSERT INTO users (id, email, password_hash, name, email_verified, created_at) VALUES (?, ?, ?, ?, 1, datetime("now"))'
    ).run(userId, email, passwordHash, name);
    
    const token = generateJWT({ userId, email });
    
    successResponse(res, {
      token,
      user: { id: userId, email, name, emailVerified: true }
    });
  } catch (error) {
    console.error('Signup error:', error);
    errorResponse(res, 'Failed to create account', 500);
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return errorResponse(res, 'Email and password are required');
    }
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return errorResponse(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    
    const token = generateJWT({ userId: user.id, email: user.email });
    
    successResponse(res, {
      token,
      user: { id: user.id, email: user.email, name: user.name, emailVerified: !!user.email_verified }
    });
  } catch (error) {
    console.error('Login error:', error);
    errorResponse(res, 'Login failed', 500);
  }
});

app.get('/api/auth/me', (req, res) => {
  const user = validateAuth(req);
  if (!user) {
    return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
  successResponse(res, user);
});

app.post('/api/auth/logout', (req, res) => {
  successResponse(res, null, 'Logged out');
});

app.put('/api/auth/update-profile', (req, res) => {
  const user = validateAuth(req);
  if (!user) {
    return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  try {
    const { name, phone } = req.body;
    
    db.prepare(`
      UPDATE users SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name || null, phone || null, user.id);
    
    successResponse(res, null, 'Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    errorResponse(res, 'Failed to update profile', 500);
  }
});

app.get('/api/users/profile', (req, res) => {
  const user = validateAuth(req);
  if (!user) {
    return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  try {
    const profile = db.prepare(`
      SELECT u.id, u.email, u.name, u.phone, u.email_verified,
             s.plan, s.billing_cycle, s.status, s.current_period_start, s.current_period_end
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
      WHERE u.id = ?
      ORDER BY s.created_at DESC
      LIMIT 1
    `).get(user.id);
    
    if (!profile) {
      return errorResponse(res, 'User not found', 404);
    }
    
    successResponse(res, {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      phone: profile.phone,
      emailVerified: !!profile.email_verified,
      plan: profile.plan || null,
      billingCycle: profile.billing_cycle || null,
      status: profile.status || 'none',
      trialStartDate: profile.current_period_start,
      trialEndDate: profile.current_period_end,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    errorResponse(res, 'Failed to fetch profile', 500);
  }
});

app.get('/api/users/subscription', (req, res) => {
  const user = validateAuth(req);
  if (!user) {
    return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  try {
    const subscription = db.prepare(`
      SELECT * FROM subscriptions 
      WHERE user_id = ? AND status = 'active' 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(user.id);
    
    if (!subscription) {
      return successResponse(res, {
        plan: null,
        status: 'none',
        billingCycle: null,
      });
    }
    
    successResponse(res, {
      id: subscription.id,
      plan: subscription.plan,
      billingCycle: subscription.billing_cycle,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    errorResponse(res, 'Failed to fetch subscription', 500);
  }
});

app.patch('/api/users/subscription', (req, res) => {
  const user = validateAuth(req);
  if (!user) {
    return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  try {
    const { plan, billingCycle, status } = req.body;
    
    const existingSubscription = db.prepare(
      'SELECT id FROM subscriptions WHERE user_id = ? AND status = "active"'
    ).get(user.id);
    
    if (existingSubscription) {
      if (status === 'expired' || status === 'cancelled') {
        db.prepare(
          'UPDATE subscriptions SET status = ?, cancelled_at = datetime("now") WHERE id = ?'
        ).run(status, existingSubscription.id);
        return successResponse(res, null, 'Subscription updated');
      }
      
      db.prepare(`
        UPDATE subscriptions SET 
          plan = COALESCE(?, plan),
          billing_cycle = COALESCE(?, billing_cycle),
          status = COALESCE(?, status)
        WHERE id = ?
      `).run(plan || null, billingCycle || null, status || null, existingSubscription.id);
      
      return successResponse(res, null, 'Subscription updated');
    }
    
    let periodDays = 30;
    if (billingCycle === '6months') periodDays = 180;
    if (billingCycle === 'yearly') periodDays = 365;
    if (plan === 'trial') periodDays = 7;
    
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + periodDays);
    
    const plans = {
      trial: { monthly: 0, '6months': 0, yearly: 0 },
      basic: { monthly: 99, '6months': 499, yearly: 899 },
      premium: { monthly: 299, '6months': 1499, yearly: 2499 },
      pro: { monthly: 999, '6months': 4999, yearly: 8999 },
    };
    
    const amount = plan === 'trial' ? 0 : (plans[plan]?.[billingCycle] || 0);
    
    db.prepare(`
      INSERT INTO subscriptions (id, user_id, plan, billing_cycle, amount, status, current_period_start, current_period_end, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))
    `).run(
      generateId(),
      user.id,
      plan,
      billingCycle || 'monthly',
      amount,
      status || 'active',
      periodEnd.toISOString()
    );
    
    successResponse(res, null, 'Subscription created');
  } catch (error) {
    console.error('Update subscription error:', error);
    errorResponse(res, 'Failed to update subscription', 500);
  }
});

app.get('/api/sites', (req, res) => {
  const user = validateAuth(req);
  if (!user) {
    return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  try {
    const sites = db.prepare(`
      SELECT id, subdomain, brand_name, category, template_id, logo_url, 
             primary_color, is_active, subscription_plan, created_at
      FROM sites 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(user.id);
    
    successResponse(res, sites);
  } catch (error) {
    console.error('Get sites error:', error);
    errorResponse(res, 'Failed to fetch sites', 500);
  }
});

app.get('/api/sites/:siteId', (req, res) => {
  const user = validateAuth(req);
  if (!user) {
    return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  try {
    const { siteId } = req.params;
    
    const site = db.prepare('SELECT * FROM sites WHERE id = ? AND user_id = ?').get(siteId, user.id);
    if (!site) {
      return errorResponse(res, 'Site not found', 404, 'NOT_FOUND');
    }
    
    const categories = db.prepare('SELECT * FROM categories WHERE site_id = ? ORDER BY display_order').all(siteId);
    
    successResponse(res, { ...site, categories });
  } catch (error) {
    console.error('Get site error:', error);
    errorResponse(res, 'Failed to fetch site', 500);
  }
});

app.post('/api/sites', (req, res) => {
  const user = validateAuth(req);
  if (!user) {
    return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  try {
    const { brandName, category, categories, templateId, logoUrl, phone, email, address, primaryColor, secondaryColor } = req.body;
    
    if (!brandName) {
      return errorResponse(res, 'Brand name is required');
    }
    
    let subdomain = generateSubdomain(brandName);
    
    const existing = db.prepare('SELECT id FROM sites WHERE subdomain = ?').get(subdomain);
    if (existing) {
      subdomain = `${subdomain}-${Date.now().toString(36)}`;
    }
    
    const siteId = generateId();
    db.prepare(`
      INSERT INTO sites (id, user_id, subdomain, brand_name, category, template_id, logo_url, phone, email, address, primary_color, secondary_color, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      siteId, 
      user.id, 
      subdomain, 
      brandName, 
      category || 'general', 
      templateId || 'template1',
      logoUrl || null,
      phone || null,
      email || null,
      address || null,
      primaryColor || '#000000',
      secondaryColor || '#ffffff'
    );
    
    if (categories && categories.length > 0) {
      let order = 0;
      for (const categoryName of categories) {
        const slug = categoryName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
        
        db.prepare(`
          INSERT INTO categories (id, site_id, name, slug, display_order, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run(generateId(), siteId, categoryName, slug, order++);
      }
    }
    
    successResponse(res, { id: siteId, subdomain }, 'Site created successfully');
  } catch (error) {
    console.error('Create site error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return errorResponse(res, 'Subdomain already taken', 400, 'SUBDOMAIN_TAKEN');
    }
    errorResponse(res, 'Failed to create site', 500);
  }
});

app.put('/api/sites/:siteId', (req, res) => {
  const user = validateAuth(req);
  if (!user) {
    return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  try {
    const { siteId } = req.params;
    
    const site = db.prepare('SELECT id FROM sites WHERE id = ? AND user_id = ?').get(siteId, user.id);
    if (!site) {
      return errorResponse(res, 'Site not found', 404, 'NOT_FOUND');
    }
    
    const updates = req.body;
    const allowedFields = ['brand_name', 'logo_url', 'favicon_url', 'primary_color', 'secondary_color', 'phone', 'email', 'address', 'social_links', 'settings'];
    
    const setClause = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = ?`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }
    
    if (setClause.length === 0) {
      return errorResponse(res, 'No valid fields to update');
    }
    
    setClause.push('updated_at = datetime("now")');
    values.push(siteId);
    
    db.prepare(`UPDATE sites SET ${setClause.join(', ')} WHERE id = ?`).run(...values);
    
    successResponse(res, null, 'Site updated successfully');
  } catch (error) {
    console.error('Update site error:', error);
    errorResponse(res, 'Failed to update site', 500);
  }
});

app.delete('/api/sites/:siteId', (req, res) => {
  const user = validateAuth(req);
  if (!user) {
    return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  try {
    const { siteId } = req.params;
    
    const site = db.prepare('SELECT id, subdomain FROM sites WHERE id = ? AND user_id = ?').get(siteId, user.id);
    if (!site) {
      return errorResponse(res, 'Site not found', 404, 'NOT_FOUND');
    }
    
    db.prepare('DELETE FROM sites WHERE id = ?').run(siteId);
    
    successResponse(res, { subdomain: site.subdomain }, 'Site deleted successfully');
  } catch (error) {
    console.error('Delete site error:', error);
    errorResponse(res, 'Failed to delete site', 500);
  }
});

app.get('/api/payments/subscription', (req, res) => {
  const user = validateAuth(req);
  if (!user) {
    return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  try {
    const subscription = db.prepare(`
      SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1
    `).get(user.id);
    
    if (!subscription) {
      return successResponse(res, { plan: 'free', status: 'none' });
    }
    
    successResponse(res, {
      id: subscription.id,
      plan: subscription.plan,
      billingCycle: subscription.billing_cycle,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    errorResponse(res, 'Failed to fetch subscription', 500);
  }
});

app.post('/api/payments/subscription', async (req, res) => {
  const user = validateAuth(req);
  if (!user) {
    return errorResponse(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
  
  try {
    const { planId, billingCycle } = req.body;
    
    const plans = {
      basic: { monthly: 99, '6months': 499, yearly: 899 },
      premium: { monthly: 299, '6months': 1499, yearly: 2499 },
      pro: { monthly: 999, '6months': 4999, yearly: 8999 },
    };
    
    if (!plans[planId] || !plans[planId][billingCycle]) {
      return errorResponse(res, 'Invalid plan or billing cycle');
    }
    
    const amount = plans[planId][billingCycle];
    
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return errorResponse(res, 'Payment gateway not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.', 500);
    }
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount * 100,
        currency: 'INR',
        receipt: `sub_${user.id}_${Date.now()}`,
        notes: {
          userId: user.id,
          planId,
          billingCycle,
          type: 'subscription',
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Razorpay error:', error);
      return errorResponse(res, 'Failed to create subscription order', 500);
    }
    
    const razorpayOrder = await response.json();
    
    successResponse(res, {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: RAZORPAY_KEY_ID,
      planId,
      billingCycle,
    });
  } catch (error) {
    console.error('Create subscription order error:', error);
    errorResponse(res, 'Failed to create subscription order', 500);
  }
});

app.post('/api/payments/create-order', async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body;
    
    if (!amount) {
      return errorResponse(res, 'Amount is required');
    }
    
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return errorResponse(res, 'Payment gateway not configured', 500);
    }
    
    const amountInPaise = Math.round(amount * 100);
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: currency || 'INR',
        receipt: receipt || `order_${Date.now()}`,
        notes: notes || {},
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Razorpay error:', error);
      return errorResponse(res, 'Failed to create payment order', 500);
    }
    
    const razorpayOrder = await response.json();
    
    successResponse(res, {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Create order error:', error);
    errorResponse(res, 'Failed to create payment order', 500);
  }
});

app.post('/api/payments/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse(res, 'Missing payment verification data');
    }
    
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    
    if (expectedSignature !== razorpay_signature) {
      return errorResponse(res, 'Invalid payment signature', 400, 'INVALID_SIGNATURE');
    }
    
    successResponse(res, { verified: true }, 'Payment verified successfully');
  } catch (error) {
    console.error('Verify payment error:', error);
    errorResponse(res, 'Payment verification failed', 500);
  }
});

app.get('/api/health', (req, res) => {
  try {
    const dbCheck = db.prepare('SELECT 1 as ok').get();
    res.json({
      status: 'healthy',
      database: dbCheck ? 'connected' : 'error',
      timestamp: new Date().toISOString(),
      razorpay: RAZORPAY_KEY_ID ? 'configured' : 'not configured',
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.use(express.static(path.join(__dirname, 'frontend'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Health check: http://localhost:${PORT}/api/health`);
  console.log(`Frontend: http://localhost:${PORT}`);
});
