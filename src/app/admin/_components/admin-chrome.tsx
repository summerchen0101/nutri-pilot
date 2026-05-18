'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { usePathname } from 'next/navigation';

import { adminHomeForRole } from '@/lib/admin/admin-home';
import type { AdminRole } from '@/lib/admin/admin-role';

import { AdminChromeDesktopHeader } from './admin-chrome-desktop-header';
import { AdminChromeMobileNav } from './admin-chrome-mobile-nav';
import { AdminChromeSidebarDesktop } from './admin-chrome-sidebar-desktop';
import {
  filterAdminNavSections,
  getActiveSectionIdFromPath,
} from './admin-nav-config';

export function AdminChrome({
  role,
  children,
}: Readonly<{
  role: AdminRole | null;
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [manualSectionId, setManualSectionId] = useState<string | null>(null);

  const closeMobileNav = useCallback(() => {
    setIsMobileNavOpen(false);
  }, []);

  useEffect(() => {
    closeMobileNav();
  }, [pathname, closeMobileNav]);

  useEffect(() => {
    setManualSectionId(null);
  }, [pathname]);

  const sections = useMemo(() => filterAdminNavSections(role), [role]);
  const homeHref = role ? adminHomeForRole(role) : '/admin';

  const activeSectionId =
    manualSectionId ??
    getActiveSectionIdFromPath(sections, pathname ?? null) ??
    sections[0]?.id ??
    null;

  if (pathname?.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  const drawerSidebarClassName =
    'flex h-full shrink-0 flex-col border-r border-border bg-secondary/40 py-6';

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background text-foreground md:h-dvh md:flex-row md:overflow-hidden">
      <AdminChromeSidebarDesktop
        sections={sections}
        pathname={pathname ?? null}
        role={role}
        activeSectionId={activeSectionId}
        onSelectSection={setManualSectionId}
      />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col md:min-h-0 md:overflow-hidden">
        <AdminChromeMobileNav
          isOpen={isMobileNavOpen}
          sidebarInnerClassName={drawerSidebarClassName}
          sections={sections}
          pathname={pathname ?? null}
          role={role}
          homeHref={homeHref}
          onOpen={() => setIsMobileNavOpen(true)}
          onClose={closeMobileNav}
        />
        <AdminChromeDesktopHeader
          pathname={pathname ?? null}
          role={role}
          homeHref={homeHref}
        />
        <main className="min-h-0 min-w-0 flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
