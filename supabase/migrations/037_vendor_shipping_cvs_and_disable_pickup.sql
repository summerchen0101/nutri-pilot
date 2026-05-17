-- 停用門市自取；為每廠商種子 7-11／全家超取（運費 NT$ 60）。
-- -----------------------------------------------------------------------------
UPDATE vendor_shipping_methods
SET is_active = FALSE
WHERE code = 'store_pickup';

INSERT INTO vendor_shipping_methods (
  vendor_id,
  code,
  label,
  shipping_fee,
  free_shipping_threshold,
  sort_order
)
SELECT id,
  'seven_eleven_pickup',
  '7-11 取貨',
  60,
  NULL,
  2
FROM vendors
ON CONFLICT (vendor_id, code) DO NOTHING;

INSERT INTO vendor_shipping_methods (
  vendor_id,
  code,
  label,
  shipping_fee,
  free_shipping_threshold,
  sort_order
)
SELECT id,
  'seven_eleven_cod',
  '7-11 取貨付款',
  60,
  NULL,
  3
FROM vendors
ON CONFLICT (vendor_id, code) DO NOTHING;

INSERT INTO vendor_shipping_methods (
  vendor_id,
  code,
  label,
  shipping_fee,
  free_shipping_threshold,
  sort_order
)
SELECT id,
  'family_mart_pickup',
  '全家取貨',
  60,
  NULL,
  4
FROM vendors
ON CONFLICT (vendor_id, code) DO NOTHING;
