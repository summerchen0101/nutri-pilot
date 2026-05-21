import { staffCan, type AdminRole } from '@/lib/admin';

import { CopyTextButton } from '@/app/admin/orders/_components/copy-text-button';
import { buttonVisualClassName } from '@/components/ui/button-visual';

const ECPAY_VENDOR_PORTAL_URL = 'https://vendor.ecpay.com.tw/User/LogOn_Step1';

interface OrderRefundPlaceholderCardProps {
  readonly role: AdminRole | null;
  readonly orderNo: string;
  readonly financialStatus?: string | null;
  readonly merchantOrderNo?: string | null;
  readonly gatewayTradeNo?: string | null;
}

export function OrderRefundPlaceholderCard({
  role,
  orderNo,
  financialStatus,
  merchantOrderNo,
  gatewayTradeNo,
}: OrderRefundPlaceholderCardProps) {
  if (!staffCan(role, 'order.refund')) return null;
  const status = financialStatus ?? '';
  if (
    status !== 'paid'
    && status !== 'shipped'
    && status !== 'delivered'
  ) {
    return null;
  }

  const copyForEcpay = merchantOrderNo ?? gatewayTradeNo ?? '';

  return (
    <section className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
      <h2 className="text-heading-section text-foreground">退款（綠界後台人工）</h2>
      <p className="mt-2 text-body text-foreground leading-relaxed">
        訂單{' '}
        <span className="font-mono text-caption">{orderNo}</span>{' '}
        若需退款，請依下列步驟操作。本平台尚未串接自動退款 API；實際入帳異動以綠界為準。
      </p>

      <ol className="mt-4 list-decimal space-y-3 pl-5 text-body">
        <li>
          複製下方<strong className="font-medium">商店訂單編號</strong>
          或<strong className="font-medium">綠界交易編號</strong>，至綠界廠商後台查詢該筆交易。
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {merchantOrderNo ?
              <>
                <span className="font-mono text-caption break-all">{merchantOrderNo}</span>
                <CopyTextButton value={merchantOrderNo} label="複製商店訂單號" />
              </>
            : null}
            {gatewayTradeNo ?
              <>
                <span className="font-mono text-caption break-all">{gatewayTradeNo}</span>
                <CopyTextButton value={gatewayTradeNo} label="複製交易編號" />
              </>
            : null}
            {!merchantOrderNo && !gatewayTradeNo ?
              <span className="text-caption text-muted-foreground">尚無綠界編號</span>
            : null}
          </div>
        </li>
        <li>
          登入{' '}
          <a
            href={ECPAY_VENDOR_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4C956C] hover:underline"
          >
            綠界廠商後台
          </a>
          ，於銷售紀錄執行退款。
        </li>
        <li>
          確認綠界退款完成後，於上方「狀態」將訂單標記為<strong className="font-medium">已取消</strong>，以便對帳一致。
        </li>
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        {copyForEcpay ?
          <CopyTextButton value={copyForEcpay} label="複製查詢用編號" />
        : null}
        <a
          href={ECPAY_VENDOR_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVisualClassName({ variant: 'outline', size: 'sm' })}
        >
          開啟綠界後台
        </a>
      </div>

      <p className="mt-3 text-caption text-muted-foreground">
        僅 <span className="font-medium text-foreground">super_admin</span> 可見此說明。
      </p>
    </section>
  );
}
