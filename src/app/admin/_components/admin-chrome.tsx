'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { AdminRole } from '@/lib/admin';

import { AdminSignOutButton } from './admin-sign-out-button';

type NavItem = { href: string; label: string; roles: AdminRole[] };

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: '總覽', roles: ['super_admin', 'editor'] },
  { href: '/admin/products', label: '商品', roles: ['super_admin', 'editor'] },
  { href: '/admin/brands', label: '品牌', roles: ['super_admin', 'editor'] },
  { href: '/admin/orders', label: '訂單', roles: ['super_admin', 'cs'] },
  { href: '/admin/users', label: '用戶', roles: ['super_admin', 'cs'] },
  { href: '/admin/settings', label: '設定', roles: ['super_admin'] },
];

export function AdminChrome({
  role,
  children,
}: Readonly<{
  role: AdminRole | null;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  if (pathname?.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  const items = NAV_ITEMS.filter((item) => role && item.roles.includes(role));

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-secondary/40 px-3 py-6">
        <p className="px-2 text-micro uppercase tracking-wide text-caption">
          Nutri Pilot
        </p>
        <p className="px-2 pb-4 text-heading-card text-foreground">主後台</p>
        <nav className="flex flex-1 flex-col gap-0.5">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-body transition-colors ${
                  active
                    ? 'bg-[#E8F5EE] font-medium text-[#4C956C]'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border pt-4">
          <p className="truncate px-2 text-caption text-caption">角色：{role}</p>
          <AdminSignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
