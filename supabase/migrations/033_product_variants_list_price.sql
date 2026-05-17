-- Optional list (compare-at) price for catalog strikethrough UI. Checkout still uses `price`.
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS list_price NUMERIC(8,2);

COMMENT ON COLUMN product_variants.list_price IS
  'Optional original/list price for display; when NOT NULL and greater than price, UI may show strikethrough. Sale price remains `price`.';
