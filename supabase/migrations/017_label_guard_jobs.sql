-- 食品標示智慧分析（守衛）：獨立於 photo_analysis_jobs / food-photos

CREATE TABLE label_guard_jobs (
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

COMMENT ON TABLE label_guard_jobs IS '標示／成分 Vision 分析佇列（獨立於餐桌拍照）';

CREATE INDEX label_guard_jobs_user_created ON label_guard_jobs (user_id, created_at DESC);

ALTER TABLE label_guard_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own label_guard_jobs"
ON label_guard_jobs FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER label_guard_jobs_updated_at
BEFORE UPDATE ON label_guard_jobs
FOR EACH ROW EXECUTE FUNCTION set_photo_job_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'label_guard_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE label_guard_jobs;
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'label-guard-photos',
  'label-guard-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own label guard photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'label-guard-photos'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users read own label guard photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'label-guard-photos'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users update own label guard photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'label-guard-photos'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users delete own label guard photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'label-guard-photos'
  AND split_part(name, '/', 1) = auth.uid()::text
);

COMMENT ON COLUMN photo_analysis_jobs.job_kind IS 'meal=餐桌食物；label 已廢止（改用 label_guard_jobs）';
