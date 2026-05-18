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
  ANNOUNCEMENT_SAVE: 'announcement.save',
  ANNOUNCEMENT_DELETE: 'announcement.delete',
  ADMIN_ROLE_ASSIGN: 'admin.role_assign',
  USER_SUSPEND: 'user.suspend',
  PROMO_CAMPAIGN_SAVE: 'promo.campaign_save',
  PROMO_CODE_SAVE: 'promo.code_save',
  SHOP_POINTS_ADJUST: 'shop_points.adjust',
} as const;

export type AdminAuditAction =
  (typeof ADMIN_AUDIT_ACTIONS)[keyof typeof ADMIN_AUDIT_ACTIONS];

export const ADMIN_AUDIT_TARGET_TYPES = {
  ORDER: 'order',
  SUB_ORDER: 'sub_order',
  PRODUCT: 'product',
  BRAND: 'brand',
  ANNOUNCEMENT: 'announcement',
  USER: 'user',
  PROMO_CAMPAIGN: 'promo_campaign',
  PROMO_CODE: 'promo_code',
} as const;
