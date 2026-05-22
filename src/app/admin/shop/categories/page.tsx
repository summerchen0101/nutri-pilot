import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ShopCategoryListActions } from '@/app/admin/shop/categories/_components/shop-category-list-actions';
import {
  adminListTableThClassName,
  adminListTableTheadClassName,
} from '@/app/admin/_lib/admin-list-table-classes';
import { buttonVisualClassName } from '@/components/ui/button-visual';
import { adminHomeForRole } from '@/lib/admin/admin-home';
import { getAdminRole, staffCan } from '@/lib/admin';
import { getAllShopCategoriesForAdmin } from '@/lib/shop/get-shop-categories';
import { createClient } from '@/lib/supabase/server';

export default async function AdminShopCategoriesPage() {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    redirect(adminHomeForRole(role ?? 'cs'));
  }

  const supabase = createClient();
  const rows = await getAllShopCategoriesForAdmin(supabase);
  const canDelete = staffCan(role, 'shop.delete');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/shop" className="text-caption text-primary hover:underline">
            商城設定
          </Link>
          <h1 className="mt-1 text-heading-screen text-foreground">商品分類</h1>
        </div>
        <Link
          href="/admin/shop/categories/new"
          className={buttonVisualClassName({ variant: 'default' })}
        >
          新增分類
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-left text-body">
          <thead className={adminListTableTheadClassName}>
            <tr>
              <th className={adminListTableThClassName}>slug</th>
              <th className={adminListTableThClassName}>顯示名稱</th>
              <th className={adminListTableThClassName}>排序</th>
              <th className={adminListTableThClassName}>狀態</th>
              <th className={adminListTableThClassName} />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.slug}>
                <td className="px-4 py-3 font-mono text-caption">{row.slug}</td>
                <td className="px-4 py-3 font-medium">{row.label}</td>
                <td className="px-4 py-3 text-caption">{row.sort_order}</td>
                <td className="px-4 py-3">
                  {row.is_active ?
                    <span className="rounded-full bg-[#E8F5EE] px-2 py-0.5 text-caption font-medium text-[#2D6B4A]">
                      啟用
                    </span>
                  : <span className="text-caption text-slate-600">停用</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <ShopCategoryListActions
                    slug={row.slug}
                    label={row.label}
                    canDelete={canDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
