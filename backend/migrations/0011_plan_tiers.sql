-- Add plan_tier column to subscription_plans for tier hierarchy
ALTER TABLE subscription_plans ADD COLUMN plan_tier INTEGER DEFAULT 1;
