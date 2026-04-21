# Dashboard：熱量達標連續天數與商品圖卡版型

**日期**：2026-04-21  
**影響規格**：docs/03-features.md、docs/06-pages.md、docs/changes/2026-04-20-main-shell-dashboard-log-plan-ui.md（舊描述）  
**類型**：修改

## 原規格

- Dashboard 連續天數為「由今日往前，當日有飲食紀錄即計入」；badge 文案為「連續 N 天」。
- 歷史異動紀錄曾提及「有紀錄或菜單完成」等較舊流程。

## 實際做法

- **Streak**：由今日往前逐日檢查；該日須有 `food_logs`，且該日加總熱量 ≤ `user_goals.daily_cal_target` 才計入；無目標或非正數目標時 streak 為 0、**不顯示** badge。
- **文案**：達標時顯示「連續第 N 天達成！」（N ≥ 1）。
- **資料**：streak 視窗內改查 `food_logs` 含 `food_log_items.calories`，於 server 聚合每日熱量後計算。
- **商品圖卡**：首頁「為你推薦」橫列、商城 grid、商品詳情「同品牌推薦」統一為固定寬度／`aspect-square` 圖區、`overflow-hidden`、`object-cover` 與 flex 直向排版，避免圖片比例造成跑版。

## 原因

產品需求改為「熱量未超過設定值」的連續達成，並統一商城相關卡片的視覺尺寸。

## 後續

建議將 docs/03-features.md、docs/06-pages.md 中「連續打卡 badge」描述更新為「熱量達標連續天數」與上述條件，並與本異動對齊。
