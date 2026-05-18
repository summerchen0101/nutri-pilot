# 修改：orders.legacy_stripe_payment_intent_id 允許 NULL

## 日期

2026-05-18

## 影響規格

- [docs/02-schema.md](../02-schema.md)（orders 沿革與 Stripe→藍新台階段落若有提及可對照）；其餘仍以 DB comments／Edge 為準。

## 異動摘要

- 新增 migration `038_orders_legacy_stripe_payment_intent_nullable.sql`：`DROP NOT NULL`，與 `020` 註解與現有 `create-newebpay-payment` insert（不落此欄）一致。
- 修正本機／舊庫對新訂單 insert 會觸發 `23502` 的問題；開發種子無需填入假 Stripe PI。

## 原因／後續

為 `020` 改名時遺漏之約束；列為永久性修正，不需回頭改商品規格，僅環境套用 migration。
