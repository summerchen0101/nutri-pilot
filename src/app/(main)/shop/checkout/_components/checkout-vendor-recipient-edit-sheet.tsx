'use client';

import { useEffect, useState } from 'react';

import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import { Button } from '@/components/ui/button';
import type { VendorShippingSummary } from '@/lib/shop/vendor-shipping';
import { isCvsShippingCode } from '@/lib/shop/shipping-method-kind';

export interface CheckoutVendorRecipientEditSheetProps {
  open: boolean;
  summary: VendorShippingSummary | null;
  recipientName: string;
  recipientPhone: string;
  recipientAddressFull: string;
  saveShippingToProfile: boolean;
  cvsStoreNameByVendor: Record<string, string>;
  onClose: () => void;
  onSave: (patch: {
    vendorId: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddressFull: string;
    saveShippingToProfile: boolean;
    cvsStoreName: string;
  }) => void;
}

export function CheckoutVendorRecipientEditSheet({
  open,
  summary,
  recipientName,
  recipientPhone,
  recipientAddressFull,
  saveShippingToProfile,
  cvsStoreNameByVendor,
  onClose,
  onSave,
}: CheckoutVendorRecipientEditSheetProps) {
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftAddr, setDraftAddr] = useState('');
  const [draftSaveProfile, setDraftSaveProfile] = useState(false);
  const [draftCvs, setDraftCvs] = useState('');

  useEffect(() => {
    if (!open || !summary) return;
    setDraftName(recipientName);
    setDraftPhone(recipientPhone);
    setDraftAddr(recipientAddressFull);
    setDraftSaveProfile(saveShippingToProfile);
    setDraftCvs(cvsStoreNameByVendor[summary.vendorId] ?? '');
  }, [
    open,
    summary,
    recipientName,
    recipientPhone,
    recipientAddressFull,
    saveShippingToProfile,
    cvsStoreNameByVendor,
  ]);

  if (!summary) {
    return null;
  }

  const isCvs = isCvsShippingCode(summary.selectedShippingMethodCode);

  function handleSave() {
    if (!summary) return;
    onSave({
      vendorId: summary.vendorId,
      recipientName: draftName,
      recipientPhone: draftPhone,
      recipientAddressFull: draftAddr,
      saveShippingToProfile: draftSaveProfile,
      cvsStoreName: draftCvs,
    });
    onClose();
  }

  return (
    <BottomSheetShell
      open={open}
      title={`收件資料 · ${summary.vendorName}`}
      onClose={onClose}
      stackZClassName="z-[60]"
    >
      <div className="max-h-[min(70vh,520px)] space-y-3 overflow-y-auto pb-1">
        <label className="block">
          <span className="text-caption text-muted-foreground">收件人</span>
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="mt-1 w-full rounded-[10px] bg-[var(--shop-field-surface)] px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="text-caption text-muted-foreground">聯絡電話</span>
          <input
            type="tel"
            value={draftPhone}
            onChange={(e) => setDraftPhone(e.target.value)}
            className="mt-1 w-full rounded-[10px] bg-[var(--shop-field-surface)] px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
            autoComplete="tel"
          />
        </label>

        {isCvs ? (
          <p className="text-caption leading-relaxed text-muted-foreground">
            超商門市將於送出訂單後，透過綠界物流彈出視窗選擇（請確認收件人為 2–5 個中文字）。
          </p>
        ) : (
          <>
            <label className="block">
              <span className="text-caption text-muted-foreground">收件地址</span>
              <textarea
                value={draftAddr}
                onChange={(e) => setDraftAddr(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-y rounded-[10px] bg-[var(--shop-field-surface)] px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
                autoComplete="street-address"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-body text-foreground">
              <input
                type="checkbox"
                checked={draftSaveProfile}
                onChange={(e) => setDraftSaveProfile(e.target.checked)}
                className="h-4 w-4 rounded border-border text-[#4C956C] focus:ring-[#4C956C]"
              />
              同步存回「設定」中的購物配送資料
            </label>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            取消
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave}>
            儲存
          </Button>
        </div>
      </div>
    </BottomSheetShell>
  );
}
