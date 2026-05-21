import { redirect, notFound } from 'next/navigation';

import { ContinueOrderPaymentButton } from '@/app/(main)/settings/orders/_components/continue-order-payment-button';
import {
  memberOrderStatusLabel,
  memberSubOrderStatusLabel,
} from '@/app/(main)/settings/_lib/member-order-status-label';
import { canContinueOrderPayment } from '@/lib/shop/can-continue-order-payment';
import { HeaderBackButton } from '@/components/layout/header-back-button';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { getCachedAuthContext } from '@/lib/auth';
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function SettingsOrderDetailPage({
  params,
}: Readonly<{ params: { orderId: string } }>) {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  if (!UUID_RE.test(params.orderId)) {
    notFound();
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      status,
      total,
      created_at,
      public_order_no,
      recipient_name,
      recipient_phone,
      recipient_address_full,
      items:order_items(
        id,
        qty,
        unit_price,
        variant:product_variants(
          label,
          product:products(name)
        )
      ),
      sub_orders:sub_orders(
        id,
        public_no,
        status,
        total,
        tracking_number,
        shipping_carrier,
        shipped_at
      )
    `,
    )
    .eq('id', params.orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!order) {
    notFound();
  }

  const itemsRaw = order.items;
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];

  const subRaw = order.sub_orders;
  const subOrders = Array.isArray(subRaw) ? subRaw : [];

  return (
    <div className="space-y-4 pb-6">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        title="訂單詳情"
        leading={<HeaderBackButton />}
        spacing="compact"
      />

      <section className="rounded-xl border-hairline border-border bg-card p-4">
        <h2 className="text-heading-section text-foreground">概要</h2>
        <dl className="mt-3 space-y-2 text-body">
          <div>
            <dt className="text-caption text-muted-foreground">訂單編號</dt>
            <dd className="font-mono text-caption">
              {order.public_order_no ?? order.id}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-muted-foreground">狀態</dt>
            <dd>{memberOrderStatusLabel(order.status)}</dd>
          </div>
          <div>
            <dt className="text-caption text-muted-foreground">建立時間</dt>
            <dd>{formatDt(order.created_at)}</dd>
          </div>
          <div>
            <dt className="text-caption text-muted-foreground">應付總額</dt>
            <dd className="text-heading-card text-foreground">
              NT${' '}
              {Number(order.total).toLocaleString('zh-TW', {
                minimumFractionDigits: 0,
              })}
            </dd>
          </div>
        </dl>
        {canContinueOrderPayment(order.status, order.checkout_snapshot) ?
          <div className="mt-4 border-t-hairline border-border pt-4">
            <ContinueOrderPaymentButton orderId={order.id} />
          </div>
        : null}
      </section>

      {(order.recipient_name || order.recipient_address_full) ? (
        <section className="rounded-xl border-hairline border-border bg-card p-4">
          <h2 className="text-heading-section text-foreground">收件資訊</h2>
          <dl className="mt-3 space-y-2 text-body">
            {order.recipient_name ? (
              <div>
                <dt className="text-caption text-muted-foreground">姓名</dt>
                <dd>{order.recipient_name}</dd>
              </div>
            ) : null}
            {order.recipient_phone ? (
              <div>
                <dt className="text-caption text-muted-foreground">電話</dt>
                <dd>{order.recipient_phone}</dd>
              </div>
            ) : null}
            {order.recipient_address_full ? (
              <div>
                <dt className="text-caption text-muted-foreground">地址</dt>
                <dd className="whitespace-pre-wrap">{order.recipient_address_full}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="rounded-xl border-hairline border-border bg-card p-4">
        <h2 className="text-heading-section text-foreground">商品</h2>
        <ul className="mt-3 divide-y divide-border">
          {items.map((line) => {
            const variant = line.variant as unknown as {
              label?: string;
              product?: { name: string } | { name: string }[] | null;
            } | null;
            const prod = variant?.product;
            const productName = Array.isArray(prod) ? prod[0]?.name : prod?.name;
            return (
              <li key={line.id} className="py-3 text-body">
                <span className="font-medium">
                  {productName ?? '商品'} — {variant?.label ?? '規格'}
                </span>
                <span className="text-caption text-muted-foreground">
                  {' '}
                  ×{line.qty}（單價{' '}
                  {Number(line.unit_price).toLocaleString('zh-TW')}）
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {subOrders.length > 0 ? (
        <section className="rounded-xl border-hairline border-border bg-card p-4">
          <h2 className="text-heading-section text-foreground">出貨／物流</h2>
          <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
            依廠商分成子訂單；宅配查貨請使用下列編號向物流業者查詢。
          </p>
          <ul className="mt-3 space-y-3">
            {subOrders.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border-hairline border-border bg-background p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-caption text-foreground">
                    {s.public_no}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-micro text-muted-foreground">
                    {memberSubOrderStatusLabel(s.status)}
                  </span>
                </div>
                <dl className="mt-2 space-y-1 text-caption">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">小計</dt>
                    <dd>
                      NT${' '}
                      {Number(s.total).toLocaleString('zh-TW', {
                        minimumFractionDigits: 0,
                      })}
                    </dd>
                  </div>
                  {s.shipping_carrier ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">物流商</dt>
                      <dd>{s.shipping_carrier}</dd>
                    </div>
                  ) : null}
                  {s.tracking_number ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">追蹤號碼</dt>
                      <dd className="break-all text-end">{s.tracking_number}</dd>
                    </div>
                  ) : (
                    <p className="text-neutral-text-tertiary">尚未提供追蹤號碼</p>
                  )}
                  {s.shipped_at ? (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">出貨時間</dt>
                      <dd>{formatDt(s.shipped_at)}</dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
