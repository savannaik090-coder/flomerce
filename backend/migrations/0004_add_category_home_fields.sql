-- Migration to add subtitle and show_on_home fields to categories table
ALTER TABLE categories ADD COLUMN subtitle TEXT DEFAULT NULL;
ALTER TABLE categories ADD COLUMN show_on_home INTEGER DEFAULT 1;

-- Backfill: child categories should not show on homepage by default
UPDATE categories SET show_on_home = 0 WHERE parent_id IS NOT NULL;
