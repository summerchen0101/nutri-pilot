# 購物車／結帳改為僅側欄彈窗

**日期**：2026-05-18

**影響規格**：docs/05-shop.md（`/shop/cart`、`/shop/checkout` 全頁描述）

**異動摘要**

- `/shop/cart`、`/shop/checkout` 改為 `redirect('/shop')`；購物車與結帳流程僅剩 `ShopCartPanel`／`ShopCheckoutPanel`（`ShopRightSheet`）。
- 結帳收件預設改由 server action `getCheckoutShippingDefaults` 在側欄開啟時載入；`isShopCheckoutFunnelPathname` 僅剩 `/shop/success`。
- `cart-store` 新增 `isCheckoutPanelOpen`、`openCheckoutPanel`、`closeCheckoutPanel`，移除 `checkoutEntrySource` 系列。

**原因／後續**

- 與產品決策一致：漏斗集中於右滑面板。建議更新 `docs/05-shop.md` 路由說明與截圖語意。
