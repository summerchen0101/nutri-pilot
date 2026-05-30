'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

function resolveNextPath(raw: string | null): string {
  if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }
  return '/dashboard';
}

function navigateAfterAuth(next: string): void {
  window.location.replace(next);
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('登入中…');
  const exchangeStartedRef = useRef(false);

  useEffect(() => {
    if (exchangeStartedRef.current) {
      return;
    }
    exchangeStartedRef.current = true;

    const code = searchParams.get('code');
    const next = resolveNextPath(searchParams.get('next'));

    if (!code) {
      router.replace('/auth/auth-code-error');
      return;
    }

    const supabase = createClient();

    void (async () => {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession) {
        navigateAfterAuth(next);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const {
          data: { session: retrySession },
        } = await supabase.auth.getSession();
        if (retrySession) {
          navigateAfterAuth(next);
          return;
        }
        setMessage('無法完成登入');
        router.replace('/auth/auth-code-error');
        return;
      }
      navigateAfterAuth(next);
    })();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <p className="text-body text-slate-600" role="status">
        {message}
      </p>
    </div>
  );
}
