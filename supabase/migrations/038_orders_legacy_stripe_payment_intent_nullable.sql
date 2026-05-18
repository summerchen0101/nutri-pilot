-- migration 020 將原 Stripe TEXT 主鍵改名為 legacy_stripe_payment_intent_id 時繼承了 NOT NULL，
-- 註解已說明新／藍新訂單可為 NULL，但當時未 DROP NOT NULL；對齊 create-newebpay-payment 寫入行為。
ALTER TABLE orders
  ALTER COLUMN legacy_stripe_payment_intent_id DROP NOT NULL;
