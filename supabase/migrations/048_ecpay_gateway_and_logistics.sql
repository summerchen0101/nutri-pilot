-- 綠界金流／物流：payment_gateway 預設、orders.metadata、sub_orders 物流欄位

ALTER TABLE orders
  ALTER COLUMN payment_gateway SET DEFAULT 'ecpay';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN orders.order_metadata IS '金流 callback、取號、綠界欄位等（JSONB）';

-- sub_orders：綠界 C2C 物流
ALTER TABLE sub_orders
  ADD COLUMN IF NOT EXISTS logistics_type TEXT
    CHECK (logistics_type IS NULL OR logistics_type IN ('CVS', 'HOME'));

ALTER TABLE sub_orders
  ADD COLUMN IF NOT EXISTS logistics_subtype TEXT;

ALTER TABLE sub_orders
  ADD COLUMN IF NOT EXISTS cvs_store_id TEXT;

ALTER TABLE sub_orders
  ADD COLUMN IF NOT EXISTS cvs_store_name TEXT;

ALTER TABLE sub_orders
  ADD COLUMN IF NOT EXISTS cvs_store_address TEXT;

ALTER TABLE sub_orders
  ADD COLUMN IF NOT EXISTS shipping_address TEXT;

ALTER TABLE sub_orders
  ADD COLUMN IF NOT EXISTS ecpay_logistics_trade_no TEXT;

ALTER TABLE sub_orders
  ADD COLUMN IF NOT EXISTS ecpay_logistics_meta JSONB;

CREATE INDEX IF NOT EXISTS sub_orders_ecpay_logistics_trade_no_idx
  ON sub_orders (ecpay_logistics_trade_no)
  WHERE ecpay_logistics_trade_no IS NOT NULL;

COMMENT ON COLUMN sub_orders.logistics_type IS 'CVS 或 HOME（綠界）';
COMMENT ON COLUMN sub_orders.logistics_subtype IS 'UNIMARTC2C、FAMIC2C、TCAT 等';
COMMENT ON COLUMN sub_orders.ecpay_logistics_trade_no IS '綠界物流訂單編號，供 ServerReplyURL 反查';
