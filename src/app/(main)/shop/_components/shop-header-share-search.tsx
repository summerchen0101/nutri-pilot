'use client';

import { Home, Search, Share2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { SHOP_HEADER_ICON_BUTTON_CLASS } from '@/app/(main)/shop/_components/shop-header-icon-styles';
import { useShopCatalogUiStore } from '@/lib/shop/shop-catalog-ui-store';
import { showSuccessMessage } from '@/lib/ui/app-message-store';
import { cn } from '@/lib/utils/cn';

interface ShopHeaderShareButtonProps {
  shareTitle?: string;
  shareUrl?: string;
}

export function ShopHeaderShareButton({
  shareTitle = 'Nutri Guard 健康商城',
  shareUrl,
}: ShopHeaderShareButtonProps) {
  async function handleShare() {
    const url =
      shareUrl ?? (typeof window !== 'undefined' ? window.location.href : '');
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      showSuccessMessage('已複製連結');
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        showSuccessMessage('已複製連結');
      } catch {
        showSuccessMessage('無法分享，請手動複製網址', null);
      }
    }
  }

  return (
    <button
      type="button"
      aria-label="分享"
      className={SHOP_HEADER_ICON_BUTTON_CLASS}
      onClick={() => {
        void handleShare();
      }}
    >
      <Share2 className="h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}

export function ShopCatalogSearchButton() {
  const pathname = usePathname();
  const router = useRouter();
  const isCatalogHome = pathname === '/shop' || pathname === '/shop/';
  const query = useShopCatalogUiStore((s) => s.catalogSearchQuery);
  const setQuery = useShopCatalogUiStore((s) => s.setCatalogSearchQuery);
  const overlayOpen = useShopCatalogUiStore((s) => s.catalogSearchOverlayOpen);
  const openOverlay = useShopCatalogUiStore((s) => s.openCatalogSearchOverlay);
  const closeOverlay = useShopCatalogUiStore((s) => s.closeCatalogSearchOverlay);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (overlayOpen && isCatalogHome) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [overlayOpen, isCatalogHome]);

  if (!isCatalogHome) {
    return (
      <button
        type="button"
        aria-label="搜尋商品"
        className={SHOP_HEADER_ICON_BUTTON_CLASS}
        onClick={() => {
          openOverlay();
          router.push('/shop');
        }}
      >
        <Search className="h-[18px] w-[18px]" aria-hidden />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="搜尋商品"
        aria-expanded={overlayOpen}
        className={SHOP_HEADER_ICON_BUTTON_CLASS}
        onClick={() => {
          if (overlayOpen) closeOverlay();
          else openOverlay();
        }}
      >
        <Search className="h-[18px] w-[18px]" aria-hidden />
      </button>

      {overlayOpen ?
        <>
          <button
            type="button"
            className="fixed inset-0 z-[46] bg-black/25"
            aria-label="關閉搜尋"
            onClick={() => {
              closeOverlay();
            }}
          />
          <div className="fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+4.25rem)] z-[47] rounded-xl border-hairline border-border bg-[var(--color-background-primary)] p-3 shadow-sm">
            <label className="sr-only" htmlFor="shop-catalog-search-input">
              搜尋商品名稱
            </label>
            <input
              ref={inputRef}
              id="shop-catalog-search-input"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              placeholder="搜尋商品名稱"
              autoComplete="off"
              className={cn(
                'h-11 w-full rounded-[10px] border-hairline border-border bg-secondary px-3 text-body text-foreground outline-none',
                'placeholder:text-muted-foreground',
                'focus:border-primary focus:ring-2 focus:ring-primary/15',
              )}
            />
          </div>
        </>
      : null}
    </>
  );
}

export function ShopHeaderHomeLink() {
  return (
    <Link
      href="/shop"
      aria-label="商城首頁"
      className={SHOP_HEADER_ICON_BUTTON_CLASS}
    >
      <Home className="h-[18px] w-[18px]" aria-hidden />
    </Link>
  );
}
