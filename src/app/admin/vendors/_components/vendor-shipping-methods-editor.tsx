'use client';

import { useState, useTransition } from 'react';

import {
  saveVendorShippingMethods,
  type VendorShippingMethodInput,
} from '@/app/admin/shop/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface VendorShippingMethodRow {
  id: string;
  code: string;
  label: string;
  shipping_fee: number;
  free_shipping_threshold: number | null;
  is_active: boolean;
  sort_order: number;
}

interface VendorShippingMethodsEditorProps {
  vendorId: string;
  initialMethods: VendorShippingMethodRow[];
  canEdit: boolean;
}

function parseNum(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function VendorShippingMethodsEditor({
  vendorId,
  initialMethods,
  canEdit,
}: VendorShippingMethodsEditorProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [rows, setRows] = useState(() =>
    initialMethods.map((m) => ({
      id: m.id,
      code: m.code,
      label: m.label,
      shippingFee: String(m.shipping_fee),
      freeShippingThreshold:
        m.free_shipping_threshold == null ?
          ''
        : String(m.free_shipping_threshold),
      isActive: m.is_active,
      sortOrder: String(m.sort_order),
    })),
  );

  function updateRow(
    id: string,
    patch: Partial<(typeof rows)[number]>,
  ) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setError(null);
    setMessage(null);

    const methods: VendorShippingMethodInput[] = [];
    for (const r of rows) {
      const fee = parseNum(r.shippingFee);
      const sort = parseNum(r.sortOrder);
      const thrRaw = r.freeShippingThreshold.trim();
      const threshold = thrRaw === '' ? null : parseNum(thrRaw);

      if (fee == null || fee < 0) {
        setError(`「${r.label}」運費格式不正確`);
        return;
      }
      if (sort == null || sort < 0) {
        setError(`「${r.label}」排序格式不正確`);
        return;
      }
      if (thrRaw !== '' && threshold == null) {
        setError(`「${r.label}」免運門檻格式不正確`);
        return;
      }

      methods.push({
        id: r.id,
        label: r.label,
        shippingFee: fee,
        freeShippingThreshold: threshold,
        isActive: r.isActive,
        sortOrder: sort,
      });
    }

    startTransition(() => {
      void (async () => {
        const res = await saveVendorShippingMethods({ vendorId, methods });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setMessage('已儲存運送方式');
      })();
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-border p-4">
      <h2 className="text-heading-section text-foreground">運送方式</h2>
      <p className="text-caption text-muted-foreground">
        結帳依各方式計費；免運門檻留空表示無免運優惠。
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {rows.map((r) => (
          <div
            key={r.id}
            className="space-y-3 rounded-lg border border-border/80 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-body font-medium">{r.label}</span>
              <span className="font-mono text-caption text-muted-foreground">
                {r.code}
              </span>
            </div>

            <label className="block space-y-1">
              <span className="text-caption text-muted-foreground">顯示名稱</span>
              <Input
                value={r.label}
                onChange={(e) => updateRow(r.id, { label: e.target.value })}
                disabled={!canEdit}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-caption text-muted-foreground">運費（NT$）</span>
                <Input
                  type="number"
                  min={0}
                  value={r.shippingFee}
                  onChange={(e) =>
                    updateRow(r.id, { shippingFee: e.target.value })
                  }
                  disabled={!canEdit}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-caption text-muted-foreground">
                  免運門檻（NT$，留空＝無）
                </span>
                <Input
                  type="number"
                  min={0}
                  value={r.freeShippingThreshold}
                  onChange={(e) =>
                    updateRow(r.id, {
                      freeShippingThreshold: e.target.value,
                    })
                  }
                  disabled={!canEdit}
                  placeholder="例如 1000"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="block space-y-1">
                <span className="text-caption text-muted-foreground">排序</span>
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  value={r.sortOrder}
                  onChange={(e) =>
                    updateRow(r.id, { sortOrder: e.target.value })
                  }
                  disabled={!canEdit}
                />
              </label>
              <label className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  checked={r.isActive}
                  onChange={(e) =>
                    updateRow(r.id, { isActive: e.target.checked })
                  }
                  disabled={!canEdit}
                />
                <span className="text-body">啟用</span>
              </label>
            </div>
          </div>
        ))}

        {error ?
          <p className="text-caption text-destructive">{error}</p>
        : null}
        {message ?
          <p className="text-caption text-[#2D6B4A]">{message}</p>
        : null}

        {canEdit ?
          <Button type="submit" disabled={pending}>
            {pending ? '儲存中…' : '儲存運送方式'}
          </Button>
        : null}
      </form>
    </section>
  );
}
