import { redirect } from 'next/navigation';

import { LoginForm } from './login-form';
import { createClient } from '@/lib/supabase/server';

export default async function LoginPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex justify-center py-12">
      <LoginForm />
    </div>
  );
}
