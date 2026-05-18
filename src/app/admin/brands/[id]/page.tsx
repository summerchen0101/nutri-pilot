import { notFound } from 'next/navigation';

import { BrandForm } from '@/app/admin/brands/_components/brand-form';
import { createClient } from '@/lib/supabase/server';

export default async function AdminEditBrandPage({
  params,
}: Readonly<{ params: { id: string } }>) {
  const supabase = createClient();
  const [{ data: brand, error: bErr }, { data: vendors, error: vErr }] =
    await Promise.all([
      supabase
        .from('brands')
        .select(
          'id, name, slug, vendor_id, is_active, description, country',
        )
        .eq('id', params.id)
        .maybeSingle(),
      supabase.from('vendors').select('id, name').order('name'),
    ]);

  if (bErr) {
    throw new Error(bErr.message);
  }
  if (vErr) {
    throw new Error(vErr.message);
  }

  if (!brand) {
    notFound();
  }

  return (
    <BrandForm
      vendors={vendors ?? []}
      initial={{
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        vendor_id: brand.vendor_id,
        is_active: brand.is_active,
        description: brand.description,
        country: brand.country,
      }}
    />
  );
}
