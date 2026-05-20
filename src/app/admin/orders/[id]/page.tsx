import Link from 'next/link';
import { notFound } from 'next/navigation';

import { OrderNewebpayQueryPanel } from '@/app/admin/orders/_components/order-newebpay-query-panel';
import { OrderPaymentInfoCard } from '@/app/admin/orders/_components/order-payment-info-card';
import { OrderRefundPlaceholderCard } from '@/app/admin/orders/_components/order-refund-placeholder-card';
import { OrderStatusUpdater } from '@/app/admin/orders/_components/order-status-updater';
import { SubOrderLogisticsEditor } from '@/app/admin/orders/_components/sub-order-logistics-editor';
import { allowedNextOrderStatuses } from '@/app/admin/orders/order-status-rules';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export default async function AdminOrderDetailPage({
  params,
}: Readonly<{ params: { id: string } }>) {
  const supabase = createClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      status,
      total,
      created_at,
      public_order_no,
      merchant_order_no,
      gateway_trade_no,
      payment_gateway,
      items_subtotal,
      shipping_total,
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
      sub_orders:sub_orders(id, public_no, status, total, tracking_number, shipping_carrier, shipped_at)
    `,
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!order) {
    notFound();
  }

  const role = await getAdminRole();
  const transitions = allowedNextOrderStatuses(role, order.status ?? '');

  const itemsRaw = order.items;
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];

  const subRaw = order.sub_orders;
  const subOrders = Array.isArray(subRaw) ? subRaw : [];
  const canShip = staffCan(role, 'order.ship');
  const canViewFinance = staffCan(role, 'analytics.finance');
  const canQueryNewebpay = role === 'super_admin';

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/admin/orders"
        className="text-caption text-[#4C956C] hover:underline"
      >
        ← 訂單列表
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-heading-screen text-foreground">訂單詳情</h1>
          <p className="mt-1 font-mono text-caption text-slate-600">
            {order.public_order_no ?? order.id}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-background p-4">
        <h2 className="text-heading-section text-foreground">狀態</h2>
        <div className="mt-4">
          <OrderStatusUpdater
            orderId={order.id}
            currentStatus={order.status}
            allowedNext={transitions}
          />
        </div>
      </section>

      <OrderPaymentInfoCard
        orderId={order.id}
        publicOrderNo={order.public_order_no}
        merchantOrderNo={order.merchant_order_no}
        gatewayTradeNo={order.gateway_trade_no}
        paymentGateway={order.payment_gateway}
        itemsSubtotal={order.items_subtotal}
        shippingTotal={order.shipping_total}
        total={Number(order.total)}
        createdAt={order.created_at}
        canViewFinance={canViewFinance}
      />

      {canQueryNewebpay ?
        <OrderNewebpayQueryPanel orderId={order.id} />
      : null}

      <OrderRefundPlaceholderCard
        role={role}
        orderNo={order.public_order_no ?? order.id}
        financialStatus={order.status}
        merchantOrderNo={order.merchant_order_no}
        gatewayTradeNo={order.gateway_trade_no}
      />

      {(order.recipient_name || order.recipient_address_full) ? (
        <section className="rounded-xl border border-border bg-background p-4">
          <h2 className="text-heading-section text-foreground">收件資訊</h2>
          <dl className="mt-3 space-y-2 text-body">
            {order.recipient_name ? (
              <div>
                <dt className="text-caption text-slate-600">姓名</dt>
                <dd>{order.recipient_name}</dd>
              </div>
            ) : null}
            {order.recipient_phone ? (
              <div>
                <dt className="text-caption text-slate-600">電話</dt>
                <dd>{order.recipient_phone}</dd>
              </div>
            ) : null}
            {order.recipient_address_full ? (
              <div>
                <dt className="text-caption text-slate-600">地址</dt>
                <dd>{order.recipient_address_full}</dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-background p-4">
        <h2 className="text-heading-section text-foreground">品項</h2>
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
                <span className="text-caption text-slate-600">
                  {' '}
                  ×{line.qty}（單價 {Number(line.unit_price).toLocaleString('zh-TW')}）
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {subOrders.length > 0 ?
        canShip ?
          <SubOrderLogisticsEditor orderId={order.id} subOrders={subOrders} />
        : <section className="rounded-xl border border-border bg-background p-4">
            <h2 className="text-heading-section text-foreground">子訂單</h2>
            <ul className="mt-3 space-y-2 text-body">
              {subOrders.map((s) => (
                <li key={s.id}>
                  <span className="font-mono text-caption">{s.public_no}</span>
                  <span className="text-slate-600"> — {s.status}</span>
                  <span className="text-caption text-slate-600">
                    {' '}
                    NT${' '}
                    {Number(s.total).toLocaleString('zh-TW', {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                  {s.tracking_number ?
                    <span className="text-caption text-slate-600">
                      （物流：{s.tracking_number}）
                    </span>
                  : null}
                </li>
              ))}
            </ul>
          </section>
      : null}
    </div>
  );
}
