'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { startCheckout } from '@/app/(main)/shop/actions';
import { useCartStore } from '@/lib/shop/cart-store';
import { cn } from '@/lib/utils/cn';

interface VariantRow {
  id: string;
  label: string;
  weight_g: number;
  price: number;
  sub_price: number | null;
  stock: number | null;
  stripe_price_id: string | null;
  stripe_sub_price_id: string | null;
}

interface Props {
  product: {
    id: string;
    name: string;
    variants: VariantRow[];
  };
}

export function ProductDetailClient({ product }: Props) {
  const router = useRouter();
  const addLine = useCartStore((s) => s.addLine);
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState<'payment' | 'subscription'>('payment');
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>(
    'monthly',
  );
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const variant = useMemo(
    () => product.variants.find((v) => v.id === variantId) ?? product.variants[0],
    [product.variants, variantId],
  );

  const displaySub = variant?.sub_price != null && variant.sub_price > 0;
  const canSubscribe = displaySub && (variant?.stripe_sub_price_id?.length ?? 0) > 0;

  const unitPayment = variant ? Number(variant.price) : 0;
  const unitSub = variant && displaySub ? Number(variant.sub_price) : unitPayment;

  function addToCart() {
    if (!variant) return;
    setErr(null);
    if (mode === 'subscription' && !canSubscribe) {
      setErr('此規格尚未開放訂閱或缺少訂閱價');
      return;
    }
    addLine({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantLabel: variant.label,
      qty,
      unitPrice: unitPayment,
      subPrice: variant.sub_price != null ? Number(variant.sub_price) : null,
      stripePriceId: variant.stripe_price_id,
      stripeSubPriceId: variant.stripe_sub_price_id,
    });
    router.push('/shop/cart');
  }

  function checkoutNow() {
    if (!variant) return;
    setErr(null);
    if (mode === 'subscription' && !canSubscribe) {
      setErr('此規格尚未開放訂閱或缺少訂閱價');
      return;
    }
    startTransition(async () => {
      const res = await startCheckout({
        mode,
        items: [{ variantId: variant.id, qty }],
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

  return (
    <section className="rounded-xl border-[0.5px] border-border bg-card p-4">
      <p className="text-[15px] font-medium text-foreground">規格與購買</p>

      <div className="mt-3">
        <span className="text-[11px] text-muted-foreground">規格</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {product.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariantId(v.id)}
              className={cn(
                'rounded-[10px] border px-3 py-2 text-[13px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1',
                v.id === variant?.id ?
                  'border-primary bg-primary-light font-medium text-primary-foreground'
                : 'border-[0.5px] border-border bg-background text-foreground hover:border-primary/40',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <span className="text-[11px] text-muted-foreground">數量</span>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border-[0.5px] border-border text-[15px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="min-w-[2rem] text-center text-[15px] font-medium tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border-[0.5px] border-border text-[15px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
            onClick={() => setQty((q) => q + 1)}
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('payment')}
          className={cn(
            'flex-1 rounded-[10px] py-2.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1',
            mode === 'payment' ?
              'bg-shadow-grey text-white'
            : 'border-[0.5px] border-border bg-secondary text-muted-foreground',
          )}
        >
          單次購買
        </button>
        <button
          type="button"
          onClick={() => setMode('subscription')}
          disabled={!canSubscribe}
          className={cn(
            'flex-1 rounded-[10px] py-2.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1',
            mode === 'subscription' ?
              'bg-shadow-grey text-white'
            : 'border-[0.5px] border-border bg-secondary text-muted-foreground',
            !canSubscribe ? 'opacity-40' : '',
          )}
        >
          訂閱
        </button>
      </div>

      {mode === 'subscription' && canSubscribe ?
        <div className="mt-4">
          <span className="text-[11px] text-muted-foreground">寄送頻率</span>
          <select
            className="mt-1 flex h-10 w-full rounded-[10px] border-[0.5px] border-border bg-card px-3 text-[13px] text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
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

      <div className="mt-4 rounded-[10px] bg-secondary/50 px-3 py-2.5">
        <p className="text-[11px] text-muted-foreground">
          {mode === 'payment' ? '單次價格' : '訂閱每期'}
        </p>
        <p className="text-[20px] font-medium tabular-nums text-foreground">
          NT${' '}
          {mode === 'payment' ?
            (unitPayment * qty).toFixed(0)
          : (unitSub * qty).toFixed(0)}
        </p>
        {mode === 'subscription' && displaySub && variant ?
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            單買參考 NT$ {(unitPayment * qty).toFixed(0)}
          </p>
        : null}
      </div>

      {err ?
        <p className="mt-3 text-[13px] text-destructive">{err}</p>
      : null}

      <div className="mt-4 flex flex-col gap-2">
        <Button type="button" variant="outline" className="w-full" onClick={addToCart}>
          加入購物車
        </Button>
        <Button
          type="button"
          className="w-full"
          disabled={pending}
          onClick={checkoutNow}
        >
          {pending ? '開啟結帳…' : mode === 'subscription' ? '立即訂閱' : '立即結帳'}
        </Button>
      </div>
    </section>
  );
}
