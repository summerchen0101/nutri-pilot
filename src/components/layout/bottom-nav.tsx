'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils/cn';

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect x="3" y="10" width="4" height="7" rx="1" fill="currentColor" />
      <rect x="8" y="6" width="4" height="11" rx="1" fill="currentColor" opacity=".6" />
      <rect x="13" y="3" width="4" height="14" rx="1" fill="currentColor" opacity=".4" />
    </svg>
  );
}

function IconPlan({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect
        x="3"
        y="3"
        width="14"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth={1.4}
        fill="none"
      />
      <line x1="7" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <line x1="7" y1="11" x2="11" y2="11" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <line x1="7" y1="14" x2="10" y2="14" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

function IconLog({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth={1.4} fill="none" />
      <line x1="10" y1="6.5" x2="10" y2="13.5" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <line x1="6.5" y1="10" x2="13.5" y2="10" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

function IconShop({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M3.5 4h2l2 7h7l1.5-5H7"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="9" cy="16.5" r="1" fill="currentColor" />
      <circle cx="14" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth={1.4} fill="none" />
      <path
        d="M10 3v1.5M10 15.5V17M3 10h1.5M15.5 10H17M4.93 4.93l1.06 1.06M14.01 14.01l1.06 1.06M4.93 15.07l1.06-1.06M14.01 5.99l1.06-1.06"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

const NAV = [
  { href: '/dashboard', label: '總覽', Icon: IconDashboard },
  { href: '/plan', label: '計畫', Icon: IconPlan },
  { href: '/log', label: '紀錄', Icon: IconLog },
  { href: '/shop', label: '商城', Icon: IconShop },
  { href: '/settings', label: '設定', Icon: IconSettings },
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
      className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-[0.5px] border-[#E8E9ED] bg-white px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors duration-150',
              active ? 'bg-[#EBF5EF] text-[#4C956C]' : 'text-[#9298A8]',
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
