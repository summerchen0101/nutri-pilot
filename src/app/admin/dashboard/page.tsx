import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buttonVisualClassName } from '@/components/ui/button-visual';
import { getAdminRole } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboardPage() {
  const role = await getAdminRole();
  if (role === 'cs') {
    redirect('/admin/orders');
  }

  const supabase = createClient();

  const { count: productCount, error: pErr } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true });

  if (pErr) {
    throw new Error(pErr.message);
  }

  let paidOrders = 0;
  let paidGmv = 0;

  if (role === 'super_admin') {
    const { data: orders, error: oErr } = await supabase
      .from('orders')
      .select('total')
      .eq('status', 'paid');

    if (oErr) {
      throw new Error(oErr.message);
    }

    paidOrders = orders?.length ?? 0;
    paidGmv =
      orders?.reduce((sum, o) => sum + Number(o.total ?? 0), 0) ?? 0;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-heading-screen text-foreground">總覽</h1>
        <p className="mt-1 text-body text-slate-600">
          {role === 'super_admin'
            ? '含付款訂單彙總（GMV 僅統計 status=paid）。'
            : '編輯者可檢視商品量與捷徑。'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-caption text-slate-600">商品數</p>
          <p className="mt-1 text-heading-page text-foreground">
            {productCount ?? 0}
          </p>
          <Link
            href="/admin/products"
            className={buttonVisualClassName({
              variant: 'outline',
              size: 'sm',
              className: 'mt-3',
            })}
          >
            管理商品
          </Link>
        </div>

        {role === 'super_admin' ? (
          <>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-caption text-slate-600">已付款訂單數</p>
              <p className="mt-1 text-heading-page text-foreground">
                {paidOrders}
              </p>
              <Link
                href="/admin/orders"
                className={buttonVisualClassName({
                  variant: 'outline',
                  size: 'sm',
                  className: 'mt-3',
                })}
              >
                查看訂單
              </Link>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-caption text-slate-600">已付款 GMV（paid）</p>
              <p className="mt-1 text-heading-page text-foreground">
                NT${' '}
                {paidGmv.toLocaleString('zh-TW', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
