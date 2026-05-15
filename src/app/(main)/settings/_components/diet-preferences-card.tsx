import { Utensils } from 'lucide-react';

import { SettingsRow } from '@/app/(main)/settings/_components/settings-row';
import { SETTINGS_DIET_PREFERENCES_ANCHOR_ID } from '@/app/(main)/settings/_lib/settings-anchors';
import { SectionCard } from '@/components/ui/section-card';
import { SectionHeading } from '@/components/ui/section-heading';

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
    <SectionCard id={SETTINGS_DIET_PREFERENCES_ANCHOR_ID}>
      <SectionHeading icon={Utensils} variant="nested" className="mb-1">
        飲食偏好
      </SectionHeading>
      <SettingsRow label="飲食方式" value={dietMethodText} onClick={onEditMethod} />
      <SettingsRow label="忌食 / 過敏" value={allergenText} onClick={onEditAllergens} />
      {error ? (
        <p className="mt-1 text-caption text-destructive">{error}</p>
      ) : null}
    </SectionCard>
  );
}
