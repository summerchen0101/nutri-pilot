import Link from "next/link";
import { FiChevronLeft } from "react-icons/fi";
import { redirect } from "next/navigation";

import { ShopCartHeaderAction } from "@/app/(main)/shop/shop-cart-header-action";
import { HEADER_LEADING_ICON_CLASS } from "@/components/layout/header-action-icon-styles";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from "@/lib/shop/constants";
import { cn } from "@/lib/utils/cn";
import { getCachedAuthContext } from "@/lib/auth";

export default async function ShopHistoryPage() {
  const { user } = await getCachedAuthContext();

  if (!user) redirect("/login");

  const backLink = (
    <Link
      href="/shop"
      aria-label="返回商城"
      className={HEADER_LEADING_ICON_CLASS}>
      <FiChevronLeft className="h-[18px] w-[18px]" aria-hidden />
    </Link>
  );

  return (
    <div className="space-y-4 pb-6">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        leading={backLink}
        title="瀏覽歷史"
        spacing="compact"
        action={<ShopCartHeaderAction />}
      />
      <div className="rounded-xl border-hairline border-border bg-card p-6 text-center">
        <p className="text-body text-muted-foreground">尚無瀏覽紀錄</p>
        <p className="mt-2 text-caption leading-relaxed text-neutral-text-tertiary">
          商品瀏覽紀錄將於後續版本提供，購物車與收藏可從商城頁首或底部選單進入。
        </p>
      </div>
    </div>
  );
}
