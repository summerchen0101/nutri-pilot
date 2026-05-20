# 商城列表頁首捲動固定（sticky 修復）

**日期**：2026-05-20

**影響規格**：docs/05-shop.md

**異動摘要**：

- `MainAppShell` 外層 `overflow-x-hidden` 改為 `overflow-x-clip`，避免 WebKit 下子孫 `position: sticky` 失效。
- `/shop` 維持 `ShopPageHeader`（標題 + embedded 分類同一 `StickyPageHeaderShell`）；曾試 fixed 補救因雙重 safe-area／跑版撤回。
- `ShopPageHeader` 以 `shellClassName` 常駐半透明底，避免 sticky 頂部 safe-area 透明區塊看起來空一塊。

**原因／後續**：列表頁首以 CSS sticky 為主；詳情分頁列 fixed dock 維持不變。可於 `docs/05-shop.md` 補首屏吸附說明。
