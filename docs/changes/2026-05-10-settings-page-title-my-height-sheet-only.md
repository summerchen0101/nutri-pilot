# 設定頁標題「我的」、身體數據編輯僅身高

**日期**：2026-05-10
**影響規格**：docs/06-pages.md
**類型**：修改

## 原規格

- `/settings` 頁區塊表列「身體數據」可編輯「身高、體重」，並示意同時更新體重與代謝欄位。

## 實際做法

- 頁首標題為「我的」（與底部導覽 `/settings` 標籤一致）。
- 身體數據卡片右上編輯改為底部彈窗「編輯身高」，僅可改身高；內嵌提示「體重請至『紀錄』頁的體重卡設定」。
- 後端改用 `saveHeightCm`：只更新 `user_profiles.height_cm/bmi/bmr/tdee`，並比照原邏輯連動作用中 `user_goals.daily_cal_target`／`target_date`；不依此路徑寫入 `vital_logs`。
- 移除已无呼叫端的 `saveBodyMetrics`。

## 原因

體重單一來源改為紀錄頁體重卡，設定頁僅維護身高；避免與 `vital_logs` 今日體重重複寫入。

## 後續

已同步更新 `docs/06-pages.md` `/settings` 表格與身體數據邏輯說明。
