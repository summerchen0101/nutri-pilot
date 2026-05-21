'use client';

import { useEffect, useMemo } from 'react';

import { calcShopPointsRedemption } from '@/lib/shop/calc-shop-points-redemption';
import { isCvsCodShippingCode } from '@/lib/shop/shipping-method-kind';
import { useShopPointsBalance } from '@/lib/shop/use-shop-points-balance';
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
  const checkoutVendorId = useCartStore((s) => s.checkoutVendorId);
  const applyShopPoints = useCartStore((s) => s.applyShopPoints);
  const setApplyShopPoints = useCartStore((s) => s.setApplyShopPoints);
  const vendorShippingSelections = useCartStore(
    (s) => s.vendorShippingSelections,
  );
  const setVendorShippingSelection = useCartStore(
    (s) => s.setVendorShippingSelection,
  );
  const { balance: pointsBalance, loading: pointsBalanceLoading } =
    useShopPointsBalance();

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

      const cheapest = pickCheapestShippingMethod(rawRows, roundedSub);
      if (!cheapest) continue;

      const current =
        useCartStore.getState().vendorShippingSelections[vid] ?? null;
      if (current === cheapest.id) continue;

      setVendorShippingSelection(vid, cheapest.id);
    }
  }, [
    methodsByVendor,
    shippingMethodsLoading,
    vendorIds,
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

  const selectedSummary = useMemo(
    () =>
      checkoutVendorId ?
        summaries.find((s) => s.vendorId === checkoutVendorId) ?? null
      : null,
    [summaries, checkoutVendorId],
  );

  const selectedValidLines = useMemo(
    () =>
      checkoutVendorId ?
        validLines.filter((l) => l.vendorId === checkoutVendorId)
      : [],
    [validLines, checkoutVendorId],
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

  const selectedItemsSubtotal = useMemo(
    () => cartTotalItemsSubtotal(selectedValidLines),
    [selectedValidLines],
  );
  const selectedShippingTotal = useMemo(
    () => (selectedSummary ? selectedSummary.effectiveShipping : 0),
    [selectedSummary],
  );
  const selectedGrandTotal = useMemo(
    () => selectedItemsSubtotal + selectedShippingTotal,
    [selectedItemsSubtotal, selectedShippingTotal],
  );

  const selectedPointsRedemption = useMemo(() => {
    if (!selectedSummary) {
      return calcShopPointsRedemption({
        pointsBalance: 0,
        itemsSubtotal: 0,
        shippingTotal: 0,
        effectiveShipping: 0,
        isCvsCod: false,
        applyPoints: false,
      });
    }

    return calcShopPointsRedemption({
      pointsBalance,
      itemsSubtotal: selectedItemsSubtotal,
      shippingTotal: selectedShippingTotal,
      effectiveShipping: selectedSummary.effectiveShipping,
      isCvsCod: isCvsCodShippingCode(
        selectedSummary.selectedShippingMethodCode ?? null,
      ),
      applyPoints: applyShopPoints,
    });
  }, [
    selectedSummary,
    selectedItemsSubtotal,
    selectedShippingTotal,
    pointsBalance,
    applyShopPoints,
  ]);

  const {
    maxRedeemable,
    pointsDiscount,
    netOrderTotal: selectedNetOrderTotal,
    paymentTotal: selectedPayableTotal,
  } = selectedPointsRedemption;

  useEffect(() => {
    if (pointsBalanceLoading || shippingMethodsLoading) return;
    if (!selectedSummary) return;

    if ((pointsBalance <= 0 || maxRedeemable <= 0) && applyShopPoints) {
      setApplyShopPoints(false);
    }
  }, [
    applyShopPoints,
    maxRedeemable,
    pointsBalance,
    pointsBalanceLoading,
    selectedSummary,
    setApplyShopPoints,
    shippingMethodsLoading,
  ]);

  const hasLegacyLines = lines.length > 0 && validLines.length < lines.length;

  const maxLeadTimeDays = useMemo(() => {
    if (validLines.length === 0) return 0;
    return Math.max(...validLines.map((l) => l.leadTimeDays));
  }, [validLines]);

  useEffect(() => {
    if (vendorIds.length === 1 && !checkoutVendorId) {
      useCartStore.getState().setCheckoutVendorId(vendorIds[0]!);
    }
  }, [vendorIds, checkoutVendorId]);

  return {
    lines,
    checkoutVendorId,
    vendorShippingSelections,
    validLines,
    selectedValidLines,
    summaries,
    selectedSummary,
    itemsSubtotal,
    shippingTotal,
    grandTotal,
    selectedItemsSubtotal,
    selectedShippingTotal,
    selectedGrandTotal,
    pointsBalance,
    maxRedeemable,
    pointsDiscount,
    selectedNetOrderTotal,
    selectedPayableTotal,
    hasLegacyLines,
    maxLeadTimeDays,
    shippingMethodsLoading,
    shippingMethodsFailed,
    methodsByVendor,
  };
}
