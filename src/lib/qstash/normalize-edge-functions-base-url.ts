/**
 * QStash `v2/publish/{url}` 要求 destination 含 `http://` 或 `https://`。
 * 常見：漏寫 scheme、或複製時帶外層引號、BOM。
 */
export function normalizeEdgeFunctionsBaseUrl(raw: string): string {
  let s = raw
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim()
    .replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s.replace(/^\/+/, '')}`;
  }
  const u = new URL(s);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`EDGE_FUNCTIONS_URL 必須為 http(s)：${raw.slice(0, 120)}`);
  }
  if (!u.hostname) {
    throw new Error(`EDGE_FUNCTIONS_URL 缺少主機名：${raw.slice(0, 120)}`);
  }
  const path = u.pathname.replace(/\/+$/, '');
  return `${u.origin}${path}`;
}
