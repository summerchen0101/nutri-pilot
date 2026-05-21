'use client';

import { useEffect, useState } from 'react';

import { listUserShippingAddresses } from '@/app/(main)/settings/actions';
import { ShopRightSheet } from '@/app/(main)/shop/_components/shop-right-sheet';
import type { Tables } from '@/types/supabase';

export interface CheckoutAddressPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (row: Tables<'user_shipping_addresses'>) => void;
}

export function CheckoutAddressPickerSheet({
  open,
  onClose,
  onSelect,
}: CheckoutAddressPickerSheetProps) {
  const [rows, setRows] = useState<Tables<'user_shipping_addresses'>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await listUserShippingAddresses();
      if (cancelled) return;
      setLoading(false);
      if (res.rows) setRows(res.rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <ShopRightSheet open={open} onClose={onClose} title="選擇收件地址">
      <div className="px-4 pb-6">
        {loading ? (
          <p className="text-body text-muted-foreground">載入中…</p>
        ) : rows.length === 0 ? (
          <p className="text-body text-muted-foreground">
            尚無儲存地址，請至設定新增收件地址。
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="w-full rounded-xl bg-[var(--shop-field-surface)] px-3 py-3 text-left"
                  onClick={() => onSelect(row)}>
                  <p className="text-body text-foreground">{row.recipient_name}</p>
                  <p className="text-caption text-muted-foreground">{row.phone}</p>
                  <p className="mt-1 text-caption text-foreground">{row.address_full}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ShopRightSheet>
  );
}
