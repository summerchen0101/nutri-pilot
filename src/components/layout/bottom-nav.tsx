'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils/cn';

const NAV = [
  { href: '/dashboard', label: '總覽' },
  { href: '/plan', label: '計畫' },
  { href: '/log', label: '紀錄' },
  { href: '/analytics', label: '數據' },
  { href: '/settings', label: '設定' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <nav
        aria-label="主選單"
        className="pointer-events-auto mx-4 w-full max-w-sm bg-card border-[0.5px] border-border rounded-xl p-1.5 shadow-none"
      >
        <ul className="flex items-stretch gap-1">
          {NAV.map(({ href, label }) => {
            const active =
              pathname === href ||
              (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href} className="min-w-0 flex-1">
                <Link
                  href={href}
                  className={cn(
                    'flex h-full items-center justify-center rounded-lg px-1 py-2 text-[10px] transition-colors duration-150 ease-out',
                    active
                      ? 'bg-[#E8F5EE] font-medium text-[#4C956C]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
