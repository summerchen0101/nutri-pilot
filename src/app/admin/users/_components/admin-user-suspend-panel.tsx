'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

const FN_PATH = '/functions/v1/admin-suspend-user';

interface AdminUserSuspendPanelProps {
  readonly targetUserId: string;
}

export function AdminUserSuspendPanel({ targetUserId }: AdminUserSuspendPanelProps) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function invoke(suspend: boolean): Promise<string | null> {
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!baseUrl || !anon) return '缺少 NEXT_PUBLIC_SUPABASE_URL 或 ANON_KEY';

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return '請重新登入';

    if (session.user.id === targetUserId) {
      return '無法對自己的帳號執行停用';
    }

    const res = await fetch(`${baseUrl}${FN_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anon,
      },
      body: JSON.stringify({ targetUserId, suspend }),
    });

    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      return json &&
        typeof json === 'object' &&
        'error' in json &&
        typeof (json as { error: unknown }).error === 'string'
        ? (json as { error: string }).error
        : `請求失敗（${res.status}）`;
    }

    return null;
  }

  function onSuspendClicked() {
    if (
      typeof window !== 'undefined'
      && !window.confirm(
        '將於 Auth 套用長期 ban（對方將無法登入）。確認停用此使用者？',
      )
    ) {
      return;
    }

    setMsg(null);
    startTransition(() => {
      void (async () => {
        const err = await invoke(true);
        setMsg(err ?? '已送出停用請求');
      })();
    });
  }

  function onUnsuspendClicked() {
    setMsg(null);
    startTransition(() => {
      void (async () => {
        const err = await invoke(false);
        setMsg(err ?? '已送出解除停用請求');
      })();
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
      <h2 className="text-heading-section text-foreground">停用帳號</h2>
      <p className="mt-2 text-body text-muted-foreground leading-relaxed">
        Edge Function（service role）更新 Auth ban；請避免對一般用戶濫用以符合隱私與法令。
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          className="border-[#E55A3C]/40 text-[#E55A3C]"
          onClick={onSuspendClicked}
        >
          {pending ? '處理中…' : '停用使用者'}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onUnsuspendClicked}>
          解除停用
        </Button>
      </div>
      {msg ? <p className="mt-2 text-caption text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
