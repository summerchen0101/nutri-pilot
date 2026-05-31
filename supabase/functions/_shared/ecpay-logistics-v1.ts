/**
 * 綠界物流 V1：Express/map、Express/Create、Query V5（form-urlencoded + MD5 CheckMac）
 */
import { createHash } from "node:crypto";

import { formatMerchantTradeDateTaipei } from "./ecpay.ts";
import {
  generateEcpayLogisticsCheckMacValue,
  sanitizeLogisticsGoodsName,
  type EcpayLogisticsConfig,
} from "./ecpay-logistics.ts";

export function logisticsV1Urls(host: string) {
  return {
    map: `${host}/Express/map`,
    create: `${host}/Express/Create`,
    queryV5: `${host}/Helper/QueryLogisticsTradeInfo/V5`,
    printUniMartC2C: `${host}/Express/PrintUniMartC2COrderInfo`,
    printFamiC2C: `${host}/Express/PrintFAMIC2COrderInfo`,
    printOkMartC2C: `${host}/Express/PrintOKMARTC2COrderInfo`,
    printB2cHome: `${host}/helper/printTradeDocument`,
  };
}

/** 物流廠商交易編號 ≤20，與金流 merchant_order_no 區隔 */
export function createVendorLogisticsTradeNo(
  orderId: string,
  vendorId: string,
): string {
  const o = createHash("sha256")
    .update(orderId)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  const v = createHash("sha256")
    .update(vendorId)
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();
  const t = Date.now().toString(36).slice(-4);
  return `L${o}${v}${t}`.slice(0, 20);
}

export function buildLogisticsExtraData(
  orderId: string,
  vendorId: string,
): string {
  const o = orderId.replace(/-/g, "").slice(0, 8);
  const v = vendorId.replace(/-/g, "").slice(0, 8);
  return `${o}${v}`.slice(0, 20);
}

export function appendCheckMac(
  fields: Record<string, string>,
  hashKey: string,
  hashIv: string,
): Record<string, string> {
  const mac = generateEcpayLogisticsCheckMacValue(fields, hashKey, hashIv);
  return { ...fields, CheckMacValue: mac };
}

export function buildCvsMapFormFields(input: {
  merchantId: string;
  merchantTradeNo: string;
  logisticsSubType: string;
  isCollection: "Y" | "N";
  serverReplyUrl: string;
  extraData?: string;
  device?: "0" | "1";
}): Record<string, string> {
  const fields: Record<string, string> = {
    MerchantID: input.merchantId,
    MerchantTradeNo: input.merchantTradeNo,
    LogisticsType: "CVS",
    LogisticsSubType: input.logisticsSubType,
    IsCollection: input.isCollection,
    ServerReplyURL: input.serverReplyUrl,
  };
  if (input.extraData) fields.ExtraData = input.extraData.slice(0, 20);
  if (input.device) fields.Device = input.device;
  return fields;
}

export interface LogisticsCreateRecipient {
  name: string;
  cellPhone: string;
  phone?: string;
  email?: string;
}

export interface LogisticsCreateVendorContext {
  vendorName: string;
  itemsSubtotal: number;
  logisticsSubType: string;
  isCollection: "Y" | "N";
  receiverStoreId?: string;
}

export function buildCvsCreateFormFields(
  cfg: EcpayLogisticsConfig,
  input: {
    merchantTradeNo: string;
    serverReplyUrl: string;
    recipient: LogisticsCreateRecipient;
    vendor: LogisticsCreateVendorContext;
  },
): Record<string, string> {
  const goodsAmount = Math.max(
    1,
    Math.min(20000, Math.round(input.vendor.itemsSubtotal)),
  );
  const isCollection = input.vendor.isCollection;
  const fields: Record<string, string> = {
    MerchantID: cfg.merchantId,
    MerchantTradeNo: input.merchantTradeNo,
    MerchantTradeDate: formatMerchantTradeDateTaipei(),
    LogisticsType: "CVS",
    LogisticsSubType: input.vendor.logisticsSubType,
    GoodsAmount: String(goodsAmount),
    IsCollection: isCollection,
    GoodsName: sanitizeLogisticsGoodsName(input.vendor.vendorName),
    SenderName: cfg.senderName.slice(0, 10),
    SenderCellPhone: cfg.senderCellPhone.slice(0, 10),
    ReceiverName: input.recipient.name.slice(0, 10),
    ReceiverCellPhone: input.recipient.cellPhone.slice(0, 10),
    ServerReplyURL: input.serverReplyUrl,
    ReceiverStoreID: (input.vendor.receiverStoreId ?? "").slice(0, 6),
  };

  if (isCollection === "Y") {
    fields.CollectionAmount = String(goodsAmount);
  }

  const phone = input.recipient.phone?.trim();
  if (phone) fields.ReceiverPhone = phone.slice(0, 20);

  const email = input.recipient.email?.trim();
  if (email) fields.ReceiverEmail = email.slice(0, 50);

  return fields;
}

export function buildHomeCreateFormFields(
  cfg: EcpayLogisticsConfig,
  input: {
    merchantTradeNo: string;
    serverReplyUrl: string;
    recipient: LogisticsCreateRecipient & {
      zipCode: string;
      address: string;
    };
    vendor: LogisticsCreateVendorContext;
  },
): Record<string, string> {
  const goodsAmount = Math.max(1, Math.round(input.vendor.itemsSubtotal));
  const fields: Record<string, string> = {
    MerchantID: cfg.merchantId,
    MerchantTradeNo: input.merchantTradeNo,
    MerchantTradeDate: formatMerchantTradeDateTaipei(),
    LogisticsType: "HOME",
    LogisticsSubType: input.vendor.logisticsSubType,
    GoodsAmount: String(goodsAmount),
    IsCollection: "N",
    GoodsName: sanitizeLogisticsGoodsName(input.vendor.vendorName),
    SenderName: cfg.senderName.slice(0, 10),
    SenderZipCode: cfg.senderZipCode.slice(0, 6),
    SenderAddress: cfg.senderAddress.slice(0, 60),
    ReceiverName: input.recipient.name.slice(0, 10),
    ReceiverZipCode: input.recipient.zipCode.slice(0, 6),
    ReceiverAddress: input.recipient.address.slice(0, 60),
    ReceiverCellPhone: input.recipient.cellPhone.slice(0, 10),
    ServerReplyURL: input.serverReplyUrl,
    Temperature: "0001",
    Specification: "0001",
    ScheduledPickupTime: "4",
    ScheduledDeliveryTime: "4",
    Distance: "00",
  };

  if (cfg.senderPhone.trim()) {
    fields.SenderPhone = cfg.senderPhone.trim().slice(0, 20);
  } else {
    fields.SenderCellPhone = cfg.senderCellPhone.slice(0, 20);
  }

  const phone = input.recipient.phone?.trim();
  if (phone) fields.ReceiverPhone = phone.slice(0, 20);

  const email = input.recipient.email?.trim();
  if (email) fields.ReceiverEmail = email.slice(0, 50);

  return fields;
}

export async function postLogisticsV1Form(
  url: string,
  fields: Record<string, string>,
): Promise<string> {
  const body = new URLSearchParams(fields).toString();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html",
    },
    body,
  });
  return await res.text();
}

export interface V1PipeParseResult {
  ok: boolean;
  errorMessage: string;
  params: Record<string, string>;
}

/** 幕後回應：1|k=v&... 或 0|ErrorMessage */
export function parseV1PipeResponse(text: string): V1PipeParseResult {
  const trimmed = text.trim();
  const pipeIdx = trimmed.indexOf("|");
  if (pipeIdx < 0) {
    return { ok: false, errorMessage: trimmed.slice(0, 200), params: {} };
  }

  const flag = trimmed.slice(0, pipeIdx).trim();
  const rest = trimmed.slice(pipeIdx + 1).trim();

  if (flag !== "1") {
    return { ok: false, errorMessage: rest || "綠界物流 API 失敗", params: {} };
  }

  const params: Record<string, string> = {};
  if (rest.includes("=")) {
    const qs = new URLSearchParams(rest);
    qs.forEach((v, k) => {
      params[k] = v;
    });
  }

  return { ok: true, errorMessage: "", params };
}

export function parseV1QueryResponse(text: string): Record<string, string> {
  const trimmed = text.trim();
  if (trimmed.includes("|")) {
    const parsed = parseV1PipeResponse(trimmed);
    return parsed.params;
  }
  const params: Record<string, string> = {};
  new URLSearchParams(trimmed).forEach((v, k) => {
    params[k] = v;
  });
  return params;
}

export async function queryLogisticsV5(
  cfg: EcpayLogisticsConfig,
  input: { merchantTradeNo?: string; allPayLogisticsId?: string },
): Promise<Record<string, string>> {
  const urls = logisticsV1Urls(cfg.host);
  const fields: Record<string, string> = {
    MerchantID: cfg.merchantId,
    TimeStamp: String(Math.floor(Date.now() / 1000)),
  };

  if (input.allPayLogisticsId) {
    fields.AllPayLogisticsID = input.allPayLogisticsId;
  } else if (input.merchantTradeNo) {
    fields.MerchantTradeNo = input.merchantTradeNo;
  } else {
    throw new Error("queryLogisticsV5 requires merchantTradeNo or allPayLogisticsId");
  }

  const signed = appendCheckMac(fields, cfg.hashKey, cfg.hashIv);
  const text = await postLogisticsV1Form(urls.queryV5, signed);
  const params = parseV1QueryResponse(text);

  const mac = params.CheckMacValue ?? "";
  if (mac) {
    const copy = { ...params };
    delete copy.CheckMacValue;
    const expected = generateEcpayLogisticsCheckMacValue(
      copy,
      cfg.hashKey,
      cfg.hashIv,
    );
    if (mac !== expected) {
      console.error("[queryLogisticsV5] CheckMac mismatch");
    }
  }

  return params;
}

export async function createLogisticsOrderV1(
  cfg: EcpayLogisticsConfig,
  fields: Record<string, string>,
): Promise<{
  ok: boolean;
  errorMessage: string;
  params: Record<string, string>;
  queryParams?: Record<string, string>;
}> {
  const urls = logisticsV1Urls(cfg.host);
  const signed = appendCheckMac(fields, cfg.hashKey, cfg.hashIv);
  const text = await postLogisticsV1Form(urls.create, signed);
  const parsed = parseV1PipeResponse(text);

  if (!parsed.ok) {
    return { ok: false, errorMessage: parsed.errorMessage, params: parsed.params };
  }

  const rtnCode = Number(parsed.params.RtnCode ?? "");
  if (Number.isFinite(rtnCode) && rtnCode !== 1 && rtnCode !== 300) {
    return {
      ok: false,
      errorMessage: parsed.params.RtnMsg ?? `RtnCode=${rtnCode}`,
      params: parsed.params,
    };
  }

  const logisticsId = parsed.params.AllPayLogisticsID ?? "";
  let queryParams: Record<string, string> | undefined;
  if (logisticsId || fields.MerchantTradeNo) {
    try {
      queryParams = await queryLogisticsV5(cfg, {
        allPayLogisticsId: logisticsId || undefined,
        merchantTradeNo: logisticsId ? undefined : fields.MerchantTradeNo,
      });
    } catch (e) {
      console.error(
        "[createLogisticsOrderV1] query after create:",
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  return {
    ok: true,
    errorMessage: "",
    params: parsed.params,
    queryParams,
  };
}

export function pickLogisticsId(
  createParams: Record<string, string>,
  queryParams?: Record<string, string>,
): string {
  const fromCreate = (createParams.AllPayLogisticsID ?? "").trim();
  if (fromCreate.length > 0) return fromCreate;
  const fromQuery = (queryParams?.AllPayLogisticsID ?? "").trim();
  if (fromQuery.length > 0) return fromQuery;
  return (createParams.MerchantTradeNo ?? "").trim();
}
