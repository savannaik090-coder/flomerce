-- Migration to add categories table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    parent_id TEXT,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    UNIQUE(site_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_site ON categories(site_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(site_id, slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
