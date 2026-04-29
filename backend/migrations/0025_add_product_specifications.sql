-- Phase 3: flexible category-agnostic product specifications.
--
-- Stored as a JSON array of { label, value } pairs so merchants in any vertical
-- (jewellery, fashion, electronics, home) can publish whichever attributes
-- matter for their catalog without us hard-coding a column per vertical.
--
-- Capped at 20 rows in the admin UI; rendered on the PDP inside the existing
-- "Specifications" panel after the built-in weight/dimensions rows.
ALTER TABLE products ADD COLUMN specifications TEXT;
