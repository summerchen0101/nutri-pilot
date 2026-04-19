# Settings 頁面（P3-3）

**日期**：2026-04-20  
**影響規格**：docs/06-pages.md（`/settings`）、docs/03-features.md  
**類型**：新增

## 原規格

`/settings` 應涵蓋個人資料、身體數據、飲控目標、飲食偏好（含推薦分數重算）、帳號與訂閱檢視。

## 實際做法

- Server Actions：`saveProfileName`、`saveBodyMetrics`（同步 `vital_logs` 今日體重）、`saveGoals`、`saveDietPreferences`（更新啟用中 `diet_plans.diet_method`）。
- `triggerRecalculateScores` 使用 `SUPABASE_SERVICE_ROLE_KEY` 呼叫 `functions/v1/recalculate-scores`；若未設定 env 或 Function 未部署則靜默略過。
- 訂閱區塊讀取 `subscriptions` 列表；無資料時顯示說明並連結商城。

## 原因

完成 Phase 3 設定流程；推薦重算依 docs/06-pages.md 走 Edge Function，與商城 Phase 4 銜接。

## 後續

部署 `recalculate-scores` Edge Function 後，於 Supabase 設定同名 Function 與 secrets，本地 `.env.local` 需有 `SUPABASE_SERVICE_ROLE_KEY`（僅伺服端）。
