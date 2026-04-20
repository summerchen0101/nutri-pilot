import type { SupabaseClient } from '@supabase/supabase-js';

/** 該餐是否已完成打卡決策（含跳過）。「調整中」(modified 且未 checked_in) 不算完成。 */
export function isMealCheckInResolved(row: {
  is_checked_in: boolean | null;
  checkin_type: string | null;
}): boolean {
  return (
    Boolean(row.is_checked_in) || row.checkin_type === 'skipped'
  );
}

export async function refreshDailyMenuCompletion(
  supabase: SupabaseClient,
  menuId: string,
): Promise<{ error?: string }> {
  const { data: meals, error } = await supabase
    .from('meals')
    .select('is_checked_in, checkin_type')
    .eq('menu_id', menuId);

  if (error) return { error: error.message };

  const total = meals?.length ?? 0;
  const accounted =
    meals?.filter((m) =>
      isMealCheckInResolved({
        is_checked_in: m.is_checked_in,
        checkin_type: m.checkin_type ?? null,
      }),
    ).length ?? 0;
  const completionPct =
    total ? Math.round((accounted / total) * 1000) / 10 : 0;

  const { error: upErr } = await supabase
    .from('daily_menus')
    .update({
      completion_pct: completionPct,
      is_completed: total > 0 && accounted === total,
    })
    .eq('id', menuId);

  if (upErr) return { error: upErr.message };
  return {};
}
