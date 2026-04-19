-- food_cache：多來源食品資料（衛福部、USDA、AI 估算等）
-- 對應 docs/02-schema.md；異動紀錄見 docs/changes/2026-04-19-food-cache-multi-source.md
--
-- 注意：編號為 004（既有 002_log_food_cache_photo_jobs / 003 需先套用）。
-- 若檔名使用 002_ 開頭會排在 002_log_* 之前，將在 food_cache 建立前執行而失敗。

-- -----------------------------------------------------------------------------
-- 1. ADD COLUMN
-- -----------------------------------------------------------------------------
ALTER TABLE food_cache
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS alias TEXT[],
  ADD COLUMN IF NOT EXISTS fiber_g_per_100g NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sodium_mg_per_100g NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE food_cache DROP CONSTRAINT IF EXISTS food_cache_source_check;

ALTER TABLE food_cache
  ADD CONSTRAINT food_cache_source_check
  CHECK (source IN ('off', 'mohw_tw', 'usda', 'ai_estimate', 'user'));

-- -----------------------------------------------------------------------------
-- 2. off_code 唯一約束：移除非 NULL 時重複；允許多筆 NULL（UNIQUE NULLS DISTINCT）
-- -----------------------------------------------------------------------------
ALTER TABLE food_cache DROP CONSTRAINT IF EXISTS food_cache_off_code_key;

ALTER TABLE food_cache
  ADD CONSTRAINT food_cache_off_code_key UNIQUE NULLS DISTINCT (off_code);

-- -----------------------------------------------------------------------------
-- 3. 全文搜尋索引（name）
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS food_cache_name_search
  ON food_cache USING gin (to_tsvector('simple', name));

-- -----------------------------------------------------------------------------
-- 4. 回填 source（既有資料）
-- -----------------------------------------------------------------------------
UPDATE food_cache SET source = 'off' WHERE off_code IS NOT NULL;
UPDATE food_cache SET source = 'user' WHERE off_code IS NULL;
