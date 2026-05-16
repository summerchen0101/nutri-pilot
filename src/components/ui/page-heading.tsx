import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface PageHeadingProps extends Omit<
  HTMLAttributes<HTMLHeadingElement>,
  "children"
> {
  children: ReactNode;
}

export function PageHeading({
  className,
  children,
  ...props
}: PageHeadingProps) {
  return (
    <h1
      className={cn("text-heading-screen text-foreground", className)}
      {...props}>
      {children}
    </h1>
  );
}
