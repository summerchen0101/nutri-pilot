import { NextResponse } from 'next/server';

import { getOrCreateDashboardDailyInsight } from '@/lib/ai/run-dashboard-insight';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await getOrCreateDashboardDailyInsight(supabase, user.id);

  if (result.status !== 200) {
    return NextResponse.json(
      { error: result.error ?? '失敗' },
      { status: result.status },
    );
  }

  return NextResponse.json({ bullets: result.bullets });
}
