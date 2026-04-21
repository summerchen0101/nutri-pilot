import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/layout/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/supabase';

function formatDateLabel(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function extractSafetyScore(reportJson: Json): number | null {
  if (!reportJson || typeof reportJson !== 'object' || Array.isArray(reportJson)) {
    return null;
  }
  const maybeScore = reportJson.safety_score;
  return typeof maybeScore === 'number' ? maybeScore : null;
}

export default async function GuardRecordsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: records, error } = await supabase
    .from('label_guard_saved_reports')
    .select('id,name,report_json,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="space-y-3">
        <PageHeader
          title="標籤紀錄"
          description="查看你儲存過的標籤守衛分析結果。"
          spacing="compact"
        />
        <Card className="min-w-0 overflow-hidden">
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
        title="標籤紀錄"
        description="查看你儲存過的標籤守衛分析結果。"
        spacing="compact"
      />

      {!records || records.length === 0 ? (
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="space-y-2 py-6">
            <p className="text-[13px] text-foreground">目前還沒有儲存的標籤紀錄。</p>
            <Link
              href="/guard"
              className="inline-flex items-center rounded-full border-[0.5px] border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              回守衛建立第一筆
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {records.map((record) => {
            const score = extractSafetyScore(record.report_json);
            return (
              <Card key={record.id} className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[15px] font-medium">{record.name}</CardTitle>
                  <CardDescription>儲存時間：{formatDateLabel(record.created_at)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-[13px] text-muted-foreground">
                    安全分數：{score != null ? `${score} / 100` : '—'}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
