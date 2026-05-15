'use client';

import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useId } from 'react';

import { cn } from '@/lib/utils/cn';

export const SETTINGS_SECTION_STORAGE_KEY = 'nutri_settings_sections_v1';

export type SettingsSectionId = 'health' | 'diet' | 'shop' | 'account';

const SETTINGS_SECTION_IDS_IN_ORDER: SettingsSectionId[] = [
  'health',
  'diet',
  'shop',
  'account',
];

const SETTINGS_ACCORDION_STORE_VERSION = 2 as const;

type StoredAccordionShape = {
  v: typeof SETTINGS_ACCORDION_STORE_VERSION;
  expanded: SettingsSectionId | null;
};

type LegacyStoredShape = Partial<Record<SettingsSectionId, boolean>>;

function isSettingsSectionId(value: unknown): value is SettingsSectionId {
  return (
    value === 'health' ||
    value === 'diet' ||
    value === 'shop' ||
    value === 'account'
  );
}

function legacyExpandedSection(parsed: LegacyStoredShape): SettingsSectionId {
  for (const id of SETTINGS_SECTION_IDS_IN_ORDER) {
    if (parsed[id] === true) {
      return id;
    }
  }
  return 'health';
}

export function readStoredExpandedSection(): SettingsSectionId | null {
  if (typeof window === 'undefined') {
    return 'health';
  }
  try {
    const raw = sessionStorage.getItem(SETTINGS_SECTION_STORAGE_KEY);
    if (!raw) {
      return 'health';
    }
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'v' in parsed &&
      (parsed as StoredAccordionShape).v === SETTINGS_ACCORDION_STORE_VERSION &&
      'expanded' in parsed
    ) {
      const expanded = (parsed as StoredAccordionShape).expanded;
      if (expanded === null) {
        return null;
      }
      if (isSettingsSectionId(expanded)) {
        return expanded;
      }
      return 'health';
    }
    if (parsed && typeof parsed === 'object') {
      return legacyExpandedSection(parsed as LegacyStoredShape);
    }
  } catch {
    /* ignore */
  }
  return 'health';
}

export function writeStoredExpandedSection(
  expanded: SettingsSectionId | null,
): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const payload: StoredAccordionShape = {
      v: SETTINGS_ACCORDION_STORE_VERSION,
      expanded,
    };
    sessionStorage.setItem(
      SETTINGS_SECTION_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    /* ignore */
  }
}

interface SettingsCollapsibleSectionProps {
  sectionId: SettingsSectionId;
  icon: LucideIcon;
  title: string;
  summary: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function SettingsCollapsibleSection({
  sectionId,
  icon: Icon,
  title,
  summary,
  open,
  onOpenChange,
  children,
}: SettingsCollapsibleSectionProps) {
  const panelId = useId();

  function toggle() {
    onOpenChange(!open);
  }

  return (
    <div
      id={`settings-section-${sectionId}`}
      className="overflow-hidden rounded-xl border-hairline border-border bg-background">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className={cn(
          'flex w-full min-h-11 items-start gap-2 px-4 py-3 text-left outline-none',
          'ring-inset ring-primary focus-visible:ring-2 focus-visible:ring-offset-0',
        )}>
        <Icon
          className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted-foreground"
          strokeWidth={1.8}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-heading-section text-foreground">{title}</span>
          <span className="mt-0.5 block text-caption text-muted-foreground">
            {summary}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'mt-0.5 h-5 w-5 shrink-0 text-muted-foreground transition-transform',
            open ? 'rotate-180' : 'rotate-0',
          )}
        />
      </button>
      {open ? (
        <div
          id={panelId}
          className="space-y-3 border-t-hairline border-border px-3 pb-3 pt-2 sm:px-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}
