import Link from "next/link";
import { redirect } from "next/navigation";

import { HeaderBackButton } from "@/components/layout/header-back-button";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { getCachedAuthContext } from "@/lib/auth";
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from "@/lib/shop/constants";

export default async function SettingsOrdersPage() {
  const { user } = await getCachedAuthContext();

  if (!user) redirect("/login");

  return (
    <div className="space-y-4 pb-6">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        title="我的訂單"
        leading={<HeaderBackButton />}
        spacing="compact"
      />
      <div className="rounded-xl border-hairline border-border bg-card p-6 text-center">
        <p className="text-body text-muted-foreground">訂單查詢即將開放</p>
        <p className="mt-2 text-caption leading-relaxed text-neutral-text-tertiary">
          完成付款後，訂單通知將寄至你的電子信箱；若有問題請透過客服管道聯繫。
        </p>
      </div>
    </div>
  );
}
