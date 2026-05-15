import { Lightbulb } from 'lucide-react';

import { getOrCreateDashboardDailyInsight } from '@/lib/ai/run-dashboard-insight';
import { getCachedAuthContext } from '@/lib/auth';

import { SectionHeading } from '@/components/ui/section-heading';

export async function DashboardDailyInsightDeferred() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) {
    return null;
  }

  const result = await getOrCreateDashboardDailyInsight(supabase, user.id);

  const bullets =
    result.status === 200 && Array.isArray(result.bullets) ? result.bullets : [];

  return (
    <section className="rounded-xl bg-primary-light p-4">
      <SectionHeading icon={Lightbulb} tone="primary">
        今日建議
      </SectionHeading>
      {result.status !== 200 && result.error ? (
        <p className="mt-3 text-caption text-destructive">{result.error}</p>
      ) : null}
      {bullets.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {bullets.map((text, idx) => (
            <li key={`${idx}-${text.slice(0, 20)}`} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span className="text-[13px] leading-relaxed text-primary-foreground">
                {text}
              </span>
            </li>
          ))}
        </ul>
      ) : result.status === 200 ? (
        <p className="mt-3 text-caption text-muted-foreground">尚無建議內容。</p>
      ) : null}
    </section>
  );
}
