"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Receipt } from "lucide-react";

import { startCheckout } from "@/app/(main)/shop/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { cartTotalPayment, useCartStore } from "@/lib/shop/cart-store";
import { submitNewebpayMpgForm } from "@/lib/shop/submit-newebpay-mpg-form";

export function CartView() {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const setQty = useCartStore((s) => s.setQty);
  const removeLine = useCartStore((s) => s.removeLine);
  const clear = useCartStore((s) => s.clear);
  const closeCartPanel = useCartStore((s) => s.closeCartPanel);

  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const itemsPayload = lines.map((l) => ({
    variantId: l.variantId,
    qty: l.qty,
  }));

  function checkout() {
    setErr(null);
    if (!lines.length) return;

    startTransition(async () => {
      const res = await startCheckout({ items: itemsPayload });
      if (res.error) {
        setErr(res.error);
        return;
      }
      if (res.paymentUrl && res.formFields) {
        submitNewebpayMpgForm(res.paymentUrl, res.formFields);
      }
    });
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        message="購物車是空的"
        actionHref="/shop"
        actionLabel="前往商城"
        onActionNavigate={closeCartPanel}
      />
    );
  }

  const totalPay = cartTotalPayment(lines);

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {lines.map((line) => (
          <li
            key={line.variantId}
            className="rounded-xl bg-card p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="text-[13px] font-medium leading-snug text-foreground">
                  {line.productName}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {line.variantLabel}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 text-[11px] font-medium text-[#E55A3C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
                onClick={() => removeLine(line.variantId)}>
                移除
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] border-hairline border-border text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
                  onClick={() => setQty(line.variantId, line.qty - 1)}>
                  −
                </button>
                <span className="min-w-[1.5rem] text-center text-[13px] tabular-nums">
                  {line.qty}
                </span>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-[10px] border-hairline border-border text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
                  onClick={() => setQty(line.variantId, line.qty + 1)}>
                  +
                </button>
              </div>
              <p className="text-[13px] font-medium tabular-nums text-foreground">
                NT$ {(line.unitPrice * line.qty).toFixed(0)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <SectionCard className="bg-secondary/40 px-4 py-3">
        <SectionHeading
          icon={Receipt}
          className="text-[11px] font-normal normal-case text-muted-foreground"
          iconClassName="h-3.5 w-3.5">
          預估總計
        </SectionHeading>
        <p className="text-heading-page tabular-nums text-foreground">
          NT$ {totalPay.toFixed(0)}
        </p>
      </SectionCard>

      {err ? <p className="text-[13px] text-[#E24B4A]">{err}</p> : null}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          className="w-full"
          disabled={pending}
          onClick={checkout}>
          {pending ? "處理中…" : "前往藍新付款"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            clear();
            router.refresh();
          }}>
          清空購物車
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        訂閱／定期方案改接藍新前暫停，目前僅提供單次結帳。
      </p>
    </div>
  );
}
