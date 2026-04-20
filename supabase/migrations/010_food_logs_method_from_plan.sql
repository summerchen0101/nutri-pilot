-- 允許 food_logs.method = from_plan（照計畫打卡自動複製）

ALTER TABLE food_logs DROP CONSTRAINT IF EXISTS food_logs_method_check;

ALTER TABLE food_logs
  ADD CONSTRAINT food_logs_method_check
  CHECK (method IN ('manual', 'photo', 'search', 'from_plan'));
