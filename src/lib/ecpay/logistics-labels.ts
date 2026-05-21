const SUBTYPE_LABELS: Record<string, string> = {
  UNIMARTC2C: '7-ELEVEN',
  FAMIC2C: '全家',
  HILIFEC2C: '萊爾富',
  OKMARTC2C: 'OK Mart',
  UNIMARTFREEZE: '7-ELEVEN 冷凍',
  TCAT: '黑貓宅配',
  POST: '郵局宅配',
};

export function logisticsSubtypeDisplayLabel(subtype: string | null | undefined): string {
  if (!subtype) return '—';
  return SUBTYPE_LABELS[subtype] ?? subtype;
}
