import { ProductEditor } from '@/app/admin/products/_components/product-editor';
import { createClient } from '@/lib/supabase/server';

export default async function AdminNewProductPage() {
  const supabase = createClient();
  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, name')
    .order('name');

  if (error) {
    throw new Error(error.message);
  }

  if (!brands?.length) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-body text-amber-950">
        尚無品牌資料，請先到「品牌」新增品牌後再建立商品。
      </div>
    );
  }

  return (
    <ProductEditor brands={brands ?? []} initial={null} canDelete={false} />
  );
}
