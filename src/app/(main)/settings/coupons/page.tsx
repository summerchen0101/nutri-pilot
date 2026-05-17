import Link from "next/link";
import { redirect } from "next/navigation";

import { HeaderBackButton } from "@/components/layout/header-back-button";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { getCachedAuthContext } from "@/lib/auth";
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from "@/lib/shop/constants";

export default async function SettingsCouponsPage() {
  const { user } = await getCachedAuthContext();

  if (!user) redirect("/login");

  return (
    <div className="space-y-4 pb-6">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        title="優惠券"
        leading={<HeaderBackButton />}
        spacing="compact"
      />
      <div className="rounded-xl border-hairline border-border bg-card p-6 text-center">
        <p className="text-body text-muted-foreground">尚無可用優惠券</p>
        <p className="mt-2 text-caption leading-relaxed text-neutral-text-tertiary">
          優惠券／折扣碼功能將於後續版本提供。
        </p>
      </div>
    </div>
  );
}
