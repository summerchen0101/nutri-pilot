-- MVP: remove subscription price column from variants (single checkout only).
-- Seed file 008_shop_seed_catalog.sql was updated to omit sub_price in INSERTs.

ALTER TABLE product_variants DROP COLUMN IF EXISTS sub_price;
