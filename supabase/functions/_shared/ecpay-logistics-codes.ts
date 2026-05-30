export type EcpayLogisticsType = "CVS" | "HOME";

export interface EcpayLogisticsMapping {
  logisticsType: EcpayLogisticsType;
  logisticsSubType: string;
}

const CVS_CODE_MAP: Record<string, string> = {
  seven_eleven_pickup: "UNIMARTC2C",
  seven_eleven_cod: "UNIMARTC2C",
  family_mart_pickup: "FAMIC2C",
  family_mart_cod: "FAMIC2C",
  hilife_pickup: "HILIFEC2C",
  ok_mart_pickup: "OKMARTC2C",
};

const CVS_C2C_SUBTYPES = new Set([
  "UNIMARTC2C",
  "FAMIC2C",
  "HILIFEC2C",
  "OKMARTC2C",
  "UNIMARTFREEZE",
]);

const CVS_B2C_SUBTYPES = new Set(["UNIMART", "FAMI", "HILIFE"]);

const TEST_C2C_MERCHANT_ID = "2000933";
const TEST_B2C_MERCHANT_ID = "2000132";

export function resolveLogisticsFromVendorCode(
  vendorShippingCode: string | null | undefined,
): EcpayLogisticsMapping | null {
  if (!vendorShippingCode) return null;
  const code = String(vendorShippingCode);
  if (code === "home_delivery") {
    const homeSub = Deno.env.get("ECPAY_HOME_LOGISTICS_SUBTYPE")?.trim() ||
      "TCAT";
    return { logisticsType: "HOME", logisticsSubType: homeSub };
  }
  const sub = CVS_CODE_MAP[code];
  if (sub) {
    return { logisticsType: "CVS", logisticsSubType: sub };
  }
  if (code.includes("family")) {
    return { logisticsType: "CVS", logisticsSubType: "FAMIC2C" };
  }
  if (code.includes("seven") || code.includes("711")) {
    return { logisticsType: "CVS", logisticsSubType: "UNIMARTC2C" };
  }
  return { logisticsType: "CVS", logisticsSubType: "UNIMARTC2C" };
}

/** 門市地圖：MerchantID 與 LogisticsSubType（B2C/C2C）須一致，否則綠界回 0|LogisticsType Is Not Match. */
export function validateCvsMapMerchantSubtype(
  merchantId: string,
  logisticsSubType: string,
  stage: boolean,
): string | null {
  const sub = logisticsSubType.trim();
  if (!sub) {
    return "缺少 LogisticsSubType";
  }

  const isC2cSub = CVS_C2C_SUBTYPES.has(sub);
  const isB2cSub = CVS_B2C_SUBTYPES.has(sub);
  if (!isC2cSub && !isB2cSub) {
    return `不支援的超商子類型：${sub}`;
  }

  if (stage) {
    if (merchantId === TEST_C2C_MERCHANT_ID && !isC2cSub) {
      return `測試 C2C MerchantID（${merchantId}）不可搭配 ${sub}，請改用 UNIMARTC2C／FAMIC2C 等 C2C 子類型，或設定 ECPAY_LOGISTICS_MERCHANT_ID=2000933`;
    }
    if (merchantId === TEST_B2C_MERCHANT_ID && !isB2cSub) {
      return `測試 B2C MerchantID（${merchantId}）不可搭配 ${sub}，請設定 ECPAY_LOGISTICS_MERCHANT_ID=2000933（C2C）`;
    }
    return null;
  }

  if (isC2cSub && merchantId === TEST_B2C_MERCHANT_ID) {
    return "正式環境請使用 C2C 物流 MerchantID，不可沿用 B2C 金流編號 2000132";
  }

  return null;
}

export function logisticsSubtypeDisplayLabel(subtype: string): string {
  const map: Record<string, string> = {
    UNIMARTC2C: "7-ELEVEN",
    FAMIC2C: "全家",
    HILIFEC2C: "萊爾富",
    OKMARTC2C: "OK Mart",
    UNIMARTFREEZE: "7-ELEVEN 冷凍",
    TCAT: "黑貓宅配",
    POST: "郵局宅配",
  };
  return map[subtype] ?? subtype;
}

const PRINT_SUPPORTED_SUBTYPES = new Set([
  "UNIMARTC2C",
  "FAMIC2C",
  "HILIFEC2C",
  "OKMARTC2C",
  "UNIMARTFREEZE",
  "TCAT",
  "POST",
]);

export function isLogisticsPrintSupported(subtype: string | null | undefined): boolean {
  if (!subtype) return false;
  return PRINT_SUPPORTED_SUBTYPES.has(subtype);
}

export function printEndpointForSubtype(
  subtype: string,
  stage: boolean,
): string | null {
  const host = stage ?
    "https://logistics-stage.ecpay.com.tw"
    : "https://logistics.ecpay.com.tw";
  switch (subtype) {
    case "UNIMARTC2C":
    case "UNIMARTFREEZE":
      return `${host}/Express/PrintUniMartC2COrderInfo`;
    case "FAMIC2C":
      return `${host}/Express/PrintFAMIC2COrderInfo`;
    case "OKMARTC2C":
      return `${host}/Express/PrintOKMARTC2COrderInfo`;
    default:
      return null;
  }
}
