'use client';

import { cn } from '@/lib/utils/cn';

import type { AdminNavSectionConfig } from './admin-nav-config';
import { AdminChromeNavItem } from './admin-chrome-nav';

type AdminChromeNavSectionsProps = Readonly<{
  sections: AdminNavSectionConfig[];
  pathname: string | null;
  collapsed: boolean;
  onNavigate?: () => void;
}>;

export function AdminChromeNavSections({
  sections,
  pathname,
  collapsed,
  onNavigate,
}: AdminChromeNavSectionsProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {sections.map((section, sectionIndex) => (
        <section key={section.id}>
          {section.sectionLabel && !collapsed ? (
            <h2
              className={cn(
                'px-2 pb-1 text-micro uppercase tracking-wide text-muted-foreground',
                sectionIndex === 0 ? 'pt-0' : 'pt-2',
              )}
            >
              {section.sectionLabel}
            </h2>
          ) : null}
          <nav
            className="flex flex-col gap-0.5"
            aria-label={
              section.sectionLabel
                ? `後台：${section.sectionLabel}`
                : '後台主要選單'
            }
          >
            {section.items.map((item) => (
              <AdminChromeNavItem
                key={item.href}
                item={item}
                pathname={pathname}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </nav>
        </section>
      ))}
    </div>
  );
}
