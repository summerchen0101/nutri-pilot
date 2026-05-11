'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { startCheckout } from '@/app/(main)/shop/actions';
import { Button } from '@/components/ui/button';
import { HEADER_LEADING_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { PageHeader } from '@/components/layout/page-header';
import {
  calcVendorShippingSummaries,
  cartGrandTotal,
  cartTotalShipping,
} from '@/lib/shop/vendor-shipping';
import { cartTotalItemsSubtotal, useCartStore, type CartLine } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import { submitNewebpayMpgForm } from '@/lib/shop/submit-newebpay-mpg-form';

export interface CheckoutClientProps {
  defaultRecipientName: string;
  defaultPhone: string;
  defaultAddressFull: string;
}

export function CheckoutClient({
  defaultRecipientName,
  defaultPhone,
  defaultAddressFull,
}: CheckoutClientProps) {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);

  const [recipientName, setRecipientName] = useState(defaultRecipientName);
  const [recipientPhone, setRecipientPhone] = useState(defaultPhone);
  const [recipientAddressFull, setRecipientAddressFull] = useState(
    defaultAddressFull,
  );
  const [saveShippingToProfile, setSaveShippingToProfile] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const validLines = useMemo(
    () =>
      lines.filter(
        (l): l is CartLine =>
          Boolean(l.vendorId && l.vendorName && typeof l.unitPrice === 'number'),
      ),
    [lines],
  );

  const summaries = useMemo(
    () => calcVendorShippingSummaries(validLines),
    [validLines],
  );

  const itemsSubtotal = useMemo(
    () => cartTotalItemsSubtotal(validLines),
    [validLines],
  );
  const shippingTotal = useMemo(
    () => cartTotalShipping(summaries),
    [summaries],
  );
  const grandTotal = useMemo(() => cartGrandTotal(validLines), [validLines]);

  useEffect(() => {
    if (lines.length === 0) {
      router.replace('/shop/cart');
    }
  }, [lines.length, router]);

  useEffect(() => {
    setRecipientName(defaultRecipientName);
    setRecipientPhone(defaultPhone);
    setRecipientAddressFull(defaultAddressFull);
  }, [defaultRecipientName, defaultPhone, defaultAddressFull]);

  const itemsPayload = validLines.map((l) => ({
    variantId: l.variantId,
    qty: l.qty,
  }));

  const hasLegacyLines = lines.length > 0 && validLines.length < lines.length;

  function pay() {
    setErr(null);
    if (!validLines.length) {
      setErr('購物車無有效品項，請重新加入商品');
      return;
    }
    const rn = recipientName.trim();
    const rp = recipientPhone.trim();
    const ra = recipientAddressFull.trim();
    if (!rn || !rp || !ra) {
      setErr('請填寫完整收件人姓名、電話與地址');
      return;
    }

    startTransition(async () => {
      const res = await startCheckout({
        items: itemsPayload,
        recipientName: rn,
        recipientPhone: rp,
        recipientAddressFull: ra,
        saveShippingToProfile,
      });
      if (res.error) {
        setErr(res.error);
        return;
      }
      if (res.paymentUrl && res.formFields) {
        submitNewebpayMpgForm(res.paymentUrl, res.formFields);
      }
    });
  }

  if (lines.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        正在前往購物車…
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        leading={
          <Link
            href="/shop/cart"
            aria-label="返回購物車"
            className={HEADER_LEADING_ICON_CLASS}>
            <ChevronLeft className="h-[18px] w-[18px]" aria-hidden />
          </Link>
        }
        title="確認結帳"
        meta={
          <p className="text-caption text-muted-foreground">
            宅配｜與全單相同收件地址
          </p>
        }
      />

      {hasLegacyLines ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          購物車含有舊版資料，請先清空購物車後重新加入商品。
        </p>
      ) : null}

      <section className="rounded-xl border-hairline border-border bg-card p-4">
        <h2 className="text-heading-section text-foreground">收件資料</h2>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-caption text-muted-foreground">收件人</span>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="mt-1 w-full rounded-lg border-hairline border-border bg-background px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="text-caption text-muted-foreground">聯絡電話</span>
            <input
              type="tel"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border-hairline border-border bg-background px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
              autoComplete="tel"
            />
          </label>
          <label className="block">
            <span className="text-caption text-muted-foreground">收件地址</span>
            <textarea
              value={recipientAddressFull}
              onChange={(e) => setRecipientAddressFull(e.target.value)}
              rows={3}
              className="mt-1 w-full resize-y rounded-lg border-hairline border-border bg-background px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
              autoComplete="street-address"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-foreground">
            <input
              type="checkbox"
              checked={saveShippingToProfile}
              onChange={(e) => setSaveShippingToProfile(e.target.checked)}
              className="h-4 w-4 rounded border-border text-[#4C956C] focus:ring-[#4C956C]"
            />
            同步存回「設定」中的購物配送資料
          </label>
        </div>
      </section>

      <section className="rounded-xl border-hairline border-border bg-card p-4">
        <h2 className="text-heading-section text-foreground">訂單明細</h2>
        <ul className="mt-3 space-y-4">
          {summaries.map((v) => (
            <li key={v.vendorId} className="border-b-hairline border-border pb-4 last:border-0 last:pb-0">
              <p className="text-caption font-semibold text-primary">
                {v.vendorName}
              </p>
              <ul className="mt-2 space-y-2">
                {v.lines.map((line) => (
                  <li
                    key={line.variantId}
                    className="flex justify-between gap-2 text-[13px] text-foreground">
                    <span className="min-w-0 flex-1">
                      {line.productName} · {line.variantLabel} ×{' '}
                      {formatShopGroupedInteger(line.qty)}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      NT${' '}
                      {formatShopGroupedInteger(line.unitPrice * line.qty)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap justify-between gap-2 text-[13px] text-muted-foreground">
                <span>小計</span>
                <span className="tabular-nums text-foreground">
                  NT$ {formatShopGroupedInteger(v.itemsSubtotal)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap justify-between gap-2 text-[13px]">
                <span className="text-muted-foreground">運費</span>
                <span className="tabular-nums text-foreground">
                  NT$ {formatShopGroupedInteger(v.effectiveShipping)}
                  {v.gapToFreeShipping != null && v.effectiveShipping > 0 ?
                    `（差 NT$${formatShopGroupedInteger(v.gapToFreeShipping)} 享免運）`
                  : v.effectiveShipping === 0 ?
                    '（已達免運）'
                  : null}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 border-t-hairline border-border pt-4 text-[13px]">
          <div className="flex justify-between text-muted-foreground">
            <span>商品小計</span>
            <span className="tabular-nums text-foreground">
              NT$ {formatShopGroupedInteger(itemsSubtotal)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>運費合計</span>
            <span className="tabular-nums text-foreground">
              NT$ {formatShopGroupedInteger(shippingTotal)}
            </span>
          </div>
          <div className="flex justify-between text-heading-section text-foreground">
            <span>應付總額</span>
            <span className="tabular-nums">
              NT$ {formatShopGroupedInteger(grandTotal)}
            </span>
          </div>
        </div>
      </section>

      {err ? (
        <p className="text-body text-[#E24B4A]" role="alert">
          {err}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/shop/cart"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] border-hairline border-border bg-transparent px-[18px] py-[11px] text-body font-medium text-foreground transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1">
          返回購物車
        </Link>
        <Button
          type="button"
          className="sm:flex-1 bg-[#4C956C] text-white hover:bg-[#3A7A56] focus-visible:ring-[#4C956C]/25"
          disabled={pending || !validLines.length || hasLegacyLines}
          onClick={pay}>
          {pending ? '處理中…' : '前往藍新付款'}
        </Button>
      </div>
    </div>
  );
}
