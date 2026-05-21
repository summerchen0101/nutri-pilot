export interface LineInput {
  variantId: string;
  qty: number;
}

export interface CheckoutBody {
  items?: LineInput[];
  /** 本次結帳僅此一廠商 */
  checkoutVendorId?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddressFull?: string;
  saveShippingToProfile?: boolean;
  vendorShippingSelections?: Record<string, string>;
  /** 宅配結帳頁選擇 TCAT | POST */
  homeLogisticsSubType?: string;
  /** 是否折抵購物點（1 點 = 1 元） */
  applyShopPoints?: boolean;
}

export interface VendorShippingMethodRow {
  id: string;
  vendor_id: string;
  code: string;
  label: string;
  shipping_fee: number | string | null;
  free_shipping_threshold: number | string | null;
  sort_order: number | string | null;
}

export interface VendorRow {
  id: string;
  name: string;
  shipping_fee: number | string | null;
  free_shipping_threshold: number | string | null;
  lead_time_days: number | null;
  is_active: boolean | null;
}

export interface VariantRow {
  id: string;
  product_id: string;
  label: string;
  price: number | string;
  stock: number | null;
  product: {
    id: string;
    is_active: boolean | null;
    name: string | null;
    brand: {
      vendor_id: string | null;
      vendor: VendorRow | VendorRow[] | null;
    } | null;
  } | null;
}

export interface LogisticsDraft {
  logisticsType: "CVS" | "HOME";
  logisticsSubType: string;
  completed: boolean;
  merchantLogisticsTradeNo?: string | null;
  storeSelected?: boolean;
  logisticsCreated?: boolean;
  isCollection?: "Y" | "N";
  cvsStoreId?: string | null;
  cvsStoreName?: string | null;
  cvsStoreAddress?: string | null;
  shippingAddress?: string | null;
  ecpayLogisticsTradeNo?: string | null;
  /** @deprecated V2 暫存單；V1 不再使用 */
  tempLogisticsId?: string | null;
  meta?: Record<string, unknown>;
}

export interface CheckoutVendorSnapshot {
  vendorId: string;
  vendorName: string;
  itemsSubtotal: number;
  shippingFee: number;
  effectiveShipping: number;
  freeShippingThreshold: number | null;
  lines: { variantId: string; qty: number; unitPrice: number }[];
  shippingMethodId?: string | null;
  shippingMethodLabel?: string | null;
  shippingMethodCode?: string | null;
}

export interface CheckoutSnapshot {
  vendors: CheckoutVendorSnapshot[];
  itemsSubtotal: number;
  shippingTotal: number;
  /** 綠界 AIO 應收金額（排除超商到付商品小計，並扣除點數折抵） */
  paymentTotal?: number;
  /** 本單折抵購物點數（1 點 = 1 元） */
  pointsRedeemed?: number;
  logisticsByVendor: Record<string, LogisticsDraft | null>;
  logisticsCompleted: boolean;
}

export interface LogisticsQueueItem {
  vendorId: string;
  vendorName: string;
  logisticsType: "CVS" | "HOME";
  logisticsSubType: string;
}
