import { redirect } from 'next/navigation';

import { markAnnouncementsReadForUser } from '@/app/(main)/announcements/actions';
import { HeaderBackButton } from '@/components/layout/header-back-button';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionCard } from '@/components/ui/section-card';
import { createClient } from '@/lib/supabase/server';

function formatPublishedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-Hant', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function AnnouncementsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const nowIso = new Date().toISOString();
  const { data: rows } = await supabase
    .from('announcements')
    .select('id, title, body, published_at')
    .eq('is_active', true)
    .lte('published_at', nowIso)
    .order('published_at', { ascending: false });

  const list = rows ?? [];
  const ids = list.map((r) => r.id as string);
  await markAnnouncementsReadForUser(ids);

  return (
    <div className="space-y-3 pb-4">
      <PageHeader
        leading={<HeaderBackButton />}
        title="公告"
        description="最新消息與維護通知。"
        spacing="compact"
      />

      {list.length === 0 ? (
        <EmptyState message="目前沒有公告。" actionHref="/dashboard" actionLabel="返回總覽" />
      ) : (
        <ul className="space-y-3">
          {list.map((row) => (
            <li key={row.id as string}>
              <SectionCard className="space-y-2">
                <p className="text-[15px] font-medium text-foreground">{row.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatPublishedAt(row.published_at as string)}
                </p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
                  {row.body}
                </p>
              </SectionCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
