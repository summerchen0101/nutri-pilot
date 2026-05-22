import { notFound } from 'next/navigation';

import { VendorForm } from '@/app/admin/vendors/_components/vendor-form';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  params: { id: string };
}

export default async function AdminVendorEditPage({ params }: PageProps) {
  const supabase = createClient();
  const role = await getAdminRole();
  const canEdit = staffCan(role, 'vendor.write');

  const { data: vendor, error } = await supabase
    .from('vendors')
    .select(
      'id, name, slug, description, banner_url, logo_url, shipping_fee, free_shipping_threshold, lead_time_days, is_active',
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!vendor) notFound();

  return (
    <VendorForm
      canEdit={canEdit}
      initial={{
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
        description: vendor.description,
        banner_url: vendor.banner_url,
        logo_url: vendor.logo_url,
        shipping_fee: Number(vendor.shipping_fee),
        free_shipping_threshold:
          vendor.free_shipping_threshold == null ?
            null
          : Number(vendor.free_shipping_threshold),
        lead_time_days: Number(vendor.lead_time_days),
        is_active: vendor.is_active,
      }}
    />
  );
}
