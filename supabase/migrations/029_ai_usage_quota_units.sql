-- 將 ai_usage_events 由「台幣估算」改為「AI 額度」（美金估算 × AI_QUOTA_UNITS_PER_USD，App 預設 3000）

ALTER TABLE ai_usage_events RENAME COLUMN cost_ntd TO quota_used;

UPDATE ai_usage_events
SET quota_used = ROUND((quota_used::numeric / 32.0) * 3000.0, 4)
WHERE quota_used IS NOT NULL;

COMMENT ON COLUMN ai_usage_events.quota_used IS '消耗的 AI 額度（美金估算 × 每美金額度；預設 1 USD = 3000）';

COMMENT ON TABLE ai_usage_events IS 'Claude 呼叫後寫入之 AI 額度，billing_month 為 Asia/Taipei 曆月 YYYY-MM';

COMMENT ON COLUMN user_profiles.membership_plan IS '會員方案 free/plus/pro；對應每月 AI 額度上限；日後由金流或後台同步';

DROP FUNCTION IF EXISTS public.get_monthly_ai_usage_ntd(text);

CREATE OR REPLACE FUNCTION public.get_monthly_ai_quota_used(p_month text)
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

  SELECT COALESCE(SUM(quota_used), 0) INTO total
  FROM ai_usage_events
  WHERE user_id = uid AND billing_month = p_month;

  RETURN total;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_ai_quota_used(text) IS '目前登入使用者指定 billing_month 的 AI 額度加總';

REVOKE ALL ON FUNCTION public.get_monthly_ai_quota_used(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monthly_ai_quota_used(text) TO authenticated;
