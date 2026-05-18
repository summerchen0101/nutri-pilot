-- BI：product_events 埋點表 + GMV／漏斗 RPC
-- @see docs/03-features.md Phase 5、docs/08-admin.md

CREATE TABLE product_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression',
    'click',
    'add_to_cart',
    'purchase'
  )),
  source     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX product_events_created_at_idx
  ON product_events (created_at DESC);

CREATE INDEX product_events_product_created_idx
  ON product_events (product_id, created_at DESC);

COMMENT ON TABLE product_events IS '商城行為埋點（漏斗／熱門商品）；purchase 可由 Edge 以 service_role 寫入';

ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon authenticated insert product_events"
ON product_events FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Staff select product_events"
ON product_events FOR SELECT
TO authenticated
USING (public.current_admin_role() IN ('super_admin', 'editor', 'cs'));

-- -----------------------------------------------------------------------------
-- RPC：過去 N 天每日 GMV（僅 super_admin）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_daily_gmv(p_days int)
RETURNS TABLE (day date, gmv numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(public.current_admin_role(), '') <> 'super_admin' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (o.created_at AT TIME ZONE 'UTC')::date AS day,
    SUM(o.total)::numeric AS gmv
  FROM orders o
  WHERE o.status = 'paid'
    AND o.created_at >= NOW() - (coalesce(nullif(p_days, 0), 30) || ' days')::interval
  GROUP BY (o.created_at AT TIME ZONE 'UTC')::date
  ORDER BY day ASC;
END;
$$;

COMMENT ON FUNCTION public.get_daily_gmv(int) IS '後台 BI：過去 p_days 天每日已付款訂單 GMV';

REVOKE ALL ON FUNCTION public.get_daily_gmv(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_gmv(int) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC：商品事件漏斗（super_admin / editor）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_product_funnel(
  p_product_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (event_type text, funnel_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(public.current_admin_role(), '')
    NOT IN ('super_admin', 'editor') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT pe.event_type::text, COUNT(*)::bigint AS funnel_count
  FROM product_events pe
  WHERE (
      p_product_id IS NULL OR pe.product_id = p_product_id
    )
    AND (pe.created_at AT TIME ZONE 'UTC')::date >= p_start_date
    AND (pe.created_at AT TIME ZONE 'UTC')::date <= p_end_date
  GROUP BY pe.event_type
  ORDER BY array_position(
    ARRAY['impression', 'click', 'add_to_cart', 'purchase']::text[],
    pe.event_type
  );
END;
$$;

COMMENT ON FUNCTION public.get_product_funnel(uuid, date, date) IS '後台 BI：依事件類型計數（NULL product_id = 全站聚合）';

REVOKE ALL ON FUNCTION public.get_product_funnel(uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_funnel(uuid, date, date) TO authenticated;
