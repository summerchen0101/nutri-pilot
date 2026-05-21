'use client';

import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { buttonVisualClassName } from '@/components/ui/button-visual';

interface SubOrderEcpayPrintCardProps {
  readonly subOrderId: string;
  readonly logisticsSubtype: string | null;
  readonly ecpayLogisticsTradeNo: string | null;
}

export function SubOrderEcpayPrintCard({
  subOrderId,
  logisticsSubtype,
  ecpayLogisticsTradeNo,
}: SubOrderEcpayPrintCardProps) {
  const [err, setErr] = useState<string | null>(null);

  if (!ecpayLogisticsTradeNo || !logisticsSubtype) {
    return null;
  }

  async function openPrint() {
    setErr(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
      if (!token || !base) {
        setErr('無法取得登入或環境設定');
        return;
      }
      const url =
        `${base}/functions/v1/ecpay-logistics-print?subOrderId=${encodeURIComponent(subOrderId)}&token=${encodeURIComponent(token)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '無法開啟列印');
    }
  }

  return (
    <div className="mt-3 rounded-[10px] border border-dashed border-border bg-muted/20 p-3">
      <p className="text-caption text-muted-foreground">綠界物流託運單</p>
      <p className="mt-1 font-mono text-micro break-all">{ecpayLogisticsTradeNo}</p>
      <button
        type="button"
        onClick={() => void openPrint()}
        className={`mt-2 ${buttonVisualClassName({ variant: 'outline', size: 'sm' })}`}
      >
        列印託運單
      </button>
      {err ?
        <p className="mt-2 text-caption text-destructive">{err}</p>
      : null}
    </div>
  );
}
