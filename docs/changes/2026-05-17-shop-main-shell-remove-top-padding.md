# 商城區 MainAppShell 頂緣留白移除

**日期**：2026-05-17
**影響規格**：docs/09-ui-design.md（全站版面）、`docs/changes` 既有商城 sticky／MARAIS 紀錄
**類型**：修改

## 原規格

- `(main)` 內容容器統一 **`pt-5`**，與底欄／左右 padding 並列。
- Sticky 頁首另行使用 **`env(safe-area-inset-top)`**。

## 實際做法

- 當 **`isShopRoutePathname(pathname)`** 為真時，`MainAppShell` 改為 **`pt-0`**；其餘路由維持 **`pt-5`**。
- 商城頁頂間距僅來自 **`StickyPageHeaderShell`** 的 **`pt-[max(0.25rem,env(safe-area-inset-top))]`**，避免與 **`pt-5`** 疊加成可見白条。

## 原因

視覺上商城首頁／列表頂部出現不必要空白（尤其無瀏海裝置上 **`pt-5` + safe-area 認知冗餘**）。

## 後續

- 若有未使用 `StickyPageHeader` 的商城子頁需在首屏自行補 **`pt`**，目前子頁皆以 sticky 頁首開頭為前提。
