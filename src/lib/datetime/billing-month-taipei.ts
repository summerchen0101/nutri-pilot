/** 帳務曆月 YYYY-MM（Asia/Taipei），與 ai_usage_events.billing_month 一致。 */
export function billingMonthTaipei(d: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  if (!y || !m) {
    throw new Error('billingMonthTaipei: invalid Intl parts');
  }
  return `${y}-${m}`;
}
