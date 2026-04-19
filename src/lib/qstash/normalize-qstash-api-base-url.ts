/**
 * QStash REST 基底須為 `https://qstash.upstash.io`（或區域主機），**不要**含 `/v2/publish`。
 * 誤設成 `…/v2/publish/` 時，程式再拼 `/v2/publish/…` 會變成雙層 path，API 會誤判 destination，
 * 回應類似：`invalid destination url: endpoint has invalid scheme`。
 *
 * @see https://github.com/upstash/qstash-js/issues/226
 */
export function normalizeQstashApiBaseUrl(raw: string | undefined): string {
  const fallback = 'https://qstash.upstash.io';
  if (raw == null || !String(raw).trim()) return fallback;

  let s = String(raw)
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s.replace(/^\/+/, '')}`;
  }
  try {
    const u = new URL(s);
    if (u.pathname.includes('/v2/publish')) {
      return u.origin;
    }
    const path = u.pathname.replace(/\/+$/, '');
    return path ? `${u.origin}${path}` : u.origin;
  } catch {
    return fallback;
  }
}
