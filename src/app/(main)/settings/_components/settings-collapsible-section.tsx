'use client';

import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useState,
} from 'react';

import { cn } from '@/lib/utils/cn';

export const SETTINGS_SECTION_STORAGE_KEY = 'nutri_settings_sections_v1';

export type SettingsSectionId = 'health' | 'diet' | 'shop' | 'account';

type StoredShape = Partial<Record<SettingsSectionId, boolean>>;

export const SETTINGS_SECTION_DEFAULTS: Record<SettingsSectionId, boolean> = {
  health: true,
  diet: false,
  shop: false,
  account: false,
};

function readStoredOpen(sectionId: SettingsSectionId): boolean {
  try {
    const raw = sessionStorage.getItem(SETTINGS_SECTION_STORAGE_KEY);
    if (!raw) return SETTINGS_SECTION_DEFAULTS[sectionId];
    const parsed = JSON.parse(raw) as StoredShape;
    if (typeof parsed[sectionId] === 'boolean') {
      return parsed[sectionId];
    }
  } catch {
    /* ignore */
  }
  return SETTINGS_SECTION_DEFAULTS[sectionId];
}

interface SettingsCollapsibleSectionProps {
  sectionId: SettingsSectionId;
  icon: LucideIcon;
  title: string;
  summary: string;
  children: ReactNode;
}

export function SettingsCollapsibleSection({
  sectionId,
  icon: Icon,
  title,
  summary,
  children,
}: SettingsCollapsibleSectionProps) {
  const panelId = useId();

  const [open, setOpen] = useState(
    () => SETTINGS_SECTION_DEFAULTS[sectionId],
  );

  useEffect(() => {
    setOpen(readStoredOpen(sectionId));
  }, [sectionId]);

  const persist = useCallback(
    (nextOpen: boolean) => {
      try {
        let parsed: StoredShape = {};
        const raw = sessionStorage.getItem(SETTINGS_SECTION_STORAGE_KEY);
        if (raw) {
          parsed = JSON.parse(raw) as StoredShape;
        }
        parsed[sectionId] = nextOpen;
        sessionStorage.setItem(
          SETTINGS_SECTION_STORAGE_KEY,
          JSON.stringify(parsed),
        );
      } catch {
        /* ignore */
      }
    },
    [sectionId],
  );

  function toggle() {
    const next = !open;
    setOpen(next);
    persist(next);
  }

  return (
    <div className="overflow-hidden rounded-xl border-hairline border-border bg-background">
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
          className="space-y-3 border-t-hairline border-border px-0 pb-3 pt-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}
