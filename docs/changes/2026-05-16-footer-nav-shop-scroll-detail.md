# 商城主選單：首頁捲動隱藏、詳情頁不顯示

**日期**：2026-05-16  
**影響規格**：—  
**類型**：修改

## 原規格

- 主選單固定於視窗底部；未區分商城首頁捲動與商品詳情情境。

## 實際做法

- [`bottom-nav.tsx`](src/components/layout/bottom-nav.tsx)：在 `/shop` 首頁向下捲動時將列隱藏（`translate-y`）；接近頂部或向上捲時顯示。商品詳情 `/shop/:id`（排除 cart／checkout／favorites／success）不渲染主選單。
- [`shop-path.ts`](src/lib/shop/shop-path.ts)：固定子路徑補上 `checkout`、`favorites`；新增 `isShopProductDetailPathname`、`SHOP_FIXED_ROUTE_SEGMENTS`。
- [`main-app-shell.tsx`](src/components/layout/main-app-shell.tsx)：詳情頁與其他 compact 頁一致使用較小底部 `pb`（無主選單）。
- 詳情頁底部操作列改貼螢幕底＋ safe area（不再為主選單預留高度）。

## 原因

閱讀商品列表與詳情時減少底部主選單佔版；詳情改為沉浸式購買條。

## 後續

若需在「首頁捲動隱藏主選單」時一併縮短內容區 `padding-bottom`，可再以共用狀態同步。
