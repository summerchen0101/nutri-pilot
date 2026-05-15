import { SettingsRow } from '@/app/(main)/settings/_components/settings-row';
import { SectionCard } from '@/components/ui/section-card';

interface AccountManagementCardProps {
  onMembership: () => void;
  onResetData: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
}

export function AccountManagementCard({
  onMembership,
  onResetData,
  onSignOut,
  onDeleteAccount,
}: AccountManagementCardProps) {
  return (
    <SectionCard>
      <SettingsRow label="會員方案" onClick={onMembership} />
      <SettingsRow label="重置數據" onClick={onResetData} />
      <SettingsRow label="登出" onClick={onSignOut} />
      <SettingsRow
        label="刪除帳號"
        onClick={onDeleteAccount}
        danger
        withBorder={false}
      />
    </SectionCard>
  );
}
