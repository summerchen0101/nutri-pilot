import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PromoCampaignEditor } from '@/app/admin/promotions/_components/promo-campaign-editor';
import { getAdminRole, staffCan } from '@/lib/admin';

export default async function AdminPromotionsNewPage() {
  const role = await getAdminRole();
  if (!staffCan(role, 'promo.manage')) {
    redirect('/admin/dashboard');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/promotions" className="text-caption text-[#4C956C] hover:underline">
        ← 活動列表
      </Link>
      <h1 className="text-heading-screen text-foreground">新增優惠活動</h1>
      <PromoCampaignEditor mode="create" />
    </div>
  );
}
