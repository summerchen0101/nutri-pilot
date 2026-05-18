import Link from 'next/link';
import { redirect } from 'next/navigation';

import { HeaderBackButton } from '@/components/layout/header-back-button';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { getCachedAuthContext } from '@/lib/auth';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';
import type { Tables } from '@/types/supabase';

function discountSummary(c: Tables<'promo_campaigns'>): string {
  if (c.discount_kind === 'percent') {
    return `${c.discount_value}% 折扣`;
  }
  return `折抵 NT$ ${Number(c.discount_value).toLocaleString('zh-TW')}`;
}

export default async function SettingsCouponsPage() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect('/login');

  const { data: campaigns, error } = await supabase
    .from('promo_campaigns')
    .select('*')
    .order('starts_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const list = (campaigns ?? []) as Tables<'promo_campaigns'>[];

  return (
    <div className="space-y-4 pb-6">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        title="優惠券"
        leading={<HeaderBackButton />}
        spacing="compact"
      />
      <p className="text-caption leading-relaxed text-muted-foreground">
        以下為目前公開中的折價活動摘要。結帳輸入優惠碼將於後續版本開放；詳情以客服與活動條款為準。
      </p>
      {list.length === 0 ?
        <div className="rounded-xl border-hairline border-border bg-card p-6 text-center">
          <p className="text-body text-muted-foreground">目前無公開優惠活動</p>
          <p className="mt-2 text-caption leading-relaxed text-neutral-text-tertiary">
            有新活動時會顯示於此（後台可設定「於會員頁展示」）。
          </p>
        </div>
      : <ul className="space-y-2">
          {list.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border-hairline border-border bg-card px-3 py-3"
            >
              <p className="text-heading-card text-foreground">{c.title}</p>
              {c.description ?
                <p className="mt-1 text-caption text-muted-foreground">{c.description}</p>
              : null}
              <p className="mt-2 text-body font-medium text-primary">{discountSummary(c)}</p>
              <p className="mt-1 text-caption text-neutral-text-tertiary">
                低消 NT$ {Number(c.min_order_total).toLocaleString('zh-TW')}
              </p>
            </li>
          ))}
        </ul>
      }
      <div className="rounded-xl border-hairline border-border bg-secondary/40 p-4">
        <p className="text-caption text-muted-foreground">
          擁有優惠碼者請於結帳開放後於購物車輸入；若需協助請{' '}
          <Link href="/support" className="text-primary underline">
            聯絡客服
          </Link>
          。
        </p>
      </div>
    </div>
  );
}
