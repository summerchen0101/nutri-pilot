const LEDGER_REASON_LABEL: Record<string, string> = {
  subscription_grant: '訂閱發點',
  order_redeem: '商城折抵',
  admin_adjust: '系統調整',
  other: '其他',
};

export function labelShopPointReason(reason: string): string {
  return LEDGER_REASON_LABEL[reason] ?? reason;
}
