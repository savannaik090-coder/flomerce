-- Migration: Add per-site storage usage tracking tables
-- Date: March 2026

CREATE TABLE IF NOT EXISTS site_usage (
    site_id TEXT PRIMARY KEY,
    d1_bytes_used INTEGER DEFAULT 0,
    r2_bytes_used INTEGER DEFAULT 0,
    last_updated TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS site_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id TEXT NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    size_bytes INTEGER NOT NULL,
    media_type TEXT DEFAULT 'image',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_site_media_site ON site_media(site_id);
CREATE INDEX IF NOT EXISTS idx_site_media_key ON site_media(storage_key);
