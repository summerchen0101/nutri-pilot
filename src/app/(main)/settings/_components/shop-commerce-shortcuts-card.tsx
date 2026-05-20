import { SettingsRow } from '@/app/(main)/settings/_components/settings-row';
import { SectionCard } from '@/components/ui/section-card';

interface ShopCommerceShortcutsCardProps {
  onShippingAddresses: () => void;
}

export function ShopCommerceShortcutsCard({
  onShippingAddresses,
}: ShopCommerceShortcutsCardProps) {
  return (
    <SectionCard>
      <SettingsRow label="我的訂單" href="/settings/orders" />
      <SettingsRow label="常用地址設定" onClick={onShippingAddresses} />
      <SettingsRow label="點數紀錄" href="/settings/points" />
      <SettingsRow label="優惠券" href="/settings/coupons" withBorder={false} />
    </SectionCard>
  );
}
