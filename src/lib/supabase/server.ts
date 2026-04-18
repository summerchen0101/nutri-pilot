import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';


type CookieRow = Parameters<SetAllCookies>[0][number];

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieRow) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* Called from Server Component — cookie updates ignored (see Supabase SSR docs). */
          }
        },
      },
    },
  );
}
