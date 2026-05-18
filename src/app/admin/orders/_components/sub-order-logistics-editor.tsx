'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { updateSubOrderLogistics } from '@/app/admin/orders/actions';
import { Button } from '@/components/ui/button';

export type SubOrderLogisticsRow = {
  id: string;
  public_no: string;
  status: string;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface SubOrderLogisticsEditorProps {
  orderId: string;
  subOrders: SubOrderLogisticsRow[];
}

export function SubOrderLogisticsEditor({
  orderId,
  subOrders,
}: SubOrderLogisticsEditorProps) {
  if (subOrders.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border bg-background p-4">
      <h2 className="text-heading-section text-foreground">物流資訊</h2>
      <p className="mt-1 text-caption text-slate-600">
        編輯各子訂單之物流商、追蹤號碼與出貨時間（需具出貨／客服權限）。
      </p>
      <ul className="mt-4 space-y-6">
        {subOrders.map((s) => (
          <SubOrderLogisticsRowForm key={s.id} orderId={orderId} sub={s} />
        ))}
      </ul>
    </section>
  );
}

function SubOrderLogisticsRowForm({
  orderId,
  sub,
}: {
  orderId: string;
  sub: SubOrderLogisticsRow;
}) {
  const router = useRouter();
  const [carrier, setCarrier] = useState(sub.shipping_carrier ?? '');
  const [tracking, setTracking] = useState(sub.tracking_number ?? '');
  const [shippedAt, setShippedAt] = useState(toDatetimeLocalValue(sub.shipped_at));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setCarrier(sub.shipping_carrier ?? '');
    setTracking(sub.tracking_number ?? '');
    setShippedAt(toDatetimeLocalValue(sub.shipped_at));
  }, [sub]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(() => {
      void (async () => {
        const res = await updateSubOrderLogistics({
          orderId,
          subOrderId: sub.id,
          shippingCarrier: carrier,
          trackingNumber: tracking,
          shippedAt: shippedAt,
        });
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
        router.refresh();
      })();
    });
  }

  return (
    <li className="rounded-lg border border-border p-3">
      <p className="font-mono text-caption text-slate-700">{sub.public_no}</p>
      <p className="text-micro text-slate-500">子訂單狀態：{sub.status}</p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <div className="space-y-1">
          <label className="text-caption text-slate-600" htmlFor={`carrier-${sub.id}`}>
            物流商
          </label>
          <input
            id={`carrier-${sub.id}`}
            className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 text-body"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="例如：黑貓、新竹物流"
            maxLength={80}
          />
        </div>
        <div className="space-y-1">
          <label className="text-caption text-slate-600" htmlFor={`track-${sub.id}`}>
            追蹤號碼
          </label>
          <input
            id={`track-${sub.id}`}
            className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 font-mono text-caption"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="space-y-1">
          <label className="text-caption text-slate-600" htmlFor={`ship-${sub.id}`}>
            出貨時間（留空則清除）
          </label>
          <input
            id={`ship-${sub.id}`}
            type="datetime-local"
            className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 text-body"
            value={shippedAt}
            onChange={(e) => setShippedAt(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? '儲存中…' : '儲存物流'}
        </Button>
        {msg ? <p className="text-body text-red-600">{msg}</p> : null}
      </form>
    </li>
  );
}
