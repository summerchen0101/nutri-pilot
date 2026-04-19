/**
 * 與 `@upstash/qstash` HttpClient 一致：`path` 為 `v2/publish/{destination}`，
 * destination 為完整 URL 字串，以 `/` 串接（見 qstash-js `processRequest`）。
 * 勿對整段 destination 使用 `encodeURIComponent`，否則部分環境下 QStash 會回
 * `invalid destination url: endpoint has invalid scheme`。
 */
export function buildQstashPublishRequestUrl(
  qstashApiBase: string,
  destinationUrl: string,
): string {
  const base = qstashApiBase.replace(/\/+$/, '');
  return [base, 'v2', 'publish', destinationUrl].join('/');
}
