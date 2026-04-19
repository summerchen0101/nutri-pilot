# 底部導覽：商城取代數據、SVG icon、樣式對齊 UI 規格

**日期**：2026-04-20  
**影響規格**：docs/09-ui-design.md  
**類型**：修改 | UI

## 原規格

BottomNav 曾為浮動卡片樣式；第四項為「數據」連至 `/analytics`，項目僅文字無 icon。

## 實際做法

1. 第四項改為「商城」，路由 `/shop`（`/analytics` 頁仍保留，僅不再由底欄進入）。
2. 五項皆使用 inline SVG（20×20），icon 置於文字上方，`currentColor` 繼承連結文字色。
3. 容器：全寬、`bg-white`、`border-t border-[0.5px] border-[#E8E9ED]`、`grid grid-cols-5`、`px-2`、`pt-2`、`pb-[calc(0.5rem+env(safe-area-inset-bottom))]`。
4. 項目：`flex flex-col items-center gap-1`、`rounded-lg`、`text-[10px] font-medium`；active `bg-[#EBF5EF] text-[#4C956C]`；inactive `text-[#9298A8]`。
5. Active 以 `usePathname()` 判定：`/dashboard` 僅 exact match，其餘 href 允許子路徑（如 `/shop/[productId]`）。

## 原因

對齊 docs/09-ui-design.md 與產品路由（商城）；補齊 icon 與 safe area，避免底欄被 iPhone Home Indicator 遮擋。

## 後續

若規格書仍寫「數據／analytics」為底欄第四項，請更新 docs/06-pages.md、docs/03-features.md 等與主導覽一致的描述。
