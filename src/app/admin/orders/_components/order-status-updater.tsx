'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { updateOrderStatus } from '@/app/admin/orders/actions';
import type { OrderFlowStatus } from '@/app/admin/orders/order-status-rules';
import { Button } from '@/components/ui/button';

const LABEL: Record<OrderFlowStatus, string> = {
  pending: '待付款',
  paid: '已付款',
  shipped: '已出貨',
  delivered: '已送達',
  cancelled: '已取消',
};

interface OrderStatusUpdaterProps {
  orderId: string;
  currentStatus: string;
  allowedNext: OrderFlowStatus[];
}

export function OrderStatusUpdater({
  orderId,
  currentStatus,
  allowedNext,
}: OrderStatusUpdaterProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const currentLabel =
    LABEL[currentStatus as OrderFlowStatus] ?? currentStatus;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (status === currentStatus) {
      setMsg('請選擇不同的狀態');
      return;
    }

    if (!allowedNext.includes(status as OrderFlowStatus)) {
      setMsg('此轉換不允許或您沒有權限');
      return;
    }

    startTransition(() => {
      void (async () => {
        const res = await updateOrderStatus({
          orderId,
          status,
        });
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
        router.refresh();
      })();
    });
  }

  if (allowedNext.length === 0) {
    return (
      <p className="text-caption text-muted-foreground">
        目前無可手動變更的下一狀態（或您的角色無「出貨／客服」操作權限）。
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-caption text-slate-600">訂單狀態</label>
        <select
          className="flex h-11 min-w-[160px] rounded-[10px] border border-border bg-background px-3 text-body"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
          }}
        >
          <option value={currentStatus}>目前 — {currentLabel}</option>
          {allowedNext.map((s) => (
            <option key={s} value={s}>
              變更為 — {LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="default" size="sm" disabled={pending}>
        {pending ? '更新中…' : '更新狀態'}
      </Button>
      {msg ? <p className="w-full text-body text-red-600">{msg}</p> : null}
    </form>
  );
}
