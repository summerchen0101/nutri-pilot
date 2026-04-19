-- Weekly AI insights for /analytics (docs/08-admin.md, docs/06-pages.md)

CREATE TABLE weekly_insights (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insights   JSONB NOT NULL,
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX weekly_insights_user_created_idx
  ON weekly_insights(user_id, created_at DESC);

ALTER TABLE weekly_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own weekly_insights"
ON weekly_insights FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
