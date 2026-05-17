'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useState,
  useTransition,
} from 'react';
import { FiChevronLeft } from 'react-icons/fi';

import {
  getCheckoutShippingDefaults,
  startCheckout,
} from '@/app/(main)/shop/actions';
import { HEADER_LEADING_ICON_CLASS } from '@/components/layout/header-action-icon-styles';
import { STICKY_PAGE_HEADER_SCROLL_THRESHOLD } from '@/components/layout/sticky-page-header-shell';
import { Button } from '@/components/ui/button';
import { useCartDerived } from '@/lib/shop/use-cart-derived';
import { useCartStore } from '@/lib/shop/cart-store';
import { formatShopGroupedInteger } from '@/lib/shop/format-shop-number';
import { submitNewebpayMpgForm } from '@/lib/shop/submit-newebpay-mpg-form';

export interface CheckoutClientProps {
  /** 供父層 `ShopRightSheet` 的 `elevatedHeader` 使用 */
  onBodyScrollTopChange?: (scrollTop: number) => void;
}

export function CheckoutClient({
  onBodyScrollTopChange,
}: CheckoutClientProps) {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const isCheckoutPanelOpen = useCartStore((s) => s.isCheckoutPanelOpen);
  const closeCheckoutPanel = useCartStore((s) => s.closeCheckoutPanel);
  const openCartPanel = useCartStore((s) => s.openCartPanel);
  const vendorShippingSelections = useCartStore(
    (s) => s.vendorShippingSelections,
  );

  const {
    validLines,
    summaries,
    itemsSubtotal,
    shippingTotal,
    grandTotal,
    hasLegacyLines,
  } = useCartDerived();

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [recipientAddressFull, setRecipientAddressFull] = useState('');
  const [saveShippingToProfile, setSaveShippingToProfile] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [defaultsLoading, setDefaultsLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      onBodyScrollTopChange?.(e.currentTarget.scrollTop);
    },
    [onBodyScrollTopChange],
  );

  useEffect(() => {
    if (!isCheckoutPanelOpen || lines.length === 0) return;

    let cancelled = false;
    setDefaultsLoading(true);
    void (async () => {
      const res = await getCheckoutShippingDefaults();
      if (cancelled) return;
      setDefaultsLoading(false);
      if (!res.ok) {
        if (res.reason === 'unauthenticated') {
          closeCheckoutPanel();
          router.replace('/login');
          return;
        }
        closeCheckoutPanel();
        router.replace('/onboarding');
        return;
      }
      setRecipientName(res.defaultRecipientName);
      setRecipientPhone(res.defaultPhone);
      setRecipientAddressFull(res.defaultAddressFull);
    })();

    return () => {
      cancelled = true;
    };
  }, [isCheckoutPanelOpen, lines.length, closeCheckoutPanel, router]);

  useEffect(() => {
    if (!isCheckoutPanelOpen || lines.length > 0) return;
    closeCheckoutPanel();
    openCartPanel();
  }, [isCheckoutPanelOpen, lines.length, closeCheckoutPanel, openCartPanel]);

  const itemsPayload = validLines.map((l) => ({
    variantId: l.variantId,
    qty: l.qty,
  }));

  function goBackToCart() {
    closeCheckoutPanel();
    openCartPanel();
  }

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
        vendorShippingSelections,
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
        closeCheckoutPanel();
        submitNewebpayMpgForm(res.paymentUrl, res.formFields);
      }
    });
  }

  if (lines.length === 0) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {defaultsLoading ?
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
          <p className="text-caption text-muted-foreground">載入收件資料…</p>
        </div>
      : (
        <>
          <div
            onScroll={onScroll}
            className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-3 pb-4 [-webkit-overflow-scrolling:touch] hide-scrollbar">
            <p className="text-caption text-muted-foreground">
              多廠依各自運送方式與免運門檻計費｜收件地址適用於全單宅配區段
            </p>

            {hasLegacyLines ?
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-body text-amber-900">
                購物車含有舊版資料，請先清空購物車後重新加入商品。
              </p>
            : null}

            <section className="rounded-xl border-hairline border-border bg-card p-4">
              <h2 className="text-heading-section text-foreground">收件資料</h2>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-caption text-muted-foreground">
                    收件人
                  </span>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="mt-1 w-full rounded-lg border-hairline border-border bg-background px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
                    autoComplete="name"
                  />
                </label>
                <label className="block">
                  <span className="text-caption text-muted-foreground">
                    聯絡電話
                  </span>
                  <input
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border-hairline border-border bg-background px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
                    autoComplete="tel"
                  />
                </label>
                <label className="block">
                  <span className="text-caption text-muted-foreground">
                    收件地址
                  </span>
                  <textarea
                    value={recipientAddressFull}
                    onChange={(e) => setRecipientAddressFull(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-y rounded-lg border-hairline border-border bg-background px-3 py-2 text-body outline-none focus-visible:ring-2 focus-visible:ring-[#4C956C] focus-visible:ring-offset-1"
                    autoComplete="street-address"
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-body text-foreground">
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
                  <li
                    key={v.vendorId}
                    className="border-b-hairline border-border pb-4 last:border-0 last:pb-0">
                    <p className="text-caption font-medium text-primary">
                      {v.vendorName}
                    </p>
                    {v.selectedShippingMethodLabel ?
                      <p className="mt-1 text-caption text-muted-foreground">
                        運送：{v.selectedShippingMethodLabel}
                      </p>
                    : null}
                    <ul className="mt-2 space-y-2">
                      {v.lines.map((line) => (
                        <li
                          key={line.variantId}
                          className="flex justify-between gap-2 text-body text-foreground">
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
                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-body text-muted-foreground">
                      <span>小計</span>
                      <span className="tabular-nums text-foreground">
                        NT$ {formatShopGroupedInteger(v.itemsSubtotal)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap justify-between gap-2 text-body">
                      <span className="text-muted-foreground">運費</span>
                      <span className="tabular-nums text-foreground">
                        NT$ {formatShopGroupedInteger(v.effectiveShipping)}
                        {v.gapToFreeShipping != null &&
                        v.effectiveShipping > 0 ?
                          `（差 NT$${formatShopGroupedInteger(v.gapToFreeShipping)} 享免運）`
                        : v.effectiveShipping === 0 ?
                          '（已達免運）'
                        : null}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2 border-t-hairline border-border pt-4 text-body">
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

            {err ?
              <p className="text-body text-[#E24B4A]" role="alert">
                {err}
              </p>
            : null}
          </div>

          <div className="w-full shrink-0 border-t-hairline border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[10px] border-hairline border-border bg-transparent px-[18px] py-[11px] text-body font-medium text-foreground transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
                onClick={goBackToCart}>
                返回購物車
              </button>
              <Button
                type="button"
                className="bg-[#4C956C] text-white hover:bg-[#3A7A56] focus-visible:ring-[#4C956C]/25 sm:flex-1"
                disabled={pending || !validLines.length || hasLegacyLines}
                onClick={pay}>
                {pending ? '處理中…' : '前往藍新付款'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function CheckoutPanelBackButton({
  onBack,
}: {
  onBack: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="返回購物車"
      className={HEADER_LEADING_ICON_CLASS}
      onClick={onBack}>
      <FiChevronLeft className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}
