import { redirect } from "next/navigation";
import Link from "next/link";
import { History } from "lucide-react";

import { GuardLabelClient } from "@/app/(main)/guard/guard-label-client";
import { HEADER_ACTION_ICON_CLASS } from "@/components/layout/header-action-icon-styles";
import { PageHeader } from "@/components/layout/page-header";
import { getCachedAuthContext } from '@/lib/auth';

export default async function GuardPage() {
  const { user } = await getCachedAuthContext();

  if (!user) redirect("/login");

  return (
    <div className="space-y-3">
      <PageHeader
        title="食品安全守衛"
        spacing="compact"
        action={
          <Link
            href="/guard/records"
            aria-label="食品安全分析紀錄"
            className={HEADER_ACTION_ICON_CLASS}>
            <History
              className="h-[18px] w-[18px]"
              aria-hidden
              strokeWidth={1.75}
            />
          </Link>
        }
      />
      <GuardLabelClient />
    </div>
  );
}
