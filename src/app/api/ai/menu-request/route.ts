import { NextResponse } from 'next/server';

import { buildQstashPublishRequestUrl } from '@/lib/qstash/build-qstash-publish-url';
import { normalizeEdgeFunctionsBaseUrl } from '@/lib/qstash/normalize-edge-functions-base-url';
import { normalizeQstashApiBaseUrl } from '@/lib/qstash/normalize-qstash-api-base-url';
import { createClient } from '@/lib/supabase/server';

async function publishToQStash(menuId: string): Promise<void> {
  const token = process.env.QSTASH_TOKEN;
  const qstashUrl = normalizeQstashApiBaseUrl(process.env.QSTASH_URL);
  const functionsUrlRaw =
    process.env.EDGE_FUNCTIONS_URL ?? process.env.SUPABASE_FUNCTIONS_URL;

  if (!token || !functionsUrlRaw) return;

  const destination = `${normalizeEdgeFunctionsBaseUrl(functionsUrlRaw)}/ai-menu-generate`;
  const publishUrl = buildQstashPublishRequestUrl(qstashUrl, destination);

  await fetch(publishUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ menuId }),
  });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const planId =
    typeof body === 'object' &&
    body !== null &&
    'planId' in body &&
    typeof (body as { planId: unknown }).planId === 'string'
      ? (body as { planId: string }).planId
      : null;

  const date =
    typeof body === 'object' &&
    body !== null &&
    'date' in body &&
    typeof (body as { date: unknown }).date === 'string'
      ? (body as { date: string }).date
      : null;

  if (!planId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: '需要提供 planId 與 date（YYYY-MM-DD）' },
      { status: 422 },
    );
  }

  const { data: planRow } = await supabase
    .from('diet_plans')
    .select('user_id')
    .eq('id', planId)
    .maybeSingle();

  if (!planRow || planRow.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from('daily_menus')
    .select('id, status')
    .eq('plan_id', planId)
    .eq('date', date)
    .maybeSingle();

  if (existing?.status === 'ready') {
    return NextResponse.json({
      menuId: existing.id,
      status: 'ready',
      queued: false,
    });
  }

  if (existing?.status === 'pending' || existing?.status === 'generating') {
    await publishToQStash(existing.id);
    return NextResponse.json({
      menuId: existing.id,
      status: existing.status,
      queued: true,
    });
  }

  if (existing?.status === 'error') {
    const { error: upErr } = await supabase
      .from('daily_menus')
      .update({ status: 'pending' })
      .eq('id', existing.id);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    await publishToQStash(existing.id);
    return NextResponse.json({
      menuId: existing.id,
      status: 'pending',
      queued: true,
      retried: true,
    });
  }

  const { data: inserted, error: insErr } = await supabase
    .from('daily_menus')
    .insert({
      plan_id: planId,
      date,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: insErr?.message ?? '無法建立菜單紀錄' },
      { status: 500 },
    );
  }

  await publishToQStash(inserted.id);

  const qstashConfigured = !!(
    process.env.QSTASH_TOKEN &&
    (process.env.EDGE_FUNCTIONS_URL ?? process.env.SUPABASE_FUNCTIONS_URL)
  );

  return NextResponse.json({
    menuId: inserted.id,
    status: 'pending',
    queued: qstashConfigured,
    hint: qstashConfigured
      ? undefined
      : '尚未設定 QSTASH_TOKEN / EDGE_FUNCTIONS_URL：菜單將維持 pending，請部署 ai-menu-generate 並發佈 Queue。',
  });
}
