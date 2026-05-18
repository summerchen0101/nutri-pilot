'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { updateOrderStatus } from '@/app/admin/orders/actions';
import { Button } from '@/components/ui/button';

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] as const;

export function OrderStatusUpdater({
  orderId,
  currentStatus,
}: Readonly<{ orderId: string; currentStatus: string }>) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(() => {
      void (async () => {
        const res = await updateOrderStatus({
          orderId,
          status: status as (typeof STATUSES)[number],
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
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-caption text-slate-600">訂單狀態</label>
        <select
          className="flex h-11 min-w-[160px] rounded-[10px] border border-border bg-background px-3 text-body"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
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
