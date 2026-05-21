'use client';

import { useState, useTransition } from 'react';

import { queryEcpayTrade } from '@/app/admin/orders/actions';
import { buttonVisualClassName } from '@/components/ui/button-visual';

interface OrderEcpayQueryPanelProps {
  readonly orderId: string;
}

function formatQueryResult(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function OrderEcpayQueryPanel({ orderId }: OrderEcpayQueryPanelProps) {
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onQuery() {
    setErr(null);
    setResult(null);
    startTransition(async () => {
      const res = await queryEcpayTrade({ orderId });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setResult(formatQueryResult(res.data));
    });
  }

  return (
    <section className="rounded-xl border border-border bg-background p-4">
      <h2 className="text-heading-section text-foreground">向綠界查詢交易</h2>
      <p className="mt-2 text-caption text-muted-foreground">
        查詢全方位金流交易狀態比對；僅 super_admin 可用。
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={onQuery}
        className={`mt-4 ${buttonVisualClassName({ variant: 'outline', size: 'sm' })}`}
      >
        {pending ? '查詢中…' : '向綠界查詢'}
      </button>
      {err ?
        <p className="mt-3 text-caption text-destructive">{err}</p>
      : null}
      {result ?
        <pre className="mt-3 max-h-64 overflow-auto rounded-[10px] bg-secondary p-3 font-mono text-micro whitespace-pre-wrap break-all">
          {result}
        </pre>
      : null}
    </section>
  );
}
