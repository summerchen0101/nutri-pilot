import { redirect } from 'next/navigation';

import { MembershipPlansContent } from '@/app/(main)/settings/_components/membership-plans-content';
import { HeaderBackButton } from '@/components/layout/header-back-button';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { SectionCard } from '@/components/ui/section-card';
import { getCachedAuthContext } from '@/lib/auth';

export default async function SettingsMembershipPage() {
  const { user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  return (
    <div className="space-y-4 pb-6">
      <StickyPageHeader title="會員方案" leading={<HeaderBackButton />} />
      <SectionCard>
        <MembershipPlansContent showSectionHeading={false} />
      </SectionCard>
    </div>
  );
}
