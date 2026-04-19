-- P2-3：食品快取、拍照辨識 job、Storage bucket（docs/06-pages.md）

-- -----------------------------------------------------------------------------
-- food_cache（Open Food Facts 與常用食物快取）
-- -----------------------------------------------------------------------------

CREATE TABLE food_cache (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  off_code            TEXT UNIQUE,
  name                TEXT NOT NULL,
  brand               TEXT,
  calories_per_100g   NUMERIC(10,2) NOT NULL,
  carb_g_per_100g     NUMERIC(10,2) NOT NULL DEFAULT 0,
  protein_g_per_100g  NUMERIC(10,2) NOT NULL DEFAULT 0,
  fat_g_per_100g      NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE food_cache IS 'Open Food Facts / 搜尋快取（docs/06-pages.md）';

CREATE INDEX IF NOT EXISTS food_cache_name_lower ON food_cache (lower(name));

ALTER TABLE food_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read food_cache"
ON food_cache FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated insert food_cache"
ON food_cache FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated update food_cache"
ON food_cache FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- photo_analysis_jobs（拍照 AI 佇列結果）
-- -----------------------------------------------------------------------------

CREATE TABLE photo_analysis_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  result_json     JSONB,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX photo_analysis_jobs_user_created ON photo_analysis_jobs (user_id, created_at DESC);

ALTER TABLE photo_analysis_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own photo_analysis_jobs"
ON photo_analysis_jobs FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_photo_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER photo_analysis_jobs_updated_at
BEFORE UPDATE ON photo_analysis_jobs
FOR EACH ROW EXECUTE FUNCTION set_photo_job_updated_at();

-- -----------------------------------------------------------------------------
-- Storage：food-photos
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-photos',
  'food-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own food photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'food-photos'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users read own food photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'food-photos'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users update own food photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'food-photos'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users delete own food photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'food-photos'
  AND split_part(name, '/', 1) = auth.uid()::text
);
