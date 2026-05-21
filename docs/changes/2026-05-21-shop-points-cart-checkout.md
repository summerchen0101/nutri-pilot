# 購物車點數折抵接入結帳與建單

**日期**：2026-05-21

**影響規格**：`docs/05-shop.md`、`docs/changes/2026-05-17-cart-summary-and-blocks.md`

## 異動摘要

- 購物車「點數折抵」開關改為 **真實計價**：1 點 = 1 元，折抵基數 = 勾選廠商 **商品小計 + 運費**；底部總計與明細 Sheet 同步扣除。
- `cart-store` 新增 `applyShopPoints`（persist）；`useCartDerived` 輸出 `pointsDiscount`、`selectedPayableTotal`（綠界應付）等。
- `create-shop-order` 接受 `applyShopPoints`；`shop-checkout-core` 寫入 `checkout_snapshot.pointsRedeemed`、`paymentTotal`；`orders.total` 為折後整單金額。
- Migration `050_shop_points_order_redeem.sql`：RPC `redeem_shop_points_for_order`（FIFO lots、`order_redeem` ledger）；建單後扣點失敗則 rollback 訂單。
- 超商到付：點數先扣整單，線上僅收剩餘運費；應付 0 元沿用 `ecpay-checkout` 既有 `skipPayment`。
- 會員訂單付款明細顯示點數折抵列（讀 snapshot）。
- **修正**：超商選店返回時，須等點數餘額與運費摘要載入完成後才自動關閉折抵，避免誤清 `applyShopPoints`。
- **修正**：建單時機若早於 cart rehydrate，付款前以 `sync-shop-order-checkout` 同步 `checkout_snapshot.paymentTotal` 並補扣點數，確保綠界收到折後金額。

## 原因／後續

- 原 cart 區塊僅 UI 示意；產品要求運費亦可折抵並貫穿金流。
- 優惠券核銷仍待後續；若需後台訂單列表顯示折抵細節可再補。
