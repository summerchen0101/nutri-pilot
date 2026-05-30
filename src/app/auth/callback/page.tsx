import { Suspense } from 'react';

import { AuthCallbackClient } from '@/app/auth/callback/auth-callback-client';

function AuthCallbackPending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <p className="text-body text-slate-600" role="status">
        登入中…
      </p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackPending />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
