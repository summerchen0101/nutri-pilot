'use client';

import { useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/ui/section-heading';
import { useCartStore } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import {
  SHOP_VARIANT_PILL_INACTIVE_CLASS,
  SHOP_VARIANT_PILL_PRIMARY_CLASS,
} from '@/lib/shop/variant-pill-classes';

interface VariantRow {
  id: string;
  label: string;
  weight_g: number;
  price: number;
  stock: number | null;
}

interface VendorInfo {
  id: string;
  name: string;
  shippingFee: number;
  freeShippingThreshold: number | null;
  leadTimeDays: number;
}

interface Props {
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
    variants: VariantRow[];
    vendor: VendorInfo;
  };
}

export function ProductDetailClient({ product }: Props) {
  const router = useRouter();
  const addLine = useCartStore((s) => s.addLine);
  const openCartPanel = useCartStore((s) => s.openCartPanel);
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const [qty, setQty] = useState(1);

  const variant = useMemo(
    () =>
      product.variants.find((v) => v.id === variantId) ?? product.variants[0],
    [product.variants, variantId],
  );

  const unitPayment = variant ? Number(variant.price) : 0;
  const v = product.vendor;

  function addToCart() {
    if (!variant) return;
    addLine({
      variantId: variant.id,
      productId: product.id,
      vendorId: v.id,
      vendorName: v.name,
      productName: product.name,
      variantLabel: variant.label,
      qty,
      unitPrice: unitPayment,
      shippingFee: v.shippingFee,
      freeShippingThreshold: v.freeShippingThreshold,
      leadTimeDays: v.leadTimeDays,
      imageUrl: product.imageUrl,
    });
    openCartPanel();
  }

  function checkoutNow() {
    if (!variant) return;
    addLine({
      variantId: variant.id,
      productId: product.id,
      vendorId: v.id,
      vendorName: v.name,
      productName: product.name,
      variantLabel: variant.label,
      qty,
      unitPrice: unitPayment,
      shippingFee: v.shippingFee,
      freeShippingThreshold: v.freeShippingThreshold,
      leadTimeDays: v.leadTimeDays,
      imageUrl: product.imageUrl,
    });
    router.push('/shop/checkout');
  }

  return (
    <section className="rounded-xl bg-card p-4">
      <SectionHeading icon={ShoppingBag}>規格與購買</SectionHeading>

      <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-[13px] leading-relaxed text-muted-foreground">
        <p className="text-foreground">
          由 <span className="font-medium text-primary">{v.name}</span> 出貨
        </p>
        <p className="mt-1">
          預計 <span className="tabular-nums">{v.leadTimeDays}</span>{' '}
          個工作天內出貨（實際依廠商作業為準）
        </p>
      </div>

      <div className="mt-3">
        <span className="text-caption text-muted-foreground">規格</span>
        <div
          className="mt-1.5 flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="商品規格">
          {product.variants.map((variantOption) => (
            <Button
              key={variantOption.id}
              type="button"
              role="radio"
              aria-checked={variantOption.id === variant?.id}
              variant={variantOption.id === variant?.id ? 'default' : 'ghost'}
              className={
                variantOption.id === variant?.id ?
                  SHOP_VARIANT_PILL_PRIMARY_CLASS
                : SHOP_VARIANT_PILL_INACTIVE_CLASS
              }
              onClick={() => setVariantId(variantOption.id)}>
              {variantOption.label}
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
          onClick={checkoutNow}>
          立即結帳
        </Button>
      </div>
    </section>
  );
}
