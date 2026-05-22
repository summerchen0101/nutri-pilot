-- 商城 CMS：分類主檔、分類 Banner、首頁 Banner staff 維護、運送方式 staff 更新

-- -----------------------------------------------------------------------------
-- shop_categories
-- -----------------------------------------------------------------------------
CREATE TABLE shop_categories (
  slug         TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  icon_key     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX shop_categories_active_sort_idx
  ON shop_categories (is_active, sort_order ASC);

CREATE TRIGGER shop_categories_updated_at
BEFORE UPDATE ON shop_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE shop_categories IS '商城商品分類主檔；products.category 參照 slug';
COMMENT ON COLUMN shop_categories.icon_key IS 'Lucide 圖示鍵：nuts, protein_bar, supplement, drink, snack, meal_replacement, default';

INSERT INTO shop_categories (slug, label, sort_order, icon_key) VALUES
  ('nuts', '堅果', 0, 'nuts'),
  ('protein_bar', '蛋白棒', 1, 'protein_bar'),
  ('supplement', '保健品', 2, 'supplement'),
  ('drink', '飲品', 3, 'drink'),
  ('snack', '點心', 4, 'snack'),
  ('meal_replacement', '代餐', 5, 'meal_replacement');

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check;

ALTER TABLE products
  ADD CONSTRAINT products_category_fkey
  FOREIGN KEY (category) REFERENCES shop_categories(slug) ON DELETE RESTRICT;

-- -----------------------------------------------------------------------------
-- shop_category_banners
-- -----------------------------------------------------------------------------
CREATE TABLE shop_category_banners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug   TEXT NOT NULL REFERENCES shop_categories(slug) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  subtitle        TEXT,
  image_url       TEXT,
  href            TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX shop_category_banners_active_idx
  ON shop_category_banners (category_slug, is_active, sort_order ASC);

CREATE TRIGGER shop_category_banners_updated_at
BEFORE UPDATE ON shop_category_banners
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: shop_categories
-- -----------------------------------------------------------------------------
ALTER TABLE shop_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active shop_categories"
ON shop_categories FOR SELECT
TO authenticated
USING (is_active = TRUE);

CREATE POLICY "Staff editors select all shop_categories"
ON shop_categories FOR SELECT
TO authenticated
USING (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors insert shop_categories"
ON shop_categories FOR INSERT
TO authenticated
WITH CHECK (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors update shop_categories"
ON shop_categories FOR UPDATE
TO authenticated
USING (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'))
WITH CHECK (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'));

CREATE POLICY "Super admin delete shop_categories"
ON shop_categories FOR DELETE
TO authenticated
USING (coalesce(public.current_admin_role(), '') = 'super_admin');

-- -----------------------------------------------------------------------------
-- RLS: shop_category_banners
-- -----------------------------------------------------------------------------
ALTER TABLE shop_category_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active shop_category_banners"
ON shop_category_banners FOR SELECT
TO authenticated
USING (is_active = TRUE);

CREATE POLICY "Staff editors select all shop_category_banners"
ON shop_category_banners FOR SELECT
TO authenticated
USING (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors insert shop_category_banners"
ON shop_category_banners FOR INSERT
TO authenticated
WITH CHECK (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors update shop_category_banners"
ON shop_category_banners FOR UPDATE
TO authenticated
USING (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'))
WITH CHECK (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'));

CREATE POLICY "Super admin delete shop_category_banners"
ON shop_category_banners FOR DELETE
TO authenticated
USING (coalesce(public.current_admin_role(), '') = 'super_admin');

-- -----------------------------------------------------------------------------
-- RLS: shop_home_banners (staff 維護；一般使用者沿用 032 唯讀 active)
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff editors select all shop_home_banners"
ON shop_home_banners FOR SELECT
TO authenticated
USING (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors insert shop_home_banners"
ON shop_home_banners FOR INSERT
TO authenticated
WITH CHECK (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors update shop_home_banners"
ON shop_home_banners FOR UPDATE
TO authenticated
USING (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'))
WITH CHECK (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'));

CREATE POLICY "Super admin delete shop_home_banners"
ON shop_home_banners FOR DELETE
TO authenticated
USING (coalesce(public.current_admin_role(), '') = 'super_admin');

-- -----------------------------------------------------------------------------
-- RLS: vendor_shipping_methods (staff 查全部；super_admin 可更新)
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff editors select all vendor_shipping_methods"
ON vendor_shipping_methods FOR SELECT
TO authenticated
USING (coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor'));

CREATE POLICY "Super admin update vendor_shipping_methods"
ON vendor_shipping_methods FOR UPDATE
TO authenticated
USING (coalesce(public.current_admin_role(), '') = 'super_admin')
WITH CHECK (coalesce(public.current_admin_role(), '') = 'super_admin');
