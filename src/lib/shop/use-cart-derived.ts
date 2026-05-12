'use client';

import { useMemo } from 'react';

import {
  calcVendorShippingSummaries,
  cartGrandTotal,
  cartTotalShipping,
} from '@/lib/shop/vendor-shipping';
import { cartTotalItemsSubtotal, useCartStore, type CartLine } from '@/lib/shop/cart-store';

export function useCartDerived() {
  const lines = useCartStore((s) => s.lines);

  const validLines = useMemo(
    () =>
      lines.filter(
        (l): l is CartLine =>
          Boolean(l.vendorId && l.vendorName && typeof l.unitPrice === 'number'),
      ),
    [lines],
  );

  const summaries = useMemo(
    () => calcVendorShippingSummaries(validLines),
    [validLines],
  );

  const itemsSubtotal = useMemo(
    () => cartTotalItemsSubtotal(validLines),
    [validLines],
  );
  const shippingTotal = useMemo(
    () => cartTotalShipping(summaries),
    [summaries],
  );
  const grandTotal = useMemo(() => cartGrandTotal(validLines), [validLines]);

  const hasLegacyLines = lines.length > 0 && validLines.length < lines.length;

  const maxLeadTimeDays = useMemo(() => {
    if (validLines.length === 0) return 0;
    return Math.max(...validLines.map((l) => l.leadTimeDays));
  }, [validLines]);

  return {
    lines,
    validLines,
    summaries,
    itemsSubtotal,
    shippingTotal,
    grandTotal,
    hasLegacyLines,
    maxLeadTimeDays,
  };
}
