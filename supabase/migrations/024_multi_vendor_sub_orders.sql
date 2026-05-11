-- 多廠商代銷：vendors、vendor_users、sub_orders；brands 綁 vendor；orders 收件與運費快照；order_items.vendor_id / sub_order_id
-- @see docs/changes（實作後補 changelog）

-- -----------------------------------------------------------------------------
-- vendors
-- -----------------------------------------------------------------------------
CREATE TABLE vendors (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  slug                      TEXT NOT NULL UNIQUE,
  contact_email             TEXT,
  notification_email        TEXT,
  shipping_fee              NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_shipping_threshold   NUMERIC(10,2),
  lead_time_days            INT NOT NULL DEFAULT 3,
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE vendors IS '商城出貨廠商（代銷）；運費與免運門檻依廠商';
COMMENT ON COLUMN vendors.free_shipping_threshold IS 'NULL 表示無免運門檻（一律收 shipping_fee）';

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vendors"
ON vendors FOR SELECT
USING (is_active = true);

-- -----------------------------------------------------------------------------
-- vendor_users（Phase 2 廠商後台用；先建表與基本 policy）
-- -----------------------------------------------------------------------------
CREATE TABLE vendor_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id   UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member'
              CHECK (role IN ('owner', 'member')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, vendor_id)
);

COMMENT ON TABLE vendor_users IS '登入帳號與廠商的綁定；owner 可編輯廠商運費等（Phase 2）';

ALTER TABLE vendor_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own vendor_users"
ON vendor_users FOR SELECT
USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- sub_orders
-- -----------------------------------------------------------------------------
CREATE TABLE sub_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  vendor_id           UUID NOT NULL REFERENCES vendors(id),
  public_no           TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'confirmed'
                      CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled')),
  items_subtotal      NUMERIC(10,2) NOT NULL,
  shipping_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL,
  tracking_number     TEXT,
  shipping_carrier    TEXT,
  shipped_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sub_orders_vendor_id_status_idx ON sub_orders (vendor_id, status);
CREATE INDEX sub_orders_order_id_idx ON sub_orders (order_id);

COMMENT ON COLUMN sub_orders.public_no IS '對外子訂單編號，例如 SO-xxxxxxxx';
COMMENT ON COLUMN sub_orders.status IS 'confirmed=待出貨（付款完成後建立）';

ALTER TABLE sub_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sub_orders"
ON sub_orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = sub_orders.order_id AND o.user_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- brands → vendor
-- -----------------------------------------------------------------------------
ALTER TABLE brands
  ADD COLUMN vendor_id UUID REFERENCES vendors(id);

-- 種子廠商（對應 008_shop_seed_catalog 三個品牌 slug）
INSERT INTO vendors (id, name, slug, contact_email, notification_email, shipping_fee, free_shipping_threshold, lead_time_days, is_active)
VALUES
  (
    'c1000001-0000-4000-8000-000000000001',
    '堅果工坊',
    'vendor-seed-nut-studio',
    'vendor-nut@example.local',
    'vendor-nut@example.local',
    80,
    600,
    3,
    true
  ),
  (
    'c1000002-0000-4000-8000-000000000002',
    '輕享蛋白',
    'vendor-seed-lite-protein',
    'vendor-protein@example.local',
    'vendor-protein@example.local',
    80,
    600,
    3,
    true
  ),
  (
    'c1000003-0000-4000-8000-000000000003',
    '植粹生活館',
    'vendor-seed-plant-pure',
    'vendor-plant@example.local',
    'vendor-plant@example.local',
    80,
    600,
    3,
    true
  )
ON CONFLICT (slug) DO NOTHING;

UPDATE brands b
SET vendor_id = v.id
FROM vendors v
WHERE b.slug = 'seed-nut-studio' AND v.slug = 'vendor-seed-nut-studio';

UPDATE brands b
SET vendor_id = v.id
FROM vendors v
WHERE b.slug = 'seed-lite-protein' AND v.slug = 'vendor-seed-lite-protein';

UPDATE brands b
SET vendor_id = v.id
FROM vendors v
WHERE b.slug = 'seed-plant-pure' AND v.slug = 'vendor-seed-plant-pure';

-- -----------------------------------------------------------------------------
-- orders：收件快照、對外訂單號、金額拆分、結帳快照
-- -----------------------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN recipient_name TEXT,
  ADD COLUMN recipient_phone TEXT,
  ADD COLUMN recipient_address_full TEXT,
  ADD COLUMN public_order_no TEXT,
  ADD COLUMN items_subtotal NUMERIC(10,2),
  ADD COLUMN shipping_total NUMERIC(10,2),
  ADD COLUMN checkout_snapshot JSONB;

CREATE UNIQUE INDEX orders_public_order_no_ux
  ON orders (public_order_no)
  WHERE public_order_no IS NOT NULL;

COMMENT ON COLUMN orders.checkout_snapshot IS '建立付款時的廠商分攤與運費，供 notify 拆 sub_orders';
COMMENT ON COLUMN orders.public_order_no IS '對外主訂單編號，例如 NP-YYYYMMDD-xxxxxxxx';

-- -----------------------------------------------------------------------------
-- order_items：廠商與子訂單關聯
-- -----------------------------------------------------------------------------
ALTER TABLE order_items
  ADD COLUMN vendor_id UUID REFERENCES vendors(id),
  ADD COLUMN sub_order_id UUID REFERENCES sub_orders(id);

CREATE INDEX order_items_vendor_id_idx ON order_items (vendor_id);
CREATE INDEX order_items_sub_order_id_idx ON order_items (sub_order_id);

-- -----------------------------------------------------------------------------
-- user_profiles：預設配送資料
-- -----------------------------------------------------------------------------
ALTER TABLE user_profiles
  ADD COLUMN shipping_recipient_name TEXT,
  ADD COLUMN shipping_phone TEXT,
  ADD COLUMN shipping_address_full TEXT;

COMMENT ON COLUMN user_profiles.shipping_recipient_name IS '購物車／結帳預設收件人';
