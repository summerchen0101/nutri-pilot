'use client';

import { useMemo, useState, useTransition } from 'react';
import { ShoppingBag } from 'lucide-react';

import { startCheckout } from '@/app/(main)/shop/actions';
import { SectionHeading } from '@/components/ui/section-heading';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/shop/cart-store';
import { submitNewebpayMpgForm } from '@/lib/shop/submit-newebpay-mpg-form';
import { cn } from '@/lib/utils/cn';

interface VariantRow {
  id: string;
  label: string;
  weight_g: number;
  price: number;
  sub_price: number | null;
  stock: number | null;
}

interface Props {
  product: {
    id: string;
    name: string;
    variants: VariantRow[];
  };
}

export function ProductDetailClient({ product }: Props) {
  const addLine = useCartStore((s) => s.addLine);
  const openCartPanel = useCartStore((s) => s.openCartPanel);
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const variant = useMemo(
    () => product.variants.find((v) => v.id === variantId) ?? product.variants[0],
    [product.variants, variantId],
  );

  const unitPayment = variant ? Number(variant.price) : 0;
  const displaySub =
    variant?.sub_price != null && Number(variant.sub_price) > 0;

  function addToCart() {
    if (!variant) return;
    setErr(null);
    addLine({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      variantLabel: variant.label,
      qty,
      unitPrice: unitPayment,
    });
    openCartPanel();
  }

  function checkoutNow() {
    if (!variant) return;
    setErr(null);
    startTransition(async () => {
      const res = await startCheckout({
        items: [{ variantId: variant.id, qty }],
      });
      if (res.error) {
        setErr(res.error);
        return;
      }
      if (res.paymentUrl && res.formFields) {
        submitNewebpayMpgForm(res.paymentUrl, res.formFields);
      }
    });
  }

  return (
    <section className="rounded-xl bg-card p-4">
      <SectionHeading icon={ShoppingBag}>規格與購買</SectionHeading>

      <div className="mt-3">
        <span className="text-caption text-muted-foreground">規格</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {product.variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVariantId(v.id)}
              className={cn(
                'rounded-[10px] border px-3 py-2 text-body transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1',
                v.id === variant?.id ?
                  'border-primary bg-primary font-medium text-white'
                : 'border-hairline border-border bg-background text-foreground hover:border-primary/40',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <span className="text-caption text-muted-foreground">數量</span>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-[10px] border-hairline border-border text-heading-section focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="min-w-[2rem] text-center text-heading-section tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-[10px] border-hairline border-border text-heading-section focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
            onClick={() => setQty((q) => q + 1)}
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-[10px] bg-secondary/50 px-3 py-2.5">
        <p className="text-caption text-muted-foreground">單次價格</p>
        <p className="text-heading-page text-foreground tabular-nums">
          NT$ {(unitPayment * qty).toFixed(0)}
        </p>
        {displaySub && variant ?
          <p className="mt-1 text-caption text-muted-foreground">
            訂閱／定期價 NT$ {(Number(variant.sub_price) * qty).toFixed(0)}（改接藍新後開放）
          </p>
        : null}
      </div>

      {err ?
        <p className="mt-3 text-body text-destructive">{err}</p>
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
          {pending ? '開啟結帳…' : '立即結帳（藍新金流）'}
        </Button>
      </div>
    </section>
  );
}
