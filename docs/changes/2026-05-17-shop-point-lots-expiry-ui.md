# 購物點分批效期與商城設定頁摘要

**日期**：2026-05-17  
**影響規格**：docs/02-schema.md、docs/05-shop.md、docs/06-pages.md  
**類型**：新增

## 原規格

- 購物點僅描述餘額 `shop_points_balance` 與流水 `user_shop_point_ledger`，未規範分批效期與「即將到期」顯示。

## 實際做法

- **DB**（`035_shop_point_lots.sql`）：
  - `user_shop_point_lots`：`user_id`、`amount_remaining`、`expires_at`、`grant_ledger_id`（可選）、`created_at`；使用者僅 SELECT（RLS）。
  - `user_shop_point_ledger.expires_at`（可 NULL）：入帳列可與批次到期對齊。
  - **`get_shop_points_next_expiry()`**：以 `auth.uid()` 查詢，`amount_remaining > 0` 且 `expires_at > now()`，依 `expires_at` 分組後取最早一批之 `SUM(amount_remaining)` 與到期時間。
  - **回填**：`shop_points_balance > 0` 且尚無 lots 之使用者，插入一筆 `amount_remaining = balance`、`expires_at = now() + 365 days`（過渡政策）。
- **App**：`/shop/settings` 於頂部卡片顯示目前餘額與上述 RPC 結果（無未過期批次時顯示說明文案）。

## 原因

產品要求每筆入帳具效期，且設定頁需呈現「最早到期那一批」之點數與到期時間；ledger 單表無法在扣點後正確還原各批剩餘，故引入 lots。

## 後續

- 入帳／扣點實作時必須維護 `user_shop_point_lots`、`user_shop_point_ledger`、`shop_points_balance` 一致；並視需求補過期自動核銷。
- 型別檔：`supabase gen types`（本機無 Docker 時已手動對齊 migration；部署 DB 後請再產生一次確認）。
