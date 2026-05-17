'use client';

import Link from 'next/link';

export function CheckoutLegalHint() {
  return (
    <section className="rounded-xl bg-[var(--color-background-primary)] px-4 py-4">
      <h2 className="text-heading-section text-foreground">購物須知</h2>
      <p className="mt-2 text-caption leading-relaxed text-muted-foreground">
        訂單成立與配送規則、個人資料與會員權益等完整說明，請見客服與條款頁面；內容更新時以該頁為準。
      </p>
      <Link
        href="/support"
        className="mt-2 inline-block text-body font-medium text-[#378ADD] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-1"
      >
        前往客服與條款說明
      </Link>
    </section>
  );
}
