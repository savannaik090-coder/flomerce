-- Phase D: platform-wide Translation Memory.
--
-- Every (source_text, target_lang) pair the platform translator ever produces
-- is recorded here, keyed by a SHA-256 fingerprint of the source text. On
-- each translateBatch() call, System A first looks up the hashes in this
-- table; cache hits skip the Microsoft API entirely, while misses are
-- translated and stored for next time.
--
-- The translator pipeline collapses placeholders into <span class="notranslate">
-- wrappers BEFORE this layer sees them, so identical i18next strings produce
-- identical hashes regardless of which {{token}} appears inside. That's
-- intentional — TM is a content cache, not a per-call cache.
--
-- Rows are platform-shared (no merchant scoping). System B, which uses
-- per-merchant credentials and has different quality/billing requirements,
-- intentionally bypasses TM and translates every shopper request fresh.
CREATE TABLE IF NOT EXISTS translation_memory (
  source_hash      TEXT    NOT NULL,
  target_lang      TEXT    NOT NULL,
  source_text      TEXT    NOT NULL,
  translated_text  TEXT    NOT NULL,
  hit_count        INTEGER NOT NULL DEFAULT 1,
  created_at       INTEGER NOT NULL,
  last_used_at     INTEGER NOT NULL,
  PRIMARY KEY (source_hash, target_lang)
);

-- Per-language admin stats query ("how much has TM saved us in Hindi?")
-- scans by target_lang only.
CREATE INDEX IF NOT EXISTS idx_tm_lang
  ON translation_memory (target_lang);

-- Future LRU eviction or "stale entry" cleanup will scan by last_used_at.
CREATE INDEX IF NOT EXISTS idx_tm_last_used
  ON translation_memory (last_used_at);
