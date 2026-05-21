import { redirect, notFound } from 'next/navigation';

import { ContinueOrderPaymentButton } from '@/app/(main)/settings/orders/_components/continue-order-payment-button';
import { OrderDetailHeaderNav } from '@/app/(main)/settings/orders/_components/order-detail-header-nav';
import { OrderPaymentBreakdownCard } from '@/app/(main)/settings/orders/_components/order-payment-breakdown-card';
import {
  memberOrderStatusLabel,
  memberSubOrderStatusLabel,
} from '@/app/(main)/settings/_lib/member-order-status-label';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { getCachedAuthContext } from '@/lib/auth';
import { canContinueOrderPayment } from '@/lib/shop/can-continue-order-payment';
import { buildMemberOrderPaymentBreakdown, parseMemberOrderBreakdownItems } from '@/lib/shop/build-member-order-payment-breakdown';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';
import {
  buildMemberOrderFulfillmentRows,
  resolveMemberOrderPaymentLabel,
} from '@/lib/shop/member-order-detail-display';

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
      payment_gateway,
      order_metadata,
      checkout_snapshot,
      recipient_name,
      recipient_phone,
      recipient_address_full,
      items:order_items(
        id,
        qty,
        unit_price,
        variant_id,
        vendor_id,
        variant:product_variants(
          label,
          product:products(name, image_url)
        )
      ),
      sub_orders:sub_orders(
        id,
        vendor_id,
        public_no,
        status,
        total,
        tracking_number,
        shipping_carrier,
        shipped_at,
        logistics_type,
        logistics_subtype,
        cvs_store_id,
        cvs_store_name,
        cvs_store_address,
        shipping_address
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

  const paymentDisplay = resolveMemberOrderPaymentLabel({
    status: order.status,
    paymentGateway: order.payment_gateway,
    orderMetadata: order.order_metadata,
    checkoutSnapshot: order.checkout_snapshot,
  });

  const fulfillmentRows = buildMemberOrderFulfillmentRows({
    checkoutSnapshot: order.checkout_snapshot,
    subOrders,
    recipientAddressFull: order.recipient_address_full,
  });

  const hasRecipientInfo = Boolean(
    order.recipient_name?.trim() ||
      order.recipient_phone?.trim() ||
      order.recipient_address_full?.trim(),
  );

  const paymentBreakdown = buildMemberOrderPaymentBreakdown({
    checkoutSnapshot: order.checkout_snapshot,
    items: parseMemberOrderBreakdownItems(items),
    orderTotal: Number(order.total),
  });

  return (
    <div className="space-y-4 pb-6">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        title="訂單詳情"
        action={<OrderDetailHeaderNav />}
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

      <section className="rounded-xl border-hairline border-border bg-card p-4">
        <h2 className="text-heading-section text-foreground">付款方式</h2>
        <p className="mt-3 text-body text-foreground">{paymentDisplay.label}</p>
        {paymentDisplay.pendingHint ?
          <p className="mt-2 text-caption leading-relaxed text-muted-foreground">
            {paymentDisplay.pendingHint}
          </p>
        : null}
      </section>

      {fulfillmentRows.length > 0 || hasRecipientInfo ?
        <section className="rounded-xl border-hairline border-border bg-card p-4">
          <h2 className="text-heading-section text-foreground">物流／取件</h2>

          {fulfillmentRows.length > 0 ?
            <ul className="mt-3 space-y-4">
              {fulfillmentRows.map((row) => (
                <li
                  key={row.vendorId}
                  className={
                    fulfillmentRows.length > 1 ?
                      'border-b-hairline border-border pb-4 last:border-b-0 last:pb-0'
                    : undefined
                  }>
                  {fulfillmentRows.length > 1 ?
                    <p className="text-caption font-medium text-foreground">
                      {row.vendorName}
                    </p>
                  : null}
                  <dl className="mt-2 space-y-2 text-body">
                    <div>
                      <dt className="text-caption text-muted-foreground">
                        運送方式
                      </dt>
                      <dd>{row.shippingLabel}</dd>
                    </div>
                    {row.isCvs && row.storeName ?
                      <div>
                        <dt className="text-caption text-muted-foreground">
                          取貨門市
                        </dt>
                        <dd>{row.storeName}</dd>
                      </div>
                    : null}
                    {row.isCvs && row.storeAddress ?
                      <div>
                        <dt className="text-caption text-muted-foreground">
                          門市地址
                        </dt>
                        <dd className="whitespace-pre-wrap">{row.storeAddress}</dd>
                      </div>
                    : null}
                    {!row.isCvs && row.homeAddress ?
                      <div>
                        <dt className="text-caption text-muted-foreground">
                          收件地址
                        </dt>
                        <dd className="whitespace-pre-wrap">{row.homeAddress}</dd>
                      </div>
                    : null}
                  </dl>
                </li>
              ))}
            </ul>
          : null}

          {hasRecipientInfo ?
            <dl
              className={
                fulfillmentRows.length > 0 ?
                  'mt-4 space-y-2 border-t-hairline border-border pt-4 text-body'
                : 'mt-3 space-y-2 text-body'
              }>
              {order.recipient_name ?
                <div>
                  <dt className="text-caption text-muted-foreground">收件人</dt>
                  <dd>{order.recipient_name}</dd>
                </div>
              : null}
              {order.recipient_phone ?
                <div>
                  <dt className="text-caption text-muted-foreground">電話</dt>
                  <dd>{order.recipient_phone}</dd>
                </div>
              : null}
            </dl>
          : null}
        </section>
      : null}

      <OrderPaymentBreakdownCard breakdown={paymentBreakdown} />

      {subOrders.length > 0 ?
        <section className="rounded-xl border-hairline border-border bg-card p-4">
          <h2 className="text-heading-section text-foreground">出貨進度</h2>
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
                  {s.shipping_carrier ?
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">物流商</dt>
                      <dd>{s.shipping_carrier}</dd>
                    </div>
                  : null}
                  {s.tracking_number ?
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">追蹤號碼</dt>
                      <dd className="break-all text-end">{s.tracking_number}</dd>
                    </div>
                  : (
                    <p className="text-neutral-text-tertiary">尚未提供追蹤號碼</p>
                  )}
                  {s.shipped_at ?
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">出貨時間</dt>
                      <dd>{formatDt(s.shipped_at)}</dd>
                    </div>
                  : null}
                </dl>
              </li>
            ))}
          </ul>
        </section>
      : null}
    </div>
  );
}
