/**
 * 綠界物流 C2C：V1 MD5 CheckMac、V2 AES JSON 信封
 */
import { Buffer } from "node:buffer";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";

import { dotNetUrlEncode, isEcpayStage } from "./ecpay.ts";

const TEST_LOGISTICS_MERCHANT_ID = "2000933";
const TEST_LOGISTICS_HASH_KEY = "XBERn1YOvpM9nfZc";
const TEST_LOGISTICS_HASH_IV = "h1ONHk4P4yqbl5LK";

export interface EcpayLogisticsConfig {
  merchantId: string;
  hashKey: string;
  hashIv: string;
  senderName: string;
  senderCellPhone: string;
  senderZipCode: string;
  senderAddress: string;
  senderPhone: string;
  stage: boolean;
  host: string;
}

export function getEcpayLogisticsConfig(): EcpayLogisticsConfig {
  const stage = isEcpayStage();
  const pay = {
    merchantId: Deno.env.get("ECPAY_MERCHANT_ID")?.trim() ?? "",
    hashKey: Deno.env.get("ECPAY_HASH_KEY")?.trim() ?? "",
    hashIv: Deno.env.get("ECPAY_HASH_IV")?.trim() ?? "",
  };

  const logisticsMerchantId =
    Deno.env.get("ECPAY_LOGISTICS_MERCHANT_ID")?.trim() ?? "";
  const logisticsHashKey =
    Deno.env.get("ECPAY_LOGISTICS_HASH_KEY")?.trim() ?? "";
  const logisticsHashIv =
    Deno.env.get("ECPAY_LOGISTICS_HASH_IV")?.trim() ?? "";

  // 測試環境預設 C2C 物流 2000933；勿 fallback 金流 B2C 2000132（會導致 LogisticsType Is Not Match）
  const merchantId = logisticsMerchantId ||
    (stage ? TEST_LOGISTICS_MERCHANT_ID : pay.merchantId);
  const hashKey = logisticsHashKey ||
    (stage ? TEST_LOGISTICS_HASH_KEY : pay.hashKey);
  const hashIv = logisticsHashIv ||
    (stage ? TEST_LOGISTICS_HASH_IV : pay.hashIv);

  const host = stage ?
    "https://logistics-stage.ecpay.com.tw"
    : "https://logistics.ecpay.com.tw";

  let senderName = Deno.env.get("ECPAY_LOGISTICS_SENDER_NAME")?.trim() ?? "";
  if (!senderName && stage) {
    senderName = STAGE_DEFAULT_SENDER_NAME;
  }

  return {
    merchantId,
    hashKey,
    hashIv,
    senderName,
    senderCellPhone:
      Deno.env.get("ECPAY_LOGISTICS_SENDER_CELLPHONE")?.trim() ?? "",
    senderZipCode:
      Deno.env.get("ECPAY_LOGISTICS_SENDER_ZIP_CODE")?.trim() ?? "",
    senderAddress:
      Deno.env.get("ECPAY_LOGISTICS_SENDER_ADDRESS")?.trim() ?? "",
    senderPhone: Deno.env.get("ECPAY_LOGISTICS_SENDER_PHONE")?.trim() ?? "",
    stage,
    host,
  };
}

export function logisticsV2Urls(host: string) {
  return {
    selection: `${host}/Express/v2/RedirectToLogisticsSelection`,
    createByTemp: `${host}/Express/v2/CreateByTempTrade`,
    query: `${host}/Express/v2/QueryLogisticsTradeInfo`,
    printTradeDocument: `${host}/Express/v2/PrintTradeDocument`,
  };
}

export function upperCaseUrlEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /%[0-9A-F]{2}/g,
    (m) => m.toUpperCase(),
  );
}

function aesKeyIv(hashKey: string, hashIv: string): {
  key: Buffer;
  iv: Buffer;
} {
  return {
    key: Buffer.from(hashKey.slice(0, 16), "utf8"),
    iv: Buffer.from(hashIv.slice(0, 16), "utf8"),
  };
}

export function encryptEcpayLogisticsData(
  data: Record<string, unknown>,
  hashKey: string,
  hashIv: string,
): string {
  const json = JSON.stringify(data);
  const encoded = upperCaseUrlEncode(json);
  const { key, iv } = aesKeyIv(hashKey, hashIv);
  const cipher = createCipheriv("aes-128-cbc", key, iv);
  const enc = Buffer.concat([
    cipher.update(encoded, "utf8"),
    cipher.final(),
  ]);
  return enc.toString("base64");
}

export function decryptEcpayLogisticsData(
  base64Cipher: string,
  hashKey: string,
  hashIv: string,
): Record<string, unknown> {
  const { key, iv } = aesKeyIv(hashKey, hashIv);
  const decipher = createDecipheriv("aes-128-cbc", key, iv);
  const dec = Buffer.concat([
    decipher.update(Buffer.from(base64Cipher, "base64")),
    decipher.final(),
  ]);
  const decoded = decodeURIComponent(
    dec.toString("utf8").replace(/\+/g, "%20"),
  );
  return JSON.parse(decoded) as Record<string, unknown>;
}

export function generateEcpayLogisticsCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIv: string,
): string {
  const keys = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .filter((k) => (params[k] ?? "").length > 0)
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

  const query = keys.map((k) => `${k}=${params[k] ?? ""}`).join("&");
  const encoded = dotNetUrlEncode(
    `HashKey=${hashKey}&${query}&HashIV=${hashIv}`,
  );
  // 綠界物流 MD5：URL encode 後須轉小寫再雜湊（見 developers.ecpay.com.tw/7424）
  return createHash("md5").update(encoded.toLowerCase()).digest("hex")
    .toUpperCase();
}

export function verifyEcpayLogisticsCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIv: string,
): boolean {
  const received = params.CheckMacValue ?? "";
  if (!received) return false;
  const expected = generateEcpayLogisticsCheckMacValue(
    params,
    hashKey,
    hashIv,
  );
  return received === expected;
}

export interface EcpayLogisticsV2Result {
  transCode: number | null;
  transMsg: string;
  rtnCode: number | null;
  rtnMsg: string;
  html: string | null;
  redirectUrl: string | null;
  raw: Record<string, unknown>;
  decrypted: Record<string, unknown> | null;
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseEcpayLogisticsV2Response(
  parsed: Record<string, unknown>,
  hashKey: string,
  hashIv: string,
): EcpayLogisticsV2Result {
  const transCode = numOrNull(parsed.TransCode);
  const transMsg = String(parsed.TransMsg ?? "").trim();

  let decrypted: Record<string, unknown> | null = null;
  const dataCipher = parsed.Data;
  if (typeof dataCipher === "string" && dataCipher.length > 0) {
    try {
      decrypted = decryptEcpayLogisticsData(dataCipher, hashKey, hashIv);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        transCode,
        transMsg: transMsg || `Data 解密失敗：${msg}`,
        rtnCode: null,
        rtnMsg: "",
        html: null,
        raw: parsed,
        decrypted: null,
      };
    }
  }

  const rtnCode = decrypted ? numOrNull(decrypted.RtnCode) : null;
  const rtnMsg = decrypted ? String(decrypted.RtnMsg ?? "").trim() : "";

  let html: string | null = null;
  if (decrypted) {
    for (const key of ["Html", "HTML", "html", "FormHtml", "RedirectHtml"]) {
      const v = decrypted[key];
      if (typeof v === "string" && v.includes("<")) {
        html = v;
        break;
      }
    }
    if (!html) {
      for (const v of Object.values(decrypted)) {
        if (
          typeof v === "string" &&
          (v.includes("<form") || v.includes("<!DOCTYPE") || v.includes("<html"))
        ) {
          html = v;
          break;
        }
      }
    }
  }

  const redirectUrl = decrypted ?
    String(
      decrypted.RedirectURL ?? decrypted.redirectURL ?? decrypted.Url ?? "",
    ).trim()
    : null;

  return {
    transCode,
    transMsg,
    rtnCode,
    rtnMsg,
    html,
    redirectUrl: redirectUrl && redirectUrl.startsWith("http") ?
      redirectUrl
      : null,
    raw: parsed,
    decrypted,
  };
}

function isHtmlResponseBody(text: string): boolean {
  const t = text.trimStart().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") ||
    t.includes("autosubmitformtologisticsselection");
}

/** 從綠界 AutoSubmit HTML 擷取 form action 與欄位 d（V2 信封 JSON） */
export function extractLogisticsAutoSubmitForm(html: string): {
  action: string;
  fields: Record<string, string>;
} | null {
  const actionMatch = html.match(
    /<form[^>]*\baction\s*=\s*["']([^"']+)["']/i,
  );
  if (!actionMatch?.[1]) {
    console.error(
      "[extractLogisticsAutoSubmitForm] missing form action:",
      html.slice(0, 200),
    );
    return null;
  }

  const dPatterns = [
    /<input[^>]*\bname\s*=\s*["']d["'][^>]*\bvalue\s*=\s*'([^']*)'/i,
    /<input[^>]*\bname\s*=\s*["']d["'][^>]*\bvalue\s*=\s*"([^"]*)"/i,
    /<input[^>]*\bvalue\s*=\s*'([^']*)'[^>]*\bname\s*=\s*["']d["']/i,
    /<input[^>]*\bvalue\s*=\s*"([^"]*)"[^>]*\bname\s*=\s*["']d["']/i,
  ];

  let dValue = "";
  for (const pattern of dPatterns) {
    const m = html.match(pattern);
    if (m?.[1]) {
      dValue = m[1];
      break;
    }
  }

  if (!dValue) {
    console.error(
      "[extractLogisticsAutoSubmitForm] missing input d:",
      html.slice(0, 200),
    );
    return null;
  }

  return { action: actionMatch[1], fields: { d: dValue } };
}

export interface LogisticsCallbackParsed {
  flat: Record<string, string>;
  decrypted: Record<string, unknown> | null;
}

function flatFromDecrypted(
  decrypted: Record<string, unknown> | null,
): Record<string, string> {
  const flat: Record<string, string> = {};
  if (!decrypted) return flat;
  for (const [k, v] of Object.entries(decrypted)) {
    if (v == null || typeof v === "object") continue;
    flat[k] = String(v);
  }
  return flat;
}

function tryDecryptLogisticsEnvelope(
  envelope: Record<string, unknown>,
  hashKey: string,
  hashIv: string,
): Record<string, unknown> | null {
  const dataCipher = envelope.Data;
  if (typeof dataCipher !== "string" || !dataCipher.length) return null;
  try {
    return decryptEcpayLogisticsData(dataCipher, hashKey, hashIv);
  } catch (e) {
    console.error(
      "[parseLogisticsCallbackBody] decrypt failed:",
      e instanceof Error ? e.message : String(e),
    );
    return null;
  }
}

function tryParseJsonRecord(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export interface ResolvedClientReturnData {
  inner: Record<string, unknown>;
  flat: Record<string, string>;
}

/** 綠界物流選擇頁 ClientReply：解析 ResultData 信封內加密 Data */
export function resolveLogisticsClientReturnData(input: {
  flat: Record<string, string>;
  decrypted: Record<string, unknown> | null;
  hashKey: string;
  hashIv: string;
}): ResolvedClientReturnData {
  const { flat, decrypted, hashKey, hashIv } = input;
  let inner: Record<string, unknown> = {};

  const mergeInner = (record: Record<string, unknown> | null) => {
    if (!record) return;
    const fromData = tryDecryptLogisticsEnvelope(record, hashKey, hashIv);
    if (fromData) {
      inner = { ...inner, ...fromData };
      return;
    }
    for (const [k, v] of Object.entries(record)) {
      if (v != null && typeof v !== "object") inner[k] = v;
    }
  };

  mergeInner(decrypted);

  const resultDataRaw = flat.ResultData ?? flat.resultData ?? "";
  if (resultDataRaw) {
    const envelope = tryParseJsonRecord(resultDataRaw);
    if (envelope) mergeInner(envelope);
  }

  const dataCipher = flat.Data ?? "";
  if (dataCipher && !inner.TempLogisticsID) {
    try {
      inner = { ...inner, ...decryptEcpayLogisticsData(dataCipher, hashKey, hashIv) };
    } catch (e) {
      console.error(
        "[resolveLogisticsClientReturnData] flat.Data decrypt:",
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  for (const [k, v] of Object.entries(flat)) {
    if (k === "ResultData" || k === "resultData" || k === "Data" || k === "d") {
      continue;
    }
    if (inner[k] == null || inner[k] === "") inner[k] = v;
  }

  return { inner, flat: { ...flat, ...flatFromDecrypted(inner) } };
}

/** 綠界物流 ClientReplyURL／ServerReplyURL：flat 或 V2 JSON／d 信封 */
export function parseLogisticsCallbackBody(
  raw: string,
  contentType: string | undefined,
  hashKey: string,
  hashIv: string,
): LogisticsCallbackParsed {
  const trimmed = raw.trim();
  const isJson =
    contentType?.includes("application/json") || trimmed.startsWith("{");

  if (isJson) {
    try {
      const envelope = JSON.parse(trimmed) as Record<string, unknown>;
      const decrypted = tryDecryptLogisticsEnvelope(
        envelope,
        hashKey,
        hashIv,
      );
      const flat = flatFromDecrypted(decrypted);
      return { flat, decrypted };
    } catch (e) {
      console.error(
        "[parseLogisticsCallbackBody] JSON parse:",
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  const params = new URLSearchParams(trimmed);
  const dField = params.get("d");
  if (dField) {
    try {
      const envelope = JSON.parse(dField) as Record<string, unknown>;
      const decrypted = tryDecryptLogisticsEnvelope(
        envelope,
        hashKey,
        hashIv,
      );
      const flat = flatFromDecrypted(decrypted);
      return { flat, decrypted };
    } catch (e) {
      console.error(
        "[parseLogisticsCallbackBody] d envelope:",
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  const flat: Record<string, string> = {};
  params.forEach((v, k) => {
    flat[k] = v;
  });
  return { flat, decrypted: null };
}

/**
 * 開啟物流選擇頁：成功時綠界常直接回傳 HTML（非 JSON 信封）
 */
export async function requestLogisticsSelectionPage(
  url: string,
  merchantId: string,
  data: Record<string, unknown>,
  hashKey: string,
  hashIv: string,
): Promise<EcpayLogisticsV2Result> {
  const body = {
    MerchantID: merchantId,
    RqHeader: { Timestamp: Math.floor(Date.now() / 1000) },
    Data: encryptEcpayLogisticsData(data, hashKey, hashIv),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/html, application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  if (isHtmlResponseBody(text)) {
    return {
      transCode: 1,
      transMsg: "",
      rtnCode: 1,
      rtnMsg: "成功",
      html: text,
      redirectUrl: null,
      raw: {},
      decrypted: null,
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {
      transCode: null,
      transMsg: `綠界回應格式無法解析：${text.slice(0, 300)}`,
      rtnCode: null,
      rtnMsg: "",
      html: null,
      redirectUrl: null,
      raw: {},
      decrypted: null,
    };
  }

  return parseEcpayLogisticsV2Response(parsed, hashKey, hashIv);
}

/** 列印託運單：V2 PrintTradeDocument，回傳 HTML 或錯誤 */
export async function requestLogisticsPrintPage(
  host: string,
  merchantId: string,
  logisticsId: string,
  logisticsSubType: string,
  hashKey: string,
  hashIv: string,
  printMode = 1,
): Promise<EcpayLogisticsV2Result> {
  const urls = logisticsV2Urls(host);
  const data: Record<string, unknown> = {
    MerchantID: merchantId,
    LogisticsID: [logisticsId],
    LogisticsSubType: logisticsSubType,
    PrintMode: printMode,
  };
  return requestLogisticsSelectionPage(
    urls.printTradeDocument,
    merchantId,
    data,
    hashKey,
    hashIv,
  );
}

export async function postEcpayLogisticsV2Json(
  url: string,
  merchantId: string,
  data: Record<string, unknown>,
  hashKey: string,
  hashIv: string,
): Promise<Record<string, unknown>> {
  const body = {
    MerchantID: merchantId,
    RqHeader: { Timestamp: Math.floor(Date.now() / 1000) },
    Data: encryptEcpayLogisticsData(data, hashKey, hashIv),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (isHtmlResponseBody(text)) {
    throw new Error(
      "ECPay returned HTML; use requestLogisticsSelectionPage for selection API",
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`ECPay logistics invalid JSON: ${text.slice(0, 200)}`);
  }

  const result = parseEcpayLogisticsV2Response(parsed, hashKey, hashIv);
  return {
    ...parsed,
    _parsed: result,
    _decrypted: result.decrypted,
  };
}

/** 綠界 V2 開啟物流選擇頁 — Data 參數（TempLogisticsID 新建請帶 "0"） */
export function buildLogisticsSelectionPayload(input: {
  goodsAmount: number;
  goodsName: string;
  senderName: string;
  senderZipCode: string;
  senderAddress: string;
  serverReplyUrl: string;
  clientReplyUrl: string;
  receiverName?: string;
  receiverCellPhone?: string;
  receiverAddress?: string;
}): Record<string, unknown> {
  const amount = Math.max(1, Math.min(20000, Math.round(input.goodsAmount)));
  const payload: Record<string, unknown> = {
    TempLogisticsID: "0",
    GoodsAmount: amount,
    IsCollection: "N",
    GoodsName: sanitizeLogisticsGoodsName(input.goodsName),
    SenderName: input.senderName.slice(0, 10),
    SenderZipCode: input.senderZipCode.slice(0, 6),
    SenderAddress: input.senderAddress.slice(0, 60),
    Temperature: "0001",
    Specification: "0001",
    ServerReplyURL: input.serverReplyUrl,
    ClientReplyURL: input.clientReplyUrl,
  };

  const rn = input.receiverName?.trim();
  const rp = input.receiverCellPhone?.trim();
  const ra = input.receiverAddress?.trim();
  if (rn) payload.ReceiverName = rn.slice(0, 10);
  if (rp && /^09\d{8}$/.test(rp)) {
    payload.ReceiverCellPhone = rp.slice(0, 10);
  }
  if (ra && ra.length >= 6) payload.ReceiverAddress = ra.slice(0, 60);

  return payload;
}

export function sanitizeLogisticsGoodsName(name: string): string {
  const cleaned = name
    .replace(/[\^'`!@#%&*+\"<>|_[\]]/g, "")
    .trim();
  const base = cleaned.length > 0 ? cleaned : "商品";
  return base.slice(0, 50);
}

export function formatLogisticsV2Error(result: EcpayLogisticsV2Result): string {
  if (result.transCode !== 1) {
    return result.transMsg || `TransCode=${result.transCode ?? "?"}`;
  }
  if (result.rtnCode !== 1) {
    return result.rtnMsg || result.transMsg || `RtnCode=${result.rtnCode ?? "?"}`;
  }
  return result.transMsg || result.rtnMsg || "綠界物流 API 失敗";
}

const STAGE_DEFAULT_SENDER_NAME = "NutriPilot";

export function assertLogisticsSenderReady(cfg: EcpayLogisticsConfig): void {
  const missing: string[] = [];
  if (!cfg.senderName) missing.push("ECPAY_LOGISTICS_SENDER_NAME");
  if (!cfg.senderCellPhone) missing.push("ECPAY_LOGISTICS_SENDER_CELLPHONE");
  if (!cfg.senderZipCode) missing.push("ECPAY_LOGISTICS_SENDER_ZIP_CODE");
  if (!cfg.senderAddress) missing.push("ECPAY_LOGISTICS_SENDER_ADDRESS");
  if (missing.length > 0) {
    throw new Error(
      `缺少物流寄件人設定：${missing.join("、")}。請寫入 .env.local 後執行 ./scripts/ecpay-setup.sh`,
    );
  }
}
