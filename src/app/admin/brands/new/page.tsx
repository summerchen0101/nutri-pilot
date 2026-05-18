import { BrandForm } from '@/app/admin/brands/_components/brand-form';
import { createClient } from '@/lib/supabase/server';

export default async function AdminNewBrandPage() {
  const supabase = createClient();
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('id, name')
    .order('name');

  if (error) {
    throw new Error(error.message);
  }

  if (!vendors?.length) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-body text-amber-950">
        尚無廠商資料，請先在資料庫建立{' '}
        <code className="font-mono text-caption">vendors</code>（或由 super_admin 於 Supabase
        後台插入），才能新增品牌。
      </div>
    );
  }

  return <BrandForm vendors={vendors ?? []} initial={null} />;
}
