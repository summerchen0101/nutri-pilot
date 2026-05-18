'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { adjustUserShopPoints } from '@/app/admin/shop-points/actions';
import { Button } from '@/components/ui/button';

export function ShopPointsAdjustForm() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [grantExpiresAt, setGrantExpiresAt] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const d = Number(delta);
    if (!Number.isFinite(d) || !Number.isInteger(d) || d === 0) {
      setMsg('異動點數須為非零整數');
      return;
    }
    startTransition(() => {
      void (async () => {
        const res = await adjustUserShopPoints({
          userId,
          delta: d,
          note,
          grantExpiresAt,
        });
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
        setMsg(`已更新，餘額 ${res.balanceAfter.toLocaleString('zh-TW')} 點`);
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4 rounded-xl border border-border bg-background p-4">
      <div className="space-y-1">
        <label htmlFor="sp-user" className="text-caption text-slate-600">
          使用者 UUID（<code className="text-micro">user_profiles.user_id</code>）
        </label>
        <input
          id="sp-user"
          className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 font-mono text-caption"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          required
          autoComplete="off"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="sp-delta" className="text-caption text-slate-600">
          異動點數（正數發放／負數扣回）
        </label>
        <input
          id="sp-delta"
          type="number"
          step={1}
          className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 text-body"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="sp-note" className="text-caption text-slate-600">
          備註（會寫入流水）
        </label>
        <textarea
          id="sp-note"
          rows={3}
          className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-body"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="sp-exp" className="text-caption text-slate-600">
          入帳批次到期（選填；僅正值發放時寫入 lot；留空則預設約 10 年）
        </label>
        <input
          id="sp-exp"
          type="datetime-local"
          className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 text-body"
          value={grantExpiresAt}
          onChange={(e) => setGrantExpiresAt(e.target.value)}
        />
      </div>
      <Button type="submit" variant="default" size="sm" disabled={pending}>
        {pending ? '送出中…' : '確認異動'}
      </Button>
      {msg ? <p className="text-body text-[#4C956C]">{msg}</p> : null}
    </form>
  );
}
