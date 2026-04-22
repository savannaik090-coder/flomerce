-- Per-site translator usage tracker. Used by the merchant settings UI to
-- display "this month: N characters translated" and by the translation
-- proxy to enforce a per-site daily character cap so a runaway shopper
-- (or scraper) can't burn through a merchant's free quota in one sitting.
--
-- year_month is stored as 'YYYY-MM' (UTC) so a single row rolls up the
-- whole month. char_count is the sum of source-text characters sent to
-- Microsoft after cache lookups (cached translations are NOT counted —
-- they don't bill the merchant).
CREATE TABLE IF NOT EXISTS site_translator_usage (
  site_id TEXT NOT NULL,
  year_month TEXT NOT NULL,
  char_count INTEGER NOT NULL DEFAULT 0,
  request_count INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (site_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_site_translator_usage_site
  ON site_translator_usage(site_id);
CREATE INDEX IF NOT EXISTS idx_site_translator_usage_month
  ON site_translator_usage(year_month);
