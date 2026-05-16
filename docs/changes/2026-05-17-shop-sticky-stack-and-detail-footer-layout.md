# 商城次要 sticky offset 對齊與商品詳情底部列滿幅

**日期**：2026-05-17
**影響規格**：docs/05-shop.md、`docs/changes/2026-05-16-sticky-header-shop-marais-ui.md`
**類型**：修改

## 原規格

- sticky 次要列（列表分類／詳情分頁）以固定 `top` 疊在主 sticky 頁首之下；商品詳情底部動作列可與主要內容欄同等 `max-width` 呈現。
- （實際上）`top` 使用 `calc(env(safe-area-inset-top)+3.25rem)` 與 `StickyPageHeaderShell` 的 `max(…, safe-area) + min-h-9` 不成對。

## 實際做法

- 抽出 `SHOP_UNDER_HEADER_STICKY_TOP_CLASS`（`calc(max(0.25rem, env(safe-area-inset-top)) + 2.25rem)`），供 `ShopCatalogStickyTabs` 與 `ProductDetailMaraisClient` 分頁列共用。
- 商品詳情頁 `StickyPageHeader` 改 `spacing="compact"`，與列表頁首一致。
- 詳情頁底部 fixed 區：底色 `w-full` 左右貼視窗，`px-4` 與 safe-area bottom 施加於有背景的內層；移除 `max-w-sm`。

## 原因

對齊 MARAIS 頂欄 stacking，消除捲動時頂欄與次 sticky 之間白縫；底部列與使用者期望的全寬停靠一致。

## 後續

- 若仍覺得頁首與下文間距怪異，再評估為 `StickyPageHeaderShell` 增加可選的下方 margin／商城單獨關閉。
- 可視需要於 `docs/05-shop.md` 補一句「次要 sticky offset 須與頁首殼同步」以免未來分叉。
