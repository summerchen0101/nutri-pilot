import Link from 'next/link';

import { CopyTextButton } from '@/app/admin/orders/_components/copy-text-button';

interface OrderPaymentInfoCardProps {
  readonly orderId: string;
  readonly publicOrderNo: string | null;
  readonly merchantOrderNo: string | null;
  readonly gatewayTradeNo: string | null;
  readonly paymentGateway: string | null;
  readonly itemsSubtotal: number | null;
  readonly shippingTotal: number | null;
  readonly total: number;
  readonly createdAt: string;
  readonly canViewFinance: boolean;
}

function formatTwd(n: number | null): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('zh-TW');
}

export function OrderPaymentInfoCard({
  orderId,
  publicOrderNo,
  merchantOrderNo,
  gatewayTradeNo,
  paymentGateway,
  itemsSubtotal,
  shippingTotal,
  total,
  createdAt,
  canViewFinance,
}: OrderPaymentInfoCardProps) {
  const financeQuery =
    publicOrderNo ?
      `/admin/finance/payments?order=${encodeURIComponent(publicOrderNo)}`
    : null;

  return (
    <section className="rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-heading-section text-foreground">金流資訊</h2>
        {canViewFinance && financeQuery ?
          <Link
            href={financeQuery}
            className="text-caption text-[#4C956C] hover:underline"
          >
            金流對帳
          </Link>
        : null}
      </div>

      <dl className="mt-4 space-y-3 text-body">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <dt className="text-caption text-muted-foreground">對外訂單編號</dt>
            <dd className="font-mono text-caption">{publicOrderNo ?? orderId}</dd>
          </div>
          {publicOrderNo ?
            <CopyTextButton value={publicOrderNo} label="複製編號" />
          : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <dt className="text-caption text-muted-foreground">
              綠界商店訂單號（MerchantTradeNo）
            </dt>
            <dd className="font-mono text-caption break-all">
              {merchantOrderNo ?? '—'}
            </dd>
          </div>
          {merchantOrderNo ?
            <CopyTextButton value={merchantOrderNo} label="複製" />
          : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <dt className="text-caption text-muted-foreground">
              綠界交易編號（TradeNo）
            </dt>
            <dd className="font-mono text-caption break-all">
              {gatewayTradeNo ?? '—'}
            </dd>
          </div>
          {gatewayTradeNo ?
            <CopyTextButton value={gatewayTradeNo} label="複製" />
          : null}
        </div>

        <div>
          <dt className="text-caption text-muted-foreground">支付閘道</dt>
          <dd>{paymentGateway ?? '—'}</dd>
        </div>

        <div>
          <dt className="text-caption text-muted-foreground">建立時間</dt>
          <dd>{new Date(createdAt).toLocaleString('zh-TW')}</dd>
        </div>
      </dl>

      {(itemsSubtotal != null || shippingTotal != null) ?
        <div className="mt-4 rounded-[10px] bg-secondary p-3 text-body">
          <p className="text-caption text-muted-foreground">金額拆分</p>
          <ul className="mt-2 space-y-1">
            <li className="flex justify-between gap-4">
              <span>商品小計</span>
              <span className="tabular-nums">NT$ {formatTwd(itemsSubtotal)}</span>
            </li>
            <li className="flex justify-between gap-4">
              <span>運費</span>
              <span className="tabular-nums">NT$ {formatTwd(shippingTotal)}</span>
            </li>
            <li className="flex justify-between gap-4 border-t border-border pt-2 font-medium">
              <span>訂單總額</span>
              <span className="tabular-nums">NT$ {formatTwd(total)}</span>
            </li>
          </ul>
        </div>
      : null}
    </section>
  );
}
