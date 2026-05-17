'use client';

import Image from 'next/image';
import { Truck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { ShopQuantityStepper } from '@/app/(main)/shop/_components/shop-quantity-stepper';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/shop/cart-store';
import { variantListStrikePrice } from '@/lib/shop/catalog-card-price';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import {
  getPreferredSelectableVariantId,
  getVariantMaxOrderQty,
  isVariantSelectable,
} from '@/lib/shop/variant-stock';
import {
  SHOP_VARIANT_PILL_INACTIVE_CLASS,
  SHOP_VARIANT_PILL_PRIMARY_CLASS,
} from '@/lib/shop/variant-pill-classes';
import { cn } from '@/lib/utils/cn';

export interface ShopAddToCartSheetVariant {
  id: string;
  label: string;
  price: number;
  stock: number | null;
  list_price: number | null;
}

export interface ShopAddToCartSheetVendor {
  id: string;
  name: string;
  shippingFee: number;
  freeShippingThreshold: number | null;
  leadTimeDays: number;
}

export interface ShopAddToCartSheetProps {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  variants: ShopAddToCartSheetVariant[];
  vendor: ShopAddToCartSheetVendor | null;
  /** 詳情頁等外部已選規格 */
  selectedVariantId?: string;
  /** 外部變更選中規格（多規格時） */
  onVariantIdChange?: (variantId: string) => void;
}

const SHEET_PANEL = cn(
  'relative z-10 flex w-full max-w-md flex-col overflow-hidden bg-[var(--color-background-primary)] shadow-none',
  'max-h-[min(88dvh,620px)] rounded-t-2xl sm:rounded-2xl',
);

const PRODUCT_ID_PREFIX_LEN = 8;

function formatProductCodeSnippet(productId: string) {
  const compact = productId.replace(/-/g, '');
  if (compact.length <= PRODUCT_ID_PREFIX_LEN) return productId;
  return `${compact.slice(0, PRODUCT_ID_PREFIX_LEN)}…`;
}

export function ShopAddToCartSheet({
  open,
  onClose,
  product,
  variants,
  vendor,
  selectedVariantId,
  onVariantIdChange,
}: ShopAddToCartSheetProps) {
  const addLine = useCartStore((s) => s.addLine);
  const openCartPanel = useCartStore((s) => s.openCartPanel);

  const firstSelectableId = useMemo(
    () => getPreferredSelectableVariantId(variants),
    [variants],
  );

  const [internalVariantId, setInternalVariantId] = useState('');
  const [qty, setQty] = useState(1);

  const showVariantPicker = variants.length > 1;

  const effectiveVariantId = useMemo(() => {
    if (selectedVariantId && variants.some((v) => v.id === selectedVariantId)) {
      return selectedVariantId;
    }
    return internalVariantId;
  }, [selectedVariantId, internalVariantId, variants]);

  useEffect(() => {
    if (!open) return;
    setQty(1);
    if (selectedVariantId && variants.some((v) => v.id === selectedVariantId)) {
      setInternalVariantId(selectedVariantId);
      return;
    }
    setInternalVariantId(firstSelectableId);
  }, [open, firstSelectableId, product.id, selectedVariantId, variants]);

  const variant = useMemo(() => {
    if (!variants.length) return undefined;
    const picked = variants.find((v) => v.id === effectiveVariantId);
    if (picked && isVariantSelectable(picked.stock)) return picked;
    return variants.find((v) => isVariantSelectable(v.stock));
  }, [variants, effectiveVariantId]);

  const unitPayment = variant ? Number(variant.price) : 0;
  const sheetListStrike = useMemo(() => {
    if (!variant) return null;
    const lp = variant.list_price;
    return variantListStrikePrice(
      Number(variant.price),
      lp == null ? null : Number(lp),
    );
  }, [variant]);
  const sheetPriceAriaLabel =
    sheetListStrike != null ?
      `優惠價 ${formatShopGroupedInteger(unitPayment)} 元，原價 ${formatShopGroupedInteger(sheetListStrike)} 元`
    : `售價 ${formatShopGroupedInteger(unitPayment)} 元`;
  const maxQty = variant ? getVariantMaxOrderQty(variant.stock) : undefined;
  const selectable =
    Boolean(variant && isVariantSelectable(variant.stock)) && vendor != null;

  function setVariantId(nextId: string) {
    setInternalVariantId(nextId);
    onVariantIdChange?.(nextId);
  }

  function handleAddToCart() {
    if (!variant || !vendor || !selectable) return;
    addLine({
      variantId: variant.id,
      productId: product.id,
      vendorId: vendor.id,
      vendorName: vendor.name,
      productName: product.name,
      variantLabel: variant.label,
      qty,
      unitPrice: unitPayment,
      shippingFee: vendor.shippingFee,
      freeShippingThreshold: vendor.freeShippingThreshold,
      leadTimeDays: vendor.leadTimeDays,
      imageUrl: product.imageUrl,
    });
    onClose();
    openCartPanel();
  }

  if (!open) return null;

  const titleId = 'shop-add-to-cart-sheet-title';
  const stockLabel =
    variant && isVariantSelectable(variant.stock) ? '尚有庫存' : '暫無庫存';

  const shippingNote =
    vendor ?
      `備貨約 ${vendor.leadTimeDays} 個工作天內出貨；運費於結帳時依廠商規則計算。`
    : null;

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
        <div className="relative shrink-0 border-b-hairline border-border px-4 pb-2 pt-2">
          <div className="flex w-full flex-col items-center pb-1 pt-0">
            <span className="h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden />
          </div>
          <div className="relative mt-1 flex min-h-11 items-center justify-center">
            <h2 id={titleId} className="text-heading-page text-foreground">
              選擇商品規格
            </h2>
            <button
              type="button"
              aria-label="關閉"
              className="absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={onClose}
            >
              <X className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex gap-3 border-b-hairline border-border px-4 py-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-hairline border-border bg-muted">
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
            <p className="line-clamp-2 text-body font-medium leading-snug text-foreground">
              {product.name}
            </p>
            <p
              aria-label={sheetPriceAriaLabel}
              className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 font-medium leading-tight tabular-nums"
            >
              {sheetListStrike != null ? (
                <span className="text-caption font-medium line-through text-muted-foreground">
                  NT$ {formatShopGroupedInteger(sheetListStrike)}
                </span>
              ) : null}
              <span className="text-heading-page text-primary">
                NT$ {formatShopGroupedInteger(unitPayment)}
              </span>
            </p>
            <p className="mt-1.5 text-caption text-muted-foreground">
              商品編號：{formatProductCodeSnippet(product.id)}
            </p>
          </div>
        </div>

        {showVariantPicker ?
          <div className="max-h-[28vh] min-h-0 shrink overflow-y-auto px-4 py-3">
            <span className="text-caption text-muted-foreground">規格</span>
            <div
              className="mt-1.5 flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="商品規格"
            >
              {variants.map((v) => {
                const optionSelectable = isVariantSelectable(v.stock);
                return (
                  <Button
                    key={v.id}
                    type="button"
                    role="radio"
                    aria-checked={v.id === variant?.id}
                    disabled={!optionSelectable}
                    variant={v.id === variant?.id ? 'default' : 'ghost'}
                    className={
                      v.id === variant?.id ?
                        SHOP_VARIANT_PILL_PRIMARY_CLASS
                      : SHOP_VARIANT_PILL_INACTIVE_CLASS
                    }
                    onClick={() => {
                      if (!optionSelectable) return;
                      setVariantId(v.id);
                    }}
                  >
                    {v.label}
                  </Button>
                );
              })}
            </div>
          </div>
        : null}

        <div className="flex items-center justify-between gap-3 border-b-hairline border-border px-4 py-3">
          <span className="text-caption text-muted-foreground">{stockLabel}</span>
          <ShopQuantityStepper
            size="compact"
            value={qty}
            onChange={setQty}
            max={maxQty}
          />
        </div>

        {shippingNote ?
          <div className="mx-4 mt-3 flex gap-2 rounded-xl border-hairline border-primary/25 bg-primary-light px-3 py-2.5 text-caption text-primary-foreground">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary-foreground" aria-hidden />
            <p className="min-w-0 leading-relaxed">{shippingNote}</p>
          </div>
        : null}

        <div className="mt-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
          {!variants.length ?
            <p className="mb-2 text-caption text-muted-foreground">
              此商品暫無可購買規格。
            </p>
          : null}
          <Button
            type="button"
            className="h-11 w-full"
            disabled={!selectable}
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
