'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

const FN_PATH = '/functions/v1/set-admin-role';

export function AdminSetRoleForm() {
  const [targetUserId, setTargetUserId] = useState('');
  const [role, setRole] = useState<string>('editor');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!baseUrl || !anon) {
      setMsg('缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return;
    }

    startTransition(() => {
      void (async () => {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setMsg('請重新登入');
          return;
        }

        const body =
          role === ''
            ? { targetUserId: targetUserId.trim(), role: null }
            : { targetUserId: targetUserId.trim(), role };

        const res = await fetch(`${baseUrl}${FN_PATH}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: anon,
          },
          body: JSON.stringify(body),
        });

        const json: unknown = await res.json().catch(() => null);
        if (!res.ok) {
          const err =
            json &&
            typeof json === 'object' &&
            'error' in json &&
            typeof (json as { error: unknown }).error === 'string'
              ? (json as { error: string }).error
              : `請求失敗（${res.status}）`;
          setMsg(err);
          return;
        }

        setMsg('已更新後台角色。對方需重新整理或重新登入後生效。');
      })();
    });
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-4 rounded-xl border border-border bg-background p-4">
      <h2 className="text-heading-section text-foreground">指派後台角色</h2>
      <p className="text-body text-slate-600">
        僅 super_admin 可呼叫 Edge Function。targetUserId 為 Supabase Auth 使用者
        UUID。
      </p>
      <div className="space-y-2">
        <label className="text-body font-medium">targetUserId（UUID）</label>
        <Input
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          placeholder="使用者 UUID"
          required
          className="font-mono text-caption"
        />
      </div>
      <div className="space-y-2">
        <label className="text-body font-medium">角色</label>
        <select
          className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 text-body"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="super_admin">super_admin</option>
          <option value="editor">editor</option>
          <option value="cs">cs</option>
          <option value="">移除後台角色</option>
        </select>
      </div>
      <Button type="submit" variant="default" disabled={pending}>
        {pending ? '送出中…' : '套用'}
      </Button>
      {msg ? (
        <p className="text-body text-slate-700" role="status">
          {msg}
        </p>
      ) : null}
    </form>
  );
}
