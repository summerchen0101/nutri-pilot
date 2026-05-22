import { redirect } from 'next/navigation';

import { ShopBannerForm } from '@/app/admin/shop/_components/shop-banner-form';
import { adminHomeForRole } from '@/lib/admin/admin-home';
import { getAdminRole, staffCan } from '@/lib/admin';
import { getAllShopCategoriesForAdmin } from '@/lib/shop/get-shop-categories';
import { createClient } from '@/lib/supabase/server';

export default async function AdminNewCategoryBannerPage() {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    redirect(adminHomeForRole(role ?? 'cs'));
  }

  const supabase = createClient();
  const categories = await getAllShopCategoriesForAdmin(supabase);

  return (
    <ShopBannerForm
      kind="category"
      allowDelete={false}
      categoryOptions={categories.map((c) => ({
        slug: c.slug,
        label: c.label,
      }))}
    />
  );
}
