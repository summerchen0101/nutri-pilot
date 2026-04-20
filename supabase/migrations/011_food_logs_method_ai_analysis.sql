-- 允許 food_logs.method = ai_analysis（手動描述 + Claude 營養分析）
-- @see docs/changes/2026-04-20-log-manual-ai-analysis.md

ALTER TABLE food_logs DROP CONSTRAINT IF EXISTS food_logs_method_check;

ALTER TABLE food_logs
  ADD CONSTRAINT food_logs_method_check
  CHECK (method IN ('manual', 'photo', 'search', 'ai_analysis', 'from_plan'));
