-- Phase 1 of the storefront translation fixes.
--
-- Persists the shopper's language preference so server-side senders
-- (transactional emails, WhatsApp templates, abandoned-cart cron) can
-- localise outbound copy even when the shopper has long closed the tab.
--
-- preferred_lang on site_customers — set on signup / verification /
--   forgot-password requests when the storefront posts `lang`. Used as
--   the fallback for any future per-customer notification (welcome
--   emails, marketing, etc.) and as the second fallback for abandoned
--   cart reminders when the cart row itself has no language hint.
--
-- language on carts — written on every cart create/update from the
--   storefront so abandoned-cart cron can recover the language without
--   having to look up a previous order. NULL means "no hint, fall back
--   to last order's placed_in_language, then English".
--
-- Both columns are nullable; absence falls through to English which is
-- the existing behaviour.

ALTER TABLE site_customers ADD COLUMN preferred_lang TEXT;
ALTER TABLE carts ADD COLUMN language TEXT;
