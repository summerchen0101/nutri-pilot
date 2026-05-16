'use client';

import { ShopAddToCartSheet } from '@/app/(main)/shop/_components/shop-add-to-cart-sheet';

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

export function ShopQuickAddCartDialog({ open, product, onClose }: Props) {
  if (!open || !product) return null;

  const v = product.brand?.vendor;

  return (
    <ShopAddToCartSheet
      open
      onClose={onClose}
      product={{
        id: product.id,
        name: product.name,
        imageUrl: product.image_url,
      }}
      variants={product.variants}
      vendor={
        v ?
          {
            id: v.id,
            name: v.name,
            shippingFee: v.shipping_fee,
            freeShippingThreshold: v.free_shipping_threshold,
            leadTimeDays: v.lead_time_days,
          }
        : null
      }
    />
  );
}
