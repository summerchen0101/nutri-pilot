import { CircleDollarSign } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";

interface ShopHeaderPointsTitleProps {
  balance: number;
  className?: string;
}

/** 商城頁首：購物金餘額（貨幣圖示 + 數字，可點進點數紀錄） */
export function ShopHeaderPointsTitle({
  balance,
  className,
}: ShopHeaderPointsTitleProps) {
  const points = Math.max(
    0,
    Math.floor(Number.isFinite(balance) ? balance : 0),
  );
  const formatted = points.toLocaleString("zh-TW");

  return (
    <Link
      href="/settings/points"
      aria-label={`購物金餘額 ${formatted} 元，前往點數紀錄`}
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1",
        "rounded-lg px-1 py-1 outline-none",
        "transition-opacity active:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/25 space-x-1",
        className,
      )}>
      <CircleDollarSign className="h-[19px] w-[19px] shrink-0" aria-hidden />
      <span className="min-w-0 truncate tabular-nums text-heading-section font-medium leading-none text-primary ">
        {formatted}
      </span>
    </Link>
  );
}
