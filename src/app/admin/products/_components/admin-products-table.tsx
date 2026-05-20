'use client';

import Image from 'next/image';
import Link from 'next/link';
import { GripVertical, Package } from 'lucide-react';
import { useCallback, useState, useTransition } from 'react';

import { reorderProducts } from '@/app/admin/products/actions';
import {
  adminListTableThClassName,
  adminListTableTheadClassName,
} from '@/app/admin/_lib/admin-list-table-classes';

export interface AdminProductListRow {
  id: string;
  name: string;
  slug: string;
  category: string;
  is_active: boolean | null;
  image_url: string | null;
  sort_order: number;
  brandName: string | null;
  variantCount: number;
}

function reorderList(
  items: AdminProductListRow[],
  fromIndex: number,
  toIndex: number,
): AdminProductListRow[] {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function ProductThumbnail({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-lg object-cover"
        unoptimized
      />
    );
  }

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-slate-500"
      aria-hidden
    >
      <Package className="h-5 w-5" strokeWidth={1.5} />
    </div>
  );
}

interface AdminProductsTableProps {
  initialRows: AdminProductListRow[];
}

export function AdminProductsTable({ initialRows }: AdminProductsTableProps) {
  const [rows, setRows] = useState(initialRows);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const persistOrder = useCallback(
    (nextRows: AdminProductListRow[], previousRows: AdminProductListRow[]) => {
      setRows(nextRows);
      setErrorMessage(null);

      startTransition(() => {
        void (async () => {
          const result = await reorderProducts(nextRows.map((r) => r.id));
          if (!result.ok) {
            setRows(previousRows);
            setErrorMessage(result.error);
          }
        })();
      });
    },
    [],
  );

  function handleDragStart(index: number) {
    if (isPending) return;
    setDragIndex(index);
  }

  function handleDragOver(event: React.DragEvent<HTMLTableRowElement>) {
    event.preventDefault();
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || isPending) return;
    if (dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const previous = rows;
    const next = reorderList(rows, dragIndex, targetIndex);
    setDragIndex(null);
    persistOrder(next, previous);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  return (
    <div className="space-y-2">
      {errorMessage ?
        <p className="text-caption text-[#E24B4A]" role="alert">
          {errorMessage}
        </p>
      : null}
      {isPending ?
        <p className="text-caption text-slate-600">儲存排序中…</p>
      : null}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[800px] text-left text-body">
          <thead className={adminListTableTheadClassName}>
            <tr>
              <th className={adminListTableThClassName} aria-label="排序" />
              <th className={adminListTableThClassName}>圖片</th>
              <th className={adminListTableThClassName}>名稱</th>
              <th className={adminListTableThClassName}>品牌</th>
              <th className={adminListTableThClassName}>分類</th>
              <th className={adminListTableThClassName}>規格數</th>
              <th className={adminListTableThClassName}>狀態</th>
              <th className={adminListTableThClassName} />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((p, index) => (
              <tr
                key={p.id}
                draggable={!isPending}
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={
                  dragIndex === index ? 'bg-primary-light/60' : undefined
                }
              >
                <td className="w-10 px-2 py-3">
                  <button
                    type="button"
                    className="flex cursor-grab items-center justify-center text-slate-500 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`拖曳排序：${p.name}`}
                    disabled={isPending}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <ProductThumbnail imageUrl={p.image_url} name={p.name} />
                </td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{p.brandName ?? '—'}</td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">{p.variantCount}</td>
                <td className="px-4 py-3">
                  {p.is_active ?
                    <span className="rounded-full bg-[#E8F5EE] px-2 py-0.5 text-caption font-medium text-[#2D6B4A]">
                      上架
                    </span>
                  : <span className="text-caption text-slate-600">下架</span>}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="text-[#4C956C] hover:underline"
                  >
                    編輯
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
