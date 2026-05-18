/**
 * 後台稽核 RPC `admin_append_audit_log` 的 action 字面量（對齊 staff 權限語意）。
 */
export const ADMIN_AUDIT_ACTIONS = {
  ORDER_STATUS_CHANGE: 'order.status_change',
  PRODUCT_SAVE: 'product.save',
  PRODUCT_DELETE: 'product.delete',
  PRODUCT_IMAGE_UPDATE: 'product.image_update',
  BRAND_SAVE: 'brand.save',
  ANNOUNCEMENT_SAVE: 'announcement.save',
  ANNOUNCEMENT_DELETE: 'announcement.delete',
  ADMIN_ROLE_ASSIGN: 'admin.role_assign',
  USER_SUSPEND: 'user.suspend',
} as const;

export type AdminAuditAction =
  (typeof ADMIN_AUDIT_ACTIONS)[keyof typeof ADMIN_AUDIT_ACTIONS];

export const ADMIN_AUDIT_TARGET_TYPES = {
  ORDER: 'order',
  PRODUCT: 'product',
  BRAND: 'brand',
  ANNOUNCEMENT: 'announcement',
  USER: 'user',
} as const;
