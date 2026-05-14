'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

import {
  createUserShippingAddress,
  deleteUserShippingAddress,
  listUserShippingAddresses,
  saveShopPersonalizeRecommendations,
  setDefaultUserShippingAddress,
  updateUserShippingAddress,
} from '@/app/(main)/settings/actions';
import { formatShippingTeaserLine } from '@/app/(main)/settings/_lib/shipping-summary';
import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/types/supabase';

export interface ShopSettingsSheetProps {
  open: boolean;
  onClose: () => void;
  dietMethodSummaryText: string;
  personalizeFromDietInitial: boolean;
}

export function ShopSettingsSheet({
  open,
  onClose,
  dietMethodSummaryText,
  personalizeFromDietInitial,
}: ShopSettingsSheetProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Tables<'user_shipping_addresses'>[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);
  const [personalize, setPersonalize] = useState(personalizeFromDietInitial);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressFull, setAddressFull] = useState('');
  const [asDefault, setAsDefault] = useState(false);

  useEffect(() => {
    setPersonalize(personalizeFromDietInitial);
  }, [personalizeFromDietInitial, open]);

  const reload = useCallback(() => {
    startTransition(async () => {
      const res = await listUserShippingAddresses();
      if (res.error) {
        setListErr(res.error);
        setRows([]);
        return;
      }
      setListErr(null);
      setRows(res.rows ?? []);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    setListErr(null);
    reload();
    setEditingId(null);
    setIsAdding(false);
    setFormErr(null);
    setRecipientName('');
    setPhone('');
    setAddressFull('');
    setAsDefault(false);
  }, [open, reload]);

  function openAdd() {
    setEditingId(null);
    setIsAdding(true);
    setRecipientName('');
    setPhone('');
    setAddressFull('');
    setAsDefault(rows.length === 0);
    setFormErr(null);
  }

  function openEdit(row: Tables<'user_shipping_addresses'>) {
    setIsAdding(false);
    setEditingId(row.id);
    setRecipientName(row.recipient_name);
    setPhone(row.phone);
    setAddressFull(row.address_full);
    setAsDefault(row.is_default);
    setFormErr(null);
  }

  function cancelForm() {
    setEditingId(null);
    setIsAdding(false);
    setFormErr(null);
  }

  function submitForm() {
    setFormErr(null);
    startTransition(async () => {
      if (isAdding) {
        const res = await createUserShippingAddress({
          recipientName,
          phone,
          addressFull,
          asDefault: asDefault || rows.length === 0,
        });
        if (res.error) {
          setFormErr(res.error);
          return;
        }
      } else if (editingId) {
        const res = await updateUserShippingAddress({
          id: editingId,
          recipientName,
          phone,
          addressFull,
        });
        if (res.error) {
          setFormErr(res.error);
          return;
        }
        if (asDefault) {
          const dRes = await setDefaultUserShippingAddress(editingId);
          if (dRes.error) {
            setFormErr(dRes.error);
            return;
          }
        }
      }
      cancelForm();
      reload();
      router.refresh();
    });
  }

  function onDelete(id: string) {
    if (!window.confirm('確定刪除此收件地址？')) return;
    setFormErr(null);
    startTransition(async () => {
      const res = await deleteUserShippingAddress(id);
      if (res.error) {
        setFormErr(res.error);
        return;
      }
      cancelForm();
      reload();
      router.refresh();
    });
  }

  function onSetDefault(id: string) {
    startTransition(async () => {
      const res = await setDefaultUserShippingAddress(id);
      if (res.error) {
        setListErr(res.error);
        return;
      }
      reload();
      router.refresh();
    });
  }

  function togglePersonalize(next: boolean) {
    startTransition(async () => {
      const res = await saveShopPersonalizeRecommendations(next);
      if (res.error) {
        setListErr(res.error);
        return;
      }
      setPersonalize(next);
      router.refresh();
    });
  }

  return (
    <BottomSheetShell open={open} title="商城設定" onClose={onClose}>
      <div className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto pb-3">
        <section>
          <h3 className="text-heading-card text-foreground">收件資訊</h3>
          <p className="mt-0.5 text-caption text-muted-foreground">
            可新增多筆地址，並指定一筆為結帳預設收件。
          </p>
          {listErr ? (
            <p className="mt-2 text-caption text-destructive" role="alert">
              {listErr}
            </p>
          ) : null}
          <ul className="mt-2 space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-[10px] border-hairline border-border bg-card px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-body text-foreground">
                      {formatShippingTeaserLine(row.recipient_name, row.address_full)}
                    </p>
                    {row.is_default ? (
                      <span className="mt-1 inline-block rounded-full bg-primary-light px-2 py-0.5 text-caption font-medium text-primary">
                        預設收件
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {!row.is_default ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="text-caption text-primary underline-offset-2 hover:underline disabled:opacity-50"
                        onClick={() => onSetDefault(row.id)}>
                        設為預設
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      className="text-caption text-primary underline-offset-2 hover:underline disabled:opacity-50"
                      onClick={() => openEdit(row)}>
                      編輯
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="text-caption text-destructive underline-offset-2 hover:underline disabled:opacity-50"
                      onClick={() => onDelete(row.id)}>
                      刪除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {rows.length === 0 && !isAdding && !editingId ? (
            <p className="mt-2 text-caption text-muted-foreground">尚未新增收件地址</p>
          ) : null}
          {!isAdding && !editingId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              disabled={pending}
              onClick={openAdd}>
              新增收件地址
            </Button>
          ) : null}

          {isAdding || editingId ? (
            <div className="mt-3 space-y-2 rounded-[10px] border-hairline border-border bg-secondary/30 p-3">
              <label className="block">
                <span className="text-caption text-muted-foreground">收件人</span>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="mt-1 text-body"
                />
              </label>
              <label className="block">
                <span className="text-caption text-muted-foreground">聯絡電話</span>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 text-body"
                  inputMode="tel"
                />
              </label>
              <label className="block">
                <span className="text-caption text-muted-foreground">收件地址</span>
                <textarea
                  value={addressFull}
                  onChange={(e) => setAddressFull(e.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-y rounded-[10px] border-hairline border-border bg-background px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>
              {isAdding && rows.length > 0 ? (
                <label className="flex items-center gap-2 text-caption text-foreground">
                  <input
                    type="checkbox"
                    checked={asDefault}
                    onChange={(e) => setAsDefault(e.target.checked)}
                  />
                  設為預設收件
                </label>
              ) : null}
              {editingId && !rows.find((r) => r.id === editingId)?.is_default ? (
                <label className="flex items-center gap-2 text-caption text-foreground">
                  <input
                    type="checkbox"
                    checked={asDefault}
                    onChange={(e) => setAsDefault(e.target.checked)}
                  />
                  設為預設收件
                </label>
              ) : null}
              {formErr ? (
                <p className="text-caption text-destructive" role="alert">
                  {formErr}
                </p>
              ) : null}
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="flex-1"
                  disabled={pending}
                  onClick={submitForm}>
                  {pending ? '儲存中…' : '儲存'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={pending}
                  onClick={cancelForm}>
                  取消
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="border-t-hairline border-border pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-heading-card text-foreground">飲食與推薦</h3>
              <p className="mt-0.5 text-caption text-muted-foreground">
                開啟時商城會依你的飲食偏好排序（目前：{dietMethodSummaryText}）。關閉時改以評分等一般排序。
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={personalize}
              disabled={pending}
              onClick={() => togglePersonalize(!personalize)}
              className={[
                'relative h-7 w-11 shrink-0 rounded-full transition-colors',
                personalize ? 'bg-primary' : 'bg-muted',
                pending ? 'opacity-60' : '',
              ].join(' ')}>
              <span
                className={[
                  'absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-neutral-bg-primary shadow transition-transform',
                  personalize ? 'translate-x-[18px]' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
          </div>
        </section>
      </div>
    </BottomSheetShell>
  );
}
