'use client';

export function CheckoutPaymentMethodCard() {
  return (
    <section className="rounded-xl bg-[var(--color-background-primary)] px-4 py-4">
      <h2 className="text-heading-section text-foreground">
        付款方式
        <span className="ml-0.5 text-[#E24B4A]" aria-hidden>
          *
        </span>
      </h2>

      <div
        className="mt-3 flex items-start gap-3 rounded-[10px] border-hairline border-border px-3 py-3"
        role="presentation"
      >
        <span
          className="mt-0.5 flex h-4 w-4 shrink-0 rounded-full bg-[#4C956C]"
          aria-hidden
        >
          <span className="m-auto block h-1.5 w-1.5 rounded-full bg-[var(--color-background-primary)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium text-foreground">線上付款（藍新金流）</p>
          <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
            送出訂單後將導向藍新金流安全付款頁完成一次付清；實際可選付款工具以該頁為準。
          </p>
        </div>
      </div>
    </section>
  );
}
