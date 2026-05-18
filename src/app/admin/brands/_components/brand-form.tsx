'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { saveBrand } from '@/app/admin/brands/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function BrandForm({
  vendors,
  initial,
}: Readonly<{
  vendors: { id: string; name: string }[];
  initial?: {
    id: string;
    name: string;
    slug: string;
    vendor_id: string | null;
    is_active: boolean | null;
    description: string | null;
    country: string | null;
  } | null;
}>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [vendorId, setVendorId] = useState(
    initial?.vendor_id ?? vendors[0]?.id ?? '',
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [country, setCountry] = useState(initial?.country ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!vendorId) {
      setError('請選擇所屬廠商');
      return;
    }
    startTransition(() => {
      void (async () => {
        const res = await saveBrand({
          id: initial?.id,
          name,
          slug: slug.trim() || undefined,
          vendor_id: vendorId,
          is_active: isActive,
          description,
          country,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        router.push(`/admin/brands/${res.id}`);
        router.refresh();
      })();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/brands"
            className="text-caption text-[#4C956C] hover:underline"
          >
            ← 品牌列表
          </Link>
          <h1 className="mt-2 text-heading-screen text-foreground">
            {initial ? '編輯品牌' : '新增品牌'}
          </h1>
        </div>
        <Button type="submit" variant="default" disabled={pending}>
          {pending ? '儲存中…' : '儲存'}
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-4 rounded-xl border border-border p-4">
        <div className="space-y-2">
          <label className="text-body font-medium">名稱</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-body font-medium">slug（選填，留空則自動）</label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-body font-medium">廠商</label>
          <select
            className="flex h-11 w-full rounded-[10px] border border-border bg-background px-3 text-body"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            required
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-body">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          上架中
        </label>
        <div className="space-y-2">
          <label className="text-body font-medium">描述</label>
          <textarea
            className="min-h-[72px] w-full rounded-[10px] border border-border px-3 py-2 text-body"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-body font-medium">國家／地區（選填）</label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>
    </form>
  );
}
