-- 後台訂單列表：狀態／日期／關鍵字篩選（擴充 admin_orders_for_staff）

CREATE OR REPLACE FUNCTION public.admin_orders_for_staff(
  p_limit int DEFAULT 200,
  p_status text DEFAULT NULL,
  p_start timestamptz DEFAULT NULL,
  p_end timestamptz DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  public_order_no text,
  status text,
  total numeric,
  created_at timestamptz,
  buyer_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_search text;
BEGIN
  IF coalesce(nullif(trim(auth.jwt() -> 'app_metadata' ->> 'admin_role'), ''), '')
    NOT IN ('super_admin', 'cs') THEN
    RETURN;
  END IF;

  v_search := nullif(trim(p_search), '');

  RETURN QUERY
  SELECT o.id, o.public_order_no, o.status, o.total, o.created_at, au.email::text
  FROM orders o
  JOIN auth.users au ON au.id = o.user_id
  WHERE (p_status IS NULL OR nullif(trim(p_status), '') IS NULL OR o.status = trim(p_status))
    AND (p_start IS NULL OR o.created_at >= p_start)
    AND (p_end IS NULL OR o.created_at < p_end)
    AND (
      v_search IS NULL
      OR o.public_order_no ILIKE '%' || v_search || '%'
      OR o.merchant_order_no ILIKE '%' || v_search || '%'
      OR au.email ILIKE '%' || v_search || '%'
      OR o.id::text ILIKE '%' || v_search || '%'
    )
  ORDER BY o.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 200), 500));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_orders_for_staff(int, text, timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_orders_for_staff(int, text, timestamptz, timestamptz, text) TO authenticated;
