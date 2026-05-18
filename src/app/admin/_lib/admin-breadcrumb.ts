export type AdminBreadcrumbSegment = {
  label: string;
  /** 最末段或當前頁可省略，改以 span 呈現 */
  href?: string;
};

/**
 * 後台麵包屑（首段「主後台」連結依角色首頁，與 middleware／admin root 一致）。
 */
export function getAdminBreadcrumb(
  pathname: string,
  homeHref: string,
): AdminBreadcrumbSegment[] {
  const root: AdminBreadcrumbSegment = { label: '主後台', href: homeHref };
  const path = pathname.replace(/\/$/, '') || '/admin';

  if (path === '/admin') {
    return [root];
  }

  const withRoot = (segments: AdminBreadcrumbSegment[]): AdminBreadcrumbSegment[] => [
    root,
    ...segments,
  ];

  if (path === '/admin/dashboard') {
    return withRoot([{ label: '總覽' }]);
  }

  if (path === '/admin/settings') {
    return withRoot([{ label: '設定' }]);
  }

  if (path === '/admin/products') {
    return withRoot([{ label: '商品' }]);
  }
  if (path === '/admin/products/new') {
    return withRoot([
      { label: '商品', href: '/admin/products' },
      { label: '新增' },
    ]);
  }
  if (/^\/admin\/products\/[^/]+$/.test(path)) {
    return withRoot([
      { label: '商品', href: '/admin/products' },
      { label: '編輯' },
    ]);
  }

  if (path === '/admin/brands') {
    return withRoot([{ label: '品牌' }]);
  }
  if (path === '/admin/brands/new') {
    return withRoot([
      { label: '品牌', href: '/admin/brands' },
      { label: '新增' },
    ]);
  }
  if (/^\/admin\/brands\/[^/]+$/.test(path)) {
    return withRoot([
      { label: '品牌', href: '/admin/brands' },
      { label: '編輯' },
    ]);
  }

  if (path === '/admin/orders') {
    return withRoot([{ label: '訂單' }]);
  }
  if (/^\/admin\/orders\/[^/]+$/.test(path)) {
    return withRoot([
      { label: '訂單', href: '/admin/orders' },
      { label: '詳情' },
    ]);
  }

  if (path === '/admin/users') {
    return withRoot([{ label: '用戶' }]);
  }
  if (/^\/admin\/users\/[^/]+$/.test(path)) {
    return withRoot([
      { label: '用戶', href: '/admin/users' },
      { label: '詳情' },
    ]);
  }

  return [root];
}

/** 手機頂列標題：取最後一個麵包屑標籤（含單段「主後台」） */
export function getAdminMobileHeaderTitle(
  pathname: string,
  homeHref: string,
): string {
  const segments = getAdminBreadcrumb(pathname, homeHref);
  const last = segments[segments.length - 1];
  return last?.label ?? '主後台';
}
