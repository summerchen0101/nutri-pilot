'use client';

import { Truck } from 'lucide-react';
import { useState, useTransition } from 'react';

import { saveShippingProfile } from '@/app/(main)/settings/actions';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { SectionHeading } from '@/components/ui/section-heading';

export interface ShippingDeliveryCardProps {
  initialRecipientName: string;
  initialPhone: string;
  initialAddressFull: string;
}

export function ShippingDeliveryCard({
  initialRecipientName,
  initialPhone,
  initialAddressFull,
}: ShippingDeliveryCardProps) {
  const [recipientName, setRecipientName] = useState(initialRecipientName);
  const [phone, setPhone] = useState(initialPhone);
  const [addressFull, setAddressFull] = useState(initialAddressFull);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setErr(null);
    startTransition(async () => {
      const res = await saveShippingProfile({
        recipientName,
        phone,
        addressFull,
      });
      if (res.error) {
        setErr(res.error);
        return;
      }
    });
  }

  return (
    <SectionCard>
      <SectionHeading icon={Truck} className="mb-2">
        購物配送資料
      </SectionHeading>
      <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
        結帳時會預填以下資料，仍可在結帳頁修改；勾選「記住」時會同步回此處。
      </p>
      <div className="space-y-3">
        <label className="block">
          <span className="text-caption text-muted-foreground">收件人</span>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="mt-1 w-full rounded-lg border-hairline border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="text-caption text-muted-foreground">聯絡電話</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border-hairline border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
            autoComplete="tel"
          />
        </label>
        <label className="block">
          <span className="text-caption text-muted-foreground">收件地址</span>
          <textarea
            value={addressFull}
            onChange={(e) => setAddressFull(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-y rounded-lg border-hairline border-border bg-background px-3 py-2 text-body text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
            autoComplete="street-address"
          />
        </label>
        {err ? (
          <p className="text-body text-[#E24B4A]" role="alert">
            {err}
          </p>
        ) : null}
        <Button
          type="button"
          className="w-full bg-[#4C956C] text-white hover:bg-[#3A7A56] focus-visible:ring-[#4C956C]/25"
          disabled={pending}
          onClick={save}>
          {pending ? '儲存中…' : '儲存配送資料'}
        </Button>
      </div>
    </SectionCard>
  );
}
