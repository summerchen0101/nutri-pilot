const SHOP_FIXED_SEGMENTS = new Set(['cart', 'success']);

/** 商城首頁 `/shop`（可含尾隨斜線）。 */
export function isShopCatalogHomePathname(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/shop' || pathname === '/shop/';
}

/**
 * `/shop/:productId` 動態商品頁的 `productId`，排除 `cart`、`success` 等固定路徑。
 */
export function getShopProductIdFromPathname(
  pathname: string | null,
): string | null {
  if (!pathname?.startsWith('/shop/')) return null;
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 2 || parts[0] !== 'shop') return null;
  const id = parts[1];
  if (SHOP_FIXED_SEGMENTS.has(id)) return null;
  return id;
}
