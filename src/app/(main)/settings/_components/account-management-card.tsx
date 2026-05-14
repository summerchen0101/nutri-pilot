import { UserCog } from 'lucide-react';

import { SettingsRow } from '@/app/(main)/settings/_components/settings-row';
import { SectionCard } from '@/components/ui/section-card';
import { SectionHeading } from '@/components/ui/section-heading';

interface AccountManagementCardProps {
  onOpenShopSettings: () => void;
  onPointsHistory: () => void;
  onMembership: () => void;
  onResetData: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
}

export function AccountManagementCard({
  onOpenShopSettings,
  onPointsHistory,
  onMembership,
  onResetData,
  onSignOut,
  onDeleteAccount,
}: AccountManagementCardProps) {
  return (
    <SectionCard>
      <SectionHeading icon={UserCog} className="mb-1">
        帳號管理
      </SectionHeading>
      <SettingsRow label="點數紀錄" onClick={onPointsHistory} />
      <SettingsRow label="商城設定" onClick={onOpenShopSettings} />
      <SettingsRow label="會員方案" onClick={onMembership} />
      <SettingsRow label="重置數據" onClick={onResetData} />
      <SettingsRow label="登出" onClick={onSignOut} />
      <SettingsRow label="刪除帳號" onClick={onDeleteAccount} danger withBorder={false} />
    </SectionCard>
  );
}
