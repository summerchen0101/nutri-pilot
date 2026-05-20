-- 後台商品手動排序（前台商城預設順序）

ALTER TABLE products
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at DESC NULLS LAST, id ASC) - 1 AS rn
  FROM products
)
UPDATE products AS p
SET sort_order = ranked.rn
FROM ranked
WHERE p.id = ranked.id;

CREATE INDEX products_sort_order_idx ON products (sort_order ASC);
