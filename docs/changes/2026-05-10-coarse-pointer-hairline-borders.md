# 觸控裝置極細邊框改 1px（WebKit hairline）

**日期**：2026-05-10  
**影響規格**：docs/09-ui-design.md、`.cursor/rules/05-ui-design.mdc`  
**類型**：修改

## 原規格

- 全站邊框統一 **0.5px**，禁止任意改 1px。

## 實際做法

- 在 `src/app/globals.css` 以 **`@media (pointer: coarse)`** 將 Tailwind 產生的 **`border-[0.5px]`、`border-t|b|l-[0.5px]`、`divide-y-[0.5px]`** 等之實際 **border-width 改為 1px**（`!important`），色與樣式仍沿用既有 class。
- 新增 **`--hairline-border-shorthand`**（預設 `0.5px`、coarse 下 `1px`）；`src/app/(main)/analytics/analytics-view.tsx` 內 Recharts `Tooltip` 的 `contentStyle.border` 改為 **`var(--hairline-border-shorthand)`**。

## 原因

iOS Safari／WebKit 上 **0.5px** 常因次像素對齊導致**單側邊線不渲染**（使用者回報多為左側），影響商城、紀錄、儀表板等複數頁。

## 後續

已同步更新 `docs/09-ui-design.md` 邊框原則與禁止事項、`05-ui-design.mdc` 快速參考；**主色 1.5px、CTA** 等行为不變。
