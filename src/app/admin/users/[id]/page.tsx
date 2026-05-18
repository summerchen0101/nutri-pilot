import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export default async function AdminUserDetailPage({
  params,
}: Readonly<{ params: { id: string } }>) {
  const supabase = createClient();
  const userId = params.id;

  const [{ data: profile, error: pErr }, { data: goals, error: gErr }, { data: orders, error: oErr }] =
    await Promise.all([
      supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_goals').select('id, type, is_active').eq('user_id', userId),
      supabase
        .from('orders')
        .select('id, status, total, created_at, public_order_no')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

  if (pErr) {
    throw new Error(pErr.message);
  }
  if (gErr) {
    throw new Error(gErr.message);
  }
  if (oErr) {
    throw new Error(oErr.message);
  }

  if (!profile) {
    notFound();
  }

  const { data: emailRaw, error: eErr } = await supabase.rpc(
    'admin_user_email_for_staff',
    { p_user_id: userId },
  );

  if (eErr) {
    throw new Error(eErr.message);
  }

  const email = emailRaw ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/admin/users"
        className="text-caption text-[#4C956C] hover:underline"
      >
        ← 用戶列表
      </Link>

      <div>
        <h1 className="text-heading-screen text-foreground">用戶詳情</h1>
        <p className="mt-1 font-mono text-caption text-slate-600">{userId}</p>
      </div>

      <section className="rounded-xl border border-border bg-background p-4">
        <h2 className="text-heading-section text-foreground">基本</h2>
        <dl className="mt-3 grid gap-3 text-body sm:grid-cols-2">
          <div>
            <dt className="text-caption text-slate-600">姓名</dt>
            <dd>{profile.name}</dd>
          </div>
          <div>
            <dt className="text-caption text-slate-600">Email</dt>
            <dd>{email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-caption text-slate-600">飲食法（檔案）</dt>
            <dd>{profile.diet_method ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-background p-4">
        <h2 className="text-heading-section text-foreground">目標</h2>
        <ul className="mt-3 space-y-2 text-body">
          {(goals ?? []).map((g) => (
            <li key={g.id}>
              {g.type}
              {g.is_active ? (
                <span className="text-caption text-slate-600">（進行中）</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-background p-4">
        <h2 className="text-heading-section text-foreground">最近訂單</h2>
        <ul className="mt-3 divide-y divide-border">
          {(orders ?? []).length === 0 ? (
            <li className="py-2 text-caption text-slate-600">無訂單</li>
          ) : (
            (orders ?? []).map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-2 py-3">
                <span className="font-mono text-caption">
                  {o.public_order_no ?? o.id.slice(0, 8)}
                </span>
                <span>{o.status}</span>
                <span>
                  NT${' '}
                  {Number(o.total).toLocaleString('zh-TW', {
                    minimumFractionDigits: 0,
                  })}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
