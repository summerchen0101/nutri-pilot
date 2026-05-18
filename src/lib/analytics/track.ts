'use client';

import { createClient } from '@/lib/supabase/client';

export type ProductAnalyticsSource = string;

export type ProductAnalyticsEventType =
  | 'impression'
  | 'click'
  | 'add_to_cart'
  | 'purchase';

/**
 * 前台商城埋點（fire-and-forget；失敗不影響 UI）
 */
export function trackProductEvent(
  productId: string,
  eventType: ProductAnalyticsEventType,
  source?: ProductAnalyticsSource | null,
): void {
  const supabase = createClient();

  void supabase.auth.getSession().then(({ data: { session } }) => {
    void supabase
      .from('product_events')
      .insert({
        product_id: productId,
        event_type: eventType,
        source: source ?? null,
        user_id: session?.user.id ?? null,
      })
      .then(() => undefined);
  });
}
