-- Remove incorrect FK on user_id from orders, reviews, payment_transactions,
-- notifications, and activity_log tables.
-- user_id in these tables can reference either users (platform owners) or
-- site_customers (storefront shoppers), so no single FK can be declared.

-- Step 1: Recreate orders without FK on user_id
ALTER TABLE orders RENAME TO orders_old;

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
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_site ON orders(site_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(site_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(site_id, created_at);

INSERT INTO orders SELECT * FROM orders_old;
DROP TABLE orders_old;

-- Step 2: Recreate reviews without FK on user_id
ALTER TABLE reviews RENAME TO reviews_old;

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
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_site ON reviews(site_id);

INSERT INTO reviews SELECT * FROM reviews_old;
DROP TABLE reviews_old;

-- Step 3: Recreate payment_transactions without FK on user_id
ALTER TABLE payment_transactions RENAME TO payment_transactions_old;

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
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_order ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id);

INSERT INTO payment_transactions SELECT * FROM payment_transactions_old;
DROP TABLE payment_transactions_old;

-- Step 4: Recreate activity_log without FK on user_id
ALTER TABLE activity_log RENAME TO activity_log_old;

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
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_site ON activity_log(site_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at);

INSERT INTO activity_log SELECT * FROM activity_log_old;
DROP TABLE activity_log_old;

-- Step 5: Recreate notifications without FK on user_id
ALTER TABLE notifications RENAME TO notifications_old;

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
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_site ON notifications(site_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

INSERT INTO notifications SELECT * FROM notifications_old;
DROP TABLE notifications_old;
