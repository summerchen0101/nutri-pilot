import { NextResponse } from 'next/server';

import { callClaudeJSON } from '@/lib/ai/claude';
import type { ManualFoodAnalysisResult } from '@/lib/food/manual-food-analysis-result';
import { buildManualInputPrompt } from '@/lib/food/prompts';
import { fetchFoodCacheHintsForManualInput } from '@/lib/food/search';
import { createClient } from '@/lib/supabase/server';

function formatCacheReference(rows: Awaited<
  ReturnType<typeof fetchFoodCacheHintsForManualInput>
>): string[] {
  return rows.map((r) => {
    const kcal = Math.round(Number(r.calories_per_100g));
    return `「${r.name}」每 100g 約 ${kcal} kcal（蛋白 ${Math.round(Number(r.protein_g_per_100g))}g、碳水 ${Math.round(Number(r.carb_g_per_100g))}g、脂肪 ${Math.round(Number(r.fat_g_per_100g))}g）`;
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

  const input =
    typeof body === 'object' &&
    body !== null &&
    'input' in body &&
    typeof (body as { input: unknown }).input === 'string'
      ? (body as { input: string }).input.trim()
      : '';

  if (input.length < 1) {
    return NextResponse.json({ error: '請輸入食物描述' }, { status: 422 });
  }

  const hints = await fetchFoodCacheHintsForManualInput(supabase, input);
  const referenceLines =
    hints.length > 0 ? formatCacheReference(hints) : undefined;

  const prompt = buildManualInputPrompt(input, referenceLines);

  try {
    const result = await callClaudeJSON<ManualFoodAnalysisResult>(prompt);
    if (!result || typeof result !== 'object') {
      return NextResponse.json({ error: '分析結果格式異常' }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '分析失敗';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
