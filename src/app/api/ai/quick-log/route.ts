import { NextResponse } from 'next/server';

import { callClaudeJSON } from '@/lib/ai/claude';
import type { ClaudeImageMediaType } from '@/lib/ai/image-file-to-claude-payload';
import type { ClaudeTokenUsage } from '@/lib/ai/token-usage-to-ai-quota';
import { insertAiUsageEvent } from '@/lib/ai/record-ai-usage';
import { buildQuickLogIntentPrompt } from '@/lib/ai/prompts/quick-log-intent';
import { buildQuickLogRevisePrompt } from '@/lib/ai/prompts/quick-log-revise';
import { personalFacetsToPromptBrief } from '@/lib/personal-context/facets-to-prompt-brief';
import {
  personalContextFacetsHasContent,
} from '@/lib/personal-context/normalize-facets';
import { parsePersonalContextFacetsFromDb } from '@/lib/personal-context/parse-from-db';
import { validateQuickLogClaudePayload } from '@/lib/quick-log/validate-quick-log-response';
import { createServiceRoleClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type ClaudeQuickLogShape = {
  summary_zh?: string | null;
  summaryZh?: string | null;
  entries?: unknown[];
};

const MAX_IMAGE_BASE64_CHARS = 2_800_000;
const MAX_REVISION_INSTRUCTION_CHARS = 500;

const ALLOWED_IMAGE_MEDIA: ClaudeImageMediaType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

function parseImagePayload(rec: Record<string, unknown>): {
  imageBase64: string;
  imageMediaType: ClaudeImageMediaType;
} | null {
  const raw =
    typeof rec.imageBase64 === 'string' ? rec.imageBase64.trim() : '';
  if (raw.length < 1) return null;
  if (raw.length > MAX_IMAGE_BASE64_CHARS) {
    return null;
  }
  const mediaRaw =
    typeof rec.imageMediaType === 'string' ?
      rec.imageMediaType.trim()
    : 'image/jpeg';
  if (!ALLOWED_IMAGE_MEDIA.includes(mediaRaw as ClaudeImageMediaType)) {
    return null;
  }
  return {
    imageBase64: raw,
    imageMediaType: mediaRaw as ClaudeImageMediaType,
  };
}

function parseRevisionPayload(rec: Record<string, unknown>): {
  revisionInstruction: string;
  currentEntries: unknown[];
} | null {
  const revisionInstruction =
    typeof rec.revisionInstruction === 'string' ?
      rec.revisionInstruction.trim().slice(0, MAX_REVISION_INSTRUCTION_CHARS)
    : '';
  const rawEntries = rec.currentEntries;
  if (!Array.isArray(rawEntries) || rawEntries.length < 1) {
    return null;
  }
  for (const item of rawEntries) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as Record<string, unknown>).kind !== 'string'
    ) {
      return null;
    }
  }
  if (revisionInstruction.length < 1) {
    return null;
  }
  return { revisionInstruction, currentEntries: rawEntries };
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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDateIso)) {
    return NextResponse.json({ error: '參考日期格式不正確' }, { status: 422 });
  }

  const revisionPayload = parseRevisionPayload(rec);
  const imagePayload = parseImagePayload(rec);
  const isReviseMode = revisionPayload != null;

  if (!isReviseMode && message.length < 1 && !imagePayload) {
    return NextResponse.json(
      { error: '請輸入描述或附上照片' },
      { status: 422 },
    );
  }

  const { data: profileRow } = await supabase
    .from('user_profiles')
    .select('personal_context_facets')
    .eq('user_id', user.id)
    .maybeSingle();

  const storedFacets = parsePersonalContextFacetsFromDb(
    profileRow?.personal_context_facets,
  );
  const personalFacetsBrief =
    storedFacets && personalContextFacetsHasContent(storedFacets) ?
      personalFacetsToPromptBrief(storedFacets)
    : '';

  const prompt =
    isReviseMode ?
      buildQuickLogRevisePrompt({
        referenceDateIso,
        waterMlKnownToday,
        currentEntriesJson: JSON.stringify(revisionPayload.currentEntries),
        revisionInstruction: revisionPayload.revisionInstruction,
        personalFacetsBrief: personalFacetsBrief || undefined,
      })
    : buildQuickLogIntentPrompt({
        referenceDateIso,
        userMessage: message,
        waterMlKnownToday,
        hasAttachedImage: imagePayload != null,
        personalFacetsBrief: personalFacetsBrief || undefined,
      });

  let parsed: ClaudeQuickLogShape;
  let usage: ClaudeTokenUsage | null = null;
  try {
    const out = await callClaudeJSON<ClaudeQuickLogShape>(
      prompt,
      isReviseMode ? undefined : (imagePayload ?? undefined),
    );
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
