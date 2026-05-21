# 藍新金流改綠界金物流

**日期**：2026-05-20

**影響規格**：`docs/05-shop.md`、`docs/07-api.md`、`docs/02-schema.md`

## 異動摘要

- 移除藍新 MPG／Notify Edge；改綠界 AIO V5 + ReturnURL 入帳（`ecpay-return`）。
- 新增綠界 C2C 物流：建單後逐廠 popup 選店／宅配，ServerReplyURL 更新子訂單貨態。
- 結帳流程改為 `create-shop-order` → 物流 queue → `ecpay-checkout`；`payment_gateway` 預設 `ecpay`。
- `sub_orders` 新增 `logistics_type`、`ecpay_logistics_trade_no` 等欄位；`orders.order_metadata` 存 callback。
- 歷史 `payment_gateway=newebpay` 訂單保留，後台查詢改走 `ecpay-query-trade`（僅新單）。

## 原因／後續

- 商業決策改用綠界金物流；規格參考 `docs/third/ecpay-*.md`。
- 上線前執行 migration `048`、部署 `scripts/ecpay-setup.sh`、綠界後台設定 callback URL。
