-- 守衛：個人儲存紀錄（最多 5 筆）

CREATE TABLE label_guard_saved_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id      UUID REFERENCES label_guard_jobs(id) ON DELETE SET NULL,
  name        TEXT NOT NULL CHECK (char_length(btrim(name)) > 0 AND char_length(name) <= 30),
  report_json JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE label_guard_saved_reports IS '守衛個人儲存紀錄（使用者最多 5 筆）';

CREATE INDEX label_guard_saved_reports_user_created
ON label_guard_saved_reports (user_id, created_at DESC);

ALTER TABLE label_guard_saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own label_guard_saved_reports"
ON label_guard_saved_reports FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER label_guard_saved_reports_updated_at
BEFORE UPDATE ON label_guard_saved_reports
FOR EACH ROW EXECUTE FUNCTION set_photo_job_updated_at();

CREATE OR REPLACE FUNCTION enforce_label_guard_saved_reports_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM label_guard_saved_reports
    WHERE user_id = NEW.user_id
  ) >= 5 THEN
    RAISE EXCEPTION '最多 5 筆，請先刪除舊紀錄';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER label_guard_saved_reports_limit_insert
BEFORE INSERT ON label_guard_saved_reports
FOR EACH ROW
EXECUTE FUNCTION enforce_label_guard_saved_reports_limit();
