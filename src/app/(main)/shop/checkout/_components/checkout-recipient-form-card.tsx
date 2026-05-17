'use client';

export interface CheckoutRecipientFormCardProps {
  recipientName: string;
  recipientPhone: string;
  recipientAddressFull: string;
  saveShippingToProfile: boolean;
  onRecipientNameChange: (value: string) => void;
  onRecipientPhoneChange: (value: string) => void;
  onRecipientAddressChange: (value: string) => void;
  onSaveShippingToProfileChange: (checked: boolean) => void;
}

export function CheckoutRecipientFormCard({
  recipientName,
  recipientPhone,
  recipientAddressFull,
  saveShippingToProfile,
  onRecipientNameChange,
  onRecipientPhoneChange,
  onRecipientAddressChange,
  onSaveShippingToProfileChange,
}: CheckoutRecipientFormCardProps) {
  return (
    <section className="rounded-xl bg-[var(--color-background-primary)] px-4 py-4">
      <h2 className="text-heading-section text-foreground">
        收件資料
        <span className="ml-0.5 text-[#E24B4A]" aria-hidden>
          *
        </span>
      </h2>
      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="text-caption text-muted-foreground">收件人</span>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => onRecipientNameChange(e.target.value)}
            className="mt-1 w-full rounded-[10px] bg-[var(--shop-field-surface)] px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
            autoComplete="name"
          />
        </label>
        <label className="block">
          <span className="text-caption text-muted-foreground">聯絡電話</span>
          <input
            type="tel"
            value={recipientPhone}
            onChange={(e) => onRecipientPhoneChange(e.target.value)}
            className="mt-1 w-full rounded-[10px] bg-[var(--shop-field-surface)] px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
            autoComplete="tel"
          />
        </label>
        <label className="block">
          <span className="text-caption text-muted-foreground">收件地址</span>
          <textarea
            value={recipientAddressFull}
            onChange={(e) => onRecipientAddressChange(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-y rounded-[10px] bg-[var(--shop-field-surface)] px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
            autoComplete="street-address"
          />
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-body text-foreground">
          <input
            type="checkbox"
            checked={saveShippingToProfile}
            onChange={(e) => onSaveShippingToProfileChange(e.target.checked)}
            className="h-4 w-4 rounded border-border text-[#4C956C] focus:ring-[#4C956C]"
          />
          同步存回「設定」中的購物配送資料
        </label>
      </div>
    </section>
  );
}
