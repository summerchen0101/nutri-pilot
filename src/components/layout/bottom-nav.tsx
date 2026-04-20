'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiBarChart2,
  FiPlusCircle,
  FiShoppingCart,
  FiTrendingUp,
  FiUser,
} from 'react-icons/fi';

import { cn } from '@/lib/utils/cn';

const NAV = [
  { href: '/dashboard', label: '總覽', Icon: FiBarChart2 },
  { href: '/log', label: '紀錄', Icon: FiPlusCircle },
  { href: '/shop', label: '商城', Icon: FiShoppingCart },
  { href: '/analytics', label: '分析', Icon: FiTrendingUp },
  { href: '/settings', label: '我的', Icon: FiUser },
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
              'flex cursor-pointer flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors duration-150',
              active
                ? 'bg-primary-light text-primary'
                : 'text-muted-foreground',
            )}
          >
            <Icon className="shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
