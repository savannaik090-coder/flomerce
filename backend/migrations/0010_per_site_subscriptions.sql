-- Add site_id column to subscriptions table for per-site subscription model
ALTER TABLE subscriptions ADD COLUMN site_id TEXT REFERENCES sites(id) ON DELETE CASCADE;

-- Create index for site-level subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_site ON subscriptions(site_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_site_status ON subscriptions(site_id, status);
