-- 公告：staff 可查全部／維護；一般使用者沿用 013 公開唯讀政策
-- @see docs/03-features Phase 6 P6-1；public.current_admin_role() 見 040

CREATE POLICY "Staff editors select all announcements"
ON announcements FOR SELECT
TO authenticated
USING (
  coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor')
);

CREATE POLICY "Staff editors insert announcements"
ON announcements FOR INSERT
TO authenticated
WITH CHECK (
  coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor')
);

CREATE POLICY "Staff editors update announcements"
ON announcements FOR UPDATE
TO authenticated
USING (
  coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor')
)
WITH CHECK (
  coalesce(public.current_admin_role(), '') IN ('super_admin', 'editor')
);

CREATE POLICY "Super admin delete announcements"
ON announcements FOR DELETE
TO authenticated
USING (coalesce(public.current_admin_role(), '') = 'super_admin');
