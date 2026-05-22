'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deleteShopCategory } from '@/app/admin/shop/actions';

interface ShopCategoryListActionsProps {
  slug: string;
  label: string;
  canDelete: boolean;
}

export function ShopCategoryListActions({
  slug,
  label,
  canDelete,
}: ShopCategoryListActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!canDelete || pending) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `確定刪除分類「${label}」（${slug}）？\n若有商品仍使用此分類，將無法刪除。`,
      )
    ) {
      return;
    }

    setError(null);
    setPending(true);
    void (async () => {
      const res = await deleteShopCategory({ slug });
      setPending(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    })();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-3">
        <Link
          href={`/admin/shop/categories/${slug}`}
          className="text-caption text-primary hover:underline"
        >
          編輯
        </Link>
        {canDelete ?
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="text-caption text-[#E55A3C] hover:underline disabled:opacity-50"
          >
            {pending ? '刪除中…' : '刪除'}
          </button>
        : null}
      </div>
      {error ?
        <p className="max-w-[12rem] text-right text-micro text-[#E55A3C]">{error}</p>
      : null}
    </div>
  );
}
