-- 運動紀錄、里程碑解鎖、拍照 job 類型（meal | label）、血糖關注偏好

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'walk', 'run', 'strength', 'yoga', 'cardio', 'other'
  )),
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  calories_est NUMERIC(8,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX activity_logs_user_date_idx ON activity_logs (user_id, logged_date DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own activity_logs"
ON activity_logs FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE user_milestones (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, milestone_key)
);

CREATE INDEX user_milestones_user_unlocked_idx
  ON user_milestones (user_id, unlocked_at DESC);

ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own user_milestones"
ON user_milestones FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER TABLE photo_analysis_jobs
  ADD COLUMN IF NOT EXISTS job_kind TEXT NOT NULL DEFAULT 'meal'
  CHECK (job_kind IN ('meal', 'label'));

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS tracks_glycemic_concern BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN photo_analysis_jobs.job_kind IS 'meal=餐桌食物；label=營養標／成分表';
COMMENT ON COLUMN user_profiles.tracks_glycemic_concern IS '是否顯示較強的血糖／糖量相關標籤提示';
