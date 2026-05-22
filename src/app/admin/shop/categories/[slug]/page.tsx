import { notFound, redirect } from 'next/navigation';

import { ShopCategoryForm } from '@/app/admin/shop/_components/shop-category-form';
import { adminHomeForRole } from '@/lib/admin/admin-home';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: { slug: string };
}

export default async function AdminEditShopCategoryPage({ params }: PageProps) {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    redirect(adminHomeForRole(role ?? 'cs'));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('shop_categories')
    .select('slug, label, sort_order, is_active, icon_key')
    .eq('slug', params.slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  return (
    <ShopCategoryForm
      allowDelete={staffCan(role, 'shop.delete')}
      initial={data}
    />
  );
}
