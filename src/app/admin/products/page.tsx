import Link from 'next/link';

import { buttonVisualClassName } from '@/components/ui/button-visual';
import { createClient } from '@/lib/supabase/server';

export default async function AdminProductsPage() {
  const supabase = createClient();
  const { data: products, error } = await supabase
    .from('products')
    .select(
      `
      id,
      name,
      slug,
      category,
      is_active,
      created_at,
      brand:brands(name),
      variants:product_variants(id)
    `,
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-heading-screen text-foreground">商品</h1>
        <Link
          href="/admin/products/new"
          className={buttonVisualClassName({ variant: 'default' })}
        >
          新增商品
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] text-left text-body">
          <thead className="border-b border-border bg-secondary/40 text-caption uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">名稱</th>
              <th className="px-4 py-3 font-medium">品牌</th>
              <th className="px-4 py-3 font-medium">分類</th>
              <th className="px-4 py-3 font-medium">規格數</th>
              <th className="px-4 py-3 font-medium">狀態</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(products ?? []).map((p) => {
              const brandRaw = p.brand as
                | { name: string }
                | { name: string }[]
                | null;
              const brandName = Array.isArray(brandRaw)
                ? brandRaw[0]?.name
                : brandRaw?.name;
              const variants = Array.isArray(p.variants) ? p.variants : [];
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">{brandName ?? '—'}</td>
                  <td className="px-4 py-3">{p.category}</td>
                  <td className="px-4 py-3">{variants.length}</td>
                  <td className="px-4 py-3">
                    {p.is_active ? (
                      <span className="rounded-full bg-[#E8F5EE] px-2 py-0.5 text-caption font-medium text-[#2D6B4A]">
                        上架
                      </span>
                    ) : (
                      <span className="text-caption text-slate-600">下架</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-[#4C956C] hover:underline"
                    >
                      編輯
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
