-- 每廠商多運送方式（運費／免運門檻分立）；種子將既有 vendors.* 對應到「宅配」列並加「自取」備選。
-- -----------------------------------------------------------------------------
CREATE TABLE vendor_shipping_methods (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id                 UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  code                      TEXT NOT NULL,
  label                     TEXT NOT NULL,
  shipping_fee              NUMERIC(10, 2) NOT NULL DEFAULT 0,
  free_shipping_threshold   NUMERIC(10, 2),
  sort_order                INT NOT NULL DEFAULT 0,
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_id, code)
);

CREATE INDEX vendor_shipping_methods_vendor_id_active_idx
  ON vendor_shipping_methods (vendor_id)
  WHERE is_active = TRUE;

COMMENT ON TABLE vendor_shipping_methods IS '廠商可選運送方式；結帳以 method 列計費並寫入 snapshot';
COMMENT ON COLUMN vendor_shipping_methods.code IS '穩定內碼（單廠唯一），例 home_delivery、store_pickup';
COMMENT ON COLUMN vendors.shipping_fee IS 'Deprecated：請改讀 vendor_shipping_methods（保留向後相容與種子來源）。';

ALTER TABLE vendor_shipping_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view methods for active vendors"
ON vendor_shipping_methods FOR SELECT
USING (
  is_active = TRUE AND EXISTS (
    SELECT 1 FROM vendors v
    WHERE v.id = vendor_shipping_methods.vendor_id AND v.is_active = TRUE
  )
);

INSERT INTO vendor_shipping_methods (vendor_id, code, label, shipping_fee, free_shipping_threshold, sort_order)
SELECT id, 'home_delivery', '宅配', shipping_fee, free_shipping_threshold, 0
FROM vendors;

INSERT INTO vendor_shipping_methods (vendor_id, code, label, shipping_fee, free_shipping_threshold, sort_order)
SELECT id, 'store_pickup', '門市自取', 0, NULL, 1
FROM vendors;
