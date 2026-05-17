/**
 * 結帳側欄摘要列顯示用遮罩（不寫回表單值）。
 */

export function maskRecipientNameForDisplay(name: string): string {
  const t = name.trim();
  if (t.length === 0) return '—';
  if (t.length === 1) return `${t}*`;
  if (t.length === 2) return `${t[0]}*`;
  return `${t[0]}*${t[t.length - 1]}`;
}

export function maskPhoneForDisplay(phone: string): string {
  const raw = phone.trim();
  if (raw.length === 0) return '—';
  const digits = raw.replace(/\D/g, '');
  const tailLen = Math.min(4, digits.length);
  const tail = digits.slice(-tailLen);
  if (tail.length === 0) return '***';
  return `(+886) ${'*'.repeat(Math.max(3, 7 - tailLen))}${tail}`;
}

export function maskAddressForDisplay(address: string): string {
  const t = address.trim();
  if (t.length === 0) return '—';
  if (t.length <= 8) return `${t.slice(0, 2)}***`;
  const head = t.slice(0, 4);
  const tail = t.slice(-4);
  return `${head}***${tail}`;
}
