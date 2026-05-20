'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FiChevronLeft } from 'react-icons/fi';

import { ShopCommerceShortcutsCard } from '@/app/(main)/settings/_components/shop-commerce-shortcuts-card';
import { ShopSettingsSheet } from '@/app/(main)/settings/_components/shop-settings-sheet';
import { ShopCartHeaderAction } from '@/app/(main)/shop/shop-cart-header-action';
import { HEADER_LEADING_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { StickyPageHeader } from '@/components/layout/sticky-page-header';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';

interface ShopSettingsPageClientProps {
  dietMethodSummaryText: string;
  personalizeFromDietInitial: boolean;
  shopPointsBalance: number;
  nextExpiringPoints: number | null;
  nextExpiryAtLabel: string | null;
}

export function ShopSettingsPageClient({
  dietMethodSummaryText,
  personalizeFromDietInitial,
  shopPointsBalance,
  nextExpiringPoints,
  nextExpiryAtLabel,
}: ShopSettingsPageClientProps) {
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
        action={<ShopCartHeaderAction />}
      />

      <div className="rounded-xl border-hairline border-border bg-card p-4">
        <p className="text-caption text-muted-foreground">目前點數</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-heading-page text-primary">
            {shopPointsBalance.toLocaleString('zh-TW')}
          </span>
          <span className="text-body text-foreground">點</span>
        </div>
        <div className="mt-3 border-t-hairline border-border pt-3">
          <p className="text-caption text-muted-foreground">即將到期</p>
          {nextExpiringPoints != null && nextExpiryAtLabel != null ? (
            <>
              <p className="mt-0.5 text-body font-medium text-foreground">
                {nextExpiringPoints.toLocaleString('zh-TW')} 點 · 到期{' '}
                {nextExpiryAtLabel}
              </p>
              <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
                為「最早到期那一批」的加總；折抵時採先到期先用（FIFO）。實際以條款與系統為準。
              </p>
            </>
          ) : shopPointsBalance > 0 ? (
            <p className="mt-0.5 text-caption leading-relaxed text-muted-foreground">
              目前沒有尚未過期的點數批次；若仍顯示餘額，可能含已過期或待核銷之點數，依方案條款為準。
            </p>
          ) : (
            <p className="mt-0.5 text-caption leading-relaxed text-muted-foreground">
              尚無點數可顯示到期資訊。
            </p>
          )}
        </div>
      </div>

      <ShopCommerceShortcutsCard
        onShippingAddresses={() => {
          setShopSettingsOpen(true);
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
