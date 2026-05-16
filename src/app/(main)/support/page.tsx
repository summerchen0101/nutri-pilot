import { redirect } from 'next/navigation';

import { HeaderBackButton } from '@/components/layout/header-back-button';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { SectionCard } from '@/components/ui/section-card';
import { getCachedAuthContext } from '@/lib/auth';

export default async function SupportPage() {
  const { user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  return (
    <div className="space-y-3 pb-4">
      <StickyPageHeader
        leading={<HeaderBackButton />}
        title="客服"
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
