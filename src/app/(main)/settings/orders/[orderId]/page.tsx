import { redirect, notFound } from 'next/navigation';

import {
  MemberOrderStatusTag,
} from '@/app/(main)/settings/_components/member-order-status-tag';
import { ContinueOrderPaymentButton } from '@/app/(main)/settings/orders/_components/continue-order-payment-button';
import { OrderDetailHeaderNav } from '@/app/(main)/settings/orders/_components/order-detail-header-nav';
import { OrderFulfillmentSection } from '@/app/(main)/settings/orders/_components/order-fulfillment-section';
import { OrderPaymentBreakdownCard } from '@/app/(main)/settings/orders/_components/order-payment-breakdown-card';
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

      <OrderFulfillmentSection
        subOrders={subOrders}
        fulfillmentRows={fulfillmentRows}
        recipientName={order.recipient_name}
        recipientPhone={order.recipient_phone}
        formatDt={formatDt}
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
            <dd>
              <MemberOrderStatusTag status={order.status} />
            </dd>
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

      <OrderPaymentBreakdownCard breakdown={paymentBreakdown} />
    </div>
  );
}
