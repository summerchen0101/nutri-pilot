import { NextResponse } from 'next/server';

import { triggerRecalculateScores } from '@/lib/settings/trigger-recalculate-scores';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  void triggerRecalculateScores(user.id);
  return NextResponse.json({ ok: true });
}
