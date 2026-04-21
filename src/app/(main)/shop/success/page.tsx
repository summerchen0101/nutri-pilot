import Link from 'next/link';
import { redirect } from 'next/navigation';

import { HeaderBackButton } from '@/components/layout/header-back-button';
import { PageHeader } from '@/components/layout/page-header';
import { createClient } from '@/lib/supabase/server';

interface PageProps {
  searchParams: { session_id?: string };
}

export default async function ShopSuccessPage({ searchParams }: PageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const sessionId = searchParams.session_id;

  return (
    <div className="space-y-4">
      <PageHeader leading={<HeaderBackButton />} title="付款處理完成" />
      <div className="rounded-xl border-[0.5px] border-border bg-card p-6 text-center">
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        感謝你的購買。若為訂閱方案，狀態會在幾秒內同步至「設定 → 我的訂閱」。
      </p>
      {sessionId ?
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          Session：{sessionId}
        </p>
      : null}
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/settings"
          className="inline-flex items-center justify-center rounded-[10px] bg-shadow-grey px-4 py-2.5 text-[13px] font-medium text-white hover:bg-shadow-grey-hover"
        >
          查看訂閱與設定
        </Link>
        <Link
          href="/shop"
          className="inline-flex items-center justify-center rounded-[10px] border-[1.5px] border-primary px-4 py-2.5 text-[13px] font-medium text-primary hover:bg-primary-light"
        >
          返回商城
        </Link>
      </div>
      </div>
    </div>
  );
}
