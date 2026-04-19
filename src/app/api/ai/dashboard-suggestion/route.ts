import { NextResponse } from 'next/server';

import { callClaude } from '@/lib/ai/claude';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    todayKcal?: number;
    targetKcal?: number | null;
    weightKg?: number | null;
    streakDays?: number;
    carbG?: number;
    proteinG?: number;
    fatG?: number;
  } = {};

  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const todayKcal = Number(body.todayKcal ?? 0);
  const targetKcal =
    body.targetKcal != null ? Number(body.targetKcal) : null;
  const weightKg =
    body.weightKg != null ? Number(body.weightKg) : null;
  const streakDays = Number(body.streakDays ?? 0);
  const carbG = Number(body.carbG ?? 0);
  const proteinG = Number(body.proteinG ?? 0);
  const fatG = Number(body.fatG ?? 0);

  const prompt = `你是台灣使用者 App 內的營養助理。請用繁體中文、語氣自然簡潔（約 80–120 字），給「今日」一則可行的小建議。
使用者數據（今日）：
- 已攝取熱量約 ${todayKcal} kcal${targetKcal != null && Number.isFinite(targetKcal) ? `，目標約 ${targetKcal} kcal` : ''}
- 巨量營養概況：碳水約 ${Math.round(carbG)} g、蛋白質約 ${Math.round(proteinG)} g、脂肪約 ${Math.round(fatG)} g
${weightKg != null && Number.isFinite(weightKg) ? `- 最近體重約 ${weightKg} kg\n` : ''}${streakDays > 0 ? `- 連續紀錄／打卡 ${streakDays} 天\n` : ''}
不要列出醫療診斷；若有健康疑慮請溫和提醒諮詢專業人員。只輸出建議本文，不要標題或項目符號。`;

  try {
    const text = (await callClaude(prompt)).trim();
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '無法取得建議';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
