import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const extractedAt = new Date().toISOString();
  const { error: updErr } = await supabase
    .from('user_profiles')
    .update({
      personal_context_facets: null,
      updated_at: extractedAt,
    })
    .eq('user_id', user.id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
