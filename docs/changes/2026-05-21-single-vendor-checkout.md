# 單廠勾選結帳與結帳側欄金物流 UX

**日期**：2026-05-21

**影響規格**：`docs/05-shop.md`、`docs/07-api.md`（`create-shop-order` 契約）

## 異動摘要

- 購物車改 **radio 單選一廠** 結帳；dock 金額僅計勾選廠；`cart-store` 新增 `checkoutVendorId`、`lastCheckedOutVendorId`、`removeLinesByVendor`。
- `create-shop-order` 必填 `checkoutVendorId`；回傳 `vendorId`、`shippingMethodCode`、`paymentTotal`；不再依賴 `logisticsQueue` 自動 popup。
- 結帳側欄：超商 **按鈕開地圖** →（預付）付款 → 等 `logisticsCreated` 才進 success；**到付** map 後建單、無金流、直接等物流。
- 宅配：結帳頁選 **TCAT/POST**、重選地址；`ecpay-mark-home-logistics` 標記完成後付款。
- success 頁僅 `removeLinesByVendor` 已結帳廠；付款回傳 handler 亦等物流成立再導 success。
- success 清空購物車改讀 URL `vendor_id` 或依 `order_id` 查 `checkout_snapshot`（`lastCheckedOutVendorId` 未 persist，全頁導向會遺失）；PaymentWatcher 導 success 亦帶 `vendor_id`。

## 原因／後續

- 多廠物流 queue 與「一次結一廠」產品決策衝突；改側欄分岐降低 popup 串接複雜度。
- 建議更新 `docs/07-api.md` 中 `create-shop-order` 輸出說明；實機需驗證三種運送與兩廠購物車局部清空。
