-- Phase A: per-key manual translation overrides (the "sticky bit").
--
-- A row in this table forces the cached locale catalog at (lang, path) to use
-- the operator-supplied `value` instead of whatever the auto-translator
-- produces. Overrides survive every regenerate path (incremental, force,
-- namespace-scoped, refresh-all) because i18n-worker re-applies them on top
-- of the freshly-translated catalog before writing back to R2.
--
-- Clearing an override (DELETE row) drops the manual value AND triggers a
-- one-shot re-translation of just that key, so the catalog stays consistent
-- with the auto path. Storage cost is negligible — D1 handles tens of
-- thousands of small rows easily.
CREATE TABLE IF NOT EXISTS i18n_overrides (
  lang        TEXT    NOT NULL,
  path        TEXT    NOT NULL,
  value       TEXT    NOT NULL,
  updated_at  INTEGER NOT NULL,
  updated_by  TEXT,
  PRIMARY KEY (lang, path)
);

-- Lookups inside regenerateIncremental are always (lang, *), and the PK
-- already covers that prefix. A separate lang index keeps "list overrides
-- for one locale" queries equally cheap on accounts that grow many entries.
CREATE INDEX IF NOT EXISTS idx_i18n_overrides_lang
  ON i18n_overrides (lang);
