'use client';

import Link from 'next/link';

import { getAdminBreadcrumb } from '@/app/admin/_lib/admin-breadcrumb';
import type { AdminRole } from '@/lib/admin/admin-role';

import { AdminSignOutButton } from './admin-sign-out-button';

type AdminChromeDesktopHeaderProps = Readonly<{
  pathname: string | null;
  role: AdminRole | null;
  homeHref: string;
}>;

export function AdminChromeDesktopHeader({
  pathname,
  role,
  homeHref,
}: AdminChromeDesktopHeaderProps) {
  const path = pathname ?? '/admin';
  const segments = getAdminBreadcrumb(path, homeHref);

  return (
    <header className="sticky top-0 z-30 hidden shrink-0 flex-nowrap items-center justify-between gap-4 border-b border-border bg-background px-4 py-3 md:flex">
      <nav aria-label="麵包屑" className="min-w-0 flex-1">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-caption text-muted-foreground">
          {segments.map((segment, index) => (
            <li key={`${segment.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? (
                <span aria-hidden className="text-muted-foreground">
                  /
                </span>
              ) : null}
              {segment.href ? (
                <Link
                  href={segment.href}
                  className="truncate text-foreground transition-colors hover:text-primary"
                >
                  {segment.label}
                </Link>
              ) : (
                <span
                  className={
                    index === segments.length - 1
                      ? 'truncate font-medium text-foreground'
                      : 'truncate'
                  }
                >
                  {segment.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex max-w-[min(20rem,45vw)] shrink-0 flex-nowrap items-center gap-3">
        {role ? (
          <span className="hidden truncate text-caption text-muted-foreground sm:inline">
            角色：{role}
          </span>
        ) : null}
        <AdminSignOutButton fullWidth={false} className="mt-0 shrink-0 whitespace-nowrap" />
      </div>
    </header>
  );
}
