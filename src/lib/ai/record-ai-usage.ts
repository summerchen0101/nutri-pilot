import type { SupabaseClient } from '@supabase/supabase-js';

import { billingMonthTaipei } from '@/lib/datetime/billing-month-taipei';
import type { ClaudeTokenUsage } from '@/lib/ai/cost-ntd';
import { tokensToCostNtd } from '@/lib/ai/cost-ntd';
import type { Database } from '@/types/supabase';

export type AiUsageSource =
  | 'photo_meal'
  | 'label_guard'
  | 'quick_log'
  | 'analyze_food';

/**
 * 寫入 ai_usage_events（需 service role client）。
 * 失敗只記錄 log，不拋錯以免影響已成功的 AI 回應。
 */
export async function insertAiUsageEvent(
  admin: SupabaseClient<Database>,
  params: {
    userId: string;
    source: AiUsageSource;
    usage: ClaudeTokenUsage | null;
  },
): Promise<void> {
  const costNtd = tokensToCostNtd(params.usage);
  let billingMonth: string;
  try {
    billingMonth = billingMonthTaipei();
  } catch (e) {
    console.error('insertAiUsageEvent: billing month', e);
    return;
  }

  const { error } = await admin.from('ai_usage_events').insert({
    user_id: params.userId,
    billing_month: billingMonth,
    source: params.source,
    input_tokens: params.usage?.input_tokens ?? null,
    output_tokens: params.usage?.output_tokens ?? null,
    cost_ntd: costNtd,
  });

  if (error) {
    console.error('insertAiUsageEvent:', error.message, error);
  }
}
