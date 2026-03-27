-- Cloudflare D1 Database Schema
-- Initial Migration

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);

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

CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    brand_name TEXT NOT NULL,
    category TEXT NOT NULL,
    template_id TEXT DEFAULT 'storefront',
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
    low_stock_threshold INTEGER DEFAULT 3,
    weight REAL,
    dimensions TEXT,
    images TEXT,
    thumbnail_url TEXT,
    tags TEXT,
    is_featured INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX idx_products_site ON products(site_id);
CREATE INDEX idx_products_site_slug ON products(site_id, slug);
