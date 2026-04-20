'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { startCheckout } from '@/app/(main)/shop/actions';
import { Button } from '@/components/ui/button';
import {
  cartTotalPayment,
  cartTotalSubscription,
  useCartStore,
} from '@/lib/shop/cart-store';
import { cn } from '@/lib/utils/cn';

export function CartView() {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const setQty = useCartStore((s) => s.setQty);
  const removeLine = useCartStore((s) => s.removeLine);
  const clear = useCartStore((s) => s.clear);

  const [mode, setMode] = useState<'payment' | 'subscription'>('payment');
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>(
    'monthly',
  );
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const subscribable = lines.every(
    (l) =>
      l.subPrice != null &&
      l.subPrice > 0 &&
      (l.stripeSubPriceId?.length ?? 0) > 0,
  );

  const itemsPayload = lines.map((l) => ({
    variantId: l.variantId,
    qty: l.qty,
  }));

  function checkout() {
    setErr(null);
    if (!lines.length) return;
    if (mode === 'subscription') {
      if (!subscribable) {
        setErr('購物車內商品需皆支援訂閱（含 Stripe 訂閱價）才可合併訂閱結帳');
        return;
      }
    }

    startTransition(async () => {
      const res = await startCheckout({
        mode,
        items: itemsPayload,
        frequency: mode === 'subscription' ? frequency : undefined,
      });
      if (res.error) {
        setErr(res.error);
        return;
      }
      if (res.url) {
        window.location.href = res.url;
      }
    });
  }

  if (lines.length === 0) {
    return (
      <div className="rounded-xl border-[0.5px] border-border bg-card p-6 text-center">
        <p className="text-[13px] text-muted-foreground">購物車是空的</p>
        <Link
          href="/shop"
          className="mt-4 inline-block text-[13px] font-medium text-[#4C956C]"
        >
          前往商城
        </Link>
      </div>
    );
  }

  const totalPay = cartTotalPayment(lines);
  const totalSub = cartTotalSubscription(lines);

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {lines.map((line) => (
          <li
            key={line.variantId}
            className="rounded-xl border-[0.5px] border-border bg-card p-4"
          >
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
                onClick={() => removeLine(line.variantId)}
              >
                移除
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] border-[0.5px] border-border text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
                  onClick={() => setQty(line.variantId, line.qty - 1)}
                >
                  −
                </button>
                <span className="min-w-[1.5rem] text-center text-[13px] tabular-nums">
                  {line.qty}
                </span>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] border-[0.5px] border-border text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
                  onClick={() => setQty(line.variantId, line.qty + 1)}
                >
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('payment')}
          className={cn(
            'flex-1 rounded-[10px] py-2.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1',
            mode === 'payment' ?
              'bg-[#1E212B] text-white'
            : 'border-[0.5px] border-border bg-secondary text-muted-foreground',
          )}
        >
          單次結帳
        </button>
        <button
          type="button"
          onClick={() => setMode('subscription')}
          disabled={!subscribable}
          className={cn(
            'flex-1 rounded-[10px] py-2.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1',
            mode === 'subscription' ?
              'bg-[#1E212B] text-white'
            : 'border-[0.5px] border-border bg-secondary text-muted-foreground',
            !subscribable ? 'opacity-40' : '',
          )}
        >
          訂閱結帳
        </button>
      </div>

      {mode === 'subscription' && subscribable ?
        <div>
          <span className="text-[11px] text-muted-foreground">寄送頻率</span>
          <select
            className="mt-1 flex h-10 w-full rounded-[10px] border-[0.5px] border-border bg-card px-3 text-[13px] focus:border-[#4C956C] focus:ring-1 focus:ring-[#4C956C]/20 focus:outline-none"
            value={frequency}
            onChange={(e) =>
              setFrequency(e.target.value as typeof frequency)
            }
          >
            <option value="weekly">每週</option>
            <option value="biweekly">每兩週</option>
            <option value="monthly">每月</option>
          </select>
        </div>
      : null}

      <div className="rounded-xl border-[0.5px] border-border bg-secondary/40 px-4 py-3">
        <p className="text-[11px] text-muted-foreground">
          {mode === 'payment' ? '預估總計（單次）' : '預估每期（訂閱）'}
        </p>
        <p className="text-[20px] font-medium tabular-nums">
          NT${' '}
          {mode === 'payment' ?
            totalPay.toFixed(0)
          : totalSub.toFixed(0)}
        </p>
      </div>

      {err ?
        <p className="text-[13px] text-[#E24B4A]">{err}</p>
      : null}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          className="w-full"
          disabled={pending}
          onClick={checkout}
        >
          {pending ? '處理中…' : '前往 Stripe 結帳'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            clear();
            router.refresh();
          }}
        >
          清空購物車
        </Button>
      </div>
    </div>
  );
}
