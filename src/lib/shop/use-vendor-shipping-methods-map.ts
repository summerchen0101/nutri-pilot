'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import type { VendorShippingMethodLite } from '@/lib/shop/vendor-shipping-method-types';

function normalizeRow(row: Record<string, unknown>): VendorShippingMethodLite {
  return {
    id: String(row.id),
    vendor_id: String(row.vendor_id),
    code: String(row.code),
    label: String(row.label),
    shipping_fee: Number(row.shipping_fee),
    free_shipping_threshold:
      row.free_shipping_threshold == null ?
        null
      : Number(row.free_shipping_threshold),
    sort_order: Number(row.sort_order ?? 0),
  };
}

/** 一次查詢所有相關廠商的啟用運送方式（無 N+1） */
export function useVendorShippingMethodsMap(vendorIds: string[]): {
  methodsByVendor: Map<string, VendorShippingMethodLite[]>;
  loading: boolean;
  loadFailed: boolean;
} {
  const key = Array.from(new Set(vendorIds)).sort().join('|');
  const [methodsByVendor, setMethodsByVendor] = useState<
    Map<string, VendorShippingMethodLite[]>
  >(() => new Map());
  const [loading, setLoading] = useState(Boolean(key.length));
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!vendorIds.length) {
      setMethodsByVendor(new Map());
      setLoading(false);
      setLoadFailed(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadFailed(false);
      const ids = Array.from(new Set(vendorIds));
      const supabase = createClient();
      const { data, error } = await supabase
        .from('vendor_shipping_methods')
        .select(
          'id, vendor_id, code, label, shipping_fee, free_shipping_threshold, sort_order',
        )
        .in('vendor_id', ids)
        .eq('is_active', true);

      if (cancelled) return;

      if (error) {
        console.error(error.message);
        setLoadFailed(true);
        setMethodsByVendor(new Map());
        setLoading(false);
        return;
      }

      const map = new Map<string, VendorShippingMethodLite[]>();
      for (const raw of data ?? []) {
        const row = normalizeRow(raw as Record<string, unknown>);
        const arr = map.get(row.vendor_id) ?? [];
        arr.push(row);
        map.set(row.vendor_id, arr);
      }
      map.forEach((rows) => {
        rows.sort(
          (a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code),
        );
      });
      setMethodsByVendor(map);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [key, vendorIds]);

  return { methodsByVendor, loading, loadFailed };
}
