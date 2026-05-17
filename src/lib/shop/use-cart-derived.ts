'use client';

import { useEffect, useMemo } from 'react';

import {
  calcVendorShippingSummaries,
  cartGrandTotalFromSummaries,
  cartTotalShipping,
  filterCheckoutShippingMethods,
  pickCheapestShippingMethod,
} from '@/lib/shop/vendor-shipping';
import { useVendorShippingMethodsMap } from '@/lib/shop/use-vendor-shipping-methods-map';
import { cartTotalItemsSubtotal, useCartStore, type CartLine } from '@/lib/shop/cart-store';

export function useCartDerived() {
  const lines = useCartStore((s) => s.lines);
  const vendorShippingSelections = useCartStore(
    (s) => s.vendorShippingSelections,
  );
  const setVendorShippingSelection = useCartStore(
    (s) => s.setVendorShippingSelection,
  );

  const validLines = useMemo(
    () =>
      lines.filter(
        (l): l is CartLine =>
          Boolean(l.vendorId && l.vendorName && typeof l.unitPrice === 'number'),
      ),
    [lines],
  );

  const vendorIds = useMemo(
    () => Array.from(new Set(validLines.map((l) => l.vendorId))),
    [validLines],
  );

  const { methodsByVendor, loading: shippingMethodsLoading, loadFailed: shippingMethodsFailed } =
    useVendorShippingMethodsMap(vendorIds);

  useEffect(() => {
    if (shippingMethodsLoading) return;
    for (const vid of vendorIds) {
      const rawRows = methodsByVendor.get(vid);
      if (!rawRows?.length) continue;

      const checkoutRows = filterCheckoutShippingMethods(rawRows);
      if (checkoutRows.length === 0) continue;

      const vendorLines = validLines.filter((l) => l.vendorId === vid);
      const roundedSub = Math.round(
        vendorLines.reduce((s, l) => s + l.unitPrice * l.qty, 0),
      );

      const sel = vendorShippingSelections[vid];
      const validSel = Boolean(sel && checkoutRows.some((r) => r.id === sel));
      if (validSel) continue;

      const cheapest = pickCheapestShippingMethod(rawRows, roundedSub);
      if (!cheapest) continue;
      if (vendorShippingSelections[vid] === cheapest.id) continue;

      setVendorShippingSelection(vid, cheapest.id);
    }
  }, [
    methodsByVendor,
    shippingMethodsLoading,
    vendorIds,
    vendorShippingSelections,
    validLines,
    setVendorShippingSelection,
  ]);

  const summaries = useMemo(
    () =>
      calcVendorShippingSummaries(
        validLines,
        vendorShippingSelections,
        methodsByVendor,
      ),
    [validLines, vendorShippingSelections, methodsByVendor],
  );

  const itemsSubtotal = useMemo(
    () => cartTotalItemsSubtotal(validLines),
    [validLines],
  );
  const shippingTotal = useMemo(
    () => cartTotalShipping(summaries),
    [summaries],
  );
  const grandTotal = useMemo(
    () => cartGrandTotalFromSummaries(validLines, summaries),
    [validLines, summaries],
  );

  const hasLegacyLines = lines.length > 0 && validLines.length < lines.length;

  const maxLeadTimeDays = useMemo(() => {
    if (validLines.length === 0) return 0;
    return Math.max(...validLines.map((l) => l.leadTimeDays));
  }, [validLines]);

  return {
    lines,
    vendorShippingSelections,
    validLines,
    summaries,
    itemsSubtotal,
    shippingTotal,
    grandTotal,
    hasLegacyLines,
    maxLeadTimeDays,
    shippingMethodsLoading,
    shippingMethodsFailed,
    methodsByVendor,
  };
}
