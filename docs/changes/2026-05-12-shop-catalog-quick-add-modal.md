# 商城首頁：商品卡快速加購彈窗與最愛 icon

**日期**：2026-05-12  
**影響規格**：docs/05-shop.md  
**類型**：新增

## 原規格

- `/shop` 商品卡僅 2 欄網格與進詳情連結，未描述卡上快捷購物／收藏。

## 實際做法

- `ShopCatalogBody` 並行查詢 `user_product_favorites`，將 `product_id` 列表傳入 `ShopHomeClient` 驅動愛心初始狀態。
- 抽出 `SHOP_VARIANT_PILL_*` 至 [`src/lib/shop/variant-pill-classes.ts`](src/lib/shop/variant-pill-classes.ts)，商品詳情與彈窗共用。
- 新元件：`ShopCatalogProductCard`、`ShopQuickAddCartDialog`（`createPortal`、z-[58]、圖＋規格＋數量；另附「取消」與遮罩關閉）。

## 原因

降低從列表到購物車的步數，並與詳情頁一致的規格／數量邏輯。

## 後續

- 無額外遷移；規格書已更新 `/shop` 商品卡列描述。
