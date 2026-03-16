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
        custom_domain TEXT,
        domain_status TEXT,
        domain_verification_token TEXT,
        cf_hostname_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        parent_id TEXT,
        description TEXT,
        subtitle TEXT,
        show_on_home INTEGER DEFAULT 1,
        image_url TEXT,
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
        UNIQUE(site_id, slug)
      )`,

      `CREATE TABLE IF NOT EXISTS products (
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
      )`,

      `CREATE TABLE IF NOT EXISTS product_variants (
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
      )`,

      `CREATE TABLE IF NOT EXISTS addresses (
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
      )`,

      `CREATE TABLE IF NOT EXISTS carts (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        user_id TEXT,
        session_id TEXT,
        items TEXT NOT NULL DEFAULT '[]',
        subtotal REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS wishlists (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE(site_id, user_id, product_id)
      )`,

      `CREATE TABLE IF NOT EXISTS orders (
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
        coupon_code TEXT,
        notes TEXT,
        tracking_number TEXT,
        carrier TEXT,
        shipped_at TEXT,
        delivered_at TEXT,
        cancelled_at TEXT,
        cancellation_reason TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS guest_orders (
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
      )`,

      `CREATE TABLE IF NOT EXISTS site_customers (
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
      )`,

      `CREATE TABLE IF NOT EXISTS site_customer_sessions (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        site_id TEXT NOT NULL,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (customer_id) REFERENCES site_customers(id) ON DELETE CASCADE,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS customer_addresses (
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
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
      )`,

      `CREATE TABLE IF NOT EXISTS coupons (
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
      )`,

      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        user_id TEXT,
        push_token TEXT NOT NULL,
        endpoint TEXT,
        p256dh TEXT,
        auth TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS reviews (
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
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )`,

      `CREATE TABLE IF NOT EXISTS activity_log (
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
      'CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(site_id, slug)',
      'CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_site ON products(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_products_site_slug ON products(site_id, slug)',
      'CREATE INDEX IF NOT EXISTS idx_products_featured ON products(site_id, is_featured)',
      'CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_carts_site ON carts(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_wishlists_site ON wishlists(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_site ON orders(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(site_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(site_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_guest_orders_site ON guest_orders(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_guest_orders_number ON guest_orders(order_number)',
      'CREATE INDEX IF NOT EXISTS idx_site_customers_site ON site_customers(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_site_customers_email ON site_customers(site_id, email)',
      'CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON site_customer_sessions(token)',
      'CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON site_customer_sessions(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id)',
      'CREATE INDEX IF NOT EXISTS idx_customer_addresses_site ON customer_addresses(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_order ON payment_transactions(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_coupons_site ON coupons(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(site_id, code)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_site ON notifications(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_site ON reviews(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_site ON activity_log(site_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_custom_domain ON sites(custom_domain) WHERE custom_domain IS NOT NULL',
    ];

    for (const sql of tables) {
      await env.DB.prepare(sql).run();
    }

    for (const sql of indexes) {
      try {
        await env.DB.prepare(sql).run();
      } catch (e) {
        // Index might already exist or reference missing column - non-fatal
      }
    }

    const migrations = [
      { col: 'subtitle', sql: 'ALTER TABLE categories ADD COLUMN subtitle TEXT' },
      { col: 'show_on_home', sql: 'ALTER TABLE categories ADD COLUMN show_on_home INTEGER DEFAULT 1' },
      { col: 'custom_domain', sql: 'ALTER TABLE sites ADD COLUMN custom_domain TEXT' },
      { col: 'domain_status', sql: 'ALTER TABLE sites ADD COLUMN domain_status TEXT' },
      { col: 'domain_verification_token', sql: 'ALTER TABLE sites ADD COLUMN domain_verification_token TEXT' },
      { col: 'cf_hostname_id', sql: 'ALTER TABLE sites ADD COLUMN cf_hostname_id TEXT' },
      { col: 'coupon_code', table: 'orders', sql: 'ALTER TABLE orders ADD COLUMN coupon_code TEXT' },
      { col: 'role', table: 'users', sql: "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'" },
    ];
    for (const m of migrations) {
      try {
        await env.DB.prepare(m.sql).run();
      } catch (e) {
        // Column likely already exists
      }
    }

    try {
      const ownerCheck = await env.DB.prepare("SELECT id FROM users WHERE role = 'owner' LIMIT 1").first();
      if (!ownerCheck) {
        const firstUser = await env.DB.prepare("SELECT id FROM users ORDER BY created_at ASC LIMIT 1").first();
        if (firstUser) {
          await env.DB.prepare("UPDATE users SET role = 'owner' WHERE id = ?").bind(firstUser.id).run();
          console.log('Promoted first user to owner:', firstUser.id);
        }
      }
    } catch (e) {
      console.error('Owner bootstrap check failed (non-fatal):', e.message || e);
    }

    // Migration: Fix wishlists unique constraint to include site_id.
    try {
      const wishlistDef = await env.DB.prepare(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name='wishlists'`
      ).first();
      if (wishlistDef && wishlistDef.sql && !wishlistDef.sql.includes('site_id, user_id, product_id')) {
        await env.DB.prepare(`ALTER TABLE wishlists RENAME TO wishlists_old`).run();
        await env.DB.prepare(`
          CREATE TABLE wishlists (
            id TEXT PRIMARY KEY,
            site_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            UNIQUE(site_id, user_id, product_id)
          )
        `).run();
        await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id)`).run();
        await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_wishlists_site ON wishlists(site_id)`).run();
        await env.DB.prepare(`INSERT INTO wishlists SELECT * FROM wishlists_old`).run();
        await env.DB.prepare(`DROP TABLE wishlists_old`).run();
        console.log('Wishlists table migrated: unique constraint now includes site_id');
      }
    } catch (e) {
      console.error('Wishlists migration failed (non-fatal):', e.message || e);
    }

    // Migration: Remove incorrect FK on user_id from carts, orders, reviews,
    // payment_transactions, notifications, activity_log.
    // user_id in these tables can reference either users or site_customers,
    // so no single FK can be declared.
    const fkMigrations = [
      {
        table: 'carts',
        detect: `REFERENCES users`,
        create: `CREATE TABLE carts (
          id TEXT PRIMARY KEY, site_id TEXT NOT NULL, user_id TEXT,
          session_id TEXT, items TEXT NOT NULL DEFAULT '[]',
          subtotal REAL DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
        )`,
        indexes: [
          'CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id)',
          'CREATE INDEX IF NOT EXISTS idx_carts_site ON carts(site_id)',
        ],
      },
      {
        table: 'orders',
        detect: `REFERENCES users`,
        create: `CREATE TABLE orders (
          id TEXT PRIMARY KEY, site_id TEXT NOT NULL, user_id TEXT,
          order_number TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'pending',
          items TEXT NOT NULL, subtotal REAL NOT NULL, discount REAL DEFAULT 0,
          shipping_cost REAL DEFAULT 0, tax REAL DEFAULT 0, total REAL NOT NULL,
          currency TEXT DEFAULT 'INR', payment_method TEXT,
          payment_status TEXT DEFAULT 'pending', payment_id TEXT,
          razorpay_order_id TEXT, razorpay_payment_id TEXT, razorpay_signature TEXT,
          shipping_address TEXT NOT NULL, billing_address TEXT,
          customer_name TEXT NOT NULL, customer_email TEXT,
          customer_phone TEXT NOT NULL, notes TEXT,
          tracking_number TEXT, carrier TEXT,
          shipped_at TEXT, delivered_at TEXT, cancelled_at TEXT, cancellation_reason TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
        )`,
        indexes: [
          'CREATE INDEX IF NOT EXISTS idx_orders_site ON orders(site_id)',
          'CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number)',
          'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(site_id, status)',
          'CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(site_id, created_at)',
        ],
      },
      {
        table: 'reviews',
        detect: `REFERENCES users`,
        create: `CREATE TABLE reviews (
          id TEXT PRIMARY KEY, site_id TEXT NOT NULL, product_id TEXT NOT NULL,
          user_id TEXT, customer_name TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
          title TEXT, content TEXT, images TEXT,
          is_verified INTEGER DEFAULT 0, is_approved INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
        )`,
        indexes: [
          'CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)',
          'CREATE INDEX IF NOT EXISTS idx_reviews_site ON reviews(site_id)',
        ],
      },
      {
        table: 'payment_transactions',
        detect: `REFERENCES users`,
        create: `CREATE TABLE payment_transactions (
          id TEXT PRIMARY KEY, site_id TEXT, user_id TEXT,
          order_id TEXT, subscription_id TEXT,
          razorpay_order_id TEXT, razorpay_payment_id TEXT, razorpay_signature TEXT,
          amount REAL NOT NULL, currency TEXT DEFAULT 'INR',
          status TEXT DEFAULT 'pending', payment_method TEXT,
          error_code TEXT, error_description TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
          FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
        )`,
        indexes: [
          'CREATE INDEX IF NOT EXISTS idx_transactions_order ON payment_transactions(order_id)',
          'CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id)',
        ],
      },
      {
        table: 'activity_log',
        detect: `REFERENCES users`,
        create: `CREATE TABLE activity_log (
          id TEXT PRIMARY KEY, site_id TEXT, user_id TEXT,
          action TEXT NOT NULL, entity_type TEXT, entity_id TEXT,
          details TEXT, ip_address TEXT, user_agent TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
        )`,
        indexes: [
          'CREATE INDEX IF NOT EXISTS idx_activity_site ON activity_log(site_id)',
          'CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at)',
        ],
      },
      {
        table: 'notifications',
        detect: `REFERENCES users`,
        create: `CREATE TABLE notifications (
          id TEXT PRIMARY KEY, site_id TEXT NOT NULL, user_id TEXT,
          push_token TEXT NOT NULL, endpoint TEXT, p256dh TEXT, auth TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
        )`,
        indexes: [
          'CREATE INDEX IF NOT EXISTS idx_notifications_site ON notifications(site_id)',
          'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
        ],
      },
    ];

    for (const mig of fkMigrations) {
      try {
        const def = await env.DB.prepare(
          `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`
        ).bind(mig.table).first();
        if (def && def.sql && def.sql.includes(mig.detect)) {
          await env.DB.prepare(`ALTER TABLE ${mig.table} RENAME TO ${mig.table}_old`).run();
          await env.DB.prepare(mig.create).run();
          for (const idx of mig.indexes) {
            try { await env.DB.prepare(idx).run(); } catch (_) {}
          }
          await env.DB.prepare(`INSERT INTO ${mig.table} SELECT * FROM ${mig.table}_old`).run();
          await env.DB.prepare(`DROP TABLE ${mig.table}_old`).run();
          console.log(`${mig.table} table migrated: removed incorrect user_id FK`);
        }
      } catch (e) {
        console.error(`${mig.table} FK migration failed (non-fatal):`, e.message || e);
      }
    }

    await ensureSEOColumns(env);

    _initialized = true;
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization FAILED:', error.message || error);
    throw error;
  }
}
