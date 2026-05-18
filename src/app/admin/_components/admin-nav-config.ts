import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  Headset,
  LayoutDashboard,
  Megaphone,
  Package,
  ScrollText,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from 'lucide-react';

import type { AdminRole } from '@/lib/admin/admin-role';

export type AdminNavItemConfig = {
  href: string;
  label: string;
  roles: AdminRole[];
  icon: LucideIcon;
};

export type AdminNavSectionConfig = {
  /** 穩定鍵（分類軌、點選狀態） */
  id: string;
  sectionLabel: string | null;
  /** 分類軌顯示名（hover 提示、第二欄標題） */
  railLabel: string;
  railIcon: LucideIcon;
  items: AdminNavItemConfig[];
};

const DASHBOARD_ITEM: AdminNavItemConfig = {
  href: '/admin/dashboard',
  label: '總覽',
  roles: ['super_admin', 'editor'],
  icon: LayoutDashboard,
};

const PRODUCT_ITEM: AdminNavItemConfig = {
  href: '/admin/products',
  label: '商品',
  roles: ['super_admin', 'editor'],
  icon: Package,
};

const BRAND_ITEM: AdminNavItemConfig = {
  href: '/admin/brands',
  label: '品牌',
  roles: ['super_admin', 'editor'],
  icon: Building2,
};

const ANNOUNCEMENTS_ITEM: AdminNavItemConfig = {
  href: '/admin/announcements',
  label: '公告',
  roles: ['super_admin', 'editor'],
  icon: Megaphone,
};

const ORDER_ITEM: AdminNavItemConfig = {
  href: '/admin/orders',
  label: '訂單',
  roles: ['super_admin', 'cs'],
  icon: ShoppingCart,
};

const USER_ITEM: AdminNavItemConfig = {
  href: '/admin/users',
  label: '用戶',
  roles: ['super_admin', 'cs'],
  icon: Users,
};

const SETTINGS_ITEM: AdminNavItemConfig = {
  href: '/admin/settings',
  label: '設定',
  roles: ['super_admin'],
  icon: Settings,
};

const SETTINGS_AUDIT_ITEM: AdminNavItemConfig = {
  href: '/admin/settings/audit',
  label: '稽核',
  roles: ['super_admin'],
  icon: ScrollText,
};

/** 後台側欄分組（與角色無關；顯示前請用 {@link filterAdminNavSections} 過濾） */
export const ADMIN_NAV_SECTIONS: AdminNavSectionConfig[] = [
  {
    id: 'overview',
    sectionLabel: null,
    railLabel: '總覽',
    railIcon: LayoutDashboard,
    items: [DASHBOARD_ITEM],
  },
  {
    id: 'operations',
    sectionLabel: '營運',
    railLabel: '營運',
    railIcon: Store,
    items: [PRODUCT_ITEM, BRAND_ITEM, ANNOUNCEMENTS_ITEM],
  },
  {
    id: 'support',
    sectionLabel: '客服',
    railLabel: '客服',
    railIcon: Headset,
    items: [ORDER_ITEM, USER_ITEM],
  },
  {
    id: 'system',
    sectionLabel: '系統',
    railLabel: '系統',
    railIcon: Settings,
    items: [SETTINGS_ITEM, SETTINGS_AUDIT_ITEM],
  },
];

export function filterAdminNavSections(
  role: AdminRole | null,
): AdminNavSectionConfig[] {
  if (!role) {
    return [];
  }
  return ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}

/** 依目前 pathname 決定所屬分類 id（用於雙欄同步） */
export function getActiveSectionIdFromPath(
  sections: AdminNavSectionConfig[],
  pathname: string | null,
): string | null {
  if (sections.length === 0) {
    return null;
  }
  if (pathname == null) {
    return sections[0]?.id ?? null;
  }
  for (const section of sections) {
    const match = section.items.some(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    if (match) {
      return section.id;
    }
  }
  return sections[0]?.id ?? null;
}
