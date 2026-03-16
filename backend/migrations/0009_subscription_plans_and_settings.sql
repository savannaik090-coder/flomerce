-- Subscription plans managed from admin panel
CREATE TABLE IF NOT EXISTS subscription_plans (
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
);

-- Platform settings (e.g., razorpay public key)
CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Add razorpay_subscription_id column to subscriptions if not exists
-- (already has it from previous migration, but ensure it's there)
