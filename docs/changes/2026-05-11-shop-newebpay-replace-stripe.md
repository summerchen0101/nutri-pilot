# 商城金流：Stripe 改藍新 MPG（一次付清優先）

**日期**：2026-05-11  
**影響規格**：docs/01-stack.md、docs/02-schema.md、docs/03-features.md、docs/05-shop.md、docs/07-api.md、docs/08-admin.md、docs/00-overview.md  
**類型**：技術替換、臨時決策（訂閱結帳延後）

## 原規格

- 金流以 **Stripe**（Checkout + Webhook + Billing）為準：`create-checkout`、`stripe-webhook`、`manage-subscription`；`orders.id` 為 Payment Intent；`product_variants` 含 `stripe_price_id`／`stripe_sub_price_id`；訂閱寫入 `subscriptions`（Stripe 外部 id）。

## 實際做法

- **一次付清**：改為 **藍新全方位金流 MPG** — Edge `create-newebpay-payment`（JWT）建立 `pending` 訂單與 `order_items`，回傳 `paymentUrl` + `formFields`，前端 POST 至藍新；`newebpay-notify` 驗 `TradeSha`、解密 `TradeInfo`，`TradeStatus=1` 時更新為 `paid`。
- **ReturnURL**：Next 路由 `/shop/payment-return` → `/shop/success`（入帳仍以 Notify 為準）。
- **Schema**（migration `020_shop_newebpay.sql`）：`orders.id` 改 **UUID**；新增 `merchant_order_no`、`payment_gateway`、`gateway_trade_no` 等；移除 `product_variants` 的 Stripe Price 欄位；`subscriptions`／`subscription_items` 改 `external_*` 欄位名並允許 `external_subscription_id` 為 NULL。
- **訂閱 UI 與 `manage-subscription`**：第一階段 **移除**；商城僅單次結帳。
- **共用演算法**：`supabase/functions/_shared/newebpay.ts`（AES-256-CBC + TradeSha）。

## 原因

- 產品改採藍新金流；Stripe 與專案技術規則衝突需求。

## 後續

- 若要還原「訂閱結帳」：依藍新定期定額文件補 Edge 與 DB 流程，並更新 docs。
- 請在 Supabase 套用 migration、設定 Edge secrets（`NEWEBPAY_*`）、部署 `create-newebpay-payment` 與 `newebpay-notify`，並刪除舊 Stripe functions（若遠端仍存在）。
