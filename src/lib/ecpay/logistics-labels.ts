const SUBTYPE_LABELS: Record<string, string> = {
  UNIMARTC2C: '7-ELEVEN',
  FAMIC2C: '全家',
  HILIFEC2C: '萊爾富',
  OKMARTC2C: 'OK Mart',
  UNIMARTFREEZE: '7-ELEVEN 冷凍',
  TCAT: '黑貓宅配',
  POST: '郵局宅配',
};

const PRINT_SUPPORTED_SUBTYPES = new Set([
  'UNIMARTC2C',
  'FAMIC2C',
  'HILIFEC2C',
  'OKMARTC2C',
  'UNIMARTFREEZE',
  'TCAT',
  'POST',
]);

export function isLogisticsPrintSupported(subtype: string | null | undefined): boolean {
  if (!subtype) return false;
  return PRINT_SUPPORTED_SUBTYPES.has(subtype);
}

export function logisticsSubtypeDisplayLabel(subtype: string | null | undefined): string {
  if (!subtype) return '—';
  return SUBTYPE_LABELS[subtype] ?? subtype;
}
