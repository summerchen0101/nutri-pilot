'use client';

import { useState } from 'react';

import { fetchEcpayLogisticsPrintPayload } from '@/app/admin/orders/actions';
import { buttonVisualClassName } from '@/components/ui/button-visual';
import { isLogisticsPrintSupported } from '@/lib/ecpay/logistics-labels';
import {
  openEcpayPopup,
  showPopupMessage,
  submitPostFormToNamedPopup,
} from '@/lib/shop/ecpay-popup-form';

const ECPAY_PRINT_POPUP_NAME = 'ecpay-logistics-print';

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
  const [pending, setPending] = useState(false);

  if (
    !ecpayLogisticsTradeNo ||
    !logisticsSubtype ||
    !isLogisticsPrintSupported(logisticsSubtype)
  ) {
    return null;
  }

  async function openPrint() {
    setErr(null);
    setPending(true);

    const popup = openEcpayPopup(ECPAY_PRINT_POPUP_NAME);
    if (!popup) {
      setPending(false);
      setErr('請允許彈出視窗以列印託運單');
      return;
    }

    showPopupMessage(popup, '正在準備托運單…');

    try {
      const bridge = await fetchEcpayLogisticsPrintPayload({ subOrderId });
      if (!bridge.ok) {
        popup.close();
        setErr(bridge.error);
        return;
      }
      submitPostFormToNamedPopup(ECPAY_PRINT_POPUP_NAME, {
        action: bridge.action,
        fields: bridge.fields,
      });
    } catch (e) {
      if (!popup.closed) {
        popup.close();
      }
      setErr(e instanceof Error ? e.message : '無法開啟列印');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 rounded-[10px] border border-dashed border-border bg-muted/20 p-3">
      <p className="text-caption text-muted-foreground">綠界物流託運單</p>
      <p className="mt-1 font-mono text-micro break-all">{ecpayLogisticsTradeNo}</p>
      <button
        type="button"
        onClick={() => void openPrint()}
        disabled={pending}
        className={`mt-2 ${buttonVisualClassName({ variant: 'outline', size: 'sm' })}`}
      >
        {pending ? '準備中…' : '列印託運單'}
      </button>
      {err ?
        <p className="mt-2 text-caption text-destructive">{err}</p>
      : null}
    </div>
  );
}
