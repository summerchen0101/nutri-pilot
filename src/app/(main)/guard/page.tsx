import { redirect } from 'next/navigation';
import Link from 'next/link';

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
        action={
          <Link
            href="/guard/records"
            className="inline-flex items-center rounded-full border-[0.5px] border-primary/35 bg-white px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-light"
          >
            標籤紀錄
          </Link>
        }
      />
      <GuardLabelClient />
    </div>
  );
}
