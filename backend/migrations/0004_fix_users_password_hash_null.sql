-- Migration to allow NULL password_hash for Google users
-- This fixes the D1_ERROR: NOT NULL constraint failed: users.password_hash

-- 1. Create a temporary table with the new schema
CREATE TABLE users_new (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT, -- Removed NOT NULL
    name TEXT NOT NULL,
    phone TEXT,
    email_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. Copy data from the old table to the new one
INSERT INTO users_new (id, email, password_hash, name, phone, email_verified, created_at, updated_at)
SELECT id, email, password_hash, name, phone, email_verified, created_at, updated_at FROM users;

-- 3. Drop the old table
DROP TABLE users;

-- 4. Rename the new table to the original name
ALTER TABLE users_new RENAME TO users;

-- 5. Re-create the index
CREATE INDEX idx_users_email ON users(email);
