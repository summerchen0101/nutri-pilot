/** 會員端訂單狀態顯示文案（與後台 DB `orders.status` 一致） */
export function memberOrderStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'pending':
      return '待付款';
    case 'paid':
      return '已付款';
    case 'shipped':
      return '已出貨';
    case 'delivered':
      return '已送達';
    case 'cancelled':
      return '已取消';
    default:
      return status?.trim() ? status : '未知';
  }
}

export function memberSubOrderStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'confirmed':
      return '待出貨';
    case 'shipped':
      return '已出貨';
    case 'delivered':
      return '已送達';
    case 'cancelled':
      return '已取消';
    default:
      return status?.trim() ? status : '—';
  }
}
