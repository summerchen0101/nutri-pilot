-- Seed promo display: set list_price on known Phase-4 catalog variant UUIDs from 008_shop_seed_catalog.
-- Only affects rows with these ids; other environments keep NULL list_price.
-- Requires column product_variants.list_price (migration 033).

UPDATE product_variants SET list_price = 399.00
WHERE id = 'c1000001-0000-4000-8000-000000000001';

UPDATE product_variants SET list_price = 899.00
WHERE id = 'c1000005-0000-4000-8000-000000000005';

UPDATE product_variants SET list_price = 1180.00
WHERE id = 'c1000008-0000-4000-8000-000000000008';

UPDATE product_variants SET list_price = 650.00
WHERE id = 'c1000013-0000-4000-8000-000000000013';

UPDATE product_variants SET list_price = 1690.00
WHERE id = 'c1000016-0000-4000-8000-800000000016';
