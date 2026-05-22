import { notFound, redirect } from 'next/navigation';

import { ShopBannerForm } from '@/app/admin/shop/_components/shop-banner-form';
import { adminHomeForRole } from '@/lib/admin/admin-home';
import { getAdminRole, staffCan } from '@/lib/admin';
import { getAllShopCategoriesForAdmin } from '@/lib/shop/get-shop-categories';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: { id: string };
}

export default async function AdminEditCategoryBannerPage({ params }: PageProps) {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    redirect(adminHomeForRole(role ?? 'cs'));
  }

  const supabase = createClient();
  const [{ data, error }, categories] = await Promise.all([
    supabase
      .from('shop_category_banners')
      .select(
        'id, category_slug, title, subtitle, image_url, href, sort_order, is_active',
      )
      .eq('id', params.id)
      .maybeSingle(),
    getAllShopCategoriesForAdmin(supabase),
  ]);

  if (error) throw new Error(error.message);
  if (!data) notFound();

  return (
    <ShopBannerForm
      kind="category"
      allowDelete={staffCan(role, 'shop.delete')}
      categoryOptions={categories.map((c) => ({
        slug: c.slug,
        label: c.label,
      }))}
      initial={data}
    />
  );
}
