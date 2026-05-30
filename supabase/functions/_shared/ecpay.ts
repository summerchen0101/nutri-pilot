/**
 * 綠界全方位金流 AIO CheckMac（SHA256）與工具
 */
import { createHash, randomUUID as nodeRandomUuid } from "node:crypto";

const TEST_MERCHANT_ID = "2000132";
const TEST_HASH_KEY = "ejCk326UnaZWKisg";
const TEST_HASH_IV = "q9jcZX8Ib9LM8wYk";

export function randomUuid(): string {
  return nodeRandomUuid();
}

export function isEcpayStage(): boolean {
  const v = Deno.env.get("ECPAY_STAGE");
  return v == null || v.trim() === "" || v.toLowerCase() !== "false";
}

export function getEcpayPaymentConfig(): {
  merchantId: string;
  hashKey: string;
  hashIv: string;
  aioUrl: string;
  queryUrl: string;
} {
  const stage = isEcpayStage();
  const merchantId = Deno.env.get("ECPAY_MERCHANT_ID")?.trim() ||
    (stage ? TEST_MERCHANT_ID : "");
  const hashKey = Deno.env.get("ECPAY_HASH_KEY")?.trim() ||
    (stage ? TEST_HASH_KEY : "");
  const hashIv = Deno.env.get("ECPAY_HASH_IV")?.trim() ||
    (stage ? TEST_HASH_IV : "");

  const aioUrl = stage ?
    "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"
    : "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5";
  const queryUrl = stage ?
    "https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5"
    : "https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5";

  return { merchantId, hashKey, hashIv, aioUrl, queryUrl };
}

/** .NET 風格 UrlEncode（綠界 CheckMac） */
export function dotNetUrlEncode(value: string): string {
  let encoded = encodeURIComponent(value);
  encoded = encoded.replace(/%20/g, "+");
  encoded = encoded.replace(/%2d/gi, "-");
  encoded = encoded.replace(/%5f/gi, "_");
  encoded = encoded.replace(/%2e/gi, ".");
  encoded = encoded.replace(/%21/gi, "!");
  encoded = encoded.replace(/%2a/gi, "*");
  encoded = encoded.replace(/%28/gi, "(");
  encoded = encoded.replace(/%29/gi, ")");
  return encoded;
}

function buildCheckMacRaw(
  params: Record<string, string>,
  hashKey: string,
  hashIv: string,
  includeEmpty: boolean,
): string {
  const keys = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .filter((k) => includeEmpty || (params[k] ?? "").length > 0)
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

  const query = keys.map((k) => `${k}=${params[k] ?? ""}`).join("&");
  return `HashKey=${hashKey}&${query}&HashIV=${hashIv}`;
}

export function generateEcpayCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIv: string,
): string {
  const encoded = dotNetUrlEncode(
    buildCheckMacRaw(params, hashKey, hashIv, false),
  );
  return createHash("sha256").update(encoded.toLowerCase()).digest("hex")
    .toUpperCase();
}

export function verifyEcpayCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIv: string,
  includeEmpty = true,
): boolean {
  const received = params.CheckMacValue ?? "";
  if (!received) return false;
  const encoded = dotNetUrlEncode(
    buildCheckMacRaw(params, hashKey, hashIv, includeEmpty),
  );
  const expected = createHash("sha256").update(encoded.toLowerCase()).digest(
    "hex",
  )
    .toUpperCase();
  if (expected.length !== received.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return diff === 0;
}

/** 綠界 MerchantTradeNo ≤20 */
export function createMerchantTradeNo(): string {
  const t = Date.now().toString(36);
  const r = nodeRandomUuid().replace(/-/g, "").slice(0, 8);
  return `NP${t}${r}`.slice(0, 20);
}

export function formatMerchantTradeDateTaipei(d = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

export function parseEcpayFormBody(raw: string): Record<string, string> {
  const params = new URLSearchParams(raw);
  const out: Record<string, string> = {};
  params.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

export function getAppUrl(): string {
  return (Deno.env.get("APP_URL") ?? Deno.env.get("NEXT_PUBLIC_APP_URL") ??
    "http://localhost:3000").replace(/\/$/, "");
}

/** 優先 query appOrigin（與 ecpay-order-result 一致），否則 fallback APP_URL secret */
export function resolveAppOriginFromUrl(url: URL): string {
  const fromQuery = url.searchParams.get("appOrigin")?.trim() ?? "";
  if (fromQuery && /^https?:\/\//i.test(fromQuery)) {
    return fromQuery.replace(/\/$/, "");
  }
  return getAppUrl();
}

export function getSupabaseFunctionsBase(): string {
  return (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
}

/** 綠界 CVS 收件人姓名：4–10 字元（中文 2–5 字） */
export function validateEcpayRecipientName(name: string): string | null {
  const t = name.trim();
  if (t.length < 2) return "收件人姓名至少 2 個字";
  const len = [...t].length;
  if (len < 2 || len > 5) {
    return "綠界超商取貨姓名請為 2–5 個中文字（或符合 4–10 字元規範）";
  }
  return null;
}
