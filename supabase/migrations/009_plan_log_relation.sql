-- 計畫（meals）與飲食記錄（food_logs）關聯 — docs/02-schema.md、docs/changes/2026-04-20-plan-log-relation.md
-- 檔名使用 009：003 已由 003_photo_analysis_jobs_realtime.sql 使用。

-- -----------------------------------------------------------------------------
-- food_logs：來源餐別、記錄類型
-- -----------------------------------------------------------------------------

ALTER TABLE food_logs
  ADD COLUMN from_plan_meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  ADD COLUMN log_type TEXT NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN food_logs.from_plan_meal_id IS '對應計畫中之餐別；計畫餐刪除時設為 NULL，記錄保留';
COMMENT ON COLUMN food_logs.log_type IS 'manual=用戶自行搜尋記錄；from_plan=照計畫打卡複製；from_plan_modified=照計畫但有調整';

-- -----------------------------------------------------------------------------
-- meals：打卡方式（與 is_checked_in / checked_in_at 並用）
-- -----------------------------------------------------------------------------

ALTER TABLE meals
  ADD COLUMN checkin_type TEXT;

COMMENT ON COLUMN meals.checkin_type IS 'NULL=尚未打卡；exact=照吃；modified=照吃但調整；skipped=沒吃這餐';
