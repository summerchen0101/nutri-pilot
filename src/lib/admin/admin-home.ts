/**
 * 後台根路徑 `/admin` 依角色導向的預設首頁（middleware 與 admin/page 共用）。
 */
export function adminHomeForRole(role: string): string {
  if (role === 'cs') {
    return '/admin/orders';
  }
  return '/admin/dashboard';
}
