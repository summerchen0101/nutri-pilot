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

/** 會員端訂單列表狀態 tag 底色／文字色 */
export function memberOrderStatusTagClass(status: string | null | undefined): string {
  switch (status) {
    case 'pending':
      return 'bg-[#FDF0D5] text-[#BA7517]';
    case 'paid':
      return 'bg-[#E6F1FB] text-[#185FA5]';
    case 'shipped':
      return 'bg-[#E8F5EE] text-[#2D6B4A]';
    case 'delivered':
      return 'bg-[#E8F5EE] text-[#2D6B4A]';
    case 'cancelled':
      return 'bg-[#FCEBEB] text-[#E24B4A]';
    default:
      return 'bg-secondary text-muted-foreground';
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

/** 會員端子訂單狀態 tag 底色／文字色 */
export function memberSubOrderStatusTagClass(status: string | null | undefined): string {
  switch (status) {
    case 'confirmed':
      return 'bg-[#FDF0D5] text-[#BA7517]';
    case 'shipped':
      return 'bg-[#E8F5EE] text-[#2D6B4A]';
    case 'delivered':
      return 'bg-[#E8F5EE] text-[#2D6B4A]';
    case 'cancelled':
      return 'bg-[#FCEBEB] text-[#E24B4A]';
    default:
      return 'bg-secondary text-muted-foreground';
  }
}
