'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { deleteAnnouncement, saveAnnouncement } from '@/app/admin/announcements/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** 供 datetime-local 初始化（瀏覽器本地時區） */
function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function initialPublishedLocal(existingIso?: string | null): string {
  if (existingIso) {
    const v = isoToDatetimeLocalValue(existingIso);
    if (v) return v;
  }
  return isoToDatetimeLocalValue(new Date().toISOString());
}

export function AnnouncementForm({
  initial,
  allowDelete,
}: Readonly<{
  initial?: {
    id: string;
    title: string;
    body: string;
    published_at: string;
    is_active: boolean | null;
  } | null;
  allowDelete: boolean;
}>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [publishedLocal, setPublishedLocal] = useState(() =>
    initialPublishedLocal(initial?.published_at ?? null),
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const publishedAtIso = new Date(publishedLocal).toISOString();

    startTransition(() => {
      void (async () => {
        const res = await saveAnnouncement({
          id: initial?.id,
          title,
          body,
          publishedAtIso,
          isActive,
        });

        if (!res.ok) {
          setError(res.error);
          return;
        }

        router.push(`/admin/announcements/${res.id}`);
        router.refresh();
      })();
    });
  }

  function handleDelete() {
    if (!initial?.id) return;
    if (!allowDelete) return;
    if (typeof window !== 'undefined') {
      if (
        !window.confirm('確定永久刪除此公告？此動作無法復原，且會一併影響相關讀取紀錄。')
      ) {
        return;
      }
    }

    setError(null);
    setDeletePending(true);
    void (async () => {
      const res = await deleteAnnouncement({ id: initial.id });
      setDeletePending(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace('/admin/announcements');
      router.refresh();
    })();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin/announcements" className="text-caption text-[#4C956C] hover:underline">
            ← 公告列表
          </Link>
          <h1 className="mt-2 text-heading-screen text-foreground">
            {initial?.id ? '編輯公告' : '新增公告'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {initial?.id && allowDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || deletePending}
              className="border-[#E55A3C]/35 text-[#E55A3C]"
              onClick={() => handleDelete()}
            >
              {deletePending ? '刪除中…' : '刪除'}
            </Button>
          ) : null}
          <Button type="submit" variant="default" disabled={pending || deletePending}>
            {pending ? '儲存中…' : '儲存'}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-4 rounded-xl border border-border p-4">
        <div className="space-y-2">
          <label htmlFor="ann-title" className="text-body font-medium">
            標題
          </label>
          <Input
            id="ann-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="ann-body" className="text-body font-medium">
            內文
          </label>
          <textarea
            id="ann-body"
            className="min-h-[120px] w-full rounded-[10px] border border-border px-3 py-2 text-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="ann-published" className="text-body font-medium">
            發布時間
          </label>
          <input
            id="ann-published"
            type="datetime-local"
            required
            className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 text-body"
            value={publishedLocal}
            onChange={(e) => setPublishedLocal(e.target.value)}
          />
          <p className="text-caption text-muted-foreground">
            可依排程將時間設在未來；前台僅於時間到且「啟用」時顯示。
          </p>
        </div>
        <label className="flex items-center gap-2 text-body">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          啟用（前台可看見時會顯示；未啟用＝草稿／下架）
        </label>
      </div>
    </form>
  );
}
