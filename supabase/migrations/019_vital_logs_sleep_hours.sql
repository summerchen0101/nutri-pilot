-- 每日紀錄：睡眠時數（精簡單欄，與 weight_kg / water_ml 同列）

ALTER TABLE vital_logs
  ADD COLUMN sleep_hours NUMERIC(4,1);

ALTER TABLE vital_logs
  ADD CONSTRAINT vital_logs_sleep_hours_range
  CHECK (sleep_hours IS NULL OR (sleep_hours >= 0 AND sleep_hours <= 24));
