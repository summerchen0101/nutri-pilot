import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { HeaderBackButton } from "@/components/layout/header-back-button";
import { StickyPageHeader } from "@/components/layout/sticky-page-header";
import { getCachedAuthContext } from "@/lib/auth";
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from "@/lib/shop/constants";
import { ClearCartOnSuccess } from "@/app/(main)/shop/success/clear-cart-on-success";

interface PageProps {
  searchParams: {
    merchant_order_no?: string;
    paymentPending?: string;
    order_id?: string;
    orderId?: string;
    vendor_id?: string;
  };
}

export default async function ShopSuccessPage({ searchParams }: PageProps) {
  const { supabase, user } = await getCachedAuthContext();

  if (!user) redirect("/login");

  const merchantOrderNo = searchParams.merchant_order_no?.trim() ?? "";
  let orderId =
    searchParams.order_id?.trim() ??
    (typeof searchParams.orderId === "string" ? searchParams.orderId.trim() : "");
  const paymentPending = searchParams.paymentPending === "1";

  if (!orderId && merchantOrderNo) {
    const { data: orderByMerchantNo } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("merchant_order_no", merchantOrderNo)
      .maybeSingle();
    orderId = orderByMerchantNo?.id ?? "";
  }

  const orderDetailHref = orderId
    ? `/settings/orders/${orderId}`
    : "/settings/orders";

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <ClearCartOnSuccess />
      </Suspense>
      <StickyPageHeader
        anchorId={SHOP_HEADER_SCROLL_ANCHOR_ID}
        leading={<HeaderBackButton />}
        title={paymentPending ? "待繳費／入帳" : "付款處理完成"}
      />
      <div className="rounded-xl bg-card p-6 text-center">
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {paymentPending
            ? "已取得繳費資訊，請依綠界頁面指示完成 ATM 或超商代碼繳費；入帳後訂單將自動成立。"
            : "感謝你的購買。付款結果若需數秒才入帳，請以訂單紀錄為準。"}
        </p>
        {!paymentPending ? (
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            實際入帳以綠界 ReturnURL
            為準；若此頁已顯示但訂單尚未更新，請稍後重新整理。
          </p>
        ) : null}
        {merchantOrderNo ? (
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">
            訂單編號（MerchantOrderNo）：{merchantOrderNo}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href={orderDetailHref}
            className="inline-flex items-center justify-center rounded-[10px] bg-shadow-grey px-4 py-2.5 text-[13px] font-medium text-white hover:bg-shadow-grey-hover">
            查看訂單
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-[10px] border-[1.5px] border-primary px-4 py-2.5 text-[13px] font-medium text-primary hover:bg-primary hover:text-white">
            繼續選購
          </Link>
        </div>
      </div>
    </div>
  );
}
