'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { ShopQuantityStepper } from '@/app/(main)/shop/_components/shop-quantity-stepper';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import {
  getVariantMaxOrderQty,
  isVariantSelectable,
} from '@/lib/shop/variant-stock';
import {
  SHOP_VARIANT_PILL_INACTIVE_CLASS,
  SHOP_VARIANT_PILL_PRIMARY_CLASS,
} from '@/lib/shop/variant-pill-classes';
import { cn } from '@/lib/utils/cn';

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

const SHEET_PANEL = cn(
  'relative z-10 flex w-full flex-col overflow-hidden bg-[var(--color-background-primary)] shadow-none',
  'max-h-[min(88dvh,560px)] rounded-t-2xl sm:max-w-md sm:rounded-2xl',
);

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
  const maxQty = variant ? getVariantMaxOrderQty(variant.stock) : undefined;

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
    <div className="fixed inset-0 z-[58] flex items-end justify-center p-0 sm:items-center sm:p-4">
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
        className={SHEET_PANEL}
      >
        <h2 id={titleId} className="sr-only">
          加入購物車
        </h2>

        <button
          type="button"
          className="flex w-full flex-col items-center pt-2 pb-1"
          aria-label="關閉"
          onClick={onClose}
        >
          <span className="h-1 w-10 shrink-0 rounded-full bg-border" />
        </button>

        <div className="max-h-[34vh] min-h-0 shrink overflow-y-auto px-4 pb-3">
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

        <div className="flex gap-3 border-t border-border px-4 py-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            {product.image_url ?
              <Image
                src={product.image_url}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
              {product.name}
            </p>
            {variant ?
              <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                {variant.label}
              </p>
            : null}
            <p className="text-heading-page mt-1 tabular-nums text-primary">
              NT$ {formatShopGroupedInteger(unitPayment)}
            </p>
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-3 border-t border-border px-4 pt-3',
            'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          )}
        >
          <ShopQuantityStepper
            size="compact"
            value={qty}
            onChange={setQty}
            max={maxQty}
          />
          <Button
            type="button"
            className="min-w-0 flex-1"
            disabled={
              !variant ||
              !isVariantSelectable(variant.stock) ||
              !product.brand?.vendor
            }
            onClick={handleAddToCart}
          >
            加入購物車
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
