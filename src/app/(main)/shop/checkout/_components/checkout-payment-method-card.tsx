'use client';

import { cn } from '@/lib/utils/cn';

export interface CheckoutPaymentMethodCardProps {
  /** 超商取貨付款（門市取貨＋付款）；否則為門市僅取貨，走線上付款 */
  isCod?: boolean;
}

type CvsPaymentKind = 'online' | 'in_store';

interface CvsPaymentOption {
  kind: CvsPaymentKind;
  title: string;
  description: string;
}

const CVS_PAYMENT_OPTIONS: CvsPaymentOption[] = [
  {
    kind: 'online',
    title: '線上付款（綠界金流）',
    description:
      '門市僅取貨：先線上完成付款，再至超商取貨；實際可選付款工具以綠界頁面為準。',
  },
  {
    kind: 'in_store',
    title: '到店支付',
    description: '門市取貨＋付款：全額於超商取貨時支付，無需線上付款。',
  },
];

function PaymentOptionRow({
  option,
  selected,
}: {
  option: CvsPaymentOption;
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-[10px] border-hairline px-3 py-3',
        selected ? 'border-border' : 'border-transparent opacity-60',
      )}
      role="presentation"
      aria-current={selected ? 'true' : undefined}
    >
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-hairline',
          selected ?
            'border-transparent bg-[#4C956C]'
          : 'border-border bg-transparent',
        )}
        aria-hidden
      >
        {selected ?
          <span className="block h-1.5 w-1.5 rounded-full bg-[var(--color-background-primary)]" />
        : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-foreground">{option.title}</p>
        <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
          {option.description}
        </p>
      </div>
    </div>
  );
}

export function CheckoutPaymentMethodCard({
  isCod = false,
}: CheckoutPaymentMethodCardProps) {
  const selectedKind: CvsPaymentKind = isCod ? 'in_store' : 'online';

  return (
    <section className="rounded-xl bg-[var(--color-background-primary)] px-4 py-4">
      <h2 className="text-heading-section text-foreground">
        付款方式
        <span className="ml-0.5 text-[#E24B4A]" aria-hidden>
          *
        </span>
      </h2>

      <div className="mt-3 space-y-2" role="radiogroup" aria-label="付款方式">
        {CVS_PAYMENT_OPTIONS.map((option) => (
          <PaymentOptionRow
            key={option.kind}
            option={option}
            selected={option.kind === selectedKind}
          />
        ))}
      </div>
    </section>
  );
}
