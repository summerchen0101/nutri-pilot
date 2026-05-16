'use client';

import { SettingsRow } from '@/app/(main)/settings/_components/settings-row';
import { SectionCard } from '@/components/ui/section-card';

interface ShopCommerceShortcutsCardProps {
  onMyOrders: () => void;
  onShippingAddresses: () => void;
  onMemberPoints: () => void;
  onCoupons: () => void;
}

export function ShopCommerceShortcutsCard({
  onMyOrders,
  onShippingAddresses,
  onMemberPoints,
  onCoupons,
}: ShopCommerceShortcutsCardProps) {
  return (
    <SectionCard>
      <SettingsRow label="我的訂單" onClick={onMyOrders} />
      <SettingsRow label="常用地址設定" onClick={onShippingAddresses} />
      <SettingsRow label="購物金（會員點數）" onClick={onMemberPoints} />
      <SettingsRow label="優惠券" onClick={onCoupons} withBorder={false} />
    </SectionCard>
  );
}
