import { redirect } from 'next/navigation';

import { ShopCategoryForm } from '@/app/admin/shop/_components/shop-category-form';
import { adminHomeForRole } from '@/lib/admin/admin-home';
import { getAdminRole, staffCan } from '@/lib/admin';

export default async function AdminNewShopCategoryPage() {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    redirect(adminHomeForRole(role ?? 'cs'));
  }

  return <ShopCategoryForm allowDelete={false} />;
}
