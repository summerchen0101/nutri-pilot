'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  ShoppingCart,
  Tag,
  UserRound,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';

const NAV = [
  { href: '/dashboard', label: '總覽', Icon: LayoutDashboard },
  { href: '/log', label: '紀錄', Icon: PlusCircle },
  { href: '/shop', label: '商城', Icon: ShoppingCart },
  { href: '/guard', label: '守衛', Icon: Tag },
  { href: '/settings', label: '我的', Icon: UserRound },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主選單"
      className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-[0.5px] border-border bg-card px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors duration-150',
              active
                ? 'bg-primary-light text-primary'
                : 'text-muted-foreground',
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
