import { NextResponse } from 'next/server';

import { callClaudeJSON } from '@/lib/ai/claude';
import { buildDashboardInsightPrompt } from '@/lib/ai/prompts/dashboard-insight';
import type { ClaudeTokenUsage } from '@/lib/ai/token-usage-to-ai-quota';
import { insertAiUsageEvent } from '@/lib/ai/record-ai-usage';
import { personalFacetsToPromptBrief } from '@/lib/personal-context/facets-to-prompt-brief';
import {
  personalContextFacetsHasContent,
} from '@/lib/personal-context/normalize-facets';
import { parsePersonalContextFacetsFromDb } from '@/lib/personal-context/parse-from-db';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type InsightShape = {
  bullets?: unknown;
};

function clampBullets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const t = item.trim();
    if (!t) continue;
    out.push(t.slice(0, 80));
    if (out.length >= 2) break;
  }
  return out;
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

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const todayKcal = Number(rec.todayKcal);
  const targetKcalRaw = rec.targetKcal;
  const targetKcal =
    targetKcalRaw === null || targetKcalRaw === undefined
      ? null
      : Number(targetKcalRaw);
  const carbG = Number(rec.carbG);
  const proteinG = Number(rec.proteinG);
  const fatG = Number(rec.fatG);

  if (
    !Number.isFinite(todayKcal) ||
    todayKcal < 0 ||
    todayKcal > 50000 ||
    !Number.isFinite(carbG) ||
    carbG < 0 ||
    carbG > 2000 ||
    !Number.isFinite(proteinG) ||
    proteinG < 0 ||
    proteinG > 2000 ||
    !Number.isFinite(fatG) ||
    fatG < 0 ||
    fatG > 2000
  ) {
    return NextResponse.json({ error: '營養數據格式不正確' }, { status: 422 });
  }

  if (
    targetKcal !== null &&
    (!Number.isFinite(targetKcal) || targetKcal < 0 || targetKcal > 50000)
  ) {
    return NextResponse.json({ error: '目標熱量格式不正確' }, { status: 422 });
  }

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('personal_context_facets')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return NextResponse.json({ error: '無法讀取個人檔案' }, { status: 500 });
  }

  const facets = parsePersonalContextFacetsFromDb(profile.personal_context_facets);
  if (!facets || !personalContextFacetsHasContent(facets)) {
    return NextResponse.json({ bullets: [] as string[] });
  }

  const brief = personalFacetsToPromptBrief(facets);
  if (!brief.trim()) {
    return NextResponse.json({ bullets: [] as string[] });
  }

  const prompt = buildDashboardInsightPrompt({
    todayKcal,
    targetKcal,
    carbG,
    proteinG,
    fatG,
    personalFacetsBrief: brief,
  });

  let usage: ClaudeTokenUsage | null = null;
  let parsed: InsightShape;
  try {
    const out = await callClaudeJSON<InsightShape>(prompt);
    parsed = out.data;
    usage = out.usage;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '解析失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const bullets = clampBullets(parsed.bullets);

  try {
    const admin = createServiceRoleClient();
    await insertAiUsageEvent(admin, {
      userId: user.id,
      source: 'dashboard_insight',
      usage,
    });
  } catch (e) {
    console.error('dashboard-insight record AI usage:', e);
  }

  return NextResponse.json({ bullets });
}
