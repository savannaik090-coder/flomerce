-- Fix wishlist unique constraint: must include site_id so the same product
-- can exist in a user's wishlist on different stores independently.
-- Also removes the incorrect FK on user_id (which can be from either users
-- or site_customers, SQLite FK only supports one table).

-- Step 1: Recreate wishlists with correct unique constraint
ALTER TABLE wishlists RENAME TO wishlists_old;

CREATE TABLE IF NOT EXISTS wishlists (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(site_id, user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_site ON wishlists(site_id);

INSERT INTO wishlists SELECT * FROM wishlists_old;

DROP TABLE wishlists_old;

-- Step 2: Recreate carts table without the incorrect FK on user_id.
-- user_id in carts can reference either users (platform owners) or
-- site_customers (storefront shoppers), so no FK can be declared here.

ALTER TABLE carts RENAME TO carts_old;

CREATE TABLE IF NOT EXISTS carts (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT,
    items TEXT NOT NULL DEFAULT '[]',
    subtotal REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_carts_site ON carts(site_id);

INSERT INTO carts SELECT * FROM carts_old;

DROP TABLE carts_old;
