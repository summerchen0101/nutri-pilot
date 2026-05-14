# 設定頁：購物點、多收件、個人化開關與會員頁

**日期**：2026-05-14  
**影響規格**：docs/06-pages.md、docs/05-shop.md  
**類型**：新增、修改

## 原規格

- 設定頁以獨立區塊展示商城設定／會員方案；配送為單一 `user_profiles.shipping_*`；無購物點與流水表。

## 實際做法

- **DB**（`027_shop_points_shipping_addresses.sql`）：`user_profiles.shop_points_balance`、`shop_personalize_recommendations`；`user_shop_point_ledger`；`user_shipping_addresses`（多筆、一使用者一筆預設）；舊完整三欄回填首筆地址。
- **設定頁**：頂部 **會員購物點**；**帳號管理** 列點數紀錄、商城設定（Bottom Sheet：收件 CRUD／飲食與推薦 switch）、會員方案（**`/settings/membership`**）；移除獨立商城／會員卡片。
- **會員方案**：僅月繳／每月自動扣款文案，移除年繳敘述；仍為展示層（藍新週期扣款串接另議）。
- **結帳／`create-newebpay-payment`**：預設收件優先讀 `user_shipping_addresses` 預設列，並同步寫回。
- **商城／Dashboard**：`shop_personalize_recommendations === false` 時排序不依個人化分數。

## 原因

產品定義訂閱轉點、多地址與使用者可控個人化；與既有 MVP 訂閱暫緩並存時以 UI 與 schema 先行。

## 後續

接藍新定期定額後：訂閱入帳寫 ledger、扣抵與餘額一致化；更新方案條款連結。
