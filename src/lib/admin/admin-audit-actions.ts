/**
 * 後台稽核 RPC `admin_append_audit_log` 的 action 字面量（對齊 staff 權限語意）。
 */
export const ADMIN_AUDIT_ACTIONS = {
  ORDER_STATUS_CHANGE: 'order.status_change',
  SUB_ORDER_LOGISTICS_UPDATE: 'sub_order.logistics_update',
  PRODUCT_SAVE: 'product.save',
  PRODUCT_DELETE: 'product.delete',
  PRODUCT_IMAGE_UPDATE: 'product.image_update',
  BRAND_SAVE: 'brand.save',
  VENDOR_SAVE: 'vendor.save',
  ANNOUNCEMENT_SAVE: 'announcement.save',
  ANNOUNCEMENT_DELETE: 'announcement.delete',
  ADMIN_ROLE_ASSIGN: 'admin.role_assign',
  USER_SUSPEND: 'user.suspend',
  PROMO_CAMPAIGN_SAVE: 'promo.campaign_save',
  PROMO_CODE_SAVE: 'promo.code_save',
  SHOP_POINTS_ADJUST: 'shop_points.adjust',
  SHOP_HOME_BANNER_SAVE: 'shop.home_banner_save',
  SHOP_HOME_BANNER_DELETE: 'shop.home_banner_delete',
  SHOP_CATEGORY_BANNER_SAVE: 'shop.category_banner_save',
  SHOP_CATEGORY_BANNER_DELETE: 'shop.category_banner_delete',
  SHOP_CATEGORY_SAVE: 'shop.category_save',
  SHOP_CATEGORY_DELETE: 'shop.category_delete',
  VENDOR_SHIPPING_METHOD_SAVE: 'vendor.shipping_method_save',
} as const;

export type AdminAuditAction =
  (typeof ADMIN_AUDIT_ACTIONS)[keyof typeof ADMIN_AUDIT_ACTIONS];

export const ADMIN_AUDIT_TARGET_TYPES = {
  ORDER: 'order',
  SUB_ORDER: 'sub_order',
  PRODUCT: 'product',
  BRAND: 'brand',
  VENDOR: 'vendor',
  ANNOUNCEMENT: 'announcement',
  USER: 'user',
  PROMO_CAMPAIGN: 'promo_campaign',
  PROMO_CODE: 'promo_code',
  SHOP_HOME_BANNER: 'shop_home_banner',
  SHOP_CATEGORY_BANNER: 'shop_category_banner',
  SHOP_CATEGORY: 'shop_category',
  VENDOR_SHIPPING_METHOD: 'vendor_shipping_method',
} as const;
