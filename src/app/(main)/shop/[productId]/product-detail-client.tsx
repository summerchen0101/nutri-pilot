"use client";

import { useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";

import { ShopProductDetailPurchaseDialog } from "@/app/(main)/shop/_components/shop-product-detail-purchase-dialog";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { formatShopGroupedInteger } from "@/lib/shop/format-shop-number";
import { isVariantSelectable } from "@/lib/shop/variant-stock";
import {
  SHOP_VARIANT_PILL_INACTIVE_CLASS,
  SHOP_VARIANT_PILL_PRIMARY_CLASS,
} from "@/lib/shop/variant-pill-classes";

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

function getInitialVariantId(variants: VariantRow[]) {
  const firstSelectable = variants.find((v) => isVariantSelectable(v.stock));
  if (firstSelectable) return firstSelectable.id;
  return variants[0]?.id ?? "";
}

export function ProductDetailClient({ product }: Props) {
  const [variantId, setVariantId] = useState(() =>
    getInitialVariantId(product.variants),
  );
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

  const variant = useMemo(() => {
    if (!product.variants.length) return undefined;
    const picked = product.variants.find((v) => v.id === variantId);
    if (picked && isVariantSelectable(picked.stock)) return picked;
    return product.variants.find((v) => isVariantSelectable(v.stock));
  }, [product.variants, variantId]);

  const unitPayment = variant ? Number(variant.price) : 0;
  const v = product.vendor;
  const canPurchase = Boolean(variant);

  return (
    <section className="rounded-xl bg-card p-4">
      <SectionHeading icon={ShoppingBag}>規格與購買</SectionHeading>

      <div className="mt-3">
        <span className="text-caption text-muted-foreground">規格</span>
        <div
          className="mt-1.5 flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="商品規格">
          {product.variants.map((variantOption) => {
            const selectable = isVariantSelectable(variantOption.stock);
            return (
              <Button
                key={variantOption.id}
                type="button"
                role="radio"
                aria-checked={variantOption.id === variant?.id}
                disabled={!selectable}
                variant={variantOption.id === variant?.id ? "default" : "ghost"}
                className={
                  variantOption.id === variant?.id
                    ? SHOP_VARIANT_PILL_PRIMARY_CLASS
                    : SHOP_VARIANT_PILL_INACTIVE_CLASS
                }
                onClick={() => {
                  if (!selectable) return;
                  setVariantId(variantOption.id);
                }}>
                {variantOption.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="-mx-4 mt-4 bg-secondary/50 px-4 py-2.5">
        <p className="text-caption text-muted-foreground">單次售價</p>
        <p className="text-heading-page text-foreground tabular-nums">
          NT$ {formatShopGroupedInteger(unitPayment)}
        </p>
      </div>

      <div className="mt-4 flex flex-row gap-3">
        <Button
          type="button"
          variant="outline"
          className="min-w-0 flex-1"
          disabled={!canPurchase}
          onClick={() => {
            setIsPurchaseOpen(true);
          }}>
          加入購物車
        </Button>
        <Button
          type="button"
          className="min-w-0 flex-1"
          disabled={!canPurchase}
          onClick={() => {
            setIsPurchaseOpen(true);
          }}>
          立即結帳
        </Button>
      </div>

      <ShopProductDetailPurchaseDialog
        open={isPurchaseOpen}
        onClose={() => {
          setIsPurchaseOpen(false);
        }}
        product={{
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
        }}
        variant={variant ?? null}
        vendor={v}
      />
    </section>
  );
}
