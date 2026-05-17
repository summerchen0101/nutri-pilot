/** 對應表 `vendor_shipping_methods`，購車／結帳計算用最小型別 */
export interface VendorShippingMethodLite {
  id: string;
  vendor_id: string;
  code: string;
  label: string;
  shipping_fee: number;
  free_shipping_threshold: number | null;
  sort_order: number;
}
