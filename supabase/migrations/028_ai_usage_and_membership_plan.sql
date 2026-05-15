-- AI 月度用量（台幣估算）與會員方案欄位（@see docs/changes/2026-05-15-ai-monthly-quota-settings.md）

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS membership_plan TEXT NOT NULL DEFAULT 'free'
    CHECK (membership_plan IN ('free', 'plus', 'pro'));

COMMENT ON COLUMN user_profiles.membership_plan IS '會員方案：free/plus/pro；對應 AI 月度額度 NT$10/50/100；日後由金流或後台同步';

CREATE TABLE ai_usage_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_month   TEXT NOT NULL
                  CHECK (billing_month ~ '^\d{4}-\d{2}$'),
  source          TEXT NOT NULL
                  CHECK (source IN (
                    'photo_meal',
                    'label_guard',
                    'quick_log',
                    'analyze_food'
                  )),
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  cost_ntd        NUMERIC(12, 4) NOT NULL CHECK (cost_ntd >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ai_usage_events IS 'Claude 呼叫後寫入之估算成本（台幣），billing_month 為 Asia/Taipei 曆月 YYYY-MM';

CREATE INDEX ai_usage_events_user_billing_month
  ON ai_usage_events (user_id, billing_month);

ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ai_usage_events"
  ON ai_usage_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 寫入僅限 service_role（略過 RLS）；authenticated 不可 INSERT/UPDATE/DELETE

CREATE OR REPLACE FUNCTION public.get_monthly_ai_usage_ntd(p_month text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  total numeric;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_month IS NULL OR p_month !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'invalid billing month';
  END IF;

  SELECT COALESCE(SUM(cost_ntd), 0) INTO total
  FROM ai_usage_events
  WHERE user_id = uid AND billing_month = p_month;

  RETURN total;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_ai_usage_ntd(text) IS '目前登入使用者指定 billing_month 的 AI 估算用量加總（台幣）';

REVOKE ALL ON FUNCTION public.get_monthly_ai_usage_ntd(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monthly_ai_usage_ntd(text) TO authenticated;
