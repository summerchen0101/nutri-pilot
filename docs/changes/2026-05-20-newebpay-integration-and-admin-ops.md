# 藍新金流串接啟動與後台營運補強

**日期**：2026-05-20  
**影響規格**：docs/05-shop.md、docs/07-api.md、docs/08-admin.md

## 異動摘要

- 新增 `scripts/newebpay-setup.sh`：一次設定 Edge Secrets 並部署 `create-newebpay-payment`、`newebpay-notify`、`newebpay-query-trade`。
- 後台 P0：訂單詳情金流資訊卡、退款 SOP、金流對帳 pending 警示與訂單連結。
- 後台 P1：訂單列表狀態／日期／關鍵字篩選（migration `047_admin_orders_staff_filters.sql`）。
- 後台 P2：Edge `newebpay-query-trade`（手冊 4.3）+ 詳情頁查詢面板；主訂單→shipped 時同步子訂單 status。
- 移除 MPG 請求中已廢棄的 `LoginType` 參數。

## 原因／後續

- 正式 key 串接需 Secrets／部署腳本與後台對帳流程；自動退款 API 仍走藍新後台人工 + admin 標 cancelled。
- 部署前請執行 `supabase db push` 套用 047；Secrets 與藍新後台 CREDIT 開通需人手完成。
