-- Adds invoice metadata + payment tracking to monthly overage rows so each
-- snapshot doubles as a payable invoice. Also adds per-site quota overrides
-- so support can grant a higher included quota than the plan default without
-- touching code.

ALTER TABLE enterprise_usage_monthly ADD COLUMN invoice_number TEXT;
ALTER TABLE enterprise_usage_monthly ADD COLUMN due_date TEXT;
ALTER TABLE enterprise_usage_monthly ADD COLUMN invoice_token TEXT;
ALTER TABLE enterprise_usage_monthly ADD COLUMN payment_ref TEXT;
ALTER TABLE enterprise_usage_monthly ADD COLUMN payment_method TEXT;
ALTER TABLE enterprise_usage_monthly ADD COLUMN razorpay_order_id TEXT;
ALTER TABLE enterprise_usage_monthly ADD COLUMN d1_limit_bytes INTEGER;
ALTER TABLE enterprise_usage_monthly ADD COLUMN r2_limit_bytes INTEGER;
ALTER TABLE enterprise_usage_monthly ADD COLUMN emailed_at TEXT;

ALTER TABLE enterprise_sites ADD COLUMN d1_bytes_limit INTEGER;
ALTER TABLE enterprise_sites ADD COLUMN r2_bytes_limit INTEGER;

CREATE INDEX IF NOT EXISTS idx_enterprise_usage_invoice_number ON enterprise_usage_monthly(invoice_number);
CREATE INDEX IF NOT EXISTS idx_enterprise_usage_invoice_token ON enterprise_usage_monthly(invoice_token);
CREATE INDEX IF NOT EXISTS idx_enterprise_usage_razorpay_order ON enterprise_usage_monthly(razorpay_order_id);
