/** 非 `[productId]` 的 `/shop/{segment}` 固定頁 */
export const SHOP_FIXED_ROUTE_SEGMENTS = new Set([
  'cart',
  'checkout',
  'favorites',
  'history',
  'settings',
  'success',
]);

/** 是否為 `/shop` 樹狀路由（含首頁與子路徑），用於專用底部導覽。 */
export function isShopRoutePathname(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/shop' || pathname.startsWith('/shop/');
}

/** 商城首頁 `/shop`（可含尾隨斜線）。 */
export function isShopCatalogHomePathname(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/shop' || pathname === '/shop/';
}

/**
 * `/shop/:productId` 動態商品頁的 `productId`，排除 `cart`、`checkout` 等固定路徑。
 */
export function getShopProductIdFromPathname(
  pathname: string | null,
): string | null {
  if (!pathname?.startsWith('/shop/')) return null;
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 2 || parts[0] !== 'shop') return null;
  const id = parts[1];
  if (SHOP_FIXED_ROUTE_SEGMENTS.has(id)) return null;
  return id;
}

/** 是否為商品詳情頁（有 productId 且非固定子路徑） */
export function isShopProductDetailPathname(pathname: string | null): boolean {
  return getShopProductIdFromPathname(pathname) != null;
}

/** `/shop/settings` hub（含未來子路由），不顯示商城底欄。 */
export function isShopSettingsHubPathname(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/shop/settings' || pathname.startsWith('/shop/settings/');
}

/** 商城設定捷徑導向的 `/settings/…` 頁，與商城頂緣對齊且不顯示主程式底欄。 */
const SHOP_COMMERCE_SHORTCUT_PATHS = new Set([
  '/settings/orders',
  '/settings/points',
  '/settings/coupons',
]);

export function isShopCommerceShortcutPathname(pathname: string | null): boolean {
  if (!pathname) return false;
  const trimmed =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return SHOP_COMMERCE_SHORTCUT_PATHS.has(trimmed);
}

/** 不顯示 ShopBottomNav 亦不顯示 BottomNav（僅商品詳情；其餘商城路徑與 commerce 捷徑由 MainAppShell 顯示 ShopBottomNav）。 */
export function shouldHideAllBottomNavPathname(pathname: string | null): boolean {
  return isShopProductDetailPathname(pathname);
}
