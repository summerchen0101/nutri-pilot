import {
  MemberSubOrderStatusTag,
} from '@/app/(main)/settings/_components/member-order-status-tag';
import type { MemberOrderFulfillmentRow } from '@/lib/shop/member-order-detail-display';

interface SubOrderDisplayRow {
  id: string;
  vendor_id: string | null;
  public_no: string | null;
  status: string | null;
  total: number;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
}

export interface OrderFulfillmentSectionProps {
  subOrders: SubOrderDisplayRow[];
  fulfillmentRows: MemberOrderFulfillmentRow[];
  recipientName: string | null;
  recipientPhone: string | null;
  formatDt: (iso: string | null) => string;
}

interface FulfillmentDisplayItem {
  key: string;
  vendorName: string | null;
  subOrder: SubOrderDisplayRow | null;
  fulfillment: MemberOrderFulfillmentRow | null;
}

function buildFulfillmentDisplayItems(
  subOrders: SubOrderDisplayRow[],
  fulfillmentRows: MemberOrderFulfillmentRow[],
): FulfillmentDisplayItem[] {
  const fulfillmentByVendor = new Map(
    fulfillmentRows.map((row) => [row.vendorId, row]),
  );

  if (subOrders.length > 0) {
    return subOrders.map((subOrder) => {
      const vendorId = subOrder.vendor_id?.trim() ?? '';
      return {
        key: subOrder.id,
        vendorName: fulfillmentByVendor.get(vendorId)?.vendorName ?? null,
        subOrder,
        fulfillment: fulfillmentByVendor.get(vendorId) ?? fulfillmentRows[0] ?? null,
      };
    });
  }

  return fulfillmentRows.map((row) => ({
    key: row.vendorId,
    vendorName: row.vendorName,
    subOrder: null,
    fulfillment: row,
  }));
}

export function OrderFulfillmentSection({
  subOrders,
  fulfillmentRows,
  recipientName,
  recipientPhone,
  formatDt,
}: OrderFulfillmentSectionProps) {
  const hasRecipientInfo = Boolean(
    recipientName?.trim() || recipientPhone?.trim(),
  );
  const displayItems = buildFulfillmentDisplayItems(subOrders, fulfillmentRows);

  if (displayItems.length === 0 && !hasRecipientInfo) {
    return null;
  }

  return (
    <section className="rounded-xl border-hairline border-border bg-card p-4">
      <h2 className="text-heading-section text-foreground">物流／出貨</h2>
      <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
        取件資訊與出貨進度；宅配查貨請使用追蹤號碼向物流業者查詢。
      </p>

      {displayItems.length > 0 ?
        <ul className="mt-3 space-y-3">
          {displayItems.map((item) => (
            <li
              key={item.key}
              className="rounded-lg border-hairline border-border bg-background p-3"
            >
              {item.subOrder ?
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-caption text-foreground">
                    {item.subOrder.public_no}
                  </span>
                  <MemberSubOrderStatusTag status={item.subOrder.status} />
                </div>
              : item.vendorName ?
                <p className="text-caption font-medium text-foreground">{item.vendorName}</p>
              : null}

              {item.fulfillment ?
                <dl
                  className={
                    item.subOrder ?
                      'mt-3 space-y-2 border-t-hairline border-border pt-3 text-body'
                    : 'space-y-2 text-body'
                  }
                >
                  <div>
                    <dt className="text-caption text-muted-foreground">運送方式</dt>
                    <dd>{item.fulfillment.shippingLabel}</dd>
                  </div>
                  {item.fulfillment.isCvs && item.fulfillment.storeName ?
                    <div>
                      <dt className="text-caption text-muted-foreground">取貨門市</dt>
                      <dd>{item.fulfillment.storeName}</dd>
                    </div>
                  : null}
                  {item.fulfillment.isCvs && item.fulfillment.storeAddress ?
                    <div>
                      <dt className="text-caption text-muted-foreground">門市地址</dt>
                      <dd className="whitespace-pre-wrap">{item.fulfillment.storeAddress}</dd>
                    </div>
                  : null}
                  {!item.fulfillment.isCvs && item.fulfillment.homeAddress ?
                    <div>
                      <dt className="text-caption text-muted-foreground">收件地址</dt>
                      <dd className="whitespace-pre-wrap">{item.fulfillment.homeAddress}</dd>
                    </div>
                  : null}
                </dl>
              : null}

              {item.subOrder ?
                <dl
                  className={
                    item.fulfillment ?
                      'mt-3 space-y-1 border-t-hairline border-border pt-3 text-caption'
                    : 'mt-2 space-y-1 text-caption'
                  }
                >
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">小計</dt>
                    <dd>
                      NT${' '}
                      {Number(item.subOrder.total).toLocaleString('zh-TW', {
                        minimumFractionDigits: 0,
                      })}
                    </dd>
                  </div>
                  {item.subOrder.shipping_carrier ?
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">物流商</dt>
                      <dd>{item.subOrder.shipping_carrier}</dd>
                    </div>
                  : null}
                  {item.subOrder.tracking_number ?
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">追蹤號碼</dt>
                      <dd className="break-all text-end">{item.subOrder.tracking_number}</dd>
                    </div>
                  : (
                    <p className="text-neutral-text-tertiary">尚未提供追蹤號碼</p>
                  )}
                  {item.subOrder.shipped_at ?
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">出貨時間</dt>
                      <dd>{formatDt(item.subOrder.shipped_at)}</dd>
                    </div>
                  : null}
                </dl>
              : null}
            </li>
          ))}
        </ul>
      : null}

      {hasRecipientInfo ?
        <dl
          className={
            displayItems.length > 0 ?
              'mt-4 space-y-2 border-t-hairline border-border pt-4 text-body'
            : 'mt-3 space-y-2 text-body'
          }
        >
          {recipientName ?
            <div>
              <dt className="text-caption text-muted-foreground">收件人</dt>
              <dd>{recipientName}</dd>
            </div>
          : null}
          {recipientPhone ?
            <div>
              <dt className="text-caption text-muted-foreground">電話</dt>
              <dd>{recipientPhone}</dd>
            </div>
          : null}
        </dl>
      : null}
    </section>
  );
}
