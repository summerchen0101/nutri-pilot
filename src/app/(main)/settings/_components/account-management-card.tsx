import { SectionCard } from '@/components/ui/section-card';

import { SettingsRow } from '@/app/(main)/settings/_components/settings-row';

interface AccountManagementCardProps {
  onResetData: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
}

export function AccountManagementCard({
  onResetData,
  onSignOut,
  onDeleteAccount,
}: AccountManagementCardProps) {
  return (
    <SectionCard className="bg-neutral-bg-primary">
      <div className="mb-1 text-[15px] font-medium text-foreground">帳號管理</div>
      <SettingsRow label="重置數據" onClick={onResetData} />
      <SettingsRow label="登出" onClick={onSignOut} />
      <SettingsRow label="刪除帳號" onClick={onDeleteAccount} danger withBorder={false} />
    </SectionCard>
  );
}
