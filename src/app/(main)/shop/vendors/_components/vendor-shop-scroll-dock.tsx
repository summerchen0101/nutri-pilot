'use client';

import { useEffect, useRef, useState } from 'react';

import { ShopCatalogStickyTabs } from '@/app/(main)/shop/_components/shop-catalog-sticky-tabs';
import { MAIN_SHELL_CONTENT_WIDTH_CLASS } from '@/components/layout/main-shell-content-width-class';
import { SHOP_HEADER_SCROLL_ANCHOR_ID } from '@/lib/shop/constants';
import { cn } from '@/lib/utils/cn';

const VENDOR_DOCK_EPSILON_PX = 0.75;

interface VendorShopScrollDockProps {
  vendorName: string;
}

export function VendorShopScrollDock({ vendorName }: VendorShopScrollDockProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef(0);
  const [isPinned, setIsPinned] = useState(false);
  const [dockTopPx, setDockTopPx] = useState(0);
  const [dockHeightPx, setDockHeightPx] = useState(0);

  useEffect(() => {
    const syncDock = () => {
      const anchor = document.getElementById(SHOP_HEADER_SCROLL_ANCHOR_ID);
      const sentinel = sentinelRef.current;
      const dock = dockRef.current;
      if (!anchor || !sentinel) return;

      const headerBottomPx = anchor.getBoundingClientRect().bottom;
      const sentinelTopPx = sentinel.getBoundingClientRect().top;

      setDockTopPx(headerBottomPx);
      if (dock) {
        setDockHeightPx(dock.offsetHeight);
      }
      setIsPinned(
        sentinelTopPx <= headerBottomPx + VENDOR_DOCK_EPSILON_PX,
      );
    };

    const scheduleDockSync = () => {
      if (scrollRafRef.current !== 0) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = 0;
        syncDock();
      });
    };

    syncDock();
    window.addEventListener('scroll', scheduleDockSync, { passive: true });
    window.addEventListener('resize', scheduleDockSync);

    return () => {
      window.removeEventListener('scroll', scheduleDockSync);
      window.removeEventListener('resize', scheduleDockSync);
      if (scrollRafRef.current !== 0) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = 0;
      }
    };
  }, []);

  return (
    <div className="-mx-4 mb-3">
      <div
        ref={sentinelRef}
        className="pointer-events-none h-px w-full shrink-0 opacity-0"
        aria-hidden
      />

      {isPinned ?
        <div
          aria-hidden
          className="shrink-0"
          style={{ height: dockHeightPx > 0 ? dockHeightPx : undefined }}
        />
      : null}

      <div
        ref={dockRef}
        className={cn(
          'pb-0 pt-2.5',
          isPinned ?
            'fixed inset-x-0 z-[44] bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90'
          : 'relative px-4',
        )}
        style={isPinned ? { top: dockTopPx } : undefined}
      >
        <div className={cn('w-full', isPinned ? MAIN_SHELL_CONTENT_WIDTH_CLASS : undefined)}>
          {isPinned ?
            <p className="truncate pb-2 text-heading-section font-medium text-foreground">
              {vendorName}
            </p>
          : null}
          <ShopCatalogStickyTabs variant="bare" />
        </div>
      </div>
    </div>
  );
}
