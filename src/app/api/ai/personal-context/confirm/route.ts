import { NextResponse } from 'next/server';

import {
  normalizeFacetsFromUnknown,
  personalContextFacetsHasContent,
} from '@/lib/personal-context/normalize-facets';
import type { Json } from '@/types/supabase';
import { createClient } from '@/lib/supabase/server';

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
  const facetsRaw = rec.facets;

  const extractedAt = new Date().toISOString();
  const normalized = normalizeFacetsFromUnknown(facetsRaw, extractedAt);

  if (!normalized || !personalContextFacetsHasContent(normalized)) {
    return NextResponse.json({ error: '面向資料無效或為空' }, { status: 422 });
  }

  const { error: updErr } = await supabase
    .from('user_profiles')
    .update({
      personal_context_facets: normalized as unknown as Json,
      updated_at: extractedAt,
    })
    .eq('user_id', user.id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
