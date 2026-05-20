import { CircleDollarSign } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils/cn';

interface ShopHeaderPointsTitleProps {
  balance: number;
  className?: string;
  /** 預設 true：可點進點數紀錄；false 為靜態顯示（例：點數紀錄頁右上角） */
  asLink?: boolean;
}

function formatPointsBalance(balance: number): number {
  return Math.max(0, Math.floor(Number.isFinite(balance) ? balance : 0));
}

function PointsBalanceContent({ formatted }: { formatted: string }) {
  return (
    <>
      <CircleDollarSign className="h-[19px] w-[19px] shrink-0" aria-hidden />
      <span className="min-w-0 truncate tabular-nums text-heading-section font-medium leading-none text-primary">
        {formatted}
      </span>
    </>
  );
}

/** 商城頁首：購物金餘額（貨幣圖示 + 數字，可點進點數紀錄） */
export function ShopHeaderPointsTitle({
  balance,
  className,
  asLink = true,
}: ShopHeaderPointsTitleProps) {
  const points = formatPointsBalance(balance);
  const formatted = points.toLocaleString('zh-TW');

  const contentClassName = cn(
    'inline-flex min-w-0 max-w-full items-center gap-1 space-x-1',
    className,
  );

  if (!asLink) {
    return (
      <span
        role="status"
        aria-label={`目前點數 ${formatted} 點`}
        className={contentClassName}
      >
        <PointsBalanceContent formatted={formatted} />
      </span>
    );
  }

  return (
    <Link
      href="/settings/points"
      aria-label={`購物金餘額 ${formatted} 元，前往點數紀錄`}
      className={cn(
        contentClassName,
        'rounded-lg px-1 py-1 outline-none',
        'transition-opacity active:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/25',
      )}
    >
      <PointsBalanceContent formatted={formatted} />
    </Link>
  );
}
