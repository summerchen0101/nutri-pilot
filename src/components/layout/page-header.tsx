import type { ReactNode } from "react";

import { PageHeading } from "@/components/ui/page-heading";
import { cn } from "@/lib/utils/cn";

export interface PageHeaderProps {
  leading?: ReactNode;
  title: string;
  /** 取代預設 PageHeading；建議搭配 sr-only 標題由 title 提供 */
  titleSlot?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  spacing?: "compact" | "default";
  className?: string;
  /** 捲動可見性偵測等用途（例如商城浮動購物車按鈕） */
  anchorId?: string;
}

export function PageHeader({
  leading,
  title,
  titleSlot,
  meta,
  action,
  spacing = "default",
  className,
  anchorId,
}: PageHeaderProps) {
  return (
    <header
      id={anchorId}
      className={cn(
        "flex items-center justify-between gap-3",
        spacing === "default" ? "pb-1" : "",
        className,
      )}>
      <div className="flex min-w-0 items-center gap-2.5">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 space-y-1">
          <div className="flex min-h-9 items-center">
            {titleSlot ?
              <>
                <span className="sr-only">{title}</span>
                {titleSlot}
              </>
            : <PageHeading>{title}</PageHeading>}
          </div>
          {meta ? <div className="pt-0.5">{meta}</div> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
