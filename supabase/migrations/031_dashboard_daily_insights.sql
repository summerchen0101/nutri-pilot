-- Cached daily bullets for homepage AI 「今日建議」 (docs/04-ai-engine.md)

CREATE TABLE dashboard_daily_insights (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_date  DATE NOT NULL,
  bullets       JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, insight_date)
);

CREATE INDEX dashboard_daily_insights_user_date_idx
  ON dashboard_daily_insights (user_id, insight_date DESC);

ALTER TABLE dashboard_daily_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own dashboard_daily_insights"
  ON dashboard_daily_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dashboard_daily_insights"
  ON dashboard_daily_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);
