'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import {
  SHOP_VARIANT_PILL_INACTIVE_CLASS,
  SHOP_VARIANT_PILL_PRIMARY_CLASS,
} from '@/lib/shop/variant-pill-classes';

export type ShopQuickAddProduct = {
  id: string;
  name: string;
  image_url: string | null;
  brand: {
    vendor: {
      id: string;
      name: string;
      shipping_fee: number;
      free_shipping_threshold: number | null;
      lead_time_days: number;
    };
  } | null;
  variants: Array<{
    id: string;
    label: string;
    price: number;
    stock: number | null;
  }>;
};

interface Props {
  open: boolean;
  product: ShopQuickAddProduct | null;
  onClose: () => void;
}

function isVariantSelectable(stock: number | null): boolean {
  if (stock === null) return true;
  return stock > 0;
}

export function ShopQuickAddCartDialog({ open, product, onClose }: Props) {
  const addLine = useCartStore((s) => s.addLine);
  const openCartPanel = useCartStore((s) => s.openCartPanel);

  const firstSelectableId = useMemo(() => {
    if (!product?.variants.length) return '';
    const first = product.variants.find((v) => isVariantSelectable(v.stock));
    return first?.id ?? '';
  }, [product]);

  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!product) return;
    setVariantId(firstSelectableId);
    setQty(1);
  }, [product, firstSelectableId]);

  const variant = useMemo(() => {
    if (!product?.variants.length) return undefined;
    const picked = product.variants.find((v) => v.id === variantId);
    if (picked && isVariantSelectable(picked.stock)) return picked;
    return product.variants.find((v) => isVariantSelectable(v.stock));
  }, [product, variantId]);

  const unitPayment = variant ? Number(variant.price) : 0;

  function handleAddToCart() {
    if (!product || !variant) return;
    if (!product.brand?.vendor) return;
    const v = product.brand.vendor;
    addLine({
      variantId: variant.id,
      productId: product.id,
      vendorId: v.id,
      vendorName: v.name,
      productName: product.name,
      variantLabel: variant.label,
      qty,
      unitPrice: unitPayment,
      shippingFee: v.shipping_fee,
      freeShippingThreshold: v.free_shipping_threshold,
      leadTimeDays: v.lead_time_days,
      imageUrl: product.image_url,
    });
    onClose();
    openCartPanel();
  }

  if (!open || !product) return null;

  const titleId = 'shop-quick-add-title';

  const node = (
    <div className="fixed inset-0 z-[58] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/35"
        aria-label="關閉"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90dvh,560px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-[var(--color-background-primary)] shadow-none"
      >
        <div className="max-h-[min(90dvh,560px)] overflow-y-auto p-4">
          <h2 id={titleId} className="sr-only">
            加入購物車
          </h2>

          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
            {product.image_url ?
              <Image
                src={product.image_url}
                alt=""
                fill
                className="object-cover"
                sizes="400px"
                unoptimized
              />
            : null}
          </div>

          <div className="mt-4">
            <span className="text-caption text-muted-foreground">規格</span>
            <div
              className="mt-1.5 flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="商品規格"
            >
              {product.variants.map((v) => {
                const selectable = isVariantSelectable(v.stock);
                return (
                  <Button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={v.id === variant?.id}
                    disabled={!selectable}
                    variant={v.id === variant?.id ? 'default' : 'ghost'}
                    className={
                      v.id === variant?.id ?
                        SHOP_VARIANT_PILL_PRIMARY_CLASS
                      : SHOP_VARIANT_PILL_INACTIVE_CLASS
                    }
                    onClick={() => {
                      if (!selectable) return;
                      setVariantId(v.id);
                    }}
                  >
                    {v.label}
                  </Button>
                );
              })}
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
                {formatShopGroupedInteger(qty)}
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

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-w-0 flex-1"
              onClick={onClose}
            >
              取消
            </Button>
            <Button
              type="button"
              className="min-w-0 flex-1 bg-[#4C956C] text-white hover:bg-[#3A7A56] focus-visible:ring-[#4C956C]/25"
              disabled={!variant || !isVariantSelectable(variant.stock) || !product.brand?.vendor}
              onClick={handleAddToCart}
            >
              加入購物車
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
