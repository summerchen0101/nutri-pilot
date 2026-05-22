# 後台商城設定（Banner／分類／運送免運）

**日期**：2026-05-22
**影響規格**：docs/05-shop.md、docs/08-admin.md
**異動摘要**：
- 新增 `/admin/shop`：首頁 Banner 輪播 CRUD、分類 Banner CRUD、商品分類 slug 完整 CRUD（`shop_categories`）。
- `products.category` 改 FK 至 `shop_categories`；前台分類與圖示改讀 DB（`ShopCategoriesProvider`）。
- 首頁 Banner 改多則輪播；選分類時顯示 `shop_category_banners`。
- 廠商編輯頁可維護 `vendor_shipping_methods` 運費／免運門檻；儲存廠商時同步 `home_delivery` 列。
**原因／後續**：changelog 記載 2026-05-16 預留的 Banner 後台與營運需求；可回頭更新 05／08 路由表。
