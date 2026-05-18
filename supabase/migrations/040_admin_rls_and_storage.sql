-- 主後台：JWT app_metadata.admin_role 與 RLS / Storage / RPC
-- @see docs/08-admin.md

-- -----------------------------------------------------------------------------
-- JWT helper（INVOKER：讀取目前請求的 JWT）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_admin_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(trim(auth.jwt() -> 'app_metadata' ->> 'admin_role'), '');
$$;

COMMENT ON FUNCTION public.current_admin_role() IS '後台角色：super_admin | editor | cs';

REVOKE ALL ON FUNCTION public.current_admin_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_admin_role() TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC：訂單列表（含 buyer email）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_orders_for_staff(p_limit int DEFAULT 200)
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
BEGIN
  IF coalesce(nullif(trim(auth.jwt() -> 'app_metadata' ->> 'admin_role'), ''), '')
    NOT IN ('super_admin', 'cs') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT o.id, o.public_order_no, o.status, o.total, o.created_at, au.email::text
  FROM orders o
  JOIN auth.users au ON au.id = o.user_id
  ORDER BY o.created_at DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_orders_for_staff(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_orders_for_staff(int) TO authenticated;

-- -----------------------------------------------------------------------------
-- RPC：用戶列表（profile + email）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_users_directory(p_limit int DEFAULT 500)
RETURNS TABLE (
  user_id uuid,
  email text,
  name text,
  diet_method text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF coalesce(nullif(trim(auth.jwt() -> 'app_metadata' ->> 'admin_role'), ''), '')
    NOT IN ('super_admin', 'cs') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    up.user_id,
    au.email::text,
    up.name::text,
    up.diet_method::text,
    up.updated_at
  FROM user_profiles up
  JOIN auth.users au ON au.id = up.user_id
  ORDER BY up.updated_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_users_directory(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_users_directory(int) TO authenticated;

-- -----------------------------------------------------------------------------
-- brands
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff editors select all brands"
ON brands FOR SELECT
USING (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors insert brands"
ON brands FOR INSERT
WITH CHECK (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors update brands"
ON brands FOR UPDATE
USING (public.current_admin_role() IN ('super_admin', 'editor'))
WITH CHECK (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Super admin delete brands"
ON brands FOR DELETE
USING (public.current_admin_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff editors select all products"
ON products FOR SELECT
USING (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors insert products"
ON products FOR INSERT
WITH CHECK (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors update products"
ON products FOR UPDATE
USING (public.current_admin_role() IN ('super_admin', 'editor'))
WITH CHECK (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Super admin delete products"
ON products FOR DELETE
USING (public.current_admin_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- product_variants
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff editors select all variants"
ON product_variants FOR SELECT
USING (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors insert variants"
ON product_variants FOR INSERT
WITH CHECK (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors update variants"
ON product_variants FOR UPDATE
USING (public.current_admin_role() IN ('super_admin', 'editor'))
WITH CHECK (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Staff editors delete variants"
ON product_variants FOR DELETE
USING (public.current_admin_role() IN ('super_admin', 'editor'));

-- -----------------------------------------------------------------------------
-- vendors（catalog：後台選單需含未上架廠商時）
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff editors select all vendors"
ON vendors FOR SELECT
USING (public.current_admin_role() IN ('super_admin', 'editor'));

CREATE POLICY "Super admin write vendors"
ON vendors FOR INSERT
WITH CHECK (public.current_admin_role() = 'super_admin');

CREATE POLICY "Super admin update vendors"
ON vendors FOR UPDATE
USING (public.current_admin_role() = 'super_admin')
WITH CHECK (public.current_admin_role() = 'super_admin');

CREATE POLICY "Super admin delete vendors"
ON vendors FOR DELETE
USING (public.current_admin_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- orders / order_items / sub_orders（客服與超管）
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff cs and super select orders"
ON orders FOR SELECT
USING (public.current_admin_role() IN ('super_admin', 'cs'));

CREATE POLICY "Staff cs and super update orders"
ON orders FOR UPDATE
USING (public.current_admin_role() IN ('super_admin', 'cs'))
WITH CHECK (public.current_admin_role() IN ('super_admin', 'cs'));

CREATE POLICY "Staff cs and super select order_items"
ON order_items FOR SELECT
USING (public.current_admin_role() IN ('super_admin', 'cs'));

CREATE POLICY "Staff cs and super select sub_orders"
ON sub_orders FOR SELECT
USING (public.current_admin_role() IN ('super_admin', 'cs'));

CREATE POLICY "Staff cs and super update sub_orders"
ON sub_orders FOR UPDATE
USING (public.current_admin_role() IN ('super_admin', 'cs'))
WITH CHECK (public.current_admin_role() IN ('super_admin', 'cs'));

-- -----------------------------------------------------------------------------
-- user_profiles / user_goals（客服列表／詳情）
-- -----------------------------------------------------------------------------
CREATE POLICY "Staff cs and super select profiles"
ON user_profiles FOR SELECT
USING (public.current_admin_role() IN ('super_admin', 'cs'));

CREATE POLICY "Staff cs and super select user_goals"
ON user_goals FOR SELECT
USING (public.current_admin_role() IN ('super_admin', 'cs'));

-- -----------------------------------------------------------------------------
-- BI：超管讀取 food_logs（Dashboard 後續可用）
-- -----------------------------------------------------------------------------
CREATE POLICY "Super admin select all food_logs"
ON food_logs FOR SELECT
USING (public.current_admin_role() = 'super_admin');

-- -----------------------------------------------------------------------------
-- Storage：商品圖 public bucket
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Staff editors upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND public.current_admin_role() IN ('super_admin', 'editor')
);

CREATE POLICY "Staff editors update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.current_admin_role() IN ('super_admin', 'editor')
)
WITH CHECK (
  bucket_id = 'product-images'
  AND public.current_admin_role() IN ('super_admin', 'editor')
);

CREATE POLICY "Staff editors delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND public.current_admin_role() IN ('super_admin', 'editor')
);

-- -----------------------------------------------------------------------------
-- RPC：單一用戶 Email（詳情頁）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_user_email_for_staff(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  em text;
BEGIN
  IF coalesce(nullif(trim(auth.jwt() -> 'app_metadata' ->> 'admin_role'), ''), '')
    NOT IN ('super_admin', 'cs') THEN
    RETURN NULL;
  END IF;

  SELECT au.email::text INTO em FROM auth.users au WHERE au.id = p_user_id;
  RETURN em;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_email_for_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_user_email_for_staff(uuid) TO authenticated;
