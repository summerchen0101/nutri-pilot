import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { createClient } from '@/lib/supabase/server';

export default async function SupportPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className="space-y-3 pb-4">
      <PageHeader
        title="客服"
        description="若有問題請透過下列方式聯絡（詳細管道將於之後更新）。"
        spacing="compact"
      />

      <SectionCard>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          支援服務準備中，請稍後再來查看聯絡資訊。
        </p>
      </SectionCard>
    </div>
  );
}
