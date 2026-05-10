"use client";

import { Package, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { startCheckout } from "@/app/(main)/shop/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cartTotalPayment, useCartStore } from "@/lib/shop/cart-store";
import { submitNewebpayMpgForm } from "@/lib/shop/submit-newebpay-mpg-form";

export interface CartViewProps {
  /** `panel`：側欄内列表捲動，預估總計與按鈕固定於底部 */
  layout?: "page" | "panel";
}

export function CartView({ layout = "page" }: CartViewProps) {
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
    const empty = (
      <EmptyState
        message="購物車是空的"
        actionHref="/shop"
        actionLabel="前往商城"
        onActionNavigate={closeCartPanel}
      />
    );
    if (layout === "panel") {
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto hide-scrollbar [-webkit-overflow-scrolling:touch]">
            {empty}
          </div>
        </div>
      );
    }
    return empty;
  }

  const totalPay = cartTotalPayment(lines);

  const lineList = (
    <ul>
      {lines.map((line) => (
        <li
          key={line.variantId}
          className="border-b-hairline border-border py-4">
          <div className="flex gap-3">
            <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-muted">
              {line.imageUrl ? (
                <Image
                  src={line.imageUrl}
                  alt=""
                  width={72}
                  height={72}
                  className="h-full w-full object-cover"
                  sizes="72px"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-muted-foreground"
                  aria-hidden>
                  <Package className="h-7 w-7" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-2">
                <div className="min-w-0 pr-1">
                  <p className="text-heading-section leading-snug text-foreground">
                    {line.productName}
                  </p>
                  <p className="mt-0.5 text-micro text-muted-foreground">
                    {line.variantLabel}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border-hairline border-border bg-transparent text-foreground transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  aria-label={`移除 ${line.productName}`}
                  onClick={() => removeLine(line.variantId)}>
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-hairline border-border text-heading-card leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                    onClick={() => setQty(line.variantId, line.qty - 1)}>
                    −
                  </button>
                  <span className="min-w-[1.5rem] text-center text-heading-section tabular-nums text-foreground">
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-hairline border-border text-heading-card leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                    onClick={() => setQty(line.variantId, line.qty + 1)}>
                    +
                  </button>
                </div>
                <p className="text-heading-section tabular-nums text-foreground">
                  NT$ {(line.unitPrice * line.qty).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );

  const checkoutFooter = (
    <div className="space-y-4">
      <div className="rounded-xl border-hairline border-primary px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-caption text-muted-foreground">預估總計</span>
          <span className="text-heading-section tabular-nums text-primary">
            NT$ {totalPay.toFixed(0)}
          </span>
        </div>
      </div>

      {err ? <p className="text-body text-[#E24B4A]">{err}</p> : null}

      <div className="flex flex-row gap-3">
        <Button
          type="button"
          variant="ghost"
          className="min-w-0 flex-1"
          onClick={() => {
            clear();
            router.refresh();
          }}>
          清空購物車
        </Button>
        <Button
          type="button"
          className="min-w-0 flex-1 bg-[#4C956C] text-white hover:bg-[#3A7A56] focus-visible:ring-[#4C956C]/25"
          disabled={pending}
          onClick={checkout}>
          {pending ? "處理中…" : "前往藍新付款"}
        </Button>
      </div>
    </div>
  );

  if (layout === "panel") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto hide-scrollbar [-webkit-overflow-scrolling:touch]">
          {lineList}
        </div>
        <div className="shrink-0 bg-[var(--color-background-primary)] pt-4">
          {checkoutFooter}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <div className="min-h-0 flex-1">{lineList}</div>
      <div className="shrink-0 bg-[var(--color-background-primary)] pt-4">
        {checkoutFooter}
      </div>
    </div>
  );
}
