-- 全家取貨付款（到店代收，對齊 seven_eleven_cod）
INSERT INTO vendor_shipping_methods (
  vendor_id,
  code,
  label,
  shipping_fee,
  free_shipping_threshold,
  sort_order
)
SELECT id,
  'family_mart_cod',
  '全家取貨付款',
  60,
  NULL,
  5
FROM vendors
ON CONFLICT (vendor_id, code) DO NOTHING;
