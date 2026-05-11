"use client";

import { useMemo, useState, useTransition } from "react";
import { ShoppingBag } from "lucide-react";

import { startCheckout } from "@/app/(main)/shop/actions";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { useCartStore } from "@/lib/shop/cart-store";
import { formatShopGroupedInteger } from "@/lib/shop/format-shop-number";
import { submitNewebpayMpgForm } from "@/lib/shop/submit-newebpay-mpg-form";

interface VariantRow {
  id: string;
  label: string;
  weight_g: number;
  price: number;
  stock: number | null;
}

/** 與紀錄頁（飲食輸入方式等）一致的黑底藥丸選取 */
const variantPillPrimary =
  "min-h-9 h-9 shrink-0 rounded-full px-4 py-0 text-[13px] font-medium border-hairline border-transparent";
const variantPillInactive =
  "min-h-9 h-9 shrink-0 rounded-full px-4 py-0 text-[13px] font-medium border-hairline border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground";

interface Props {
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
    variants: VariantRow[];
  };
}

export function ProductDetailClient({ product }: Props) {
  const addLine = useCartStore((s) => s.addLine);
  const openCartPanel = useCartStore((s) => s.openCartPanel);
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const variant = useMemo(
    () =>
      product.variants.find((v) => v.id === variantId) ?? product.variants[0],
    [product.variants, variantId],
  );

  const unitPayment = variant ? Number(variant.price) : 0;

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
      imageUrl: product.imageUrl,
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
        <div
          className="mt-1.5 flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="商品規格">
          {product.variants.map((v) => (
            <Button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={v.id === variant?.id}
              variant={v.id === variant?.id ? "default" : "ghost"}
              className={
                v.id === variant?.id ? variantPillPrimary : variantPillInactive
              }
              onClick={() => setVariantId(v.id)}>
              {v.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <span className="text-caption text-muted-foreground">數量</span>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-[10px] border-hairline border-border text-heading-section focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
            onClick={() => setQty((q) => Math.max(1, q - 1))}>
            −
          </button>
          <span className="min-w-[2rem] text-center text-heading-section tabular-nums">
            {formatShopGroupedInteger(qty)}
          </span>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-[10px] border-hairline border-border text-heading-section focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
            onClick={() => setQty((q) => q + 1)}>
            +
          </button>
        </div>
      </div>

      <div className="-mx-4 mt-4 bg-secondary/50 px-4 py-2.5">
        <p className="text-caption text-muted-foreground">單次價格</p>
        <p className="text-heading-page text-foreground tabular-nums">
          NT$ {formatShopGroupedInteger(unitPayment * qty)}
        </p>
      </div>

      {err ? <p className="mt-3 text-body text-destructive">{err}</p> : null}

      <div className="mt-4 flex flex-row gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-w-0 flex-1"
          onClick={addToCart}>
          加入購物車
        </Button>
        <Button
          type="button"
          className="min-w-0 flex-1 bg-[#4C956C] text-white hover:bg-[#3A7A56] focus-visible:ring-[#4C956C]/25"
          disabled={pending}
          onClick={checkoutNow}>
          {pending ? "處理中…" : "立即結帳"}
        </Button>
      </div>
    </section>
  );
}
