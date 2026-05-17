import { DashboardInsightFab } from '@/app/(main)/dashboard/dashboard-insight-fab';
import { getOrCreateDashboardDailyInsight } from '@/lib/ai/run-dashboard-insight';
import { getCachedAuthContext } from '@/lib/auth';

export async function DashboardDailyInsightDeferred() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) {
    return null;
  }

  const result = await getOrCreateDashboardDailyInsight(supabase, user.id);
  const bullets =
    result.status === 200 && Array.isArray(result.bullets) ? result.bullets : [];

  return (
    <DashboardInsightFab
      userId={user.id}
      insightPeriodDate={result.insightPeriodDate}
      justGenerated={result.justGenerated}
      bullets={bullets}
      status={result.status}
      error={result.error}
    />
  );
}
