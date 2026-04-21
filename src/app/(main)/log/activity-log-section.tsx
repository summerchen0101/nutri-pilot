'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { FiTrash2 } from 'react-icons/fi';

import {
  type ActivityType,
  deleteActivityLogAction,
  insertActivityLogAction,
} from '@/app/(main)/log/activity-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { KCAL_PER_MINUTE } from '@/lib/activity/kcal-per-minute';
import { cn } from '@/lib/utils/cn';

export type ActivityLogRow = {
  id: string;
  logged_date: string;
  activity_type: string;
  duration_minutes: number;
  calories_est: number | null;
  notes: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  walk: '走路',
  run: '跑步',
  strength: '重訓',
  yoga: '瑜珈',
  cardio: '有氧',
  other: '其他',
};

const TYPE_ORDER: ActivityType[] = [
  'walk',
  'run',
  'strength',
  'yoga',
  'cardio',
  'other',
];

export function ActivityLogSection({
  date,
  rows,
}: {
  date: string;
  rows: ActivityLogRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<ActivityType>('walk');
  const [minutes, setMinutes] = useState('30');
  const [calEst, setCalEst] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const m = Number(minutes.replace(',', '.'));
    if (!Number.isFinite(m) || m < 1 || m > 1440) {
      setCalEst('');
      return;
    }
    const rate = KCAL_PER_MINUTE[activityType];
    setCalEst(String(Math.round(rate * m)));
  }, [activityType, minutes]);

  const dayTotalMin = rows.reduce((s, r) => s + r.duration_minutes, 0);

  async function onSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await insertActivityLogAction({
        loggedDate: date,
        activityType,
        durationMinutes: Number(minutes.replace(',', '.')),
        caloriesEst: calEst.trim() ? Number(calEst.replace(',', '.')) : null,
        notes: notes.trim() || null,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setMinutes('30');
      setCalEst('');
      setNotes('');
      router.refresh();
    });
  }

  async function onDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteActivityLogAction(id);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const mealPillPrimary =
    'h-9 shrink-0 rounded-full px-4 text-[13px] font-medium border-[0.5px] border-transparent';
  const mealPillInactive =
    'h-9 shrink-0 rounded-full px-4 text-[13px] font-medium border-[0.5px] border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground';

  return (
    <div className="space-y-3">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>新增運動</CardTitle>
          <CardDescription>
            手動記錄運動類型與時間；估計消耗會依類型與分鐘自動帶入（可修改，仍非醫療建議）。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <p className="text-[13px] text-destructive">{error}</p>
          ) : null}
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              類型
            </p>
            <div className="flex flex-wrap gap-2">
              {TYPE_ORDER.map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={activityType === t ? 'default' : 'ghost'}
                  className={activityType === t ? mealPillPrimary : mealPillInactive}
                  onClick={() => setActivityType(t)}
                >
                  {TYPE_LABEL[t]}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground">
                時長（分鐘）
              </label>
              <Input
                type="number"
                min={1}
                max={1440}
                className="mt-1 tabular-nums"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">
                估計消耗 kcal（選填）
              </label>
              <Input
                type="number"
                min={0}
                className="mt-1 tabular-nums"
                value={calEst}
                onChange={(e) => setCalEst(e.target.value)}
                placeholder="—"
              />
              <p className="mt-1 text-[10px] font-normal leading-snug text-muted-foreground">
                此類型約 {KCAL_PER_MINUTE[activityType]} kcal／分（估計值）
              </p>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">備註（選填）</label>
            <Input
              className="mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="例：操场 5 圈"
              maxLength={500}
            />
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={pending}
            onClick={() => void onSubmit()}
          >
            {pending ? '儲存中…' : '加入紀錄'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-medium text-foreground">
            {date} 的運動
          </h2>
          <p className="text-[11px] text-muted-foreground">
            合計{' '}
            <span className="tabular-nums font-medium text-foreground">
              {dayTotalMin}
            </span>{' '}
            分鐘
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">尚無紀錄</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-xl border-[0.5px] border-border bg-card px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground">
                    {TYPE_LABEL[r.activity_type] ?? r.activity_type}
                    <span className="ml-1.5 text-[11px] font-normal tabular-nums text-muted-foreground">
                      {r.duration_minutes} 分鐘
                    </span>
                  </p>
                  {r.calories_est != null ? (
                    <p className="text-[11px] text-muted-foreground">
                      估 {Math.round(Number(r.calories_est))} kcal
                    </p>
                  ) : null}
                  {r.notes ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {r.notes}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="刪除"
                  disabled={pending}
                  className={cn(
                    'shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:text-destructive',
                    pending && 'opacity-50',
                  )}
                  onClick={() => void onDelete(r.id)}
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
