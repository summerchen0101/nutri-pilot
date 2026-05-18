import { staffCan, type AdminRole } from '@/lib/admin';

interface OrderRefundPlaceholderCardProps {
  readonly role: AdminRole | null;
  readonly orderNo: string;
  readonly financialStatus?: string | null;
}

export function OrderRefundPlaceholderCard({
  role,
  orderNo,
  financialStatus,
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

  return (
    <section className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
      <h2 className="text-heading-section text-foreground">退款（占位）</h2>
      <p className="mt-2 text-body text-foreground leading-relaxed">
        訂單{' '}
        <span className="font-mono text-caption">{orderNo}</span>{' '}
        若需退款，請於藍新商戶後台依官方流程處理；本平台尚未串接自動退款
        API。完成後可於上方「狀態」將訂單標記為「已取消」以便營運與對帳一致。
      </p>
      <p className="mt-2 text-caption text-muted-foreground">
        僅{' '}
        <span className="font-medium text-foreground">super_admin</span>{' '}
        可見此說明；實際入帳異動請以支付閘道為準。
      </p>
    </section>
  );
}
