import { redirect } from 'next/navigation';

import { ShopBannerForm } from '@/app/admin/shop/_components/shop-banner-form';
import { adminHomeForRole } from '@/lib/admin/admin-home';
import { getAdminRole, staffCan } from '@/lib/admin';

export default async function AdminNewHomeBannerPage() {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    redirect(adminHomeForRole(role ?? 'cs'));
  }

  return <ShopBannerForm kind="home" allowDelete={false} />;
}
