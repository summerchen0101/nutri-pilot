import type { AdminRole } from './get-role';

type StaffAction =
  | 'product.delete'
  | 'order.refund'
  | 'user.suspend'
  | 'analytics.finance'
  | 'product.edit'
  | 'order.ship'
  | 'brand.manage'
  | 'vendor.write';

const PERMISSIONS: Record<StaffAction, AdminRole[]> = {
  'product.delete': ['super_admin'],
  'order.refund': ['super_admin'],
  'user.suspend': ['super_admin'],
  'analytics.finance': ['super_admin'],
  'product.edit': ['super_admin', 'editor'],
  'order.ship': ['super_admin', 'cs'],
  'brand.manage': ['super_admin', 'editor'],
  'vendor.write': ['super_admin'],
};

export function staffCan(role: AdminRole, action: StaffAction): boolean {
  return PERMISSIONS[action]?.includes(role) ?? false;
}
