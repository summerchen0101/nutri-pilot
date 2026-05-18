import Link from 'next/link';

import { buttonVisualClassName } from '@/components/ui/button-visual';
import { createClient } from '@/lib/supabase/server';

export default async function AdminBrandsPage() {
  const supabase = createClient();
  const { data: brands, error } = await supabase
    .from('brands')
    .select(
      `
      id,
      name,
      slug,
      is_active,
      vendor:vendors(name)
    `,
    )
    .order('name');

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-heading-screen text-foreground">品牌</h1>
        <Link
          href="/admin/brands/new"
          className={buttonVisualClassName({ variant: 'default' })}
        >
          新增品牌
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-left text-body">
          <thead className="border-b border-border bg-secondary/40 text-caption uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">名稱</th>
              <th className="px-4 py-3 font-medium">廠商</th>
              <th className="px-4 py-3 font-medium">狀態</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(brands ?? []).map((b) => {
              const vendorRaw = b.vendor as { name: string } | { name: string }[] | null;
              const vendorName = Array.isArray(vendorRaw)
                ? vendorRaw[0]?.name
                : vendorRaw?.name;
              return (
                <tr key={b.id}>
                  <td className="px-4 py-3">{b.name}</td>
                  <td className="px-4 py-3">{vendorName ?? '—'}</td>
                  <td className="px-4 py-3">
                    {b.is_active ? (
                      <span className="rounded-full bg-[#E8F5EE] px-2 py-0.5 text-caption font-medium text-[#2D6B4A]">
                        上架
                      </span>
                    ) : (
                      <span className="text-caption text-slate-600">下架</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/brands/${b.id}`}
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
