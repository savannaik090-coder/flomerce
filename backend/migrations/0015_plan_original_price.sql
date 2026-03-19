-- Add original_price column for discount/strikethrough pricing
ALTER TABLE subscription_plans ADD COLUMN original_price REAL DEFAULT NULL;
