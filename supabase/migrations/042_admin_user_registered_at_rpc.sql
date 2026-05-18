-- 後台 RPC：staff 可查目標使用者註冊時間（來自 auth.users）
-- @see docs/03-features Phase 5（P5-2）

CREATE OR REPLACE FUNCTION public.admin_user_registered_at_for_staff(
  p_user_id uuid
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_created timestamptz;
BEGIN
  IF coalesce(nullif(trim(auth.jwt() -> 'app_metadata' ->> 'admin_role'), ''), '')
    NOT IN ('super_admin', 'cs') THEN
    RETURN NULL;
  END IF;

  SELECT au.created_at INTO v_created FROM auth.users au WHERE au.id = p_user_id;
  RETURN v_created;
END;
$$;

COMMENT ON FUNCTION public.admin_user_registered_at_for_staff(uuid) IS 'staff 讀取用戶註冊時間（不對前端暴露原始 auth.users 表）';

REVOKE ALL ON FUNCTION public.admin_user_registered_at_for_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_registered_at_for_staff(uuid)
  TO authenticated;
