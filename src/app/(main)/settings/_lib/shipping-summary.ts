/** 設定列上一行呈現：收件人 + 縣市區（例：陳小花 台中市東區） */
export function formatShippingTeaserLine(recipientName: string, addressFull: string): string {
  const name = recipientName.trim();
  const addr = addressFull.trim();
  if (!name && !addr) {
    return '尚未填寫';
  }

  const district = extractTaiwanDistrictPrefix(addr);
  if (name && district) {
    return `${name} ${district}`;
  }
  if (name) {
    return name;
  }
  return district || '尚未填寫';
}

function extractTaiwanDistrictPrefix(address: string): string {
  const t = address.trim();
  if (!t) return '';
  const m = t.match(/^(.{2,7}?[縣市])(.{2,10}?[區鄉鎮市])/);
  if (m) {
    return `${m[1]}${m[2]}`;
  }
  return t.length > 12 ? `${t.slice(0, 12)}…` : t;
}

export function formatShippingSummaryLine(params: {
  recipientName: string;
  phone: string;
  addressFull: string;
}): string {

  const recipientName = params.recipientName.trim();
  const phone = params.phone.trim();
  const addressFull = params.addressFull.trim();

  if (!recipientName && !phone && !addressFull) {
    return '尚未填寫';
  }

  const parts: string[] = [];

  if (recipientName) {
    parts.push(recipientName);
  }

  if (phone) {
    const tail = phone.length >= 4 ? phone.slice(-4) : phone;
    parts.push(`末四碼 ${tail}`);
  }

  if (addressFull) {
    const shortened = addressFull.length > 14 ? `${addressFull.slice(0, 14)}…` : addressFull;
    parts.push(shortened);
  }

  return parts.join('・');
}
