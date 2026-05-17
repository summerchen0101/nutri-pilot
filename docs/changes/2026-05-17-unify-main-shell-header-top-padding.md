# 主程式 MainAppShell 頂緣與商城對齊（全路由 pt-0）

**日期**：2026-05-17
**影響規格**：docs/09-ui-design.md（全站版面）、`docs/changes/2026-05-17-shop-main-shell-remove-top-padding.md`
**類型**：修改

## 原規格

- `MainAppShell` 內容容器：商城樹與 `/settings/orders|points|coupons` 捷徑為 **`pt-0`**，其餘主程式路由為 **`pt-5`**。
- 有 `StickyPageHeader` 的頁面另由 **`StickyPageHeaderShell`** 使用 **`env(safe-area-inset-top)`**。

## 實際做法

- **`MainAppShell`**：所有路由一律 **`pt-0`**，與商城視覺一致；頂部 safe-area 不再疊加全站 **`pt-5`**。
- 抽出共用常數 **`STICKY_PAGE_HEADER_TOP_SAFE_CLASS`**（[`src/components/layout/sticky-page-header-top-safe-class.ts`](../../src/components/layout/sticky-page-header-top-safe-class.ts)），**`StickyPageHeaderShell`** 與無 sticky 頁首的過場共用同一字串。
- **`(main)/loading`**、**`settings-page-skeleton`**、**`dashboard/loading`**：根容器加上 **`STICKY_PAGE_HEADER_TOP_SAFE_CLASS`**，避免瀏海機型在過場時內容貼齊狀態列。
- **`sticky-page-header-shell`** 另 **re-export** 該常數，供僅需字串的 client 模組單一 import。

## 原因

主程式各頁標題列上方留白與商城不一致；統一為 **`pt-0` + sticky／過場自行補 safe-area** 後，首屏對齊且不在無瀏海裝置出現多餘白条。

## 後續

- 新增 **`(main)` 內容頁** 若**不**使用 **`StickyPageHeader`**，須自行為首屏加上 **`STICKY_PAGE_HEADER_TOP_SAFE_CLASS`** 或同等 safe-area 處理。
- 可考虑將此約定補入 `docs/09-ui-design.md`（本次僅 changes 紀錄）。
