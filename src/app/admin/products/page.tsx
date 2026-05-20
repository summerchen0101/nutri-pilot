import Link from 'next/link';

import {
  AdminProductsTable,
  type AdminProductListRow,
} from '@/app/admin/products/_components/admin-products-table';
import { buttonVisualClassName } from '@/components/ui/button-visual';
import { createClient } from '@/lib/supabase/server';

function resolveBrandName(
  brandRaw: { name: string } | { name: string }[] | null,
): string | null {
  if (Array.isArray(brandRaw)) {
    return brandRaw[0]?.name ?? null;
  }
  return brandRaw?.name ?? null;
}

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
      image_url,
      sort_order,
      created_at,
      brand:brands(name),
      variants:product_variants(id)
    `,
    )
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows: AdminProductListRow[] = (products ?? []).map((p) => {
    const variants = Array.isArray(p.variants) ? p.variants : [];
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      is_active: p.is_active,
      image_url: p.image_url,
      sort_order: p.sort_order ?? 0,
      brandName: resolveBrandName(
        p.brand as { name: string } | { name: string }[] | null,
      ),
      variantCount: variants.length,
    };
  });

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

      <AdminProductsTable initialRows={rows} />
    </div>
  );
}
