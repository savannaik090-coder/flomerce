import { ensureSEOColumns } from '../workers/seo/migrations.js';

let _initialized = false;

export async function ensureTablesExist(env) {
  if (_initialized) return;

  try {
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'user',
        email_verified INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      `CREATE TABLE IF NOT EXISTS email_verifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS password_resets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subdomain TEXT UNIQUE NOT NULL,
        brand_name TEXT NOT NULL,
        category TEXT DEFAULT 'general',
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
        custom_domain TEXT,
        domain_status TEXT,
        domain_verification_token TEXT,
        cf_hostname_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS subscriptions (
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
      )`,

      `CREATE TABLE IF NOT EXISTS payment_transactions (
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
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
      )`,

      `CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        plan_name TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        display_price REAL NOT NULL,
        razorpay_plan_id TEXT NOT NULL,
        features TEXT DEFAULT '[]',
        is_popular INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        display_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      `CREATE TABLE IF NOT EXISTS platform_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )`,

      `CREATE TABLE IF NOT EXISTS pending_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        razorpay_subscription_id TEXT NOT NULL UNIQUE,
        created_at TEXT DEFAULT (datetime('now'))
      )`,

      `CREATE TABLE IF NOT EXISTS site_usage (
        site_id TEXT PRIMARY KEY,
        d1_bytes_used INTEGER DEFAULT 0,
        r2_bytes_used INTEGER DEFAULT 0,
        last_updated TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS site_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT NOT NULL,
        storage_key TEXT NOT NULL UNIQUE,
        size_bytes INTEGER NOT NULL,
        media_type TEXT DEFAULT 'image',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,
    ];

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token)',
      'CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sites_subdomain ON sites(subdomain)',
      'CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_order ON payment_transactions(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_custom_domain ON sites(custom_domain) WHERE custom_domain IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_site_media_site ON site_media(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_site_media_key ON site_media(storage_key)',
    ];

    for (const sql of tables) {
      await env.DB.prepare(sql).run();
    }

    for (const sql of indexes) {
      try {
        await env.DB.prepare(sql).run();
      } catch (e) {
      }
    }

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS shards (
        id TEXT PRIMARY KEY,
        binding_name TEXT UNIQUE NOT NULL,
        database_id TEXT UNIQUE NOT NULL,
        database_name TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        correction_factor REAL DEFAULT 1.0,
        last_reconciled_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    const migrations = [
      { col: 'custom_domain', sql: 'ALTER TABLE sites ADD COLUMN custom_domain TEXT' },
      { col: 'domain_status', sql: 'ALTER TABLE sites ADD COLUMN domain_status TEXT' },
      { col: 'domain_verification_token', sql: 'ALTER TABLE sites ADD COLUMN domain_verification_token TEXT' },
      { col: 'cf_hostname_id', sql: 'ALTER TABLE sites ADD COLUMN cf_hostname_id TEXT' },
      { col: 'role', table: 'users', sql: "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'" },
      { col: 'd1_database_id', table: 'sites', sql: 'ALTER TABLE sites ADD COLUMN d1_database_id TEXT' },
      { col: 'd1_binding_name', table: 'sites', sql: 'ALTER TABLE sites ADD COLUMN d1_binding_name TEXT' },
      { col: 'shard_id', table: 'sites', sql: 'ALTER TABLE sites ADD COLUMN shard_id TEXT' },
      { col: 'migration_locked', table: 'sites', sql: 'ALTER TABLE sites ADD COLUMN migration_locked INTEGER DEFAULT 0' },
      { col: 'baseline_bytes', table: 'site_usage', sql: 'ALTER TABLE site_usage ADD COLUMN baseline_bytes INTEGER DEFAULT 0' },
      { col: 'baseline_updated_at', table: 'site_usage', sql: 'ALTER TABLE site_usage ADD COLUMN baseline_updated_at TEXT' },
      { col: 'row_size_bytes', table: 'site_media', sql: 'ALTER TABLE site_media ADD COLUMN row_size_bytes INTEGER DEFAULT 0' },
      { col: 'site_id', table: 'subscriptions', sql: 'ALTER TABLE subscriptions ADD COLUMN site_id TEXT' },
      { col: 'plan_tier', table: 'subscription_plans', sql: 'ALTER TABLE subscription_plans ADD COLUMN plan_tier INTEGER DEFAULT 0' },
      { col: 'currency', table: 'sites', sql: "ALTER TABLE sites ADD COLUMN currency TEXT DEFAULT 'INR'" },
    ];
    for (const m of migrations) {
      try {
        await env.DB.prepare(m.sql).run();
      } catch (e) {
      }
    }

    try {
      await env.DB.prepare(`UPDATE sites SET template_id = 'storefront' WHERE template_id = 'template1'`).run();
    } catch (e) {}

    await ensureSEOColumns(env);

    _initialized = true;
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization FAILED:', error.message || error);
    throw error;
  }
}
