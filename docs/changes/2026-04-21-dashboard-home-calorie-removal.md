# Dashboard 首屏移除熱量區、雙卡與飲水／餐食重排

**日期**：2026-04-21  
**影響規格**：docs/06-pages.md（`/dashboard` 首屏區塊描述）  
**類型**：修改

## 原規格

- [`docs/changes/2026-04-21-dashboard-home-tiles.md`](2026-04-21-dashboard-home-tiles.md) 記載首屏含「今日熱量」`MetricTile`（含昨日熱量）、第二列「運動紀錄／喝水量紀錄」並列，以及頂部熱量視覺尚未另文件化。

## 實際做法

- **移除**：首屏 `CalorieRingBlock`（環狀今日熱量與巨量營養長條）、第一列「今日熱量」小卡。
- **第一列雙卡**：僅「體重」「運動消耗」（主視覺為今日 `activity_logs.calories_est` 合計，前綴負號表示消耗；副行為今日運動分鐘合計）。
- **今日飲水**：獨立整寬卡片；標題列顯示「現量／目標 ml · 百分比」（目標為常數 `DASHBOARD_WATER_TARGET_ML = 2000`，待 Schema 支援後可改為使用者設定）；保留八格點選；填滿格使用設計系統第三色 `#378ADD`；底部 **+250 ml**／**+500 ml** 按鈕與格子共用 `setWaterMlForTodayAction`。
- **今日餐食**：僅列出今日有熱量紀錄之餐別；`detailLine` 為該餐 `food_log_items.name` 以「 · 」串接；區塊右上角單一「+ 新增」連至 `/log`，移除逐列「記錄」鈕。
- **DashboardHomeProps**：移除 `todayKcal`、`targetKcal`、`carbG`、`proteinG`、`fatG`、`yesterdayKcal`；新增 `waterTargetMl`。伺服端仍計算營養與 `buildInsightBullets`（今日建議）供下方卡片使用。

## 原因

產品調整首屏資訊優先順序：弱化首屏熱量英雄區，改以體重、運動消耗、飲水與餐食為主；視覺與 token 依 UI 規範，不採純黑白稿。

## 後續

可將 `docs/06-pages.md` 的 `/dashboard` 首屏表格更新為上述區塊；若需個人化飲水目標，於 `user_goals` 或設定增加欄位後替換常數。
