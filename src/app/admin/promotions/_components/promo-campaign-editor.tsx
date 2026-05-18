'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import {
  addPromoCode,
  createPromoCampaign,
  deletePromoCode,
  updatePromoCampaign,
} from '@/app/admin/promotions/actions';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/types/supabase';

type CampaignRow = Tables<'promo_campaigns'>;

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface PromoCampaignEditorProps {
  mode: 'create' | 'edit';
  initial?: CampaignRow;
}

export function PromoCampaignEditor({ mode, initial }: PromoCampaignEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [discountKind, setDiscountKind] = useState<'percent' | 'fixed_amount'>(
    (initial?.discount_kind as 'percent' | 'fixed_amount') ?? 'percent',
  );
  const [discountValue, setDiscountValue] = useState(
    initial ? String(initial.discount_value) : '',
  );
  const [minOrderTotal, setMinOrderTotal] = useState(
    initial ? String(initial.min_order_total) : '0',
  );
  const [startsAt, setStartsAt] = useState(isoToDatetimeLocal(initial?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(isoToDatetimeLocal(initial?.ends_at ?? null));
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [showInMemberApp, setShowInMemberApp] = useState(
    initial?.show_in_member_app ?? false,
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!initial) return;
    setTitle(initial.title);
    setDescription(initial.description ?? '');
    setDiscountKind(initial.discount_kind as 'percent' | 'fixed_amount');
    setDiscountValue(String(initial.discount_value));
    setMinOrderTotal(String(initial.min_order_total));
    setStartsAt(isoToDatetimeLocal(initial.starts_at));
    setEndsAt(isoToDatetimeLocal(initial.ends_at));
    setIsActive(initial.is_active);
    setShowInMemberApp(initial.show_in_member_app);
  }, [initial]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const dv = Number(discountValue);
    const mo = Number(minOrderTotal);
    if (!Number.isFinite(dv)) {
      setMsg('折扣數值不正確');
      return;
    }
    if (!Number.isFinite(mo) || mo < 0) {
      setMsg('低消門檻不正確');
      return;
    }

    startTransition(() => {
      void (async () => {
        if (mode === 'create') {
          const res = await createPromoCampaign({
            title,
            description,
            discountKind,
            discountValue: dv,
            minOrderTotal: mo,
            startsAt,
            endsAt,
            isActive,
            showInMemberApp,
          });
          if (!res.ok) {
            setMsg(res.error);
            return;
          }
          router.push(`/admin/promotions/${res.id}`);
          router.refresh();
          return;
        }

        if (!initial) return;
        const res = await updatePromoCampaign({
          id: initial.id,
          title,
          description,
          discountKind,
          discountValue: dv,
          minOrderTotal: mo,
          startsAt,
          endsAt,
          isActive,
          showInMemberApp,
        });
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
        setMsg('已儲存');
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-background p-4">
      <div className="space-y-1">
        <label className="text-caption text-slate-600" htmlFor="pc-title">
          標題
        </label>
        <input
          id="pc-title"
          className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 text-body"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-caption text-slate-600" htmlFor="pc-desc">
          說明
        </label>
        <textarea
          id="pc-desc"
          rows={3}
          className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-body"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <label className="text-caption text-slate-600" htmlFor="pc-kind">
            折扣類型
          </label>
          <select
            id="pc-kind"
            className="flex h-11 min-w-[140px] rounded-[10px] border border-border bg-background px-3 text-body"
            value={discountKind}
            onChange={(e) => setDiscountKind(e.target.value as 'percent' | 'fixed_amount')}
          >
            <option value="percent">百分比</option>
            <option value="fixed_amount">固定金額折抵</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-caption text-slate-600" htmlFor="pc-val">
            {discountKind === 'percent' ? '折扣％' : '折抵金額（元）'}
          </label>
          <input
            id="pc-val"
            type="number"
            step="0.01"
            min={0}
            className="flex h-11 w-full min-w-[120px] rounded-[10px] border border-border bg-background px-3 text-body"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-caption text-slate-600" htmlFor="pc-min">
            訂單低消門檻（元）
          </label>
          <input
            id="pc-min"
            type="number"
            step="1"
            min={0}
            className="flex h-11 w-full min-w-[120px] rounded-[10px] border border-border bg-background px-3 text-body"
            value={minOrderTotal}
            onChange={(e) => setMinOrderTotal(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <label className="text-caption text-slate-600" htmlFor="pc-start">
            開始（選填）
          </label>
          <input
            id="pc-start"
            type="datetime-local"
            className="flex h-11 rounded-[10px] border border-border bg-background px-3 text-body"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-caption text-slate-600" htmlFor="pc-end">
            結束（選填）
          </label>
          <input
            id="pc-end"
            type="datetime-local"
            className="flex h-11 rounded-[10px] border border-border bg-background px-3 text-body"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-body">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        啟用
      </label>
      <label className="flex items-center gap-2 text-body">
        <input
          type="checkbox"
          checked={showInMemberApp}
          onChange={(e) => setShowInMemberApp(e.target.checked)}
        />
        於會員「優惠券」頁展示摘要（不含揭碼）
      </label>
      <Button type="submit" variant="default" size="sm" disabled={pending}>
        {pending ? '儲存中…' : mode === 'create' ? '建立活動' : '儲存變更'}
      </Button>
      {msg ? <p className="text-body text-slate-700">{msg}</p> : null}
    </form>
  );
}

type CodeRow = Tables<'promo_codes'>;

export function PromoCodesSection({
  campaignId,
  codes,
  canDelete,
}: Readonly<{
  campaignId: string;
  codes: CodeRow[];
  canDelete: boolean;
}>) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(() => {
      void (async () => {
        const res = await addPromoCode({ campaignId, code, maxUses });
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
        setCode('');
        setMaxUses('');
        router.refresh();
      })();
    });
  }

  function remove(id: string) {
    setMsg(null);
    startTransition(() => {
      void (async () => {
        const res = await deletePromoCode({ codeId: id, campaignId });
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
        router.refresh();
      })();
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-background p-4">
      <h2 className="text-heading-section text-foreground">優惠碼</h2>
      <p className="text-caption text-slate-600">
        建立後會自動轉成大寫。結帳核銷尚未接線時，碼僅供後台／客服人工使用。
      </p>
      <form onSubmit={add} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-caption text-slate-600" htmlFor="pc-code">
            新增碼
          </label>
          <input
            id="pc-code"
            className="flex h-11 rounded-[10px] border border-border bg-background px-3 font-mono text-caption uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-caption text-slate-600" htmlFor="pc-max">
            總次數上限（空＝不限）
          </label>
          <input
            id="pc-max"
            type="number"
            min={1}
            step={1}
            className="flex h-11 w-28 rounded-[10px] border border-border bg-background px-3 text-body"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          新增
        </Button>
      </form>
      {msg ? <p className="text-body text-red-600">{msg}</p> : null}
      <ul className="divide-y divide-border">
        {codes.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-body">
            <span className="font-mono text-caption">{c.code}</span>
            <span className="text-caption text-slate-600">
              已用 {c.uses_count}
              {c.max_uses != null ? `／上限 ${c.max_uses}` : '／不限'}
            </span>
            {canDelete ?
              <button
                type="button"
                className="text-caption text-red-600 hover:underline"
                onClick={() => remove(c.id)}
              >
                刪除
              </button>
            : null}
          </li>
        ))}
      </ul>
      {codes.length === 0 ?
        <p className="text-caption text-slate-500">尚無優惠碼</p>
      : null}
    </section>
  );
}
