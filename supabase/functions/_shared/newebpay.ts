/**
 * 藍新 MPG AES / TradeSha（與官方 Node 範例一致：TradeSha = SHA256 大寫 hex）
 */
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomUUID as nodeRandomUuid,
} from "node:crypto";

const AES_ALGO = "aes-256-cbc";

export function randomUuid(): string {
  return nodeRandomUuid();
}

export function mpgEncrypt(plain: string, hashKey: string, hashIv: string): string {
  const key = Buffer.from(hashKey, "utf8");
  const iv = Buffer.from(hashIv, "utf8");
  const cipher = createCipheriv(AES_ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return enc.toString("hex");
}

export function mpgDecrypt(hexCipher: string, hashKey: string, hashIv: string): string {
  const key = Buffer.from(hashKey, "utf8");
  const iv = Buffer.from(hashIv, "utf8");
  const decipher = createDecipheriv(AES_ALGO, key, iv);
  const dec = Buffer.concat([
    decipher.update(Buffer.from(hexCipher, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8").replace(/[\x00-\x1F]+$/g, "");
}

export function mpgTradeSha(tradeInfoHex: string, hashKey: string, hashIv: string): string {
  const payload = `HashKey=${hashKey}&${tradeInfoHex}&HashIV=${hashIv}`;
  return createHash("sha256").update(payload).digest("hex").toUpperCase();
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    const ca = a.charCodeAt(i);
    const cb = b.charCodeAt(i);
    diff |= ca ^ cb;
  }
  return diff === 0;
}

export function verifyMpgTradeSha(
  tradeInfoHex: string,
  tradeSha: string,
  hashKey: string,
  hashIv: string,
): boolean {
  const expected = mpgTradeSha(tradeInfoHex, hashKey, hashIv);
  return timingSafeEqualHex(expected, tradeSha);
}

/** MerchantOrderNo：≤30，英數與底線 */
export function createMerchantOrderNo(): string {
  const t = Date.now().toString(36);
  const r = nodeRandomUuid().replace(/-/g, "").slice(0, 12);
  return `${t}${r}`.slice(0, 30);
}

export function buildSortedTradeQueryString(
  data: Record<string, string | number>,
): string {
  const keys = Object.keys(data).sort();
  return keys
    .map((k) => `${k}=${encodeURIComponent(String(data[k]))}`)
    .join("&");
}

/** 單筆交易查詢 CheckValue（手冊 4.1.6） */
export function mpgQueryCheckValue(
  merchantId: string,
  merchantOrderNo: string,
  amt: number,
  hashKey: string,
  hashIv: string,
): string {
  const query = buildSortedTradeQueryString({
    Amt: amt,
    MerchantID: merchantId,
    MerchantOrderNo: merchantOrderNo,
  });
  const payload = `IV=${hashIv}&${query}&Key=${hashKey}`;
  return createHash("sha256").update(payload).digest("hex").toUpperCase();
}

export function queryTradeInfoUrl(newebpayEnv: string | undefined): string {
  return newebpayEnv === "production" ?
      "https://core.newebpay.com/API/QueryTradeInfo"
    : "https://ccore.newebpay.com/API/QueryTradeInfo";
}
