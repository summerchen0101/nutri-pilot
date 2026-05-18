'use client';

import type { AdminRole } from '@/lib/admin/admin-role';
import { cn } from '@/lib/utils/cn';

import { AdminChromeNavItem } from './admin-chrome-nav';
import type { AdminNavSectionConfig } from './admin-nav-config';

type AdminChromeSidebarDesktopProps = Readonly<{
  sections: AdminNavSectionConfig[];
  pathname: string | null;
  role: AdminRole | null;
  activeSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
}>;

export function AdminChromeSidebarDesktop({
  sections,
  pathname,
  role,
  activeSectionId,
  onSelectSection,
}: AdminChromeSidebarDesktopProps) {
  const active =
    sections.find((s) => s.id === activeSectionId) ?? sections[0];

  return (
    <div className="hidden h-full shrink-0 md:flex">
      <div
        className="flex h-full w-14 shrink-0 flex-col items-center border-r border-border bg-background py-4"
        aria-label="後台分類"
      >
        {sections.map((section) => {
          const Icon = section.railIcon;
          const isActive = section.id === activeSectionId;
          return (
            <div
              key={section.id}
              className="group relative flex w-full justify-center py-1"
            >
              <button
                type="button"
                title={section.railLabel}
                aria-label={section.railLabel}
                aria-pressed={isActive}
                onClick={() => onSelectSection(section.id)}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-light text-primary'
                    : 'text-foreground hover:bg-secondary',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </button>
              <span
                className="pointer-events-none absolute left-full top-1/2 z-[60] ml-1.5 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-background px-2 py-1 text-caption text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              >
                {section.railLabel}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex h-full w-52 shrink-0 flex-col border-r border-border bg-secondary/40 px-3 py-6">
        <p className="px-2 text-micro uppercase tracking-wide text-muted-foreground">
          Nutri Pilot
        </p>
        <p className="px-2 pb-4 pt-0 text-heading-card text-foreground">
          {active?.railLabel ?? '主後台'}
        </p>
        <nav
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto"
          aria-label={active ? `後台：${active.railLabel}` : '後台'}
        >
          {(active?.items ?? []).map((item) => (
            <AdminChromeNavItem
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={false}
            />
          ))}
        </nav>
        <div className="mt-auto border-t border-border pt-4">
          <p className="truncate px-2 text-caption">角色：{role}</p>
        </div>
      </div>
    </div>
  );
}
