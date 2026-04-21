import { redirect } from 'next/navigation';

import { GuardLabelClient } from '@/app/(main)/guard/guard-label-client';
import { PageHeader } from '@/components/layout/page-header';
import { createClient } from '@/lib/supabase/server';

export default async function GuardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="space-y-3">
      <PageHeader
        title="守衛"
        description="食品標示智慧分析：拍下成分表，秒懂是否適合你與家人。"
        spacing="compact"
      />
      <GuardLabelClient />
    </div>
  );
}
