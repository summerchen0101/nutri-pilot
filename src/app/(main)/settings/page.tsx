import { redirect } from 'next/navigation';

import {
  SettingsView,
  type SettingsInitialData,
} from '@/app/(main)/settings/settings-view';
import { createClient } from '@/lib/supabase/server';

function normalizeSubscriptions(
  raw: unknown,
): SettingsInitialData['subscriptions'] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => {
    const row = s as {
      id: string;
      status: string;
      frequency: string;
      next_ship_at: string | null;
      created_at: string | null;
      subscription_items?: unknown;
    };
    const itemsIn = row.subscription_items;
    const itemsOut: NonNullable<
      SettingsInitialData['subscriptions'][0]['subscription_items']
    > = [];
    if (Array.isArray(itemsIn)) {
      for (const it of itemsIn) {
        const i = it as { qty: number; variant: unknown };
        const v = i.variant;
        const varRow = (Array.isArray(v) ? v[0] : v) as
          | {
              label: string;
              price: number;
              sub_price: number | null;
              product: unknown;
            }
          | null
          | undefined;
        if (!varRow) {
          itemsOut.push({ qty: i.qty, variant: null });
          continue;
        }
        const p = varRow.product;
        const prod = (Array.isArray(p) ? p[0] : p) as
          | { name: string }
          | null
          | undefined;
        itemsOut.push({
          qty: i.qty,
          variant: {
            label: varRow.label,
            price: Number(varRow.price),
            sub_price: varRow.sub_price,
            product: prod ? { name: prod.name } : null,
          },
        });
      }
    }
    return {
      id: row.id,
      status: row.status,
      frequency: row.frequency,
      next_ship_at: row.next_ship_at,
      created_at: row.created_at,
      subscription_items: itemsOut,
    };
  });
}

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [
    { data: profile, error: profileErr },
    { data: goal },
    { data: subscriptions },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
    supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select(
        `
        id,
        status,
        frequency,
        next_ship_at,
        created_at,
        subscription_items (
          qty,
          variant:product_variants (
            label,
            price,
            sub_price,
            product:products ( name )
          )
        )
      `,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  if (profileErr || !profile) redirect('/onboarding');
  if (!goal) redirect('/onboarding');

  const initial: SettingsInitialData = {
    name: profile.name ?? '',
    heightCm: Number(profile.height_cm),
    weightKg: Number(profile.weight_kg),
    bmi: profile.bmi != null ? Number(profile.bmi) : null,
    dietType: profile.diet_type,
    mealFrequency: profile.meal_frequency ?? 3,
    avoidFoods: profile.avoid_foods ?? [],
    allergens: profile.allergens ?? [],
    dietMethod: profile.diet_method ?? 'mediterranean',
    goal: {
      type: goal.type,
      targetWeightKg: Number(goal.target_weight_kg),
      weeklyRateKg: Number(goal.weekly_rate_kg),
      dailyCalTarget: Number(goal.daily_cal_target),
      targetDate: goal.target_date ?? null,
    },
    subscriptions: normalizeSubscriptions(subscriptions),
  };

  return <SettingsView initial={initial} />;
}
