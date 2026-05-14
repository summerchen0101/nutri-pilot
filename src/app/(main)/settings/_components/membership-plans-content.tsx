import Link from 'next/link';
import { Crown } from 'lucide-react';

import {
  MEMBERSHIP_BROWSE_SHOP_HREF,
  MEMBERSHIP_BROWSE_SHOP_LABEL,
  MEMBERSHIP_CARD_INTRO,
  MEMBERSHIP_CURRENT_PLAN_LABEL,
  MEMBERSHIP_DISCLAIMER,
  MEMBERSHIP_PLANS,
} from '@/app/(main)/settings/_lib/membership-plans';
import { SectionHeading } from '@/components/ui/section-heading';
import { cn } from '@/lib/utils/cn';

interface MembershipPlansContentProps {
  showSectionHeading?: boolean;
  className?: string;
}

export function MembershipPlansContent({
  showSectionHeading = true,
  className,
}: MembershipPlansContentProps) {
  return (
    <div className={className}>
      {showSectionHeading ? (
        <SectionHeading icon={Crown} className="mb-2">
          會員方案
        </SectionHeading>
      ) : null}
      <p className="mb-2 text-caption leading-relaxed text-muted-foreground">{MEMBERSHIP_CARD_INTRO}</p>
      <p className="mb-3 rounded-lg bg-primary-light px-3 py-2 text-caption font-medium text-primary">
        {MEMBERSHIP_CURRENT_PLAN_LABEL}
      </p>
      <ul className="space-y-3">
        {MEMBERSHIP_PLANS.map((plan) => (
          <li
            key={plan.id}
            className={cn(
              'rounded-xl border-hairline border-border bg-background px-3 py-3',
              plan.id !== 'free' && 'border-primary',
            )}>
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <span className="text-heading-card text-foreground">{plan.name}</span>
              <span className="text-body font-medium text-foreground">{plan.monthlyPriceLabel}</span>
            </div>
            <p className="mt-1 text-caption leading-relaxed text-muted-foreground">{plan.highlight}</p>
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-caption text-neutral-text-tertiary">
              {plan.bullets.map((line, index) => (
                <li key={`${plan.id}-${index}`} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-caption leading-relaxed text-muted-foreground">{MEMBERSHIP_DISCLAIMER}</p>
      <Link
        href={MEMBERSHIP_BROWSE_SHOP_HREF}
        className="mt-3 flex min-h-11 w-full items-center justify-center rounded-[10px] border-[1.5px] border-primary bg-transparent text-body font-medium text-primary transition-colors duration-150 ease-out hover:bg-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        {MEMBERSHIP_BROWSE_SHOP_LABEL}
      </Link>
    </div>
  );
}
