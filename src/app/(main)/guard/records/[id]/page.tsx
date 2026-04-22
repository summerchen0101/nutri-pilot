import { notFound, redirect } from 'next/navigation';

import { HeaderBackButton } from '@/components/layout/header-back-button';
import { PageHeader } from '@/components/layout/page-header';
import { GuardSavedRecordDetailClient } from '@/app/(main)/guard/records/guard-saved-record-detail-client';
import { parseLabelGuardReportJson } from '@/lib/food/label-guard-report';
import { createClient } from '@/lib/supabase/server';

const SIGNED_URL_TTL_SEC = 3600;

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

type PageProps = {
  params: { id: string };
};

export default async function GuardSavedRecordDetailPage({ params }: PageProps) {
  const { id } = params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: row, error } = await supabase
    .from('label_guard_saved_reports')
    .select(
      `
      id,
      name,
      report_json,
      created_at,
      job_id,
      label_guard_jobs (
        storage_path
      )
    `,
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="space-y-3">
        <PageHeader
          leading={<HeaderBackButton />}
          title="標籤紀錄"
          spacing="compact"
        />
        <p className="text-[13px] text-destructive">讀取紀錄失敗：{error.message}</p>
      </div>
    );
  }

  if (!row) notFound();

  const report = parseLabelGuardReportJson(row.report_json);
  if (!report) {
    return (
      <div className="space-y-3">
        <PageHeader
          leading={<HeaderBackButton />}
          title="標籤紀錄"
          spacing="compact"
        />
        <p className="text-[13px] text-destructive">無法解析此筆分析內容。</p>
      </div>
    );
  }

  const jobEmbed = row.label_guard_jobs as
    | { storage_path: string }
    | { storage_path: string }[]
    | null;
  const job = Array.isArray(jobEmbed) ? jobEmbed[0] ?? null : jobEmbed;
  const storagePath = job?.storage_path ?? null;

  let imageUrl: string | null = null;
  let imageUnavailableMessage: string | null = null;

  if (!row.job_id || !storagePath) {
    imageUnavailableMessage =
      !row.job_id ? '此紀錄未連結原分析工作，無法顯示照片。' : '找不到原圖路徑。';
  } else {
    const { data: signed, error: signErr } = await supabase.storage
      .from('label-guard-photos')
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);

    if (signErr || !signed?.signedUrl) {
      imageUnavailableMessage = '無法載入原圖（連結可能已失效）。';
    } else {
      imageUrl = signed.signedUrl;
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        leading={<HeaderBackButton />}
        title="標籤紀錄"
        description="檢視儲存時的相片與分析結果。"
        spacing="compact"
      />
      <GuardSavedRecordDetailClient
        recordId={row.id}
        name={row.name}
        createdAtLabel={formatDateLabel(row.created_at)}
        imageUrl={imageUrl}
        imageUnavailableMessage={imageUnavailableMessage}
        report={report}
      />
    </div>
  );
}
