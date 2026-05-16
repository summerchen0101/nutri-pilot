# 商城列表分類嵌入頁首 sticky／PageHeader 主列約 3rem

**日期**：2026-05-16
**影響規格**：docs/05-shop.md、`docs/changes/2026-05-17-shop-sticky-stack-and-detail-footer-layout.md`
**類型**：修改

## 原規格

- 商城列表：`StickyPageHeader` 與分類列為兩段獨立 `sticky`，以次 sticky 的 `top` 對齊主頁首。
- 全站：`PageHeader` 主列 `min-h-9`（2.25rem）；`SHOP_UNDER_HEADER_STICKY_TOP_CLASS` 以 `2.25rem` 對齊主列。

## 實際做法

- **`StickyPageHeader`** 支援可選 **`afterHeader`**，與標題同在 **`StickyPageHeaderShell`** 內一并吸附。
- **`ShopPageHeader`** 將 **`ShopCatalogStickyTabs`** 以 **`variant="embedded"`** 置於 **`afterHeader`**；**`ShopHomeClient`** 移除重複分類列。
- **`ShopCatalogStickyTabs`**：**`embedded`** 僅區塊樣式 **`border-t-hairline`** 等無獨立 `sticky`；**`floating`**（預設）保留原 sticky + **`SHOP_UNDER_HEADER_STICKY_TOP_CLASS`** 供將來/other 複用。
- **`PageHeader`** 主列改 **`min-h-12`**（約 3rem）；**`SHOP_UNDER_HEADER_STICKY_TOP_CLASS`** 改 **`+3rem`** 與主列對齊（詳情分頁列沿用常數）。

## 原因

行動端雙 sticky 對齊不穩易造成分類列「滑走」；將分類併入主 sticky 區行為較可靠。產品要求全站標題列約 **3rem**。

## 後續

- 若某頁 `PageHeader` 加 `meta` 第二行，總頁首高度將大於 **3rem**；詳情次子 sticky 僅對齊主列（約定與前述一致）。
- 可視需要更新主規格 `docs/05-shop.md` 首屏結構描述。
