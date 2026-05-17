# 商城設定 hub 與 commerce 捷徑頁：頂緣與底欄對齊商城

**日期**：2026-05-17  
**影響規格**：docs/09-ui-design.md（商城導覽／主 shell 留白）  
**類型**：修改

## 原規格

- `/shop/*` 使用商城底欄；`/shop/settings` 亦在商城樹內故顯示商城底欄。
- 非 `/shop` 路由使用全站 `pt-5` 與主程式 BottomNav。

## 實際做法

- `/shop/settings`（含未來 `/shop/settings/…`）：不顯示商城底欄；內容區底部留白改為與 dashboard／guard 等一致的 `pb-24`（透過 compact bottom padding）。
- `/settings/orders`、`/settings/points`、`/settings/coupons`：`pt-0`（與商城同由 `StickyPageHeader` safe-area 自理）、不顯示主程式 BottomNav、底部 `pb-24`；上述三頁的 `StickyPageHeader` 使用 `SHOP_HEADER_SCROLL_ANCHOR_ID` 與 `spacing="compact"` 與商城子頁一致。

路徑判斷集中於 `src/lib/shop/shop-path.ts`（`isShopSettingsHubPathname`、`isShopCommerceShortcutPathname`、`shouldHideAllBottomNavPathname`）。

## 原因

商城設定與其捷徑子頁應視為專注流程：避免頂部多一圈全站 padding，且底欄僅在主要商城瀏覽路徑顯示。

## 後續

視需要將 `docs/09-ui-design.md` 商城導覽一節補充「設定 hub 無底欄」與 commerce 捷徑頁 shell 行為。  
**取捨**：`/settings/points` 從主設定進入時亦無主底欄、`pt-0`，與從商城設定進入一致。
