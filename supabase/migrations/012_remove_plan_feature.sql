-- Plan feature sunset (方案 B):
-- 1) move diet_method ownership from diet_plans to user_profiles
-- 2) keep diet_plans table for rollback safety, but mark records inactive

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS diet_method TEXT CHECK (diet_method IN (
  'mediterranean',
  'keto',
  'high_protein',
  'low_cal',
  'intermittent',
  'dash',
  'custom'
));

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS meal_frequency INT DEFAULT 3;

UPDATE user_profiles up
SET diet_method = src.diet_method
FROM (
  SELECT DISTINCT ON (dp.user_id)
    dp.user_id,
    dp.diet_method
  FROM diet_plans dp
  WHERE dp.is_active = TRUE
  ORDER BY dp.user_id, dp.created_at DESC
) AS src
WHERE up.user_id = src.user_id
  AND (up.diet_method IS NULL OR up.diet_method = '');

UPDATE diet_plans
SET is_active = FALSE
WHERE is_active = TRUE;
