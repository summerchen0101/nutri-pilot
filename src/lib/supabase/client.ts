'use client';

import { createBrowserClient } from '@supabase/ssr';

/** 未帶 `Database` 泛型：目前產生的型別含 `__InternalSupabase` 時，泛型 client 會誤推 `.update()` 為 `never`。查詢結果仍以 `Tables*` 輔助型別為準。 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
