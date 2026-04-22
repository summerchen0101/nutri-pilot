'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Shield,
  ShoppingCart,
  UserRound,
} from 'lucide-react';

import { cn } from '@/lib/utils/cn';

const NAV = [
  { href: '/dashboard', label: '總覽', Icon: LayoutDashboard },
  { href: '/guard', label: '守衛', Icon: Shield },
  { href: '/log', label: '紀錄', Icon: PlusCircle },
  { href: '/shop', label: '商城', Icon: ShoppingCart },
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
      className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-neutral-border-secondary bg-card shadow-[0_-4px_16px_-2px_rgba(30,33,43,0.06)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-1 rounded-lg px-2 py-1 text-[11px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              active
                ? 'bg-primary-light font-semibold text-primary-foreground'
                : 'font-medium text-neutral-text-secondary',
            )}
          >
            <Icon
              className={cn('shrink-0', active ? 'h-5 w-5' : 'h-[18px] w-[18px]')}
              strokeWidth={active ? 2.25 : 2}
              aria-hidden
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
