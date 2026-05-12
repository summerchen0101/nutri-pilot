'use client';

import { cn } from '@/lib/utils/cn';

const STEPS = [
  { id: 1 as const, label: '購物清單' },
  { id: 2 as const, label: '填寫資料' },
  { id: 3 as const, label: '訂購完成' },
];

interface CheckoutProgressStepsProps {
  currentStep?: 1 | 2 | 3;
  className?: string;
}

export function CheckoutProgressSteps({
  currentStep = 1,
  className,
}: CheckoutProgressStepsProps) {
  return (
    <nav aria-label="結帳進度" className={cn('pb-3 pt-1', className)}>
      <ol className="flex w-full list-none items-start p-0">
        {STEPS.map((step, index) => {
          const active = step.id === currentStep;
          const done = step.id < currentStep;
          const isLast = index === STEPS.length - 1;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-start">
              <div className="flex w-full min-w-0 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-hairline text-micro tabular-nums',
                    active ?
                      'border-primary bg-primary-light font-medium text-primary'
                    : done ?
                      'border-primary/40 bg-primary-light/60 text-primary'
                    : 'border-border bg-muted/40 text-muted-foreground',
                  )}>
                  {step.id}
                </span>
                <span
                  className={cn(
                    'max-w-[5.25rem] text-center text-micro leading-tight',
                    active || done ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}>
                  {step.label}
                </span>
              </div>
              {!isLast ?
                <div
                  aria-hidden
                  className={cn(
                    'mx-1 mt-3.5 h-px w-4 shrink-0 sm:w-8',
                    currentStep > step.id ? 'bg-primary/35' : 'bg-border',
                  )}
                />
              : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
