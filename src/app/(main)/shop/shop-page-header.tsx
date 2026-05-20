import { ShopHeaderPointsTitle } from "@/app/(main)/shop/_components/shop-header-points-title";
import { ShopCatalogSearchButton } from "@/app/(main)/shop/_components/shop-header-share-search";
import { ShopCartHeaderAction } from "@/app/(main)/shop/shop-cart-header-action";
import { ShopCatalogHeaderActions } from "@/app/(main)/shop/shop-catalog-header-actions";
import { ShopCatalogStickyTabs } from "@/app/(main)/shop/_components/shop-catalog-sticky-tabs";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from "@/lib/shop/constants";
import { cn } from "@/lib/utils/cn";

interface ShopPageHeaderProps {
  /** 未傳時預設 0（例如 loading 骨架） */
  shopPointsBalance?: number;
}

export function ShopPageHeader({ shopPointsBalance = 0 }: ShopPageHeaderProps) {
  const points = Math.max(0, Math.floor(shopPointsBalance));

  return (
    <StickyPageHeader
      anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
      title="健康商城"
      spacing="compact"
      shellClassName="bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90"
      action={
        <div className="flex shrink-0 items-center justify-end gap-1">
          <div
            className={cn(
              "hide-scrollbar flex min-w-0 max-w-[min(100%,72vw)] items-center gap-1 overflow-x-auto sm:max-w-none",
            )}>
            <ShopHeaderPointsTitle balance={points} className="justify-start" />
            <div className="flex shrink-0 items-center gap-0.5">
              <ShopCatalogSearchButton />
              <ShopCatalogHeaderActions />
            </div>
          </div>
          <ShopCartHeaderAction />
        </div>
      }
      afterHeader={<ShopCatalogStickyTabs variant="embedded" />}
    />
  );
}
