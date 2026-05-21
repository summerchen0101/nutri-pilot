/** 綠界 CVS 收件人姓名：建議 2–5 個中文字 */
export function validateEcpayRecipientName(name: string): string | null {
  const t = name.trim();
  if (t.length < 2) return '收件人姓名至少 2 個字';
  const len = Array.from(t).length;
  if (len < 2 || len > 5) {
    return '綠界超商取貨姓名請為 2–5 個中文字';
  }
  return null;
}
