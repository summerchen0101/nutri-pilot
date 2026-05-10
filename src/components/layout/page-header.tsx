import type { ReactNode } from "react";

import { PageHeading } from "@/components/ui/page-heading";
import { cn } from "@/lib/utils/cn";

interface PageHeaderProps {
  leading?: ReactNode;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  spacing?: "compact" | "default";
  className?: string;
}

export function PageHeader({
  leading,
  title,
  meta,
  action,
  spacing = "default",
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3",
        spacing === "default" ? "pb-1" : "",
        className,
      )}>
      <div className="flex min-w-0 items-center gap-2.5">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 space-y-1">
          <div className="flex min-h-9 items-center">
            <PageHeading>{title}</PageHeading>
          </div>
          {meta ? <div className="pt-0.5">{meta}</div> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
