# 首頁移除快速操作與今日建議改浮動入口

**日期**：2026-05-17  
**影響規格**：docs/06-pages.md、docs/03-features.md、docs/04-ai-engine.md  
**類型**：修改

## 原規格

- `/dashboard` 含「快速操作列」五項捷徑。
- 「AI 今日建議」為頁面內嵌卡片（Suspense + `DashboardDailyInsightDeferred`）。

## 實際做法

- 移除首頁快速操作區塊；體重／運動／飲食仍可由既有指標格與熱量環等進入。
- 今日建議改為右下角浮動燈泡鈕（`DashboardInsightFab`），點擊以 `BottomSheetShell` 顯示內容；`DashboardInsightSkeleton` 改為同位置小型占位。
- `getOrCreateDashboardDailyInsight` 回傳 `insightPeriodDate`、`justGenerated`；Client 以 `localStorage`（鍵含 `userId`）比對週期未讀，並於 `justGenerated` 或週期未讀時顯示輕量 ring／pulse；開啟抽層後寫入已讀。

## 原因

簡化首頁版面；建議改為不打斷捲動的次要入口，並以動效提示新週期或本次剛產出之建議。

## 後續

已同步更新 `docs/06-pages.md`、`docs/03-features.md`、`docs/04-ai-engine.md`。
