import { redirect } from "next/navigation";

import { labelShopPointReason } from "@/app/(main)/settings/_lib/point-ledger-labels";
import { ShopHeaderPointsTitle } from "@/app/(main)/shop/_components/shop-header-points-title";
import { HeaderBackButton } from "@/components/layout/header-back-button";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { getCachedAuthContext } from "@/lib/auth";
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from "@/lib/shop/constants";
import type { Tables } from "@/types/supabase";

function formatDt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SettingsPointsHistoryPage() {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect("/login");

  const [
    { data: rows, error: ledgerError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    supabase
      .from("user_shop_point_ledger")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("user_profiles")
      .select("shop_points_balance")
      .eq("user_id", user.id)
      .single(),
  ]);

  if (ledgerError) {
    throw new Error(ledgerError.message);
  }
  if (profileError) {
    throw new Error(profileError.message);
  }

  const list = (rows ?? []) as Tables<"user_shop_point_ledger">[];
  const shopPointsBalance = Number(profile.shop_points_balance ?? 0);

  return (
    <div className="space-y-4 pb-6">
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        title="點數紀錄"
        leading={<HeaderBackButton />}
        spacing="compact"
        action={
          <ShopHeaderPointsTitle balance={shopPointsBalance} asLink={false} />
        }
      />
      <p className="text-caption leading-relaxed text-muted-foreground">
        1 點可折抵 1
        元商城消費。異動原因與餘額僅供參考，以正式方案條款與系統為準。
      </p>
      {list.length === 0 ? (
        <div className="rounded-xl border-hairline border-border bg-card p-6 text-center text-body text-muted-foreground">
          尚無點數異動紀錄
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border-hairline border-border bg-card px-3 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={
                    row.delta >= 0
                      ? "text-body font-medium text-primary"
                      : "text-body font-medium text-destructive"
                  }>
                  {row.delta >= 0 ? "+" : ""}
                  {row.delta.toLocaleString()} 點
                </span>
                <span className="text-caption text-muted-foreground">
                  {formatDt(row.created_at)}
                </span>
              </div>
              <p className="mt-1 text-caption text-neutral-text-tertiary">
                {labelShopPointReason(row.reason)} · 餘額{" "}
                {row.balance_after.toLocaleString()} 點
              </p>
              {row.note ? (
                <p className="mt-0.5 text-caption text-muted-foreground">
                  {row.note}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
