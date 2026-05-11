'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

import { ShopQuantityStepper } from '@/app/(main)/shop/_components/shop-quantity-stepper';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import {
  getVariantMaxOrderQty,
  isVariantSelectable,
} from '@/lib/shop/variant-stock';
import { cn } from '@/lib/utils/cn';

interface VariantInfo {
  id: string;
  label: string;
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
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  variant: VariantInfo | null | undefined;
  vendor: VendorInfo;
}

const SHEET_PANEL = cn(
  'relative z-10 flex w-full flex-col overflow-hidden bg-[var(--color-background-primary)] shadow-none',
  'max-h-[min(88dvh,560px)] rounded-t-2xl sm:max-w-md sm:rounded-2xl',
);

export function ShopProductDetailPurchaseDialog({
  open,
  onClose,
  product,
  variant,
  vendor: v,
}: Props) {
  const router = useRouter();
  const addLine = useCartStore((s) => s.addLine);
  const openCartPanel = useCartStore((s) => s.openCartPanel);
  const [qty, setQty] = useState(1);

  const selectable = Boolean(variant && isVariantSelectable(variant.stock));
  const maxQty = variant ? getVariantMaxOrderQty(variant.stock) : undefined;

  useEffect(() => {
    if (!open) return;
    setQty(1);
  }, [open, variant?.id]);

  const unitPayment = variant ? Number(variant.price) : 0;
  const lineTotal = unitPayment * qty;

  function buildLine(q: number) {
    if (!variant) return;
    addLine({
      variantId: variant.id,
      productId: product.id,
      vendorId: v.id,
      vendorName: v.name,
      productName: product.name,
      variantLabel: variant.label,
      qty: q,
      unitPrice: unitPayment,
      shippingFee: v.shippingFee,
      freeShippingThreshold: v.freeShippingThreshold,
      leadTimeDays: v.leadTimeDays,
      imageUrl: product.imageUrl,
    });
  }

  function handleAddToCart() {
    if (!selectable || !variant) return;
    buildLine(qty);
    onClose();
    openCartPanel();
  }

  function handleCheckout() {
    if (!selectable || !variant) return;
    buildLine(qty);
    onClose();
    router.push('/shop/checkout');
  }

  if (!open) return null;

  const titleId = 'shop-detail-purchase-title';

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
          選擇數量
        </h2>

        <button
          type="button"
          className="flex w-full flex-col items-center pt-2 pb-1"
          aria-label="關閉"
          onClick={onClose}
        >
          <span className="h-1 w-10 shrink-0 rounded-full bg-border" />
        </button>

        <div className="flex gap-3 px-4 pb-3 pt-1">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
            {product.imageUrl ?
              <Image
                src={product.imageUrl}
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
            {qty > 1 ?
              <p className="mt-0.5 text-caption tabular-nums text-muted-foreground">
                小計 NT$ {formatShopGroupedInteger(lineTotal)}
              </p>
            : null}
          </div>
        </div>

        <div className="border-t border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <ShopQuantityStepper
              size="compact"
              value={qty}
              onChange={setQty}
              max={maxQty}
            />
            <Button
              type="button"
              className="min-w-0 flex-1"
              disabled={!selectable}
              onClick={handleAddToCart}
            >
              加入購物車
            </Button>
          </div>
          <div className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-0">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-body text-muted-foreground"
              disabled={!selectable}
              onClick={handleCheckout}
            >
              立即結帳
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
