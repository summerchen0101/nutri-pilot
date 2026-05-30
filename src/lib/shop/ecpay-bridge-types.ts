export type EcpayCheckoutBridgeDebug = {
  merchantId: string;
  orderResultUrl: string;
  checkMacSelfOk: boolean;
};

export type EcpayBridgePayloadResult =
  | {
    ok: true;
    action: string;
    fields: Record<string, string>;
    debug?: EcpayCheckoutBridgeDebug;
  }
  | { ok: true; redirectUrl: string }
  | { ok: true; skipMap: true }
  | { ok: true; skipPayment: true; orderId: string }
  | { ok: false; error: string };

/** 可提交至綠界的 bridge（排除 skipMap / skipPayment） */
export type EcpaySubmitBridgePayload = Extract<
  EcpayBridgePayloadResult,
  { ok: true }
> extends infer T
  ? Exclude<T, { skipMap: true } | { skipPayment: true }>
  : never;
