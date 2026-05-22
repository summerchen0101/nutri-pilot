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
