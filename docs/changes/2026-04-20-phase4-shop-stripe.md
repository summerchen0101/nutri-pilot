# Phase 4 商城：Stripe、種子資料與規格對齊說明

**日期**：2026-04-20  
**影響規格**：docs/05-shop.md、docs/03-features.md（Phase 4）、docs/07-api.md  
**類型**：技術替換｜臨時決策

## 原規格

- 一次性購買完成時以 `payment_intent.succeeded` 寫入 `orders`。
- `05-shop.md` 中訂閱改頻率與實際 Stripe Price 對應的細節未完全定稿。

## 實際做法

- **Webhook**：以 `checkout.session.completed`（`mode === payment`）為主寫入 `orders`／`order_items`，可取得展開後的 `line_items` 與 `payment_intent` 作為訂單主鍵，避免重複入庫時先刪除同筆 `order_items` 再插入。
- **訂閱頻率變更**：`manage-subscription` 的 `update_frequency` 更新本專案 `subscriptions.frequency` 與 Stripe Subscription 的 `metadata.frequency`；未強制為不同頻率建立不同 Stripe Price（實務寄送可由營運／外部排程依 metadata 處理）。
- **種子資料**：`008_shop_seed_catalog.sql` 建立品牌、商品與規格；**不在 migration 內填入** `stripe_price_id`／`stripe_sub_price_id`，需在 Stripe Dashboard 建立 Product／Price 後於 Supabase 更新對應欄位，結帳才可成功。
- **Edge Functions**：`recalculate-scores`、`create-checkout`、`stripe-webhook`、`manage-subscription` 皆設 `verify_jwt = false`，授權改為函式內驗證（與既有 `ai-photo-request` 模式一致）。

## 原因

- `checkout.session.completed` 一次取得 line items 與總金額，與 MVP 訂單結構一致。
- MVP 先完成可測試的結帳與訂閱入庫；實體寄送節奏與多 Price 網格可後續加。

## 後續

- 若上線需「每週／每月不同價」，再為各頻率建立 Stripe Price 並擴充 `manage-subscription` 的 `items[0].price` 更新邏輯。
