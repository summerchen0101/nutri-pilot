-- Remove diet plan tables + food_logs link to plan meals (MVP: plan feature removed).
-- @see docs/changes/2026-05-11-remove-diet-plan-and-subscription-mvp.md

UPDATE food_logs SET method = 'manual' WHERE method = 'from_plan';

ALTER TABLE food_logs DROP COLUMN IF EXISTS from_plan_meal_id;

DROP TABLE IF EXISTS meal_items CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS daily_menus CASCADE;
DROP TABLE IF EXISTS diet_plans CASCADE;

ALTER TABLE food_logs DROP CONSTRAINT IF EXISTS food_logs_method_check;

ALTER TABLE food_logs
  ADD CONSTRAINT food_logs_method_check
  CHECK (method IN ('manual', 'photo', 'search', 'ai_analysis'));
