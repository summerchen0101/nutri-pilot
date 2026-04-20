import { SectionCard } from '@/components/ui/section-card';

import { SettingsRow } from '@/app/(main)/settings/_components/settings-row';

interface DietPreferencesCardProps {
  dietMethodText: string;
  allergenText: string;
  error?: string | null;
  onEditMethod: () => void;
  onEditAllergens: () => void;
}

export function DietPreferencesCard({
  dietMethodText,
  allergenText,
  error,
  onEditMethod,
  onEditAllergens,
}: DietPreferencesCardProps) {
  return (
    <SectionCard className="bg-neutral-bg-primary">
      <div className="mb-1 text-[15px] font-medium text-foreground">飲食偏好</div>
      <SettingsRow label="飲食方式" value={dietMethodText} onClick={onEditMethod} />
      <SettingsRow label="忌食 / 過敏" value={allergenText} onClick={onEditAllergens} withBorder={false} />
      {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
    </SectionCard>
  );
}
