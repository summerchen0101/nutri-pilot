'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

import type { AdminNavItemConfig } from './admin-nav-config';

export function adminChromeNavItemClassName(
  active: boolean,
  collapsed: boolean,
): string {
  return cn(
    'flex items-center gap-3 rounded-lg py-2 text-body transition-colors',
    collapsed ? 'justify-center px-2' : 'px-3',
    active
      ? 'bg-primary-light font-medium text-primary'
      : 'text-foreground hover:bg-secondary',
  );
}

type AdminChromeNavItemProps = Readonly<{
  item: AdminNavItemConfig;
  pathname: string | null;
  collapsed: boolean;
  onNavigate?: () => void;
}>;

export function AdminChromeNavItem({
  item,
  pathname,
  collapsed,
  onNavigate,
}: AdminChromeNavItemProps) {
  const Icon = item.icon;
  const active =
    pathname === item.href ||
    (pathname != null && pathname.startsWith(`${item.href}/`));

  return (
    <Link
      href={item.href}
      title={item.label}
      onClick={onNavigate}
      className={adminChromeNavItemClassName(active, collapsed)}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
    </Link>
  );
}

type NavLinkListProps = Readonly<{
  items: AdminNavItemConfig[];
  pathname: string | null;
  collapsed: boolean;
  onNavigate?: () => void;
}>;

/** 扁平原 nav（抽屜內單區塊時可用；一般請用 {@link AdminChromeNavSections}） */
export function AdminChromeNavLinkList({
  items,
  pathname,
  collapsed,
  onNavigate,
}: NavLinkListProps) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5" aria-label="後台主要選單">
      {items.map((item) => (
        <AdminChromeNavItem
          key={item.href}
          item={item}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
