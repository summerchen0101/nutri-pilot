'use client';

import { ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import { effectiveShippingForVendor } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import type { VendorShippingMethodLite } from '@/lib/shop/vendor-shipping-method-types';
import { cn } from '@/lib/utils/cn';

export interface CartVendorShippingPickerProps {
  ariaLabelSuffix: string;
  methods: VendorShippingMethodLite[];
  selectedMethodId: string | null;
  onSelectMethodId: (methodId: string) => void;
  /** 該廠商品小計（元，整數），用於各運送方式 effective 運費 */
  itemsSubtotalRounded: number;
}

function methodEffectiveFee(
  m: VendorShippingMethodLite,
  itemsSubtotalRounded: number,
): number {
  return effectiveShippingForVendor(
    itemsSubtotalRounded,
    m.shipping_fee,
    m.free_shipping_threshold,
  );
}

function shippingMethodFreeHint(
  threshold: number | null,
): { show: true; amount: number } | { show: false } {
  if (threshold == null || threshold <= 0) {
    return { show: false };
  }
  return { show: true, amount: threshold };
}

export interface VendorShippingMethodPickerSheetProps {
  open: boolean;
  onClose: () => void;
  methods: VendorShippingMethodLite[];
  selectedMethodId: string | null;
  onSelectMethodId: (methodId: string) => void;
  itemsSubtotalRounded: number;
  /** 全螢幕遮罩／面板層級（預設 `z-50`）；結帳側欄內需高於 `z-[56]` */
  stackZClassName?: string;
}

export function VendorShippingMethodPickerSheet({
  open,
  onClose,
  methods,
  selectedMethodId,
  onSelectMethodId,
  itemsSubtotalRounded,
  stackZClassName,
}: VendorShippingMethodPickerSheetProps) {
  if (methods.length === 0) {
    return null;
  }

  const resolvedSelectedId = selectedMethodId ?? methods[0]!.id;

  return (
    <BottomSheetShell
      open={open}
      title="選擇運送方式"
      stackZClassName={stackZClassName}
      onClose={onClose}>
      <div className="max-h-[min(60vh,420px)] space-y-2 overflow-y-auto pb-2">
        {methods.map((m) => {
          const active = m.id === resolvedSelectedId;
          const eff = methodEffectiveFee(m, itemsSubtotalRounded);
          const freeHint = shippingMethodFreeHint(m.free_shipping_threshold);
          return (
            <button
              key={m.id}
              type="button"
              className={cn(
                'flex min-h-11 w-full items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5 text-left',
                active ?
                  'border-primary bg-primary text-white'
                : 'border-hairline border-border bg-transparent text-foreground',
              )}
              onClick={() => {
                onSelectMethodId(m.id);
                onClose();
              }}>
              <span className="min-w-0 flex-1 space-y-0.5">
                <span className="block text-body">{m.label}</span>
                {freeHint.show ?
                  <span
                    className={cn(
                      'block text-caption',
                      active ? 'text-white/80' : 'text-muted-foreground',
                    )}>
                    滿 NT$ {formatShopGroupedInteger(freeHint.amount)} 免運
                  </span>
                : null}
              </span>
              <span
                className={cn(
                  'shrink-0 tabular-nums text-body',
                  active ? 'text-white' : 'text-muted-foreground',
                )}>
                NT$ {formatShopGroupedInteger(eff)}
              </span>
            </button>
          );
        })}
      </div>
    </BottomSheetShell>
  );
}

export function CartVendorShippingPicker({
  ariaLabelSuffix,
  methods,
  selectedMethodId,
  onSelectMethodId,
  itemsSubtotalRounded,
}: CartVendorShippingPickerProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (methods.length === 0) {
    return null;
  }

  const resolvedSelectedId = selectedMethodId ?? methods[0]!.id;
  const selectedRow =
    methods.find((m) => m.id === resolvedSelectedId) ?? methods[0]!;

  if (methods.length === 1) {
    const eff = methodEffectiveFee(selectedRow, itemsSubtotalRounded);
    return (
      <p className="text-caption text-muted-foreground">
        運送方式：{selectedRow.label}
        <span className="tabular-nums text-foreground">
          {' '}
          · NT$ {formatShopGroupedInteger(eff)}
        </span>
      </p>
    );
  }

  const summaryEff = methodEffectiveFee(selectedRow, itemsSubtotalRounded);

  return (
    <>
      <button
        type="button"
        className="flex w-full min-h-11 items-center justify-between gap-3 rounded-[10px] border-hairline border-border bg-transparent px-3 py-2.5 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
        aria-label={`${ariaLabelSuffix}：選擇運送方式`}
        aria-expanded={sheetOpen}
        onClick={() => setSheetOpen(true)}>
        <span className="min-w-0 flex-1 text-body text-foreground">
          <span className="text-caption text-muted-foreground">運送方式</span>
          <span className="mt-0.5 block font-medium">
            {selectedRow.label}
            <span className="ml-1.5 tabular-nums font-normal text-muted-foreground">
              NT$ {formatShopGroupedInteger(summaryEff)}
            </span>
          </span>
        </span>
        <ChevronRight
          className="h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>

      <VendorShippingMethodPickerSheet
        open={sheetOpen}
        methods={methods}
        selectedMethodId={selectedMethodId}
        itemsSubtotalRounded={itemsSubtotalRounded}
        onClose={() => setSheetOpen(false)}
        onSelectMethodId={onSelectMethodId}
      />
    </>
  );
}
