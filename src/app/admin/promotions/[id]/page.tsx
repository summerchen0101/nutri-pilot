import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import {
  PromoCampaignEditor,
  PromoCodesSection,
} from '@/app/admin/promotions/_components/promo-campaign-editor';
import { getAdminRole, staffCan } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export default async function AdminPromotionDetailPage({
  params,
}: Readonly<{ params: { id: string } }>) {
  const role = await getAdminRole();
  if (!staffCan(role, 'promo.manage')) {
    redirect('/admin/dashboard');
  }

  const supabase = createClient();
  const { data: campaign, error: cErr } = await supabase
    .from('promo_campaigns')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (cErr) {
    throw new Error(cErr.message);
  }
  if (!campaign) {
    notFound();
  }

  const { data: codes, error: codesErr } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('campaign_id', params.id)
    .order('created_at', { ascending: false });

  if (codesErr) {
    throw new Error(codesErr.message);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/admin/promotions" className="text-caption text-[#4C956C] hover:underline">
        ← 活動列表
      </Link>
      <h1 className="text-heading-screen text-foreground">編輯活動</h1>
      <PromoCampaignEditor mode="edit" initial={campaign} />
      <PromoCodesSection
        campaignId={campaign.id}
        codes={codes ?? []}
        canDelete={role === 'super_admin'}
      />
    </div>
  );
}
