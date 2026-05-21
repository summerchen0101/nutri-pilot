export interface ShopPointsRedemptionInput {
  pointsBalance: number;
  itemsSubtotal: number;
  shippingTotal: number;
  effectiveShipping: number;
  isCvsCod: boolean;
  applyPoints: boolean;
}

export interface ShopPointsRedemptionResult {
  grossTotal: number;
  maxRedeemable: number;
  pointsDiscount: number;
  netOrderTotal: number;
  paymentTotal: number;
}

function roundTwd(value: number): number {
  return Math.max(0, Math.round(value));
}

/** 1 點 = 1 元；折抵基數為商品小計 + 運費。 */
export function calcShopPointsRedemption(
  input: ShopPointsRedemptionInput,
): ShopPointsRedemptionResult {
  const itemsSubtotal = roundTwd(input.itemsSubtotal);
  const shippingTotal = roundTwd(input.shippingTotal);
  const effectiveShipping = roundTwd(input.effectiveShipping);
  const balance = Math.max(0, Math.floor(Number(input.pointsBalance) || 0));

  const grossTotal = itemsSubtotal + shippingTotal;
  const maxRedeemable = Math.min(balance, grossTotal);
  const pointsDiscount =
    input.applyPoints && maxRedeemable > 0 ? maxRedeemable : 0;
  const netOrderTotal = Math.max(0, grossTotal - pointsDiscount);

  const paymentTotal =
    input.isCvsCod ?
      Math.max(0, Math.min(netOrderTotal, effectiveShipping))
    : netOrderTotal;

  return {
    grossTotal,
    maxRedeemable,
    pointsDiscount,
    netOrderTotal,
    paymentTotal,
  };
}
