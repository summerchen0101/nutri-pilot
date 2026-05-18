'use client';

import { Menu, X } from 'lucide-react';

import { getAdminMobileHeaderTitle } from '@/app/admin/_lib/admin-breadcrumb';
import type { AdminRole } from '@/lib/admin/admin-role';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

import { AdminChromeNavSections } from './admin-chrome-nav-groups';
import type { AdminNavSectionConfig } from './admin-nav-config';
import { AdminSignOutButton } from './admin-sign-out-button';

type AdminChromeMobileNavProps = Readonly<{
  isOpen: boolean;
  sidebarInnerClassName: string;
  sections: AdminNavSectionConfig[];
  pathname: string | null;
  role: AdminRole | null;
  homeHref: string;
  onOpen: () => void;
  onClose: () => void;
}>;

export function AdminChromeMobileNav({
  isOpen,
  sidebarInnerClassName,
  sections,
  pathname,
  role,
  homeHref,
  onOpen,
  onClose,
}: AdminChromeMobileNavProps) {
  const path = pathname ?? '/admin';
  const headerTitle = getAdminMobileHeaderTitle(path, homeHref);

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/40 md:hidden"
          aria-label="關閉選單"
          onClick={onClose}
        />
      ) : null}

      <aside
        id="admin-mobile-nav"
        className={cn(
          sidebarInnerClassName,
          'fixed inset-y-0 left-0 z-50 w-52 px-3 transition-transform duration-200 ease-out md:hidden',
          isOpen
            ? 'translate-x-0'
            : 'pointer-events-none invisible -translate-x-full',
        )}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border pb-4">
          <p className="text-heading-card text-foreground">主後台</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 px-2"
            aria-label="關閉選單"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto pt-4">
          <AdminChromeNavSections
            sections={sections}
            pathname={pathname}
            collapsed={false}
            onNavigate={onClose}
          />
        </div>
        <div className="border-t border-border pt-4">
          <p className="truncate px-2 text-caption">角色：{role}</p>
          <AdminSignOutButton />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 py-3 md:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 shrink-0 px-3"
          aria-expanded={isOpen}
          aria-controls="admin-mobile-nav"
          aria-label="開啟選單"
          onClick={onOpen}
        >
          <Menu className="h-4 w-4" aria-hidden />
        </Button>
        <span className="min-w-0 truncate text-heading-card text-foreground">
          {headerTitle}
        </span>
      </header>
    </>
  );
}
