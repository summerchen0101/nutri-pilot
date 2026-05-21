import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FiChevronLeft } from 'react-icons/fi';

import { OrderListItemCard } from '@/app/(main)/settings/orders/_components/order-list-item-card';
import { HEADER_LEADING_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { getCachedAuthContext } from '@/lib/auth';
import {
  buildMemberOrderPaymentBreakdown,
  parseMemberOrderBreakdownItems,
} from '@/lib/shop/build-member-order-payment-breakdown';
import { canContinueOrderPayment } from '@/lib/shop/can-continue-order-payment';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';

function formatDt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function SettingsOrdersPage() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const { data: rows, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      status,
      total,
      created_at,
      checkout_snapshot,
      items:order_items(
        id,
        qty,
        unit_price,
        variant_id,
        vendor_id,
        variant:product_variants(
          label,
          product:products(name, image_url)
        ),
        vendor:vendors(name)
      )
    `,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  const list = rows ?? [];

  return (
    <div className="space-y-4 pb-6">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        title="我的訂單"
        leading={
          <Link
            href="/shop/settings"
            aria-label="返回商城設定"
            className={HEADER_LEADING_ICON_CLASS}
          >
            <FiChevronLeft className="h-[18px] w-[18px]" aria-hidden />
          </Link>
        }
        spacing="compact"
      />
      <p className="text-caption leading-relaxed text-muted-foreground">
        訂單成立與付款通知以系統紀錄為準；物流進度依各子訂單更新。
      </p>
      {list.length === 0 ?
        <div className="rounded-xl border-hairline border-border bg-card p-6 text-center text-body text-muted-foreground">
          尚無訂單
        </div>
      : <ul className="space-y-2">
          {list.map((row) => {
            const items = parseMemberOrderBreakdownItems(
              Array.isArray(row.items) ? row.items : [],
            );
            const breakdown = buildMemberOrderPaymentBreakdown({
              checkoutSnapshot: row.checkout_snapshot,
              items,
              orderTotal: Number(row.total),
            });

            return (
              <li key={row.id}>
                <OrderListItemCard
                  orderId={row.id}
                  createdAtLabel={formatDt(row.created_at)}
                  status={row.status}
                  breakdown={breakdown}
                  showContinuePayment={canContinueOrderPayment(
                    row.status,
                    row.checkout_snapshot,
                  )}
                />
              </li>
            );
          })}
        </ul>
      }
    </div>
  );
}
