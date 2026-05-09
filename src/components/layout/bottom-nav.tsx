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
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <nav
        aria-label="主選單"
        className="pointer-events-auto grid grid-cols-5 rounded-2xl border border-white/15 bg-primary px-1 py-1.5"
      >
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-1 focus-visible:ring-offset-primary',
                active ? 'bg-white/20 text-white' : 'text-white/70',
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
    </div>
  );
}
