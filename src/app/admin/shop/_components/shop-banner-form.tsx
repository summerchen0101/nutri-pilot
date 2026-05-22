'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import {
  deleteShopCategoryBanner,
  deleteShopHomeBanner,
  saveShopCategoryBanner,
  saveShopHomeBanner,
} from '@/app/admin/shop/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

type BannerKind = 'home' | 'category';

interface ShopBannerFormProps {
  kind: BannerKind;
  allowDelete: boolean;
  categoryOptions?: Array<{ slug: string; label: string }>;
  initial?: {
    id: string;
    category_slug?: string;
    title: string;
    subtitle: string | null;
    image_url: string | null;
    href: string | null;
    sort_order: number;
    is_active: boolean;
  } | null;
}

async function uploadShopBannerImage(
  bannerId: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `shop/banners/${bannerId}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('product-images')
    .upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg',
    });
  if (upErr) throw new Error(upErr.message);
  const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
  return pub.publicUrl;
}

export function ShopBannerForm({
  kind,
  allowDelete,
  categoryOptions = [],
  initial,
}: ShopBannerFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? '');
  const [href, setHref] = useState(initial?.href ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [categorySlug, setCategorySlug] = useState(
    initial?.category_slug ?? categoryOptions[0]?.slug ?? '',
  );

  const preview = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    return imageUrl.trim() || null;
  }, [imageFile, imageUrl]);

  const listHref =
    kind === 'home' ? '/admin/shop/banners' : '/admin/shop/banners';
  const editBase =
    kind === 'home' ?
      '/admin/shop/banners/home'
    : '/admin/shop/banners/category';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const sort = Number(sortOrder);
    if (!Number.isFinite(sort)) {
      setError('排序請填數字');
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          let nextImageUrl = imageUrl.trim() || null;
          const tempId = initial?.id ?? crypto.randomUUID();

          if (imageFile) {
            nextImageUrl = await uploadShopBannerImage(tempId, imageFile);
          }

          const payload = {
            id: initial?.id,
            title,
            subtitle: subtitle.trim() || null,
            imageUrl: nextImageUrl,
            href: href.trim() || null,
            sortOrder: sort,
            isActive,
          };

          const res =
            kind === 'home' ?
              await saveShopHomeBanner(payload)
            : await saveShopCategoryBanner({
                ...payload,
                categorySlug,
              });

          if (!res.ok) {
            setError(res.error);
            return;
          }

          router.push(`${editBase}/${res.id}`);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : '儲存失敗');
        }
      })();
    });
  }

  function handleDelete() {
    if (!initial?.id || !allowDelete) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm('確定刪除此 Banner？')
    ) {
      return;
    }

    setDeletePending(true);
    void (async () => {
      const res =
        kind === 'home' ?
          await deleteShopHomeBanner({ id: initial.id })
        : await deleteShopCategoryBanner({ id: initial.id });
      setDeletePending(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(listHref);
      router.refresh();
    })();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-heading-screen text-foreground">
          {initial ? '編輯' : '新增'}
          {kind === 'home' ? '首頁' : '分類'} Banner
        </h1>
        <Link href={listHref} className="text-caption text-primary hover:underline">
          返回列表
        </Link>
      </div>

      {kind === 'category' ?
        <label className="block space-y-1">
          <span className="text-caption text-muted-foreground">分類</span>
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            disabled={Boolean(initial?.category_slug)}
            className="w-full rounded-[10px] border-hairline border-border bg-background px-3 py-2 text-body"
          >
            {categoryOptions.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label} ({c.slug})
              </option>
            ))}
          </select>
        </label>
      : null}

      <label className="block space-y-1">
        <span className="text-caption text-muted-foreground">標題</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>

      <label className="block space-y-1">
        <span className="text-caption text-muted-foreground">副標（選填）</span>
        <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </label>

      <label className="block space-y-1">
        <span className="text-caption text-muted-foreground">連結（選填）</span>
        <Input value={href} onChange={(e) => setHref(e.target.value)} placeholder="/shop/..." />
      </label>

      <label className="block space-y-1">
        <span className="text-caption text-muted-foreground">排序（數字越小越前）</span>
        <Input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <span className="text-body">啟用</span>
      </label>

      <div className="space-y-2">
        <span className="text-caption text-muted-foreground">圖片（選填）</span>
        {preview ?
          <div className="relative aspect-[3/1] w-full overflow-hidden rounded-xl bg-muted">
            <Image src={preview} alt="" fill className="object-cover" unoptimized />
          </div>
        : null}
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
        <Input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="或貼上圖片 URL"
        />
      </div>

      {error ?
        <p className="text-caption text-destructive">{error}</p>
      : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? '儲存中…' : '儲存'}
        </Button>
        {allowDelete && initial?.id ?
          <Button
            type="button"
            variant="outline"
            disabled={deletePending}
            onClick={handleDelete}
          >
            {deletePending ? '刪除中…' : '刪除'}
          </Button>
        : null}
      </div>
    </form>
  );
}
