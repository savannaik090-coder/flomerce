-- Adds the merchant-authored content language for each site. This is the
-- foundational column that downstream features depend on:
--   * The storefront uses it to default shoppers to the merchant's language.
--   * The merchant translation proxy uses it (or 'auto') as the source language.
--   * The wizard seed-data task localises default categories and SEO templates
--     against it.
--
-- Existing rows default to 'en' so the migration is safe to backfill.
ALTER TABLE sites ADD COLUMN content_language TEXT NOT NULL DEFAULT 'en';
CREATE INDEX IF NOT EXISTS idx_sites_content_language ON sites(content_language);
