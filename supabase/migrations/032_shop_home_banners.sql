-- 商城首頂 Banner（前台僅讀；維護請用 Supabase Studio service_role 或後台後續功能）

CREATE TABLE shop_home_banners (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  subtitle     TEXT,
  image_url    TEXT,
  href         TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX shop_home_banners_active_sort_idx
  ON shop_home_banners (is_active, sort_order ASC);

CREATE TRIGGER shop_home_banners_updated_at
BEFORE UPDATE ON shop_home_banners
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE shop_home_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read active shop_home_banners"
ON shop_home_banners FOR SELECT
TO authenticated
USING (is_active = TRUE);
