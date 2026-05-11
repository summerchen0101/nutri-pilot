# 多廠商代銷：子訂單、運費與商城前台結帳

**日期**：2026-05-11
**影響規格**：docs/05-shop.md、docs/08-admin.md（後台廠商 UI 仍為 Phase 2）
**類型**：新增 | 修改

## 原規格

- 商城訂單為單一 `orders`／`order_items`，結帳金額僅商品加總。
- 無廠商實體、無依廠商運費與拆單。

## 實際做法

- **DB（migration `024_multi_vendor_sub_orders.sql`）**
  - 新增 `vendors`、`vendor_users`、`sub_orders`。
  - `brands.vendor_id` 關聯 `vendors`；種子三品牌對應三個種子廠商。
  - `orders` 新增：`recipient_*`、`public_order_no`、`items_subtotal`、`shipping_total`、`checkout_snapshot`。
  - `order_items` 新增：`vendor_id`、`sub_order_id`。
  - `user_profiles` 新增：`shipping_recipient_name`、`shipping_phone`、`shipping_address_full`。
  - RLS：`vendors` 啟用中可讀、`sub_orders` 訂單擁有者可讀、`vendor_users` 本人可讀。
- **Edge**
  - `create-newebpay-payment`：驗證收件人欄位；依 `vendors` 分組計算運費與 `checkout_snapshot`；寫入 `orders` 金額欄位；`order_items` 帶 `vendor_id`；可選 `saveShippingToProfile` 更新 profile。
  - `newebpay-notify`：付款成功後依 snapshot 建立 `sub_orders` 並回填 `order_items.sub_order_id`（idempotent）。
- **前台**
  - 購物車 Pinkoi 式「廠商區塊＋區塊內運費／宅配說明」；`cart-store` v3 含廠商快照欄位；`/shop/checkout` 確認收件與明細後送藍新；成功頁掛載清空購物車。
  - 設定頁「購物配送資料」；商品頁顯示出貨廠商與工作天。
- **型別**：`src/types/supabase.ts` 已手動擴充對應表欄位（未連線執行 `supabase gen types`）。

## 原因

支援多廠商代銷、一張主訂單多張子訂單與依廠商運費／免運門檻；消費者於結帳前確認收件資料。

## 後續

- Phase 2：`/vendor/*` 廠商後台、`/admin/vendors`、訂單詳情子訂單客服操作。
- 若本機／CI 已接 Supabase，可改以 `supabase gen types` 覆寫 `src/types/supabase.ts` 取代手動欄位。
