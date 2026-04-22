let _initialized = false;

async function migrateSitesTable(env) {
  try {
    const done = await env.DB.prepare(
      "SELECT setting_value FROM platform_settings WHERE setting_key = 'sites_table_migrated_v2'"
    ).first();
    if (done) return;
  } catch (e) {}

  try {
    const colCheck = await env.DB.prepare("PRAGMA table_info(sites)").all();
    const columns = (colCheck.results || []).map(c => c.name);
    if (!columns.includes('logo_url') && !columns.includes('settings')) {
      try {
        await env.DB.prepare(
          "INSERT INTO platform_settings (setting_key, setting_value) VALUES ('sites_table_migrated_v2', '1') ON CONFLICT(setting_key) DO UPDATE SET setting_value = '1'"
        ).run();
      } catch (e) {}
      return;
    }

    const keepCols = [
      'id', 'user_id', 'subdomain', 'brand_name', 'category', 'template_id',
      'is_active', 'subscription_plan', 'subscription_expires_at',
      'custom_domain', 'domain_status', 'domain_verification_token', 'cf_hostname_id',
      'shard_id', 'migration_locked', 'd1_database_id', 'd1_binding_name',
      'content_language',
      'created_at', 'updated_at'
    ];
    const existingKeep = keepCols.filter(c => columns.includes(c));
    const colList = existingKeep.join(', ');

    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sites_clean (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      subdomain TEXT UNIQUE NOT NULL,
      brand_name TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      template_id TEXT DEFAULT 'storefront',
      is_active INTEGER DEFAULT 1,
      subscription_plan TEXT DEFAULT 'free',
      subscription_expires_at TEXT,
      custom_domain TEXT,
      domain_status TEXT,
      domain_verification_token TEXT,
      cf_hostname_id TEXT,
      shard_id TEXT,
      migration_locked INTEGER DEFAULT 0,
      d1_database_id TEXT,
      d1_binding_name TEXT,
      content_language TEXT NOT NULL DEFAULT 'en',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`).run();

    await env.DB.prepare(`INSERT INTO sites_clean (${colList}) SELECT ${colList} FROM sites`).run();

    await env.DB.prepare('DROP TABLE sites').run();
    await env.DB.prepare('ALTER TABLE sites_clean RENAME TO sites').run();

    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_subdomain ON sites(subdomain)').run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(user_id)').run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_custom_domain ON sites(custom_domain)').run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_shard ON sites(shard_id)').run();
    await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sites_content_language ON sites(content_language)').run();

    await env.DB.prepare(
      "INSERT INTO platform_settings (setting_key, setting_value) VALUES ('sites_table_migrated_v2', '1') ON CONFLICT(setting_key) DO UPDATE SET setting_value = '1'"
    ).run();

    console.log('Sites table migrated: removed unused config columns');
  } catch (e) {
    console.error('Sites table migration error:', e.message || e);
  }
}

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
        is_active INTEGER DEFAULT 1,
        subscription_plan TEXT DEFAULT 'free',
        subscription_expires_at TEXT,
        custom_domain TEXT,
        domain_status TEXT,
        domain_verification_token TEXT,
        cf_hostname_id TEXT,
        shard_id TEXT,
        migration_locked INTEGER DEFAULT 0,
        d1_database_id TEXT,
        d1_binding_name TEXT,
        content_language TEXT NOT NULL DEFAULT 'en',
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
        original_price REAL DEFAULT NULL,
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

      `CREATE TABLE IF NOT EXISTS processed_webhooks (
        event_id TEXT PRIMARY KEY,
        event_type TEXT,
        processed_at TEXT DEFAULT (datetime('now'))
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

      `CREATE TABLE IF NOT EXISTS system_flags (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
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
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_razorpay_sub ON subscriptions(razorpay_subscription_id) WHERE razorpay_subscription_id IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_transactions_order ON payment_transactions(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_custom_domain ON sites(custom_domain) WHERE custom_domain IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_site_media_site ON site_media(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_site_media_key ON site_media(storage_key)',
      'CREATE INDEX IF NOT EXISTS idx_processed_webhooks_at ON processed_webhooks(processed_at)',
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

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS enterprise_sites (
        site_id TEXT PRIMARY KEY,
        assigned_at TEXT DEFAULT (datetime('now')),
        assigned_by TEXT,
        notes TEXT,
        d1_bytes_limit INTEGER,
        r2_bytes_limit INTEGER,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )
    `).run();

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS enterprise_usage_monthly (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT NOT NULL,
        year_month TEXT NOT NULL,
        d1_overage_bytes INTEGER DEFAULT 0,
        r2_overage_bytes INTEGER DEFAULT 0,
        d1_cost_inr REAL DEFAULT 0,
        r2_cost_inr REAL DEFAULT 0,
        total_cost_inr REAL DEFAULT 0,
        status TEXT DEFAULT 'unpaid',
        paid_at TEXT,
        notes TEXT,
        snapshot_at TEXT DEFAULT (datetime('now')),
        invoice_number TEXT,
        due_date TEXT,
        invoice_token TEXT,
        payment_ref TEXT,
        payment_method TEXT,
        razorpay_order_id TEXT,
        d1_limit_bytes INTEGER,
        r2_limit_bytes INTEGER,
        emailed_at TEXT,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        UNIQUE(site_id, year_month)
      )
    `).run();

    const migrations = [
      { col: 'role', table: 'users', sql: "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'" },
      { col: 'baseline_bytes', table: 'site_usage', sql: 'ALTER TABLE site_usage ADD COLUMN baseline_bytes INTEGER DEFAULT 0' },
      { col: 'baseline_updated_at', table: 'site_usage', sql: 'ALTER TABLE site_usage ADD COLUMN baseline_updated_at TEXT' },
      { col: 'row_size_bytes', table: 'site_media', sql: 'ALTER TABLE site_media ADD COLUMN row_size_bytes INTEGER DEFAULT 0' },
      { col: 'site_id', table: 'subscriptions', sql: 'ALTER TABLE subscriptions ADD COLUMN site_id TEXT' },
      { col: 'plan_tier', table: 'subscription_plans', sql: 'ALTER TABLE subscription_plans ADD COLUMN plan_tier INTEGER DEFAULT 0' },
      { col: 'original_price', table: 'subscription_plans', sql: 'ALTER TABLE subscription_plans ADD COLUMN original_price REAL DEFAULT NULL' },
      { col: 'tagline', table: 'subscription_plans', sql: 'ALTER TABLE subscription_plans ADD COLUMN tagline TEXT DEFAULT NULL' },
      { col: 'staff_id', table: 'site_admin_sessions', sql: 'ALTER TABLE site_admin_sessions ADD COLUMN staff_id TEXT' },
      { col: 'permissions', table: 'site_admin_sessions', sql: 'ALTER TABLE site_admin_sessions ADD COLUMN permissions TEXT' },
      { col: 'd1_bytes_limit', table: 'enterprise_sites', sql: 'ALTER TABLE enterprise_sites ADD COLUMN d1_bytes_limit INTEGER' },
      { col: 'r2_bytes_limit', table: 'enterprise_sites', sql: 'ALTER TABLE enterprise_sites ADD COLUMN r2_bytes_limit INTEGER' },
      { col: 'invoice_number', table: 'enterprise_usage_monthly', sql: 'ALTER TABLE enterprise_usage_monthly ADD COLUMN invoice_number TEXT' },
      { col: 'due_date', table: 'enterprise_usage_monthly', sql: 'ALTER TABLE enterprise_usage_monthly ADD COLUMN due_date TEXT' },
      { col: 'invoice_token', table: 'enterprise_usage_monthly', sql: 'ALTER TABLE enterprise_usage_monthly ADD COLUMN invoice_token TEXT' },
      { col: 'payment_ref', table: 'enterprise_usage_monthly', sql: 'ALTER TABLE enterprise_usage_monthly ADD COLUMN payment_ref TEXT' },
      { col: 'payment_method', table: 'enterprise_usage_monthly', sql: 'ALTER TABLE enterprise_usage_monthly ADD COLUMN payment_method TEXT' },
      { col: 'razorpay_order_id', table: 'enterprise_usage_monthly', sql: 'ALTER TABLE enterprise_usage_monthly ADD COLUMN razorpay_order_id TEXT' },
      { col: 'd1_limit_bytes', table: 'enterprise_usage_monthly', sql: 'ALTER TABLE enterprise_usage_monthly ADD COLUMN d1_limit_bytes INTEGER' },
      { col: 'r2_limit_bytes', table: 'enterprise_usage_monthly', sql: 'ALTER TABLE enterprise_usage_monthly ADD COLUMN r2_limit_bytes INTEGER' },
      { col: 'emailed_at', table: 'enterprise_usage_monthly', sql: 'ALTER TABLE enterprise_usage_monthly ADD COLUMN emailed_at TEXT' },
      // 0017_add_site_content_language: merchant-authored content language per site.
      { col: 'content_language', table: 'sites', sql: "ALTER TABLE sites ADD COLUMN content_language TEXT NOT NULL DEFAULT 'en'" },
      // 0018_add_site_translator_keys: per-site Microsoft Translator credentials.
      { col: 'translator_api_key_encrypted', table: 'sites', sql: 'ALTER TABLE sites ADD COLUMN translator_api_key_encrypted TEXT' },
      { col: 'translator_region', table: 'sites', sql: 'ALTER TABLE sites ADD COLUMN translator_region TEXT' },
      { col: 'translator_enabled', table: 'sites', sql: 'ALTER TABLE sites ADD COLUMN translator_enabled INTEGER DEFAULT 0' },
      { col: 'translator_languages', table: 'sites', sql: 'ALTER TABLE sites ADD COLUMN translator_languages TEXT' },
    ];
    for (const m of migrations) {
      try {
        await env.DB.prepare(m.sql).run();
      } catch (e) {
      }
    }

    // Hot-path indexes for invoice lookup (public token-gated page) and
    // Razorpay webhook order-id reverse lookup. Must run AFTER the migrations
    // loop because on databases that pre-date 0016 these columns don't exist
    // until the ALTER TABLE migrations above have applied. Each index is
    // wrapped so a failure on one doesn't abort the whole init.
    for (const ix of [
      `CREATE INDEX IF NOT EXISTS idx_enterprise_usage_invoice_number ON enterprise_usage_monthly(invoice_number)`,
      `CREATE INDEX IF NOT EXISTS idx_enterprise_usage_invoice_token ON enterprise_usage_monthly(invoice_token)`,
      `CREATE INDEX IF NOT EXISTS idx_enterprise_usage_razorpay_order ON enterprise_usage_monthly(razorpay_order_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sites_content_language ON sites(content_language)`,
    ]) {
      try { await env.DB.prepare(ix).run(); } catch (e) { /* index is best-effort */ }
    }

    try {
      await env.DB.prepare(`UPDATE sites SET template_id = 'storefront' WHERE template_id = 'template1'`).run();
    } catch (e) {}

    await migrateSitesTable(env);

    try {
      const shards = await env.DB.prepare('SELECT id, binding_name FROM shards').all();
      for (const shard of (shards.results || [])) {
        const shardDB = env[shard.binding_name];
        if (shardDB) {
          try {
            await shardDB.prepare(`CREATE TABLE IF NOT EXISTS site_config (
              site_id TEXT PRIMARY KEY,
              brand_name TEXT,
              category TEXT,
              logo_url TEXT,
              favicon_url TEXT,
              primary_color TEXT DEFAULT '#000000',
              secondary_color TEXT DEFAULT '#ffffff',
              phone TEXT,
              email TEXT,
              address TEXT,
              social_links TEXT,
              settings TEXT DEFAULT '{}',
              currency TEXT DEFAULT 'INR',
              seo_title TEXT,
              seo_description TEXT,
              seo_og_image TEXT,
              seo_robots TEXT DEFAULT 'index, follow',
              google_verification TEXT,
              og_title TEXT,
              og_description TEXT,
              og_image TEXT,
              og_type TEXT DEFAULT 'website',
              twitter_card TEXT DEFAULT 'summary_large_image',
              twitter_title TEXT,
              twitter_description TEXT,
              twitter_image TEXT,
              twitter_site TEXT,
              row_size_bytes INTEGER DEFAULT 0,
              created_at TEXT DEFAULT (datetime('now')),
              updated_at TEXT DEFAULT (datetime('now'))
            )`).run();
          } catch (e) {
            console.error(`Failed to ensure site_config on shard ${shard.binding_name}:`, e.message || e);
          }

          const shardMigrations = [
            'ALTER TABLE site_config ADD COLUMN seo_keywords TEXT',
            'ALTER TABLE products ADD COLUMN seo_keywords TEXT',
            'ALTER TABLE categories ADD COLUMN seo_keywords TEXT',
            'ALTER TABLE page_seo ADD COLUMN seo_keywords TEXT',
            'ALTER TABLE blog_posts ADD COLUMN seo_keywords TEXT',
            'ALTER TABLE blog_posts ADD COLUMN featured_image TEXT',
            'ALTER TABLE blog_posts ADD COLUMN author_name TEXT',
            'ALTER TABLE blog_posts ADD COLUMN seo_title TEXT',
            'ALTER TABLE blog_posts ADD COLUMN seo_description TEXT',
            'ALTER TABLE blog_posts ADD COLUMN seo_og_image TEXT',
          ];
          for (const sql of shardMigrations) {
            try { await shardDB.prepare(sql).run(); } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error('Shard site_config migration error (non-fatal):', e.message || e);
    }

    _initialized = true;
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization FAILED:', error.message || error);
    throw error;
  }
}
