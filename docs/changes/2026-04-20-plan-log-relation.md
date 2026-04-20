# 計畫餐（meals）與飲食記錄（food_logs）關聯欄位

**日期**：2026-04-20  
**影響規格**：docs/02-schema.md  
**類型**：新增

## 原規格

- `meals` 僅有 `is_checked_in`、`checked_in_at`，無法表達「照吃／調整／跳過」等打卡語意。
- `food_logs` 無欄位指向計畫中的餐別，無法區分手動記錄與由計畫複製而來的記錄。

## 實際做法

1. **Migration**：`supabase/migrations/009_plan_log_relation.sql`（任務稿若寫檔名 `003_plan_log_relation.sql`：本 repo 已有 `003_photo_analysis_jobs_realtime.sql`，沿用既有流水編號改為 **009**，避免與現有 003 撞名與排序混淆。）
2. **`food_logs`**：
   - `from_plan_meal_id UUID REFERENCES meals(id) ON DELETE SET NULL`
   - `log_type TEXT NOT NULL DEFAULT 'manual'`（語意：`manual`／`from_plan`／`from_plan_modified`）
3. **`meals`**：`checkin_type TEXT`（語意：`NULL`／`exact`／`modified`／`skipped`）。
4. **資料**：既有列自動帶入 `log_type = 'manual'`；`from_plan_meal_id`、`checkin_type` 為 NULL。

## 原因

- 讓「飲食計畫」與「實際記錄」可追溯同一餐別，並支援打卡結果與記錄來源的查詢與分析。

## 後續

- 於本機或 CI 執行 `supabase gen types typescript ...` 更新 `src/types/supabase.ts`（本次未一併提交）。
- 應用程式：打卡／複製記錄時寫入 `checkin_type`、`from_plan_meal_id`、`log_type`。
