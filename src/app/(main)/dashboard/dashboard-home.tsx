'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { logWeightAction } from '@/app/(main)/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface DashboardHomeProps {
  displayName: string;
  latestWeightKg: number | null;
  latestWeightDate: string | null;
  heightCm: number;
  profileBmi: number | null;
}

export function DashboardHome({
  displayName,
  latestWeightKg,
  latestWeightDate,
  heightCm,
  profileBmi,
}: DashboardHomeProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const w = parseFloat(weightInput.replace(',', '.'));
    startTransition(async () => {
      const res = await logWeightAction(w);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setWeightInput('');
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-slate-900">
          嗨，{displayName}
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          首頁 · 快速記錄與捷徑
        </p>
      </div>

      <Card className="mb-6 border-[0.5px] border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px] font-medium">體重</CardTitle>
          <CardDescription className="text-[11px]">
            {latestWeightDate
              ? `最近紀錄 · ${latestWeightDate}`
              : '尚無體重紀錄'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] text-slate-500">目前體重</p>
            <p className="mt-0.5 text-[20px] font-medium tabular-nums text-slate-900">
              {latestWeightKg != null ? (
                <>
                  {latestWeightKg}
                  <span className="text-[13px] font-normal text-slate-500">
                    {' '}
                    kg
                  </span>
                </>
              ) : (
                <span className="text-[13px] font-normal text-slate-400">
                  —
                </span>
              )}
            </p>
            {profileBmi != null && (
              <p className="mt-1 text-[11px] text-slate-500">
                BMI {profileBmi}（身高 {heightCm} cm）
              </p>
            )}
          </div>
          <Button
            type="button"
            className="rounded-[10px] bg-[#1B7A5A] text-white hover:bg-[#156347]"
            onClick={() => {
              setOpen(true);
              setError(null);
              if (latestWeightKg != null) {
                setWeightInput(String(latestWeightKg));
              }
            }}
          >
            記錄體重
          </Button>
        </CardContent>
      </Card>

      <div>
        <p className="mb-2 text-[11px] font-medium text-slate-500">快速操作</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/log"
            className="inline-flex items-center justify-center rounded-[10px] border border-[#1B7A5A] px-4 py-2 text-[13px] font-medium text-[#1B7A5A] hover:bg-[#E0F5EE]"
          >
            記錄飲食
          </Link>
          <Link
            href="/plan"
            className="inline-flex items-center justify-center rounded-[10px] border border-[#1B7A5A] px-4 py-2 text-[13px] font-medium text-[#1B7A5A] hover:bg-[#E0F5EE]"
          >
            今日計畫
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[10px] border border-[#1B7A5A] px-4 py-2 text-[13px] font-medium text-[#1B7A5A] hover:bg-[#E0F5EE]"
            onClick={() => {
              setOpen(true);
              setError(null);
              if (latestWeightKg != null) {
                setWeightInput(String(latestWeightKg));
              }
            }}
          >
            量體重
          </button>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="weight-dialog-title"
            className="w-full max-w-sm rounded-2xl border-[0.5px] border-slate-200 bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="weight-dialog-title"
              className="text-[15px] font-medium text-slate-900"
            >
              記錄今日體重
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              將寫入今日紀錄並更新個人資料與熱量目標（如有）。
            </p>
            <div className="mt-4">
              <label htmlFor="weight-kg" className="sr-only">
                體重（公斤）
              </label>
              <Input
                id="weight-kg"
                type="text"
                inputMode="decimal"
                placeholder="例如 65.5"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="rounded-[10px] border-slate-300"
                autoFocus
                disabled={pending}
              />
            </div>
            {error ? (
              <p className="mt-2 text-[11px] text-red-600">{error}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-[10px]"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                className="rounded-[10px] bg-[#1B7A5A] text-white hover:bg-[#156347]"
                disabled={pending}
                onClick={submit}
              >
                {pending ? '儲存中…' : '儲存'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
