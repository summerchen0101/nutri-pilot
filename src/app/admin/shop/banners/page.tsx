import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  adminListTableThClassName,
  adminListTableTheadClassName,
} from '@/app/admin/_lib/admin-list-table-classes';
import { buttonVisualClassName } from '@/components/ui/button-visual';
import { adminHomeForRole } from '@/lib/admin/admin-home';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export default async function AdminShopBannersPage() {
  const role = await getAdminRole();
  if (!role || !staffCan(role, 'shop.manage')) {
    redirect(adminHomeForRole(role ?? 'cs'));
  }

  const supabase = createClient();
  const [{ data: homeRows, error: homeErr }, { data: catRows, error: catErr }] =
    await Promise.all([
      supabase
        .from('shop_home_banners')
        .select('id, title, sort_order, is_active')
        .order('sort_order', { ascending: true }),
      supabase
        .from('shop_category_banners')
        .select('id, title, category_slug, sort_order, is_active')
        .order('category_slug')
        .order('sort_order', { ascending: true }),
    ]);

  if (homeErr) throw new Error(homeErr.message);
  if (catErr) throw new Error(catErr.message);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/shop" className="text-caption text-primary hover:underline">
            商城設定
          </Link>
          <h1 className="mt-1 text-heading-screen text-foreground">Banner</h1>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-heading-section text-foreground">首頁輪播</h2>
          <Link
            href="/admin/shop/banners/home/new"
            className={buttonVisualClassName({ variant: 'default', size: 'sm' })}
          >
            新增首頁 Banner
          </Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[480px] text-left text-body">
            <thead className={adminListTableTheadClassName}>
              <tr>
                <th className={adminListTableThClassName}>標題</th>
                <th className={adminListTableThClassName}>排序</th>
                <th className={adminListTableThClassName}>狀態</th>
                <th className={adminListTableThClassName} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(homeRows ?? []).map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3 text-caption">{row.sort_order}</td>
                  <td className="px-4 py-3">
                    {row.is_active ?
                      <span className="rounded-full bg-[#E8F5EE] px-2 py-0.5 text-caption font-medium text-[#2D6B4A]">
                        啟用
                      </span>
                    : <span className="text-caption text-slate-600">停用</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/shop/banners/home/${row.id}`}
                      className="text-caption text-primary hover:underline"
                    >
                      編輯
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-heading-section text-foreground">分類 Banner</h2>
          <Link
            href="/admin/shop/banners/category/new"
            className={buttonVisualClassName({ variant: 'outline', size: 'sm' })}
          >
            新增分類 Banner
          </Link>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[520px] text-left text-body">
            <thead className={adminListTableTheadClassName}>
              <tr>
                <th className={adminListTableThClassName}>分類</th>
                <th className={adminListTableThClassName}>標題</th>
                <th className={adminListTableThClassName}>排序</th>
                <th className={adminListTableThClassName}>狀態</th>
                <th className={adminListTableThClassName} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(catRows ?? []).map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-caption">{row.category_slug}</td>
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3 text-caption">{row.sort_order}</td>
                  <td className="px-4 py-3">
                    {row.is_active ?
                      <span className="rounded-full bg-[#E8F5EE] px-2 py-0.5 text-caption font-medium text-[#2D6B4A]">
                        啟用
                      </span>
                    : <span className="text-caption text-slate-600">停用</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/shop/banners/category/${row.id}`}
                      className="text-caption text-primary hover:underline"
                    >
                      編輯
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
