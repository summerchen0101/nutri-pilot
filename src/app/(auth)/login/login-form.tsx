'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage(null);

    const supabase = createClient();
    const redirectUrl = `${window.location.origin}/auth/callback?next=/dashboard`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    setStatus('sent');
    setMessage('已寄出登入連結，請查收信箱（含垃圾信匣）。');
  }

  return (
    <Card className="w-full max-w-md border-slate-200 shadow-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">登入 Nutri Guard</CardTitle>
        <CardDescription>
          輸入電子郵件，我們會寄送 Magic Link 登入連結。
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
            />
          </div>
          {message ? (
            <p
              className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-slate-600'}`}
              role="status"
            >
              {message}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t border-slate-100 pt-6">
          <Button
            type="submit"
            variant="default"
            className="w-full"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? '寄送中…' : '寄送登入連結'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
