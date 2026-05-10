-- 商城：orders 主鍵改 UUID、藍新金流欄位、移除 product_variants 的 Stripe Price 欄位、訂閱表改中性欄位名

-- ---------------------------------------------------------------------------
-- orders：TEXT PK（原 Stripe Payment Intent）→ UUID
-- ---------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN id_uuid UUID DEFAULT gen_random_uuid();

UPDATE orders SET id_uuid = gen_random_uuid() WHERE id_uuid IS NULL;

ALTER TABLE order_items ADD COLUMN order_id_uuid UUID;

UPDATE order_items oi
SET order_id_uuid = o.id_uuid
FROM orders o
WHERE oi.order_id = o.id;

ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;

DROP POLICY IF EXISTS "Users can access own order_items" ON order_items;

ALTER TABLE order_items DROP COLUMN order_id;
ALTER TABLE order_items RENAME COLUMN order_id_uuid TO order_id;
ALTER TABLE order_items ALTER COLUMN order_id SET NOT NULL;

ALTER TABLE orders RENAME COLUMN id TO legacy_stripe_payment_intent_id;
ALTER TABLE orders RENAME COLUMN id_uuid TO id;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE orders ADD PRIMARY KEY (id);

ALTER TABLE order_items ADD CONSTRAINT order_items_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

CREATE POLICY "Users can access own order_items"
ON order_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  )
);

-- Stripe → 通用／藍新
ALTER TABLE orders RENAME COLUMN stripe_session_id TO gateway_session_ref;

ALTER TABLE orders ADD COLUMN merchant_order_no TEXT;
ALTER TABLE orders ADD COLUMN payment_gateway TEXT NOT NULL DEFAULT 'newebpay';
ALTER TABLE orders ADD COLUMN gateway_trade_no TEXT;

CREATE UNIQUE INDEX orders_merchant_order_no_ux
  ON orders (merchant_order_no)
  WHERE merchant_order_no IS NOT NULL;

COMMENT ON COLUMN orders.legacy_stripe_payment_intent_id IS 'Legacy Stripe PI id（僅歷史訂單）；新訂單為 NULL';
COMMENT ON COLUMN orders.merchant_order_no IS '藍新 MPG MerchantOrderNo（≤30 字、不重複）';

-- ---------------------------------------------------------------------------
-- product_variants：不再使用 Stripe Price ID
-- ---------------------------------------------------------------------------
ALTER TABLE product_variants DROP COLUMN IF EXISTS stripe_price_id;
ALTER TABLE product_variants DROP COLUMN IF EXISTS stripe_sub_price_id;

-- ---------------------------------------------------------------------------
-- subscriptions：中性外部參照欄位（第一階段訂閱未接藍新，欄位可為 NULL）
-- ---------------------------------------------------------------------------
ALTER TABLE subscriptions RENAME COLUMN stripe_subscription_id TO external_subscription_id;
ALTER TABLE subscriptions RENAME COLUMN stripe_customer_id TO external_customer_id;
ALTER TABLE subscriptions ALTER COLUMN external_subscription_id DROP NOT NULL;

ALTER TABLE subscription_items RENAME COLUMN stripe_item_id TO external_item_id;
