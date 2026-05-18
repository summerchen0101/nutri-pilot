-- 後台稽核日誌（P6-2）
-- @see docs/08-admin.md、docs/03-features.md Phase 6

CREATE TABLE public.admin_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_logs_created_at_idx
  ON public.admin_logs (created_at DESC);

CREATE INDEX admin_logs_admin_id_created_at_idx
  ON public.admin_logs (admin_id, created_at DESC);

COMMENT ON TABLE public.admin_logs IS '後台操作稽核（append-only）；寫入請用 admin_append_audit_log RPC';

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin read admin_logs"
ON public.admin_logs FOR SELECT
TO authenticated
USING (public.current_admin_role() = 'super_admin');

-- 僅透過 SECURITY DEFINER RPC 寫入；不開放一般 authenticated 直寫表

-- -----------------------------------------------------------------------------
-- RPC：寫入一筆稽核（JWT 須為 staff；admin_id 固定為 auth.uid()）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_append_audit_log(
  p_action text,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := coalesce(nullif(trim(auth.jwt() -> 'app_metadata' ->> 'admin_role'), ''), '');
BEGIN
  IF v_role NOT IN ('super_admin', 'editor', 'cs') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF length(trim(coalesce(p_action, ''))) = 0 THEN
    RAISE EXCEPTION 'p_action required' USING ERRCODE = '22023';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.admin_logs (admin_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    trim(p_action),
    nullif(trim(coalesce(p_target_type, '')), ''),
    nullif(trim(coalesce(p_target_id, '')), ''),
    coalesce(p_metadata, '{}'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION public.admin_append_audit_log(text, text, text, jsonb) IS '後台稽核：由 staff JWT 寫入一筆 admin_logs';

REVOKE ALL ON FUNCTION public.admin_append_audit_log(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_append_audit_log(text, text, text, jsonb) TO authenticated;

GRANT SELECT ON public.admin_logs TO authenticated;

