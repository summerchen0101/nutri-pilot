import { NextResponse } from 'next/server';

import { callClaudeJSON } from '@/lib/ai/claude';
import type { ClaudeTokenUsage } from '@/lib/ai/token-usage-to-ai-quota';
import { buildPersonalContextExtractPrompt } from '@/lib/ai/prompts/personal-context-extract';
import { insertAiUsageEvent } from '@/lib/ai/record-ai-usage';
import {
  normalizeFacetsFromUnknown,
  personalContextFacetsHasContent,
} from '@/lib/personal-context/normalize-facets';
import { parsePersonalContextFacetsFromDb } from '@/lib/personal-context/parse-from-db';
import { PERSONAL_CONTEXT_INPUT_MAX_CHARS } from '@/lib/personal-context/types';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type ExtractShape = Record<string, unknown>;

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
  const text =
    typeof rec.text === 'string' ? rec.text.trim().slice(0, PERSONAL_CONTEXT_INPUT_MAX_CHARS) : '';

  if (text.length < 8) {
    return NextResponse.json(
      { error: '請至少輸入約 8 字以上，方便整理重點' },
      { status: 422 },
    );
  }

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('personal_context_facets, allergens, avoid_foods')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileErr || !profile) {
    return NextResponse.json({ error: '無法讀取個人檔案' }, { status: 500 });
  }

  const existing = parsePersonalContextFacetsFromDb(profile.personal_context_facets);
  const allergens = Array.isArray(profile.allergens) ? profile.allergens : [];
  const avoidFoods = Array.isArray(profile.avoid_foods) ? profile.avoid_foods : [];

  const prompt = buildPersonalContextExtractPrompt({
    userText: text,
    existingFacets: existing,
    allergens: allergens.filter((x): x is string => typeof x === 'string'),
    avoidFoods: avoidFoods.filter((x): x is string => typeof x === 'string'),
  });

  let parsed: ExtractShape;
  let usage: ClaudeTokenUsage | null = null;
  try {
    const out = await callClaudeJSON<ExtractShape>(prompt);
    parsed = out.data;
    usage = out.usage;
  } catch (e) {
    const msg = e instanceof Error ? e.message : '解析失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const preview = normalizeFacetsFromUnknown(
    parsed,
    new Date().toISOString(),
  );

  if (!preview || !personalContextFacetsHasContent(preview)) {
    return NextResponse.json(
      { error: '無法從內容整理出有效重點，請補充具體描述後再試' },
      { status: 422 },
    );
  }

  try {
    const admin = createServiceRoleClient();
    await insertAiUsageEvent(admin, {
      userId: user.id,
      source: 'personal_context_extract',
      usage,
    });
  } catch (e) {
    console.error('personal-context analyze record AI usage:', e);
  }

  return NextResponse.json({ facets: preview });
}
