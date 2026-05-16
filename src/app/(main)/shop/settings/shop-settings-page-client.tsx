'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiChevronLeft } from 'react-icons/fi';

import { ShopCommerceShortcutsCard } from '@/app/(main)/settings/_components/shop-commerce-shortcuts-card';
import { ShopSettingsSheet } from '@/app/(main)/settings/_components/shop-settings-sheet';
import { HEADER_LEADING_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';

interface ShopSettingsPageClientProps {
  dietMethodSummaryText: string;
  personalizeFromDietInitial: boolean;
}

export function ShopSettingsPageClient({
  dietMethodSummaryText,
  personalizeFromDietInitial,
}: ShopSettingsPageClientProps) {
  const router = useRouter();
  const [shopSettingsOpen, setShopSettingsOpen] = useState(false);

  const backLink = (
    <Link
      href="/shop"
      aria-label="返回商城"
      className={HEADER_LEADING_ICON_CLASS}
    >
      <FiChevronLeft className="h-[18px] w-[18px]" aria-hidden />
    </Link>
  );

  return (
    <div className="space-y-4 pb-6">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        leading={backLink}
        title="商城設定"
        spacing="compact"
      />

      <ShopCommerceShortcutsCard
        onMyOrders={() => {
          router.push('/settings/orders');
        }}
        onShippingAddresses={() => {
          setShopSettingsOpen(true);
        }}
        onMemberPoints={() => {
          router.push('/settings/points');
        }}
        onCoupons={() => {
          router.push('/settings/coupons');
        }}
      />

      <ShopSettingsSheet
        open={shopSettingsOpen}
        onClose={() => setShopSettingsOpen(false)}
        dietMethodSummaryText={dietMethodSummaryText}
        personalizeFromDietInitial={personalizeFromDietInitial}
      />
    </div>
  );
}
