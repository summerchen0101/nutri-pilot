import { NextResponse } from 'next/server';

import { callClaudeJSON } from '@/lib/ai/claude';
import type { ClaudeTokenUsage } from '@/lib/ai/token-usage-to-ai-quota';
import { insertAiUsageEvent } from '@/lib/ai/record-ai-usage';
import { buildQuickLogIntentPrompt } from '@/lib/ai/prompts/quick-log-intent';
import { validateQuickLogClaudePayload } from '@/lib/quick-log/validate-quick-log-response';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type ClaudeQuickLogShape = {
  summary_zh?: string | null;
  summaryZh?: string | null;
  entries?: unknown[];
};

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

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const message =
    typeof rec.message === 'string' ?
      rec.message.trim()
    : '';
  const referenceDateIso =
    typeof rec.referenceDateIso === 'string' ?
      rec.referenceDateIso.trim()
    : '';
  let waterMlKnownToday: number | null = null;
  if ('waterMlKnownToday' in rec && rec.waterMlKnownToday != null) {
    const w = Number(rec.waterMlKnownToday);
    if (Number.isFinite(w) && w >= 0 && w <= 8000) {
      waterMlKnownToday = Math.round(w);
    }
  }

  if (message.length < 1) {
    return NextResponse.json({ error: '請輸入要紀錄的內容' }, { status: 422 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDateIso)) {
    return NextResponse.json({ error: '參考日期格式不正確' }, { status: 422 });
  }

  const prompt = buildQuickLogIntentPrompt({
    referenceDateIso,
    userMessage: message,
    waterMlKnownToday,
  });

  let parsed: ClaudeQuickLogShape;
  let usage: ClaudeTokenUsage | null = null;
  try {
    const out = await callClaudeJSON<ClaudeQuickLogShape>(prompt);
    parsed = out.data;
    usage = out.usage;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '解析失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const validated = validateQuickLogClaudePayload(parsed as unknown);

  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 422 });
  }

  try {
    const admin = createServiceRoleClient();
    await insertAiUsageEvent(admin, {
      userId: user.id,
      source: 'quick_log',
      usage,
    });
  } catch (e) {
    console.error('quick-log record AI usage:', e);
  }

  return NextResponse.json({
    summaryZh: validated.summaryZh,
    entries: validated.entries,
  });
}
