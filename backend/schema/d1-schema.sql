-- Cloudflare D1 Database Schema
-- Firebase to Cloudflare Migration
-- Version: 1.0
-- Date: January 31, 2026

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    email_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- EMAIL VERIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_verifications_token ON email_verifications(token);
CREATE INDEX idx_email_verifications_user ON email_verifications(user_id);

-- =====================================================
-- PASSWORD RESETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_resets_token ON password_resets(token);

-- =====================================================
-- SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- =====================================================
-- SITES TABLE (Multi-tenant websites)
-- =====================================================
CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    brand_name TEXT NOT NULL,
    category TEXT NOT NULL,
    template_id TEXT DEFAULT 'template1',
    logo_url TEXT,
    favicon_url TEXT,
    primary_color TEXT DEFAULT '#000000',
    secondary_color TEXT DEFAULT '#ffffff',
    phone TEXT,
    email TEXT,
    address TEXT,
    social_links TEXT,
    settings TEXT,
    is_active INTEGER DEFAULT 1,
    subscription_plan TEXT DEFAULT 'free',
    subscription_expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sites_subdomain ON sites(subdomain);
CREATE INDEX idx_sites_user ON sites(user_id);

-- =====================================================
-- CATEGORIES TABLE (Dynamic categories per site)
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    parent_id TEXT,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    UNIQUE(site_id, slug)
);

CREATE INDEX idx_categories_site ON categories(site_id);
CREATE INDEX idx_categories_slug ON categories(site_id, slug);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
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
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    UNIQUE(site_id, slug)
);

CREATE INDEX idx_products_site ON products(site_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_site_slug ON products(site_id, slug);
CREATE INDEX idx_products_featured ON products(site_id, is_featured);

-- =====================================================
-- PRODUCT VARIANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS product_variants (
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
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_variants_product ON product_variants(product_id);

-- =====================================================
-- ADDRESSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS addresses (
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
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_addresses_user ON addresses(user_id);

-- =====================================================
-- CARTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS carts (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    items TEXT NOT NULL DEFAULT '[]',
    subtotal REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_carts_user ON carts(user_id);
CREATE INDEX idx_carts_session ON carts(session_id);
CREATE INDEX idx_carts_site ON carts(site_id);

-- =====================================================
-- WISHLISTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS wishlists (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_wishlists_user ON wishlists(user_id);
CREATE INDEX idx_wishlists_site ON wishlists(site_id);

-- =====================================================
-- ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
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
    notes TEXT,
    tracking_number TEXT,
    carrier TEXT,
    shipped_at TEXT,
    delivered_at TEXT,
    cancelled_at TEXT,
    cancellation_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_site ON orders(site_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(site_id, status);
CREATE INDEX idx_orders_created ON orders(site_id, created_at);

-- =====================================================
-- GUEST ORDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS guest_orders (
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
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX idx_guest_orders_site ON guest_orders(site_id);
CREATE INDEX idx_guest_orders_number ON guest_orders(order_number);

-- =====================================================
-- SITE CUSTOMERS TABLE (Per-site customer accounts)
-- =====================================================
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
);

CREATE INDEX idx_site_customers_site ON site_customers(site_id);
CREATE INDEX idx_site_customers_email ON site_customers(site_id, email);

-- =====================================================
-- SITE CUSTOMER SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS site_customer_sessions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    site_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES site_customers(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX idx_customer_sessions_token ON site_customer_sessions(token);
CREATE INDEX idx_customer_sessions_customer ON site_customer_sessions(customer_id);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    user_id TEXT,
    push_token TEXT NOT NULL,
    endpoint TEXT,
    p256dh TEXT,
    auth TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_site ON notifications(site_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);

-- =====================================================
-- REVIEWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS reviews (
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
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_reviews_product ON reviews(product_id);
CREATE INDEX idx_reviews_site ON reviews(site_id);

-- =====================================================
-- SUBSCRIPTIONS TABLE (SaaS Plans)
-- =====================================================
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
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- =====================================================
-- PAYMENT TRANSACTIONS TABLE
-- =====================================================
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
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

CREATE INDEX idx_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_transactions_user ON payment_transactions(user_id);

-- =====================================================
-- COUPONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS coupons (
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
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    UNIQUE(site_id, code)
);

CREATE INDEX idx_coupons_site ON coupons(site_id);
CREATE INDEX idx_coupons_code ON coupons(site_id, code);

-- =====================================================
-- ACTIVITY LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    site_id TEXT,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_activity_site ON activity_log(site_id);
CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_created ON activity_log(created_at);
