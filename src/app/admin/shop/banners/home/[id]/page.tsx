import { notFound, redirect } from 'next/navigation';

import { ShopBannerForm } from '@/app/admin/shop/_components/shop-banner-form';
import { adminHomeForRole } from '@/lib/admin/admin-home';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: { id: string };
}

export default async function AdminEditHomeBannerPage({ params }: PageProps) {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    redirect(adminHomeForRole(role ?? 'cs'));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('shop_home_banners')
    .select('id, title, subtitle, image_url, href, sort_order, is_active')
    .eq('id', params.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  return (
    <ShopBannerForm
      kind="home"
      allowDelete={staffCan(role, 'shop.delete')}
      initial={data}
    />
  );
}
