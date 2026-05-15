'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { SectionHeading } from '@/components/ui/section-heading';

export interface AiQuotaCardProps {
  planLabel: string;
  usedUnits: number;
  capUnits: number;
  usagePercent: number;
}

export function AiQuotaCard({
  planLabel,
  usedUnits,
  capUnits,
  usagePercent,
}: AiQuotaCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const usedLabel = usedUnits.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const capLabel = capUnits.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <>
      <SectionCard>
        <SectionHeading icon={Sparkles} variant="nested" className="mb-2">
          使用額度
        </SectionHeading>
        <p className="text-caption text-muted-foreground">
          方案：{planLabel} · 本月上限 {capLabel} AI 額度
        </p>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={usagePercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-heading-page text-primary">{usagePercent}%</span>
          <span className="text-caption text-muted-foreground">
            已用 {usedLabel} AI 額度
          </span>
        </div>
        <Button
          type="button"
          variant="default"
          className="mt-3 w-full"
          onClick={() => setSheetOpen(true)}
        >
          額度說明
        </Button>
      </SectionCard>

      <BottomSheetShell
        open={sheetOpen}
        title="AI 額度說明"
        onClose={() => setSheetOpen(false)}
      >
        <div className="space-y-3 pb-2 text-body text-foreground">
          <p>
            額度以台北時間每月 1 日重置。目前方案為「{planLabel}」，本月上限{' '}
            {capLabel} AI 額度；已用 {usedLabel} AI 額度。數值依 API token
            用量換算：先估算成本（美元計價），再依每單位換算規則轉為 AI 額度（預設對應
            1：3000），僅供體感參考。
          </p>
          <p className="text-caption text-muted-foreground">
            實際會員等級以
            <span className="text-foreground">會員方案</span>
            與帳戶設定為準。
          </p>
        </div>
      </BottomSheetShell>
    </>
  );
}
