import { notFound } from 'next/navigation';

import { VendorForm } from '@/app/admin/vendors/_components/vendor-form';
import { VendorShippingMethodsEditor } from '@/app/admin/vendors/_components/vendor-shipping-methods-editor';
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

  const { data: shippingMethods, error: shipErr } = await supabase
    .from('vendor_shipping_methods')
    .select(
      'id, code, label, shipping_fee, free_shipping_threshold, is_active, sort_order',
    )
    .eq('vendor_id', params.id)
    .order('sort_order', { ascending: true });

  if (shipErr) throw new Error(shipErr.message);

  return (
    <div className="space-y-8">
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
    <VendorShippingMethodsEditor
      vendorId={vendor.id}
      canEdit={canEdit}
      initialMethods={(shippingMethods ?? []).map((m) => ({
        id: m.id,
        code: m.code,
        label: m.label,
        shipping_fee: Number(m.shipping_fee),
        free_shipping_threshold:
          m.free_shipping_threshold == null ?
            null
          : Number(m.free_shipping_threshold),
        is_active: m.is_active,
        sort_order: m.sort_order,
      }))}
    />
    </div>
  );
}
