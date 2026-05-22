'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  createShopCategory,
  deleteShopCategory,
  saveShopCategory,
} from '@/app/admin/shop/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SHOP_CATEGORY_ICON_KEYS,
  SHOP_CATEGORY_ICON_LABELS,
} from '@/lib/shop/shop-category-icon-keys';

interface ShopCategoryFormProps {
  allowDelete: boolean;
  initial?: {
    slug: string;
    label: string;
    sort_order: number;
    is_active: boolean;
    icon_key: string | null;
  } | null;
}

export function ShopCategoryForm({
  allowDelete,
  initial,
}: ShopCategoryFormProps) {
  const router = useRouter();
  const isNew = !initial;
  const [pending, startTransition] = useTransition();
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [iconKey, setIconKey] = useState(initial?.icon_key ?? 'default');

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
        const payload = {
          label,
          sortOrder: sort,
          isActive,
          iconKey: iconKey === 'default' ? null : iconKey,
        };

        const res =
          isNew ?
            await createShopCategory({ slug: slug.trim(), ...payload })
          : await saveShopCategory({ slug: initial.slug, ...payload });

        if (!res.ok) {
          setError(res.error);
          return;
        }

        router.push(`/admin/shop/categories/${res.slug}`);
        router.refresh();
      })();
    });
  }

  function handleDelete() {
    if (!initial || !allowDelete) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`確定刪除分類「${initial.label}」？`)
    ) {
      return;
    }

    setDeletePending(true);
    void (async () => {
      const res = await deleteShopCategory({ slug: initial.slug });
      setDeletePending(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push('/admin/shop/categories');
      router.refresh();
    })();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-heading-screen text-foreground">
          {isNew ? '新增分類' : '編輯分類'}
        </h1>
        <Link
          href="/admin/shop/categories"
          className="text-caption text-primary hover:underline"
        >
          返回列表
        </Link>
      </div>

      <label className="block space-y-1">
        <span className="text-caption text-muted-foreground">slug（建立後不可改）</span>
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={!isNew}
          placeholder="protein_bar"
          required={isNew}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-caption text-muted-foreground">顯示名稱</span>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
      </label>

      <label className="block space-y-1">
        <span className="text-caption text-muted-foreground">圖示</span>
        <select
          value={iconKey ?? 'default'}
          onChange={(e) => setIconKey(e.target.value)}
          className="w-full rounded-[10px] border-hairline border-border bg-background px-3 py-2 text-body"
        >
          {SHOP_CATEGORY_ICON_KEYS.map((key) => (
            <option key={key} value={key}>
              {SHOP_CATEGORY_ICON_LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-caption text-muted-foreground">排序</span>
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
        <span className="text-body">啟用（前台顯示）</span>
      </label>

      {error ?
        <p className="text-caption text-destructive">{error}</p>
      : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? '儲存中…' : '儲存'}
        </Button>
        {allowDelete && initial ?
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
