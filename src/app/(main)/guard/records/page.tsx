import Link from "next/link";
import { redirect } from "next/navigation";

import { GuardSavedRecordDeleteButton } from "@/app/(main)/guard/records/guard-saved-record-delete-button";
import { GuardSavedRecordRenameButton } from "@/app/(main)/guard/records/guard-saved-record-rename-button";
import { HeaderBackButton } from "@/components/layout/header-back-button";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { MAX_LABEL_GUARD_SAVED_REPORTS } from "@/lib/food/label-guard-saved";
import { safetyScoreTextClass } from "@/lib/food/label-guard-report";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

function formatDateLabel(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractSafetyScore(reportJson: Json): number | null {
  if (
    !reportJson ||
    typeof reportJson !== "object" ||
    Array.isArray(reportJson)
  ) {
    return null;
  }
  const maybeScore = reportJson.safety_score;
  return typeof maybeScore === "number" ? maybeScore : null;
}

export default async function GuardRecordsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: records, error } = await supabase
    .from("label_guard_saved_reports")
    .select("id,name,report_json,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const count = records?.length ?? 0;
  const quotaLine = (
    <p className="text-[12px] text-muted-foreground">
      尚可紀錄數：{count}/{MAX_LABEL_GUARD_SAVED_REPORTS}
    </p>
  );

  if (error) {
    return (
      <div className="space-y-3">
        <PageHeader
          leading={<HeaderBackButton />}
          title="標籤紀錄"
          description="查看你儲存過的食品守衛分析結果。"
          spacing="compact"
        />
        {quotaLine}
        <Card className="min-w-0 overflow-hidden !bg-white">
          <CardContent className="py-6">
            <p className="text-[13px] text-destructive">
              讀取紀錄失敗：{error.message}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        leading={<HeaderBackButton />}
        title="標籤紀錄"
        description="查看你儲存過的食品守衛分析結果。"
        spacing="compact"
      />
      {quotaLine}

      {!records || records.length === 0 ? (
        <Card className="min-w-0 overflow-hidden !bg-white">
          <CardContent className="space-y-2 py-6">
            <p className="text-[13px] text-foreground">
              目前還沒有儲存的標籤紀錄。
            </p>
            <Link
              href="/guard"
              className="inline-flex items-center rounded-full border-[0.5px] border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted">
              回守衛建立第一筆
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {records.map((record) => {
            const score = extractSafetyScore(record.report_json);
            return (
              <Card
                key={record.id}
                className="min-w-0 overflow-hidden !bg-white">
                <div className="flex min-h-[44px] items-center gap-2 pr-2">
                  <Link
                    href={`/guard/records/${record.id}`}
                    className="min-w-0 flex-1 px-3.5 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <div className="flex flex-col gap-1">
                      <div className="flex min-w-0 items-center gap-0.5">
                        <span className="min-w-0 truncate text-[15px] font-medium leading-normal text-foreground">
                          {record.name}
                        </span>
                        <GuardSavedRecordRenameButton
                          recordId={record.id}
                          initialName={record.name}
                        />
                      </div>
                      <p className="text-[12px] leading-normal text-muted-foreground">
                        儲存時間：{formatDateLabel(record.created_at)}
                      </p>
                      <p className="text-[13px] leading-normal text-muted-foreground">
                        安全分數：
                        {score != null ? (
                          <span
                            className={`font-semibold ${safetyScoreTextClass(score)}`}>
                            {score}
                          </span>
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                  </Link>
                  <GuardSavedRecordDeleteButton recordId={record.id} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
