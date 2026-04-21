import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FiBookOpen } from 'react-icons/fi';

import { GuardLabelClient } from '@/app/(main)/guard/guard-label-client';
import { HEADER_ACTION_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
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
            aria-label="標籤紀錄"
            className={HEADER_ACTION_ICON_CLASS}
          >
            <FiBookOpen className="h-[18px] w-[18px]" aria-hidden />
          </Link>
        }
      />
      <GuardLabelClient />
    </div>
  );
}
