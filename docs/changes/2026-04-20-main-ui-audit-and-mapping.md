# 主流程 UI 差異盤點與元件映射

**日期**：2026-04-20  
**影響範圍**：`src/app/(main)`  
**類型**：設計系統重構前置盤點

## 問題盤點

- `settings/settings-view.tsx`：大量硬編色碼與重複 row/sheet 樣式，和 token 化頁面不一致。
- `analytics/analytics-view.tsx`：tab active 使用 `shadow-sm`，不符合 UI 規範（禁止陰影分層）。
- `shop/page.tsx`、`shop/cart/cart-view.tsx`：header/CTA 樣式與其他頁各自實作，缺少共用標頭與卡片容器。
- `dashboard/dashboard-home.tsx`、`log/log-client.tsx`：區塊容器與空狀態樣式重複，字級與間距節奏不一致。
- `components/layout/main-app-shell.tsx`：固定 `pb-28` 在內容較短頁面造成不必要留白。

## 元件映射（頁面 → 共用元件）

- `dashboard`
  - `PageHeader`
  - `SectionCard`
  - `MetricTile`
  - `EmptyState`
- `log`
  - `PageHeader`
  - `SegmentedTabs`
  - `SectionCard`
  - `EmptyState`
- `analytics`
  - `PageHeader`
  - `SegmentedTabs`
  - `SectionCard`
  - `EmptyState`
- `shop`
  - `PageHeader`
  - `SegmentedTabs`
  - `SectionCard`
  - `EmptyState`
- `settings`
  - `PageHeader`
  - `SectionCard`
  - `MetricTile`
  - `BottomSheetShell`

## 設計規範對齊重點

- 色彩：以 `Sea Green` / `Shadow Grey` 和語意 token 為主，不再直接硬編 `#fff #000 #333`。
- 邊框：預設 `0.5px`，互動聚焦沿用主綠。
- 字體：最高 `font-medium`，以 `11/13/15/20` 為主要階層。
- 間距：區塊間距以 `16/24`，卡片內距以 `10/12/14`。
- 互動：禁用陰影做層次，改用邊框、底色、字色狀態區分。
