-- Rename template_id from 'template1' to 'storefront' for all existing sites
UPDATE sites SET template_id = 'storefront' WHERE template_id = 'template1';
